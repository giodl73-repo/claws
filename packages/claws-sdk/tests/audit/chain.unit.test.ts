/**
 * L0: Audit chain — append, chaining hash, genesis, order.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain, computeChainHash, verifyChain } from '../../src/audit/chain.js';
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

describe('computeChainHash', () => {
  it('accepts hex string audit key', () => {
    const keyBuf = randomBytes(32);
    const keyHex = keyBuf.toString('hex');
    const entry = makeEntry();

    const hashFromBuf = computeChainHash(keyBuf, null, entry);
    const hashFromHex = computeChainHash(keyHex, null, entry);

    expect(hashFromHex).toBe(hashFromBuf);
    expect(hashFromHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes entries with missing optional-at-runtime fields', () => {
    const key = randomBytes(32);
    // Cast to AuditEntry to bypass TS — simulates runtime partial data
    const sparse = {
      timestamp: '2026-04-14T10:00:00Z',
      eventType: 'TOOL_CALL',
      actor: 'agent-1',
      target: 'Bash',
      action: 'invoke',
      outcome: 'deny',
      ruleId: 'SEC-001',
      severity: 4,
      // policyVersion intentionally omitted
    } as AuditEntry;

    const hash = computeChainHash(key, null, sparse);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // A full entry should produce a different hash
    const full = makeEntry();
    const fullHash = computeChainHash(key, null, full);
    expect(fullHash).not.toBe(hash);
  });
});

describe('AuditChain append', () => {
  it('creates entry with previousHash linking to predecessor', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    const e1 = chain.append(makeEntry());
    const e2 = chain.append(makeEntry({ action: 'approve' }));

    expect(e2.previousHash).toBe(e1.hash);
    expect(e2.seq).toBe(1);
    expect(e2.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('computes HMAC-SHA256 chained hash correctly', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);
    const entry = makeEntry();

    const result = chain.append(entry);

    // Manually recompute and compare
    const expected = computeChainHash(key, null, entry);
    expect(result.hash).toBe(expected);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);

    // Second entry chains from the first
    const entry2 = makeEntry({ action: 'approve' });
    const result2 = chain.append(entry2);
    const expected2 = computeChainHash(key, result.hash, entry2);
    expect(result2.hash).toBe(expected2);
  });

  it('first entry has null previousHash', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    const first = chain.append(makeEntry());

    expect(first.previousHash).toBeNull();
    expect(first.seq).toBe(0);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('preserves chain order on read', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    const entries: ChainEntry[] = [];
    for (let i = 0; i < 5; i++) {
      entries.push(chain.append(makeEntry({ action: `action-${i}` })));
    }

    const read = chain.read();
    expect(read).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(read[i]!.seq).toBe(i);
      expect(read[i]!.action).toBe(`action-${i}`);
      expect(read[i]!.hash).toBe(entries[i]!.hash);
    }

    // Verify chain linkage
    expect(read[0]!.previousHash).toBeNull();
    for (let i = 1; i < 5; i++) {
      expect(read[i]!.previousHash).toBe(read[i - 1]!.hash);
    }
  });
});

describe('AuditChain constructor', () => {
  it('accepts hex string key', () => {
    const keyBuf = randomBytes(32);
    const keyHex = keyBuf.toString('hex');
    const chainFromBuf = new AuditChain(keyBuf);
    const chainFromHex = new AuditChain(keyHex);

    const entry = makeEntry();
    const e1 = chainFromBuf.append(entry);
    const e2 = chainFromHex.append(entry);

    // Same key (hex vs Buffer) must produce the same hash
    expect(e1.hash).toBe(e2.hash);
  });
});

describe('verifyChain', () => {
  it('returns valid for an empty chain', () => {
    const key = randomBytes(32);
    const result = verifyChain([], key);

    expect(result.valid).toBe(true);
    expect(result.length).toBe(0);
    expect(result.genesisHash).toBeUndefined();
    expect(result.latestHash).toBeUndefined();
  });

  it('detects genesis entry with non-null previousHash', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: set genesis entry's previousHash to a non-null value
    const tampered: ChainEntry[] = [
      { ...entries[0]!, previousHash: 'a'.repeat(64) },
      entries[1]!,
    ];

    const result = verifyChain(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(0);
    expect(result.error).toContain('First entry must have previousHash === null');
  });

  it('detects broken previousHash link in non-first entry', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    chain.append(makeEntry({ action: 'deny' }));
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: change entry 2's previousHash to something that doesn't match entry 1's hash
    const tampered: ChainEntry[] = [
      entries[0]!,
      entries[1]!,
      { ...entries[2]!, previousHash: 'b'.repeat(64) },
    ];

    const result = verifyChain(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(2);
    expect(result.error).toContain('Entry 2 previousHash does not match entry 1 hash');
  });

  it('detects broken link when non-first entry has null previousHash', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: set entry 1's previousHash to null
    const tampered: ChainEntry[] = [
      entries[0]!,
      { ...entries[1]!, previousHash: null },
    ];

    const result = verifyChain(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(1);
    expect(result.error).toContain('Entry 1 previousHash does not match entry 0 hash');
  });

  it('accepts hex string audit key', () => {
    const keyBuf = randomBytes(32);
    const keyHex = keyBuf.toString('hex');
    const chain = new AuditChain(keyBuf);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    const entries = chain.read();

    // Verify using hex string key instead of Buffer
    const result = verifyChain(entries, keyHex);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(2);
  });

  it('detects tampered hash with different length (safeHexEqual length check)', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: replace entry 1's hash with a shorter hex string
    const tampered: ChainEntry[] = [
      entries[0]!,
      { ...entries[1]!, hash: 'abcd' },
    ];

    const result = verifyChain(tampered, key);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(1);
  });

  it('detects previousHash length mismatch against predecessor hash', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    chain.append(makeEntry({ action: 'deny' }));
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: set entry 2's previousHash to a shorter hex — triggers
    // safeHexEqual length check in the link verification
    const tampered: ChainEntry[] = [
      entries[0]!,
      entries[1]!,
      { ...entries[2]!, previousHash: 'ab' },
    ];

    const result = verifyChain(tampered, key);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(2);
  });

  it('returns genesisHash and latestHash for valid chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    chain.append(makeEntry({ action: 'deny' }));
    const entries = chain.read();

    const result = verifyChain(entries, key);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(3);
    expect(result.genesisHash).toBe(entries[0]!.hash);
    expect(result.latestHash).toBe(entries[2]!.hash);
  });

  it('detects content modification (hash mismatch) on single-entry chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: modify content but keep old hash
    const tampered: ChainEntry[] = [
      { ...entries[0]!, action: 'tampered-action' },
    ];

    const result = verifyChain(tampered, key);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(0);
    expect(result.error).toContain('hash does not match recomputed HMAC-SHA256');
  });

  it('detects content modification in middle of chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));
    chain.append(makeEntry({ action: 'deny' }));
    const entries = [...chain.read()] as ChainEntry[];

    // Tamper: modify content of entry 1 but keep its hash and link intact
    const tampered: ChainEntry[] = [
      entries[0]!,
      { ...entries[1]!, action: 'tampered' },
      entries[2]!,
    ];

    const result = verifyChain(tampered, key);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(1);
    expect(result.error).toContain('hash does not match recomputed HMAC-SHA256');
  });
});

describe('AuditChain.length', () => {
  it('returns 0 for empty chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);
    expect(chain.length).toBe(0);
  });

  it('returns the number of appended entries', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    expect(chain.length).toBe(1);

    chain.append(makeEntry({ action: 'approve' }));
    chain.append(makeEntry({ action: 'deny' }));
    expect(chain.length).toBe(3);
  });
});

describe('AuditChain.verify', () => {
  it('returns valid for a fresh chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    chain.append(makeEntry());
    chain.append(makeEntry({ action: 'approve' }));

    const result = chain.verify();
    expect(result.valid).toBe(true);
    expect(result.length).toBe(2);
  });

  it('returns valid for empty chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    const result = chain.verify();
    expect(result.valid).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe('computeChainHash standalone', () => {
  it('produces different hashes with different previousHash values', () => {
    const key = randomBytes(32);
    const entry = makeEntry();

    const hashNull = computeChainHash(key, null, entry);
    const hashPrev = computeChainHash(key, 'a'.repeat(64), entry);

    expect(hashNull).not.toBe(hashPrev);
    expect(hashPrev).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes with different keys', () => {
    const key1 = randomBytes(32);
    const key2 = randomBytes(32);
    const entry = makeEntry();

    const hash1 = computeChainHash(key1, null, entry);
    const hash2 = computeChainHash(key2, null, entry);

    expect(hash1).not.toBe(hash2);
  });
});
