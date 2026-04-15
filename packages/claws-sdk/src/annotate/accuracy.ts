/**
 * Accuracy bound validation for the annotation engine.
 *
 * Runs the 20-skill test corpus through the heuristic engine and validates:
 * - >=85% accuracy within 1 R-level
 * - OBO false-negative rate <3%
 * - OBO false-positive rate <15%
 *
 * @module claws-sdk/annotate/accuracy
 */

import type { ToolRiskClass } from '../compile/types.js';
import type { HeuristicAnnotation } from './heuristics.js';
import { analyzeHeuristics } from './heuristics.js';
import type { CorpusSkill } from './corpus/index.js';
import { TEST_CORPUS } from './corpus/index.js';

// ── Accuracy Bounds ───────────────────────────────────────────────────

/**
 * Minimum accuracy: annotations must be within 1 R-level of expected.
 */
export const ACCURACY_THRESHOLD = 0.85;

/**
 * Maximum OBO false-negative rate: real OBO missed by engine.
 */
export const OBO_FALSE_NEGATIVE_MAX = 0.03;

/**
 * Maximum OBO false-positive rate: engine says OBO but it's not.
 */
export const OBO_FALSE_POSITIVE_MAX = 0.15;

// ── Result Types ──────────────────────────────────────────────────────

/**
 * Result of running a single corpus skill through the engine.
 */
export interface CorpusRunResult {
  /** The corpus skill entry. */
  readonly skill: CorpusSkill;
  /** The annotation produced by the engine. */
  readonly annotation: HeuristicAnnotation;
  /** Whether the risk classification is within 1 R-level. */
  readonly riskWithinOne: boolean;
  /** Whether OBO detection matches expected. */
  readonly oboCorrect: boolean;
  /** Absolute difference between expected and inferred risk. */
  readonly riskDelta: number;
}

/**
 * Aggregate accuracy results across the full corpus.
 */
export interface AccuracyReport {
  /** Total number of skills in the corpus. */
  readonly total: number;
  /** Number of skills within 1 R-level. */
  readonly withinOne: number;
  /** Accuracy ratio (withinOne / total). */
  readonly accuracy: number;
  /** Number of exact risk matches. */
  readonly exactMatches: number;
  /** OBO false-negative count (expected OBO but not detected). */
  readonly oboFalseNegatives: number;
  /** OBO false-positive count (detected OBO but not expected). */
  readonly oboFalsePositives: number;
  /** OBO false-negative rate. */
  readonly oboFnRate: number;
  /** OBO false-positive rate. */
  readonly oboFpRate: number;
  /** Whether all accuracy bounds pass. */
  readonly allPassed: boolean;
  /** Per-skill results. */
  readonly results: readonly CorpusRunResult[];
}

// ── Corpus Runner ─────────────────────────────────────────────────────

/**
 * Run a single corpus skill through the heuristic engine.
 */
export function runCorpusSkill(skill: CorpusSkill): CorpusRunResult {
  const annotation = analyzeHeuristics(
    skill.name,
    skill.description,
    skill.sourceContent,
  );

  const riskDelta = Math.abs(annotation.riskClass - skill.expectedRisk);

  return {
    skill,
    annotation,
    riskWithinOne: riskDelta <= 1,
    oboCorrect: annotation.obo.detected === skill.expectedObo,
    riskDelta,
  };
}

/**
 * Run the full 20-skill corpus and compute accuracy metrics.
 *
 * @param corpus - Optional corpus override (defaults to TEST_CORPUS)
 * @returns Accuracy report with per-skill results and aggregate metrics
 */
