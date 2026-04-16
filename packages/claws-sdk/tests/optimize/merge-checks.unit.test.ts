/**
 * Redundant check merging unit tests.
 *
 * L0: compatible rules merged (1), incompatible rules preserved separately (1)
 */

import { describe, it, expect } from 'vitest';
import { mergeRedundantChecks } from '../../src/optimize/merge-checks.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../../src/ir/mechanical-intent.js';

function makeIRWithIntents(
  intents: GovernanceIR['intents'],
): GovernanceIR {
  const base = minimalGovernanceIR();
  return { ...base, intents };
}

describe('mergeRedundantChecks', () => {
  it('merges compatible deny intents for the same tool and level', () => {
    const intents: DenyIntent[] = [
      {
        id: 'intent-a',
        ruleId: 'SEC-001',
        level: 5,
        kind: 'deny',
        description: 'Block delete_database for data safety',
        target: 'delete_database',
        reason: 'Critical data destruction',
      },
      {
        id: 'intent-b',
        ruleId: 'SEC-002',
        level: 5,
        kind: 'deny',
        description: 'Block delete_database for compliance',
        target: 'delete_database',
        reason: 'Compliance requirement',
      },
    ];

    const ir = makeIRWithIntents(intents);
    const result = mergeRedundantChecks(ir);

    expect(result.mergeCount).toBe(1);
    expect(result.ir.intents).toHaveLength(1);

    const merged = result.ir.intents[0]! as DenyIntent;
    expect(merged.ruleId).toBe('SEC-001+SEC-002');
    expect(merged.reason).toBe('Critical data destruction; Compliance requirement');
    expect(merged.description).toBe('Block delete_database for data safety; Block delete_database for compliance');
    expect(merged.target).toBe('delete_database');
    expect(merged.level).toBe(5);
  });

  it('preserves incompatible intents separately — different levels', () => {
    const intents: DenyIntent[] = [
      {
        id: 'intent-a',
        ruleId: 'SEC-001',
        level: 5,
        kind: 'deny',
        description: 'Block at R5',
        target: 'delete_database',
        reason: 'Critical',
      },
      {
        id: 'intent-b',
        ruleId: 'SEC-002',
        level: 3,
        kind: 'deny',
        description: 'Block at R3',
        target: 'delete_database',
        reason: 'Medium risk',
      },
    ];

    const ir = makeIRWithIntents(intents);
    const result = mergeRedundantChecks(ir);

    // Different levels = different groups = no merge
    expect(result.mergeCount).toBe(0);
    expect(result.ir.intents).toHaveLength(2);
  });

  it('preserves incompatible intents separately — different kinds', () => {
    const intents = [
      {
        id: 'intent-a',
        ruleId: 'SEC-001',
        level: 4 as const,
        kind: 'deny' as const,
        description: 'Deny send_email',
        target: 'send_email',
        reason: 'Blocked',
      },
      {
        id: 'intent-b',
        ruleId: 'OBO-001',
        level: 4 as const,
        kind: 'elicit' as const,
        description: 'Elicit send_email',
        target: 'send_email',
        prompt: 'Confirm?',
      },
    ];

    const ir = makeIRWithIntents(intents);
    const result = mergeRedundantChecks(ir);

    // Different kinds = different groups = no merge
    expect(result.mergeCount).toBe(0);
    expect(result.ir.intents).toHaveLength(2);
  });

  it('merges compatible elicit intents for the same tool', () => {
    const intents: ElicitIntent[] = [
      {
        id: 'intent-a',
        ruleId: 'OBO-001',
        level: 4,
        kind: 'elicit',
        description: 'OBO check for send_email',
        target: 'send_email',
        prompt: 'Authorize email?',
      },
      {
        id: 'intent-b',
        ruleId: 'OBO-002',
        level: 4,
        kind: 'elicit',
        description: 'PII check for send_email',
        target: 'send_email',
        prompt: 'Confirm no PII?',
      },
    ];

    const ir = makeIRWithIntents(intents);
    const result = mergeRedundantChecks(ir);

    expect(result.mergeCount).toBe(1);
    expect(result.ir.intents).toHaveLength(1);

    const merged = result.ir.intents[0]! as ElicitIntent;
    expect(merged.ruleId).toBe('OBO-001+OBO-002');
    expect(merged.prompt).toBe('Authorize email? AND Confirm no PII?');
  });

  it('passes non-tool intents through unchanged', () => {
    const ir = minimalGovernanceIR();
    // The minimal IR has a label intent (AUD-001) — it should pass through
    const result = mergeRedundantChecks(ir);

    const labelIntent = result.ir.intents.find((i) => i.ruleId === 'AUD-001');
    expect(labelIntent).toBeDefined();
    expect(labelIntent!.kind).toBe('label');
  });

  it('returns zero merges when no redundant checks exist', () => {
    const ir = minimalGovernanceIR();
    const result = mergeRedundantChecks(ir);

    // The minimal IR has no same-tool same-kind same-level pairs
    expect(result.mergeCount).toBe(0);
  });
});
