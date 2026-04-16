/**
 * L0: Audit chain integrity verification — tamper-type detection.
 *
 * Tests: untampered pass (1), deleted entry gap (1),
 *        reordered entries (1), modified entry content (1).
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { verifyChainIntegrity, analyzePostBreak } from '../../src/audit/verify.js';
import type { AuditEntry, ChainEntry } from '../../src/audit/types.js';

function makeEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    timestamp: '2026-04-14T10:00:00Z',
    eventType: 'TOOL_CALL',
    actor: 'agent-1',
    target: 'Bash',
    action: 'invoke',
    outcome: 'deny',
    ruleId: 'SEC-001',
    severity: 4,
    policyVersion: '1.0.0',
    ...overrides,
  };
}

/**
 * Build a chain of N entries and return entries + key for verification.
 */
function buildChain(count: number): { entries: ChainEntry[]; key: Buffer } {
  const key = randomBytes(32);
  const chain = new AuditChain(key);
  for (let i = 0; i < count; i++) {
    chain.append(makeEntry({ action: `action-${i}`, target: `resource-${i}` }));
  }
  return { entries: [...chain.read()] as ChainEntry[], key };
}

describe('verifyChainIntegrity', () => {
  it('returns pass for an untampered chain', () => {
    const { entries, key } = buildChain(10);

    const result = verifyChainIntegrity(entries, key);

    expect(result.valid).toBe(true);
    expect(result.length).toBe(10);
    expect(result.genesisHash).toBe(entries[0]!.hash);
    expect(result.latestHash).toBe(entries[9]!.hash);
    expect(result.breakPoint).toBeUndefined();
    expect(result.tamperType).toBeUndefined();
    expect(result.details).toBeUndefined();
  });

  it('detects deleted entry — gap in previousHash references', () => {
    const { entries, key } = buildChain(10);

    // Delete entry at index 5 — entry 6 now references a hash that
    // no longer exists in the chain
    const tampered = [...entries.slice(0, 5), ...entries.slice(6)];

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('deletion');
    expect(result.breakPoint).toBe(5);
    expect(result.details).toContain('deleted');
    expect(result.brokenAtSeq).toBe(5);
  });

  it('detects reordered entries — previousHash matches a different entry', () => {
    const { entries, key } = buildChain(10);

    // Swap entries at index 3 and 7 — both will have previousHash
    // mismatches, but the first detected will be at index 3
    const tampered = [...entries];
    const tmp = tampered[3]!;
    tampered[3] = tampered[7]!;
    tampered[7] = tmp;

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('reorder');
    // The first break is detected at the first swapped position
    expect(result.breakPoint).toBe(3);
    expect(result.details).toContain('reordered');
  });

  it('detects modified entry content — recomputed hash mismatch', () => {
    const { entries, key } = buildChain(10);

    // Modify the content of entry 4, but preserve hash and previousHash
    // so the link check passes — only the content check catches this
    const tampered = [...entries];
    const original = tampered[4]!;
    tampered[4] = {
      ...original,
      action: 'TAMPERED_ACTION',
      // hash and previousHash are kept as-is, so link check passes
      // but content hash recomputation will fail
    };

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('modification');
    expect(result.breakPoint).toBe(4);
    expect(result.details).toContain('modified');
    expect(result.brokenAtSeq).toBe(4);
  });

  it('detects genesis entry with previousHash referencing a known hash — reorder', () => {
    const { entries, key } = buildChain(5);

    // Remove the real genesis entry (index 0) so entry 1 becomes the new
    // first entry. Entry 1's previousHash points to entry 0's hash, which
    // still exists in the remaining chain... except entry 0 was removed.
    // Instead, craft a scenario: move the last entry to position 0.
    // The moved entry's previousHash references a hash still in the chain → reorder.
    const tampered: ChainEntry[] = [
      entries[4]!, // has previousHash === entries[3].hash, which is in the chain
      entries[1]!,
      entries[2]!,
      entries[3]!,
    ];

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.breakPoint).toBe(0);
    expect(result.tamperType).toBe('reorder');
    expect(result.details).toContain('reordered');
  });

  it('detects genesis entry with previousHash not in chain — deletion', () => {
    const { entries, key } = buildChain(5);

    // Remove entry 0 so entry 1 becomes the first. Entry 1's previousHash
    // references entry 0's hash, which no longer exists → deletion.
    const tampered = entries.slice(1);

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.breakPoint).toBe(0);
    expect(result.tamperType).toBe('deletion');
    expect(result.details).toContain('deleted');
  });

  it('detects non-genesis entry with null previousHash — reorder', () => {
    const { entries, key } = buildChain(5);

    // Place the genesis entry (previousHash === null) at index 2
    const tampered: ChainEntry[] = [
      entries[1]!,
      entries[2]!,
      entries[0]!, // genesis entry moved to position 2
      entries[3]!,
      entries[4]!,
    ];

    // First break detected is at index 0 (entry 1 has non-null previousHash
    // at genesis position). But entry 1's previousHash references entry 0's
    // hash which IS in the chain → reorder at index 0.
    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('reorder');
  });

  it('detects hash length mismatch via safeHexEqual', () => {
    const { entries, key } = buildChain(5);

    // Tamper: give entry 2 a previousHash with different length than entry 1's hash
    const tampered = [...entries];
    tampered[2] = { ...tampered[2]!, previousHash: 'ab' };

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    // The short previousHash won't match the predecessor, and it won't
    // be in knownHashes either → detected as deletion
    expect(result.tamperType).toBe('deletion');
    expect(result.breakPoint).toBe(2);
  });

  it('accepts hex string audit key', () => {
    const { entries, key } = buildChain(10);
    const keyHex = key.toString('hex');

    const result = verifyChainIntegrity(entries, keyHex);

    expect(result.valid).toBe(true);
    expect(result.length).toBe(10);
  });

  it('detects null previousHash at non-zero index specifically', () => {
    const { entries, key } = buildChain(5);

    // Put the genesis entry at position 0 (unchanged), but also place
    // another entry with null previousHash at position 2
    const tampered: ChainEntry[] = [
      entries[0]!,
      entries[1]!,
      { ...entries[2]!, previousHash: null },
      entries[3]!,
      entries[4]!,
    ];

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.breakPoint).toBe(2);
    expect(result.tamperType).toBe('reorder');
    expect(result.details).toContain('null previousHash');
    expect(result.details).toContain('not the genesis entry');
  });
});

