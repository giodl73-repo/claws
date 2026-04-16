/**
 * L0: T-02 regression — tamper detection for all three tamper modes.
 *
 * Tests: delete entry -> verify detects gap (1),
 *        reorder -> verify detects break (1),
 *        modification -> verify detects content mismatch (1).
 *
 * Validates THOTH-FINDINGS T-02: that the verify module correctly
 * distinguishes deletion, reordering, and content modification,
 * reporting the correct break-point index for each.
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

function buildChain(count: number): { entries: ChainEntry[]; key: Buffer } {
  const key = randomBytes(32);
  const chain = new AuditChain(key);
  for (let i = 0; i < count; i++) {
    chain.append(makeEntry({ action: `action-${i}`, target: `resource-${i}` }));
  }
  return { entries: [...chain.read()] as ChainEntry[], key };
}

describe('T-02 regression: tamper detection with break-point identification', () => {
  it('delete entry -> verify detects gap with correct break-point', () => {
    const { entries, key } = buildChain(20);

    // Delete entry at index 10 — entry 11 now references a hash that
    // no longer exists in the chain
    const tampered = [...entries.slice(0, 10), ...entries.slice(11)];
    expect(tampered.length).toBe(19);

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('deletion');
    expect(result.breakPoint).toBe(10);
    expect(result.details).toContain('deleted');
    expect(result.brokenAtSeq).toBe(10);

    // Post-break analysis confirms scope
    const analysis = analyzePostBreak(tampered, result, key);
    expect(analysis).not.toBeNull();
    expect(analysis!.primaryTamperType).toBe('deletion');
    expect(analysis!.affectedEntries).toBe(9);
    expect(analysis!.totalEntries).toBe(19);
  });

  it('reorder -> verify detects break with correct break-point', () => {
    const { entries, key } = buildChain(20);

    // Swap entries 5 and 15 — the first detected break is at the
    // earlier swap position
    const tampered = [...entries];
    const tmp = tampered[5]!;
    tampered[5] = tampered[15]!;
    tampered[15] = tmp;

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('reorder');
    expect(result.breakPoint).toBe(5);
    expect(result.details).toContain('reordered');

    // Post-break analysis confirms scope
    const analysis = analyzePostBreak(tampered, result, key);
    expect(analysis).not.toBeNull();
    expect(analysis!.primaryTamperType).toBe('reorder');
    expect(analysis!.affectedEntries).toBeGreaterThan(0);
  });

  it('modification -> verify detects content mismatch with correct break-point', () => {
    const { entries, key } = buildChain(20);

    // Modify content of entry 8, preserving hash and previousHash
    // so the link check passes but the content check fails
    const tampered = [...entries];
    const original = tampered[8]!;
    tampered[8] = {
      ...original,
      action: 'TAMPERED_CONTENT',
      outcome: 'TAMPERED_OUTCOME',
    };

    const result = verifyChainIntegrity(tampered, key);

    expect(result.valid).toBe(false);
    expect(result.tamperType).toBe('modification');
    expect(result.breakPoint).toBe(8);
    expect(result.details).toContain('modified');
    expect(result.brokenAtSeq).toBe(8);

    // Post-break analysis confirms scope
    const analysis = analyzePostBreak(tampered, result, key);
    expect(analysis).not.toBeNull();
    expect(analysis!.primaryTamperType).toBe('modification');
    expect(analysis!.scope).toBeDefined();
  });
});
