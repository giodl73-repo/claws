/**
 * L1: Key security integration — full key lifecycle with permissions,
 * and rotation rollback scenario.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { EnvStorage } from '../../src/keys/storage.js';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey } from '../../src/keys/rotate.js';
import { resolveSigningKey, useSigningKey } from '../../src/publish/key-resolution.js';

describe('key-security integration', () => {
  let tempDir: string;
  const envKeys: string[] = [];

  afterEach(async () => {
    for (const k of envKeys) {
      delete process.env[k];
    }
    envKeys.length = 0;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full key lifecycle with permission checks — generate, store, verify permissions, use, zero', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-lifecycle-'));

    // Suppress plaintext warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Generate key and store via EnvStorage (writes .env file)
    const generated = generateKey('hmac-sha256');
    const envStorage = new EnvStorage(tempDir);
    envKeys.push('CLAWS_KEY_LIFECYCLE_KEY');
    await envStorage.write('lifecycle-key', generated.privateKey);

    // 2. Verify .env file permissions
    const envPath = join(tempDir, '.claws', 'keys', '.env');
    const fileStat = await stat(envPath);
    if (process.platform !== 'win32') {
      expect(fileStat.mode & 0o777).toBe(0o600);
    }
    expect(fileStat.isFile()).toBe(true);

    // 3. Register in registry for resolution
    const entry = await registerKey(tempDir, {
      id: 'lifecycle-key',
      algorithm: 'hmac-sha256',
      storageTier: 'env',
      purpose: 'signing',
    });

    // 4. Resolve the key
    const resolved = await resolveSigningKey(tempDir);
    expect(resolved).not.toBeNull();
    expect(resolved!.source).toBe('identity');

    // 5. Use key with Buffer zeroing
    let capturedBuffer: Buffer | null = null;
    const result = await useSigningKey(resolved!, (keyBuffer) => {
      capturedBuffer = keyBuffer;
      expect(keyBuffer.length).toBeGreaterThan(0);
      return 'signed';
    });
    expect(result).toBe('signed');

    // 6. Verify buffer was zeroed after use
    expect(capturedBuffer).not.toBeNull();
    const allZero = (capturedBuffer! as Buffer).every((b) => b === 0);
    expect(allZero).toBe(true);

    warnSpy.mockRestore();
  });

  it('rotation rollback scenario — archive, fail, verify cleanup and restoration', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-rollback-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'rollback-int-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // Create compiled artifact that will cause re-sign failure
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'policy.json'), 'content', 'utf-8');
    await mkdir(join(compiledDir, 'policy.json.sig'), { recursive: true });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Rotation should fail
    await expect(rotateKey(tempDir, 'rollback-int-key')).rejects.toThrow(
      'Partial re-sign failure',
    );

    // Verify rollback log was emitted
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claws:keys] Rotation rollback'),
    );
    warnSpy.mockRestore();

    // Verify original key is restored and usable
    const restoredKey = await storage.read('rollback-int-key');
    expect(restoredKey).toBe(generated.privateKey);

    // Verify archived key was cleaned up
    const keysDir = join(tempDir, '.claws', 'keys');
    await expect(stat(join(keysDir, 'rollback-int-key.v1.key'))).rejects.toThrow();

    // Verify registry entry was NOT updated
    const afterEntry = await getKey(tempDir, 'rollback-int-key');
    expect(afterEntry!.version).toBe(1);
    expect(afterEntry!.rotatedAt).toBeNull();
  });
});
