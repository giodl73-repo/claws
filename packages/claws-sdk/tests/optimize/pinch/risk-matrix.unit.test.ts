/**
 * L0: Quality matrix -- 5-dimension governance fidelity scoring.
 *
 * 5 unit tests:
 * 1. Rule coverage score
 * 2. Risk accuracy score
 * 3. OBO preservation score
 * 4. Tension visibility score
 * 5. Remediation actionability score
 */

import { describe, it, expect } from 'vitest';
import {
  scoreRuleCoverage,
  scoreRiskAccuracy,
  scoreOboPreservation,
  scoreTensionVisibility,
  scoreRemediationActionability,
  scoreDimensions,
  computeAggregate,
  checkThresholds,
  getThresholdsForLevel,
  evaluateQualityMatrix,
  QUALITY_DIMENSIONS,
  type OriginalGovernance,
  type CompressedGovernance,
  type DimensionScores,
} from '../../../src/optimize/pinch/risk-matrix.js';
import type { PinchProfile } from '../../../src/optimize/pinch/pinch-profile.js';
import { getProfileByLevel } from '../../../src/optimize/pinch/pinch-profile.js';

// ── Fixtures ──────────────────────────────────────────────────────────

function makeOriginal(overrides?: Partial<OriginalGovernance>): OriginalGovernance {
  return {
    rules: [
      { id: 'R1', weight: 1.0, riskLevel: 'high' },
      { id: 'R2', weight: 0.8, riskLevel: 'medium' },
      { id: 'R3', weight: 0.5, riskLevel: 'low' },
      { id: 'R4', weight: 0.3, riskLevel: 'high' },
    ],
    oboChain: [
      { actor: 'admin', action: 'delegate' },
      { actor: 'agent-1', action: 'execute' },
      { actor: 'agent-2', action: 'verify' },
    ],
    tensions: [
      { pair: 'speed-vs-safety', description: 'Fast execution conflicts with safety checks' },
      { pair: 'autonomy-vs-oversight', description: 'Agent autonomy conflicts with human oversight' },
    ],
    remediations: [
      'Add safety check before execution step',
      'Request human approval for high-risk actions',
      'Enable audit logging for all delegated operations',
    ],
    riskLevel: 'high',
    ...overrides,
  };
}