export function runAccuracyValidation(
  corpus: readonly CorpusSkill[] = TEST_CORPUS,
): AccuracyReport {
  const results = corpus.map(runCorpusSkill);

  const total = results.length;
  const withinOne = results.filter(r => r.riskWithinOne).length;
  const exactMatches = results.filter(r => r.riskDelta === 0).length;

  // OBO metrics
  // False negative: expected OBO but engine didn't detect
  const oboExpectedTrue = results.filter(r => r.skill.expectedObo);
  const oboFalseNegatives = oboExpectedTrue.filter(r => !r.annotation.obo.detected).length;

  // False positive: engine detected OBO but not expected
  const oboExpectedFalse = results.filter(r => !r.skill.expectedObo);
  const oboFalsePositives = oboExpectedFalse.filter(r => r.annotation.obo.detected).length;

  const oboFnRate = oboExpectedTrue.length > 0
    ? oboFalseNegatives / oboExpectedTrue.length
    : 0;
  const oboFpRate = oboExpectedFalse.length > 0
    ? oboFalsePositives / oboExpectedFalse.length
    : 0;

  const accuracy = total > 0 ? withinOne / total : 0;

  return {
    total,
    withinOne,
    accuracy,
    exactMatches,
    oboFalseNegatives,
    oboFalsePositives,
    oboFnRate,
    oboFpRate,
    allPassed:
      accuracy >= ACCURACY_THRESHOLD &&
      oboFnRate < OBO_FALSE_NEGATIVE_MAX &&
      oboFpRate < OBO_FALSE_POSITIVE_MAX,
    results,
  };
}

/**
 * Format an accuracy report as human-readable text.
 */
export function formatAccuracyReport(report: AccuracyReport): string {
  const lines: string[] = [];
  lines.push('Annotation Accuracy Report');
  lines.push('='.repeat(40));
  lines.push(`Total skills: ${report.total}`);
  lines.push(`Within 1 R-level: ${report.withinOne}/${report.total} (${(report.accuracy * 100).toFixed(1)}%)`);
  lines.push(`Exact matches: ${report.exactMatches}/${report.total}`);
  lines.push(`OBO false negatives: ${report.oboFalseNegatives} (${(report.oboFnRate * 100).toFixed(1)}%)`);
  lines.push(`OBO false positives: ${report.oboFalsePositives} (${(report.oboFpRate * 100).toFixed(1)}%)`);
  lines.push('');

  const passIcon = report.allPassed ? 'PASS' : 'FAIL';
  lines.push(`Overall: ${passIcon}`);

  if (!report.allPassed) {
    lines.push('');
    lines.push('Failing checks:');
    if (report.accuracy < ACCURACY_THRESHOLD) {
      lines.push(`  - Accuracy ${(report.accuracy * 100).toFixed(1)}% < ${(ACCURACY_THRESHOLD * 100).toFixed(0)}%`);
    }
    if (report.oboFnRate >= OBO_FALSE_NEGATIVE_MAX) {
      lines.push(`  - OBO FN rate ${(report.oboFnRate * 100).toFixed(1)}% >= ${(OBO_FALSE_NEGATIVE_MAX * 100).toFixed(0)}%`);
    }
    if (report.oboFpRate >= OBO_FALSE_POSITIVE_MAX) {
      lines.push(`  - OBO FP rate ${(report.oboFpRate * 100).toFixed(1)}% >= ${(OBO_FALSE_POSITIVE_MAX * 100).toFixed(0)}%`);
    }
  }

  // Per-skill details for failures
  const failures = report.results.filter(r => !r.riskWithinOne || !r.oboCorrect);
  if (failures.length > 0) {
    lines.push('');
    lines.push('Misclassified skills:');
    for (const f of failures) {
      const riskInfo = !f.riskWithinOne
        ? ` risk: expected R${f.skill.expectedRisk}, got R${f.annotation.riskClass}`
        : '';
      const oboInfo = !f.oboCorrect
        ? ` obo: expected ${f.skill.expectedObo}, got ${f.annotation.obo.detected}`
        : '';
      lines.push(`  - ${f.skill.name}:${riskInfo}${oboInfo}`);
    }
  }

  return lines.join('\n');
}
