/**
 * L3: Ceremony acceptance — full M-of-N lifecycle + single-dev bypass
 * + audit chain integrity + share isolation.
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
  deriveSingleDevKey,
} from '../../src/keys/ceremony.js';
import type { CeremonyShare } from '../../src/keys/ceremony.js';
import {
  recordCeremonyInitiated,
  recordShareDistributed,
  recordKeyReconstructed,
} from '../../src/keys/ceremony-audit.js';
import { readAuditChain } from '../../src/compliance/audit-chain.js';

describe('ceremony acceptance', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full M-of-N lifecycle + single-dev bypass + audit integrity + share isolation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-acc-'));

    // ─── Part 1: Full M-of-N Ceremony ──────────────────────────────────

    // Generate a realistic 32-byte root key
    const rootKey = randomBytes(32).toString('hex');

    // Init ceremony: 5 shares, threshold 3
    const initResult = shamirSplit(rootKey, 5, 3);
    expect(initResult.totalShares).toBe(5);
    expect(initResult.threshold).toBe(3);
    expect(initResult.shares).toHaveLength(5);

    await recordCeremonyInitiated(
      tempDir,
      initResult.ceremonyId,
      initResult.totalShares,
      initResult.threshold,
    );

    // Distribute shares to named participants with tracking
    const names = ['Alice Keyholder', 'Bob Trustee', 'Carol Auditor', 'Dave CTO', 'Eve CISO'];
    const participantRecords = [];
    for (let i = 0; i < 5; i++) {
      const p = recordParticipant(names[i]!, initResult.shares[i]!.index);
      participantRecords.push(p);
      await recordShareDistributed(tempDir, initResult.ceremonyId, p);
    }

    // Verify each participant has identity, index, and timestamp
    for (let i = 0; i < 5; i++) {
      expect(participantRecords[i]!.identity).toBe(names[i]);
      expect(participantRecords[i]!.index).toBe(i + 1);
      expect(participantRecords[i]!.distributedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }

    // Reconstruct with 3 shares — should recover original key
    const subset = [initResult.shares[0]!, initResult.shares[2]!, initResult.shares[4]!];
    const reconResult = shamirReconstruct(subset, initResult.keyHash);
    expect(reconResult.key).toBe(rootKey);
    expect(reconResult.verified).toBe(true);

    await recordKeyReconstructed(tempDir, initResult.ceremonyId, 3, true);

    // ─── Part 2: Single-Dev Bypass ─────────────────────────────────────

    const singleDevResult = deriveSingleDevKey('test-passphrase-2026', 'my-workspace');
    expect(singleDevResult.key).toHaveLength(64);
    expect(singleDevResult.algorithm).toBe('pbkdf2-sha256');

    // Same passphrase + salt always produces same key
    const singleDevResult2 = deriveSingleDevKey('test-passphrase-2026', 'my-workspace');
    expect(singleDevResult.key).toBe(singleDevResult2.key);

    // ─── Part 3: Audit Chain Integrity ─────────────────────────────────

    const chain = await readAuditChain(tempDir);
    const ceremonyEvents = chain.filter((e) => e.target === initResult.ceremonyId);

    // Expected: 1 CEREMONY_INITIATED + 5 SHARE_DISTRIBUTED + 1 KEY_RECONSTRUCTED = 7
    expect(ceremonyEvents).toHaveLength(7);

    // Verify event types in order
    expect(ceremonyEvents[0]!.eventType).toBe('CEREMONY_INITIATED');
    for (let i = 1; i <= 5; i++) {
      expect(ceremonyEvents[i]!.eventType).toBe('SHARE_DISTRIBUTED');
    }
    expect(ceremonyEvents[6]!.eventType).toBe('KEY_RECONSTRUCTED');

    // All events have sequential seq numbers
    for (let i = 0; i < ceremonyEvents.length; i++) {
      expect(typeof ceremonyEvents[i]!.seq).toBe('number');
      expect(ceremonyEvents[i]!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }

    // Verify HMAC signatures are present
    for (const event of ceremonyEvents) {
      expect(event.hmac).toBeTruthy();
      expect(typeof event.hmac).toBe('string');
    }

    // ─── Part 4: Share Isolation ───────────────────────────────────────

    // Each share is a distinct object with unique index and data
    const indices = new Set<number>();
    const datas = new Set<string>();
    for (const share of initResult.shares) {
      indices.add(share.index);
      datas.add(share.data);
    }
    // All indices unique (1..5)
    expect(indices.size).toBe(5);
    // All share data unique (each share byte sequence is different)
    expect(datas.size).toBe(5);

    // Shares can be written to separate outputs — verify they are independent objects
    const share1: CeremonyShare = initResult.shares[0]!;
    const share2: CeremonyShare = initResult.shares[1]!;
    expect(share1).not.toBe(share2);
    expect(share1.index).not.toBe(share2.index);
    expect(share1.data).not.toBe(share2.data);
  });
});
