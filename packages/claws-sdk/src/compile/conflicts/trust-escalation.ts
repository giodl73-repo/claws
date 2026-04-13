/**
 * TRUST-ESCALATION conflict detector (CLAWS-C002).
 *
 * Detects when a subagent holds R4+ tools under a parent with lower
 * trust tier. Trust tier is derived from AGENTS.md Trust field or
 * defaults to T1. A subagent's tool risk must not exceed its parent's
 * trust tier.
 *
 * @module claws-sdk/compile/conflicts/trust-escalation
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
  ToolRiskClass,
} from '../types.js';

/**
 * Build a trust tier map from delegation intents.
 *
 * Assigns the platform's defaultTrustTier to every agent referenced in
 * delegation edges. Does not yet parse "Trust: T{N}" annotations or
 * apply delegation-depth heuristics — all agents receive the same
 * default tier (configurable via PlatformTarget.primary.marker.
 * defaultTrustTier, falling back to T1).
 */
function buildTrustMap(ast: GovernanceAST, defaultTrustTier: number = 1): Map<string, number> {
  const trustMap = new Map<string, number>();

  // Default all agents to the platform's default trust tier
  for (const group of ast.delegation) {
    for (const intent of group.intents) {
      if (!trustMap.has(intent.from)) trustMap.set(intent.from, defaultTrustTier);
      if (!trustMap.has(intent.to)) trustMap.set(intent.to, defaultTrustTier);
    }
  }

  return trustMap;
}

/**
 * Get the maximum risk class of tools held by an agent.
 */
function maxToolRisk(
  agentTools: readonly string[],
  toolRiskMap: Map<string, ToolRiskClass>,
): ToolRiskClass {
  let max: ToolRiskClass = 1;
  for (const tool of agentTools) {
    const risk = toolRiskMap.get(tool.toLowerCase()) ?? toolRiskMap.get(tool);
    if (risk !== undefined && risk > max) {
      max = risk;
    }
  }
  return max;
}

/**
 * Detect TRUST-ESCALATION conflicts.
 *
 * For each delegation edge (parent -> child), check if the child holds
 * tools with risk level exceeding the parent's trust tier.
 *
 * @param defaultTrustTier - Default trust tier for agents without explicit trust
 *   (from PlatformTarget.primary.marker.defaultTrustTier). Defaults to 1 (T1).
 */
export function detectTrustEscalation(
  ast: GovernanceAST,
  manifest: ParsedManifest,
  defaultTrustTier: number = 1,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];

  // Build tool risk lookup from manifest
  const toolRiskMap = new Map<string, ToolRiskClass>();
  for (const tool of manifest.tools) {
    toolRiskMap.set(tool.normalizedName, tool.riskClass);
    toolRiskMap.set(tool.name, tool.riskClass);
  }

  // Build trust map with platform-aware default
  const trustMap = buildTrustMap(ast, defaultTrustTier);

  // Build agent line lookup
  const agentLineMap = new Map<string, number>();
  for (const agent of manifest.agents) {
    agentLineMap.set(agent.name, agent.line);
  }

  // Check each delegation edge
  for (const group of ast.delegation) {
    for (const intent of group.intents) {
      const parentTrust = trustMap.get(intent.from) ?? 1;
      // Get child agent from manifest to check their actual tools
      const childAgent = manifest.agents.find(a => a.name === intent.to);
      if (!childAgent) continue;

      const childMaxRisk = maxToolRisk(childAgent.tools, toolRiskMap);

      // If child holds R4+ tools and parent trust is lower, that's escalation
      if (childMaxRisk >= 4 && parentTrust < childMaxRisk) {
        const parentLine = agentLineMap.get(intent.from) ?? intent.line;
        const childLine = agentLineMap.get(intent.to) ?? intent.line;

        entries.push({
          category: 'TRUST-ESCALATION',
          code: 'CLAWS-C002',
          severity: 'Error',
          locationA: { file: group.source, line: parentLine },
          locationB: { file: group.source, line: childLine },
          explanation: `Agent "${intent.from}" (trust T${parentTrust}) delegates to "${intent.to}" which holds R${childMaxRisk} tools — trust escalation`,
        });
      }
    }
  }

  return entries;
}
