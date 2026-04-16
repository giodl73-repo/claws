/**
 * L1: O_EXCL lock integration — concurrent rotation and bypass consistency.
 *
 * Validates that:
 * 1. Concurrent rotation attempts under O_EXCL locking — first succeeds, second fails
 * 2. Bypass evaluation is consistent across config and init import paths
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey } from '../../src/keys/rotate.js';
import { evaluateBypass, checkBypass } from '../../src/config/bypass.js';

describe('concurrent rotation with O_EXCL locking', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('first rotation succeeds, second gets lock-held error, registry remains consistent', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-int-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'concurrent-test',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('concurrent-test', generated.privateKey);
    if (generated.publicKey) {
      await storage.write('concurrent-test.pub', generated.publicKey);
    }

    // Create a lock file simulating an in-progress rotation by a live process
    const keysDir = join(tempDir, '.claws', 'keys');
    await writeFile(
      join(keysDir, 'rotate.lock'),
      `${process.pid}\n${Date.now()}\n`,
      'utf-8',
    );

    // Second rotation attempt should fail with lock-held error
    await expect(rotateKey(tempDir, 'concurrent-test')).rejects.toThrow(
      'Key rotation already in progress',
    );

    // Remove the lock and perform real rotation
    const { unlink } = await import('node:fs/promises');
    await unlink(join(keysDir, 'rotate.lock'));

    const result = await rotateKey(tempDir, 'concurrent-test');
    expect(result.entry.version).toBe(2);
    expect(result.previousVersion).toBe(1);

    // Registry is consistent — key version was incremented exactly once
    const { getKey } = await import('../../src/keys/registry.js');
    const key = await getKey(tempDir, 'concurrent-test');
    expect(key).not.toBeNull();
    expect(key!.version).toBe(2);
  });
});

describe('bypass evaluation consistency across paths', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('same inputs produce identical BypassDecision via config and init paths', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-bypass-int-'));
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    const scenarios = [
      { env: { CLAWS_BYPASS: '1', USER: 'alice' }, policy: { allowBypass: true } },
      { env: { CLAWS_BYPASS: '1', USER: 'bob' }, policy: { allowBypass: false } },
      { env: {}, policy: { allowBypass: true } },
      { env: { CLAWS_BYPASS: '0' }, policy: { allowBypass: true } },
    ] as const;

    for (const { env, policy } of scenarios) {
      const configResult = evaluateBypass(env, policy);
      const initResult = await checkBypass(tempDir, policy, env);

      // Config-path activated ↔ init-path bypassed
      if (configResult.state.outcome === 'activated') {
        expect(initResult.bypassed).toBe(true);
        expect(initResult.reason).toBe('env-bypass');
      } else if (configResult.state.outcome === 'denied') {
        expect(initResult.bypassed).toBe(false);
        expect(initResult.reason).toBe('fleet-prohibited');
      } else {
        expect(initResult.bypassed).toBe(false);
        expect(initResult.reason).toBe('not-requested');
      }
    }
  });
});
