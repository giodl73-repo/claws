/**
 * L2: Security hardening — race condition and bypass consolidation e2e.
 *
 * End-to-end validation of:
 * - O_EXCL locking under concurrent access
 * - Stale lock recovery from crashed processes
 * - Unified bypass evaluation across config and init paths
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey, acquireLock, releaseLock } from '../../src/keys/rotate.js';
import { evaluateBypass, checkBypass } from '../../src/config/bypass.js';

describe('security hardening — race conditions and bypass consolidation', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full pipeline: O_EXCL locking, stale recovery, and unified bypass', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-sec-e2e-'));

    // ── Phase 1: O_EXCL atomic locking ─────────────────────────────────

    // Set up a key for rotation
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'sec-e2e-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('sec-e2e-key', generated.privateKey);
    if (generated.publicKey) {
      await storage.write('sec-e2e-key.pub', generated.publicKey);
    }

    // Create compiled artifact to verify re-signing
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'policy.json'), 'governance-data', 'utf-8');

    // Sign it
    const { sign: cryptoSign } = await import('node:crypto');
    const oldSig = cryptoSign(null, Buffer.from('governance-data'), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'policy.json.sig'), oldSig, 'utf-8');

    // Acquire lock explicitly — verify O_EXCL semantics
    const lockPath = await acquireLock(tempDir);
    const lockContent = await readFile(lockPath, 'utf-8');
    expect(lockContent).toContain(String(process.pid));

    // Concurrent acquisition must fail
    await expect(acquireLock(tempDir)).rejects.toThrow('Key rotation already in progress');

    // Release and verify re-acquisition works
    await releaseLock(lockPath);
    const lockPath2 = await acquireLock(tempDir);
    await releaseLock(lockPath2);

    // ── Phase 2: Stale lock recovery ───────────────────────────────────

    const keysDir = join(tempDir, '.claws', 'keys');

    // Simulate a crashed process: dead PID, recent timestamp
    await writeFile(
      join(keysDir, 'rotate.lock'),
      `99999999\n${Date.now()}\n`,
      'utf-8',
    );

    // Rotation should recover from stale lock and succeed
    const result = await rotateKey(tempDir, 'sec-e2e-key');
    expect(result.entry.version).toBe(2);
    expect(result.artifactsReSigned).toBe(1);
    expect(result.previousVersion).toBe(1);

    // Verify new signature differs from old
    const newSig = await readFile(join(compiledDir, 'policy.json.sig'), 'utf-8');
    expect(newSig).not.toBe(oldSig);

    // Verify key registry is consistent
    const key = await getKey(tempDir, 'sec-e2e-key');
    expect(key).not.toBeNull();
    expect(key!.version).toBe(2);
    expect(key!.rotatedAt).not.toBeNull();

    // ── Phase 3: Unified bypass evaluation ─────────────────────────────

    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    // Config-path: activated
    const configResult = evaluateBypass(
      { CLAWS_BYPASS: '1', USER: 'e2e-user' },
      { allowBypass: true },
    );
    expect(configResult.state.outcome).toBe('activated');

    // Init-path: also activated, consistent
    const initResult = await checkBypass(
      tempDir,
      { allowBypass: true },
      { CLAWS_BYPASS: '1', USER: 'e2e-user' },
    );
    expect(initResult.bypassed).toBe(true);
    expect(initResult.reason).toBe('env-bypass');
    expect(initResult.auditRecorded).toBe(true);

    // Config-path: denied
    const configDenied = evaluateBypass(
      { CLAWS_BYPASS: '1' },
      { allowBypass: false },
    );
    expect(configDenied.state.outcome).toBe('denied');

    // Init-path: also denied, consistent
    const initDenied = await checkBypass(
      tempDir,
      { allowBypass: false },
      { CLAWS_BYPASS: '1' },
    );
    expect(initDenied.bypassed).toBe(false);
    expect(initDenied.reason).toBe('fleet-prohibited');
  });
});
