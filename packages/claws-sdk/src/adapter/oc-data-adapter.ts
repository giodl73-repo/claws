/**
 * OC data adapter — translates GovernanceIR data into OC-native formats.
 *
 * Converts GovernanceIR data structures into the configuration and
 * memory formats expected by the OC Gateway runtime.
 *
 * @module claws-sdk/adapter/oc-data-adapter
 */

import type { GovernanceIR, DelegationEntry } from '../ir/governance-ir.js';
import type { MechanicalIntent, DenyIntent } from '../ir/mechanical-intent.js';
import type { RuleLevel } from '../ir/fail-mode.js';
import { riskLevelFromClassification } from '../compile/manifest.js';

/**
 * OC-native tool policy entry for openclaw.json.
 */
export interface OCToolPolicy {
  readonly name: string;
  readonly action: 'block' | 'warn' | 'allow' | 'audit';
  readonly reason: string;
  readonly ruleId: string;
}

/**
 * OC-native hook configuration for openclaw.json.
 */
export interface OCHookConfig {
  readonly event: string;
  readonly handler: string;
  readonly priority: number;
  readonly timeout: number;
}

/**
 * Risk map entry — pre-computed tool-to-risk-level mapping.
 */
export interface RiskMapEntry {
  readonly toolName: string;
  readonly riskLevel: RuleLevel;
  readonly failMode: 'open' | 'closed';
}

/**
 * Build a pre-computed risk map from a GovernanceIR.
 *
 * Maps each tool to its maximum risk level from intents that reference it.
 * Tools not in the map default to R5 (fail-closed) at runtime.
 *
 * @param ir - The GovernanceIR to extract risk data from
 * @returns Array of risk map entries
 */
export function buildRiskMap(ir: GovernanceIR): readonly RiskMapEntry[] {
  const toolRisks = new Map<string, RuleLevel>();

  for (const intent of ir.intents) {
    if (intent.kind === 'deny' || intent.kind === 'require') {
      // Deny intents carry an explicit tool target. Require intents lack
      // a target field — they express preconditions, not tool references.
      // We key by intent.id so the risk map still tracks them; at runtime
      // the gateway resolves require-intent IDs to their governing tools.
      const target = intent.kind === 'deny'
        ? (intent as DenyIntent).target
        : intent.id;
      const existing = toolRisks.get(target);
      if (existing === undefined || intent.level > existing) {
        toolRisks.set(target, intent.level);
      }
    }
  }

  // Also include tools from capability manifest with their risk levels
  for (const tool of ir.capabilities.tools) {
    const riskLevel = riskLevelFromClassification(tool.riskLevel);
    const existing = toolRisks.get(tool.name);
    if (existing === undefined || riskLevel > existing) {
      toolRisks.set(tool.name, riskLevel);
    }
  }

  return Array.from(toolRisks.entries()).map(([toolName, riskLevel]) => ({
    toolName,
    riskLevel,
    failMode: resolveFailMode(riskLevel),
  }));
}

/**
 * Convert tool policies from GovernanceIR to OC-native format.
 *
 * @param ir - The GovernanceIR to convert
 * @returns Array of OC tool policy entries
 */
export function toOCToolPolicies(ir: GovernanceIR): readonly OCToolPolicy[] {
  const policies: OCToolPolicy[] = [];

  for (const intent of ir.intents) {
    if (intent.kind === 'deny') {
      policies.push({
        name: intent.target,
        action: 'block',
        reason: intent.reason,
        ruleId: intent.ruleId,
      });
    } else if (intent.kind === 'label') {
      policies.push({
        name: intent.key,
        action: 'audit',
        reason: intent.description,
        ruleId: intent.ruleId,
      });
    }
  }

  return policies;
}

/**
 * Convert delegation map entries from GovernanceIR to OC-native format.
 *
 * @param delegationMap - GovernanceIR delegation entries
 * @returns Object map keyed by rule ID with mechanism as value
 */
export function toOCDelegationMap(
  delegationMap: readonly DelegationEntry[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of delegationMap) {
    result[entry.ruleId] = entry.mechanism;
  }
  return result;
}

/**
 * Resolve fail mode from risk level per gateway-eng policy:
 * R1-R2: open, R3-R4: configurable (defaults to closed), R5: closed.
 */
function resolveFailMode(level: RuleLevel): 'open' | 'closed' {
  if (level <= 2) return 'open';
  return 'closed';
}

export type { MechanicalIntent, GovernanceIR };
