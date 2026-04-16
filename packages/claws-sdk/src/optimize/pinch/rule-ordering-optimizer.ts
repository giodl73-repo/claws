/**
 * Rule ordering optimizer — cost-based rule ordering for governance content.
 *
 * Given a set of governance rules and a token budget from a pinch profile,
 * orders rules to minimize total token cost while preserving all rules
 * (no rules are dropped).
 *
 * The optimizer exploits governance-specific redundancy patterns:
 * - Rules share policy preambles — grouping by risk level clusters shared context
 * - OBO chains have structural overlap — adjacent OBO rules share chain prefixes
 * - Risk categories cluster together — sorting within clusters reduces context switches
 *
 * This is governance-specific ordering, NOT attention-based ordering from PRESS.
 *
 * @module claws-sdk/optimize/pinch/rule-ordering-optimizer
 */

import type { GovernanceRuleDescriptor } from './governance-cost-estimator.js';
import { estimateRuleCost, estimateGovernanceCost } from './governance-cost-estimator.js';
import type { PinchProfile } from './pinch-profile.js';

// ── Types ──────────────────────────────────────────────────────────────

/** Result of the rule ordering optimization. */
export interface OrderingResult {
  /** Ordered rule IDs (the optimized sequence). */
  readonly orderedRuleIds: readonly string[];
  /** Ordered rules (full descriptors in optimized sequence). */
  readonly orderedRules: readonly GovernanceRuleDescriptor[];
  /** Estimated total tokens after ordering (with compression savings). */
  readonly estimatedTokens: number;
  /** Token budget from the profile. */
  readonly tokenBudget: number;
  /** Whether the ordered output fits within the budget. */
  readonly withinBudget: boolean;
  /** Compression savings from governance-specific clustering. */
  readonly compressionSavings: number;
}

// ── Constants ──────────────────────────────────────────────────────────

/**
 * Compression discount for adjacent rules sharing the same risk level.
 * When two consecutive rules have the same risk level, the second rule's
 * risk cost is partially shared (policy preamble overlap).
 */
const SAME_RISK_DISCOUNT = 0.3;

/**
 * Compression discount for adjacent OBO rules.
 * OBO chains share structural prefixes — consecutive OBO rules save
 * on repeated chain documentation.
 */
const OBO_ADJACENCY_DISCOUNT = 0.4;

// ── Core Optimizer ─────────────────────────────────────────────────────

/**
 * Order governance rules to minimize total token cost within a profile budget.
 *
 * The ordering strategy:
 * 1. Group rules by risk level (clusters shared policy preambles)
 * 2. Within each risk group, sort by OBO depth descending (exploits chain overlap)
 * 3. Within same OBO depth, sort by weight descending (highest-value first)
 * 4. Calculate compression savings from adjacency discounts
 *
 * All input rules are preserved — no rules are dropped.
 */
export function optimizeRuleOrdering(
  rules: readonly GovernanceRuleDescriptor[],
  profile: PinchProfile,
): OrderingResult {
  if (rules.length === 0) {
    return {
      orderedRuleIds: [],
      orderedRules: [],
      estimatedTokens: 0,
      tokenBudget: profile.tokenBudget,
      withinBudget: true,
      compressionSavings: 0,
    };
  }

  // Step 1: Sort by risk level (primary), OBO depth descending (secondary),
  // weight descending (tertiary) for deterministic ordering
  const sorted = [...rules].sort((a, b) => {
    if (a.riskLevel !== b.riskLevel) return a.riskLevel - b.riskLevel;
    if (a.oboDelegationDepth !== b.oboDelegationDepth) {
      return b.oboDelegationDepth - a.oboDelegationDepth;
    }
    return b.weight - a.weight;
  });

  // Step 2: Calculate raw cost (without compression)
  const rawSummary = estimateGovernanceCost(sorted);
  const rawTotal = rawSummary.totalTokens;

  // Step 3: Calculate compression savings from adjacency
  let compressionSavings = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const currEstimate = estimateRuleCost(curr);

    // Same risk level: discount the risk cost component
    if (curr.riskLevel === prev.riskLevel) {
      compressionSavings += Math.round(currEstimate.riskCost * SAME_RISK_DISCOUNT);
    }

    // Adjacent OBO rules: discount the OBO cost component
    if (curr.oboDelegationDepth > 0 && prev.oboDelegationDepth > 0) {
      compressionSavings += Math.round(currEstimate.oboCost * OBO_ADJACENCY_DISCOUNT);
    }
  }

  const estimatedTokens = rawTotal - compressionSavings;

  return {
    orderedRuleIds: sorted.map((r) => r.id),
    orderedRules: sorted,
    estimatedTokens,
    tokenBudget: profile.tokenBudget,
    withinBudget: estimatedTokens <= profile.tokenBudget,
    compressionSavings,
  };
}
