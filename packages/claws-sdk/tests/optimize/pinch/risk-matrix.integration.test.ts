/**
 * L1: Quality matrix -- integration tests.
 *
 * 2 integration tests:
 * 1. G2 compressed output scores >= 0.92 on all 5 dimensions
 * 2. G0 compressed output scores >= 0.80 on rule-coverage and risk-accuracy
 */

import { describe, it, expect } from 'vitest';
import { getProfileByLevel } from '../../../src/optimize/pinch/pinch-profile.js';
import {
  evaluateQualityMatrix,
  type OriginalGovernance,
  type CompressedGovernance,
  QUALITY_DIMENSIONS,
} from '../../../src/optimize/pinch/risk-matrix.js';

// ── Fixtures ──────────────────────────────────────────────────────────

/**
 * Realistic governance fixture with 10 rules, 4-entry OBO chain,
 * 3 tensions, and 5 remediations -- representative of a real workspace.
 */
const FULL_GOVERNANCE: OriginalGovernance = {
  rules: [
    { id: 'SEC-01', weight: 1.0, riskLevel: 'critical', remediation: 'Enforce MFA on all agent sessions' },
    { id: 'SEC-02', weight: 0.9, riskLevel: 'high', remediation: 'Rotate API keys every 30 days' },
    { id: 'DATA-01', weight: 0.85, riskLevel: 'high', remediation: 'Encrypt data at rest and in transit' },
    { id: 'DATA-02', weight: 0.7, riskLevel: 'medium', remediation: 'Anonymize PII in logs' },
    { id: 'OPS-01', weight: 0.8, riskLevel: 'medium', remediation: 'Rate-limit API calls to 100/min' },
    { id: 'OPS-02', weight: 0.6, riskLevel: 'low', remediation: 'Enable structured logging' },
    { id: 'GOV-01', weight: 0.95, riskLevel: 'high', remediation: 'Human-in-the-loop for high-risk decisions' },
    { id: 'GOV-02', weight: 0.5, riskLevel: 'medium', remediation: 'Audit trail for all policy changes' },
    { id: 'COM-01', weight: 0.4, riskLevel: 'low', remediation: 'Document all inter-agent contracts' },
    { id: 'COM-02', weight: 0.3, riskLevel: 'low', remediation: 'Version all shared schemas' },
  ],
  oboChain: [
    { actor: 'org-admin', action: 'policy-set' },
    { actor: 'team-lead', action: 'delegate' },
    { actor: 'agent-orchestrator', action: 'dispatch' },
    { actor: 'worker-agent', action: 'execute' },
  ],
  tensions: [
    { pair: 'speed-vs-security', description: 'Fast deployment conflicts with security scanning requirements' },
    { pair: 'autonomy-vs-compliance', description: 'Agent autonomy conflicts with compliance audit requirements' },
    { pair: 'cost-vs-reliability', description: 'Cost optimization conflicts with redundancy requirements' },
  ],
  remediations: [
    'Enforce MFA on all agent sessions',
    'Rotate API keys every 30 days',
    'Encrypt data at rest and in transit',
    'Human-in-the-loop for high-risk decisions',
    'Rate-limit API calls to 100/min',
  ],
  riskLevel: 'high',
};

/**
 * G2-quality compressed output: retains nearly everything.
 * Designed to score >= 0.92 on all 5 dimensions.
 */
function makeG2Compressed(): CompressedGovernance {
  return {
    // 10 of 10 rules retained (1.0 rule coverage)
    rules: [...FULL_GOVERNANCE.rules],
    // Full OBO chain retained (1.0 OBO preservation)
    oboChain: [...FULL_GOVERNANCE.oboChain],
    // All 3 tensions retained (1.0 tension visibility)
    tensions: [...FULL_GOVERNANCE.tensions],
    // All 5 remediations retained verbatim (1.0 remediation actionability)
    remediations: [...FULL_GOVERNANCE.remediations],
    // Same risk level (contributes to risk accuracy)
    riskLevel: 'high',
  };
}

/**
 * G0-quality compressed output: minimal surface.
 * Designed to score >= 0.80 on rule-coverage and risk-accuracy.
 * Other dimensions are not threshold-gated at G0.
 */
function makeG0Compressed(): CompressedGovernance {
  return {
    // 9 of 10 rules (drop COM-02 at weight 0.3) = 0.9 rule coverage
    rules: FULL_GOVERNANCE.rules.filter((r) => r.id !== 'COM-02'),
    // Minimal OBO: just top and bottom of chain
    oboChain: [
      { actor: 'org-admin', action: 'policy-set' },
      { actor: 'worker-agent', action: 'execute' },
    ],
    // No tensions at G0 (not threshold-gated)
    tensions: [],
    // Only top 2 remediations (not threshold-gated)
    remediations: [
      'Enforce MFA on all agent sessions',
      'Rotate API keys every 30 days',
    ],
    // Correct risk level
    riskLevel: 'high',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('QualityMatrix integration', () => {
  it('G2 compressed output scores >= 0.92 on all 5 dimensions', () => {
    const g2 = getProfileByLevel(2)!;
    const compressed = makeG2Compressed();

    const result = evaluateQualityMatrix(FULL_GOVERNANCE, compressed, g2);

    // All 5 dimensions must meet the 0.92 threshold
    for (const dim of QUALITY_DIMENSIONS) {
      expect(result.scores[dim]).toBeGreaterThanOrEqual(0.92);
    }

    // Aggregate must also be high
    expect(result.aggregate).toBeGreaterThanOrEqual(0.92);

    // Must pass with no violations
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('G0 compressed output scores >= 0.80 on rule-coverage and risk-accuracy', () => {
    const g0 = getProfileByLevel(0)!;
    const compressed = makeG0Compressed();

    const result = evaluateQualityMatrix(FULL_GOVERNANCE, compressed, g0);

    // Rule coverage and risk accuracy must meet G0's 0.80 threshold
    expect(result.scores.ruleCoverage).toBeGreaterThanOrEqual(0.80);
    expect(result.scores.riskAccuracy).toBeGreaterThanOrEqual(0.80);

    // G0 does not gate other dimensions, so pass should be true
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);

    // OBO, tension, remediation can be lower (not threshold-gated at G0)
    // but should reflect the compressed content accurately
    expect(result.scores.oboPreservation).toBeGreaterThan(0);
    expect(result.scores.tensionVisibility).toBeLessThan(1.0);
    expect(result.scores.remediationActionability).toBeGreaterThan(0);
  });
});
