/**
 * L0: Storage tier abstraction — FileStorage, EnvStorage, KMSStorage.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileStorage, EnvStorage, KMSStorage, createStorage, validateKeyId } from '../../src/keys/storage.js';

describe('FileStorage', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('round-trips key material through write/read', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-'));
    const storage = new FileStorage(tempDir);

    await storage.write('test-key-1', 'secret-material-abc');
    const result = await storage.read('test-key-1');
    expect(result).toBe('secret-material-abc');
  });

  it('returns null for non-existent key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-'));
    const storage = new FileStorage(tempDir);

    const result = await storage.read('nonexistent');
    expect(result).toBeNull();
  });

  it('reports file tier', () => {
    const storage = new FileStorage('/tmp/dummy');
    expect(storage.tier).toBe('file');
  });

  it('securely deletes key material (overwrite + unlink)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-'));
    const storage = new FileStorage(tempDir);

    await storage.write('del-test', 'secret-to-destroy');
    // Key exists
    const before = await storage.read('del-test');
    expect(before).toBe('secret-to-destroy');

    await storage.delete('del-test');

    // Key file should be gone
    const after = await storage.read('del-test');
    expect(after).toBeNull();
  });

  it('delete is a no-op for nonexistent key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-'));
    const storage = new FileStorage(tempDir);
    // Should not throw
    await storage.delete('no-such-key');
  });
});

describe('EnvStorage', () => {
  const envKeys: string[] = [];
  let envTempDir: string | undefined;

  afterEach(async () => {
    for (const k of envKeys) {
      delete process.env[k];
    }
    envKeys.length = 0;
    if (envTempDir) {
      await rm(envTempDir, { recursive: true, force: true });
      envTempDir = undefined;
    }
  });

  it('round-trips key material through env vars', async () => {
    const storage = new EnvStorage();
    envKeys.push('CLAWS_KEY_MY_KEY_1');

    await storage.write('my-key-1', 'env-secret-data');
    const result = await storage.read('my-key-1');
    expect(result).toBe('env-secret-data');
  });

  it('returns null for unset env var', async () => {
    const storage = new EnvStorage();
    const result = await storage.read('nonexistent-key');
    expect(result).toBeNull();
  });

  it('reports env tier', () => {
    const storage = new EnvStorage();
    expect(storage.tier).toBe('env');
  });

  it('persists key material to .env file when workspaceRoot is provided', async () => {
    envTempDir = await mkdtemp(join(tmpdir(), 'claws-env-'));
    const storage = new EnvStorage(envTempDir);
    envKeys.push('CLAWS_KEY_PERSIST_1');

    await storage.write('persist-1', 'persisted-secret');

    // Verify .env file was created
    const envPath = join(envTempDir, '.claws', 'keys', '.env');
    const content = await readFile(envPath, 'utf-8');
    expect(content).toContain('CLAWS_KEY_PERSIST_1=persisted-secret');
  });

  it('reads from .env file when process.env is empty', async () => {
    envTempDir = await mkdtemp(join(tmpdir(), 'claws-env-'));
    const storage = new EnvStorage(envTempDir);
    envKeys.push('CLAWS_KEY_FALLBACK_1');

    await storage.write('fallback-1', 'env-file-value');

    // Clear process.env to force fallback to .env file
    delete process.env['CLAWS_KEY_FALLBACK_1'];

    const result = await storage.read('fallback-1');
    expect(result).toBe('env-file-value');
  });

  it('deletes key from both process.env and .env file', async () => {
    envTempDir = await mkdtemp(join(tmpdir(), 'claws-env-'));
    const storage = new EnvStorage(envTempDir);
    envKeys.push('CLAWS_KEY_DEL_1');

    await storage.write('del-1', 'to-delete');
    expect(process.env['CLAWS_KEY_DEL_1']).toBe('to-delete');

    await storage.delete('del-1');
    expect(process.env['CLAWS_KEY_DEL_1']).toBeUndefined();

    // Should also be gone from .env file
    const result = await storage.read('del-1');
    expect(result).toBeNull();
  });
});

describe('EnvStorage branch coverage', () => {
  const envKeys: string[] = [];
  let envTempDir: string | undefined;

  afterEach(async () => {
    for (const k of envKeys) {
      delete process.env[k];
    }
    envKeys.length = 0;
    if (envTempDir) {
      await rm(envTempDir, { recursive: true, force: true });
      envTempDir = undefined;
    }
  });

  it('overwrites existing env var in .env file (idx !== -1 branch)', async () => {
    envTempDir = await mkdtemp(join(tmpdir(), 'claws-env-'));
    const storage = new EnvStorage(envTempDir);
    envKeys.push('CLAWS_KEY_OVERWRITE_1');

    // Write initial value
    await storage.write('overwrite-1', 'initial-value');

    // Overwrite with new value — exercises the idx !== -1 branch in persistEnvFile
    await storage.write('overwrite-1', 'updated-value');

    // Verify process.env has the updated value
    expect(process.env['CLAWS_KEY_OVERWRITE_1']).toBe('updated-value');

    // Clear process.env and verify .env file has the updated value
    delete process.env['CLAWS_KEY_OVERWRITE_1'];
    const result = await storage.read('overwrite-1');
    expect(result).toBe('updated-value');

    // Verify the .env file doesn't have duplicate lines
    const envPath = join(envTempDir, '.claws', 'keys', '.env');
    const content = await readFile(envPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.includes('CLAWS_KEY_OVERWRITE_1'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('CLAWS_KEY_OVERWRITE_1=updated-value');
  });

  it('removeFromEnvFile is a no-op when key does not exist (filtered.length === lines.length)', async () => {
    envTempDir = await mkdtemp(join(tmpdir(), 'claws-env-'));
    const storage = new EnvStorage(envTempDir);
    envKeys.push('CLAWS_KEY_KEEP_ME');

    // Write one key
    await storage.write('keep-me', 'keep-value');

    // Delete a different key that doesn't exist in the .env file
    // This exercises the filtered.length === lines.length branch — no file write
    await storage.delete('nonexistent-env-key');

    // Verify the existing key is still intact
    delete process.env['CLAWS_KEY_KEEP_ME'];
    const result = await storage.read('keep-me');
    expect(result).toBe('keep-value');
  });

  it('returns null when no workspaceRoot and no env var set', async () => {
    // EnvStorage with no workspaceRoot — envFilePath is null
    const storage = new EnvStorage();
    const result = await storage.read('totally-missing-key');
    expect(result).toBeNull();
  });

  it('delete works when no workspaceRoot is provided', async () => {
    const storage = new EnvStorage();
    envKeys.push('CLAWS_KEY_NO_WS_DEL');
    process.env['CLAWS_KEY_NO_WS_DEL'] = 'temp-value';

    await storage.delete('no-ws-del');
    expect(process.env['CLAWS_KEY_NO_WS_DEL']).toBeUndefined();
  });

  it('write without workspaceRoot only sets process.env', async () => {
    const storage = new EnvStorage();
    envKeys.push('CLAWS_KEY_NO_WS_WRITE');

    await storage.write('no-ws-write', 'env-only-value');
    expect(process.env['CLAWS_KEY_NO_WS_WRITE']).toBe('env-only-value');
  });
});

describe('KMSStorage', () => {
  it('throws not-implemented on write', async () => {
    const storage = new KMSStorage();
    await expect(storage.write('k', 'v')).rejects.toThrow('not implemented');
  });

  it('throws not-implemented on read', async () => {
    const storage = new KMSStorage();
    await expect(storage.read('k')).rejects.toThrow('not implemented');
  });

  it('throws not-implemented on delete', async () => {
    const storage = new KMSStorage();
    await expect(storage.delete('k')).rejects.toThrow('not implemented');
  });

  it('reports kms tier', () => {
    const storage = new KMSStorage();
    expect(storage.tier).toBe('kms');
  });
});

describe('createStorage', () => {
  it('creates FileStorage for file tier', () => {
    const s = createStorage('file', '/tmp/ws');
    expect(s.tier).toBe('file');
    expect(s).toBeInstanceOf(FileStorage);
  });

  it('creates EnvStorage for env tier', () => {
    const s = createStorage('env', '/tmp/ws');
    expect(s.tier).toBe('env');
    expect(s).toBeInstanceOf(EnvStorage);
  });

  it('creates KMSStorage for kms tier', () => {
    const s = createStorage('kms', '/tmp/ws');
    expect(s.tier).toBe('kms');
    expect(s).toBeInstanceOf(KMSStorage);
  });
});

// ── T-01: Path traversal regression tests (S-03 security fix) ─────────

describe('validateKeyId', () => {
  it('accepts valid key IDs', () => {
    expect(() => validateKeyId('my-key-1')).not.toThrow();
    expect(() => validateKeyId('signing.prod.2024')).not.toThrow();
    expect(() => validateKeyId('key_v2')).not.toThrow();
    expect(() => validateKeyId('ABC123')).not.toThrow();
    expect(() => validateKeyId('a')).not.toThrow();
  });

  it('rejects forward-slash path traversal', () => {
    expect(() => validateKeyId('../../../etc/passwd')).toThrow('must match');
    expect(() => validateKeyId('keys/../secret')).toThrow('must match');
    expect(() => validateKeyId('a/b')).toThrow('must match');
  });

  it('rejects backslash path traversal', () => {
    expect(() => validateKeyId('..\\..\\windows\\system32')).toThrow('must match');
    expect(() => validateKeyId('keys\\..\\secret')).toThrow('must match');
    expect(() => validateKeyId('a\\b')).toThrow('must match');
  });

  it('rejects dot-dot sequences', () => {
    expect(() => validateKeyId('..')).toThrow("'..' is not allowed");
    expect(() => validateKeyId('foo..bar')).toThrow("'..' is not allowed");
  });

  it('rejects empty string', () => {
    expect(() => validateKeyId('')).toThrow('must match');
  });

  it('rejects special characters', () => {
    expect(() => validateKeyId('key id')).toThrow('must match');
    expect(() => validateKeyId('key\x00id')).toThrow('must match');
    expect(() => validateKeyId('key:id')).toThrow('must match');
    expect(() => validateKeyId('key*id')).toThrow('must match');
    expect(() => validateKeyId('key?id')).toThrow('must match');
  });
});

describe('FileStorage path traversal (T-01 regression)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('write rejects path traversal keyId', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-traversal-'));
    const storage = new FileStorage(tempDir);

    await expect(storage.write('../../../etc/shadow', 'evil')).rejects.toThrow('must match');
    await expect(storage.write('..\\..\\windows\\keys', 'evil')).rejects.toThrow('must match');
    await expect(storage.write('foo/bar', 'evil')).rejects.toThrow('must match');
  });

  it('read rejects path traversal keyId', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-traversal-'));
    const storage = new FileStorage(tempDir);

    await expect(storage.read('../../../etc/passwd')).rejects.toThrow('must match');
    await expect(storage.read('..\\..\\windows\\system.ini')).rejects.toThrow('must match');
  });

  it('delete rejects path traversal keyId', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keys-traversal-'));
    const storage = new FileStorage(tempDir);

    await expect(storage.delete('../../../etc/shadow')).rejects.toThrow('must match');
    await expect(storage.delete('secret/../../key')).rejects.toThrow('must match');
  });
});
