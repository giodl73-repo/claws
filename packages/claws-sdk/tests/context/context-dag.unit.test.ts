/**
 * L0: Content-addressed DAG — node hashing, deduplication, delta storage,
 * invalidation.
 *
 * 4 unit tests:
 * 1. Node hashing: SHA-256 content hash is correct and deterministic
 * 2. Duplicate subgraph deduplication: identical fragments share one node
 * 3. Per-agent delta stored: agent-specific overrides are separate nodes
 * 4. DAG invalidation: shared policy change invalidates dependent agents
 */

import { describe, it, expect } from 'vitest';
import {
  hashFragment,
  hashDeltaWithBase,
  extractSharedFragment,
  extractDeltaFragment,
  buildDag,
  resolveAgent,
  resolveAll,
  computeStorageMetrics,
  invalidateNode,
  rebuildWithUpdatedShared,
  type GovernanceFragment,
  type ContextDag,
} from '../../src/context/context-dag.js';
import { createHash } from 'node:crypto';
import { stripBOM, normalizeLF } from '../../src/util/text.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

// ── Helpers ────────────────────────────────────────────────────────────

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

function makeMinimalIR(overrides: Partial<GovernanceIR> = {}): GovernanceIR {
  return {
    capabilities: {
      tools: [{ name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' }],
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
      compiledAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    ...overrides,
  };
}

describe('ContextDAG', () => {
  it('node hashing: SHA-256 content hash is correct and deterministic', () => {
    const fragment: GovernanceFragment = {
      capabilities: {
        tools: [{ name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' }],
        skills: [],
        agents: [],
        workflows: [],
      },
    };

    const hash1 = hashFragment(fragment);
    const hash2 = hashFragment(fragment);

    // Deterministic: same input produces same hash
    expect(hash1).toBe(hash2);

    // SHA-256 produces 64-character hex string
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    // Verify independently: compute expected hash
    const json = JSON.stringify(fragment, sortedReplacer, 2);
    const normalized = normalizeLF(stripBOM(json));
    const expected = createHash('sha256').update(normalized, 'utf8').digest('hex');
    expect(hash1).toBe(expected);

    // Different content produces different hash
    const differentFragment: GovernanceFragment = {
      capabilities: {
        tools: [{ name: 'Write', description: 'Write files', riskLevel: 'high', oboFlag: false, classification: 'filesystem' }],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const hash3 = hashFragment(differentFragment);
    expect(hash3).not.toBe(hash1);

    // Property insertion order does not affect hash (sorted keys)
    const reorderedFragment: GovernanceFragment = {
      capabilities: {
        workflows: [],
        skills: [],
        agents: [],
        tools: [{ name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' }],
      },
    };
    const hash4 = hashFragment(reorderedFragment);
    expect(hash4).toBe(hash1);
  });

  it('duplicate subgraph deduplication: identical fragments share one node', () => {
    // 5 agents with identical governance — should deduplicate to 1 shared node
    const baseIR = makeMinimalIR();
    const agents = new Map<string, GovernanceIR>();

    for (let i = 0; i < 5; i++) {
      agents.set(`agent-${i}`, makeMinimalIR({
        compiler: {
          compilerVersion: '1.0.0',
          compiledAt: `2026-01-01T00:00:0${i}.000Z`,
          schemaVersion: 1,
        },
      }));
    }

    const dag = buildDag(agents);

    // All 5 agents share the same base hash
    const baseHashes = new Set<string>();
    for (const delta of dag.agents.values()) {
      baseHashes.add(delta.baseHash);
    }
    expect(baseHashes.size).toBe(1);

    // The shared fragment is stored only once as a node
    const sharedHash = [...baseHashes][0]!;
    expect(dag.nodes.has(sharedHash)).toBe(true);

    // Each agent has its own delta node (different compiler timestamps)
    const deltaHashes = new Set<string>();
    for (const delta of dag.agents.values()) {
      deltaHashes.add(delta.deltaHash);
    }
    // Delta hashes may differ (different compiledAt timestamps)
    // but the base hashes are all the same
    expect(deltaHashes.size).toBe(5);

    // Total nodes = 1 shared + 5 deltas = 6
    expect(dag.nodes.size).toBe(6);
  });

  it('per-agent delta stored: agent-specific overrides are separate nodes', () => {
    const sharedTools = [
      { name: 'Read', description: 'Read files', riskLevel: 'low' as const, oboFlag: false, classification: 'filesystem' as const },
    ];

    // Agent A: shared base only
    const irA = makeMinimalIR({
      compiler: {
        compilerVersion: '1.0.0',
        compiledAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: 1,
      },
    });

    // Agent B: different capabilities AND different intents/delegationMap/conflicts
    const irB = makeMinimalIR({
      capabilities: {
        tools: [
          ...sharedTools,
          { name: 'Write', description: 'Write files', riskLevel: 'high' as const, oboFlag: false, classification: 'filesystem' as const },
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
      intents: [
        { kind: 'deny', ruleId: 'G-CLASS-01', target: 'Write', reason: 'High risk', level: 'error' },
      ],
      delegationMap: [
        { ruleId: 'G-PERM-01', mechanism: 'approval' as const, target: 'Write' },
      ],
      conflicts: {
        oboConflicts: [],
        multiConstraintConflicts: [],
        haltReason: 'Write tool requires approval',
        hasOboWithoutElicit: false,
        totalConflicts: 0,
      },
      compiler: {
        compilerVersion: '1.0.0',
        compiledAt: '2026-01-01T00:00:01.000Z',
        schemaVersion: 1,
      },
    });

    const agents = new Map<string, GovernanceIR>([
      ['agent-a', irA],
      ['agent-b', irB],
    ]);

    const dag = buildDag(agents);

    // Agent A and B have different base hashes (different capabilities, intents, etc.)
    const deltaA = dag.agents.get('agent-a')!;
    const deltaB = dag.agents.get('agent-b')!;
    expect(deltaA.baseHash).not.toBe(deltaB.baseHash);

    // Both have delta nodes with compiler metadata
    const deltaNodeA = dag.nodes.get(deltaA.deltaHash)!;
    const deltaNodeB = dag.nodes.get(deltaB.deltaHash)!;
    expect(deltaNodeA.fragment.compiler).toBeDefined();
    expect(deltaNodeB.fragment.compiler).toBeDefined();

    // Delta nodes reference their respective base nodes
    expect(deltaNodeA.parents).toContain(deltaA.baseHash);
    expect(deltaNodeB.parents).toContain(deltaB.baseHash);

    // Resolution produces the original IR for each agent
    const resolvedA = resolveAgent(dag, 'agent-a');
    const resolvedB = resolveAgent(dag, 'agent-b');
    expect(resolvedA.ir.capabilities.tools).toHaveLength(1);
    expect(resolvedB.ir.capabilities.tools).toHaveLength(2);
    expect(resolvedA.ir.compiler.compiledAt).toBe('2026-01-01T00:00:00.000Z');
    expect(resolvedB.ir.compiler.compiledAt).toBe('2026-01-01T00:00:01.000Z');

    // Agent B resolution includes its unique intents, delegationMap, conflicts
    expect(resolvedB.ir.intents).toHaveLength(1);
    expect(resolvedB.ir.delegationMap).toHaveLength(1);
    expect(resolvedB.ir.conflicts.haltReason).toBe('Write tool requires approval');

    // Agent A resolution has empty intents, delegationMap (from shared base)
    expect(resolvedA.ir.intents).toHaveLength(0);
    expect(resolvedA.ir.delegationMap).toHaveLength(0);
    expect(resolvedA.ir.conflicts.haltReason).toBeNull();

    // Resolving a non-existent agent throws
    expect(() => resolveAgent(dag, 'non-existent')).toThrow('Agent "non-existent" not found in DAG');

    // Direct extractDeltaFragment coverage: IR with different intents, delegationMap, conflicts
    // from an external shared fragment (simulates cross-agent delta computation)
    const externalShared: GovernanceFragment = {
      capabilities: irB.capabilities,
      analysis: irB.analysis,
      intents: [], // different from irB.intents
      delegationMap: [], // different from irB.delegationMap
      conflicts: makeMinimalIR().conflicts, // different from irB.conflicts
    };
    const crossDelta = extractDeltaFragment(irB, externalShared);
    // Delta should capture the differing fields
    expect(crossDelta.intents).toEqual(irB.intents);
    expect(crossDelta.delegationMap).toEqual(irB.delegationMap);
    expect(crossDelta.conflicts).toEqual(irB.conflicts);
    // Capabilities and analysis are same, so NOT in delta
    expect(crossDelta.capabilities).toBeUndefined();
    expect(crossDelta.analysis).toBeUndefined();
  });

  it('DAG invalidation: shared policy change invalidates dependent agents', () => {
    // 3 agents sharing the same base
    const agents = new Map<string, GovernanceIR>();
    for (let i = 0; i < 3; i++) {
      agents.set(`agent-${i}`, makeMinimalIR({
        compiler: {
          compilerVersion: '1.0.0',
          compiledAt: `2026-01-01T00:00:0${i}.000Z`,
          schemaVersion: 1,
        },
      }));
    }

    const dag = buildDag(agents);

    // Get the shared base hash
    const sharedBaseHash = dag.agents.get('agent-0')!.baseHash;

    // All 3 agents reference the same base
    for (const delta of dag.agents.values()) {
      expect(delta.baseHash).toBe(sharedBaseHash);
    }

    // Invalidate the shared node
    const affected = invalidateNode(dag, sharedBaseHash);
    expect(affected.size).toBe(3);
    expect(affected.has('agent-0')).toBe(true);
    expect(affected.has('agent-1')).toBe(true);
    expect(affected.has('agent-2')).toBe(true);

    // Rebuild with updated shared fragment
    const newShared: GovernanceFragment = {
      capabilities: {
        tools: [
          { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
          { name: 'Execute', description: 'Run commands', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
      analysis: makeMinimalIR().analysis,
      intents: [],
      delegationMap: [],
      conflicts: makeMinimalIR().conflicts,
    };

    const newDag = rebuildWithUpdatedShared(dag, sharedBaseHash, newShared);

    // Old shared hash should be gone
    expect(newDag.nodes.has(sharedBaseHash)).toBe(false);

    // New shared hash should exist
    const newSharedHash = hashFragment(newShared);
    expect(newDag.nodes.has(newSharedHash)).toBe(true);

    // All agents point to the new base
    for (const delta of newDag.agents.values()) {
      expect(delta.baseHash).toBe(newSharedHash);
    }

    // Delta nodes now reference the new base hash
    for (const delta of newDag.agents.values()) {
      const deltaNode = newDag.nodes.get(delta.deltaHash)!;
      expect(deltaNode.parents).toContain(newSharedHash);
    }

    // Invalidating a non-existent hash returns empty set
    const noAffected = invalidateNode(dag, 'nonexistent-hash');
    expect(noAffected.size).toBe(0);
  });

  it('rebuildWithUpdatedShared rehashes delta nodes to match new base (CM-08)', () => {
    // 2 agents sharing the same base
    const agents = new Map<string, GovernanceIR>();
    for (let i = 0; i < 2; i++) {
      agents.set(`agent-${i}`, makeMinimalIR({
        compiler: {
          compilerVersion: '1.0.0',
          compiledAt: `2026-01-01T00:00:0${i}.000Z`,
          schemaVersion: 1,
        },
      }));
    }

    const dag = buildDag(agents);
    const oldBaseHash = dag.agents.get('agent-0')!.baseHash;

    // Capture old delta hashes
    const oldDeltaHash0 = dag.agents.get('agent-0')!.deltaHash;
    const oldDeltaHash1 = dag.agents.get('agent-1')!.deltaHash;

    // Rebuild with a new shared fragment
    const newShared: GovernanceFragment = {
      capabilities: {
        tools: [
          { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
          { name: 'Execute', description: 'Run commands', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
      analysis: makeMinimalIR().analysis,
      intents: [],
      delegationMap: [],
      conflicts: makeMinimalIR().conflicts,
    };

    const newDag = rebuildWithUpdatedShared(dag, oldBaseHash, newShared);
    const newBaseHash = hashFragment(newShared);

    // Old delta hashes must NOT be in the new DAG's nodes map
    expect(newDag.nodes.has(oldDeltaHash0)).toBe(false);
    expect(newDag.nodes.has(oldDeltaHash1)).toBe(false);

    // Each agent's deltaHash must match hashDeltaWithBase(deltaFragment, newBaseHash)
    for (const delta of newDag.agents.values()) {
      const deltaNode = newDag.nodes.get(delta.deltaHash);
      expect(deltaNode).toBeDefined();
      const expectedHash = hashDeltaWithBase(deltaNode!.fragment, newBaseHash);
      expect(delta.deltaHash).toBe(expectedHash);
      expect(deltaNode!.hash).toBe(expectedHash);
      expect(deltaNode!.parents).toContain(newBaseHash);
      expect(deltaNode!.parents).not.toContain(oldBaseHash);
    }

    // Resolution still works after rehash
    const resolved0 = resolveAgent(newDag, 'agent-0');
    expect(resolved0.ir.capabilities.tools).toHaveLength(2);
    expect(resolved0.ir.compiler.compiledAt).toBe('2026-01-01T00:00:00.000Z');

    const resolved1 = resolveAgent(newDag, 'agent-1');
    expect(resolved1.ir.capabilities.tools).toHaveLength(2);
    expect(resolved1.ir.compiler.compiledAt).toBe('2026-01-01T00:00:01.000Z');
  });

  it('resolveAll returns all agents IRs from the DAG', () => {
    const agents = new Map<string, GovernanceIR>();
    for (let i = 0; i < 3; i++) {
      agents.set(`agent-${i}`, makeMinimalIR({
        compiler: {
          compilerVersion: '1.0.0',
          compiledAt: `2026-01-01T00:00:0${i}.000Z`,
          schemaVersion: 1,
        },
      }));
    }

    const dag = buildDag(agents);
    const resolved = resolveAll(dag);

    expect(resolved.size).toBe(3);
    expect(resolved.has('agent-0')).toBe(true);
    expect(resolved.has('agent-1')).toBe(true);
    expect(resolved.has('agent-2')).toBe(true);

    // Each resolved IR has the correct compiler timestamp
    expect(resolved.get('agent-0')!.compiler.compiledAt).toBe('2026-01-01T00:00:00.000Z');
    expect(resolved.get('agent-1')!.compiler.compiledAt).toBe('2026-01-01T00:00:01.000Z');
    expect(resolved.get('agent-2')!.compiler.compiledAt).toBe('2026-01-01T00:00:02.000Z');
  });

  it('computeStorageMetrics reports reduction for shared fleet', () => {
    const agents = new Map<string, GovernanceIR>();
    for (let i = 0; i < 5; i++) {
      agents.set(`agent-${i}`, makeMinimalIR({
        compiler: {
          compilerVersion: '1.0.0',
          compiledAt: `2026-01-01T00:00:0${i}.000Z`,
          schemaVersion: 1,
        },
      }));
    }

    const dag = buildDag(agents);
    const metrics = computeStorageMetrics(dag, agents);

    expect(metrics.individualBytes).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeGreaterThan(0);
    expect(metrics.dagBytes).toBeLessThan(metrics.individualBytes);
    expect(metrics.reductionRatio).toBeGreaterThan(0);
    expect(metrics.reductionRatio).toBeLessThan(1);
    expect(metrics.sharedNodeCount).toBe(1); // 1 shared base referenced by all 5
    expect(metrics.deltaNodeCount).toBe(5);
    expect(metrics.totalNodeCount).toBe(6); // 1 shared + 5 deltas
  });

  it('computeStorageMetrics handles zero individualBytes (empty fleet)', () => {
    const emptyAgents = new Map<string, GovernanceIR>();
    const emptyDag: ContextDag = { nodes: new Map(), agents: new Map() };
    const metrics = computeStorageMetrics(emptyDag, emptyAgents);

    expect(metrics.individualBytes).toBe(0);
    expect(metrics.dagBytes).toBe(0);
    expect(metrics.reductionRatio).toBe(0);
    expect(metrics.sharedNodeCount).toBe(0);
    expect(metrics.deltaNodeCount).toBe(0);
    expect(metrics.totalNodeCount).toBe(0);
  });

  it('computeStorageMetrics counts single-agent base as non-shared', () => {
    // 1 agent — its base hash is referenced once, so sharedNodeCount = 0
    const agents = new Map<string, GovernanceIR>([
      ['solo', makeMinimalIR()],
    ]);
    const dag = buildDag(agents);
    const metrics = computeStorageMetrics(dag, agents);

    expect(metrics.sharedNodeCount).toBe(0); // only 1 reference, not shared
    expect(metrics.deltaNodeCount).toBe(1);
    expect(metrics.totalNodeCount).toBe(2); // 1 shared + 1 delta
  });

  it('resolveAgent throws for missing base node', () => {
    // Craft a DAG with an agent pointing to a nonexistent base hash
    const nodes = new Map<string, import('../../src/context/context-dag.js').DagNode>();
    const deltaFragment: GovernanceFragment = {
      compiler: { compilerVersion: '1.0.0', compiledAt: '2026-01-01T00:00:00.000Z', schemaVersion: 1 },
    };
    const deltaHash = hashDeltaWithBase(deltaFragment, 'fake-base');
    nodes.set(deltaHash, { hash: deltaHash, fragment: deltaFragment, parents: ['fake-base'] });

    const agents = new Map([
      ['broken-agent', { agentId: 'broken-agent', baseHash: 'fake-base', deltaHash }],
    ]);

    const dag: ContextDag = { nodes, agents };
    expect(() => resolveAgent(dag, 'broken-agent')).toThrow('Base node fake-base not found');
  });

  it('resolveAgent throws for missing delta node', () => {
    // Craft a DAG with an agent pointing to a nonexistent delta hash
    const sharedFragment: GovernanceFragment = {
      capabilities: makeMinimalIR().capabilities,
    };
    const sharedHash = hashFragment(sharedFragment);
    const nodes = new Map<string, import('../../src/context/context-dag.js').DagNode>();
    nodes.set(sharedHash, { hash: sharedHash, fragment: sharedFragment, parents: [] });

    const agents = new Map([
      ['broken-agent', { agentId: 'broken-agent', baseHash: sharedHash, deltaHash: 'fake-delta' }],
    ]);

    const dag: ContextDag = { nodes, agents };
    expect(() => resolveAgent(dag, 'broken-agent')).toThrow('Delta node fake-delta not found');
  });

  it('hashDeltaWithBase produces different hash for same fragment with different base', () => {
    const fragment: GovernanceFragment = {
      compiler: { compilerVersion: '1.0.0', compiledAt: '2026-01-01T00:00:00.000Z', schemaVersion: 1 },
    };

    const hash1 = hashDeltaWithBase(fragment, 'base-a');
    const hash2 = hashDeltaWithBase(fragment, 'base-b');

    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash2).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashFragment handles arrays and null values in sorted replacer', () => {
    // Fragment with null and array values to exercise sortedReplacer branches
    const fragment: GovernanceFragment = {
      capabilities: {
        tools: [],
        skills: [],
        agents: [],
        workflows: [],
      },
      intents: [],
      conflicts: {
        oboConflicts: [],
        multiConstraintConflicts: [],
        haltReason: null,
        hasOboWithoutElicit: false,
        totalConflicts: 0,
      },
    };

    const hash = hashFragment(fragment);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // Deterministic
    expect(hashFragment(fragment)).toBe(hash);
  });

  it('extractDeltaFragment detects analysis differences', () => {
    const ir = makeMinimalIR({
      analysis: {
        violations: [{ ruleId: 'G-CLASS-01', tool: 'Write', message: 'High risk', severity: 'error' }],
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

    const sharedWithDifferentAnalysis: GovernanceFragment = {
      capabilities: ir.capabilities,
      analysis: makeMinimalIR().analysis, // different from ir.analysis
      intents: ir.intents,
      delegationMap: ir.delegationMap,
      conflicts: ir.conflicts,
    };

    const delta = extractDeltaFragment(ir, sharedWithDifferentAnalysis);
    expect(delta.analysis).toEqual(ir.analysis);
    expect(delta.capabilities).toBeUndefined(); // same
    expect(delta.intents).toBeUndefined(); // same
    expect(delta.delegationMap).toBeUndefined(); // same
    expect(delta.conflicts).toBeUndefined(); // same
  });

  it('extractDeltaFragment returns only compiler when all fields match', () => {
    const ir = makeMinimalIR();
    const sharedFragment = extractSharedFragment(ir);

    const delta = extractDeltaFragment(ir, sharedFragment);
    // Only compiler (always per-agent); all other fields identical → omitted
    expect(delta.compiler).toEqual(ir.compiler);
    expect(delta.capabilities).toBeUndefined();
    expect(delta.analysis).toBeUndefined();
    expect(delta.intents).toBeUndefined();
    expect(delta.delegationMap).toBeUndefined();
    expect(delta.conflicts).toBeUndefined();
  });

  it('rebuildWithUpdatedShared preserves unaffected agents', () => {
    // Agent A on base1, Agent B on base2. Only base1 is updated.
    const irA = makeMinimalIR({
      compiler: { compilerVersion: '1.0.0', compiledAt: '2026-01-01T00:00:00.000Z', schemaVersion: 1 },
    });
    const irB = makeMinimalIR({
      capabilities: {
        tools: [
          { name: 'Write', description: 'Write files', riskLevel: 'high', oboFlag: false, classification: 'filesystem' },
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
      compiler: { compilerVersion: '1.0.0', compiledAt: '2026-01-01T00:00:01.000Z', schemaVersion: 1 },
    });

    const agents = new Map<string, GovernanceIR>([
      ['agent-a', irA],
      ['agent-b', irB],
    ]);
    const dag = buildDag(agents);

    const oldBaseA = dag.agents.get('agent-a')!.baseHash;
    const oldBaseB = dag.agents.get('agent-b')!.baseHash;
    const oldDeltaB = dag.agents.get('agent-b')!.deltaHash;
    expect(oldBaseA).not.toBe(oldBaseB); // different bases

    // Update only agent-a's base
    const newShared: GovernanceFragment = {
      capabilities: {
        tools: [
          { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
          { name: 'Execute', description: 'Run', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
      analysis: irA.analysis,
      intents: [],
      delegationMap: [],
      conflicts: irA.conflicts,
    };

    const newDag = rebuildWithUpdatedShared(dag, oldBaseA, newShared);

    // Agent B is completely unaffected
    const newDeltaB = newDag.agents.get('agent-b')!;
    expect(newDeltaB.baseHash).toBe(oldBaseB);
    expect(newDeltaB.deltaHash).toBe(oldDeltaB);

    // Agent A is updated
    const newDeltaA = newDag.agents.get('agent-a')!;
    expect(newDeltaA.baseHash).not.toBe(oldBaseA);
    expect(newDeltaA.baseHash).toBe(hashFragment(newShared));
  });
});
