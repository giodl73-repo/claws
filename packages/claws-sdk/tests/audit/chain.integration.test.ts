/**
 * L1: Audit chain integration — bulk append + verification, tamper detection.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain, verifyChain } from '../../src/audit/chain.js';
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

describe('audit chain integration', () => {
  it('appends 100 entries then verifies all HMAC-SHA256 chaining hashes', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    // Append 100 entries
    for (let i = 0; i < 100; i++) {
      chain.append(makeEntry(i));
    }

    expect(chain.length).toBe(100);

    // Verify chain integrity
    const result = chain.verify();
    expect(result.valid).toBe(true);
    expect(result.length).toBe(100);
    expect(result.genesisHash).toBeDefined();
    expect(result.latestHash).toBeDefined();
    expect(result.brokenAtSeq).toBeUndefined();
    expect(result.error).toBeUndefined();

    // Cross-check: standalone verifyChain function produces same result
    const entries = chain.read();
    const standaloneResult = verifyChain(entries, key);
    expect(standaloneResult.valid).toBe(true);
    expect(standaloneResult.length).toBe(100);

    // Verify all previousHash links
    expect(entries[0]!.previousHash).toBeNull();
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i]!.previousHash).toBe(entries[i - 1]!.hash);
    }
  });

  it('detects tampered entry mid-chain', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    // Build a chain of 20 entries
    for (let i = 0; i < 20; i++) {
      chain.append(makeEntry(i));
    }

    const entries = chain.read() as ChainEntry[];
    expect(entries).toHaveLength(20);

    // Tamper with entry at index 10 — change the action field
    const tampered = [...entries];
    const original = tampered[10]!;
    tampered[10] = {
      ...original,
      action: 'TAMPERED_ACTION',
    };

    // Verification must detect the tamper
    const result = verifyChain(tampered, key);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(10);
    expect(result.error).toContain('hash does not match');

    // Original chain still verifies
    const originalResult = verifyChain(entries, key);
    expect(originalResult.valid).toBe(true);
  });
});
