/**
 * Enterprise badge policy enforcement — minimum tier per data sensitivity,
 * fleet policy per-risk minimums, closest-value enum suggestions,
 * and YAML None/null disambiguation.
 *
 * Enterprise tier rules:
 * - CONFIDENTIAL data sensitivity requires TYPED or higher governance tier.
 * - RESTRICTED data sensitivity requires TYPED or higher governance tier.
 * - Fleet policy can set per-risk tier minimums (e.g., "all R4+ must be VERIFIED").
 *
 * Closest-value enum suggestions use Levenshtein distance to suggest
 * the nearest valid value when an invalid governance enum is provided.
 *
 * YAML None/null disambiguation: YAML parsers interpret bare `None` as `null`.
 * Governance fields must distinguish Python-style `None` from YAML `null`.
 *
 * @module claws-sdk/maker/badge-policy
 */

import type { GovernanceTier, RiskLevel } from './types.js';
import { TIER_ORDER, tierMeetsMinimum } from './types.js';
import { levenshtein } from '../util/levenshtein.js';

// ── Data Sensitivity ───────────────────────────────────────────────

/**
 * Data sensitivity levels for enterprise policy.
 */
export type DataSensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

/**
 * All valid data sensitivity values.
 */
export const DATA_SENSITIVITY_VALUES: readonly DataSensitivity[] = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
] as const;

/**
 * All valid governance tier values (for enum suggestion).
 */
export const GOVERNANCE_TIER_VALUES: readonly GovernanceTier[] = [
  'DECLARED',
  'TYPED',
  'VERIFIED',
] as const;

// Re-export tierMeetsMinimum from canonical location for backwards compatibility.
export { TIER_ORDER, tierMeetsMinimum } from './types.js';

// ── Enterprise Policy Types ────────────────────────────────────────

/**
 * A single per-risk tier minimum in a fleet policy.
 */
export interface RiskTierMinimum {
  /** Minimum risk level this rule applies to (skills at or above this risk). */
  readonly minRisk: RiskLevel;
  /** Minimum governance tier required for skills at or above minRisk. */
  readonly minimumTier: GovernanceTier;
}

/**
 * Fleet-level enterprise policy configuration.
 */
export interface EnterpriseFleetPolicy {
  /** Per-risk tier minimums (e.g., R4+ must be VERIFIED). */
  readonly riskTierMinimums: readonly RiskTierMinimum[];
  /** Whether signing is required fleet-wide. */
  readonly requireSigning: boolean;
}

/**
 * A policy violation found during enterprise policy evaluation.
 */
export interface PolicyViolation {
  /** Machine-readable violation code. */
  readonly code: string;
  /** Human-readable description. */
  readonly message: string;
  /** Severity of the violation. */
  readonly severity: 'warning' | 'error';
  /** Suggested remediation. */
  readonly suggestion: string;
}

/**
 * Input for enterprise policy evaluation.
 */
export interface EnterprisePolicyInput {
  /** Governance tier of the skill. */
  readonly tier: GovernanceTier;
  /** Risk level of the skill. */
  readonly risk: RiskLevel;
  /** Data classification labels. */
  readonly dataLabels: readonly string[];
  /** Fleet policy (optional). */
  readonly fleetPolicy?: EnterpriseFleetPolicy | undefined;
}

/**
 * Result of enterprise policy evaluation.
 */
export interface EnterprisePolicyResult {
  /** Whether the skill passes all enterprise policy checks. */
  readonly passed: boolean;
  /** All policy violations found. */
  readonly violations: readonly PolicyViolation[];
  /** Effective minimum tier required by policy. */
  readonly effectiveMinimumTier: GovernanceTier;
}

// ── Data Sensitivity Evaluation ────────────────────────────────────

/**
 * Determine the data sensitivity from data classification labels.
 * Returns the highest sensitivity found in the labels.
 */
