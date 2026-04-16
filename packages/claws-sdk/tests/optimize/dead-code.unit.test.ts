/**
 * Dead-code elimination unit tests.
 *
 * L0: absent tool rule removed (1), disabled rule removed (1)
 */

import { describe, it, expect } from 'vitest';
import { eliminateDeadCode } from '../../src/optimize/dead-code.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

describe('eliminateDeadCode', () => {
  it('removes intents targeting tools absent from the manifest', () => {
    const ir = minimalGovernanceIR();

    // Add an intent targeting a tool NOT in the manifest
    const irWithAbsentTool = {
      ...ir,
      intents: [
        ...ir.intents,
        {
          id: 'intent-ghost',
          ruleId: 'GHOST-001',
          level: 3 as const,
          kind: 'deny' as const,
          description: 'Block deploy_production',
          target: 'deploy_production', // NOT in capabilities.tools
          reason: 'Production deployment not allowed',
        },
      ],
      delegationMap: [
        ...ir.delegationMap,
        { ruleId: 'GHOST-001', mechanism: 'hook' as const, target: 'before_tool_call' },
      ],
    };

    const result = eliminateDeadCode(irWithAbsentTool);

    // The ghost intent should be removed
    expect(result.removedAbsentToolIntents).toBe(1);
    expect(result.ir.intents).toHaveLength(ir.intents.length);
    expect(result.ir.intents.find((i) => i.ruleId === 'GHOST-001')).toBeUndefined();

    // Delegation entry for the removed rule should also be gone
    expect(result.ir.delegationMap.find((d) => d.ruleId === 'GHOST-001')).toBeUndefined();

    // Original intents targeting manifest tools are preserved
    expect(result.ir.intents.find((i) => i.ruleId === 'SEC-001')).toBeDefined();
    expect(result.ir.intents.find((i) => i.ruleId === 'OBO-001')).toBeDefined();
  });

  it('removes intents for explicitly disabled rules via suppression markers', () => {
    const ir = minimalGovernanceIR();

    // Add a suppression marker for AUD-001 (which has a label intent)
    const irWithSuppression = {
      ...ir,
      analysis: {
        ...ir.analysis,
        warnings: [
          ...ir.analysis.warnings,
        ],
        enforcementPlan: {
          ...ir.analysis.enforcementPlan,
          auditOnlyRules: [...ir.analysis.enforcementPlan.auditOnlyRules],
          ruleSuppressions: [
            {
              ruleId: 'AUD-001',
              reason: 'Temporarily disabled for migration',
              expiresAt: '', // No expiry = always active
              authorizedBy: 'admin@example.com',
            },
          ],
        },
      },
    };

    const result = eliminateDeadCode(irWithSuppression);

    // AUD-001 intent should be removed
    expect(result.removedDisabledIntents).toBe(1);
    expect(result.ir.intents.find((i) => i.ruleId === 'AUD-001')).toBeUndefined();

    // AUD-001 warning should also be removed
    expect(result.ir.analysis.warnings.find((w) => w.ruleId === 'AUD-001')).toBeUndefined();

    // AUD-001 in audit-only rules should be removed
    expect(result.ir.analysis.enforcementPlan.auditOnlyRules).not.toContain('AUD-001');

    // Other intents preserved
    expect(result.ir.intents.find((i) => i.ruleId === 'SEC-001')).toBeDefined();
  });

  it('removes intents for rules in the disabledRuleIds option', () => {
    const ir = minimalGovernanceIR();

    const result = eliminateDeadCode(ir, {
      disabledRuleIds: ['OBO-001'],
    });

    expect(result.removedDisabledIntents).toBe(1);
    expect(result.ir.intents.find((i) => i.ruleId === 'OBO-001')).toBeUndefined();
    expect(result.ir.intents.find((i) => i.ruleId === 'SEC-001')).toBeDefined();
  });

  it('respects removeAbsentToolRules: false', () => {
    const ir = minimalGovernanceIR();

    const irWithAbsentTool = {
      ...ir,
      intents: [
        ...ir.intents,
        {
          id: 'intent-ghost',
          ruleId: 'GHOST-001',
          level: 3 as const,
          kind: 'deny' as const,
          description: 'Block deploy_production',
          target: 'deploy_production',
          reason: 'Not allowed',
        },
      ],
    };

    const result = eliminateDeadCode(irWithAbsentTool, {
      removeAbsentToolRules: false,
    });

    // Ghost intent should NOT be removed
    expect(result.removedAbsentToolIntents).toBe(0);
    expect(result.ir.intents.find((i) => i.ruleId === 'GHOST-001')).toBeDefined();
  });

  it('does not remove non-tool intents (require, limit, label) for absent tool check', () => {
    const ir = minimalGovernanceIR();

    // The label intent for AUD-001 targets key 'read_file' but has kind 'label'
    // (no tool target extraction) — it should not be removed by absent-tool check
    const result = eliminateDeadCode(ir, {
      removeDisabledRules: false,
    });

    // Label intent preserved — it doesn't have a tool target
    expect(result.ir.intents.find((i) => i.ruleId === 'AUD-001')).toBeDefined();
    expect(result.removedAbsentToolIntents).toBe(0);
  });

  it('does not remove suppressed rules whose suppression has expired', () => {
    const ir = minimalGovernanceIR();

    const irWithExpiredSuppression = {
      ...ir,
      analysis: {
        ...ir.analysis,
        enforcementPlan: {
          ...ir.analysis.enforcementPlan,
          ruleSuppressions: [
            {
              ruleId: 'AUD-001',
              reason: 'Temporarily disabled',
              expiresAt: '2020-01-01T00:00:00.000Z', // Already expired
              authorizedBy: 'admin@example.com',
            },
          ],
        },
      },
    };

    const result = eliminateDeadCode(irWithExpiredSuppression);

    // Expired suppression → rule is NOT disabled → intent preserved
    expect(result.removedDisabledIntents).toBe(0);
    expect(result.ir.intents.find((i) => i.ruleId === 'AUD-001')).toBeDefined();
  });

  it('returns zero removals when no dead code exists', () => {
    const ir = minimalGovernanceIR();

    const result = eliminateDeadCode(ir);

    expect(result.totalRemoved).toBe(0);
    expect(result.removedAbsentToolIntents).toBe(0);
    expect(result.removedDisabledIntents).toBe(0);
    expect(result.r5GuardedCount).toBe(0);
    expect(result.r5Warnings).toHaveLength(0);
    expect(result.ir.intents).toHaveLength(ir.intents.length);
  });

  it('R5 intent passed via disabledRuleIds is NOT removed (CM-04)', () => {
    const ir = minimalGovernanceIR();

    // SEC-001 is level 5 in the fixture. Try to disable it via disabledRuleIds.
    const result = eliminateDeadCode(ir, {
      disabledRuleIds: ['SEC-001'],
    });

    // R5 guard should keep SEC-001
    expect(result.ir.intents.find((i) => i.ruleId === 'SEC-001')).toBeDefined();
    expect(result.removedDisabledIntents).toBe(0);
    expect(result.r5GuardedCount).toBe(1);
    expect(result.r5Warnings).toHaveLength(1);
    expect(result.r5Warnings[0]).toContain('R5 guard');
    expect(result.r5Warnings[0]).toContain('SEC-001');
    expect(result.r5Warnings[0]).toContain('fail-closed');

    // Non-R5 rules in disabledRuleIds still get removed
    const result2 = eliminateDeadCode(ir, {
      disabledRuleIds: ['SEC-001', 'OBO-001'],
    });
    expect(result2.ir.intents.find((i) => i.ruleId === 'SEC-001')).toBeDefined(); // R5 guarded
    expect(result2.ir.intents.find((i) => i.ruleId === 'OBO-001')).toBeUndefined(); // R4 removed
    expect(result2.r5GuardedCount).toBe(1);
    expect(result2.removedDisabledIntents).toBe(1);
  });

  it('R5 intent removed via absent-tool path still works but emits warning (CM-04)', () => {
    const ir = minimalGovernanceIR();

    // Add an R5 intent targeting a tool NOT in the manifest
    const irWithAbsentR5 = {
      ...ir,
      intents: [
        ...ir.intents,
        {
          id: 'intent-absent-r5',
          ruleId: 'CRIT-001',
          level: 5 as const,
          kind: 'deny' as const,
          description: 'Block nonexistent_tool at R5',
          target: 'nonexistent_tool',
          reason: 'Critical — must not be used',
        },
      ],
    };

    const result = eliminateDeadCode(irWithAbsentR5);

    // Absent-tool removal still works for R5 (tool genuinely doesn't exist)
    expect(result.ir.intents.find((i) => i.ruleId === 'CRIT-001')).toBeUndefined();
    expect(result.removedAbsentToolIntents).toBe(1);

    // But a warning is emitted
    expect(result.r5Warnings).toHaveLength(1);
    expect(result.r5Warnings[0]).toContain('R5 absent-tool removal');
    expect(result.r5Warnings[0]).toContain('CRIT-001');
    expect(result.r5Warnings[0]).toContain('nonexistent_tool');

    // R5 guard count is 0 (this is absent-tool, not disabledRuleIds)
    expect(result.r5GuardedCount).toBe(0);
  });
});
