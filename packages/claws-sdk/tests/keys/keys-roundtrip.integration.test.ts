/**
 * L1: Key management integration — generate + list round-trip,
 * storage tier selection.
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

describe('generate + list round-trip', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('generates a key and verifies it appears in list', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-int-'));

    // Generate an Ed25519 key
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);

    const entry = await registerKey(tempDir, {
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    await storage.write(entry.id, generated.privateKey);

    // List and verify
    const result = await listKeys(tempDir);
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0]!.id).toBe(entry.id);
    expect(result.keys[0]!.algorithm).toBe('ed25519');
    expect(result.keys[0]!.storageTier).toBe('file');
    expect(result.table).toContain(entry.id);
    expect(result.table).toContain('ed25519');
  });
});

describe('storage tier selection', () => {
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

  it('uses EnvStorage when --storage env is selected', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-int-'));

    const generated = generateKey('hmac-sha256');
    const storage = createStorage('env', tempDir);

    const entry = await registerKey(tempDir, {
      algorithm: 'hmac-sha256',
      storageTier: 'env',
    });

    // Track env key for cleanup
    envKeys.push(`CLAWS_KEY_${entry.id.replace(/[-. ]/g, '_').toUpperCase()}`);

    await storage.write(entry.id, generated.privateKey);

    // Verify env var was set
    const readBack = await storage.read(entry.id);
    expect(readBack).toBe(generated.privateKey);

    // Verify list shows correct tier
    const result = await listKeys(tempDir);
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0]!.storageTier).toBe('env');
  });
});
