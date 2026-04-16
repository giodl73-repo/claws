/**
 * Content-addressed DAG for structural sharing across multi-agent fleets.
 *
 * Each governance subgraph node is identified by its SHA-256 content hash.
 * Identical policy fragments across different agents resolve to the same
 * DAG node. Per-agent customizations are stored as delta nodes referencing
 * a shared base.
 *
 * Resolution walks from an agent's delta node through shared parents to
 * reconstruct the complete GovernanceIR. The resolved output is byte-
 * identical to what individual compilation would produce.
 *
 * @module claws-sdk/context/context-dag
 */

import { createHash } from 'node:crypto';
import type { GovernanceIR } from '../ir/governance-ir.js';
import { serialize } from '../ir/governance-ir.js';
import { stripBOM, normalizeLF } from '../util/text.js';

// ── Types ──────────────────────────────────────────────────────────────

/** A content-addressed node in the governance DAG. */
export interface DagNode {
  /** SHA-256 content hash — the node's identity. */
  readonly hash: string;
  /** The governance subgraph fragment stored in this node. */
  readonly fragment: GovernanceFragment;
  /** Hashes of parent nodes this node depends on. */
  readonly parents: readonly string[];
}

/**
 * A governance fragment — a subset of GovernanceIR fields that can be
 * shared across agents or represent per-agent deltas.
 */
export interface GovernanceFragment {
  /** Subset of capabilities (tools, skills, agents). */
  readonly capabilities?: GovernanceIR['capabilities'];
  /** Subset of governance analysis. */
  readonly analysis?: GovernanceIR['analysis'];
  /** Subset of mechanical intents. */
  readonly intents?: GovernanceIR['intents'];
  /** Subset of delegation map entries. */
  readonly delegationMap?: GovernanceIR['delegationMap'];
  /** Subset of conflict report. */
  readonly conflicts?: GovernanceIR['conflicts'];
  /** Compiler metadata — always from the resolving agent. */
  readonly compiler?: GovernanceIR['compiler'];
}

/** Per-agent delta: references a shared base node plus agent-specific overrides. */
export interface AgentDelta {
  /** Agent identifier. */
  readonly agentId: string;
  /** Hash of the shared base node. */
  readonly baseHash: string;
  /** Hash of the delta node containing agent-specific overrides. */
  readonly deltaHash: string;
}

/** The full DAG for a fleet of agents. */
export interface ContextDag {
  /** All nodes in the DAG, keyed by content hash. */
  readonly nodes: ReadonlyMap<string, DagNode>;
  /** Per-agent deltas mapping agents to their base + delta nodes. */
  readonly agents: ReadonlyMap<string, AgentDelta>;
}

/** Storage metrics for a fleet DAG. */
export interface DagStorageMetrics {
  /** Total bytes if each agent stored its full GovernanceIR individually. */
  readonly individualBytes: number;
  /** Total bytes stored in the DAG (shared nodes counted once). */
  readonly dagBytes: number;
  /** Storage reduction ratio (0.0-1.0). */
  readonly reductionRatio: number;
  /** Number of shared nodes (referenced by multiple agents). */
  readonly sharedNodeCount: number;
  /** Number of unique delta nodes (per-agent only). */
  readonly deltaNodeCount: number;
  /** Total node count in the DAG. */
  readonly totalNodeCount: number;
}

/** Result of resolving a single agent's GovernanceIR from the DAG. */
export interface ResolvedAgent {
  readonly agentId: string;
  readonly ir: GovernanceIR;
}

// ── Hashing ────────────────────────────────────────────────────────────

/** Sorted-key JSON replacer for deterministic serialization. */
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

/**
 * Compute the SHA-256 content hash of a governance fragment.
 * Uses deterministic JSON serialization with sorted keys,
 * BOM-stripping, and LF-normalization.
 */
