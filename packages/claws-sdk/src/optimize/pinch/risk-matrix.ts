/**
 * 5-dimension governance fidelity quality matrix for pinch-compressed output.
 *
 * Dimensions scored independently on 0.0-1.0:
 * 1. Rule Coverage — percentage of original governance rules retained
 * 2. Risk Accuracy — fidelity of risk level representation
 * 3. OBO Preservation — completeness of On-Behalf-Of chain information
 * 4. Tension Visibility — retention of governance tension annotations
 * 5. Remediation Actionability — quality of remediation guidance
 *
 * Profile thresholds:
 * - G2 (strict): >= 0.92 on all 5 dimensions
 * - G0 (minimal): >= 0.80 on rule-coverage and risk-accuracy only
 *
 * @module claws-sdk/optimize/pinch/risk-matrix
 */

import type { GovernanceLevel, PinchProfile } from './pinch-profile.js';

// ── Types ──────────────────────────────────────────────────────────────

/** Names of the 5 quality dimensions. */
export type QualityDimension =
  | 'ruleCoverage'
  | 'riskAccuracy'
  | 'oboPreservation'
  | 'tensionVisibility'
  | 'remediationActionability';

/** All dimension names in canonical order. */
export const QUALITY_DIMENSIONS: readonly QualityDimension[] = [
  'ruleCoverage',
  'riskAccuracy',
  'oboPreservation',
  'tensionVisibility',
  'remediationActionability',
] as const;

/** Per-dimension scores (each 0.0-1.0). */
export interface DimensionScores {
  readonly ruleCoverage: number;
  readonly riskAccuracy: number;
  readonly oboPreservation: number;
  readonly tensionVisibility: number;
  readonly remediationActionability: number;
}

/** Result of a quality matrix evaluation. */
export interface QualityMatrixResult {
  /** Per-dimension scores. */
  readonly scores: DimensionScores;
  /** Aggregate fidelity score (weighted average of all dimensions). */
  readonly aggregate: number;
  /** Whether all profile thresholds are met. */
  readonly passed: boolean;
  /** Per-dimension pass/fail against profile thresholds. */
  readonly violations: readonly QualityViolation[];
}

/** A single dimension threshold violation. */
export interface QualityViolation {
  readonly dimension: QualityDimension;
  readonly score: number;
  readonly threshold: number;
}

/** Threshold configuration per dimension for a governance level. */
export interface DimensionThresholds {
  readonly ruleCoverage: number;
  readonly riskAccuracy: number;
  readonly oboPreservation: number;
  readonly tensionVisibility: number;
  readonly remediationActionability: number;
}

// ── Governance input types ─────────────────────────────────────────────

/** A governance rule in the original (pre-compression) output. */
export interface GovernanceRule {
  readonly id: string;
  readonly weight: number;
  readonly riskLevel: string;
  readonly remediation?: string;
}

/** An OBO chain entry. */
export interface OboEntry {
  readonly actor: string;
  readonly action: string;
}

/** A tension annotation. */
export interface TensionAnnotation {
  readonly pair: string;
  readonly description: string;
}

/** Original (uncompressed) governance output. */
export interface OriginalGovernance {
  readonly rules: readonly GovernanceRule[];
  readonly oboChain: readonly OboEntry[];
  readonly tensions: readonly TensionAnnotation[];
  readonly remediations: readonly string[];
  readonly riskLevel: string;
}

/** Compressed governance output to evaluate. */
export interface CompressedGovernance {
  readonly rules: readonly GovernanceRule[];
  readonly oboChain: readonly OboEntry[];
  readonly tensions: readonly TensionAnnotation[];
  readonly remediations: readonly string[];
  readonly riskLevel: string;
}

// ── Threshold Registry ─────────────────────────────────────────────────

