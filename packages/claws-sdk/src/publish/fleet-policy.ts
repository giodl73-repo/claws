/**
 * Fleet policy enforcement for publish pipeline.
 *
 * Reads fleet.requireVerifiedPublish and blocks DECLARED-tier skills
 * when the policy is enabled. VERIFIED-tier skills always pass.
 *
 * Supports `fleet.allowDeclaredDryRun: true` — DECLARED-tier authors
 * get validation feedback and badge preview without publishing
 * unverified skills to the registry.
 *
 * @module claws-sdk/publish/fleet-policy
 */

/**
 * Fleet publish policy configuration.
 */
export interface FleetPublishPolicy {
  /** Whether only verified skills can be published. Default: false. */
  readonly requireVerifiedPublish: boolean;
  /** Allow DECLARED-tier dry-run for feedback. Default: true. */
  readonly allowDeclaredDryRun: boolean;
}

/**
 * Result of fleet policy evaluation.
 */
export interface FleetPolicyResult {
  /** Whether the publish is allowed. */
  readonly allowed: boolean;
  /** Whether this is a dry-run bypass for DECLARED tier. */
  readonly dryRunBypass: boolean;
  /** Human-readable explanation. */
  readonly reason: string;
  /** The policy that was evaluated. */
  readonly policy: FleetPublishPolicy;
  /** The skill tier being published. */
  readonly tier: string;
}

/**
 * Default fleet publish policy (permissive).
 */
export function defaultFleetPublishPolicy(): FleetPublishPolicy {
  return {
    requireVerifiedPublish: false,
    allowDeclaredDryRun: true,
  };
}

/**
 * Read fleet publish policy from a config object.
 *
 * Merges the provided partial policy with defaults.
 */
export function readFleetPublishPolicy(
  config: Partial<FleetPublishPolicy> | undefined,
): FleetPublishPolicy {
  const defaults = defaultFleetPublishPolicy();
  if (!config) return defaults;

  return {
    requireVerifiedPublish: config.requireVerifiedPublish ?? defaults.requireVerifiedPublish,
    allowDeclaredDryRun: config.allowDeclaredDryRun ?? defaults.allowDeclaredDryRun,
  };
}

/**
 * Evaluate fleet policy for a publish operation.
 *
 * Rules:
 * - VERIFIED-tier skills always pass regardless of policy
 * - TYPED-tier skills always pass regardless of policy
 * - DECLARED-tier skills are blocked when requireVerifiedPublish is true
 * - When blocked, DECLARED-tier dry-run is allowed if allowDeclaredDryRun is true
 *
 * @param tier - Skill tier (declared, typed, verified)
 * @param policy - Fleet publish policy
 * @param isDryRun - Whether this is a dry-run publish
 * @returns Fleet policy evaluation result
 */
export function evaluateFleetPolicy(
  tier: string,
  policy: FleetPublishPolicy,
  isDryRun: boolean,
): FleetPolicyResult {
  const normalizedTier = tier.toLowerCase();

  // VERIFIED and TYPED tiers always pass
  if (normalizedTier === 'verified' || normalizedTier === 'typed') {
    return {
      allowed: true,
      dryRunBypass: false,
      reason: `${normalizedTier}-tier skills are always allowed to publish`,
      policy,
      tier: normalizedTier,
    };
  }

  // DECLARED tier with no policy restriction
  if (!policy.requireVerifiedPublish) {
    return {
      allowed: true,
      dryRunBypass: false,
      reason: 'Fleet policy does not require verified publish — DECLARED-tier allowed',
      policy,
      tier: normalizedTier,
    };
  }

  // DECLARED tier blocked by policy — check dry-run bypass
  if (isDryRun && policy.allowDeclaredDryRun) {
    return {
      allowed: true,
      dryRunBypass: true,
      reason: 'DECLARED-tier blocked for real publish, but dry-run bypass is enabled',
      policy,
      tier: normalizedTier,
    };
  }

  return {
    allowed: false,
    dryRunBypass: false,
    reason: 'Fleet policy requires verified publish — DECLARED-tier skills are blocked',
    policy,
    tier: normalizedTier,
  };
}
