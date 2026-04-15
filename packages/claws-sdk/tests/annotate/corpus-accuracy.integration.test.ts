/**
 * L1: Annotate full 20-skill corpus end-to-end and validate all accuracy bounds.
 * Remediation messages appear in claws check error output.
 */

import { describe, it, expect } from 'vitest';
import {
  runAccuracyValidation,
  ACCURACY_THRESHOLD,
  OBO_FALSE_NEGATIVE_MAX,
  OBO_FALSE_POSITIVE_MAX,
} from '../../src/annotate/accuracy.js';
import { TEST_CORPUS, getCorpusByRisk } from '../../src/annotate/corpus/index.js';
import {
  remediateInvalidRiskLabel,
  formatRemediation,
  injectRemediation,
  getClawsVersion,
} from '../../src/annotate/remediation.js';
import { normalizeRiskLabel } from '../../src/annotate/yaml-edge.js';

describe('full corpus accuracy validation', () => {
  it('runs all 20 skills and validates accuracy, OBO FN, OBO FP bounds', () => {
    const report = runAccuracyValidation();

    // Validate every bound
    expect(report.total).toBe(20);
    expect(report.accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    expect(report.oboFnRate).toBeLessThan(OBO_FALSE_NEGATIVE_MAX);
    expect(report.oboFpRate).toBeLessThan(OBO_FALSE_POSITIVE_MAX);
    expect(report.allPassed).toBe(true);

    // All results should exist
    expect(report.results).toHaveLength(20);

    // Each risk level should be represented
    for (const level of [1, 2, 3, 4, 5] as const) {
      const forLevel = report.results.filter(r => r.skill.expectedRisk === level);
      expect(forLevel.length).toBeGreaterThan(0);
    }
  });

  it('validates risk distribution matches corpus specification', () => {
    expect(getCorpusByRisk(1)).toHaveLength(5);
    expect(getCorpusByRisk(2)).toHaveLength(5);
    expect(getCorpusByRisk(3)).toHaveLength(4);
    expect(getCorpusByRisk(4)).toHaveLength(3);
    expect(getCorpusByRisk(5)).toHaveLength(3);
  });
});

describe('remediation in error output', () => {
  it('invalid risk labels produce remediation messages with claws annotate hint', () => {
    const invalidLabels = ['R6', 'risk_high', 'R0', 'unkwn'];

    for (const label of invalidLabels) {
      const hint = remediateInvalidRiskLabel(label);
      const formatted = formatRemediation(hint);

      expect(formatted).toContain('Or run: claws annotate');
      expect(formatted).toContain('docs:');
      expect(formatted).toContain(getClawsVersion());
    }
  });

  it('error messages gain remediation when injected', () => {
    const baseError = 'Governance check failed: unrecognized risk "R6"';
    const enhanced = injectRemediation(baseError, 'docs/claws/concepts/risk-classification.md');

    expect(enhanced).toContain(baseError);
    expect(enhanced).toContain('Or run: claws annotate');
    expect(enhanced).toContain('docs:');
  });

  it('all corpus skills normalize through risk label pipeline', () => {
    for (const skill of TEST_CORPUS) {
      const label = `R${skill.expectedRisk}`;
      const result = normalizeRiskLabel(label);
      expect(result.riskClass).toBe(skill.expectedRisk);
      expect(result.canonical).toBe(label);
    }
  });
});
