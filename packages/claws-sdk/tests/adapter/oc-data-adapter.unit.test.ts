/**
 * L0: OC data adapter — risk map, tool policies, delegation map.
 */

import { describe, it, expect } from 'vitest';
import {
  buildRiskMap,
  toOCToolPolicies,
  toOCDelegationMap,
  type RiskMapEntry,
} from '../../src/adapter/oc-data-adapter.js';
import type { GovernanceIR, DelegationEntry } from '../../src/ir/governance-ir.js';
import type { DenyIntent, LabelIntent, RequireIntent } from '../../src/ir/mechanical-intent.js';

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

describe('buildRiskMap', () => {
  it('returns empty array for IR with no intents and no tools', () => {
    const ir = minimalIR();
    const result = buildRiskMap(ir);
    expect(result).toEqual([]);
  });

  it('maps deny intents to their targets with correct risk levels', () => {
    const deny: DenyIntent = {
      id: 'i-1',
      kind: 'deny',
      ruleId: 'SEC-001',
      level: 4,
      description: 'Block shell',
      target: 'Bash',
      reason: 'No shell access',
    };
    const ir = minimalIR({ intents: [deny] });
    const result = buildRiskMap(ir);
    expect(result).toHaveLength(1);
    expect(result[0]!.toolName).toBe('Bash');
    expect(result[0]!.riskLevel).toBe(4);
    expect(result[0]!.failMode).toBe('closed');
  });

  it('maps require intents using intent ID as key', () => {
    const req: RequireIntent = {
      id: 'req-1',
      kind: 'require',
      ruleId: 'SEC-002',
      level: 3,
      description: 'Require approval',
      condition: 'approved',
      failMessage: 'Not approved',
    };
    const ir = minimalIR({ intents: [req] });
    const result = buildRiskMap(ir);
    expect(result).toHaveLength(1);
    expect(result[0]!.toolName).toBe('req-1');
    expect(result[0]!.riskLevel).toBe(3);
  });

  it('keeps highest risk level when multiple intents target the same tool', () => {
    const deny1: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'R1', level: 2,
      description: 'd1', target: 'Write', reason: 'low',
    };
    const deny2: DenyIntent = {
      id: 'i-2', kind: 'deny', ruleId: 'R2', level: 5,
      description: 'd2', target: 'Write', reason: 'critical',
    };
    const ir = minimalIR({ intents: [deny1, deny2] });
    const result = buildRiskMap(ir);
    const writeEntry = result.find((e) => e.toolName === 'Write');
    expect(writeEntry).toBeDefined();
    expect(writeEntry!.riskLevel).toBe(5);
    expect(writeEntry!.failMode).toBe('closed');
  });

  it('includes tools from capability manifest', () => {
    const ir = minimalIR({
      capabilities: {
        tools: [
          { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
    });
    const result = buildRiskMap(ir);
    expect(result).toHaveLength(1);
    expect(result[0]!.toolName).toBe('Read');
    expect(result[0]!.riskLevel).toBe(2); // 'low' -> riskLevelFromClassification -> 2
  });

  it('resolves fail mode: R1-R2 open, R3+ closed', () => {
    const intents: DenyIntent[] = [
      { id: 'i-1', kind: 'deny', ruleId: 'R1', level: 1, description: '', target: 'a', reason: '' },
      { id: 'i-2', kind: 'deny', ruleId: 'R2', level: 2, description: '', target: 'b', reason: '' },
      { id: 'i-3', kind: 'deny', ruleId: 'R3', level: 3, description: '', target: 'c', reason: '' },
      { id: 'i-4', kind: 'deny', ruleId: 'R4', level: 5, description: '', target: 'd', reason: '' },
    ];
    const ir = minimalIR({ intents });
    const result = buildRiskMap(ir);
    const byTool = new Map(result.map((e) => [e.toolName, e]));
    expect(byTool.get('a')!.failMode).toBe('open');
    expect(byTool.get('b')!.failMode).toBe('open');
    expect(byTool.get('c')!.failMode).toBe('closed');
    expect(byTool.get('d')!.failMode).toBe('closed');
  });

  it('ignores label and elicit intents (non-risk-bearing)', () => {
    const label: LabelIntent = {
      id: 'i-label', kind: 'label', ruleId: 'AUD-01', level: 1,
      description: 'tag', key: 'env', value: 'prod',
    };
    const ir = minimalIR({ intents: [label] });
    const result = buildRiskMap(ir);
    expect(result).toHaveLength(0);
  });
});

describe('toOCToolPolicies', () => {
  it('converts deny intents to block policies', () => {
    const deny: DenyIntent = {
      id: 'i-1', kind: 'deny', ruleId: 'SEC-001', level: 4,
      description: 'Block shell', target: 'Bash', reason: 'No shell',
    };
    const ir = minimalIR({ intents: [deny] });
    const policies = toOCToolPolicies(ir);
    expect(policies).toHaveLength(1);
    expect(policies[0]).toEqual({
      name: 'Bash',
      action: 'block',
      reason: 'No shell',
      ruleId: 'SEC-001',
    });
  });

  it('converts label intents to audit policies', () => {
    const label: LabelIntent = {
      id: 'i-2', kind: 'label', ruleId: 'AUD-01', level: 1,
      description: 'Tag environment', key: 'env', value: 'prod',
    };
    const ir = minimalIR({ intents: [label] });
    const policies = toOCToolPolicies(ir);
    expect(policies).toHaveLength(1);
    expect(policies[0]).toEqual({
      name: 'env',
      action: 'audit',
      reason: 'Tag environment',
      ruleId: 'AUD-01',
    });
  });

  it('returns empty array for IR with no deny or label intents', () => {
    const req: RequireIntent = {
      id: 'i-3', kind: 'require', ruleId: 'R1', level: 2,
      description: 'req', condition: 'cond', failMessage: 'fail',
    };
    const ir = minimalIR({ intents: [req] });
    expect(toOCToolPolicies(ir)).toEqual([]);
  });
});

describe('toOCDelegationMap', () => {
  it('converts delegation entries to a keyed object', () => {
    const entries: DelegationEntry[] = [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'pre-check' },
      { ruleId: 'SEC-002', mechanism: 'approval', target: 'admin' },
    ];
    const result = toOCDelegationMap(entries);
    expect(result).toEqual({
      'SEC-001': 'hook',
      'SEC-002': 'approval',
    });
  });

  it('returns empty object for empty delegation map', () => {
    expect(toOCDelegationMap([])).toEqual({});
  });
});
