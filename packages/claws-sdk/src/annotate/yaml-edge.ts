/**
 * YAML edge-case handling for governance metadata (P-229).
 *
 * Handles three categories of YAML edge cases:
 * 1. None/null disambiguation — YAML `None` is a governance value, not null
 * 2. Case normalization — "r1", "R1", "risk-1" all normalize to canonical "R1"
 * 3. Levenshtein closest-value matching — "R6", "risk_high" get suggestions
 *
 * @module claws-sdk/annotate/yaml-edge
 */

import type { ToolRiskClass } from '../compile/types.js';

// ── Canonical Values ──────────────────────────────────────────────────

/**
 * Canonical risk labels keyed by risk class.
 */
const CANONICAL_RISK_LABELS: ReadonlyMap<ToolRiskClass, string> = new Map([
  [1, 'R1'],
  [2, 'R2'],
  [3, 'R3'],
  [4, 'R4'],
  [5, 'R5'],
]);

/**
 * All canonical risk label strings.
 */
const CANONICAL_LABELS: readonly string[] = ['R1', 'R2', 'R3', 'R4', 'R5'];

/**
 * Known alias patterns that map to canonical risk labels.
 */
const RISK_ALIASES: ReadonlyMap<string, ToolRiskClass> = new Map([
  // Numeric
  ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5],
  // R-prefixed (lowercase handled by case normalization)
  ['r1', 1], ['r2', 2], ['r3', 3], ['r4', 4], ['r5', 5],
  // risk-N
  ['risk-1', 1], ['risk-2', 2], ['risk-3', 3], ['risk-4', 4], ['risk-5', 5],
  // risk_N
  ['risk_1', 1], ['risk_2', 2], ['risk_3', 3], ['risk_4', 4], ['risk_5', 5],
  // Named levels
  ['low', 1], ['medium', 2], ['moderate', 3], ['high', 4], ['critical', 5],
  // risk-named
  ['risk-low', 1], ['risk-medium', 2], ['risk-moderate', 3], ['risk-high', 4], ['risk-critical', 5],
]);

// ── None/Null Disambiguation (P-229) ──────────────────────────────────

/**
 * Result of YAML None/null disambiguation.
 */
export interface YamlDisambiguationResult {
  /** The resolved value (never null when input was YAML "None" meaning a governance value). */
  readonly value: string;
  /** Whether the input was a YAML null/None that was disambiguated. */
  readonly wasDisambiguated: boolean;
  /** Original raw input for traceability. */
  readonly rawInput: string | null | undefined;
}

/**
 * Disambiguate YAML None/null values in governance metadata.
 *
 * YAML parsers interpret bare `None` as `null`. In governance metadata,
 * "None" is a valid risk classification meaning "no risk assigned yet"
 * — not a null literal. This function detects the ambiguity and
 * resolves it to the governance meaning.
 *
 * @param value - Raw value from YAML parse (may be null, undefined, or string)
 * @param fieldName - The metadata field name (for context-aware disambiguation)
 * @returns Disambiguation result with resolved value
 */
export function disambiguateYamlNone(
  value: string | null | undefined,
  fieldName: string,
): YamlDisambiguationResult {
  const riskFields = ['risk', 'risk-level', 'risk_level', 'riskLevel', 'heuristic-risk'];

  // If value is undefined, no disambiguation possible
  if (value === undefined) {
    return {
      value: 'None',
      wasDisambiguated: false,
      rawInput: undefined,
    };
  }

  // If value is null and field is a risk/governance field,
  // this is likely YAML `None` → null, meaning "None" the governance value
  if (value === null) {
    const isRiskField = riskFields.includes(fieldName);
    return {
      value: isRiskField ? 'None' : '',
      wasDisambiguated: isRiskField,
      rawInput: null,
    };
  }

  // String value — pass through
  return {
    value,
    wasDisambiguated: false,
    rawInput: value,
  };
}

// ── Case Normalization ────────────────────────────────────────────────

/**
 * Result of normalizing a risk label.
 */
export interface NormalizeResult {
  /** Canonical risk label (e.g., "R3") or original if unrecognized. */
  readonly canonical: string;
  /** Corresponding risk class, or undefined if not recognized. */
  readonly riskClass: ToolRiskClass | undefined;
  /** Whether the input was normalized (i.e., differed from canonical). */
  readonly wasNormalized: boolean;
}

