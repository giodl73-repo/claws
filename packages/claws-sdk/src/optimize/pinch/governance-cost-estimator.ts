/**
 * Governance cost estimator — token cost estimation for governance content
 * using governance-specific heuristics.
 *
 * Distinct from the PRESS token-counter: uses governance-specific heuristics
 * (rule weight, risk level, OBO complexity) rather than attention-based ordering.
 *
 * Three heuristics determine a rule's token cost:
 * - **Rule weight** — higher-weight rules (critical policy, OBO requirements)
 *   cost more tokens because they require more context to express accurately
 * - **Risk level** — rules governing high-risk operations (R4-R5) need
 *   additional context tokens for remediation guidance and escalation paths
 * - **OBO complexity** — rules involving delegation chains require tokens
 *   proportional to chain depth and authorization scope
 *
 * @module claws-sdk/optimize/pinch/governance-cost-estimator
 */

// ── Types ──────────────────────────────────────────────────────────────

/** A governance rule descriptor for cost estimation. */
export interface GovernanceRuleDescriptor {
  /** Unique rule identifier (e.g. "G-CLASS-01"). */
  readonly id: string;
  /** Rule weight — importance factor between 0.0 and 1.0. */
  readonly weight: number;
  /** Risk level of governed operations (1-5). */
  readonly riskLevel: number;
  /** OBO delegation chain depth (0 = no OBO involvement). */
  readonly oboDelegationDepth: number;
  /** Base token count for the rule text. */
  readonly baseTokens: number;
}

/** Token cost estimate for a single governance rule. */
export interface RuleCostEstimate {
  /** Rule identifier. */
  readonly ruleId: string;
  /** Base token cost (before heuristic adjustments). */
  readonly baseTokens: number;
  /** Tokens added by rule weight heuristic. */
  readonly weightCost: number;
  /** Tokens added by risk level heuristic. */
  readonly riskCost: number;
  /** Tokens added by OBO complexity heuristic. */
  readonly oboCost: number;
  /** Total estimated token cost. */
  readonly totalTokens: number;
}

/** Aggregated cost estimate for a set of governance rules. */
export interface GovernanceCostSummary {
  /** Per-rule cost estimates. */
  readonly rules: readonly RuleCostEstimate[];
  /** Total token cost across all rules. */
  readonly totalTokens: number;
  /** Number of rules estimated. */
  readonly ruleCount: number;
}

// ── Constants ──────────────────────────────────────────────────────────

/**
 * Weight multiplier: high-weight rules (critical policy) need proportionally
 * more tokens to express with full context. The multiplier scales the base
 * tokens by weight squared to penalize high-weight rules more steeply.
 */
const WEIGHT_MULTIPLIER = 0.5;

/**
 * Risk level token surcharge table. R1-R3 have minimal overhead; R4-R5
 * need substantial additional context for remediation and escalation.
 */
const RISK_SURCHARGE: Record<number, number> = {
  1: 0,
  2: 5,
  3: 15,
  4: 40,
  5: 80,
};

/**
 * OBO complexity: tokens per delegation depth level. Each link in the
 * chain requires authorization scope, principal identity, and permission
 * boundary documentation.
 */
const OBO_TOKENS_PER_DEPTH = 25;

// ── Core Estimation ────────────────────────────────────────────────────

/**
 * Estimate the token cost for a single governance rule.
 *
 * The cost model combines three governance-specific heuristics:
 * 1. Weight cost = baseTokens * weight^2 * WEIGHT_MULTIPLIER
 * 2. Risk cost = RISK_SURCHARGE[riskLevel]
 * 3. OBO cost = oboDelegationDepth * OBO_TOKENS_PER_DEPTH
 *
 * Total = baseTokens + weightCost + riskCost + oboCost
 */
export function estimateRuleCost(rule: GovernanceRuleDescriptor): RuleCostEstimate {
  const weightCost = Math.round(rule.baseTokens * rule.weight * rule.weight * WEIGHT_MULTIPLIER);
  const clampedRisk = clampRisk(rule.riskLevel);
  const riskCost = RISK_SURCHARGE[clampedRisk] as number;
  const oboCost = rule.oboDelegationDepth * OBO_TOKENS_PER_DEPTH;
  const totalTokens = rule.baseTokens + weightCost + riskCost + oboCost;

  return {
    ruleId: rule.id,
    baseTokens: rule.baseTokens,
    weightCost,
    riskCost,
    oboCost,
    totalTokens,
  };
}

/**
 * Estimate the total governance token cost for a set of rules.
 *
 * Returns per-rule estimates and an aggregate summary.
 * Deterministic for the same input (no randomness, no Date.now()).
 */
export function estimateGovernanceCost(
  rules: readonly GovernanceRuleDescriptor[],
): GovernanceCostSummary {
  const estimates = rules.map(estimateRuleCost);
  const totalTokens = estimates.reduce((sum, e) => sum + e.totalTokens, 0);

  return {
    rules: estimates,
    totalTokens,
    ruleCount: estimates.length,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Clamp risk level to valid range 1-5. */
function clampRisk(level: number): number {
  if (level < 1) return 1;
  if (level > 5) return 5;
  return Math.round(level);
}
