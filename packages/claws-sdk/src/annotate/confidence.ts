/**
 * Confidence scoring for heuristic annotations.
 *
 * Produces a 0.0–1.0 score based on pattern match strength.
 * Multiple matching patterns accumulate confidence via
 * diminishing-returns combination (1 - product of inverses).
 *
 * @module claws-sdk/annotate/confidence
 */

/**
 * A single evidence item contributing to a confidence score.
 */
export interface ConfidenceEvidence {
  /** What matched (pattern name or description). */
  readonly source: string;
  /** Weight of this evidence (0.0–1.0). */
  readonly weight: number;
}

/**
 * A confidence result combining multiple evidence items.
 */
export interface ConfidenceResult {
  /** Combined confidence score (0.0–1.0). */
  readonly score: number;
  /** Individual evidence items that contributed. */
  readonly evidence: readonly ConfidenceEvidence[];
}

/**
 * Combine multiple evidence weights into a single confidence score.
 *
 * Uses diminishing-returns formula: 1 - product(1 - w_i).
 * Single evidence returns its weight directly.
 * Empty evidence returns 0.0.
 *
 * @param evidence - Evidence items with weights in [0.0, 1.0]
 * @returns Combined confidence result with score clamped to [0.0, 1.0]
 */
export function combineConfidence(evidence: readonly ConfidenceEvidence[]): ConfidenceResult {
  if (evidence.length === 0) {
    return { score: 0.0, evidence: [] };
  }

  // 1 - product(1 - w_i) — diminishing returns
  let inverseProd = 1.0;
  for (const e of evidence) {
    inverseProd *= (1.0 - Math.max(0.0, Math.min(1.0, e.weight)));
  }

  const score = Math.min(1.0, Math.max(0.0, 1.0 - inverseProd));

  return { score, evidence };
}
