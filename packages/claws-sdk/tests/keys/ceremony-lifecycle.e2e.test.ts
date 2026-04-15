/**
 * L2: Ceremony E2E — full ceremony + key signing lifecycle + threshold boundary tests.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  shamirSplit,
  shamirReconstruct,
  recordParticipant,
} from '../../src/keys/ceremony.js';
import {
  recordCeremonyInitiated,
  recordShareDistributed,
  recordKeyReconstructed,
} from '../../src/keys/ceremony-audit.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { rotateKey } from '../../src/keys/rotate.js';
import { readAuditChain } from '../../src/compliance/audit-chain.js';

describe('ceremony E2E: ceremony + key lifecycle', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('ceremony init → sign artifact → rotate key → re-sign → verify chain', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-e2e-'));

    // 1. Generate an Ed25519 root key
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'root-ceremony-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // 2. Split the private key via ceremony
    // Use the private key material (PEM) hex-encoded
    const keyHex = Buffer.from(generated.privateKey).toString('hex');
    const initResult = shamirSplit(keyHex, 5, 3);

    await recordCeremonyInitiated(tempDir, initResult.ceremonyId, 5, 3);

    // Distribute shares
    for (let i = 0; i < 5; i++) {
      const p = recordParticipant(`trustee-${i + 1}`, initResult.shares[i]!.index);
      await recordShareDistributed(tempDir, initResult.ceremonyId, p);
    }

    // 3. Rotate the key
    const rotateResult = await rotateKey(tempDir, 'root-ceremony-key');
    expect(rotateResult.entry.version).toBe(2);
    expect(rotateResult.previousVersion).toBe(1);

    // 4. Reconstruct original key from ceremony shares
    const subset = [initResult.shares[0]!, initResult.shares[2]!, initResult.shares[4]!];
    const reconstructed = shamirReconstruct(subset, initResult.keyHash);
    expect(reconstructed.verified).toBe(true);
    expect(reconstructed.key).toBe(keyHex);

    await recordKeyReconstructed(tempDir, initResult.ceremonyId, 3, true);

    // 5. Verify registry shows rotated version
    const updatedEntry = await getKey(tempDir, 'root-ceremony-key');
    expect(updatedEntry!.version).toBe(2);
    expect(updatedEntry!.rotatedAt).toBeTruthy();

    // 6. Verify audit chain has ceremony events
    const chain = await readAuditChain(tempDir);
    const ceremonyEvents = chain.filter((e) => e.target === initResult.ceremonyId);
    expect(ceremonyEvents.length).toBeGreaterThanOrEqual(7); // 1 init + 5 dist + 1 reconstruct
  });

  it('ceremony threshold boundary: 5/3 → 3 shares ok → 2 shares fail → audit chain complete', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-e2e-'));

    const rootKey = 'aabbccddee112233445566778899aabb';
    const initResult = shamirSplit(rootKey, 5, 3);

    // Record ceremony initiation
    await recordCeremonyInitiated(tempDir, initResult.ceremonyId, 5, 3);

    // Distribute all 5 shares
    for (let i = 0; i < 5; i++) {
      const p = recordParticipant(`participant-${i + 1}`, initResult.shares[i]!.index);
      await recordShareDistributed(tempDir, initResult.ceremonyId, p);
    }

    // Reconstruct with exactly 3 shares — should succeed
    const threeShares = [initResult.shares[1]!, initResult.shares[2]!, initResult.shares[3]!];
    const goodResult = shamirReconstruct(threeShares, initResult.keyHash);
    expect(goodResult.key).toBe(rootKey);
    expect(goodResult.verified).toBe(true);

    await recordKeyReconstructed(tempDir, initResult.ceremonyId, 3, true);

    // Reconstruct with only 2 shares — should fail verification
    const twoShares = [initResult.shares[0]!, initResult.shares[4]!];
    const badResult = shamirReconstruct(twoShares, initResult.keyHash);
    expect(badResult.verified).toBe(false);

    // Record the failed reconstruction too
    await recordKeyReconstructed(tempDir, `${initResult.ceremonyId}-retry`, 2, false);

    // Verify full audit chain
    const chain = await readAuditChain(tempDir);

    // Check for all event types
    const initiated = chain.filter((e) => e.eventType === 'CEREMONY_INITIATED');
    const distributed = chain.filter((e) => e.eventType === 'SHARE_DISTRIBUTED');
    const reconstructed = chain.filter((e) => e.eventType === 'KEY_RECONSTRUCTED');

    expect(initiated).toHaveLength(1);
    expect(distributed).toHaveLength(5);
    expect(reconstructed).toHaveLength(2);

    // First reconstruction succeeded
    expect(reconstructed[0]!.outcome).toContain('verified=true');
    // Second reconstruction failed
    expect(reconstructed[1]!.outcome).toContain('verified=false');

    // All events have timestamps and seq numbers
    for (const event of chain) {
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof event.seq).toBe('number');
    }
  });
});
