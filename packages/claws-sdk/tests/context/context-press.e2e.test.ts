/**
 * L2: PRESS compression adapter end-to-end tests.
 *
 * 1. Fleet-scale PRESS + DAG pipeline with quality validation
 * 2. Full PRESS compress at G2 on 2400-token SKILL.md with quality verification
 */

import { describe, it, expect } from 'vitest';
import { press } from '../../src/context/context-press.js';
import { buildDag, resolveAll, computeStorageMetrics } from '../../src/context/context-dag.js';
import { emitSkill } from '../../src/emit/emit-skill.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../../src/ir/mechanical-intent.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';

// ── Fixture: rich GovernanceIR ────────────────────────────────────────

function buildRichIR(agentIdx: number, extraTools: ToolCapability[] = []): GovernanceIR {
  const baseTools: ToolCapability[] = [
    { name: 'read_file', description: 'Read a file from the filesystem', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
    { name: 'write_file', description: 'Write a file to the filesystem', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
    { name: 'execute_command', description: 'Execute a shell command', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
    { name: 'send_email', description: 'Send email on behalf of user', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
    { name: 'delete_database', description: 'Drop a database table', riskLevel: 'critical', oboFlag: false, classification: 'data' },
    { name: 'deploy_service', description: 'Deploy to production', riskLevel: 'critical', oboFlag: true, classification: 'execution' },
    { name: 'search_content', description: 'Search repository content', riskLevel: 'low', oboFlag: false, classification: 'data' },
    { name: 'modify_permissions', description: 'Change resource permissions', riskLevel: 'high', oboFlag: true, classification: 'data' },
  ];

  return {
    capabilities: {
      tools: [...baseTools, ...extraTools],
      skills: [{ name: 'review', description: 'Code review', requiredTools: ['read_file'], governanceLevel: 1 }],
      agents: [],
      workflows: [{ name: 'ci', description: 'CI pipeline', steps: ['build', 'test'], requiresApproval: true }],
    },
    analysis: {
      violations: [
        {
          ruleId: 'SEC-001', level: 5, message: 'Critical tool requires gate',
          target: 'execute_command', diagnosticCode: 'CLAWS-V001',
          fixSuggestions: [{ direction: 'tighten', description: 'Add gate', target: 'enforcementPlan' }],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [],
      enforcementPlan: {
        blockedTools: ['execute_command', 'delete_database'],
        requiredApprovals: ['send_email', 'deploy_service'],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 2, overridden: 0, total: 2 },
    },
    intents: [
      {
        id: 'intent-001', ruleId: 'SEC-001', level: 5, kind: 'deny',
        description: 'Block execute_command', target: 'execute_command',
        reason: 'Shell execution blocked by R5 governance policy for critical operations safety',
      } satisfies DenyIntent,
      {
        id: 'intent-002', ruleId: 'SEC-002', level: 5, kind: 'deny',
        description: 'Block delete_database', target: 'delete_database',
        reason: 'Database destruction blocked by R5 governance policy for data safety',
      } satisfies DenyIntent,
      {
        id: 'intent-003', ruleId: 'OBO-001', level: 4, kind: 'elicit',
        description: 'Require OBO for send_email', target: 'send_email',
        prompt: 'Authorize sending email on your behalf?',
      } satisfies ElicitIntent,
      {
        id: 'intent-004', ruleId: 'OBO-002', level: 4, kind: 'elicit',
        description: 'Require OBO for deploy_service', target: 'deploy_service',
        prompt: 'Authorize deployment to production?',
      } satisfies ElicitIntent,
      {
        id: 'intent-005', ruleId: 'AUD-001', level: 2, kind: 'label',
        description: 'Audit label', key: 'read_file', value: 'audit-enabled',
      },
    ],
    delegationMap: [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'SEC-002', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'OBO-001', mechanism: 'approval', target: 'send_email' },
      { ruleId: 'OBO-002', mechanism: 'approval', target: 'deploy_service' },
      { ruleId: 'AUD-001', mechanism: 'audit-only', target: 'on_audit' },
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
      compiledAt: `2026-04-15T00:00:${String(agentIdx).padStart(2, '0')}.000Z`,
      schemaVersion: 1,
    },
  };
}

describe('PRESS e2e pipeline', () => {
  it('fleet-scale PRESS + DAG pipeline with quality validation', () => {
    // Build a 47-agent fleet — 38 shared, 9 custom
    const fleet = new Map<string, GovernanceIR>();

    for (let i = 0; i < 38; i++) {
      fleet.set(`agent-${String(i).padStart(2, '0')}`, buildRichIR(i));
    }
    for (let i = 38; i < 47; i++) {
      fleet.set(`agent-${String(i).padStart(2, '0')}`, buildRichIR(i, [
        { name: `Custom-${i}`, description: `Agent ${i} custom tool`, riskLevel: 'high', oboFlag: true, classification: 'custom' },
      ]));
    }

    expect(fleet.size).toBe(47);

    // Step 1: PRESS compress each agent's IR at G2
    const pressResults = new Map<string, ReturnType<typeof press>>();
    for (const [agentId, ir] of fleet) {
      const result = press(ir, { level: 2 });
      pressResults.set(agentId, result);

      // Every agent must produce output within budget
      expect(result.withinBudget, `${agentId} within budget`).toBe(true);
      expect(result.outputTokens).toBeLessThanOrEqual(1100);

      // Quality validation passes for all agents
      expect(result.qualityPassed, `${agentId} quality`).toBe(true);
    }

    // Step 2: Build DAG from optimized IRs
    const optimizedFleet = new Map<string, GovernanceIR>();
    for (const [agentId, result] of pressResults) {
      optimizedFleet.set(agentId, result.optimizedIR);
    }

    const dag = buildDag(optimizedFleet);
    expect(dag.agents.size).toBe(47);

    // Step 3: Resolve all and verify identity
    const resolved = resolveAll(dag);
    expect(resolved.size).toBe(47);

    // Step 4: Storage metrics show reduction
    const metrics = computeStorageMetrics(dag, optimizedFleet);
    expect(metrics.reductionRatio).toBeGreaterThanOrEqual(0.50);
    expect(metrics.sharedNodeCount).toBeGreaterThanOrEqual(1);
  });

  it('full PRESS compress at G2 on 2400-token SKILL.md with quality verification', () => {
    const ir = buildRichIR(0);

    // Verify input produces substantial SKILL.md
    const skillBefore = emitSkill(ir, { compress: false });
    expect(skillBefore.content.length).toBeGreaterThan(500);

    // PRESS at G2
    const result = press(ir, { level: 2 });

    // Token budget: G2 = 1100
    expect(result.profile.tokenBudget).toBe(1100);
    expect(result.withinBudget).toBe(true);
    expect(result.outputTokens).toBeLessThanOrEqual(1100);

    // Quality: >= 0.92 on all 5 dimensions
    expect(result.qualityPassed).toBe(true);
    const scores = result.stages.quality.scores;
    expect(scores.ruleCoverage).toBeGreaterThanOrEqual(0.92);
    expect(scores.riskAccuracy).toBeGreaterThanOrEqual(0.92);
    expect(scores.oboPreservation).toBeGreaterThanOrEqual(0.92);
    expect(scores.tensionVisibility).toBeGreaterThanOrEqual(0.92);
    expect(scores.remediationActionability).toBeGreaterThanOrEqual(0.92);

    // Aggregate fidelity
    expect(result.stages.quality.aggregate).toBeGreaterThanOrEqual(0.92);

    // No violations
    expect(result.stages.quality.violations).toHaveLength(0);

    // Compressed output preserves governance semantics
    expect(result.compressed.riskLevel).toBe('R5');
    expect(result.compressed.rules.length).toBe(result.original.rules.length);
    expect(result.compressed.oboChain.length).toBe(result.original.oboChain.length);
    expect(result.compressed.remediations.length).toBe(result.original.remediations.length);

    // SKILL.md after PRESS is smaller than before
    const skillAfter = emitSkill(result.optimizedIR);
    expect(skillAfter.content.length).toBeGreaterThan(0);
  });
});
