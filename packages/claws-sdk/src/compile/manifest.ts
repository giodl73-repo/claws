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
 * Build a CapabilityManifest from a ParsedManifest for rule evaluation.
 */
export function buildCapabilityManifest(manifest: ParsedManifest): CapabilityManifest {
  return {
    tools: manifest.tools.map((t) => ({
      name: t.name,
      description: '',
      riskLevel: riskClassToLevel(t.riskClass),
      oboFlag: t.oboFlag,
      classification: 'custom' as const,
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
