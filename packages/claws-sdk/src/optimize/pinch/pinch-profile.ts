/**
 * Pinch profile registry -- governance density profiles (G0-G3) for
 * PRESS-to-pinch mapping.
 *
 * Each profile specifies a token budget, fidelity targets, and rule
 * inclusion criteria that determine how aggressively governance content
 * is compressed for context windows.
 *
 * Profiles are strict supersets: G3 includes all G2 content, G2 includes
 * all G1 content, G1 includes all G0 content.
 *
 * @module claws-sdk/optimize/pinch/pinch-profile
 */

// ── Types ──────────────────────────────────────────────────────────────

/** Governance density level (0 = minimal, 3 = paranoid). */
export type GovernanceLevel = 0 | 1 | 2 | 3;

/** Named profile identifiers for governance density. */
export type PinchProfileName = 'minimal' | 'standard' | 'strict' | 'paranoid';

/** Fidelity targets for governance content preservation. */
export interface FidelityTargets {
  /** Minimum risk-level fidelity (0.0-1.0). */
  readonly riskLevel: number;
  /** Minimum rule-text fidelity (0.0-1.0). */
  readonly ruleText: number;
  /** Minimum remediation fidelity (0.0-1.0). */
  readonly remediation: number;
  /** Minimum OBO-chain fidelity (0.0-1.0). */
  readonly oboChain: number;
}

/** Rule inclusion criteria controlling which rules are included in output. */
export interface RuleInclusionCriteria {
  /** Minimum rule weight threshold for inclusion (0.0-1.0). */
  readonly minWeight: number;
  /** Include OBO declarations in output. */
  readonly includeObo: boolean;
  /** Include remediation hints in output. */
  readonly includeRemediation: boolean;
  /** Include tension annotations in output. */
  readonly includeTensions: boolean;
  /** Include audit trail references in output. */
  readonly includeAuditRefs: boolean;
  /** Include cross-agent policy links in output. */
  readonly includePolicyLinks: boolean;
  /** Include historical compliance notes in output. */
  readonly includeHistoricalNotes: boolean;
  /** Include full risk decomposition in output. */
  readonly includeRiskDecomposition: boolean;
}

/** A complete pinch profile definition. */
export interface PinchProfile {
  /** Profile name. */
  readonly name: PinchProfileName;
  /** Governance density level. */
  readonly level: GovernanceLevel;
  /** Maximum token budget for compressed governance output. */
  readonly tokenBudget: number;
  /** Fidelity targets for content preservation. */
  readonly fidelity: FidelityTargets;
  /** Rule inclusion criteria. */
  readonly inclusion: RuleInclusionCriteria;
}

// ── Profile Definitions ────────────────────────────────────────────────

/**
 * G0 (minimal): 400-token budget.
 * Bare-minimum governance surface -- risk level, OBO status, top-priority
 * rules only. Suitable for constrained agents or low-risk tasks.
 */
const G0_MINIMAL: PinchProfile = {
  name: 'minimal',
  level: 0,
  tokenBudget: 400,
  fidelity: {
    riskLevel: 1.0,
    ruleText: 0.3,
    remediation: 0.0,
    oboChain: 0.5,
  },
  inclusion: {
    minWeight: 0.8,
    includeObo: true,
    includeRemediation: false,
    includeTensions: false,
    includeAuditRefs: false,
    includePolicyLinks: false,
    includeHistoricalNotes: false,
    includeRiskDecomposition: false,
  },
};

/**
 * G1 (standard): 800-token budget.
 * Standard governance surface -- all active rules, risk summary, OBO
 * declarations, basic remediation hints.
 */
const G1_STANDARD: PinchProfile = {
  name: 'standard',
  level: 1,
  tokenBudget: 800,
  fidelity: {
    riskLevel: 1.0,
    ruleText: 0.6,
    remediation: 0.5,
    oboChain: 0.8,
  },
  inclusion: {
    minWeight: 0.4,
    includeObo: true,
    includeRemediation: true,
    includeTensions: false,
    includeAuditRefs: false,
    includePolicyLinks: false,
    includeHistoricalNotes: false,
    includeRiskDecomposition: false,
  },
};

/**
 * G2 (strict): 1,100-token budget.
 * Full governance surface -- all rules with tension annotations, complete
 * OBO chain, remediation steps, compliance references.
 */
