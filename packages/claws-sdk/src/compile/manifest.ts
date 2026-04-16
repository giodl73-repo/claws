/**
 * Manifest conversion — transforms a ParsedManifest into a CapabilityManifest
 * for governance rule evaluation.
 *
 * @module claws-sdk/compile/manifest
 */

import type { ParsedManifest } from './types.js';
import type { CapabilityManifest } from '../ir/capability-manifest.js';
import type { RuleLevel } from '../ir/fail-mode.js';

/**
 * Map a numeric R1-R5 risk class to a named risk level.
 */
export function riskClassToLevel(riskClass: number): 'critical' | 'high' | 'medium' | 'low' {
  if (riskClass >= 5) return 'critical';
  if (riskClass >= 4) return 'high';
  if (riskClass >= 3) return 'medium';
  return 'low';
}

/**
 * Map a risk classification string to a numeric risk level.
 *
 * R1=info, R2=low, R3=medium, R4=high, R5=critical.
 */
export function riskLevelFromClassification(
  risk: 'critical' | 'high' | 'medium' | 'low',
): RuleLevel {
  switch (risk) {
    case 'critical':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
  }
}

/**
 * MCP server configuration entry from workspace mcp.servers config.
 * Used during parse phase to populate ToolCapability.mcpServer.
 */
export interface McpServerConfig {
  /** Server name (key in mcp.servers map). */
  readonly name: string;
  /** Tools exposed by this server. */
  readonly tools: readonly string[];
}

/**
 * Build a CapabilityManifest from a ParsedManifest for rule evaluation.
 *
 * @param manifest - The parsed manifest from extraction
 * @param mcpServers - Optional MCP server config for tool→server mapping (CM5)
 */
export function buildCapabilityManifest(
  manifest: ParsedManifest,
  mcpServers?: readonly McpServerConfig[],
): CapabilityManifest {
  // Build tool→server lookup from mcp.servers config
  const toolServerMap = new Map<string, string>();
  if (mcpServers) {
    for (const server of mcpServers) {
      for (const tool of server.tools) {
        toolServerMap.set(tool, server.name);
      }
    }
  }

  return {
    tools: manifest.tools.map((t) => ({
      name: t.name,
      description: '',
      riskLevel: riskClassToLevel(t.riskClass),
      oboFlag: t.oboFlag,
      classification: 'custom' as const,
      ...(toolServerMap.has(t.name) ? { mcpServer: toolServerMap.get(t.name)! } : {}),
    })),
    skills: manifest.skills.map((s) => ({
      name: s.name,
      description: s.description,
      requiredTools: s.requiredTools,
      governanceLevel: 1 as const,
    })),
    agents: manifest.agents.map((a) => ({
      name: a.name,
      description: '',
      delegations: a.delegatesTo.map((to) => ({
        from: a.name,
        to,
        permissions: [],
      })),
      maxAutonomousLevel: 3 as const,
    })),
    workflows: [],
  };
}
