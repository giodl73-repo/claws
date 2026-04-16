/**
 * L1: Key ceremony M-of-N threshold validation.
 *
 * THOTH-INTEGRATION-COVERAGE: validates that Shamir secret sharing
 * correctly splits and reconstructs keys through the ceremony API.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCeremony, shamirReconstruct } from '../../src/keys/ceremony.js';
import { getKey } from '../../src/keys/registry.js';
import { createStorage } from '../../src/keys/storage.js';

describe('key-ceremony integration', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('M-of-N threshold: ceremony initializes, stores only hash, shares reconstruct, below-threshold fails', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-ceremony-'));

    // Initialize a 3-of-5 ceremony
    const result = await initCeremony(tempDir, {
      totalShares: 5,
      threshold: 3,
    });

    // Verify ceremony output
    expect(result.shares).toHaveLength(5);
    expect(result.threshold).toBe(3);
    expect(result.totalShares).toBe(5);
    expect(result.keyId).toBeTruthy();
    expect(result.keyHash).toBeTruthy();
    expect(result.ceremonyId).toBeTruthy();

    // Verify key was registered in the registry
    const entry = await getKey(tempDir, result.keyId);
    expect(entry).not.toBeNull();
    expect(entry!.purpose).toBe('root');
    expect(entry!.algorithm).toBe('hmac-sha256');
    expect(entry!.storageTier).toBe('file');

    // Verify only the key hash was stored — NOT the raw key material.
    // The unsplit key must never be persisted to disk.
    const storage = createStorage('file', tempDir);
    const storedValue = await storage.read(result.keyId);
    expect(storedValue).toBeTruthy();
    expect(storedValue).toBe(result.keyHash);

    // Reconstruct with exactly threshold (3) shares — should succeed
    const threeShares = result.shares.slice(0, 3);
    const reconstructed = shamirReconstruct(threeShares, result.keyHash);
    expect(reconstructed.verified).toBe(true);
    // Reconstructed key is the raw key, NOT the stored hash
    expect(reconstructed.key).not.toBe(storedValue);

    // Reconstruct with more than threshold (4) shares — should also succeed
    const fourShares = result.shares.slice(0, 4);
    const reconstructed4 = shamirReconstruct(fourShares, result.keyHash);
    expect(reconstructed4.verified).toBe(true);

    // Reconstruct with fewer than threshold (2) shares — produces wrong key
    const twoShares = result.shares.slice(0, 2);
    const reconstructed2 = shamirReconstruct(twoShares, result.keyHash);
    expect(reconstructed2.verified).toBe(false);
  });
});
