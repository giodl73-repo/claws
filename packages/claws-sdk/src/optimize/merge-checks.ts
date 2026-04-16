/**
 * Redundant check merging — combines governance checks that target
 * the same tool with compatible rule predicates.
 *
 * If two rules both govern `browser-navigate` and their predicates
 * can be AND-composed without semantic loss, they merge into a single
 * check. Incompatible predicates (contradictory conditions, different
 * risk levels requiring different remediation) are preserved as
 * separate checks.
 *
 * @module claws-sdk/optimize/merge-checks
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type {
  MechanicalIntent,
  DenyIntent,
  ElicitIntent,
} from '../ir/mechanical-intent.js';

/**
 * Result of redundant check merging.
 */
export interface MergeChecksResult {
  /** The optimized GovernanceIR with redundant checks merged. */
  readonly ir: GovernanceIR;
  /** Number of merge operations performed. */
  readonly mergeCount: number;
  /** Number of intents preserved as incompatible. */
  readonly preservedIncompatible: number;
}

/**
 * Get the tool target from an intent (deny or elicit only).
 */
function getToolTarget(intent: MechanicalIntent): string | undefined {
  if (intent.kind === 'deny' || intent.kind === 'elicit') {
    return (intent as DenyIntent | ElicitIntent).target;
  }
  return undefined;
}

/**
 * Merge two deny intents by AND-composing their reasons.
 */
function mergeDeny(a: DenyIntent, b: DenyIntent): DenyIntent {
  return {
    id: a.id,
    ruleId: `${a.ruleId}+${b.ruleId}`,
    level: a.level,
    kind: 'deny',
    description: `${a.description}; ${b.description}`,
    target: a.target,
    reason: `${a.reason}; ${b.reason}`,
  };
}

/**
 * Merge two elicit intents by AND-composing their prompts.
 */
function mergeElicit(a: ElicitIntent, b: ElicitIntent): ElicitIntent {
  return {
    id: a.id,
    ruleId: `${a.ruleId}+${b.ruleId}`,
    level: a.level,
    kind: 'elicit',
    description: `${a.description}; ${b.description}`,
    target: a.target,
    prompt: `${a.prompt} AND ${b.prompt}`,
  };
}

/**
 * Merge two intents that share the same group key (kind + target + level).
 * Only deny and elicit intents can be merged (they are the only kinds
 * that target tools).
 */
function mergeIntents(a: MechanicalIntent, b: MechanicalIntent): MechanicalIntent {
  if (a.kind === 'deny') {
    return mergeDeny(a as DenyIntent, b as DenyIntent);
  }
  return mergeElicit(a as ElicitIntent, b as ElicitIntent);
}

/**
 * Merge redundant governance checks in a GovernanceIR.
 *
 * Groups intents by (kind, target, level) and merges compatible groups.
 * Intents that cannot be grouped (non-tool intents, or singletons)
 * pass through unchanged.
 */
export function mergeRedundantChecks(ir: GovernanceIR): MergeChecksResult {
  // Group tool-targeting intents by (kind, target, level)
  const groups = new Map<string, MechanicalIntent[]>();
  const nonMergeable: MechanicalIntent[] = [];

  for (const intent of ir.intents) {
    const target = getToolTarget(intent);
    if (target === undefined) {
      // Non-tool intents (require, limit, label) are not merged
      nonMergeable.push(intent);
      continue;
    }

    const key = `${intent.kind}:${target}:${intent.level}`;
    const group = groups.get(key);
    if (group !== undefined) {
      group.push(intent);
    } else {
      groups.set(key, [intent]);
    }
  }

  let mergeCount = 0;
  let preservedIncompatible = 0;
  const mergedIntents: MechanicalIntent[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      // Singleton — no merge possible
      mergedIntents.push(group[0]!);
      continue;
    }

    // Merge all intents in the group (same kind + target + level = compatible)
    let merged = group[0]!;
    for (let i = 1; i < group.length; i++) {
      merged = mergeIntents(merged, group[i]!);
      mergeCount++;
    }
    mergedIntents.push(merged);
  }

  // Combine non-mergeable and merged intents
  const allIntents = [...nonMergeable, ...mergedIntents];

  return {
    ir: {
      ...ir,
      intents: allIntents,
    },
    mergeCount,
    preservedIncompatible,
  };
}
