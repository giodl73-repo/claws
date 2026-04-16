/**
 * L0: Key ceremony — Shamir split/reconstruct, participant tracking,
 * audit events, single-dev mode.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  shamirSplit,
  shamirReconstruct,
  recordParticipant,
  deriveSingleDevKey,
  initCeremony,
} from '../../src/keys/ceremony.js';

describe('shamirSplit', () => {
  it('produces N shares from a hex-encoded key', () => {
    const key = 'aabbccdd11223344';
    const result = shamirSplit(key, 5, 3);

    expect(result.totalShares).toBe(5);
    expect(result.threshold).toBe(3);
    expect(result.shares).toHaveLength(5);
    expect(result.ceremonyId).toHaveLength(16); // 8 random bytes hex
    expect(result.keyHash).toHaveLength(64); // SHA-256 hex

    // Each share has unique index 1..5 and hex data of same length as key
    for (let i = 0; i < 5; i++) {
      const share = result.shares[i]!;
      expect(share.index).toBe(i + 1);
      expect(share.data).toHaveLength(key.length); // same byte count, hex-encoded
    }
  });

  it('reconstruct with M shares recovers the original key', () => {
    const key = 'deadbeef01020304aabbccdd';
    const result = shamirSplit(key, 5, 3);

    // Take shares 1, 3, 5 (any 3-of-5)
    const subset = [result.shares[0]!, result.shares[2]!, result.shares[4]!];
    const reconstructed = shamirReconstruct(subset, result.keyHash);

    expect(reconstructed.key).toBe(key);
    expect(reconstructed.verified).toBe(true);
  });

  it('reconstruct with M-1 shares fails to recover the original key', () => {
    const key = 'aabbccdd11223344';
    const result = shamirSplit(key, 5, 3);

    // Only 2 shares — below threshold
    const subset = [result.shares[0]!, result.shares[1]!];
    const reconstructed = shamirReconstruct(subset, result.keyHash);

    // With fewer than threshold shares, the reconstruction produces garbage
    // The verification hash will not match
    expect(reconstructed.verified).toBe(false);
  });
});

describe('recordParticipant', () => {
  it('records identity and timestamp for a share distribution', () => {
    const before = new Date().toISOString();
    const participant = recordParticipant('alice@example.com', 3);

    expect(participant.identity).toBe('alice@example.com');
    expect(participant.index).toBe(3);
    expect(participant.distributedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(participant.distributedAt >= before).toBe(true);
  });
});

describe('deriveSingleDevKey', () => {
  it('produces a valid 32-byte hex key from passphrase', () => {
    const result = deriveSingleDevKey('my-secure-passphrase', 'workspace-salt');

    expect(result.key).toHaveLength(64); // 32 bytes hex
    expect(result.algorithm).toBe('pbkdf2-sha256');
  });

  it('produces deterministic output for same inputs', () => {
    const r1 = deriveSingleDevKey('passphrase', 'salt');
    const r2 = deriveSingleDevKey('passphrase', 'salt');
    expect(r1.key).toBe(r2.key);
  });

  it('produces different output for different passphrases', () => {
    const r1 = deriveSingleDevKey('passphrase-a', 'salt');
    const r2 = deriveSingleDevKey('passphrase-b', 'salt');
    expect(r1.key).not.toBe(r2.key);
  });
});

describe('shamirSplit validation', () => {
  it('throws when threshold < 2', () => {
    expect(() => shamirSplit('aabb', 3, 1)).toThrow('Threshold must be at least 2');
  });

  it('throws when totalShares < threshold', () => {
    expect(() => shamirSplit('aabb', 2, 3)).toThrow('Total shares must be >= threshold');
  });

  it('throws on empty key material', () => {
    expect(() => shamirSplit('', 3, 2)).toThrow('Key material must not be empty');
  });

  it('throws on more than 255 shares', () => {
    expect(() => shamirSplit('aabb', 256, 2)).toThrow('Maximum 255 shares supported');
  });
});

describe('shamirReconstruct edge cases', () => {
  it('throws on empty shares array', () => {
    expect(() => shamirReconstruct([], 'abc')).toThrow('No shares provided');
  });

  it('throws on mismatched share data lengths', () => {
    const shares = [
      { index: 1, data: 'aabb' },
      { index: 2, data: 'aabbcc' }, // different length
    ];
    expect(() => shamirReconstruct(shares, 'abc')).toThrow('Share data length mismatch');
  });

  it('works with exact threshold (M-of-M)', () => {
    const key = 'ff00ff00';
    const result = shamirSplit(key, 3, 3);

    // All 3 shares needed
    const reconstructed = shamirReconstruct(result.shares.slice(), result.keyHash);
    expect(reconstructed.key).toBe(key);
    expect(reconstructed.verified).toBe(true);
  });

  it('works with all N shares (N > M)', () => {
    const key = '0102030405060708';
    const result = shamirSplit(key, 7, 3);

    // Using all 7 shares
    const reconstructed = shamirReconstruct(result.shares.slice(), result.keyHash);
    expect(reconstructed.key).toBe(key);
    expect(reconstructed.verified).toBe(true);
  });

  it('works with different subsets of M shares', () => {
    const key = 'cafebabe';
    const result = shamirSplit(key, 5, 3);

    // Try multiple different 3-share subsets
    const subsets = [
      [result.shares[0]!, result.shares[1]!, result.shares[2]!],
      [result.shares[0]!, result.shares[2]!, result.shares[4]!],
      [result.shares[1]!, result.shares[3]!, result.shares[4]!],
      [result.shares[2]!, result.shares[3]!, result.shares[4]!],
    ];

    for (const subset of subsets) {
      const reconstructed = shamirReconstruct(subset, result.keyHash);
      expect(reconstructed.key).toBe(key);
      expect(reconstructed.verified).toBe(true);
    }
  });
});

describe('initCeremony', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates key, registers, stores hash (not raw key), and splits into shares', async () => {
    const mockKeyId = 'hmac-test1234';
    const mockEntry = {
      id: mockKeyId,
      algorithm: 'hmac-sha256' as const,
      storageTier: 'file' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      rotatedAt: null,
      revoked: false,
      rotationSchedule: null,
      version: 1,
      purpose: 'root' as const,
      revokedAt: null,
    };

    // Mock registerKey to return a known entry
    const registryModule = await import('../../src/keys/registry.js');
    vi.spyOn(registryModule, 'registerKey').mockResolvedValue(mockEntry);

    // Mock createStorage to return a storage with a write spy
    const writeSpy = vi.fn().mockResolvedValue(undefined);
    const storageModule = await import('../../src/keys/storage.js');
    vi.spyOn(storageModule, 'createStorage').mockReturnValue({
      tier: 'file',
      write: writeSpy,
      read: vi.fn(),
      delete: vi.fn(),
    });

    const result = await initCeremony('/tmp/test-ws', {
      totalShares: 5,
      threshold: 3,
    });

    // Verify registerKey was called with correct args
    expect(registryModule.registerKey).toHaveBeenCalledWith('/tmp/test-ws', {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'root',
    });

    // Verify storage.write persists only the key hash, NOT the raw key material.
    // The unsplit key must never touch disk — only the SHA-256 hash is stored
    // for reconstruction verification.
    expect(writeSpy).toHaveBeenCalledOnce();
    expect(writeSpy.mock.calls[0]![0]).toBe(mockKeyId);
    // SHA-256 hash is 64 hex chars
    expect(writeSpy.mock.calls[0]![1]).toHaveLength(64);
    // The stored value must be the keyHash, not raw key material
    expect(writeSpy.mock.calls[0]![1]).toBe(result.keyHash);

    // Verify result structure
    expect(result.keyId).toBe(mockKeyId);
    expect(result.totalShares).toBe(5);
    expect(result.threshold).toBe(3);
    expect(result.shares).toHaveLength(5);
    expect(result.keyHash).toHaveLength(64);
    expect(result.ceremonyId).toHaveLength(16);
  });

  it('uses custom purpose when provided', async () => {
    const mockEntry = {
      id: 'hmac-custom99',
      algorithm: 'hmac-sha256' as const,
      storageTier: 'file' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      rotatedAt: null,
      revoked: false,
      rotationSchedule: null,
      version: 1,
      purpose: 'signing' as const,
      revokedAt: null,
    };

    const registryModule = await import('../../src/keys/registry.js');
    vi.spyOn(registryModule, 'registerKey').mockResolvedValue(mockEntry);

    const storageModule = await import('../../src/keys/storage.js');
    vi.spyOn(storageModule, 'createStorage').mockReturnValue({
      tier: 'file',
      write: vi.fn().mockResolvedValue(undefined),
      read: vi.fn(),
      delete: vi.fn(),
    });

    await initCeremony('/tmp/test-ws', {
      totalShares: 3,
      threshold: 2,
      purpose: 'signing',
    });

    expect(registryModule.registerKey).toHaveBeenCalledWith('/tmp/test-ws', {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
  });

  it('stores only the key hash — shares reconstruct to a key that verifies against it', async () => {
    let storedValue = '';
    const mockEntry = {
      id: 'hmac-roundtrip',
      algorithm: 'hmac-sha256' as const,
      storageTier: 'file' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      rotatedAt: null,
      revoked: false,
      rotationSchedule: null,
      version: 1,
      purpose: 'root' as const,
      revokedAt: null,
    };

    const registryModule = await import('../../src/keys/registry.js');
    vi.spyOn(registryModule, 'registerKey').mockResolvedValue(mockEntry);

    const storageModule = await import('../../src/keys/storage.js');
    vi.spyOn(storageModule, 'createStorage').mockReturnValue({
      tier: 'file',
      write: vi.fn().mockImplementation(async (_id: string, value: string) => {
        storedValue = value;
      }),
      read: vi.fn(),
      delete: vi.fn(),
    });

    const result = await initCeremony('/tmp/test-ws', {
      totalShares: 5,
      threshold: 3,
    });

    // The stored value is the key hash, NOT the raw key material
    expect(storedValue).toBe(result.keyHash);

    // Reconstruct from 3 shares — the reconstructed key is NOT the stored value
    // (stored value is the hash), but reconstruction verifies against the hash
    const subset = [result.shares[0]!, result.shares[2]!, result.shares[4]!];
    const reconstructed = shamirReconstruct(subset, result.keyHash);
    expect(reconstructed.verified).toBe(true);
    // The reconstructed key is different from what's on disk (hash vs raw key)
    expect(reconstructed.key).not.toBe(storedValue);
  });
});