describe('analyzePostBreak', () => {
  it('returns null for a valid chain', () => {
    const { entries, key } = buildChain(10);
    const verifyResult = verifyChainIntegrity(entries, key);

    const analysis = analyzePostBreak(entries, verifyResult, key);
    expect(analysis).toBeNull();
  });

  it('returns null for an empty chain', () => {
    const key = randomBytes(32);
    const verifyResult = verifyChainIntegrity([], key);

    const analysis = analyzePostBreak([], verifyResult, key);
    expect(analysis).toBeNull();
  });

  it('classifies localized break scope (< 10%)', () => {
    const { entries, key } = buildChain(20);

    // Modify the second-to-last entry — only 2 of 20 entries affected (10%)
    const tampered = [...entries];
    tampered[18] = { ...tampered[18]!, action: 'TAMPERED' };

    const verifyResult = verifyChainIntegrity(tampered, key);
    const analysis = analyzePostBreak(tampered, verifyResult, key);

    expect(analysis).not.toBeNull();
    expect(analysis!.scope).toBe('localized');
    expect(analysis!.affectedPercent).toBeLessThanOrEqual(10);
    expect(analysis!.primaryTamperType).toBe('modification');
  });

  it('classifies sectional break scope (10–50%)', () => {
    const { entries, key } = buildChain(10);

    // Break at index 6 — 4 of 10 entries affected (40%)
    const tampered = [...entries];
    tampered[6] = { ...tampered[6]!, action: 'TAMPERED' };

    const verifyResult = verifyChainIntegrity(tampered, key);
    const analysis = analyzePostBreak(tampered, verifyResult, key);

    expect(analysis).not.toBeNull();
    expect(analysis!.scope).toBe('sectional');
    expect(analysis!.affectedPercent).toBeGreaterThan(10);
    expect(analysis!.affectedPercent).toBeLessThanOrEqual(50);
  });

  it('classifies catastrophic break scope (> 50%)', () => {
    const { entries, key } = buildChain(10);

    // Break at index 1 — 9 of 10 entries affected (90%)
    const tampered = [...entries];
    tampered[1] = { ...tampered[1]!, action: 'TAMPERED' };

    const verifyResult = verifyChainIntegrity(tampered, key);
    const analysis = analyzePostBreak(tampered, verifyResult, key);

    expect(analysis).not.toBeNull();
    expect(analysis!.scope).toBe('catastrophic');
    expect(analysis!.affectedPercent).toBeGreaterThan(50);
  });

  it('accepts hex string audit key', () => {
    const { entries, key } = buildChain(10);
    const keyHex = key.toString('hex');

    // Modify entry 3 to create a break
    const tampered = [...entries];
    tampered[3] = { ...tampered[3]!, action: 'TAMPERED' };

    const verifyResult = verifyChainIntegrity(tampered, keyHex);
    expect(verifyResult.valid).toBe(false);

    // analyzePostBreak also with hex string key
    const analysis = analyzePostBreak(tampered, verifyResult, keyHex);
    expect(analysis).not.toBeNull();
    expect(analysis!.primaryTamperType).toBe('modification');
  });

  it('falls back to brokenAtSeq when breakPoint is undefined', () => {
    const { entries, key } = buildChain(10);

    // Construct a synthetic verify result with breakPoint undefined
    // but brokenAtSeq set (mimics the older verifyChain API)
    const syntheticResult: import('../../src/audit/types.js').ChainVerifyResult = {
      valid: false,
      length: 10,
      brokenAtSeq: 5,
      error: 'synthetic failure',
      // breakPoint intentionally omitted
      // tamperType intentionally omitted → tests the ?? 'modification' fallback
    };

    const analysis = analyzePostBreak(entries, syntheticResult, key);

    expect(analysis).not.toBeNull();
    expect(analysis!.affectedEntries).toBe(5); // 10 - 5
    expect(analysis!.primaryTamperType).toBe('modification'); // fallback
  });

  it('falls back to breakPoint 0 when both breakPoint and brokenAtSeq are undefined', () => {
    const { entries, key } = buildChain(5);

    const syntheticResult: import('../../src/audit/types.js').ChainVerifyResult = {
      valid: false,
      length: 5,
      error: 'synthetic failure',
      // Both breakPoint and brokenAtSeq undefined → falls back to 0
    };

    const analysis = analyzePostBreak(entries, syntheticResult, key);

    expect(analysis).not.toBeNull();
    expect(analysis!.affectedEntries).toBe(5); // 5 - 0
    expect(analysis!.scope).toBe('catastrophic'); // 100%
    expect(analysis!.primaryTamperType).toBe('modification'); // fallback
  });

  it('counts post-break modifications', () => {
    const { entries, key } = buildChain(10);

    // Break at index 3, and also modify entries 5 and 7 content+hash
    const tampered = [...entries];
    tampered[3] = { ...tampered[3]!, action: 'TAMPERED_3' };
    // Also tamper entries after the break point — change their content
    // but keep their stored hash so recomputation will mismatch
    tampered[5] = { ...tampered[5]!, action: 'TAMPERED_5' };
    tampered[7] = { ...tampered[7]!, action: 'TAMPERED_7' };

    const verifyResult = verifyChainIntegrity(tampered, key);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.breakPoint).toBe(3);

    const analysis = analyzePostBreak(tampered, verifyResult, key);

    expect(analysis).not.toBeNull();
    expect(analysis!.postBreakModifications).toBeGreaterThanOrEqual(2);
    expect(analysis!.totalEntries).toBe(10);
    expect(analysis!.affectedEntries).toBe(7); // entries 3-9
  });
});
