/**
 * L3 CLI acceptance test for context-dag.
 *
 * P25: `claws press --dag` on fleet fixture produces correct per-agent
 * output and reports storage savings.
 *
 * Tests the SDK directly (no CLI binary) since the press CLI command
 * surface is being built in a later pulse (P26). Validates that the SDK
 * produces correct output for CLI rendering.
 */

import { describe, it, expect } from 'vitest';
import {
  buildDag,
  resolveAll,
  resolveAgent,
  computeStorageMetrics,
} from '@bic/claws-sdk/context/context-dag';
import { serialize } from '@bic/claws-sdk/ir/governance-ir';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir';
import type { ToolCapability } from '@bic/claws-sdk/ir/capability-manifest';

// ── Fleet fixture (47 agents, 80% shared) ──────────────────────────────

function buildFleet47(): Map<string, GovernanceIR> {
  const fleet = new Map<string, GovernanceIR>();

  const sharedTools: ToolCapability[] = [
    { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
    { name: 'Write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
    { name: 'Execute', description: 'Execute commands', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
  ];

  const makeIR = (agentIdx: number, extraTools: ToolCapability[] = []): GovernanceIR => ({
    capabilities: {
      tools: [...sharedTools, ...extraTools],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [{
        ruleId: 'G-CLASS-01',
        level: 'error',
        message: 'Execute needs approval',
        target: 'Execute',
        diagnosticCode: 'CLAWS-V001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: ['Execute'],
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
    compiler: {
      compilerVersion: '1.0.0',
      compiledAt: `2026-01-01T00:00:${String(agentIdx).padStart(2, '0')}.000Z`,
      schemaVersion: 1,
    },
  });

  // 38 shared
  for (let i = 0; i < 38; i++) {
    fleet.set(`agent-${String(i).padStart(2, '0')}`, makeIR(i));
  }
  // 9 custom
  for (let i = 38; i < 47; i++) {
    fleet.set(`agent-${String(i).padStart(2, '0')}`, makeIR(i, [
      { name: `Tool-${i}`, description: `Custom ${i}`, riskLevel: 'high', oboFlag: true, classification: 'custom' },
    ]));
  }

  return fleet;
}

// ── CLI acceptance test ────────────────────────────────────────────────

describe('CLI acceptance: claws press --dag', () => {
  it('fleet fixture produces correct per-agent output and reports storage savings', () => {
    const fleet = buildFleet47();
    expect(fleet.size).toBe(47);

    // CLI would call: buildDag(fleet)
    const dag = buildDag(fleet);

    // CLI would render: agent count
    expect(dag.agents.size).toBe(47);

    // CLI would call: resolveAll(dag)
    const resolved = resolveAll(dag);
    expect(resolved.size).toBe(47);

    // CLI would render: per-agent output verification
    for (const [agentId, originalIR] of fleet) {
      const resolvedIR = resolved.get(agentId)!;

      // CLI would diff serialized output
      expect(serialize(resolvedIR)).toBe(serialize(originalIR));
    }

    // CLI would call: resolveAgent for a specific agent
    const single = resolveAgent(dag, 'agent-00');
    expect(single.agentId).toBe('agent-00');
    expect(single.ir.capabilities.tools).toHaveLength(3);

    const custom = resolveAgent(dag, 'agent-42');
    expect(custom.ir.capabilities.tools).toHaveLength(4);
    expect(custom.ir.capabilities.tools.map(t => t.name)).toContain('Tool-42');

    // CLI would render: storage savings report
    const metrics = computeStorageMetrics(dag, fleet);

    // CLI would display: reduction percentage
    expect(metrics.reductionRatio).toBeGreaterThanOrEqual(0.70);

    // CLI would display: byte counts
    expect(metrics.individualBytes).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeLessThan(metrics.individualBytes);

    // CLI would display: node statistics
    expect(metrics.sharedNodeCount).toBeGreaterThanOrEqual(1);
    expect(metrics.totalNodeCount).toBeLessThan(47 * 2);

    // CLI would display: percentage string
    const pct = Math.round(metrics.reductionRatio * 100);
    expect(pct).toBeGreaterThanOrEqual(70);
  });
});
