/**
 * L1: Full key lifecycle: generate -> list -> rotate -> revoke.
 *
 * THOTH-INTEGRATION-COVERAGE: exercises the complete key management
 * lifecycle through the public API.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateKey } from '../../src/keys/generate.js';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { createStorage } from '../../src/keys/storage.js';
import { listKeys } from '../../src/keys/list.js';
import { rotateKey } from '../../src/keys/rotate.js';
import { revokeKey } from '../../src/keys/revoke.js';

describe('key-lifecycle integration', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full lifecycle: generate -> register -> list -> rotate -> revoke', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-keylc-'));

    // 1. Generate key
    const generated = generateKey('ed25519');
    expect(generated.algorithm).toBe('ed25519');
    expect(generated.privateKey).toBeTruthy();
    expect(generated.publicKey).toBeTruthy();

    // 2. Register key
    const entry = await registerKey(tempDir, {
      id: 'lifecycle-ed25519',
      algorithm: 'ed25519',
      storageTier: 'file',
      purpose: 'signing',
    });
    expect(entry.id).toBe('lifecycle-ed25519');
    expect(entry.version).toBe(1);
    expect(entry.revoked).toBe(false);

    // 3. Write key material to storage
    const storage = createStorage('file', tempDir);
    await storage.write(entry.id, generated.privateKey);
    await storage.write(`${entry.id}.pub`, generated.publicKey!);

    // 4. List keys
    const listResult = await listKeys(tempDir);
    expect(listResult.keys).toHaveLength(1);
    expect(listResult.keys[0].id).toBe('lifecycle-ed25519');
    expect(listResult.table).toContain('lifecycle-ed25519');

    // 5. Rotate key
    const rotateResult = await rotateKey(tempDir, 'lifecycle-ed25519');
    expect(rotateResult.entry.version).toBe(2);
    expect(rotateResult.previousVersion).toBe(1);
    expect(rotateResult.entry.rotatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Verify new key is different
    const newKey = await storage.read(entry.id);
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(generated.privateKey);

    // 6. Revoke key
    const revokeResult = await revokeKey(tempDir, 'lifecycle-ed25519', 'end of lifecycle test');
    expect(revokeResult.entry.revoked).toBe(true);
    expect(revokeResult.revokedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // 7. Verify revoked key cannot be rotated
    await expect(rotateKey(tempDir, 'lifecycle-ed25519')).rejects.toThrow(
      'Cannot rotate revoked key',
    );

    // 8. Verify final state
    const finalEntry = await getKey(tempDir, 'lifecycle-ed25519');
    expect(finalEntry!.revoked).toBe(true);
    expect(finalEntry!.version).toBe(2);
  });
});
