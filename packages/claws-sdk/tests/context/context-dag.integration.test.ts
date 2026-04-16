/**
 * L1: Content-addressed DAG — fleet-scale integration tests.
 *
 * 2 integration tests:
 * 1. 47-agent fleet build achieves >= 70% storage reduction
 * 2. Resolved GovernanceIR byte-identical to individual compile
 */

import { describe, it, expect } from 'vitest';
import {
  buildDag,
  resolveAll,
  computeStorageMetrics,
} from '../../src/context/context-dag.js';
import { serialize } from '../../src/ir/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';
import type { GovViolation, GovWarning } from '../../src/ir/gov-analysis.js';

// ── Fleet fixture generator ────────────────────────────────────────────

const FLEET_SIZE = 47;
const SHARED_POLICY_RATIO = 0.8;

/** Shared tools used by 80% of agents. */
const SHARED_TOOLS: readonly ToolCapability[] = [
  { name: 'Read', description: 'Read files from disk', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
  { name: 'Write', description: 'Write files to disk', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
  { name: 'Execute', description: 'Execute shell commands', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
  { name: 'Search', description: 'Search indexed content', riskLevel: 'low', oboFlag: false, classification: 'data' },
  { name: 'Notify', description: 'Send notifications', riskLevel: 'medium', oboFlag: false, classification: 'communication' },
];

/** Shared violations produced by standard policy analysis. */
const SHARED_VIOLATIONS: readonly GovViolation[] = [
  {
    ruleId: 'G-CLASS-01',
    level: 'error',
    message: 'Tool Execute classified as critical but no approval gate defined',
    target: 'Execute',
    diagnosticCode: 'CLAWS-V001',
    fixSuggestions: [
      { direction: 'tighten', description: 'Add approval gate for Execute', target: 'enforcementPlan.requiredApprovals' },
      { direction: 'relax', description: 'Reclassify Execute to high', target: 'tools.Execute.riskLevel' },
    ],
    toolFuzzyMatches: [],
  },
];

/** Shared warnings from standard analysis. */
const SHARED_WARNINGS: readonly GovWarning[] = [
  {
    ruleId: 'G-INPUT-01',
    level: 'warning',
    message: 'Tool Search has no trust labels for external content',
    subRuleDiagnosticCode: 'G-INPUT-01',
    category: 'G-INPUT',
    subRuleIndex: 1,
  },
];

/**
 * Generate a fleet of 47 agents with 80% shared governance policy.
 *
 * Strategy:
 * - 38 agents (80%) share identical governance (same tools, analysis, policies)
 * - 9 agents (20%) have unique per-agent customizations (extra tools, violations)
 */
function generateFleet47(): Map<string, GovernanceIR> {
  const fleet = new Map<string, GovernanceIR>();

  const sharedCount = Math.round(FLEET_SIZE * SHARED_POLICY_RATIO);

  // Shared agents: identical governance except for compiler metadata
  for (let i = 0; i < sharedCount; i++) {
    fleet.set(`agent-${String(i).padStart(2, '0')}`, {
      capabilities: {
        tools: [...SHARED_TOOLS],
        skills: [
          { name: 'deploy', description: 'Deploy to production', requiredTools: ['Execute'], governanceLevel: 'error' },
        ],
        agents: [],
        workflows: [
          { name: 'ci-pipeline', description: 'Standard CI', steps: ['build', 'test', 'deploy'], requiresApproval: true },
        ],
      },
      analysis: {
        violations: [...SHARED_VIOLATIONS],
        warnings: [...SHARED_WARNINGS],
        enforcementPlan: {
          blockedTools: [],
          requiredApprovals: ['Execute'],
          auditOnlyRules: ['G-INPUT-01'],
          channelRedactions: [],
          ruleSuppressions: [],
        },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
      intents: [
        { kind: 'deny', ruleId: 'G-CLASS-01', target: 'Execute', reason: 'No approval gate', level: 'error' },
      ],
      delegationMap: [
        { ruleId: 'G-PERM-01', mechanism: 'approval', target: 'Execute' },
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
        compiledAt: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
        schemaVersion: 1,
      },
    });
  }

  // Custom agents: unique per-agent governance deltas
  for (let i = sharedCount; i < FLEET_SIZE; i++) {
    const customTools: ToolCapability[] = [
      ...SHARED_TOOLS,
      {
        name: `CustomTool-${i}`,
        description: `Custom tool for agent ${i}`,
        riskLevel: 'high',
        oboFlag: true,
        classification: 'custom',
      },
    ];

    fleet.set(`agent-${String(i).padStart(2, '0')}`, {
      capabilities: {
        tools: customTools,
        skills: [
          { name: 'deploy', description: 'Deploy to production', requiredTools: ['Execute'], governanceLevel: 'error' },
          { name: `custom-skill-${i}`, description: `Custom skill for agent ${i}`, requiredTools: [`CustomTool-${i}`], governanceLevel: 'warning' },
        ],
        agents: [
          { name: `sub-agent-${i}`, description: `Sub-agent for ${i}`, delegations: [], maxAutonomousLevel: 'warning' },
        ],
        workflows: [
          { name: 'ci-pipeline', description: 'Standard CI', steps: ['build', 'test', 'deploy'], requiresApproval: true },
          { name: `custom-flow-${i}`, description: `Custom workflow for ${i}`, steps: ['validate', 'execute'], requiresApproval: false },
        ],
      },
      analysis: {
        violations: [
          ...SHARED_VIOLATIONS,
          {
            ruleId: `G-CUSTOM-${i}`,
            level: 'warning',
            message: `Custom tool ${i} has OBO flag without delegation chain`,
            target: `CustomTool-${i}`,
            diagnosticCode: `CLAWS-C${i}`,
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
        ],
        warnings: [...SHARED_WARNINGS],
        enforcementPlan: {
          blockedTools: [],
          requiredApprovals: ['Execute', `CustomTool-${i}`],
          auditOnlyRules: ['G-INPUT-01'],
          channelRedactions: [],
          ruleSuppressions: [],
        },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
      intents: [
        { kind: 'deny', ruleId: 'G-CLASS-01', target: 'Execute', reason: 'No approval gate', level: 'error' },
        { kind: 'require', ruleId: `G-CUSTOM-${i}`, target: `CustomTool-${i}`, reason: 'OBO requires delegation', level: 'warning' },
      ],
      delegationMap: [
        { ruleId: 'G-PERM-01', mechanism: 'approval', target: 'Execute' },
        { ruleId: `G-PERM-${i}`, mechanism: 'audit-only', target: `CustomTool-${i}` },
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
        compiledAt: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
        schemaVersion: 1,
      },
    });
  }

  return fleet;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('ContextDAG Integration', () => {
  it('47-agent fleet build achieves >= 70% storage reduction', () => {
    const fleet = generateFleet47();
    expect(fleet.size).toBe(47);

    const dag = buildDag(fleet);
    const metrics = computeStorageMetrics(dag, fleet);

    // Must achieve >= 70% storage reduction
    expect(metrics.reductionRatio).toBeGreaterThanOrEqual(0.70);

    // Shared nodes should be much fewer than total agents
    expect(metrics.sharedNodeCount).toBeGreaterThanOrEqual(1);
    expect(metrics.totalNodeCount).toBeLessThan(fleet.size * 2);

    // DAG bytes should be significantly less than individual bytes
    expect(metrics.dagBytes).toBeLessThan(metrics.individualBytes * 0.30);
  });

  it('resolved GovernanceIR byte-identical to individual compile', () => {
    const fleet = generateFleet47();
    const dag = buildDag(fleet);
    const resolved = resolveAll(dag);

    expect(resolved.size).toBe(47);

    // Every resolved GovernanceIR must serialize to the exact same bytes
    // as the original input GovernanceIR
    for (const [agentId, originalIR] of fleet) {
      const resolvedIR = resolved.get(agentId);
      expect(resolvedIR, `agent ${agentId} should be resolved`).toBeDefined();

      const originalJson = serialize(originalIR);
      const resolvedJson = serialize(resolvedIR!);

      expect(resolvedJson, `agent ${agentId} resolved IR must be byte-identical`).toBe(originalJson);
    }
  });
});
