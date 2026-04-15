/**
 * L3: Annotation accuracy acceptance test.
 *
 * Runs the full 20-skill corpus through the annotate engine and validates:
 * - >=85% accuracy within 1 R-level
 * - OBO false-negative rate <3%
 * - OBO false-positive rate <15%
 * - YAML None/null disambiguation (P-229)
 * - Case normalization
 * - Near-miss Levenshtein suggestions
 * - Remediation doc URLs include version
 * - `claws annotate --dry-run` matches live annotations
 */

import { describe, it, expect } from 'vitest';
import {
  runAccuracyValidation,
  ACCURACY_THRESHOLD,
  OBO_FALSE_NEGATIVE_MAX,
  OBO_FALSE_POSITIVE_MAX,
  formatAccuracyReport,
} from '../../src/annotate/accuracy.js';
import { TEST_CORPUS, validateCorpusDistribution } from '../../src/annotate/corpus/index.js';
import { analyzeHeuristics, formatAnnotation } from '../../src/annotate/heuristics.js';
import {
  disambiguateYamlNone,
  normalizeRiskLabel,
  suggestClosestRiskLabel,
} from '../../src/annotate/yaml-edge.js';
import {
  remediateInvalidRiskLabel,
  buildDocUrl,
  getClawsVersion,
} from '../../src/annotate/remediation.js';

describe('Annotation accuracy acceptance', () => {
  it('full 20-skill corpus: accuracy, OBO rates, YAML edge cases, remediation', () => {
    // ── Corpus validation ────────────────────────────────────────────
    const dist = validateCorpusDistribution();
    expect(dist.valid).toBe(true);
    expect(TEST_CORPUS).toHaveLength(20);

    // ── Accuracy validation ──────────────────────────────────────────
    const report = runAccuracyValidation();

    expect(report.accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    expect(report.oboFnRate).toBeLessThan(OBO_FALSE_NEGATIVE_MAX);
    expect(report.oboFpRate).toBeLessThan(OBO_FALSE_POSITIVE_MAX);
    expect(report.allPassed).toBe(true);

    // Report should be formattable
    const text = formatAccuracyReport(report);
    expect(text).toContain('PASS');

    // ── YAML None/null disambiguation (P-229) ────────────────────────
    const noneResult = disambiguateYamlNone(null, 'risk');
    expect(noneResult.wasDisambiguated).toBe(true);
    expect(noneResult.value).toBe('None');

    // Non-risk field null should not disambiguate
    const nonRiskNull = disambiguateYamlNone(null, 'name');
    expect(nonRiskNull.wasDisambiguated).toBe(false);

    // ── Case normalization ───────────────────────────────────────────
    const caseVariants = [
      { input: 'r1', expected: 'R1' },
      { input: 'R1', expected: 'R1' },
      { input: 'risk-1', expected: 'R1' },
      { input: 'risk_4', expected: 'R4' },
      { input: 'high', expected: 'R4' },
      { input: 'critical', expected: 'R5' },
    ];
    for (const v of caseVariants) {
      const result = normalizeRiskLabel(v.input);
      expect(result.canonical).toBe(v.expected);
      expect(result.riskClass).toBeDefined();
    }

    // ── Near-miss Levenshtein suggestions ────────────────────────────
    const nearMisses = [
      { input: 'R6', expected: 'R5' },
      { input: 'R0', expected: 'R1' },
    ];
    for (const nm of nearMisses) {
      const suggestion = suggestClosestRiskLabel(nm.input);
      expect(suggestion).toBeDefined();
      expect(suggestion!.suggestion).toBe(nm.expected);
    }

    // ── Remediation doc URLs include version ─────────────────────────
    const hint = remediateInvalidRiskLabel('R6');
    expect(hint.docUrl).toContain(getClawsVersion());
    const docUrl = buildDocUrl('docs/claws/annotate.md');
    expect(docUrl).toMatch(new RegExp(`v${getClawsVersion().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    // ── dry-run annotations match live annotations ───────────────────
    for (const skill of TEST_CORPUS) {
      const annotation = analyzeHeuristics(
        skill.name,
        skill.description,
        skill.sourceContent,
      );
      // formatAnnotation (dry-run output) should show same risk as annotation
      const formatted = formatAnnotation(annotation);
      expect(formatted).toContain(`R${annotation.riskClass}`);
      expect(formatted).toContain(skill.name);
    }
  });
});
