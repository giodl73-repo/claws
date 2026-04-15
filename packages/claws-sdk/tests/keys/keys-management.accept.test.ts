/**
 * L3: Key management acceptance — full lifecycle across tiers and algorithms.
 *
 * Generates Ed25519 + HMAC keys across file and env storage tiers,
 * lists all keys, verifies registry metadata consistency,
 * FileStorage permissions, EnvStorage round-trip, KMSStorage not-implemented.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { platform } from 'node:os';
import {
  generateKey,
  createStorage,
  registerKey,
  readRegistry,
  listKeys,
  KMSStorage,
  FileStorage,
} from '../../src/keys/index.js';

describe('key management acceptance', () => {
  let tempDir: string;
  const envKeys: string[] = [];

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
    for (const k of envKeys) {
      delete process.env[k];
    }
    envKeys.length = 0;
  });

  it('full lifecycle: generate, store, list, verify across tiers', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-'));

    // ── 1. Generate Ed25519 key with FileStorage ───────────────────────
    const ed25519Key = generateKey('ed25519');
    const fileStorage = createStorage('file', tempDir);
    const ed25519Entry = await registerKey(tempDir, {
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await fileStorage.write(ed25519Entry.id, ed25519Key.privateKey);
    if (ed25519Key.publicKey) {
      await fileStorage.write(`${ed25519Entry.id}.pub`, ed25519Key.publicKey);
    }

    // ── 2. Generate HMAC key with FileStorage ──────────────────────────
    const hmacFileKey = generateKey('hmac-sha256');
    const hmacFileEntry = await registerKey(tempDir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
    });
    await fileStorage.write(hmacFileEntry.id, hmacFileKey.privateKey);

    // ── 3. Generate Ed25519 key with EnvStorage ────────────────────────
    const ed25519EnvKey = generateKey('ed25519');
    const envStorage = createStorage('env', tempDir);
    const ed25519EnvEntry = await registerKey(tempDir, {
      algorithm: 'ed25519',
      storageTier: 'env',
    });
    envKeys.push(`CLAWS_KEY_${ed25519EnvEntry.id.replace(/[-. ]/g, '_').toUpperCase()}`);
    await envStorage.write(ed25519EnvEntry.id, ed25519EnvKey.privateKey);

    // ── 4. Generate HMAC key with EnvStorage ───────────────────────────
    const hmacEnvKey = generateKey('hmac-sha256');
    const hmacEnvEntry = await registerKey(tempDir, {
      algorithm: 'hmac-sha256',
      storageTier: 'env',
    });
    envKeys.push(`CLAWS_KEY_${hmacEnvEntry.id.replace(/[-. ]/g, '_').toUpperCase()}`);
    await envStorage.write(hmacEnvEntry.id, hmacEnvKey.privateKey);

    // ── 5. List all keys ───────────────────────────────────────────────
    const result = await listKeys(tempDir);
    expect(result.keys).toHaveLength(4);

    // ── 6. Verify registry metadata consistency ────────────────────────
    const registry = await readRegistry(tempDir);
    expect(registry).toHaveLength(4);

    for (const entry of registry) {
      expect(entry.id).toBeTruthy();
      expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entry.revoked).toBe(false);
      expect(entry.rotatedAt).toBeNull();
    }

    // Check algorithm distribution
    const algos = registry.map((k) => k.algorithm);
    expect(algos.filter((a) => a === 'ed25519')).toHaveLength(2);
    expect(algos.filter((a) => a === 'hmac-sha256')).toHaveLength(2);

    // Check tier distribution
    const tiers = registry.map((k) => k.storageTier);
    expect(tiers.filter((t) => t === 'file')).toHaveLength(2);
    expect(tiers.filter((t) => t === 'env')).toHaveLength(2);

    // ── 7. Verify FileStorage round-trip ───────────────────────────────
    const edMaterial = await fileStorage.read(ed25519Entry.id);
    expect(edMaterial).toBe(ed25519Key.privateKey);

    const hmacFileMaterial = await fileStorage.read(hmacFileEntry.id);
    expect(hmacFileMaterial).toBe(hmacFileKey.privateKey);

    // ── 8. Verify FileStorage permissions (POSIX only) ─────────────────
    if (platform() !== 'win32') {
      const keyFile = join(tempDir, '.claws', 'keys', `${ed25519Entry.id}.key`);
      const fileStat = await stat(keyFile);
      // 0o600 = owner read+write only
      const mode = fileStat.mode & 0o777;
      expect(mode).toBe(0o600);
    }

    // ── 9. Verify EnvStorage round-trip ────────────────────────────────
    const envEdMaterial = await envStorage.read(ed25519EnvEntry.id);
    expect(envEdMaterial).toBe(ed25519EnvKey.privateKey);

    const envHmacMaterial = await envStorage.read(hmacEnvEntry.id);
    expect(envHmacMaterial).toBe(hmacEnvKey.privateKey);

    // ── 10. Verify KMSStorage throws not-implemented ───────────────────
    const kmsStorage = new KMSStorage();
    await expect(kmsStorage.write('any', 'data')).rejects.toThrow('not implemented');
    await expect(kmsStorage.read('any')).rejects.toThrow('not implemented');

    // ── 11. Verify table output contains all keys ──────────────────────
    expect(result.table).toContain(ed25519Entry.id);
    expect(result.table).toContain(hmacFileEntry.id);
    expect(result.table).toContain(ed25519EnvEntry.id);
    expect(result.table).toContain(hmacEnvEntry.id);
  });
});
