/**
 * L2: CLI round-trip — generate two keys and list them.
 *
 * Exercises the full SDK pipeline: generate → storage → registry → list.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateKey,
  createStorage,
  registerKey,
  listKeys,
} from '../../src/keys/index.js';

describe('CLI round-trip: generate ed25519 + hmac → list', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('generates two keys with different algorithms and lists both', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-e2e-'));

    // Step 1: claws keys generate --algorithm ed25519
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

    // Step 2: claws keys generate --algorithm hmac
    const hmacKey = generateKey('hmac-sha256');
    const hmacEntry = await registerKey(tempDir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
    });
    await fileStorage.write(hmacEntry.id, hmacKey.privateKey);

    // Step 3: claws keys list → verify both appear
    const result = await listKeys(tempDir);
    expect(result.keys).toHaveLength(2);

    const algorithms = result.keys.map((k) => k.algorithm);
    expect(algorithms).toContain('ed25519');
    expect(algorithms).toContain('hmac-sha256');

    // Verify table contains both key IDs
    expect(result.table).toContain(ed25519Entry.id);
    expect(result.table).toContain(hmacEntry.id);

    // Verify metadata correctness
    const ed = result.keys.find((k) => k.algorithm === 'ed25519')!;
    expect(ed.storageTier).toBe('file');
    expect(ed.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const hmac = result.keys.find((k) => k.algorithm === 'hmac-sha256')!;
    expect(hmac.storageTier).toBe('file');
    expect(hmac.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Verify key material round-trips through FileStorage
    const edMaterial = await fileStorage.read(ed25519Entry.id);
    expect(edMaterial).toBe(ed25519Key.privateKey);

    const hmacMaterial = await fileStorage.read(hmacEntry.id);
    expect(hmacMaterial).toBe(hmacKey.privateKey);
  });
});