export function resolveDataSensitivity(dataLabels: readonly string[]): DataSensitivity {
  const upper = dataLabels.map(l => l.toUpperCase());
  if (upper.includes('RESTRICTED')) return 'RESTRICTED';
  if (upper.includes('CONFIDENTIAL')) return 'CONFIDENTIAL';
  if (upper.includes('INTERNAL')) return 'INTERNAL';
  return 'PUBLIC';
}

/**
 * Get the minimum governance tier required for a data sensitivity level.
 *
 * - PUBLIC / INTERNAL → DECLARED (no minimum enforcement)
 * - CONFIDENTIAL → TYPED (self-reported is insufficient)
 * - RESTRICTED → TYPED (must have verified governance decorators)
 */
export function minimumTierForSensitivity(sensitivity: DataSensitivity): GovernanceTier {
  switch (sensitivity) {
    case 'RESTRICTED':
    case 'CONFIDENTIAL':
      return 'TYPED';
    case 'INTERNAL':
    case 'PUBLIC':
      return 'DECLARED';
  }
}

// ── Enterprise Policy Evaluation ───────────────────────────────────

/**
 * Evaluate enterprise policy against a skill's governance metadata.
 *
 * Checks data sensitivity requirements, then fleet policy per-risk
 * tier minimums. Collects all violations (collect-all-errors pattern).
 */
