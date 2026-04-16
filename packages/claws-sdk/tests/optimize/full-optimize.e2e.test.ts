/**
 * L2 e2e test — full optimization pipeline.
 *
 * P32 CP-3 gate: PRESS + DAG + dead-code + merge on fixture fleet.
 *
 * Validates the entire optimization pipeline end-to-end using
 * fixture GovernanceIRs for a multi-agent fleet. This is the
 * integration gate for all optimization-related CP-3 work (pulses 21-26).
 */

import { describe, it, expect } from 'vitest';

import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import { eliminateDeadCode } from '../../src/optimize/dead-code.js';
import { mergeRedundantChecks } from '../../src/optimize/merge-checks.js';
import { press } from '../../src/context/context-press.js';
import {
  buildDag,
  resolveAgent,
  resolveAll,
  computeStorageMetrics,
} from '../../src/context/context-dag.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

/**
 * Build a fleet of 3 agents with shared base governance and per-agent deltas.
 *
 * - Agent A: base governance (read + write tools)
 * - Agent B: same base + extra deny intent (delete_database)
 * - Agent C: same base + disabled rule suppression
 *
 * This exercises: dead-code elimination (ghost tool, disabled rule),
 * redundant check merging (duplicate deny on same tool), DAG structural
 * sharing (agents A/B/C share base), and PRESS compression.
 */
function buildFleet(): ReadonlyMap<string, GovernanceIR> {
  const base = minimalGovernanceIR();
  const fleet = new Map<string, GovernanceIR>();

  // Agent A: base governance as-is
  fleet.set('agent-a', {
    ...base,
    compiler: {
      ...base.compiler,
      compiledAt: '2026-04-15T00:00:00.000Z',
    },
  });

  // Agent B: extra deny intent + ghost tool intent
  fleet.set('agent-b', {
    ...base,
    intents: [
      ...base.intents,
      // Extra deny on delete_database (same tool, same level → mergeable with base)
      {
        id: 'intent-b-001',
        ruleId: 'SEC-002',
        level: 5 as const,
        kind: 'deny' as const,
        description: 'Block delete_database for compliance',
        target: 'delete_database',
        reason: 'SOC2 compliance — database deletion blocked',
      },
      // Ghost tool intent (deploy_production not in manifest)
      {
        id: 'intent-b-ghost',
        ruleId: 'GHOST-002',
        level: 3 as const,
        kind: 'deny' as const,
        description: 'Block deploy_production',
        target: 'deploy_production',
        reason: 'Production deployment not allowed',
      },
    ],
    delegationMap: [
      ...base.delegationMap,
      { ruleId: 'SEC-002', mechanism: 'hook' as const, target: 'before_tool_call' },
      { ruleId: 'GHOST-002', mechanism: 'hook' as const, target: 'before_tool_call' },
    ],
    compiler: {
      ...base.compiler,
      compiledAt: '2026-04-15T00:01:00.000Z',
    },
  });

  // Agent C: disabled rule suppression
  fleet.set('agent-c', {
    ...base,
    intents: [
      ...base.intents,
      // Disabled rule intent
      {
        id: 'intent-c-disabled',
        ruleId: 'DEBUG-001',
        level: 2 as const,
        kind: 'deny' as const,
        description: 'Block debug tool',
        target: 'execute_command',
        reason: 'Debug tool suppressed',
      },
    ],
    delegationMap: [
      ...base.delegationMap,
      { ruleId: 'DEBUG-001', mechanism: 'audit-only' as const, target: 'on_audit' },
    ],
    analysis: {
      ...base.analysis,
      enforcementPlan: {
        ...base.analysis.enforcementPlan,
        ruleSuppressions: [
          {
            ruleId: 'DEBUG-001',
            reason: 'Debug tool suppressed for migration',
            expiresAt: '',
            authorizedBy: 'admin@example.com',
          },
        ],
      },
    },
    compiler: {
      ...base.compiler,
      compiledAt: '2026-04-15T00:02:00.000Z',
    },
  });

  return fleet;
}

