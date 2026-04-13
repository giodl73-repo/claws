/**
 * Governance rules — policy enforcement, compliance checks, trust tiers.
 *
 * @module claws-sdk/governance
 */

import type { CapabilityManifest } from '../ir/capability-manifest.js';
import { createRegistry, type RuleRegistry } from './rule-registry.js';
import { createGClassRules, classifyTool, classifyManifest, normalizeCapability } from './rules/g-class.js';
import { createGPermRules } from './rules/g-perm.js';
import { createGA2ARules } from './rules/g-a2a.js';
import { createGDataRules } from './rules/g-data.js';
import { createGElicitRules } from './rules/g-elicit.js';
import { createGInputRules } from './rules/g-input.js';
import { createGContextRules } from './rules/g-context.js';
import { createGOutputRules } from './rules/g-output.js';
import { createGBoundRules } from './rules/g-bound.js';
import { createGSupplyRules } from './rules/g-supply.js';

export type { GovernanceRule, Violation, RuleResult, Severity } from './types.js';
export { createRegistry, type RuleRegistry } from './rule-registry.js';
export { createGClassRules, classifyTool, classifyManifest, normalizeCapability } from './rules/g-class.js';
export { createGPermRules } from './rules/g-perm.js';
export { createGA2ARules } from './rules/g-a2a.js';
export { createGDataRules } from './rules/g-data.js';
export { createGElicitRules } from './rules/g-elicit.js';
export { createGInputRules } from './rules/g-input.js';
export { createGContextRules } from './rules/g-context.js';
export { createGOutputRules } from './rules/g-output.js';
export { createGBoundRules } from './rules/g-bound.js';
export { createGSupplyRules } from './rules/g-supply.js';

/** Map manifest risk-level strings to numeric risk levels for G-ELICIT. */
const RISK_LEVEL_MAP: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 1,
};

/**
 * Create a rule registry pre-loaded with all 10 governance rule families.
 *
 * Derives A2A, Elicit, and Data configs from the capability manifest.
 * Parameterless families (CLASS, PERM, INPUT, CONTEXT, OUTPUT, BOUND, SUPPLY)
 * are registered unconditionally.
 */
export function createDefaultRegistry(manifest: CapabilityManifest): RuleRegistry {
  const registry = createRegistry();

  // ── Parameterless families ────────────────────────────────────────────
  for (const rule of createGClassRules()) registry.register(rule);
  for (const rule of createGPermRules()) registry.register(rule);
  for (const rule of createGInputRules()) registry.register(rule);
  for (const rule of createGContextRules()) registry.register(rule);
  for (const rule of createGOutputRules()) registry.register(rule);
  for (const rule of createGBoundRules()) registry.register(rule);
  for (const rule of createGSupplyRules()) registry.register(rule);

  // ── Config-derived families ───────────────────────────────────────────
  for (const rule of createGA2ARules({
    subagents: manifest.agents.map((a) => ({
      name: a.name,
      trustLevel: a.maxAutonomousLevel >= 3 ? 2 : a.maxAutonomousLevel >= 2 ? 1 : 0,
      tools: a.delegations.flatMap((d) => [...d.permissions]),
      dataCeiling: 'PUBLIC' as const,
    })),
    parentTrustLevel: 2,
    a2aEnabled: manifest.agents.length > 0,
  })) {
    registry.register(rule);
  }

  for (const rule of createGElicitRules({
    tools: manifest.tools.map((t) => ({
      name: t.name,
      obo: t.oboFlag,
      riskLevel: RISK_LEVEL_MAP[t.riskLevel] ?? 1,
      elicitRequired: t.riskLevel === 'critical' || t.oboFlag,
    })),
    userAuthority: [],
    timeoutMs: 30_000,
    chainLimit: 3,
  })) {
    registry.register(rule);
  }

  for (const rule of createGDataRules({
    agentCeiling: undefined,
    dataFlows: [],
  })) {
    registry.register(rule);
  }

  return registry;
}