const G2_STRICT: PinchProfile = {
  name: 'strict',
  level: 2,
  tokenBudget: 1100,
  fidelity: {
    riskLevel: 1.0,
    ruleText: 0.85,
    remediation: 0.8,
    oboChain: 1.0,
  },
  inclusion: {
    minWeight: 0.2,
    includeObo: true,
    includeRemediation: true,
    includeTensions: true,
    includeAuditRefs: false,
    includePolicyLinks: false,
    includeHistoricalNotes: false,
    includeRiskDecomposition: false,
  },
};

/**
 * G3 (paranoid): 1,600-token budget.
 * Maximum governance fidelity -- G2 content plus audit trail references,
 * cross-agent policy links, full risk decomposition, historical compliance
 * notes.
 */
const G3_PARANOID: PinchProfile = {
  name: 'paranoid',
  level: 3,
  tokenBudget: 1600,
  fidelity: {
    riskLevel: 1.0,
    ruleText: 1.0,
    remediation: 1.0,
    oboChain: 1.0,
  },
  inclusion: {
    minWeight: 0.0,
    includeObo: true,
    includeRemediation: true,
    includeTensions: true,
    includeAuditRefs: true,
    includePolicyLinks: true,
    includeHistoricalNotes: true,
    includeRiskDecomposition: true,
  },
};

// ── Registry ───────────────────────────────────────────────────────────

/** All profiles indexed by name. */
const PROFILES_BY_NAME: ReadonlyMap<PinchProfileName, PinchProfile> = new Map([
  ['minimal', G0_MINIMAL],
  ['standard', G1_STANDARD],
  ['strict', G2_STRICT],
  ['paranoid', G3_PARANOID],
]);

/** All profiles indexed by governance level. */
const PROFILES_BY_LEVEL: ReadonlyMap<GovernanceLevel, PinchProfile> = new Map([
  [0, G0_MINIMAL],
  [1, G1_STANDARD],
  [2, G2_STRICT],
  [3, G3_PARANOID],
]);

/** Ordered list of all profiles (G0 through G3). */
const ALL_PROFILES: readonly PinchProfile[] = [
  G0_MINIMAL,
  G1_STANDARD,
  G2_STRICT,
  G3_PARANOID,
];

/**
 * Resolve a pinch profile by name.
 * Returns undefined if the name is not recognized.
 */
export function getProfileByName(name: PinchProfileName): PinchProfile | undefined {
  return PROFILES_BY_NAME.get(name);
}

/**
 * Resolve a pinch profile by governance level.
 * Returns undefined if the level is not recognized.
 */
export function getProfileByLevel(level: GovernanceLevel): PinchProfile | undefined {
  return PROFILES_BY_LEVEL.get(level);
}

/**
 * Return all registered profiles in ascending governance level order.
 */
export function getAllProfiles(): readonly PinchProfile[] {
  return ALL_PROFILES;
}

/**
 * Verify that a higher-level profile is a strict superset of a lower-level
 * profile in terms of content inclusion.
 *
 * A profile H is a strict superset of profile L when:
 * - H.tokenBudget >= L.tokenBudget
 * - H.inclusion.minWeight <= L.inclusion.minWeight (lower threshold = more rules)
 * - Every boolean inclusion flag that is true in L is also true in H
 * - Every fidelity target in H >= corresponding target in L
 */
export function isStrictSuperset(higher: PinchProfile, lower: PinchProfile): boolean {
  if (higher.tokenBudget < lower.tokenBudget) return false;
  if (higher.inclusion.minWeight > lower.inclusion.minWeight) return false;

  // Every boolean inclusion flag true in lower must be true in higher
  const booleanFlags = [
    'includeObo',
    'includeRemediation',
    'includeTensions',
    'includeAuditRefs',
    'includePolicyLinks',
    'includeHistoricalNotes',
    'includeRiskDecomposition',
  ] as const;

  for (const flag of booleanFlags) {
    if (lower.inclusion[flag] && !higher.inclusion[flag]) return false;
  }

  // Every fidelity target in higher must be >= lower
  const fidelityKeys = [
    'riskLevel',
    'ruleText',
    'remediation',
    'oboChain',
  ] as const;

  for (const key of fidelityKeys) {
    if (higher.fidelity[key] < lower.fidelity[key]) return false;
  }

  return true;
}
