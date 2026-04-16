/**
 * L0: Key rotation rollback — failed rotation cleans up archive, successful
 * rotation preserves archive.
 *
 * D-05: When rotation fails after archive, archived key material is cleaned
 * up and the original key is restored.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { rotateKey } from '../../src/keys/rotate.js';

describe('rotation-rollback', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('failed rotation cleans up archived key and restores original', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rollback-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-rollback-cleanup',
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
    await writeFile(join(compiledDir, 'artifact.json'), 'content', 'utf-8');
    // Make the .sig path a directory so writeFile fails during re-sign
    await mkdir(join(compiledDir, 'artifact.json.sig'), { recursive: true });

    // Suppress rollback warning log
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(rotateKey(tempDir, 'test-rollback-cleanup')).rejects.toThrow(
      'Partial re-sign failure',
    );

    warnSpy.mockRestore();

    // Verify archived key files were cleaned up
    const keysDir = join(tempDir, '.claws', 'keys');
    await expect(
      stat(join(keysDir, 'test-rollback-cleanup.v1.key')),
    ).rejects.toThrow();
    await expect(
      stat(join(keysDir, 'test-rollback-cleanup.v1.pub.key')),
    ).rejects.toThrow();

    // Verify original key was restored
    const restoredKey = await readFile(join(keysDir, 'test-rollback-cleanup.key'), 'utf-8');
    expect(restoredKey).toBe(generated.privateKey);

    // Verify registry was NOT updated (version stays at 1)
    const afterEntry = await getKey(tempDir, 'test-rollback-cleanup');
    expect(afterEntry!.version).toBe(1);
  });

  it('successful rotation preserves archive and activates new key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rollback-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-preserve-archive',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    const result = await rotateKey(tempDir, 'test-preserve-archive');

    // Verify version was incremented
    expect(result.entry.version).toBe(2);
    expect(result.previousVersion).toBe(1);

    // Verify archive exists (preserved for recovery)
    const keysDir = join(tempDir, '.claws', 'keys');
    const archivedKey = await readFile(join(keysDir, 'test-preserve-archive.v1.key'), 'utf-8');
    expect(archivedKey).toBe(generated.privateKey);

    // Verify new key is different from old
    const newKey = await storage.read(entry.id);
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(generated.privateKey);
  });
});