export function evaluateEnterprisePolicy(input: EnterprisePolicyInput): EnterprisePolicyResult {
  const violations: PolicyViolation[] = [];
  let effectiveMinimumTier: GovernanceTier = 'DECLARED';

  // ── Data sensitivity checks ──────────────────────────────────────
  const sensitivity = resolveDataSensitivity(input.dataLabels);
  const sensitivityMinTier = minimumTierForSensitivity(sensitivity);

  if (TIER_ORDER[sensitivityMinTier] > TIER_ORDER[effectiveMinimumTier]) {
    effectiveMinimumTier = sensitivityMinTier;
  }

  if (sensitivity === 'CONFIDENTIAL' && !tierMeetsMinimum(input.tier, 'TYPED')) {
    violations.push({
      code: 'ENT-POLICY-001',
      message: `CONFIDENTIAL data sensitivity requires TYPED or higher governance tier, but skill is ${input.tier}`,
      severity: 'error',
      suggestion: `Upgrade governance tier from ${input.tier} to TYPED or VERIFIED`,
    });
  }

  if (sensitivity === 'RESTRICTED' && !tierMeetsMinimum(input.tier, 'TYPED')) {
    violations.push({
      code: 'ENT-POLICY-002',
      message: `RESTRICTED data sensitivity requires TYPED or higher governance tier, but skill is ${input.tier}`,
      severity: 'error',
      suggestion: `Upgrade governance tier from ${input.tier} to TYPED or VERIFIED`,
    });
  }

  // ── Fleet policy per-risk tier minimums ──────────────────────────
  if (input.fleetPolicy) {
    for (const rule of input.fleetPolicy.riskTierMinimums) {
      if (input.risk >= rule.minRisk) {
        if (TIER_ORDER[rule.minimumTier] > TIER_ORDER[effectiveMinimumTier]) {
          effectiveMinimumTier = rule.minimumTier;
        }

        if (!tierMeetsMinimum(input.tier, rule.minimumTier)) {
          violations.push({
            code: 'ENT-POLICY-003',
            message: `Fleet policy requires ${rule.minimumTier} or higher for R${rule.minRisk}+ skills, but skill is ${input.tier} at R${input.risk}`,
            severity: 'error',
            suggestion: `Upgrade governance tier from ${input.tier} to ${rule.minimumTier} or higher`,
          });
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    effectiveMinimumTier,
  };
}

// ── Closest-Value Enum Suggestions ─────────────────────────────────

/**
 * Suggest the closest valid governance tier for an invalid input string.
 *
 * Uses Levenshtein distance to find the nearest match among valid tier
 * values. Returns undefined if no match is within threshold (distance <= 3).
 */
export function suggestClosestTier(invalid: string): string | undefined {
  return suggestClosestEnum(invalid, GOVERNANCE_TIER_VALUES as readonly string[]);
}

/**
 * Suggest the closest valid data sensitivity for an invalid input string.
 */
export function suggestClosestSensitivity(invalid: string): string | undefined {
  return suggestClosestEnum(invalid, DATA_SENSITIVITY_VALUES as readonly string[]);
}

/**
 * Generic closest-value suggestion for any string enum.
 *
 * Returns the closest valid value within threshold (Levenshtein distance <= 3),
 * or undefined if no close match exists.
 */
export function suggestClosestEnum(
  invalid: string,
  validValues: readonly string[],
  threshold: number = 3,
): string | undefined {
  const upper = invalid.toUpperCase();
  let closest: string | undefined;
  let closestDist = Infinity;

  for (const value of validValues) {
    const dist = levenshtein(upper, value.toUpperCase(), threshold + 1);
    if (dist < closestDist) {
      closestDist = dist;
      closest = value;
    }
  }

  return closest !== undefined && closestDist <= threshold ? closest : undefined;
}

/**
 * Validate a governance tier string, returning an error with closest-value
 * suggestion if invalid (S04-F01).
 */
export function validateGovernanceTier(value: string): string | undefined {
  if ((GOVERNANCE_TIER_VALUES as readonly string[]).includes(value)) {
    return undefined;
  }

  const suggestion = suggestClosestTier(value);
  const hint = suggestion ? ` Did you mean '${suggestion}'?` : '';
  return `Invalid governance tier '${value}'. Valid values: ${GOVERNANCE_TIER_VALUES.join(', ')}.${hint}`;
}

/**
 * Validate a data sensitivity string, returning an error with closest-value
 * suggestion if invalid.
 */
export function validateDataSensitivity(value: string): string | undefined {
  if ((DATA_SENSITIVITY_VALUES as readonly string[]).includes(value)) {
    return undefined;
  }

  const suggestion = suggestClosestSensitivity(value);
  const hint = suggestion ? ` Did you mean '${suggestion}'?` : '';
  return `Invalid data sensitivity '${value}'. Valid values: ${DATA_SENSITIVITY_VALUES.join(', ')}.${hint}`;
}

// ── YAML None/null Disambiguation ──────────────────────────────────

/**
 * Result of YAML None/null disambiguation.
 */
export interface YamlNullDisambiguation {
  /** The original raw value from YAML parsing. */
  readonly rawValue: unknown;
  /** Whether the value was disambiguated (bare None → explicit null). */
  readonly disambiguated: boolean;
  /** The resolved value after disambiguation. */
  readonly resolvedValue: string | null;
  /** Warning message if disambiguation was needed. */
  readonly warning: string | undefined;
}

/**
 * Disambiguate YAML None/null values in governance fields (P-229).
 *
 * YAML parsers treat bare `None` as `null`. In governance fields, a
 * Python-style `None` string and YAML `null` must be distinguished:
 * - `null` → explicit null (no value set)
 * - `"None"` (quoted) → the string "None" (valid value, not null)
 * - `None` (bare, parsed as null) → disambiguated with warning
 *
 * @param rawValue - The value as returned by the YAML parser
 * @param fieldName - The governance field name (for warning message)
 * @returns Disambiguation result with resolved value and optional warning
 */
export function disambiguateYamlNull(
  rawValue: unknown,
  fieldName: string,
): YamlNullDisambiguation {
  // Explicit string — no disambiguation needed
  if (typeof rawValue === 'string') {
    return {
      rawValue,
      disambiguated: false,
      resolvedValue: rawValue,
      warning: undefined,
    };
  }

  // Explicit null — could be YAML null or bare None parsed as null
  if (rawValue === null || rawValue === undefined) {
    return {
      rawValue,
      disambiguated: true,
      resolvedValue: null,
      warning: `Field '${fieldName}' resolved to null — if you intended the string "None", quote it in YAML: ${fieldName}: "None"`,
    };
  }

  // Other types (number, boolean, object) — pass through as string
  return {
    rawValue,
    disambiguated: false,
    resolvedValue: String(rawValue),
    warning: undefined,
  };
}