/**
 * Per-level dimension thresholds.
 *
 * - G0: 0.80 on ruleCoverage and riskAccuracy; no threshold on others
 * - G1: 0.85 on ruleCoverage, riskAccuracy, oboPreservation
 * - G2: 0.92 on all 5 dimensions
 * - G3: 0.95 on all 5 dimensions
 */
const THRESHOLDS_BY_LEVEL: ReadonlyMap<GovernanceLevel, DimensionThresholds> = new Map([
  [0, {
    ruleCoverage: 0.80,
    riskAccuracy: 0.80,
    oboPreservation: 0.0,
    tensionVisibility: 0.0,
    remediationActionability: 0.0,
  }],
  [1, {
    ruleCoverage: 0.85,
    riskAccuracy: 0.85,
    oboPreservation: 0.85,
    tensionVisibility: 0.0,
    remediationActionability: 0.0,
  }],
  [2, {
    ruleCoverage: 0.92,
    riskAccuracy: 0.92,
    oboPreservation: 0.92,
    tensionVisibility: 0.92,
    remediationActionability: 0.92,
  }],
  [3, {
    ruleCoverage: 0.95,
    riskAccuracy: 0.95,
    oboPreservation: 0.95,
    tensionVisibility: 0.95,
    remediationActionability: 0.95,
  }],
]);

/**
 * Get the dimension thresholds for a governance level.
 * Returns undefined if the level is not recognized.
 */
export function getThresholdsForLevel(level: GovernanceLevel): DimensionThresholds | undefined {
  return THRESHOLDS_BY_LEVEL.get(level);
}

// ── Dimension Scoring Functions ────────────────────────────────────────

/**
 * Score rule coverage: fraction of original rules retained in compressed output.
 * A compressed rule matches an original rule when their IDs are equal.
 */
export function scoreRuleCoverage(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
): number {
  if (original.rules.length === 0) return 1.0;
  const compressedIds = new Set(compressed.rules.map((r) => r.id));
  const retained = original.rules.filter((r) => compressedIds.has(r.id)).length;
  return retained / original.rules.length;
}

/**
 * Score risk accuracy: whether the compressed output conveys the same risk posture.
 * Scores 1.0 if risk levels match exactly, 0.0 otherwise. Per-rule risk levels
 * contribute proportionally if rules are present.
 */
export function scoreRiskAccuracy(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
): number {
  // Top-level risk level match
  const topMatch = original.riskLevel === compressed.riskLevel ? 1.0 : 0.0;

  if (original.rules.length === 0) return topMatch;

  // Per-rule risk level matching (weighted by rule count)
  const compressedMap = new Map(compressed.rules.map((r) => [r.id, r]));
  let matchCount = 0;
  let checkedCount = 0;

  for (const rule of original.rules) {
    const compRule = compressedMap.get(rule.id);
    if (compRule) {
      checkedCount++;
      if (compRule.riskLevel === rule.riskLevel) {
        matchCount++;
      }
    }
  }

  const ruleAccuracy = checkedCount > 0 ? matchCount / checkedCount : 0.0;

  // Weighted average: 40% top-level, 60% per-rule
  return topMatch * 0.4 + ruleAccuracy * 0.6;
}

/**
 * Score OBO preservation: fraction of OBO chain entries retained.
 * Entries match on actor + action.
 */
export function scoreOboPreservation(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
): number {
  if (original.oboChain.length === 0) return 1.0;

  const compressedEntries = new Set(
    compressed.oboChain.map((e) => `${e.actor}|${e.action}`),
  );

  const retained = original.oboChain.filter(
    (e) => compressedEntries.has(`${e.actor}|${e.action}`),
  ).length;

  return retained / original.oboChain.length;
}

/**
 * Score tension visibility: fraction of tension annotations retained.
 * Tensions match on pair identifier.
 */
export function scoreTensionVisibility(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
): number {
  if (original.tensions.length === 0) return 1.0;

  const compressedPairs = new Set(compressed.tensions.map((t) => t.pair));
  const retained = original.tensions.filter(
    (t) => compressedPairs.has(t.pair),
  ).length;

  return retained / original.tensions.length;
}

