/**
 * L2: Annotate corpus skills → validate annotations match expectations.
 * YAML edge case round-trip: None/null/case-variant/near-miss governance
 * values → annotate → verify normalization → verify Levenshtein suggestions
 * → verify remediation messages in error output.
 */

import { describe, it, expect } from 'vitest';
import { analyzeHeuristics, formatAnnotation, toFrontmatterAnnotations } from '../../src/annotate/heuristics.js';
import { TEST_CORPUS } from '../../src/annotate/corpus/index.js';
import {
  disambiguateYamlNone,
  normalizeRiskLabel,
  suggestClosestRiskLabel,
} from '../../src/annotate/yaml-edge.js';
import {
  remediateInvalidRiskLabel,
  formatRemediation,
  getClawsVersion,
} from '../../src/annotate/remediation.js';
import {
  runAccuracyValidation,
} from '../../src/annotate/accuracy.js';

describe('corpus annotation → scaffold → check round-trip', () => {
  it('annotates all corpus skills and produces valid frontmatter annotations', () => {
    for (const skill of TEST_CORPUS) {
      const annotation = analyzeHeuristics(
        skill.name,
        skill.description,
        skill.sourceContent,
      );

      // Every annotation should produce valid frontmatter
      const fm = toFrontmatterAnnotations(annotation);
      expect(fm['risk']).toMatch(/^R[1-5]$/);
      expect(fm['risk-confidence']).toBeGreaterThanOrEqual(0.0);
      expect(fm['risk-confidence']).toBeLessThanOrEqual(1.0);

      // Format should include name and risk
      const formatted = formatAnnotation(annotation);
      expect(formatted).toContain(skill.name);
      expect(formatted).toMatch(/R[1-5]/);
    }
  });

  it('annotation accuracy passes all bounds on full corpus', () => {
    const report = runAccuracyValidation();
    expect(report.allPassed).toBe(true);
    expect(report.total).toBe(20);
  });
});

describe('YAML edge case round-trip', () => {
  it('round-trips None/null disambiguation through annotation pipeline', () => {
    // Simulate YAML parsing `risk: None` → null
    const disambiguated = disambiguateYamlNone(null, 'risk');
    expect(disambiguated.wasDisambiguated).toBe(true);
    expect(disambiguated.value).toBe('None');

    // The "None" value should not match any canonical risk label
    const normalized = normalizeRiskLabel(disambiguated.value);
    expect(normalized.riskClass).toBeUndefined();

    // Should get a remediation hint suggesting to run claws annotate
    const hint = remediateInvalidRiskLabel(disambiguated.value);
    expect(hint.message).toContain('Or run: claws annotate');
  });

  it('round-trips case variants through normalization', () => {
    const variants = ['r1', 'R1', 'risk-1', 'risk_1', 'low'];
    for (const variant of variants) {
      const result = normalizeRiskLabel(variant);
      expect(result.canonical).toBe('R1');
      expect(result.riskClass).toBe(1);
    }
  });

  it('round-trips near-miss values through Levenshtein → remediation', () => {
    const nearMisses: Array<{ input: string; expectedSuggestion: string }> = [
      { input: 'R6', expectedSuggestion: 'R5' },
      { input: 'R0', expectedSuggestion: 'R1' },
      { input: 'risk_high', expectedSuggestion: 'R4' },
    ];

    for (const nm of nearMisses) {
      // Levenshtein should find a suggestion
      const suggestion = suggestClosestRiskLabel(nm.input);
      expect(suggestion).toBeDefined();
      expect(suggestion!.suggestion).toBe(nm.expectedSuggestion);

      // Remediation should include the suggestion
      const hint = remediateInvalidRiskLabel(nm.input);
      expect(hint.message).toContain('Did you mean');
      expect(hint.message).toContain('Or run: claws annotate');

      // Formatted output should include doc URL with version
      const formatted = formatRemediation(hint);
      expect(formatted).toContain(getClawsVersion());
    }
  });

  it('handles completely invalid values gracefully', () => {
    const invalid = disambiguateYamlNone('xyzzy-garbage', 'risk');
    expect(invalid.wasDisambiguated).toBe(false);
    expect(invalid.value).toBe('xyzzy-garbage');

    const normalized = normalizeRiskLabel(invalid.value);
    expect(normalized.riskClass).toBeUndefined();

    // Too far for suggestion
    const suggestion = suggestClosestRiskLabel(invalid.value);
    expect(suggestion).toBeUndefined();

    // Remediation still works (just no suggestion)
    const hint = remediateInvalidRiskLabel(invalid.value);
    expect(hint.message).toContain('Or run: claws annotate');
    expect(hint.suggestion).toBeUndefined();
  });
});
