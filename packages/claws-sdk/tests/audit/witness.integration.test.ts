/**
 * L1: Witness receipt store + validate round-trip.
 *
 * Tests: receipt store + validate round-trip across chain positions (1).
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
  WitnessStore,
} from '../../src/audit/witness.js';
import type { AuditEntry } from '../../src/audit/types.js';

function makeEntry(index: number): AuditEntry {
  return {
    timestamp: new Date(Date.UTC(2026, 3, 14, 10, 0, index)).toISOString(),
    eventType: index % 2 === 0 ? 'TOOL_CALL' : 'POLICY_CHECK',
    actor: `agent-${index % 5}`,
    target: `resource-${index}`,
    action: index % 3 === 0 ? 'invoke' : index % 3 === 1 ? 'approve' : 'deny',
    outcome: index % 4 === 0 ? 'allow' : 'deny',
    ruleId: `SEC-${String(index).padStart(3, '0')}`,
    severity: (index % 5) + 1,
    policyVersion: '2.1.0',
  };
}

describe('witness receipt store + validate round-trip', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'witness-roundtrip-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('issues, stores, retrieves, and validates receipts across all chain positions', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);
    const chainSize = 32;

    for (let i = 0; i < chainSize; i++) {
      chain.append(makeEntry(i));
    }

    const entries = chain.read();
    const store = new WitnessStore(tmpDir);

    // Issue and store receipts for every entry
    const receipts = entries.map((_, idx) => {
      const receipt = issueReceipt(entries, idx);
      store.store(receipt);
      return receipt;
    });

    // All receipts share the same root hash (same chain snapshot)
    const rootHash = receipts[0]!.rootHash;
    for (const receipt of receipts) {
      expect(receipt.rootHash).toBe(rootHash);
    }

    // Verify all stored receipts: retrieve from disk and validate
    const storedHashes = store.list();
    expect(storedHashes).toHaveLength(chainSize);

    for (let i = 0; i < chainSize; i++) {
      const original = receipts[i]!;
      const retrieved = store.get(original.entryHash);

      expect(retrieved).toBeDefined();
      expect(retrieved!.entryHash).toBe(entries[i]!.hash);
      expect(retrieved!.entrySeq).toBe(i);
      expect(retrieved!.chainLength).toBe(chainSize);

      // Validate the Merkle proof after disk round-trip
      expect(validateReceipt(retrieved!)).toBe(true);
    }

    // Receipt for the last entry also validates
    const lastReceipt = store.get(entries[chainSize - 1]!.hash);
    expect(lastReceipt).toBeDefined();
    expect(validateReceipt(lastReceipt!)).toBe(true);

    // Receipts are independent: corrupting one doesn't affect others
    const corruptedReceipt = {
      ...receipts[5]!,
      entryHash: '0'.repeat(64),
    };
    expect(validateReceipt(corruptedReceipt)).toBe(false);
    // Other receipts are still valid
    expect(validateReceipt(receipts[6]!)).toBe(true);
  });
});
