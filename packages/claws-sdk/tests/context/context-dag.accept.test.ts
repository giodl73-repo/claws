/**
 * L3: SDK acceptance — consumer builds a 47-agent DAG, resolves per-agent
 * GovernanceIR, and verifies byte-identical output with >= 70% storage reduction.
 *
 * This test validates the public API contract from a consumer perspective:
 * build → resolve → verify identity → check storage savings.
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

// ── Fleet fixture (47 agents, 80% shared policy) ──────────────────────

function buildFleet(): Map<string, GovernanceIR> {
  const fleet = new Map<string, GovernanceIR>();

  const sharedTools: ToolCapability[] = [
    { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
    { name: 'Write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
    { name: 'Execute', description: 'Run commands', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
    { name: 'Search', description: 'Search content', riskLevel: 'low', oboFlag: false, classification: 'data' },
    { name: 'Notify', description: 'Send alerts', riskLevel: 'medium', oboFlag: false, classification: 'communication' },
  ];

  const sharedIR = (timestamp: string): GovernanceIR => ({
    capabilities: {
      tools: sharedTools,
      skills: [{ name: 'deploy', description: 'Deploy', requiredTools: ['Execute'], governanceLevel: 'error' }],
      agents: [],
      workflows: [{ name: 'ci', description: 'CI pipeline', steps: ['build', 'test'], requiresApproval: true }],
    },
    analysis: {
      violations: [{
        ruleId: 'G-CLASS-01',
        level: 'error',
        message: 'Execute needs approval gate',
        target: 'Execute',
        diagnosticCode: 'CLAWS-V001',
        fixSuggestions: [
          { direction: 'tighten', description: 'Add approval', target: 'enforcementPlan' },
        ],
        toolFuzzyMatches: [],
      }],
      warnings: [{
        ruleId: 'G-INPUT-01',
        level: 'warning',
        message: 'Search has no trust labels',
        subRuleDiagnosticCode: 'G-INPUT-01',
        category: 'G-INPUT',
        subRuleIndex: 1,
      }],
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
      { kind: 'deny', ruleId: 'G-CLASS-01', target: 'Execute', reason: 'No gate', level: 'error' },
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
      compiledAt: timestamp,
      schemaVersion: 1,
    },
  });

  // 38 shared agents (80% of 47)
  for (let i = 0; i < 38; i++) {
    fleet.set(`agent-${String(i).padStart(2, '0')}`, sharedIR(`2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`));
  }

  // 9 custom agents (20%)
  for (let i = 38; i < 47; i++) {
    const customIR = sharedIR(`2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`);
    fleet.set(`agent-${String(i).padStart(2, '0')}`, {
      ...customIR,
      capabilities: {
        ...customIR.capabilities,
        tools: [
          ...sharedTools,
          { name: `Custom-${i}`, description: `Agent ${i} tool`, riskLevel: 'high', oboFlag: true, classification: 'custom' },
        ],
      },
    });
  }

  return fleet;
}

// ── Acceptance test ────────────────────────────────────────────────────

describe('accept: context-dag SDK consumer contract', () => {
  it('47-agent DAG: build, resolve per-agent, verify byte-identity + >= 70% storage reduction', () => {
    // Build fleet
    const fleet = buildFleet();
    expect(fleet.size).toBe(47);

    // Build DAG
    const dag = buildDag(fleet);
    expect(dag.agents.size).toBe(47);

    // Resolve all agents
    const resolved = resolveAll(dag);
    expect(resolved.size).toBe(47);

    // Verify byte-identical resolution for every agent
    let byteIdenticalCount = 0;
    for (const [agentId, originalIR] of fleet) {
      const resolvedIR = resolved.get(agentId);
      expect(resolvedIR, `${agentId} must resolve`).toBeDefined();

      const originalSerialized = serialize(originalIR);
      const resolvedSerialized = serialize(resolvedIR!);

      if (resolvedSerialized === originalSerialized) {
        byteIdenticalCount++;
      } else {
        // Fail with context on first mismatch
        expect(resolvedSerialized).toBe(originalSerialized);
      }
    }
    expect(byteIdenticalCount).toBe(47);

    // Verify storage reduction
    const metrics = computeStorageMetrics(dag, fleet);
    expect(metrics.reductionRatio).toBeGreaterThanOrEqual(0.70);
    expect(metrics.individualBytes).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeLessThan(metrics.individualBytes);
  });
});
