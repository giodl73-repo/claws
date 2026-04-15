/**
 * Workspace trust tier to maximum risk mapping.
 *
 * Skills scaffolded within a workspace cannot exceed the workspace's
 * risk ceiling. The mapping enforces this invariant:
 *
 *   T1 = R1 (minimal trust, minimal risk)
 *   T2 = R3 (standard trust, up to moderate risk)
 *   T3 = R4 (elevated trust, up to high risk)
 *   T4 = R5 (full trust, up to critical risk)
 *
 * @module claws-sdk/scaffold/defaults
 */

/**
 * Valid trust tier values (1-4).
 */
export type TrustTier = 1 | 2 | 3 | 4;

/**
 * Valid risk levels (1-5).
 */
export type RiskLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Skill template tier names.
 */
export type SkillTemplateTier = 'declared' | 'typed' | 'verified';

/**
 * Trust tier to maximum risk mapping.
 *
 * A workspace at trust tier N can scaffold skills with risk up to this cap.
 */
const TRUST_TIER_RISK_CAP: Readonly<Record<TrustTier, RiskLevel>> = {
  1: 1,
  2: 3,
  3: 4,
  4: 5,
};

/**
 * Get the maximum risk level allowed for a given trust tier.
 *
 * @param tier - Workspace trust tier (1-4)
 * @returns Maximum risk level allowed
 * @throws Error if tier is out of range
 */
export function maxRiskForTier(tier: number): RiskLevel {
  if (tier < 1 || tier > 4 || !Number.isInteger(tier)) {
    throw new Error(`Invalid trust tier: ${tier}. Must be 1, 2, 3, or 4.`);
  }
  return TRUST_TIER_RISK_CAP[tier as TrustTier];
}

/**
 * Check whether a requested risk level is permitted under a trust tier.
 *
 * @param tier - Workspace trust tier
 * @param requestedRisk - Desired risk level for the skill
 * @returns true if the risk level is within the tier's cap
 */
export function isRiskPermitted(tier: number, requestedRisk: number): boolean {
  return requestedRisk <= maxRiskForTier(tier);
}

/**
 * Default risk level assigned per template tier.
 */
const TEMPLATE_TIER_RISK: Readonly<Record<SkillTemplateTier, RiskLevel>> = {
  declared: 1,
  typed: 2,
  verified: 3,
};

/**
 * Get the default risk level for a given skill template tier.
 */
export function defaultRiskForTemplateTier(templateTier: SkillTemplateTier): RiskLevel {
  return TEMPLATE_TIER_RISK[templateTier];
}
