/**
 * L3: Security hardening — SDK acceptance test.
 *
 * Exercises file locking and bypass evaluation through public APIs.
 * Validates atomic lock semantics and consistent bypass decisions
 * from the perspective of an SDK consumer.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';

// Public API imports — what an SDK consumer would use
import { registerKey, getKey, readRegistry } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey } from '../../src/keys/rotate.js';
import { evaluateBypass, checkBypass } from '../../src/config/bypass.js';
import type { BypassCheckResult, FleetBypassPolicy } from '../../src/config/bypass.js';
import type { FleetPolicy, BypassState, BypassAuditEvent } from '../../src/config/types.js';

describe('SDK acceptance: file locking and bypass evaluation', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('atomic lock semantics and consistent bypass decisions through public APIs', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-'));

    // ── 1. Key lifecycle with atomic locking ───────────────────────────

    // Register key through public API
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'accept-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    expect(entry.version).toBe(1);

    // Store key material
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // Create compiled artifact
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    const artifactContent = 'governance-artifact-v1';
    await writeFile(join(compiledDir, 'artifact.json'), artifactContent, 'utf-8');
    const sig = cryptoSign(null, Buffer.from(artifactContent), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'artifact.json.sig'), sig, 'utf-8');

    // Rotate through public API — atomic lock prevents corruption
    const result = await rotateKey(tempDir, 'accept-key');
    expect(result.entry.version).toBe(2);
    expect(result.previousVersion).toBe(1);
    expect(result.artifactsReSigned).toBe(1);
    expect(result.entry.rotatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Verify rotated key via public lookup
    const rotated = await getKey(tempDir, 'accept-key');
    expect(rotated).not.toBeNull();
    expect(rotated!.version).toBe(2);

    // Verify new signature is valid with new public key
    const newPubKey = await storage.read(`${entry.id}.pub`);
    expect(newPubKey).toBeTruthy();
    const newSig = await readFile(join(compiledDir, 'artifact.json.sig'), 'utf-8');
    const valid = cryptoVerify(
      null,
      Buffer.from(artifactContent),
      newPubKey!,
      Buffer.from(newSig, 'hex'),
    );
    expect(valid).toBe(true);

    // Lock file should not persist after rotation completes
    const keysDir = join(tempDir, '.claws', 'keys');
    let lockExists = false;
    try {
      await readFile(join(keysDir, 'rotate.lock'));
      lockExists = true;
    } catch {
      lockExists = false;
    }
    expect(lockExists).toBe(false);

    // ── 2. Consistent bypass decisions ─────────────────────────────────

    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    // Config-path API (evaluateBypass)
    const configResult: { state: BypassState; auditEvent: BypassAuditEvent | null } =
      evaluateBypass(
        { CLAWS_BYPASS: '1', USER: 'accept-user' },
        { allowBypass: true } satisfies FleetPolicy,
      );
    expect(configResult.state.outcome).toBe('activated');

    // Init-path API (checkBypass)
    const initResult: BypassCheckResult = await checkBypass(
      tempDir,
      { allowBypass: true } satisfies FleetBypassPolicy,
      { CLAWS_BYPASS: '1', USER: 'accept-user' },
    );
    expect(initResult.bypassed).toBe(true);
    expect(initResult.reason).toBe('env-bypass');

    // Both paths agree: fleet-denied scenario
    const configDenied = evaluateBypass(
      { CLAWS_BYPASS: '1' },
      { allowBypass: false },
    );
    const initDenied = await checkBypass(
      tempDir,
      { allowBypass: false },
      { CLAWS_BYPASS: '1' },
    );
    expect(configDenied.state.outcome).toBe('denied');
    expect(initDenied.bypassed).toBe(false);
    expect(initDenied.reason).toBe('fleet-prohibited');

    // Both paths agree: not-requested scenario
    const configInactive = evaluateBypass({}, { allowBypass: true });
    const initInactive = await checkBypass(tempDir, { allowBypass: true }, {});
    expect(configInactive.state.outcome).toBe('inactive');
    expect(initInactive.bypassed).toBe(false);
    expect(initInactive.reason).toBe('not-requested');
  });
});
