/**
 * L0: Key rotation — new version, re-sign, archive, rollback.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import { registerKey, getKey, updateKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey, acquireLock, releaseLock, verifyKeyMaterial } from '../../src/keys/rotate.js';

describe('rotateKey', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates a new key version with incremented version number', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-rotate-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    const result = await rotateKey(tempDir, 'test-rotate-1');

    expect(result.entry.version).toBe(2);
    expect(result.previousVersion).toBe(1);
    expect(result.entry.rotatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.entry.id).toBe('test-rotate-1');
  });

  it('re-signs .claws/compiled/ artifacts with new key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    // Generate and register key
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-resign-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // Create a compiled artifact with a signature
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    const artifactContent = 'governance-policy-v1';
    await writeFile(join(compiledDir, 'policy.json'), artifactContent, 'utf-8');

    // Sign with original key (Ed25519 uses null algorithm)
    const oldSig = cryptoSign(null, Buffer.from(artifactContent), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'policy.json.sig'), oldSig, 'utf-8');

    // Rotate
    const result = await rotateKey(tempDir, 'test-resign-1');

    expect(result.artifactsReSigned).toBe(1);

    // New signature should be different from old
    const newSig = await readFile(join(compiledDir, 'policy.json.sig'), 'utf-8');
    expect(newSig).not.toBe(oldSig);

    // New signature should be verifiable with new public key
    const newPubKey = await storage.read(`${entry.id}.pub`);
    expect(newPubKey).toBeTruthy();
    const valid = cryptoVerify(null, Buffer.from(artifactContent), newPubKey!, Buffer.from(newSig, 'hex'));
    expect(valid).toBe(true);
  });

  it('archives old key material with version suffix', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-archive-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    await rotateKey(tempDir, 'test-archive-1');

    // Old key should be archived as v1
    const keysDir = join(tempDir, '.claws', 'keys');
    const archivedKey = await readFile(join(keysDir, 'test-archive-1.v1.key'), 'utf-8');
    expect(archivedKey).toBe(generated.privateKey);

    // Archived public key
    const archivedPub = await readFile(join(keysDir, 'test-archive-1.v1.pub.key'), 'utf-8');
    expect(archivedPub).toBe(generated.publicKey);
  });

  it('throws when rotating a nonexistent key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));
    await expect(rotateKey(tempDir, 'nonexistent')).rejects.toThrow('Key not found: nonexistent');
  });

  it('throws early when key material is missing (rollback safety)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    // Register key entry but do NOT write key material to storage
    await registerKey(tempDir, {
      id: 'test-no-material',
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    await expect(rotateKey(tempDir, 'test-no-material')).rejects.toThrow(
      'Cannot rotate: unable to read current key material for rollback safety',
    );
  });

  it('throws when rotating a revoked key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    // Register a revoked key
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'test-revoked-rot',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('test-revoked-rot', generated.privateKey);

    // Manually mark as revoked via updateKey
    const { updateKey } = await import('../../src/keys/registry.js');
    const key = await getKey(tempDir, 'test-revoked-rot');
    await updateKey(tempDir, { ...key!, revoked: true, revokedAt: new Date().toISOString() });

    await expect(rotateKey(tempDir, 'test-revoked-rot')).rejects.toThrow('Cannot rotate revoked key');
  });

  it('rotates HMAC key without re-signing artifacts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('hmac-sha256');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-hmac-rot',
      algorithm: 'hmac-sha256',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);

    // Create a compiled artifact (should NOT be re-signed for HMAC)
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'data.json'), 'content', 'utf-8');
    await writeFile(join(compiledDir, 'data.json.sig'), 'old-hmac-sig', 'utf-8');

    const result = await rotateKey(tempDir, 'test-hmac-rot');
    expect(result.entry.version).toBe(2);
    expect(result.artifactsReSigned).toBe(0);

    // Verify new key is different from old
    const newKey = await storage.read(entry.id);
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(generated.privateKey);

    // Verify sig file unchanged (HMAC doesn't re-sign)
    const sigContent = await readFile(join(compiledDir, 'data.json.sig'), 'utf-8');
    expect(sigContent).toBe('old-hmac-sig');
  });

  it('handles rotation when no compiled directory exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-no-compiled',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // No .claws/compiled/ directory exists
    const result = await rotateKey(tempDir, 'test-no-compiled');
    expect(result.entry.version).toBe(2);
    expect(result.artifactsReSigned).toBe(0);
  });

  it('skips orphan sig files without companion artifact', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-orphan-sig',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // Create orphan .sig file with no corresponding artifact
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'missing.json.sig'), 'orphan-sig', 'utf-8');

    const result = await rotateKey(tempDir, 'test-orphan-sig');
    // Orphan sig is counted (re-sign is attempted but skipped due to missing artifact)
    expect(result.entry.version).toBe(2);
    expect(result.artifactsReSigned).toBe(1);
  });

  it('throws on concurrent rotation (lock contention)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'test-lock-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('test-lock-1', generated.privateKey);
    if (generated.publicKey) {
      await storage.write('test-lock-1.pub', generated.publicKey);
    }

    // Pre-create the lock file with current PID + fresh timestamp to simulate concurrent rotation
    const keysDir = join(tempDir, '.claws', 'keys');
    await writeFile(join(keysDir, 'rotate.lock'), `${process.pid}\n${Date.now()}\n`, 'utf-8');

    await expect(rotateKey(tempDir, 'test-lock-1')).rejects.toThrow(
      'Key rotation already in progress',
    );
  });

  it('rolls back on partial re-sign failure', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-rollback-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // Create a compiled artifact where the .sig path is a directory to force write failure
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'good.json'), 'content', 'utf-8');
    // Make the .sig path a directory so writeFile fails
    await mkdir(join(compiledDir, 'good.json.sig'), { recursive: true });

    await expect(rotateKey(tempDir, 'test-rollback-1')).rejects.toThrow(
      'Partial re-sign failure',
    );

    // Verify key version was NOT incremented (rolled back)
    const afterKey = await getKey(tempDir, 'test-rollback-1');
    expect(afterKey!.version).toBe(1);

    // Verify old key material was restored from archive
    const keysDir = join(tempDir, '.claws', 'keys');
    const restoredKey = await readFile(join(keysDir, 'test-rollback-1.key'), 'utf-8');
    expect(restoredKey).toBe(generated.privateKey);
  });
});

describe('acquireLock / releaseLock', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('acquires and releases a lock successfully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-lock-'));
    const lockPath = await acquireLock(tempDir);
    expect(lockPath).toContain('rotate.lock');

    // Lock file should exist
    const content = await readFile(lockPath, 'utf-8');
    expect(content).toContain(String(process.pid));

    // Release should succeed
    await releaseLock(lockPath);

    // After release, acquiring again should work
    const lockPath2 = await acquireLock(tempDir);
    await releaseLock(lockPath2);
  });

  it('releaseLock handles missing file gracefully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-lock-'));
    // Releasing a non-existent lock should not throw
    await releaseLock(join(tempDir, 'nonexistent.lock'));
  });

  it('auto-cleans stale lock from dead PID', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-lock-'));
    const keysDir = join(tempDir, '.claws', 'keys');
    await mkdir(keysDir, { recursive: true });

    // Write a lock with a PID that almost certainly doesn't exist (99999999)
    // and a recent timestamp — dead PID alone should trigger cleanup
    await writeFile(
      join(keysDir, 'rotate.lock'),
      `99999999\n${Date.now()}\n`,
      'utf-8',
    );

    // acquireLock should succeed by cleaning the stale lock
    const lockPath = await acquireLock(tempDir);
    expect(lockPath).toContain('rotate.lock');

    const content = await readFile(lockPath, 'utf-8');
    expect(content).toContain(String(process.pid));

    await releaseLock(lockPath);
  });

  it('auto-cleans stale lock older than 10 minutes', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-lock-'));
    const keysDir = join(tempDir, '.claws', 'keys');
    await mkdir(keysDir, { recursive: true });

    // Write a lock with a valid PID (current) but an old timestamp
    const oldTimestamp = Date.now() - 11 * 60 * 1000; // 11 minutes ago
    await writeFile(
      join(keysDir, 'rotate.lock'),
      `${process.pid}\n${oldTimestamp}\n`,
      'utf-8',
    );

    // acquireLock should succeed by cleaning the stale lock
    const lockPath = await acquireLock(tempDir);
    expect(lockPath).toContain('rotate.lock');
    await releaseLock(lockPath);
  });
});

describe('verifyKeyMaterial', () => {
  it('returns true for identical key material', () => {
    const key = 'ed25519-private-key-hex-abcdef0123456789';
    expect(verifyKeyMaterial(key, key)).toBe(true);
  });

  it('returns false for same-length but different key material', () => {
    const a = 'aaaa-bbbb-cccc-dddd';
    const b = 'aaaa-bbbb-cccc-eeee';
    expect(verifyKeyMaterial(a, b)).toBe(false);
  });

  it('returns false when keys have different lengths', () => {
    const short = 'abc';
    const long = 'abcdefgh';
    expect(verifyKeyMaterial(short, long)).toBe(false);
  });

  it('returns false for empty vs non-empty', () => {
    expect(verifyKeyMaterial('', 'notempty')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(verifyKeyMaterial('', '')).toBe(true);
  });

  it('pads shorter buffer A when B is longer', () => {
    // A is shorter — exercises the padding branch for bufA
    expect(verifyKeyMaterial('x', 'xy')).toBe(false);
  });

  it('pads shorter buffer B when A is longer', () => {
    // B is shorter — exercises the padding branch for bufB
    expect(verifyKeyMaterial('xy', 'x')).toBe(false);
  });
});

describe('rotateKey edge cases', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('throws when ed25519 public key is missing but private key exists', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'test-no-pubkey',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    // Write only the private key, NOT the public key
    await storage.write('test-no-pubkey', generated.privateKey);

    await expect(rotateKey(tempDir, 'test-no-pubkey')).rejects.toThrow(
      'Cannot rotate: unable to read current public key material for rollback safety',
    );
  });
});
