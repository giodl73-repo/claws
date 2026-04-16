/**
 * L3: SDK acceptance — consumer invokes PRESS pipeline at G2,
 * verifies output <= 1,100 tokens with >= 0.92 fidelity and
 * no governance semantics lost.
 */

import { describe, it, expect } from 'vitest';
import { press } from '../../src/context/context-press.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../../src/ir/mechanical-intent.js';

// ── Consumer-facing fixture ──────────────────────────────────────────

function consumerGovernanceIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        { name: 'read_file', description: 'Read a file from the filesystem', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'write_file', description: 'Write a file to the filesystem', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
        { name: 'execute_command', description: 'Execute a shell command in the terminal', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
        { name: 'send_email', description: 'Send an email on behalf of the user', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
        { name: 'delete_database', description: 'Drop a database table permanently', riskLevel: 'critical', oboFlag: false, classification: 'data' },
        { name: 'deploy_service', description: 'Deploy a service to production', riskLevel: 'critical', oboFlag: true, classification: 'execution' },
        { name: 'search_content', description: 'Search indexed content', riskLevel: 'low', oboFlag: false, classification: 'data' },
        { name: 'modify_permissions', description: 'Change access permissions', riskLevel: 'high', oboFlag: true, classification: 'data' },
        { name: 'network_request', description: 'Make HTTP requests', riskLevel: 'medium', oboFlag: false, classification: 'network' },
        { name: 'create_branch', description: 'Create a git branch', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
      ],
      skills: [
        { name: 'code-review', description: 'Review code', requiredTools: ['read_file'], governanceLevel: 1 },
      ],
      agents: [
        { name: 'primary', description: 'Primary agent', delegations: [{ from: 'primary', to: 'reviewer', permissions: ['read_file'] }], maxAutonomousLevel: 3 },
      ],
      workflows: [
        { name: 'deploy-flow', description: 'Deployment workflow', steps: ['build', 'test', 'deploy'], requiresApproval: true },
      ],
    },
    analysis: {
      violations: [
        {
          ruleId: 'SEC-001', level: 5, message: 'Critical tool without approval gate',
          target: 'execute_command', diagnosticCode: 'CLAWS-V001',
          fixSuggestions: [{ direction: 'tighten', description: 'Add gate', target: 'enforcementPlan' }],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        { ruleId: 'AUD-001', level: 2, message: 'Missing audit config', subRuleDiagnosticCode: 'G-AUDIT-01', category: 'G-AUDIT', subRuleIndex: 1 },
      ],
      enforcementPlan: {
        blockedTools: ['execute_command', 'delete_database'],
        requiredApprovals: ['send_email', 'deploy_service', 'modify_permissions'],
        auditOnlyRules: ['AUD-001'],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 2, overridden: 0, total: 2 },
    },
    intents: [
      {
        id: 'intent-001', ruleId: 'SEC-001', level: 5, kind: 'deny',
        description: 'Block execute_command at R5',
        target: 'execute_command', reason: 'Shell execution blocked by R5 governance',
      } satisfies DenyIntent,
      {
        id: 'intent-002', ruleId: 'SEC-002', level: 5, kind: 'deny',
        description: 'Block delete_database at R5',
        target: 'delete_database', reason: 'Database destruction blocked by R5 governance',
      } satisfies DenyIntent,
      {
        id: 'intent-003', ruleId: 'OBO-001', level: 4, kind: 'elicit',
        description: 'OBO approval for send_email',
        target: 'send_email', prompt: 'Authorize email sending?',
      } satisfies ElicitIntent,
      {
        id: 'intent-004', ruleId: 'OBO-002', level: 4, kind: 'elicit',
        description: 'OBO approval for deploy_service',
        target: 'deploy_service', prompt: 'Authorize production deploy?',
      } satisfies ElicitIntent,
      {
        id: 'intent-005', ruleId: 'OBO-003', level: 4, kind: 'elicit',
        description: 'OBO approval for modify_permissions',
        target: 'modify_permissions', prompt: 'Authorize permission change?',
      } satisfies ElicitIntent,
      {
        id: 'intent-006', ruleId: 'AUD-001', level: 2, kind: 'label',
        description: 'Audit label', key: 'read_file', value: 'audit-enabled',
      },
      {
        id: 'intent-007', ruleId: 'LIM-001', level: 3, kind: 'limit',
        description: 'Rate limit network requests',
        property: 'network_request.calls', max: 100, unit: 'calls/hour',
      },
    ],
    delegationMap: [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'SEC-002', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'OBO-001', mechanism: 'approval', target: 'send_email' },
      { ruleId: 'OBO-002', mechanism: 'approval', target: 'deploy_service' },
      { ruleId: 'OBO-003', mechanism: 'approval', target: 'modify_permissions' },
      { ruleId: 'AUD-001', mechanism: 'audit-only', target: 'on_audit' },
      { ruleId: 'LIM-001', mechanism: 'hook', target: 'before_tool_call' },
    ],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '1.0.0',
      compiledAt: '2026-04-15T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

// ── Acceptance test ──────────────────────────────────────────────────

describe('accept: PRESS SDK consumer contract', () => {
  it('PRESS at G2: output <= 1,100 tokens, >= 0.92 fidelity, no semantics lost', () => {
    const ir = consumerGovernanceIR();

    // Consumer invokes the PRESS pipeline at G2
    const result = press(ir, { level: 2 });

    // Contract 1: Output within budget
    expect(result.outputTokens).toBeLessThanOrEqual(1100);
    expect(result.withinBudget).toBe(true);

    // Contract 2: Fidelity >= 0.92 on all 5 dimensions
    expect(result.qualityPassed).toBe(true);
    const scores = result.stages.quality.scores;
    expect(scores.ruleCoverage).toBeGreaterThanOrEqual(0.92);
    expect(scores.riskAccuracy).toBeGreaterThanOrEqual(0.92);
    expect(scores.oboPreservation).toBeGreaterThanOrEqual(0.92);
    expect(scores.tensionVisibility).toBeGreaterThanOrEqual(0.92);
    expect(scores.remediationActionability).toBeGreaterThanOrEqual(0.92);

    // Contract 3: No governance semantics lost
    // a) All rules preserved
    const originalRuleIds = new Set(result.original.rules.map((r) => r.id));
    const compressedRuleIds = new Set(result.compressed.rules.map((r) => r.id));
    for (const id of originalRuleIds) {
      expect(compressedRuleIds.has(id), `rule ${id} preserved`).toBe(true);
    }

    // b) Risk level preserved
    expect(result.compressed.riskLevel).toBe(result.original.riskLevel);

    // c) OBO chain preserved (G2 includes OBO)
    for (const oboEntry of result.original.oboChain) {
      const match = result.compressed.oboChain.find(
        (e) => e.actor === oboEntry.actor && e.action === oboEntry.action,
      );
      expect(match, `OBO entry ${oboEntry.actor}:${oboEntry.action} preserved`).toBeDefined();
    }

    // d) Remediations preserved (G2 includes remediation)
    for (const remediation of result.original.remediations) {
      expect(result.compressed.remediations).toContain(remediation);
    }

    // Contract 4: Profile was correctly resolved
    expect(result.profile.name).toBe('strict');
    expect(result.profile.level).toBe(2);

    // Contract 5: Aggregate fidelity metric available
    expect(result.stages.quality.aggregate).toBeGreaterThanOrEqual(0.92);
    expect(result.stages.quality.violations).toHaveLength(0);
  });
});