export function hashFragment(fragment: GovernanceFragment): string {
  const json = JSON.stringify(fragment, sortedReplacer, 2);
  const normalized = normalizeLF(stripBOM(json));
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Compute a SHA-256 hash for a delta fragment bound to a specific base.
 * Incorporates the base hash so identical delta content with different
 * base nodes produces distinct hashes (ensuring correct parent tracking).
 */
export function hashDeltaWithBase(fragment: GovernanceFragment, baseHash: string): string {
  const json = JSON.stringify(fragment, sortedReplacer, 2);
  const normalized = normalizeLF(stripBOM(json));
  const combined = `${baseHash}:${normalized}`;
  return createHash('sha256').update(combined, 'utf8').digest('hex');
}

// ── Fragment extraction ────────────────────────────────────────────────

/**
 * Extract the shared governance fragment from a GovernanceIR.
 * This is everything except the compiler metadata (which is per-agent).
 */
export function extractSharedFragment(ir: GovernanceIR): GovernanceFragment {
  return {
    capabilities: ir.capabilities,
    analysis: ir.analysis,
    intents: ir.intents,
    delegationMap: ir.delegationMap,
    conflicts: ir.conflicts,
  };
}

/**
 * Extract the per-agent delta fragment from a GovernanceIR.
 * Contains compiler metadata and any fields that differ from the shared base.
 */
export function extractDeltaFragment(
  ir: GovernanceIR,
  sharedFragment: GovernanceFragment,
): GovernanceFragment {
  const delta: Record<string, unknown> = {};

  // Compiler metadata is always per-agent
  delta.compiler = ir.compiler;

  // Include any field that differs from the shared base
  if (ir.capabilities !== sharedFragment.capabilities &&
      JSON.stringify(ir.capabilities, sortedReplacer) !== JSON.stringify(sharedFragment.capabilities, sortedReplacer)) {
    delta.capabilities = ir.capabilities;
  }
  if (ir.analysis !== sharedFragment.analysis &&
      JSON.stringify(ir.analysis, sortedReplacer) !== JSON.stringify(sharedFragment.analysis, sortedReplacer)) {
    delta.analysis = ir.analysis;
  }
  if (ir.intents !== sharedFragment.intents &&
      JSON.stringify(ir.intents, sortedReplacer) !== JSON.stringify(sharedFragment.intents, sortedReplacer)) {
    delta.intents = ir.intents;
  }
  if (ir.delegationMap !== sharedFragment.delegationMap &&
      JSON.stringify(ir.delegationMap, sortedReplacer) !== JSON.stringify(sharedFragment.delegationMap, sortedReplacer)) {
    delta.delegationMap = ir.delegationMap;
  }
  if (ir.conflicts !== sharedFragment.conflicts &&
      JSON.stringify(ir.conflicts, sortedReplacer) !== JSON.stringify(sharedFragment.conflicts, sortedReplacer)) {
    delta.conflicts = ir.conflicts;
  }

  return delta as GovernanceFragment;
}

// ── DAG construction ───────────────────────────────────────────────────

/**
 * Build a content-addressed DAG from a fleet of per-agent GovernanceIRs.
 *
 * Agents with identical shared governance subgraphs are deduplicated: their
 * shared fragment is stored once, and each agent gets a lightweight delta
 * node referencing the shared base.
 */
export function buildDag(
  agents: ReadonlyMap<string, GovernanceIR>,
): ContextDag {
  const nodes = new Map<string, DagNode>();
  const agentDeltas = new Map<string, AgentDelta>();

  // Step 1: Extract shared fragments and group agents by shared content hash
  const sharedFragments = new Map<string, GovernanceFragment>();

  for (const [agentId, ir] of agents) {
    const shared = extractSharedFragment(ir);
    const sharedHash = hashFragment(shared);

    // Store shared node (deduplication happens naturally via map key)
    if (!nodes.has(sharedHash)) {
      sharedFragments.set(sharedHash, shared);
      nodes.set(sharedHash, {
        hash: sharedHash,
        fragment: shared,
        parents: [],
      });
    }

    // Step 2: Build per-agent delta
    // Delta hash incorporates the base hash so identical delta content with
    // different bases produces distinct nodes (correct parent tracking).
    const delta = extractDeltaFragment(ir, sharedFragments.get(sharedHash)!);
    const deltaHash = hashDeltaWithBase(delta, sharedHash);

    if (!nodes.has(deltaHash)) {
      nodes.set(deltaHash, {
        hash: deltaHash,
        fragment: delta,
        parents: [sharedHash],
      });
    }

    agentDeltas.set(agentId, {
      agentId,
      baseHash: sharedHash,
      deltaHash,
    });
  }

  return { nodes, agents: agentDeltas };
}

// ── DAG resolution ─────────────────────────────────────────────────────

/**
 * Resolve a single agent's GovernanceIR from the DAG.
 *
 * Walks from the agent's delta node through its shared base parent
 * to reconstruct the complete GovernanceIR. The resolved output is
 * byte-identical to what individual compilation would produce.
 */
export function resolveAgent(
  dag: ContextDag,
  agentId: string,
): ResolvedAgent {
  const agentDelta = dag.agents.get(agentId);
  if (!agentDelta) {
    throw new Error(`Agent "${agentId}" not found in DAG`);
  }

  const baseNode = dag.nodes.get(agentDelta.baseHash);
  const deltaNode = dag.nodes.get(agentDelta.deltaHash);

  if (!baseNode) throw new Error(`Base node ${agentDelta.baseHash} not found`);
  if (!deltaNode) throw new Error(`Delta node ${agentDelta.deltaHash} not found`);

  // Merge: delta overrides base, base provides defaults
  const base = baseNode.fragment;
  const delta = deltaNode.fragment;

  const ir: GovernanceIR = {
    capabilities: delta.capabilities ?? base.capabilities!,
    analysis: delta.analysis ?? base.analysis!,
    intents: delta.intents ?? base.intents!,
    delegationMap: delta.delegationMap ?? base.delegationMap!,
    conflicts: delta.conflicts ?? base.conflicts!,
    compiler: delta.compiler!,
  };

  return { agentId, ir };
}

/**
 * Resolve all agents in the DAG to their individual GovernanceIRs.
 */
export function resolveAll(dag: ContextDag): ReadonlyMap<string, GovernanceIR> {
  const results = new Map<string, GovernanceIR>();
  for (const agentId of dag.agents.keys()) {
    const resolved = resolveAgent(dag, agentId);
    results.set(resolved.agentId, resolved.ir);
  }
  return results;
}

// ── Storage metrics ────────────────────────────────────────────────────

/**
 * Compute storage metrics for the DAG vs. individual per-agent storage.
 */
export function computeStorageMetrics(
  dag: ContextDag,
  originalIRs: ReadonlyMap<string, GovernanceIR>,
): DagStorageMetrics {
  // Individual storage: sum of serialized bytes per agent
  let individualBytes = 0;
  for (const ir of originalIRs.values()) {
    individualBytes += Buffer.byteLength(serialize(ir), 'utf8');
  }

  // DAG storage: sum of all unique node serialized bytes
  let dagBytes = 0;
  for (const node of dag.nodes.values()) {
    dagBytes += Buffer.byteLength(
      JSON.stringify(node.fragment, sortedReplacer, 2),
      'utf8',
    );
  }

  // Count shared vs delta nodes
  const referenceCounts = new Map<string, number>();
  for (const agent of dag.agents.values()) {
    referenceCounts.set(
      agent.baseHash,
      (referenceCounts.get(agent.baseHash) ?? 0) + 1,
    );
  }
  const sharedNodeCount = [...referenceCounts.values()].filter(c => c > 1).length;
  const deltaNodeCount = dag.agents.size;
  const totalNodeCount = dag.nodes.size;

  const reductionRatio = individualBytes > 0
    ? 1 - (dagBytes / individualBytes)
    : 0;

  return {
    individualBytes,
    dagBytes,
    reductionRatio,
    sharedNodeCount,
    deltaNodeCount,
    totalNodeCount,
  };
}

// ── DAG invalidation ───────────────────────────────────────────────────

/**
 * Invalidate DAG nodes affected by a shared policy change.
 *
 * When a shared policy node changes (new hash), all agents referencing
 * the old hash must be invalidated. Returns the set of affected agent IDs.
 */
export function invalidateNode(
  dag: ContextDag,
  oldHash: string,
): ReadonlySet<string> {
  const affectedAgents = new Set<string>();

  // Find agents whose base references the old hash
  for (const [agentId, delta] of dag.agents) {
    if (delta.baseHash === oldHash) {
      affectedAgents.add(agentId);
    }
  }

  // Also check delta nodes that parent the old hash
  for (const [agentId, delta] of dag.agents) {
    const deltaNode = dag.nodes.get(delta.deltaHash);
    if (deltaNode && deltaNode.parents.includes(oldHash)) {
      affectedAgents.add(agentId);
    }
  }

  return affectedAgents;
}

/**
 * Rebuild the DAG with an updated shared fragment replacing an old one.
 *
 * Returns a new DAG with the updated shared node and all affected agents
 * re-pointed to the new hash.
 */
export function rebuildWithUpdatedShared(
  dag: ContextDag,
  oldHash: string,
  newSharedFragment: GovernanceFragment,
): ContextDag {
  const newHash = hashFragment(newSharedFragment);
  const newNodes = new Map<string, DagNode>();
  const newAgents = new Map<string, AgentDelta>();

  // Track old delta hash → new delta hash for agent reference updates
  const deltaRehashMap = new Map<string, string>();

  // Copy all nodes except the old shared one
  for (const [hash, node] of dag.nodes) {
    if (hash === oldHash) continue;
    // Rehash delta nodes that referenced the old base hash
    if (node.parents.includes(oldHash)) {
      const newDeltaHash = hashDeltaWithBase(node.fragment, newHash);
      deltaRehashMap.set(hash, newDeltaHash);
      newNodes.set(newDeltaHash, {
        hash: newDeltaHash,
        fragment: node.fragment,
        parents: node.parents.map(p => p === oldHash ? newHash : p),
      });
    } else {
      newNodes.set(hash, node);
    }
  }

  // Add the new shared node
  newNodes.set(newHash, {
    hash: newHash,
    fragment: newSharedFragment,
    parents: [],
  });

  // Update agent references (both base hash and delta hash)
  for (const [agentId, delta] of dag.agents) {
    if (delta.baseHash === oldHash) {
      newAgents.set(agentId, {
        agentId,
        baseHash: newHash,
        deltaHash: deltaRehashMap.get(delta.deltaHash) ?? delta.deltaHash,
      });
    } else {
      newAgents.set(agentId, delta);
    }
  }

  return { nodes: newNodes, agents: newAgents };
}
