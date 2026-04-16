/**
 * L1: Key rotation rollback on failure with archive cleanup.
 *
 * THOTH-INTEGRATION-COVERAGE: validates complete rollback path including
 * archive cleanup, original key restoration, and registry consistency.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey, verifyKeyMaterial } from '../../src/keys/rotate.js';

describe('rotation-rollback integration', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('rotation failure cleans up archive, restores original, and leaves registry consistent', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rot-int-'));

    // Set up key with material
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'rollback-integration',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    await storage.write(`${entry.id}.pub`, generated.publicKey!);

    // Create artifact that forces re-sign failure (sig path is a directory)
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'artifact.yaml'), 'governance-config', 'utf-8');
    await mkdir(join(compiledDir, 'artifact.yaml.sig'), { recursive: true });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Rotation should fail
    await expect(rotateKey(tempDir, 'rollback-integration')).rejects.toThrow(
      'Partial re-sign failure',
    );

    warnSpy.mockRestore();

    // 1. Verify archived key files were cleaned up
    const keysDir = join(tempDir, '.claws', 'keys');
    await expect(stat(join(keysDir, 'rollback-integration.v1.key'))).rejects.toThrow();
    await expect(stat(join(keysDir, 'rollback-integration.v1.pub.key'))).rejects.toThrow();

    // 2. Verify original key material was restored (using timing-safe comparison)
    const restoredPrivate = await storage.read('rollback-integration');
    expect(restoredPrivate).not.toBeNull();
    expect(verifyKeyMaterial(restoredPrivate!, generated.privateKey)).toBe(true);

    const restoredPublic = await storage.read('rollback-integration.pub');
    expect(restoredPublic).not.toBeNull();
    expect(verifyKeyMaterial(restoredPublic!, generated.publicKey!)).toBe(true);

    // 3. Verify registry is consistent — version unchanged, no rotatedAt
    const afterEntry = await getKey(tempDir, 'rollback-integration');
    expect(afterEntry!.version).toBe(1);
    expect(afterEntry!.rotatedAt).toBeNull();
    expect(afterEntry!.revoked).toBe(false);

    // 4. Verify the key can be rotated successfully after the failed attempt
    // Remove the bad artifact first
    await rm(join(compiledDir, 'artifact.yaml.sig'), { recursive: true });
    await writeFile(join(compiledDir, 'artifact.yaml.sig'), 'old-sig', 'utf-8');

    const successResult = await rotateKey(tempDir, 'rollback-integration');
    expect(successResult.entry.version).toBe(2);
    expect(successResult.previousVersion).toBe(1);

    // Verify the new key is different from the original
    const newKey = await storage.read('rollback-integration');
    expect(newKey).not.toBe(generated.privateKey);
  });
});
