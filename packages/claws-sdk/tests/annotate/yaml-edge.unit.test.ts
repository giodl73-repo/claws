/**
 * L0: YAML edge-case handling — None/null disambiguation, case normalization,
 * Levenshtein closest-value matching.
 */

import { describe, it, expect } from 'vitest';
import {
  disambiguateYamlNone,
  normalizeRiskLabel,
  levenshteinDistance,
  suggestClosestRiskLabel,
} from '../../src/annotate/yaml-edge.js';

describe('disambiguateYamlNone()', () => {
  it('treats null on risk field as YAML None governance value', () => {
    const result = disambiguateYamlNone(null, 'risk');
    expect(result.value).toBe('None');
    expect(result.wasDisambiguated).toBe(true);
    expect(result.rawInput).toBeNull();
  });

  it('treats null on risk-level field as YAML None', () => {
    const result = disambiguateYamlNone(null, 'risk-level');
    expect(result.value).toBe('None');
    expect(result.wasDisambiguated).toBe(true);
  });

  it('does not disambiguate null on non-risk fields', () => {
    const result = disambiguateYamlNone(null, 'name');
    expect(result.value).toBe('');
    expect(result.wasDisambiguated).toBe(false);
  });

  it('passes through string values unchanged', () => {
    const result = disambiguateYamlNone('R3', 'risk');
    expect(result.value).toBe('R3');
    expect(result.wasDisambiguated).toBe(false);
    expect(result.rawInput).toBe('R3');
  });

  it('handles undefined gracefully', () => {
    const result = disambiguateYamlNone(undefined, 'risk');
    expect(result.value).toBe('None');
    expect(result.wasDisambiguated).toBe(false);
    expect(result.rawInput).toBeUndefined();
  });
});

describe('normalizeRiskLabel()', () => {
  it('normalizes lowercase "r1" to "R1"', () => {
    const result = normalizeRiskLabel('r1');
    expect(result.canonical).toBe('R1');
    expect(result.riskClass).toBe(1);
    expect(result.wasNormalized).toBe(true);
  });

  it('normalizes "risk-3" to "R3"', () => {
    const result = normalizeRiskLabel('risk-3');
    expect(result.canonical).toBe('R3');
    expect(result.riskClass).toBe(3);
    expect(result.wasNormalized).toBe(true);
  });

  it('normalizes named level "high" to "R4"', () => {
    const result = normalizeRiskLabel('high');
    expect(result.canonical).toBe('R4');
    expect(result.riskClass).toBe(4);
    expect(result.wasNormalized).toBe(true);
  });

  it('normalizes "critical" to "R5"', () => {
    const result = normalizeRiskLabel('critical');
    expect(result.canonical).toBe('R5');
    expect(result.riskClass).toBe(5);
  });

  it('leaves canonical "R2" unchanged', () => {
    const result = normalizeRiskLabel('R2');
    expect(result.canonical).toBe('R2');
    expect(result.riskClass).toBe(2);
    expect(result.wasNormalized).toBe(false);
  });

  it('returns undefined riskClass for unrecognized values', () => {
    const result = normalizeRiskLabel('banana');
    expect(result.canonical).toBe('banana');
    expect(result.riskClass).toBeUndefined();
  });

  it('normalizes "risk_2" to "R2"', () => {
    const result = normalizeRiskLabel('risk_2');
    expect(result.canonical).toBe('R2');
    expect(result.riskClass).toBe(2);
    expect(result.wasNormalized).toBe(true);
  });
});

describe('levenshteinDistance()', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('R1', 'R1')).toBe(0);
  });

  it('returns correct distance for single substitution', () => {
    expect(levenshteinDistance('R1', 'R2')).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(levenshteinDistance('R1', 'r1')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('computes distance for "R6" to "R5"', () => {
    expect(levenshteinDistance('R6', 'R5')).toBe(1);
  });
});

describe('suggestClosestRiskLabel()', () => {
  it('suggests "R5" for near-miss "R6"', () => {
    const result = suggestClosestRiskLabel('R6');
    expect(result).toBeDefined();
    expect(result!.suggestion).toBe('R5');
    expect(result!.distance).toBe(1);
  });

  it('suggests closest for "risk_high"', () => {
    const result = suggestClosestRiskLabel('risk_high');
    expect(result).toBeDefined();
    expect(result!.suggestion).toBe('R4');
    expect(result!.distance).toBeLessThanOrEqual(3);
  });

  it('returns undefined for recognized values', () => {
    const result = suggestClosestRiskLabel('R3');
    expect(result).toBeUndefined();
  });

  it('returns undefined for values too far from any canonical', () => {
    const result = suggestClosestRiskLabel('xyzzy-nonsense-value');
    expect(result).toBeUndefined();
  });

  it('suggests "R1" for "R0"', () => {
    const result = suggestClosestRiskLabel('R0');
    expect(result).toBeDefined();
    expect(result!.suggestion).toBe('R1');
  });
});
