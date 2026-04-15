/**
 * L1: Ceremony round-trip — full init→distribute→reconstruct lifecycle
 * with participant tracking.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
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
import { readAuditChain } from '../../src/compliance/audit-chain.js';

describe('ceremony round-trip integration', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full ceremony lifecycle: init N=5 M=3, distribute 5 shares, reconstruct with 3, verify key match', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-int-'));

    // Generate a random 32-byte root key
    const rootKey = randomBytes(32).toString('hex');

    // 1. Initialize ceremony — split into 5 shares, threshold 3
    const initResult = shamirSplit(rootKey, 5, 3);
    expect(initResult.totalShares).toBe(5);
    expect(initResult.threshold).toBe(3);
    expect(initResult.shares).toHaveLength(5);

    // Record ceremony initiation
    await recordCeremonyInitiated(
      tempDir,
      initResult.ceremonyId,
      initResult.totalShares,
      initResult.threshold,
    );

    // 2. Distribute all 5 shares to named participants
    const participantNames = ['alice', 'bob', 'carol', 'dave', 'eve'];
    const participants = [];
    for (let i = 0; i < 5; i++) {
      const p = recordParticipant(participantNames[i]!, initResult.shares[i]!.index);
      participants.push(p);
      await recordShareDistributed(tempDir, initResult.ceremonyId, p);
    }

    // Verify all participants recorded
    expect(participants).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(participants[i]!.identity).toBe(participantNames[i]);
      expect(participants[i]!.index).toBe(i + 1);
    }

    // 3. Reconstruct with 3 shares (alice, carol, eve)
    const subset = [initResult.shares[0]!, initResult.shares[2]!, initResult.shares[4]!];
    const reconstructResult = shamirReconstruct(subset, initResult.keyHash);

    expect(reconstructResult.key).toBe(rootKey);
    expect(reconstructResult.verified).toBe(true);

    // Record reconstruction
    await recordKeyReconstructed(tempDir, initResult.ceremonyId, 3, true);

    // 4. Verify audit chain integrity
    const chain = await readAuditChain(tempDir);
    const ceremonyEvents = chain.filter((e) => e.target === initResult.ceremonyId);

    // 1 init + 5 distributions + 1 reconstruct = 7 events
    expect(ceremonyEvents).toHaveLength(7);
    expect(ceremonyEvents[0]!.eventType).toBe('CEREMONY_INITIATED');
    for (let i = 1; i <= 5; i++) {
      expect(ceremonyEvents[i]!.eventType).toBe('SHARE_DISTRIBUTED');
    }
    expect(ceremonyEvents[6]!.eventType).toBe('KEY_RECONSTRUCTED');
  });

  it('ceremony with participant tracking verifies all identities recorded', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-int-'));

    const rootKey = randomBytes(16).toString('hex');
    const initResult = shamirSplit(rootKey, 4, 2);

    await recordCeremonyInitiated(tempDir, initResult.ceremonyId, 4, 2);

    // Distribute with email-style identities
    const identities = [
      'alice@corp.example.com',
      'bob@corp.example.com',
      'carol@corp.example.com',
      'dave@corp.example.com',
    ];
    for (let i = 0; i < 4; i++) {
      const p = recordParticipant(identities[i]!, initResult.shares[i]!.index);
      await recordShareDistributed(tempDir, initResult.ceremonyId, p);
    }

    // Check audit chain has all identities as actors
    const chain = await readAuditChain(tempDir);
    const distributions = chain.filter((e) => e.eventType === 'SHARE_DISTRIBUTED');

    expect(distributions).toHaveLength(4);
    const actors = distributions.map((e) => e.actor);
    for (const identity of identities) {
      expect(actors).toContain(identity);
    }

    // Verify outcome strings contain the correct share indices
    for (let i = 0; i < 4; i++) {
      expect(distributions[i]!.outcome).toContain(`Share ${i + 1}`);
      expect(distributions[i]!.outcome).toContain(identities[i]);
    }
  });
});