/**
 * Score remediation actionability: fraction of remediation strings retained
 * with sufficient detail. A retained remediation scores 1.0 if it preserves
 * at least 60% of the original character length, 0.5 otherwise.
 */
export function scoreRemediationActionability(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
): number {
  if (original.remediations.length === 0) return 1.0;

  let totalScore = 0;

  for (const origRemediation of original.remediations) {
    // Find the best matching compressed remediation
    let bestMatch = 0;
    for (const compRemediation of compressed.remediations) {
      if (compRemediation === origRemediation) {
        bestMatch = 1.0;
        break;
      }
      // Partial match: check if compressed version retains core content
      if (origRemediation.includes(compRemediation) || compRemediation.includes(origRemediation)) {
        const ratio = compRemediation.length / origRemediation.length;
        bestMatch = Math.max(bestMatch, ratio >= 0.6 ? 1.0 : 0.5);
      }
    }
    totalScore += bestMatch;
  }

  return totalScore / original.remediations.length;
}

// ── Aggregate Scoring ──────────────────────────────────────────────────

/** Default dimension weights for aggregate score computation. */
const DEFAULT_WEIGHTS: Readonly<Record<QualityDimension, number>> = {
  ruleCoverage: 0.25,
  riskAccuracy: 0.25,
  oboPreservation: 0.20,
  tensionVisibility: 0.15,
  remediationActionability: 0.15,
};

/**
 * Compute the aggregate fidelity score from per-dimension scores.
 * Uses weighted average with the default dimension weights.
 */
export function computeAggregate(
  scores: DimensionScores,
  weights: Readonly<Record<QualityDimension, number>> = DEFAULT_WEIGHTS,
): number {
  let sum = 0;
  let weightSum = 0;
  for (const dim of QUALITY_DIMENSIONS) {
    sum += scores[dim] * weights[dim];
    weightSum += weights[dim];
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

/**
 * Score all 5 dimensions of governance fidelity.
 */
export function scoreDimensions(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
): DimensionScores {
  return {
    ruleCoverage: scoreRuleCoverage(original, compressed),
    riskAccuracy: scoreRiskAccuracy(original, compressed),
    oboPreservation: scoreOboPreservation(original, compressed),
    tensionVisibility: scoreTensionVisibility(original, compressed),
    remediationActionability: scoreRemediationActionability(original, compressed),
  };
}

// ── Threshold Checking ─────────────────────────────────────────────────

/**
 * Check dimension scores against profile thresholds and return violations.
 */
export function checkThresholds(
  scores: DimensionScores,
  thresholds: DimensionThresholds,
): readonly QualityViolation[] {
  const violations: QualityViolation[] = [];

  for (const dim of QUALITY_DIMENSIONS) {
    const threshold = thresholds[dim];
    if (threshold > 0 && scores[dim] < threshold) {
      violations.push({
        dimension: dim,
        score: scores[dim],
        threshold,
      });
    }
  }

  return violations;
}

/**
 * Evaluate the full quality matrix for compressed governance output
 * against a pinch profile.
 *
 * Returns per-dimension scores, aggregate fidelity, pass/fail status,
 * and any threshold violations.
 */
export function evaluateQualityMatrix(
  original: OriginalGovernance,
  compressed: CompressedGovernance,
  profile: PinchProfile,
): QualityMatrixResult {
  const scores = scoreDimensions(original, compressed);
  const aggregate = computeAggregate(scores);

  const thresholds = getThresholdsForLevel(profile.level);
  if (!thresholds) {
    return { scores, aggregate, passed: false, violations: [] };
  }

  const violations = checkThresholds(scores, thresholds);

  return {
    scores,
    aggregate,
    passed: violations.length === 0,
    violations,
  };
}
