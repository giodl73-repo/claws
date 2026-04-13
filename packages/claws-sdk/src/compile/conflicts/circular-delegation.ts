/**
 * CIRCULAR-DELEGATION conflict detector (CLAWS-C005).
 *
 * Detects delegation cycles in AGENTS.md using DFS-based cycle detection.
 * Catches all cycle lengths including self-delegation (length 1).
 * Reports the full path for each detected cycle.
 *
 * Algorithm: O(V+E) where V = agents, E = delegation edges.
 *
 * @module claws-sdk/compile/conflicts/circular-delegation
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
} from '../types.js';

/**
 * Find all cycles in the delegation graph using DFS.
 *
 * Returns an array of cycles, each represented as an array of agent names
 * forming the cycle (e.g., ['A', 'B', 'C', 'A']).
 */
function findAllCycles(manifest: ParsedManifest): string[][] {
  const graph = new Map<string, string[]>();
  for (const agent of manifest.agents) {
    graph.set(agent.name, [...agent.delegatesTo]);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    if (inStack.has(node)) {
      // Found a cycle — extract the cycle from the path
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        const cycle = [...path.slice(cycleStart), node];
        cycles.push(cycle);
      }
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) ?? [];
    for (const neighbor of neighbors) {
      // Self-delegation: immediate cycle of length 1
      if (neighbor === node) {
        cycles.push([node, node]);
        continue;
      }
      dfs(neighbor);
    }

    path.pop();
    inStack.delete(node);
  }

  for (const agent of manifest.agents) {
    dfs(agent.name);
  }

  return cycles;
}

/**
 * Detect CIRCULAR-DELEGATION conflicts.
 *
 * Uses DFS to find all cycles in the delegation graph, including
 * self-delegation (degenerate cycle of length 1).
 */
export function detectCircularDelegation(
  _ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];
  const cycles = findAllCycles(manifest);

  // Build agent line lookup
  const agentLineMap = new Map<string, { line: number; source: string }>();
  for (const agent of manifest.agents) {
    agentLineMap.set(agent.name, { line: agent.line, source: agent.source });
  }

  // Deduplicate cycles by their canonical form (sorted cycle path)
  const seenCycles = new Set<string>();

  for (const cycle of cycles) {
    if (cycle.length < 2) continue;

    // Canonical form: sort the cycle members (excluding trailing repeat)
    const members = cycle.slice(0, -1);
    const canonical = [...members].sort().join('->');
    if (seenCycles.has(canonical)) continue;
    seenCycles.add(canonical);

    const firstAgent = cycle[0]!;
    const lastEdge = cycle[cycle.length - 2]!;

    const firstInfo = agentLineMap.get(firstAgent) ?? { line: 1, source: 'AGENTS.md' };
    const lastInfo = agentLineMap.get(lastEdge) ?? { line: 1, source: 'AGENTS.md' };

    const isSelfDelegation = cycle.length === 2 && cycle[0] === cycle[1];

    const explanation = isSelfDelegation
      ? `Self-delegation detected: "${firstAgent}" delegates to itself`
      : `Circular delegation detected: ${cycle.join(' -> ')}`;

    entries.push({
      category: 'CIRCULAR-DELEGATION',
      code: 'CLAWS-C005',
      severity: 'Error',
      locationA: { file: firstInfo.source, line: firstInfo.line },
      locationB: { file: lastInfo.source, line: lastInfo.line },
      explanation,
    });
  }

  return entries;
}