function makeCompressed(overrides?: Partial<CompressedGovernance>): CompressedGovernance {
  return {
    rules: [
      { id: 'R1', weight: 1.0, riskLevel: 'high' },
      { id: 'R2', weight: 0.8, riskLevel: 'medium' },
      { id: 'R3', weight: 0.5, riskLevel: 'low' },
      { id: 'R4', weight: 0.3, riskLevel: 'high' },
    ],
    oboChain: [
      { actor: 'admin', action: 'delegate' },
      { actor: 'agent-1', action: 'execute' },
      { actor: 'agent-2', action: 'verify' },
    ],
    tensions: [
      { pair: 'speed-vs-safety', description: 'Fast execution conflicts with safety checks' },
      { pair: 'autonomy-vs-oversight', description: 'Agent autonomy conflicts with human oversight' },
    ],
    remediations: [
      'Add safety check before execution step',
      'Request human approval for high-risk actions',
      'Enable audit logging for all delegated operations',
    ],
    riskLevel: 'high',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('QualityMatrix', () => {
  it('rule coverage score', () => {
    const original = makeOriginal();

    // Perfect coverage: all rules retained
    expect(scoreRuleCoverage(original, makeCompressed())).toBe(1.0);

    // Partial coverage: 2 of 4 rules retained
    const partial = makeCompressed({
      rules: [
        { id: 'R1', weight: 1.0, riskLevel: 'high' },
        { id: 'R3', weight: 0.5, riskLevel: 'low' },
      ],
    });
    expect(scoreRuleCoverage(original, partial)).toBe(0.5);

    // No coverage: no rules retained
    const empty = makeCompressed({ rules: [] });
    expect(scoreRuleCoverage(original, empty)).toBe(0.0);

    // Edge case: original has no rules -> score is 1.0
    const emptyOriginal = makeOriginal({ rules: [] });
    expect(scoreRuleCoverage(emptyOriginal, empty)).toBe(1.0);

    // 3 of 4 retained
    const threeOf4 = makeCompressed({
      rules: [
        { id: 'R1', weight: 1.0, riskLevel: 'high' },
        { id: 'R2', weight: 0.8, riskLevel: 'medium' },
        { id: 'R4', weight: 0.3, riskLevel: 'high' },
      ],
    });
    expect(scoreRuleCoverage(original, threeOf4)).toBe(0.75);
  });

  it('risk accuracy score', () => {
    const original = makeOriginal();

    // Perfect accuracy: all risk levels match
    expect(scoreRiskAccuracy(original, makeCompressed())).toBe(1.0);

    // Top-level mismatch + all rules match: 0.4 * 0 + 0.6 * 1.0 = 0.6
    const wrongTop = makeCompressed({ riskLevel: 'low' });
    expect(scoreRiskAccuracy(original, wrongTop)).toBe(0.6);

    // Top-level match + all per-rule mismatches: 0.4 * 1.0 + 0.6 * 0.0 = 0.4
    const wrongRules = makeCompressed({
      rules: [
        { id: 'R1', weight: 1.0, riskLevel: 'low' },
        { id: 'R2', weight: 0.8, riskLevel: 'low' },
        { id: 'R3', weight: 0.5, riskLevel: 'high' },
        { id: 'R4', weight: 0.3, riskLevel: 'low' },
      ],
    });
    expect(scoreRiskAccuracy(original, wrongRules)).toBe(0.4);

    // No rules in original, top-level matches -> 1.0
    const noRules = makeOriginal({ rules: [] });
    expect(scoreRiskAccuracy(noRules, makeCompressed({ rules: [] }))).toBe(1.0);

    // No rules in original, top-level mismatch -> 0.0
    expect(scoreRiskAccuracy(noRules, makeCompressed({ rules: [], riskLevel: 'low' }))).toBe(0.0);

    // Compressed has no matching rule IDs: checkedCount = 0 -> ruleAccuracy = 0
    // Top-level matches: 0.4 * 1.0 + 0.6 * 0.0 = 0.4
    const noMatchIds = makeCompressed({
      rules: [{ id: 'R99', weight: 1.0, riskLevel: 'high' }],
    });
    expect(scoreRiskAccuracy(original, noMatchIds)).toBe(0.4);
  });

  it('OBO preservation score', () => {
    const original = makeOriginal();

    // Perfect preservation: all entries retained
    expect(scoreOboPreservation(original, makeCompressed())).toBe(1.0);

    // Partial: 1 of 3 retained
    const partial = makeCompressed({
      oboChain: [{ actor: 'admin', action: 'delegate' }],
    });
    expect(scoreOboPreservation(original, partial)).toBeCloseTo(1 / 3, 10);

    // Empty compressed: 0.0
    const empty = makeCompressed({ oboChain: [] });
    expect(scoreOboPreservation(original, empty)).toBe(0.0);

    // Empty original: 1.0
    const emptyOriginal = makeOriginal({ oboChain: [] });
    expect(scoreOboPreservation(emptyOriginal, empty)).toBe(1.0);

    // 2 of 3 retained
    const twoOf3 = makeCompressed({
      oboChain: [
        { actor: 'admin', action: 'delegate' },
        { actor: 'agent-2', action: 'verify' },
      ],
    });
    expect(scoreOboPreservation(original, twoOf3)).toBeCloseTo(2 / 3, 10);
  });

  it('tension visibility score', () => {
    const original = makeOriginal();

    // Perfect: all tensions retained
    expect(scoreTensionVisibility(original, makeCompressed())).toBe(1.0);

    // Partial: 1 of 2 retained
    const partial = makeCompressed({
      tensions: [
        { pair: 'speed-vs-safety', description: 'Fast execution conflicts with safety checks' },
      ],
    });
    expect(scoreTensionVisibility(original, partial)).toBe(0.5);

    // Empty compressed: 0.0
    const empty = makeCompressed({ tensions: [] });
    expect(scoreTensionVisibility(original, empty)).toBe(0.0);

    // Empty original: 1.0
    const emptyOriginal = makeOriginal({ tensions: [] });
    expect(scoreTensionVisibility(emptyOriginal, empty)).toBe(1.0);

    // Both retained
    const full = makeCompressed();
    expect(scoreTensionVisibility(original, full)).toBe(1.0);
  });

  it('remediation actionability score', () => {
    const original = makeOriginal();

    // Perfect: all remediations retained verbatim
    expect(scoreRemediationActionability(original, makeCompressed())).toBe(1.0);

    // Empty compressed: 0.0
    const empty = makeCompressed({ remediations: [] });
    expect(scoreRemediationActionability(original, empty)).toBe(0.0);

    // Empty original: 1.0
    const emptyOriginal = makeOriginal({ remediations: [] });
    expect(scoreRemediationActionability(emptyOriginal, empty)).toBe(1.0);

    // Partial match: 1 of 3 exact, 2 missing -> 1/3
    const oneOf3 = makeCompressed({
      remediations: ['Add safety check before execution step'],
    });
    expect(scoreRemediationActionability(original, oneOf3)).toBeCloseTo(1 / 3, 10);

    // Substring match with >= 60% length -> 1.0 per match
    const shortened = makeCompressed({
      remediations: [
        'Add safety check before execution step',
        'Request human approval for high-risk actions',
        // Shortened version that's a substring of the original, >= 60% length
        'Enable audit logging for all delegated operations',
      ],
    });
    expect(scoreRemediationActionability(original, shortened)).toBe(1.0);

    // Substring match with < 60% length -> 0.5 per match
    // Original: 'Enable audit logging for all delegated operations' (49 chars)
    // Compressed: 'Enable audit' (12 chars) -> 12/49 = 0.24 < 0.6 -> 0.5
    const veryShortened = makeOriginal({
      remediations: ['Enable audit logging for all delegated operations'],
    });
    const veryShort = makeCompressed({
      remediations: ['Enable audit'],
    });
    expect(scoreRemediationActionability(veryShortened, veryShort)).toBe(0.5);

    // Substring match with >= 60% length via partial overlap -> 1.0
    // Original: 'Enable audit logging' (20 chars)
    // Compressed: 'Enable audit loggi' (18 chars, substring of original) -> 18/20 = 0.9 >= 0.6 -> 1.0
    const longSubstring = makeOriginal({
      remediations: ['Enable audit logging'],
    });
    const longSub = makeCompressed({
      remediations: ['Enable audit loggi'],
    });
    expect(scoreRemediationActionability(longSubstring, longSub)).toBe(1.0);

    // No substring match at all -> 0.0
    const noMatch = makeOriginal({
      remediations: ['Enable audit logging for all delegated operations'],
    });
    const unrelated = makeCompressed({
      remediations: ['Something completely different'],
    });
    expect(scoreRemediationActionability(noMatch, unrelated)).toBe(0.0);

    // computeAggregate with all-zero weights returns 0
    const zeroWeights = {
      ruleCoverage: 0,
      riskAccuracy: 0,
      oboPreservation: 0,
      tensionVisibility: 0,
      remediationActionability: 0,
    };
    const perfectScores: DimensionScores = {
      ruleCoverage: 1.0,
      riskAccuracy: 1.0,
      oboPreservation: 1.0,
      tensionVisibility: 1.0,
      remediationActionability: 1.0,
    };
    expect(computeAggregate(perfectScores, zeroWeights)).toBe(0);

    // evaluateQualityMatrix with an invalid governance level returns passed=false
    const invalidProfile: PinchProfile = {
      name: 'minimal',
      level: 99 as never,
      tokenBudget: 400,
      fidelity: { riskLevel: 1.0, ruleText: 0.3, remediation: 0.0, oboChain: 0.5 },
      inclusion: {
        minWeight: 0.8, includeObo: true, includeRemediation: false,
        includeTensions: false, includeAuditRefs: false,
        includePolicyLinks: false, includeHistoricalNotes: false,
        includeRiskDecomposition: false,
      },
    };
    const invalidResult = evaluateQualityMatrix(
      makeOriginal(), makeCompressed(), invalidProfile,
    );
    expect(invalidResult.passed).toBe(false);
    expect(invalidResult.violations).toHaveLength(0);

    // evaluateQualityMatrix with a valid profile: G2 perfect scores
    const g2Profile = getProfileByLevel(2)!;
    const g2Result = evaluateQualityMatrix(
      makeOriginal(), makeCompressed(), g2Profile,
    );
    expect(g2Result.passed).toBe(true);
    expect(g2Result.aggregate).toBe(1.0);
    expect(g2Result.violations).toHaveLength(0);

    // getThresholdsForLevel returns undefined for unknown level
    expect(getThresholdsForLevel(99 as never)).toBeUndefined();

    // scoreDimensions returns all 5 dimensions
    const scores = scoreDimensions(original, makeCompressed());
    expect(scores.ruleCoverage).toBe(1.0);
    expect(scores.riskAccuracy).toBe(1.0);
    expect(scores.oboPreservation).toBe(1.0);
    expect(scores.tensionVisibility).toBe(1.0);
    expect(scores.remediationActionability).toBe(1.0);

    // computeAggregate of perfect scores is 1.0
    expect(computeAggregate(scores)).toBe(1.0);

    // QUALITY_DIMENSIONS has exactly 5 entries
    expect(QUALITY_DIMENSIONS).toHaveLength(5);

    // checkThresholds with perfect scores and G2 thresholds -> no violations
    const g2Thresholds = getThresholdsForLevel(2)!;
    expect(g2Thresholds).toBeDefined();
    expect(checkThresholds(scores, g2Thresholds)).toHaveLength(0);

    // checkThresholds with low scores -> violations
    const lowScores: DimensionScores = {
      ruleCoverage: 0.5,
      riskAccuracy: 0.5,
      oboPreservation: 0.5,
      tensionVisibility: 0.5,
      remediationActionability: 0.5,
    };
    const violations = checkThresholds(lowScores, g2Thresholds);
    expect(violations).toHaveLength(5);
    for (const v of violations) {
      expect(v.score).toBe(0.5);
      expect(v.threshold).toBe(0.92);
    }

    // G0 thresholds only enforce ruleCoverage and riskAccuracy
    const g0Thresholds = getThresholdsForLevel(0)!;
    expect(g0Thresholds).toBeDefined();
    const g0Violations = checkThresholds(lowScores, g0Thresholds);
    expect(g0Violations).toHaveLength(2);
    expect(g0Violations.map((v) => v.dimension)).toContain('ruleCoverage');
    expect(g0Violations.map((v) => v.dimension)).toContain('riskAccuracy');
  });
});
