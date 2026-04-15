/**
 * L0: Confidence scoring — combine evidence weights via diminishing returns.
 */

import { describe, it, expect } from 'vitest';
import { combineConfidence } from '../../src/annotate/confidence.js';
import type { ConfidenceEvidence } from '../../src/annotate/confidence.js';

describe('combineConfidence()', () => {
  it('returns 0.0 for empty evidence', () => {
    const result = combineConfidence([]);
    expect(result.score).toBe(0.0);
    expect(result.evidence).toHaveLength(0);
  });

  it('returns weight directly for single evidence', () => {
    const evidence: ConfidenceEvidence[] = [
      { source: 'name:send', weight: 0.70 },
    ];
    const result = combineConfidence(evidence);
    expect(result.score).toBeCloseTo(0.70, 2);
    expect(result.evidence).toHaveLength(1);
  });

  it('combines two weights via diminishing returns', () => {
    const evidence: ConfidenceEvidence[] = [
      { source: 'name:send', weight: 0.70 },
      { source: 'desc:email', weight: 0.60 },
    ];
    const result = combineConfidence(evidence);
    // 1 - (1-0.70)*(1-0.60) = 1 - 0.30*0.40 = 1 - 0.12 = 0.88
    expect(result.score).toBeCloseTo(0.88, 2);
  });

  it('produces scores in 0.0-1.0 range', () => {
    const evidence: ConfidenceEvidence[] = [
      { source: 'a', weight: 0.95 },
      { source: 'b', weight: 0.90 },
      { source: 'c', weight: 0.85 },
    ];
    const result = combineConfidence(evidence);
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it('clamps negative weights to 0', () => {
    const evidence: ConfidenceEvidence[] = [
      { source: 'bad', weight: -0.5 },
    ];
    const result = combineConfidence(evidence);
    // 1 - (1 - 0) = 0
    expect(result.score).toBe(0.0);
  });

  it('clamps weights above 1.0', () => {
    const evidence: ConfidenceEvidence[] = [
      { source: 'over', weight: 1.5 },
    ];
    const result = combineConfidence(evidence);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });
});
