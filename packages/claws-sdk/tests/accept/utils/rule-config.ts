/**
 * Rule config extraction — derive governance rule factory configs from
 * the parsed manifest so rules evaluate against actual workspace content.
 *
 * Without this, rules like G-A2A and G-ELICIT receive empty configs and
 * never fire, causing scenarios that test specific rule behavior to pass
 * vacuously.
 *
 * @module claws-sdk/tests/accept/utils/rule-config
 */

import type { ParsedManifest } from '@bic/claws-sdk/compile/types.js';
import type { A2AConfig, SubagentDeclaration } from '@bic/claws-sdk/governance/rules/g-a2a.js';
import type { ElicitConfig, ElicitToolEntry } from '@bic/claws-sdk/governance/rules/g-elicit.js';

/**
 * Extract A2A config from the parsed manifest.
 *
 * Converts AgentRosterEntry[] into SubagentDeclaration[] for G-A2A rules.
 * Enables A2A if any agents exist in the manifest.
 */
export function extractA2AConfig(manifest: ParsedManifest): A2AConfig {
  const subagents: SubagentDeclaration[] = manifest.agents.map(agent => ({
    name: agent.name,
    trustLevel: 0, // Default L0 — no trust declaration
    tools: [...agent.tools],
    dataCeiling: 'PUBLIC' as const,
    sendsData: false,
  }));

  return {
    subagents,
    parentTrustLevel: 2, // Default T2 trust tier
    a2aEnabled: manifest.agents.length > 0,
  };
}

/**
 * Extract ELICIT config from the parsed manifest.
 *
 * Converts ToolEntry[] into ElicitToolEntry[] for G-ELICIT rules.
 * R5/OBO tools are marked as requiring elicitation by default (no config
 * means no approval policy, which should trigger violations).
 */
export function extractElicitConfig(manifest: ParsedManifest): ElicitConfig {
  const tools: ElicitToolEntry[] = manifest.tools.map(tool => ({
    name: tool.name,
    riskLevel: tool.riskClass,
    obo: tool.oboFlag,
    // No elicitation gate configured by default — this is the violation condition
    elicitRequired: false,
    // No timeout action configured — absence triggers G-ELICIT-TIMEOUT
    timeoutAction: undefined,
    delegationDepth: undefined,
  }));

  return {
    tools,
    userAuthority: [],
    timeoutMs: 30_000,
    chainLimit: 3,
  };
}

/**
 * Extract data flow config from the parsed manifest.
 */
export function extractDataConfig(manifest: ParsedManifest): {
  agentCeiling: string | undefined;
  dataFlows: Array<{ from: string; to: string; sensitivity: string }>;
} {
  const agentCeiling = manifest.dataLabels.length > 0
    ? manifest.dataLabels[0].sensitivity
    : undefined;

  return {
    agentCeiling,
    dataFlows: [],
  };
}