/**
 * Normalize a governance risk label to canonical form.
 *
 * Handles case variations ("r1"→"R1"), numbered forms ("risk-3"→"R3"),
 * and named levels ("high"→"R4"). Returns the original value if
 * no canonical match is found.
 *
 * @param raw - Raw risk label from YAML or user input
 * @returns Normalization result with canonical label
 */
export function normalizeRiskLabel(raw: string): NormalizeResult {
  const lowered = raw.trim().toLowerCase();

  // Direct alias lookup
  const riskClass = RISK_ALIASES.get(lowered);
  if (riskClass !== undefined) {
    const canonical = CANONICAL_RISK_LABELS.get(riskClass)!;
    return {
      canonical,
      riskClass,
      wasNormalized: canonical !== raw.trim(),
    };
  }

  // Not recognized — return as-is
  const trimmed = raw.trim();
  return { canonical: trimmed, riskClass: undefined, wasNormalized: false };
}

// ── Levenshtein Closest-Value Matching ────────────────────────────────

/**
 * A suggestion for a near-miss governance value.
 */
export interface LevenshteinSuggestion {
  /** The input value that didn't match. */
  readonly input: string;
  /** The closest canonical value. */
  readonly suggestion: string;
  /** Edit distance between input and suggestion. */
  readonly distance: number;
}

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * Uses the standard dynamic-programming approach. Both strings are
 * compared case-insensitively.
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const m = la.length;
  const n = lb.length;

  // Edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Single row DP
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cost = la[i - 1] === lb[j - 1] ? 0 : 1;
      const val = Math.min(
        row[j]! + 1,       // deletion
        prev + 1,           // insertion
        row[j - 1]! + cost, // substitution
      );
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n]!;
}

/**
 * Find the closest canonical risk label for a near-miss input.
 *
 * Returns a suggestion when the input doesn't match any known alias
 * but is within edit distance 3 of a canonical label or alias.
 * Returns undefined if the input is recognized or too far from any match.
 *
 * When multiple labels have equal edit distance, prefer the one whose
 * numeric risk class is closest to any number found in the input.
 *
 * @param input - Unrecognized risk label
 * @returns Closest-value suggestion, or undefined if no close match
 */
export function suggestClosestRiskLabel(input: string): LevenshteinSuggestion | undefined {
  const normalized = normalizeRiskLabel(input);
  if (normalized.riskClass !== undefined) {
    // Already recognized — no suggestion needed
    return undefined;
  }

  const trimmed = input.trim();

  // Extract a numeric hint from the input (e.g., "R6" → 6, "risk_high" → undefined)
  const numericHint = extractNumericHint(trimmed);

  interface Candidate {
    label: string;
    riskClass: ToolRiskClass;
    distance: number;
  }

  const candidates: Candidate[] = [];

  // Check against canonical labels
  for (const [rc, label] of CANONICAL_RISK_LABELS) {
    const d = levenshteinDistance(trimmed, label);
    candidates.push({ label, riskClass: rc, distance: d });
  }

  // Also check against well-known aliases
  const aliases: Array<[string, ToolRiskClass]> = [
    ['low', 1], ['medium', 2], ['moderate', 3], ['high', 4], ['critical', 5],
    ['risk-1', 1], ['risk-2', 2], ['risk-3', 3], ['risk-4', 4], ['risk-5', 5],
    ['risk-low', 1], ['risk-medium', 2], ['risk-moderate', 3], ['risk-high', 4], ['risk-critical', 5],
  ];

  for (const [alias, rc] of aliases) {
    const d = levenshteinDistance(trimmed, alias);
    candidates.push({ label: CANONICAL_RISK_LABELS.get(rc)!, riskClass: rc, distance: d });
  }

  // Sort: by distance first, then by numeric proximity to hint (or highest risk class)
  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (numericHint !== undefined) {
      // Prefer the candidate closest to the numeric hint
      return Math.abs(a.riskClass - numericHint) - Math.abs(b.riskClass - numericHint);
    }
    // No numeric hint — prefer higher risk (conservative)
    return b.riskClass - a.riskClass;
  });

  const best = candidates[0];
  if (best && best.distance <= 3 && best.distance > 0) {
    return {
      input: trimmed,
      suggestion: best.label,
      distance: best.distance,
    };
  }

  return undefined;
}

/**
 * Extract a numeric risk hint from an input string.
 * Returns the first digit found, or undefined if no digit present.
 */
function extractNumericHint(input: string): number | undefined {
  const match = input.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return undefined;
}