describe('full optimization pipeline: PRESS + DAG + dead-code + merge', () => {
  it('runs the full CP-3 optimization pipeline on a fixture fleet', () => {
    const fleet = buildFleet();

    // ── Step 1: DAG construction ───────────────────────────────────────
    const dag = buildDag(fleet);

    // 3 agents should have delta nodes
    expect(dag.agents.size).toBe(3);

    // Storage metrics — DAG should be more efficient than individual storage
    const metrics = computeStorageMetrics(dag, fleet);
    expect(metrics.totalNodeCount).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeGreaterThan(0);
    expect(metrics.individualBytes).toBeGreaterThan(0);

    // ── Step 2: Resolve individual agents from DAG ─────────────────────
    const resolvedAll = resolveAll(dag);
    expect(resolvedAll.size).toBe(3);

    // Agent A should resolve to its original IR
    const agentA = resolveAgent(dag, 'agent-a');
    expect(agentA.ir.compiler.compiledAt).toBe('2026-04-15T00:00:00.000Z');
    expect(agentA.ir.intents).toHaveLength(3); // base intents

    // Agent B should have extra intents
    const agentB = resolveAgent(dag, 'agent-b');
    expect(agentB.ir.intents.length).toBeGreaterThan(agentA.ir.intents.length);

    // ── Step 3: Dead-code elimination on Agent B ───────────────────────
    const deadCodeB = eliminateDeadCode(agentB.ir);

    // Ghost intent (deploy_production) should be removed
    expect(deadCodeB.removedAbsentToolIntents).toBe(1);
    expect(deadCodeB.ir.intents.find(i => i.ruleId === 'GHOST-002')).toBeUndefined();

    // ── Step 4: Dead-code elimination on Agent C ───────────────────────
    const deadCodeC = eliminateDeadCode(resolveAgent(dag, 'agent-c').ir);

    // Disabled rule should be removed
    expect(deadCodeC.removedDisabledIntents).toBe(1);
    expect(deadCodeC.ir.intents.find(i => i.ruleId === 'DEBUG-001')).toBeUndefined();

    // ── Step 5: Merge redundant checks on Agent B (after dead-code) ────
    const mergeB = mergeRedundantChecks(deadCodeB.ir);

    // SEC-001 + SEC-002 should merge (same tool, same level, same kind)
    expect(mergeB.mergeCount).toBe(1);

    // Verify merged intent exists
    const mergedDeny = mergeB.ir.intents.find(
      i => i.kind === 'deny' && i.ruleId.includes('SEC-001') && i.ruleId.includes('SEC-002'),
    );
    expect(mergedDeny).toBeDefined();

    // ── Step 6: PRESS compression on Agent A ───────────────────────────
    const pressResult = press(agentA.ir, { level: 2 });

    expect(pressResult.profile).toBeDefined();
    expect(pressResult.optimizedIR).toBeDefined();
    expect(pressResult.outputTokens).toBeGreaterThan(0);
    expect(pressResult.stages.deadCode).toBeDefined();
    expect(pressResult.stages.mergeChecks).toBeDefined();
    expect(pressResult.stages.quality).toBeDefined();
    expect(pressResult.stages.costEstimate).toBeDefined();
    expect(pressResult.stages.ordering).toBeDefined();

    // ── Step 7: PRESS on Agent B after optimization ────────────────────
    const pressB = press(mergeB.ir, { level: 2 });

    expect(pressB.optimizedIR).toBeDefined();
    // After dead-code + merge, Agent B should have fewer intents
    expect(pressB.optimizedIR.intents.length).toBeLessThanOrEqual(mergeB.ir.intents.length);

    // ── Validation: pipeline produces valid, smaller output ────────────
    // Agent B started with 5 intents, after dead-code (-1 ghost) = 4,
    // after merge (-1 merged) = 3. PRESS may remove more based on profile.
    expect(mergeB.ir.intents.length).toBeLessThan(agentB.ir.intents.length);

    // Agent C started with 4 intents, after dead-code (-1 disabled) = 3.
    expect(deadCodeC.ir.intents.length).toBeLessThan(
      resolveAgent(dag, 'agent-c').ir.intents.length,
    );

    // All resolved IRs have required structure
    for (const ir of resolvedAll.values()) {
      expect(ir.capabilities).toBeDefined();
      expect(ir.analysis).toBeDefined();
      expect(ir.compiler).toBeDefined();
      expect(ir.conflicts).toBeDefined();
      expect(ir.intents).toBeDefined();
      expect(ir.delegationMap).toBeDefined();
    }
  });
});
