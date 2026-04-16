/**
 * L3 CLI acceptance: `claws press` on 2400-token SKILL.md at G2
 * produces budget-compliant output with fidelity report.
 *
 * Tests the SDK directly (validates that SDK output is correct for
 * CLI rendering of the press command).
 */

import { describe, it, expect } from 'vitest';
import { press } from '@bic/claws-sdk/context/context-press';
import { emitSkill } from '@bic/claws-sdk/emit/emit-skill';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir';
import type { DenyIntent, ElicitIntent } from '@bic/claws-sdk/ir/mechanical-intent';

// ── CLI-facing fixture ───────────────────────────────────────────────

function buildCLIFixtureIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        { name: 'read_file', description: 'Read contents from the filesystem', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'write_file', description: 'Write contents to the filesystem', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
        { name: 'execute_command', description: 'Execute a shell command', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
        { name: 'send_email', description: 'Send email on behalf of user', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
        { name: 'delete_database', description: 'Drop a database table', riskLevel: 'critical', oboFlag: false, classification: 'data' },
        { name: 'deploy_service', description: 'Deploy to production', riskLevel: 'critical', oboFlag: true, classification: 'execution' },
        { name: 'search_content', description: 'Search content', riskLevel: 'low', oboFlag: false, classification: 'data' },
        { name: 'modify_permissions', description: 'Change permissions', riskLevel: 'high', oboFlag: true, classification: 'data' },
        { name: 'network_request', description: 'Make HTTP requests', riskLevel: 'medium', oboFlag: false, classification: 'network' },
        { name: 'create_branch', description: 'Create a git branch', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
      ],
      skills: [{ name: 'review', description: 'Code review', requiredTools: ['read_file'], governanceLevel: 1 }],
      agents: [
        { name: 'primary', description: 'Primary agent', delegations: [{ from: 'primary', to: 'reviewer', permissions: ['read_file'] }], maxAutonomousLevel: 3 },
      ],
      workflows: [
        { name: 'deploy', description: 'Deploy workflow', steps: ['build', 'test', 'deploy'], requiresApproval: true },
      ],
    },
    analysis: {
      violations: [
        {
          ruleId: 'SEC-001', level: 5, message: 'Critical tool needs gate',
          target: 'execute_command', diagnosticCode: 'CLAWS-V001',
          fixSuggestions: [{ direction: 'tighten', description: 'Add gate', target: 'enforcementPlan' }],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        { ruleId: 'AUD-001', level: 2, message: 'Missing audit', subRuleDiagnosticCode: 'G-AUDIT-01', category: 'G-AUDIT', subRuleIndex: 1 },
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
        id: 'i-001', ruleId: 'SEC-001', level: 5, kind: 'deny',
        description: 'Block execute_command',
        target: 'execute_command', reason: 'Shell blocked by R5 governance',
      } satisfies DenyIntent,
      {
        id: 'i-002', ruleId: 'SEC-002', level: 5, kind: 'deny',
        description: 'Block delete_database',
        target: 'delete_database', reason: 'DB destruction blocked by R5',
      } satisfies DenyIntent,
      {
        id: 'i-003', ruleId: 'OBO-001', level: 4, kind: 'elicit',
        description: 'OBO for send_email',
        target: 'send_email', prompt: 'Authorize email?',
      } satisfies ElicitIntent,
      {
        id: 'i-004', ruleId: 'OBO-002', level: 4, kind: 'elicit',
        description: 'OBO for deploy_service',
        target: 'deploy_service', prompt: 'Authorize deploy?',
      } satisfies ElicitIntent,
      {
        id: 'i-005', ruleId: 'OBO-003', level: 4, kind: 'elicit',
        description: 'OBO for modify_permissions',
        target: 'modify_permissions', prompt: 'Authorize permission change?',
      } satisfies ElicitIntent,
      {
        id: 'i-006', ruleId: 'AUD-001', level: 2, kind: 'label',
        description: 'Audit label', key: 'read_file', value: 'audit-enabled',
      },
      {
        id: 'i-007', ruleId: 'LIM-001', level: 3, kind: 'limit',
        description: 'Rate limit network',
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

// ── CLI acceptance test ──────────────────────────────────────────────

describe('CLI acceptance: claws press', () => {
  it('2400-token SKILL.md at G2 produces budget-compliant output with fidelity report', () => {
    const ir = buildCLIFixtureIR();

    // CLI would verify input produces substantial SKILL.md
    const skillBefore = emitSkill(ir, { compress: false });
    expect(skillBefore.content.length).toBeGreaterThan(500);

    // CLI would call: press(ir, { level: 2 })
    const result = press(ir, { level: 2 });

    // CLI would render: profile info
    expect(result.profile.name).toBe('strict');
    expect(result.profile.level).toBe(2);
    expect(result.profile.tokenBudget).toBe(1100);

    // CLI would render: budget compliance
    expect(result.withinBudget).toBe(true);
    expect(result.outputTokens).toBeLessThanOrEqual(1100);

    // CLI would render: fidelity report
    expect(result.qualityPassed).toBe(true);
    const scores = result.stages.quality.scores;
    expect(scores.ruleCoverage).toBeGreaterThanOrEqual(0.92);
    expect(scores.riskAccuracy).toBeGreaterThanOrEqual(0.92);
    expect(scores.oboPreservation).toBeGreaterThanOrEqual(0.92);
    expect(scores.tensionVisibility).toBeGreaterThanOrEqual(0.92);
    expect(scores.remediationActionability).toBeGreaterThanOrEqual(0.92);

    // CLI would render: aggregate fidelity score
    const aggregate = result.stages.quality.aggregate;
    expect(aggregate).toBeGreaterThanOrEqual(0.92);

    // CLI would render: violation count (should be zero)
    expect(result.stages.quality.violations).toHaveLength(0);

    // CLI would render: pipeline stage summary
    expect(result.stages.costEstimate.ruleCount).toBe(7);
    expect(result.stages.deadCode.totalRemoved).toBe(0);
    expect(result.stages.mergeChecks.mergeCount).toBe(0);
    expect(result.stages.ordering.orderedRules.length).toBe(7);
    expect(result.stages.ordering.withinBudget).toBe(true);

    // CLI would render: compressed output preserves semantics
    expect(result.compressed.riskLevel).toBe('R5');
    expect(result.compressed.rules.length).toBe(result.original.rules.length);

    // CLI would render: SKILL.md from optimized IR
    const skillAfter = emitSkill(result.optimizedIR);
    expect(skillAfter.content.length).toBeGreaterThan(0);
    expect(skillAfter.content).toContain('DENY');
    expect(skillAfter.content).toContain('REQUIRE APPROVAL');
  });
});
