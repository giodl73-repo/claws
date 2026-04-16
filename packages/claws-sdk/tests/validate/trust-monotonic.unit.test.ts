/**
 * L0: Monotonic trust tier enforcement — amendment validation rejects
 * trust tier downgrades (AMEND-V006).
 *
 * D-01: Trust tier can only increase via amendments. Lowering throws
 * with a descriptive error.
 */

import { describe, it, expect } from 'vitest';

import { validateAmendment } from '#src/amend/validate.js';
import type { Amendment } from '#src/amend/validate.js';
import type { GovernanceIR } from '#src/ir/governance-ir.js';

/**
 * Build a minimal GovernanceIR for testing.
 */
function buildTestIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      totalCount: 0,
      maxSeverity: 'low',
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-14T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

describe('trust-monotonic: amendment tier enforcement (D-01)', () => {
  it('rejects amendment that lowers trust tier from T4 to T2 (AMEND-V006)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 2 },
    };

    // Current trust tier is T4
    const result = validateAmendment(amendment, ir, 4);

    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V006');
    expect(result.violations[0]!.message).toContain('Trust tier can only increase');
    expect(result.violations[0]!.message).toContain('current: T4');
    expect(result.violations[0]!.message).toContain('proposed: T2');
    expect(result.violations[0]!.field).toBe('value.trustTier');
  });

  it('accepts amendment that raises trust tier from T2 to T4', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 4 },
    };

    // Current trust tier is T2
    const result = validateAmendment(amendment, ir, 2);

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('accepts amendment with same trust tier (T3 -> T3, no false positive)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 3 },
    };

    // Current trust tier is T3
    const result = validateAmendment(amendment, ir, 3);

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
