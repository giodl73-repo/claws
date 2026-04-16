/**
 * L1: Audit chain integrity verification integration — large chain + break-point accuracy.
 *
 * Tests: verify on 1000-entry chain (1), break-point location matches tampered index (1).
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { verifyChainIntegrity } from '../../src/audit/verify.js';
import type { AuditEntry, ChainEntry } from '../../src/audit/types.js';

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

describe('verifyChainIntegrity integration', () => {
  it('verifies a 1000-entry chain without false positives', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    for (let i = 0; i < 1000; i++) {
      chain.append(makeEntry(i));
    }

    const entries = chain.read();
    expect(entries).toHaveLength(1000);

    const result = verifyChainIntegrity(entries, key);

    expect(result.valid).toBe(true);
    expect(result.length).toBe(1000);
    expect(result.genesisHash).toBe(entries[0]!.hash);
    expect(result.latestHash).toBe(entries[999]!.hash);
    expect(result.breakPoint).toBeUndefined();
    expect(result.tamperType).toBeUndefined();
  });

  it('break-point location matches the tampered index across chain positions', () => {
    // Test that the break-point is accurate for tamper at various positions
    // in the chain: near the start, middle, and near the end.
    //
    // Note: deletion of the LAST entry is undetectable by chain verification
    // alone (no successor references the deleted entry's hash). Deletion
    // positions use interior indices only. Modification and reorder work at
    // any position including the last.
    const tamperPositions = [1, 50, 98];

    for (const tamperAt of tamperPositions) {
      const key = randomBytes(32);
      const chain = new AuditChain(key);

      for (let i = 0; i < 100; i++) {
        chain.append(makeEntry(i));
      }

      const entries = [...chain.read()] as ChainEntry[];

      // --- Deletion: remove the entry at tamperAt ---
      // The successor (now at index tamperAt) references the deleted entry's
      // hash, which is absent from the remaining chain → detected as deletion.
      const deletedChain = [...entries.slice(0, tamperAt), ...entries.slice(tamperAt + 1)];
      const deleteResult = verifyChainIntegrity(deletedChain, key);
      expect(deleteResult.valid).toBe(false);
      expect(deleteResult.breakPoint).toBe(tamperAt);
      expect(deleteResult.tamperType).toBe('deletion');

      // --- Modification: alter the content at tamperAt ---
      const modifiedChain = [...entries];
      const original = modifiedChain[tamperAt]!;
      modifiedChain[tamperAt] = { ...original, action: 'TAMPERED' };
      const modifyResult = verifyChainIntegrity(modifiedChain, key);
      expect(modifyResult.valid).toBe(false);
      expect(modifyResult.breakPoint).toBe(tamperAt);
      expect(modifyResult.tamperType).toBe('modification');

      // --- Reorder: swap tamperAt with tamperAt+1 ---
      const reorderedChain = [...entries];
      const tmp = reorderedChain[tamperAt]!;
      reorderedChain[tamperAt] = reorderedChain[tamperAt + 1]!;
      reorderedChain[tamperAt + 1] = tmp;
      const reorderResult = verifyChainIntegrity(reorderedChain, key);
      expect(reorderResult.valid).toBe(false);
      expect(reorderResult.breakPoint).toBe(tamperAt);
      expect(reorderResult.tamperType).toBe('reorder');
    }
  });
});
