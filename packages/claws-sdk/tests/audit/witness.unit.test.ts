/**
 * L0: Witness receipt storage and Merkle proof validation.
 *
 * Tests: receipt storage (1), Merkle proof validation (1).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AuditChain } from '../../src/audit/chain.js';
import {
  issueReceipt,
  validateReceipt,
  verifyMerkleProof,
  WitnessStore,
} from '../../src/audit/witness.js';
import type { AuditEntry } from '../../src/audit/types.js';

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

describe('witness receipt storage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'witness-store-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stores receipt at .claws/audit/receipts/{entryHash}.json and retrieves by hash', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    for (let i = 0; i < 8; i++) {
      chain.append(makeEntry({ action: `action-${i}` }));
    }

    const entries = chain.read();
    const receipt = issueReceipt(entries, 3);

    const store = new WitnessStore(tmpDir);
    store.store(receipt);

    // File exists at the expected path
    const receiptPath = path.join(tmpDir, '.claws', 'audit', 'receipts', `${receipt.entryHash}.json`);
    expect(fs.existsSync(receiptPath)).toBe(true);

    // Retrieve by hash — O(1) lookup
    const retrieved = store.get(receipt.entryHash);
    expect(retrieved).toBeDefined();
    expect(retrieved!.entryHash).toBe(receipt.entryHash);
    expect(retrieved!.rootHash).toBe(receipt.rootHash);
    expect(retrieved!.proof).toEqual(receipt.proof);
    expect(retrieved!.entrySeq).toBe(3);
    expect(retrieved!.chainLength).toBe(8);

    // has() returns true
    expect(store.has(receipt.entryHash)).toBe(true);

    // list() includes the hash
    const listed = store.list();
    expect(listed).toContain(receipt.entryHash);

    // get() returns undefined for missing (valid hex hash that doesn't exist on disk)
    expect(store.get('a'.repeat(64))).toBeUndefined();

    // has() returns false for missing (valid hex hash)
    expect(store.has('b'.repeat(64))).toBe(false);
  });
});

describe('WitnessStore path traversal validation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'witness-traversal-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects path traversal in store()', () => {
    const store = new WitnessStore(tmpDir);
    const maliciousReceipt = {
      entryHash: '../../etc/passwd',
      rootHash: 'a'.repeat(64),
      proof: [],
      issuedAt: '2026-04-14T10:00:00Z',
      entrySeq: 0,
      chainLength: 1,
    };
    expect(() => store.store(maliciousReceipt)).toThrow(/Invalid entry hash/);
  });

  it('rejects path traversal in get()', () => {
    const store = new WitnessStore(tmpDir);
    expect(() => store.get('../../etc/passwd')).toThrow(/Invalid entry hash/);
  });

  it('rejects path traversal in has()', () => {
    const store = new WitnessStore(tmpDir);
    expect(() => store.has('../../etc/passwd')).toThrow(/Invalid entry hash/);
  });

  it('rejects non-hex characters', () => {
    const store = new WitnessStore(tmpDir);
    expect(() => store.get('g'.repeat(64))).toThrow(/Invalid entry hash/);
  });

  it('rejects uppercase hex', () => {
    const store = new WitnessStore(tmpDir);
    expect(() => store.get('A'.repeat(64))).toThrow(/Invalid entry hash/);
  });

  it('rejects wrong-length hex strings', () => {
    const store = new WitnessStore(tmpDir);
    expect(() => store.get('abcd1234')).toThrow(/Invalid entry hash/);
    expect(() => store.get('a'.repeat(128))).toThrow(/Invalid entry hash/);
  });

  it('accepts valid 64-char lowercase hex hashes', () => {
    const store = new WitnessStore(tmpDir);
    // Should not throw — just returns undefined for non-existent
    expect(store.has('a'.repeat(64))).toBe(false);
    expect(store.get('0123456789abcdef'.repeat(4))).toBeUndefined();
  });
});

describe('Merkle proof validation', () => {
  it('validates receipt proves entry is included in chain root', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    for (let i = 0; i < 16; i++) {
      chain.append(makeEntry({ action: `action-${i}`, target: `resource-${i}` }));
    }

    const entries = chain.read();

    // Issue receipts for various positions
    for (const idx of [0, 5, 10, 15]) {
      const receipt = issueReceipt(entries, idx);

      // Receipt validates against its own proof
      expect(validateReceipt(receipt)).toBe(true);

      // Direct verification also works
      expect(
        verifyMerkleProof(receipt.entryHash, receipt.proof, receipt.rootHash),
      ).toBe(true);

      // Tampering with the entry hash invalidates the proof
      expect(
        verifyMerkleProof('0'.repeat(64), receipt.proof, receipt.rootHash),
      ).toBe(false);

      // Tampering with the root hash invalidates the proof
      expect(
        verifyMerkleProof(receipt.entryHash, receipt.proof, '0'.repeat(64)),
      ).toBe(false);
    }

    // Out of bounds throws
    expect(() => issueReceipt(entries, -1)).toThrow(RangeError);
    expect(() => issueReceipt(entries, 16)).toThrow(RangeError);
  });
});
