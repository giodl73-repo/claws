/**
 * DATA-LABEL-MISMATCH conflict detector (CLAWS-C004).
 *
 * Detects when MEMORY.md data labels conflict with AGENTS.md data access
 * ceilings. Traces transitive data flow through the delegation graph
 * per P-059 and CFC-S04-F01.
 *
 * Sensitivity ordering: public < internal < confidential < restricted.
 *
 * @module claws-sdk/compile/conflicts/data-label-mismatch
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
  ConflictLevel,
  DataSensitivity,
} from '../types.js';

/**
 * Sensitivity level numeric ordering.
 * Higher = more sensitive.
 */
const SENSITIVITY_LEVEL: Record<DataSensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

/**
 * Parse data ceiling for an agent from GovernanceAST memory intents.
 *
 * Determines the maximum sensitivity level across all MEMORY.md data labels.
 * This represents the workspace-wide data ceiling — individual agent ceilings
 * would require first-class DelegationIntent/AgentRosterEntry fields.
 *
 * Returns undefined only when no memory intents exist in the AST.
 */
function parseDataCeiling(agentName: string, ast: GovernanceAST): DataSensitivity | undefined {
  // Derive the workspace data ceiling from memory intents
  let maxLevel = -1;
  let maxSensitivity: DataSensitivity | undefined;

  for (const group of ast.memory) {
    for (const intent of group.intents) {
      const level = SENSITIVITY_LEVEL[intent.sensitivity];
      if (level > maxLevel) {
        maxLevel = level;
        maxSensitivity = intent.sensitivity;
      }
    }
  }

  return maxSensitivity;
}

/**
 * Build transitive reachability set for each agent in the delegation graph.
 *
 * Returns a map of agent name -> set of all agents reachable via delegation.
 */
function buildReachability(manifest: ParsedManifest): Map<string, Set<string>> {
  const graph = new Map<string, string[]>();
  for (const agent of manifest.agents) {
    graph.set(agent.name, [...agent.delegatesTo]);
  }

  const reachable = new Map<string, Set<string>>();

  for (const agent of manifest.agents) {
    const visited = new Set<string>();
    const queue = [...(graph.get(agent.name) ?? [])];

    while (queue.length > 0) {
      const next = queue.shift()!;
      if (visited.has(next)) continue;
      visited.add(next);
      const targets = graph.get(next) ?? [];
      for (const t of targets) {
        if (!visited.has(t)) queue.push(t);
      }
    }

    reachable.set(agent.name, visited);
  }

  return reachable;
}

/**
 * Detect DATA-LABEL-MISMATCH conflicts.
 *
 * For each data label in MEMORY.md, check if any agent with a lower
 * data ceiling can access it (directly or transitively through delegation).
 *
 * Since data ceilings are not yet first-class on AgentRosterEntry, we
 * detect mismatches when confidential/restricted data exists and agents
 * have transitive delegation chains that could expose it.
 */
export function detectDataLabelMismatch(
  ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];

  if (manifest.dataLabels.length === 0 || manifest.agents.length === 0) {
    return entries;
  }

  // Find sensitive data labels (confidential or restricted)
  const sensitiveLabels = manifest.dataLabels.filter(
    dl => SENSITIVITY_LEVEL[dl.sensitivity] >= SENSITIVITY_LEVEL.confidential,
  );

  if (sensitiveLabels.length === 0) return entries;

  // Build reachability graph
  const reachability = buildReachability(manifest);

  // For each agent, check if it participates in a delegation chain
  // that could expose sensitive data to lower-trust agents
  for (const agent of manifest.agents) {
    const reachableAgents = reachability.get(agent.name) ?? new Set();

    // If this agent delegates to others, the sensitive data is
    // potentially exposed to the delegation chain
    if (reachableAgents.size > 0) {
      for (const label of sensitiveLabels) {
        // Any agent in the delegation chain is a potential leak point
        for (const reachableName of reachableAgents) {
          const reachableAgent = manifest.agents.find(a => a.name === reachableName);
          if (!reachableAgent) continue;

          // Delegation chains with Read tools can access memory data
          if (reachableAgent.tools.some(t => t.toLowerCase() === 'read' || t.toLowerCase() === 'bash')) {
            const ceiling = parseDataCeiling(reachableAgent.name, ast);
            // If no ceiling can be determined, downgrade to Warning with diagnostic note
            const severity: ConflictLevel = ceiling === undefined ? 'Warning' : 'Error';
            const note = ceiling === undefined
              ? ' — data ceiling unknown — manual review recommended'
              : '';

            entries.push({
              category: 'DATA-LABEL-MISMATCH',
              code: 'CLAWS-C004',
              severity,
              locationA: { file: label.source, line: label.line },
              locationB: { file: reachableAgent.source, line: reachableAgent.line },
              explanation: `${label.sensitivity} data "${label.label}" accessible via delegation chain to agent "${reachableAgent.name}" — data sensitivity may exceed agent's access ceiling${note}`,
            });
          }
        }
      }
    }
  }

  // Deduplicate by unique (label.line, agent.line) pairs
  const seen = new Set<string>();
  return entries.filter(e => {
    const key = `${e.locationA.line}:${e.locationB.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
