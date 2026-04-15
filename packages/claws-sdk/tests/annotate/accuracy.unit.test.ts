/**
 * L0: Accuracy bounds validation — corpus accuracy >=85% within 1 R-level,
 * OBO false-negative rate <3%, OBO false-positive rate <15%.
 */

import { describe, it, expect } from 'vitest';
import {
  ACCURACY_THRESHOLD,
  OBO_FALSE_NEGATIVE_MAX,
  OBO_FALSE_POSITIVE_MAX,
  runCorpusSkill,
  runAccuracyValidation,
  formatAccuracyReport,
} from '../../src/annotate/accuracy.js';
import type { AccuracyReport } from '../../src/annotate/accuracy.js';
import { TEST_CORPUS, validateCorpusDistribution } from '../../src/annotate/corpus/index.js';

describe('corpus distribution', () => {
  it('has exactly 20 skills across 5 risk levels (5+5+4+3+3)', () => {
    expect(TEST_CORPUS).toHaveLength(20);
    const dist = validateCorpusDistribution();
    expect(dist.valid).toBe(true);
    expect(dist.counts[1]).toBe(5);
    expect(dist.counts[2]).toBe(5);
    expect(dist.counts[3]).toBe(4);
    expect(dist.counts[4]).toBe(3);
    expect(dist.counts[5]).toBe(3);
  });
});

describe('runCorpusSkill()', () => {
  it('runs a single corpus skill and returns result', () => {
    const result = runCorpusSkill(TEST_CORPUS[0]!);
    expect(result.skill).toBe(TEST_CORPUS[0]);
    expect(result.annotation).toBeDefined();
    expect(typeof result.riskWithinOne).toBe('boolean');
    expect(typeof result.oboCorrect).toBe('boolean');
    expect(typeof result.riskDelta).toBe('number');
  });
});

