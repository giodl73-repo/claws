/**
 * ParsedManifest extraction — flatten GovernanceAST into queryable form.
 *
 * Produces ToolEntry, SkillEntry, AgentRosterEntry, and DataLabelEntry
 * collections from the categorized GovernanceAST. Cross-references
 * deny constraints to tool entries. Computes delegation depth.
 *
 * @module claws-sdk/compile/extract
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ToolEntry,
  SkillEntry,
  AgentRosterEntry,
  DataLabelEntry,
  SoulIntent,
  ParseDiagnostic,
} from './types.js';
import { normalizeName } from '../util/normalize.js';

/**
 * Extract tool entries from the GovernanceAST.
 *
 * Each TOOLS.md tool declaration becomes a ToolEntry with cross-referenced
 * deny constraints from SOUL.md.
 */
function extractToolEntries(ast: GovernanceAST): ToolEntry[] {
  const entries: ToolEntry[] = [];

  // Collect all deny intents that reference tools
  const toolDenyMap = new Map<string, SoulIntent[]>();
  for (const group of ast.deny) {
    for (const intent of group.intents) {
      if (intent.scope !== 'tool') continue;

      // Find tool names referenced in the deny pattern
      const pattern = intent.pattern.toLowerCase();
      for (const toolGroup of ast.tool) {
        for (const tool of toolGroup.intents) {
          const normalized = normalizeName(tool.name);
          if (pattern.includes(normalized)) {
            const existing = toolDenyMap.get(normalized) ?? [];
            existing.push(intent);
            toolDenyMap.set(normalized, existing);
          }
        }
      }
    }
  }

  // Build tool entries
  for (const group of ast.tool) {
    for (const tool of group.intents) {
      const normalized = normalizeName(tool.name);
      entries.push({
        name: tool.name,
        normalizedName: normalized,
        riskClass: tool.riskClass,
        oboFlag: tool.oboFlag,
        capabilities: tool.capabilities,
        source: group.source,
        line: tool.line,
        denyConstraints: toolDenyMap.get(normalized) ?? [],
      });
    }
  }

  return entries;
}

/**
 * Extract skill entries from the GovernanceAST.
 */
function extractSkillEntries(ast: GovernanceAST): SkillEntry[] {
  const entries: SkillEntry[] = [];

  for (const group of ast.skill) {
    for (const intent of group.intents) {
      entries.push({
        name: intent.name,
        description: intent.description,
        requiredTools: intent.requiredTools,
        source: group.source,
        line: intent.line,
      });
    }
  }

  return entries;
}

/**
 * Compute delegation depth for an agent using BFS.
 */
function computeDelegationDepth(
  agentName: string,
  delegationGraph: Map<string, string[]>,
): number {
  const visited = new Set<string>();
  let depth = 0;
  let frontier = [agentName];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const name of frontier) {
      if (visited.has(name)) continue;
      visited.add(name);
      const targets = delegationGraph.get(name) ?? [];
      for (const target of targets) {
        if (!visited.has(target)) {
          next.push(target);
        }
      }
    }
    if (next.length > 0) {
      depth++;
    }
    frontier = next;
  }

  return depth;
}

/**
 * Extract agent roster entries from the GovernanceAST.
 *
 * Builds a roster from delegation intents, computing delegation depth
 * for each agent.
 */
function extractAgentRoster(ast: GovernanceAST): AgentRosterEntry[] {
  // Build delegation graph and agent info
  const agentTools = new Map<string, Set<string>>();
  const agentDelegates = new Map<string, Set<string>>();
  const agentLines = new Map<string, number>();
  const agentSources = new Map<string, string>();

  for (const group of ast.delegation) {
    for (const intent of group.intents) {
      // From agent
      if (!agentDelegates.has(intent.from)) {
        agentDelegates.set(intent.from, new Set());
        agentTools.set(intent.from, new Set());
      }
      agentDelegates.get(intent.from)!.add(intent.to);
      if (!agentLines.has(intent.from)) {
        agentLines.set(intent.from, intent.line);
        agentSources.set(intent.from, group.source);
      }

      // To agent (with tools)
      if (!agentTools.has(intent.to)) {
        agentTools.set(intent.to, new Set());
      }
      if (!agentDelegates.has(intent.to)) {
        agentDelegates.set(intent.to, new Set());
      }
      for (const tool of intent.tools) {
        agentTools.get(intent.to)!.add(tool);
      }
      if (!agentLines.has(intent.to)) {
        agentLines.set(intent.to, intent.line);
        agentSources.set(intent.to, group.source);
      }
    }
  }

  // Build delegation graph for depth computation
  const delegationGraph = new Map<string, string[]>();
  for (const [name, delegates] of agentDelegates) {
    delegationGraph.set(name, [...delegates]);
  }

  // Build roster entries
  const entries: AgentRosterEntry[] = [];
  const allAgents = new Set([...agentTools.keys(), ...agentDelegates.keys()]);

  for (const name of allAgents) {
    // All agents in allAgents are guaranteed to be in all 4 maps because
    // both "from" and "to" paths initialize entries in every map.
    entries.push({
      name,
      tools: [...agentTools.get(name)!],
      delegatesTo: [...agentDelegates.get(name)!],
      delegationDepth: computeDelegationDepth(name, delegationGraph),
      source: agentSources.get(name)!,
      line: agentLines.get(name)!,
    });
  }

  return entries;
}

/**
 * Extract data label entries from the GovernanceAST.
 */
function extractDataLabels(ast: GovernanceAST): DataLabelEntry[] {
  const entries: DataLabelEntry[] = [];

  for (const group of ast.memory) {
    for (const intent of group.intents) {
      entries.push({
        label: intent.label,
        sensitivity: intent.sensitivity,
        retention: intent.retention,
        source: group.source,
        line: intent.line,
      });
    }
  }

  return entries;
}

/**
 * Extract a flat ParsedManifest from a GovernanceAST.
 *
 * Flattens the categorized AST into queryable collections:
 * - Tool entries with cross-referenced deny constraints
 * - Skill entries with required tools
 * - Agent roster with delegation depth
 * - Data label inventory with sensitivity classification
 */
export function extract(ast: GovernanceAST): ParsedManifest {
  const diagnostics: ParseDiagnostic[] = [];

  return {
    tools: extractToolEntries(ast),
    skills: extractSkillEntries(ast),
    agents: extractAgentRoster(ast),
    dataLabels: extractDataLabels(ast),
    diagnostics,
  };
}
