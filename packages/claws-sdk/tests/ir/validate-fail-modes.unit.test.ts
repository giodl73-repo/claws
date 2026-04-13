/**
 * L0: validateFailModes — R5 fail-closed invariant enforcement.
 */

import { describe, it, expect } from 'vitest';
import { validateFailModes } from '../../src/ir/validate-fail-modes.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent, RequireIntent, LabelIntent } from '../../src/ir/mechanical-intent.js';

function minimalIR(overrides: Partial<GovernanceIR> = {}): GovernanceIR {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: { compilerVersion: '0.1.0', compiledAt: '2026-01-01T00:00:00Z', schemaVersion: 1 },
    ...overrides,
  };
}

describe('validateFailModes', () => {
  it('passes for IR with no R5 intents', () => {
    const ir = minimalIR();
    expect(() => validateFailModes(ir)).not.toThrow();
  });

  it('passes for R5 intent without fail-open tampering', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'SEC-001', level: 5,
      description: 'Block OBO', target: 'proxy', reason: 'R5',
    };
    const ir = minimalIR({ intents: [deny] });
    expect(() => validateFailModes(ir)).not.toThrow();
  });

  it('throws CLAWS-E001 when R5 intent has failMode:open in raw JSON', () => {
    const tampered = {
      id: 'i-1', kind: 'deny' as const, ruleId: 'SEC-001', level: 5 as const,
      description: 'Block OBO', target: 'proxy', reason: 'R5',
      failMode: 'open',
    };
    const ir = minimalIR({ intents: [tampered as unknown as DenyIntent] });
    expect(() => validateFailModes(ir)).toThrow('CLAWS-E001');
    expect(() => validateFailModes(ir)).toThrow('SEC-001');
  });

  it('throws when R5 rule has audit-only delegation', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'SEC-002', level: 5,
      description: 'Block', target: 'tool', reason: 'R5',
    };
    const ir = minimalIR({
      intents: [deny],
      delegationMap: [{ ruleId: 'SEC-002', mechanism: 'audit-only', target: 'log' }],
    });
    expect(() => validateFailModes(ir)).toThrow('CLAWS-E001');
    expect(() => validateFailModes(ir)).toThrow('audit-only');
  });

  it('does not throw for non-R5 rule with audit-only delegation', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'LOW-001', level: 2,
      description: 'Warning', target: 'tool', reason: 'low',
    };
    const ir = minimalIR({
      intents: [deny],
      delegationMap: [{ ruleId: 'LOW-001', mechanism: 'audit-only', target: 'log' }],
    });
    expect(() => validateFailModes(ir)).not.toThrow();
  });

  it('throws when R5 rule is in enforcementPlan.auditOnlyRules', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'SEC-003', level: 5,
      description: 'Block', target: 'tool', reason: 'R5',
    };
    const ir = minimalIR({
      intents: [deny],
      analysis: {
        violations: [],
        warnings: [],
        enforcementPlan: {
          blockedTools: [],
          requiredApprovals: [],
          auditOnlyRules: ['SEC-003'],
          channelRedactions: [],
          ruleSuppressions: [],
        },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
    });
    expect(() => validateFailModes(ir)).toThrow('CLAWS-E001');
    expect(() => validateFailModes(ir)).toThrow('auditOnlyRules');
  });

  it('throws when R5 rule is in enforcementPlan.ruleSuppressions', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'SEC-004', level: 5,
      description: 'Block', target: 'tool', reason: 'R5',
    };
    const ir = minimalIR({
      intents: [deny],
      analysis: {
        violations: [],
        warnings: [],
        enforcementPlan: {
          blockedTools: [],
          requiredApprovals: [],
          auditOnlyRules: [],
          channelRedactions: [],
          ruleSuppressions: [
            { ruleId: 'SEC-004', reason: 'testing', expiresAt: '', authorizedBy: 'admin' },
          ],
        },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
    });
    expect(() => validateFailModes(ir)).toThrow('CLAWS-E001');
    expect(() => validateFailModes(ir)).toThrow('ruleSuppression');
  });

  it('throws when R5 violation lacks a blocking deny intent', () => {
    const req: RequireIntent = {
      id: 'i-1', kind: 'require', ruleId: 'SEC-005', level: 5,
      description: 'Require', condition: 'approved', failMessage: 'fail',
    };
    const ir = minimalIR({
      intents: [req],
      analysis: {
        violations: [
          {
            ruleId: 'SEC-005', level: 5, message: 'Violation',
            target: 'tool', diagnosticCode: 'D001',
            fixSuggestions: [], toolFuzzyMatches: [],
          },
        ],
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
    });
    expect(() => validateFailModes(ir)).toThrow('CLAWS-E001');
    expect(() => validateFailModes(ir)).toThrow('missing blocking deny intent');
  });

  it('passes when R5 violation has corresponding deny intent', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'SEC-006', level: 5,
      description: 'Block', target: 'tool', reason: 'R5',
    };
    const ir = minimalIR({
      intents: [deny],
      analysis: {
        violations: [
          {
            ruleId: 'SEC-006', level: 5, message: 'Violation',
            target: 'tool', diagnosticCode: 'D001',
            fixSuggestions: [], toolFuzzyMatches: [],
          },
        ],
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
    });
    expect(() => validateFailModes(ir)).not.toThrow();
  });

  it('ignores non-R5 violations without deny intents', () => {
    const label: LabelIntent = {
      id: 'i-1', kind: 'label', ruleId: 'AUD-01', level: 2,
      description: 'Label', key: 'env', value: 'prod',
    };
    const ir = minimalIR({
      intents: [label],
      analysis: {
        violations: [
          {
            ruleId: 'AUD-01', level: 2, message: 'Info',
            target: 'tool', diagnosticCode: 'D002',
            fixSuggestions: [], toolFuzzyMatches: [],
          },
        ],
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
    });
    expect(() => validateFailModes(ir)).not.toThrow();
  });
});
