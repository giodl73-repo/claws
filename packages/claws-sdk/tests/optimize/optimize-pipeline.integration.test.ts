/**
 * Optimize pipeline integration test.
 *
 * L1: dead-code + merge on fixture GovernanceIR (1)
 */

import { describe, it, expect } from 'vitest';
import { eliminateDeadCode } from '../../src/optimize/dead-code.js';
import { mergeRedundantChecks } from '../../src/optimize/merge-checks.js';
import { materializeDataFrames } from '../../src/optimize/materialize.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent } from '../../src/ir/mechanical-intent.js';

/**
 * Build a fixture GovernanceIR that exercises all three optimization passes:
 * - A ghost tool intent (absent from manifest) → dead-code elimination
 * - A disabled rule via suppression → dead-code elimination
 * - Two redundant deny intents on the same tool → merge
 * - DataFrames from tool classifications + delegations → materialization
 */
function fixtureIR(): GovernanceIR {
  const base = minimalGovernanceIR();

  return {
    ...base,
    intents: [
      // Two deny intents on the same tool at the same level → merge
      {
        id: 'intent-001',
        ruleId: 'SEC-001',
        level: 5 as const,
        kind: 'deny' as const,
        description: 'Block delete_database for data safety',
        target: 'delete_database',
        reason: 'Critical data destruction — denied by governance',
      },
      {
        id: 'intent-001b',
        ruleId: 'SEC-003',
        level: 5 as const,
        kind: 'deny' as const,
        description: 'Block delete_database for compliance',
        target: 'delete_database',
        reason: 'SOC2 compliance block',
      },
      // Elicit intent — preserved (no merge partner)
      {
        id: 'intent-002',
        ruleId: 'OBO-001',
        level: 4 as const,
        kind: 'elicit' as const,
        description: 'Require OBO elicitation for send_email',
        target: 'send_email',
        prompt: 'Do you authorize sending email on your behalf?',
      },
      // Label intent — preserved
      {
        id: 'intent-003',
        ruleId: 'AUD-001',
        level: 2 as const,
        kind: 'label' as const,
        description: 'Audit label for read_file',
        key: 'read_file',
        value: 'audit-enabled',
      },
      // Ghost tool intent — will be eliminated
      {
        id: 'intent-ghost',
        ruleId: 'GHOST-001',
        level: 3 as const,
        kind: 'deny' as const,
        description: 'Block deploy_production',
        target: 'deploy_production',
        reason: 'Production deployment not allowed',
      },
      // Disabled rule intent — will be eliminated
      {
        id: 'intent-disabled',
        ruleId: 'DISABLED-001',
        level: 2 as const,
        kind: 'deny' as const,
        description: 'Block debug_tool',
        target: 'execute_command',
        reason: 'Debug tool not allowed',
      },
    ],
    delegationMap: [
      ...base.delegationMap,
      { ruleId: 'GHOST-001', mechanism: 'hook' as const, target: 'before_tool_call' },
      { ruleId: 'SEC-003', mechanism: 'hook' as const, target: 'before_tool_call' },
      { ruleId: 'DISABLED-001', mechanism: 'audit-only' as const, target: 'on_audit' },
    ],
    analysis: {
      ...base.analysis,
      enforcementPlan: {
        ...base.analysis.enforcementPlan,
        ruleSuppressions: [
          {
            ruleId: 'DISABLED-001',
            reason: 'Debug tool suppressed for migration',
            expiresAt: '',
            authorizedBy: 'admin@example.com',
          },
        ],
      },
    },
  };
}

describe('optimize pipeline', () => {
  it('dead-code + merge + materialize on fixture GovernanceIR', () => {
    const ir = fixtureIR();

    // Step 1: Dead-code elimination
    const deadCodeResult = eliminateDeadCode(ir);

    // Ghost intent removed (absent tool)
    expect(deadCodeResult.removedAbsentToolIntents).toBe(1);
    // Disabled intent removed (suppression marker)
    expect(deadCodeResult.removedDisabledIntents).toBe(1);
    expect(deadCodeResult.totalRemoved).toBe(2);

    // Verify the ghost and disabled intents are gone
    expect(deadCodeResult.ir.intents.find((i) => i.ruleId === 'GHOST-001')).toBeUndefined();
    expect(deadCodeResult.ir.intents.find((i) => i.ruleId === 'DISABLED-001')).toBeUndefined();

    // 6 original - 2 removed = 4 remaining
    expect(deadCodeResult.ir.intents).toHaveLength(4);

    // Step 2: Merge redundant checks
    const mergeResult = mergeRedundantChecks(deadCodeResult.ir);

    // SEC-001 + SEC-003 should merge (same tool, same level, same kind)
    expect(mergeResult.mergeCount).toBe(1);

    // 4 intents → 1 label (passthrough) + 1 elicit (singleton) + 1 merged deny = 3
    expect(mergeResult.ir.intents).toHaveLength(3);

    // Verify the merged intent
    const mergedDeny = mergeResult.ir.intents.find(
      (i) => i.kind === 'deny' && (i as DenyIntent).target === 'delete_database',
    ) as DenyIntent | undefined;
    expect(mergedDeny).toBeDefined();
    expect(mergedDeny!.ruleId).toBe('SEC-001+SEC-003');

    // Step 3: Materialize DataFrames
    const matResult = materializeDataFrames(mergeResult.ir);

    // Tool classifications from the 5-tool manifest
    expect(matResult.toolClassifications.entries).toHaveLength(5);
    expect(matResult.totalEntries).toBeGreaterThan(0);

    // Delegation map — verify ghost and disabled entries were pruned by dead-code pass
    // The dead-code pass removes delegation entries for removed rules
    const ghostDelegation = mergeResult.ir.delegationMap.find(
      (d) => d.ruleId === 'GHOST-001',
    );
    expect(ghostDelegation).toBeUndefined();

    const disabledDelegation = mergeResult.ir.delegationMap.find(
      (d) => d.ruleId === 'DISABLED-001',
    );
    expect(disabledDelegation).toBeUndefined();

    // Overall: the pipeline produces a valid, smaller GovernanceIR
    expect(mergeResult.ir.capabilities).toBeDefined();
    expect(mergeResult.ir.analysis).toBeDefined();
    expect(mergeResult.ir.compiler).toBeDefined();
    expect(mergeResult.ir.conflicts).toBeDefined();
  });
});