describe('runAccuracyValidation()', () => {
  it('achieves >=85% accuracy within 1 R-level on corpus', () => {
    const report = runAccuracyValidation();
    expect(report.accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
  });

  it('achieves OBO false-negative rate <3%', () => {
    const report = runAccuracyValidation();
    expect(report.oboFnRate).toBeLessThan(OBO_FALSE_NEGATIVE_MAX);
  });

  it('achieves OBO false-positive rate <15%', () => {
    const report = runAccuracyValidation();
    expect(report.oboFpRate).toBeLessThan(OBO_FALSE_POSITIVE_MAX);
  });

  it('reports all bounds passing', () => {
    const report = runAccuracyValidation();
    expect(report.allPassed).toBe(true);
  });

  it('reports correct total', () => {
    const report = runAccuracyValidation();
    expect(report.total).toBe(20);
  });
});

describe('formatAccuracyReport()', () => {
  it('produces human-readable text', () => {
    const report = runAccuracyValidation();
    const text = formatAccuracyReport(report);
    expect(text).toContain('Annotation Accuracy Report');
    expect(text).toContain('Total skills: 20');
    expect(text).toContain('%');
  });
});

describe('accuracy constants', () => {
  it('has correct threshold values', () => {
    expect(ACCURACY_THRESHOLD).toBe(0.85);
    expect(OBO_FALSE_NEGATIVE_MAX).toBe(0.03);
    expect(OBO_FALSE_POSITIVE_MAX).toBe(0.15);
  });
});

describe('runAccuracyValidation() edge cases', () => {
  it('handles empty corpus gracefully', () => {
    const report = runAccuracyValidation([]);
    expect(report.total).toBe(0);
    expect(report.accuracy).toBe(0);
    expect(report.oboFnRate).toBe(0);
    expect(report.oboFpRate).toBe(0);
  });

  it('handles corpus with no OBO-expected skills', () => {
    const noOboCorpus = TEST_CORPUS.filter(s => !s.expectedObo).slice(0, 3);
    const report = runAccuracyValidation(noOboCorpus);
    expect(report.oboFnRate).toBe(0);
    expect(report.total).toBe(3);
  });

  it('handles corpus with all OBO-expected skills', () => {
    const allOboCorpus = TEST_CORPUS.filter(s => s.expectedObo);
    const report = runAccuracyValidation(allOboCorpus);
    expect(report.oboFpRate).toBe(0);
  });
});

describe('formatAccuracyReport() failure paths', () => {
  it('shows FAIL and failing checks when accuracy is below threshold', () => {
    const failingReport: AccuracyReport = {
      total: 4,
      withinOne: 1,
      accuracy: 0.25,
      exactMatches: 0,
      oboFalseNegatives: 1,
      oboFalsePositives: 1,
      oboFnRate: 0.50,
      oboFpRate: 0.50,
      allPassed: false,
      results: [
        {
          skill: TEST_CORPUS[0]!,
          annotation: {
            name: TEST_CORPUS[0]!.name,
            riskClass: 5,
            riskConfidence: 0.5,
            obo: { detected: false, confidence: 0, matchedPatterns: [] },
            dataClassification: 'public',
            evidence: [],
          },
          riskWithinOne: false,
          oboCorrect: true,
          riskDelta: 4,
        },
        {
          skill: TEST_CORPUS[5]!,
          annotation: {
            name: TEST_CORPUS[5]!.name,
            riskClass: 5,
            riskConfidence: 0.5,
            obo: { detected: true, confidence: 0.8, matchedPatterns: ['behalf'] },
            dataClassification: 'public',
            evidence: [],
          },
          riskWithinOne: false,
          oboCorrect: true,
          riskDelta: 3,
        },
        {
          skill: { ...TEST_CORPUS[15]!, expectedObo: true },
          annotation: {
            name: TEST_CORPUS[15]!.name,
            riskClass: 4,
            riskConfidence: 0.5,
            obo: { detected: false, confidence: 0, matchedPatterns: [] },
            dataClassification: 'public',
            evidence: [],
          },
          riskWithinOne: true,
          oboCorrect: false,
          riskDelta: 0,
        },
        {
          skill: TEST_CORPUS[10]!,
          annotation: {
            name: TEST_CORPUS[10]!.name,
            riskClass: 3,
            riskConfidence: 0.5,
            obo: { detected: false, confidence: 0, matchedPatterns: [] },
            dataClassification: 'public',
            evidence: [],
          },
          riskWithinOne: false,
          oboCorrect: true,
          riskDelta: 2,
        },
      ],
    };

    const text = formatAccuracyReport(failingReport);
    expect(text).toContain('FAIL');
    expect(text).toContain('Failing checks:');
    expect(text).toContain('Accuracy');
    expect(text).toContain('OBO FN rate');
    expect(text).toContain('OBO FP rate');
    expect(text).toContain('Misclassified skills:');
    expect(text).toContain('risk: expected');
    expect(text).toContain('obo: expected');
  });

  it('shows only relevant failing checks when some bounds pass', () => {
    // Only OBO FP fails — accuracy and FN pass
    const partialFailReport: AccuracyReport = {
      total: 2,
      withinOne: 2,
      accuracy: 1.0,
      exactMatches: 2,
      oboFalseNegatives: 0,
      oboFalsePositives: 1,
      oboFnRate: 0.0,
      oboFpRate: 0.50,
      allPassed: false,
      results: [
        {
          skill: TEST_CORPUS[0]!,
          annotation: {
            name: TEST_CORPUS[0]!.name,
            riskClass: 1,
            riskConfidence: 0.5,
            obo: { detected: true, confidence: 0.5, matchedPatterns: ['proxy'] },
            dataClassification: 'public',
            evidence: [],
          },
          riskWithinOne: true,
          oboCorrect: false,
          riskDelta: 0,
        },
        {
          skill: TEST_CORPUS[1]!,
          annotation: {
            name: TEST_CORPUS[1]!.name,
            riskClass: 1,
            riskConfidence: 0.5,
            obo: { detected: false, confidence: 0, matchedPatterns: [] },
            dataClassification: 'public',
            evidence: [],
          },
          riskWithinOne: true,
          oboCorrect: true,
          riskDelta: 0,
        },
      ],
    };

    const text = formatAccuracyReport(partialFailReport);
    expect(text).toContain('FAIL');
    expect(text).toContain('OBO FP rate');
    expect(text).not.toContain('Accuracy 100.0%');
    expect(text).not.toContain('OBO FN rate');
  });
});
