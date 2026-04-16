/**
 * L2: Content-addressed DAG — fleet-scale build + resolve + invalidation
 * end-to-end test.
 *
 * 1 e2e test:
 * 1. Fleet-scale DAG lifecycle: build, resolve, invalidate, rebuild, re-resolve
 */

import { describe, it, expect } from 'vitest';
import {
  buildDag,
  resolveAll,
  resolveAgent,
  computeStorageMetrics,
  invalidateNode,
  rebuildWithUpdatedShared,
  hashFragment,
  extractSharedFragment,
  type GovernanceFragment,
} from '../../src/context/context-dag.js';
import { serialize, hashIR } from '../../src/ir/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';

// ── Fleet generator (same pattern as integration, inline for e2e isolation) ──

function makeFleetIR(agentId: string, extraTools: ToolCapability[] = []): GovernanceIR {
  return {
    capabilities: {
      tools: [
        { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'Write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
        ...extraTools,
      ],
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
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '1.0.0',
      compiledAt: `2026-01-01T00:00:00.000Z`,
      schemaVersion: 1,
    },
  };
}

describe('ContextDAG E2E', () => {
  it('fleet-scale DAG lifecycle: build, resolve, invalidate, rebuild, re-resolve', () => {
    // ── Phase 1: Build ──────────────────────────────────────────────
    const fleet = new Map<string, GovernanceIR>();
    const sharedCount = 38;
    const totalCount = 47;

    // 38 shared agents
    for (let i = 0; i < sharedCount; i++) {
      fleet.set(`agent-${String(i).padStart(2, '0')}`, makeFleetIR(`agent-${i}`));
    }
    // 9 custom agents
    for (let i = sharedCount; i < totalCount; i++) {
      fleet.set(`agent-${String(i).padStart(2, '0')}`, makeFleetIR(`agent-${i}`, [
        { name: `Tool-${i}`, description: `Custom ${i}`, riskLevel: 'high', oboFlag: true, classification: 'custom' },
      ]));
    }

    const dag = buildDag(fleet);
    expect(dag.agents.size).toBe(47);

    // ── Phase 2: Resolve ────────────────────────────────────────────
    const resolved = resolveAll(dag);
    expect(resolved.size).toBe(47);

    // Verify byte-identity for all agents
    for (const [agentId, originalIR] of fleet) {
      const resolvedIR = resolved.get(agentId)!;
      expect(serialize(resolvedIR)).toBe(serialize(originalIR));
    }

    // ── Phase 3: Storage metrics ────────────────────────────────────
    const metrics = computeStorageMetrics(dag, fleet);
    expect(metrics.reductionRatio).toBeGreaterThanOrEqual(0.70);

    // ── Phase 4: Invalidate shared policy ───────────────────────────
    const sharedBaseHash = dag.agents.get('agent-00')!.baseHash;
    const affected = invalidateNode(dag, sharedBaseHash);

    // All 38 shared agents should be affected
    expect(affected.size).toBe(sharedCount);
    for (let i = 0; i < sharedCount; i++) {
      expect(affected.has(`agent-${String(i).padStart(2, '0')}`)).toBe(true);
    }
    // Custom agents should NOT be affected (different base hash)
    for (let i = sharedCount; i < totalCount; i++) {
      expect(affected.has(`agent-${String(i).padStart(2, '0')}`)).toBe(false);
    }

    // ── Phase 5: Rebuild with updated policy ────────────────────────
    const baseNode = dag.nodes.get(sharedBaseHash)!;
    const updatedFragment: GovernanceFragment = {
      ...baseNode.fragment,
      capabilities: {
        ...baseNode.fragment.capabilities!,
        tools: [
          ...baseNode.fragment.capabilities!.tools,
          { name: 'Audit', description: 'Audit trail', riskLevel: 'low', oboFlag: false, classification: 'data' },
        ],
      },
    };

    const newDag = rebuildWithUpdatedShared(dag, sharedBaseHash, updatedFragment);

    // Old hash gone, new hash present
    expect(newDag.nodes.has(sharedBaseHash)).toBe(false);
    const newHash = hashFragment(updatedFragment);
    expect(newDag.nodes.has(newHash)).toBe(true);

    // ── Phase 6: Re-resolve after rebuild ───────────────────────────
    // Shared agents now have the Audit tool
    for (let i = 0; i < sharedCount; i++) {
      const agentId = `agent-${String(i).padStart(2, '0')}`;
      const reResolved = resolveAgent(newDag, agentId);
      expect(reResolved.ir.capabilities.tools.map(t => t.name)).toContain('Audit');
    }

    // Custom agents unchanged (different base)
    for (let i = sharedCount; i < totalCount; i++) {
      const agentId = `agent-${String(i).padStart(2, '0')}`;
      const reResolved = resolveAgent(newDag, agentId);
      expect(reResolved.ir.capabilities.tools.map(t => t.name)).not.toContain('Audit');
      expect(reResolved.ir.capabilities.tools.map(t => t.name)).toContain(`Tool-${i}`);
    }
  });
});
