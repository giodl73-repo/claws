/**
 * OBO auto-suggestion for skill scaffolding.
 *
 * Reuses the annotate heuristics from `claws annotate` (P31) to detect
 * skill names that imply on-behalf-of operations. When detected, produces
 * hint lines for injection into the generated skill handler.
 *
 * @module claws-sdk/scaffold/obo-suggest
 */

import { detectObo } from '../annotate/obo-detect.js';

/**
 * OBO keyword patterns that indicate a skill acts on behalf of a user.
 * These are the name-level patterns from the annotate heuristics (P31).
 */
const OBO_NAME_KEYWORDS: readonly { regex: RegExp; label: string }[] = [
  { regex: /\bsend\b/i, label: 'send' },
  { regex: /\bemail\b/i, label: 'email' },
  { regex: /\bpurchas/i, label: 'purchase' },
  { regex: /\bschedul/i, label: 'schedule' },
];

/**
 * Result of OBO auto-suggestion for a skill name.
 */
export interface OboSuggestionResult {
  /** Whether OBO patterns were detected in the skill name. */
  readonly detected: boolean;
  /** Matched keyword labels. */
  readonly matchedKeywords: readonly string[];
  /** Hint lines to inject as comments in the generated handler. */
  readonly hints: readonly string[];
}

/**
 * Detect OBO patterns in a skill name and produce suggestion hints.
 *
 * Uses two detection layers:
 * 1. Keyword matching against OBO_NAME_KEYWORDS (send, email, purchase, schedule)
 * 2. Full OBO detection via the annotate engine's `detectObo` (on-behalf-of, proxy, etc.)
 *
 * @param skillName - The skill name (e.g., "send-invoice", "search-docs")
 * @returns OBO suggestion result with hints for injection
 */
export function detectOboFromName(skillName: string): OboSuggestionResult {
  const matchedKeywords: string[] = [];

  // Layer 1: keyword matching
  for (const pattern of OBO_NAME_KEYWORDS) {
    if (pattern.regex.test(skillName)) {
      matchedKeywords.push(pattern.label);
    }
  }

  // Layer 2: full OBO detection from annotate heuristics
  const oboResult = detectObo(skillName, '');

  const detected = matchedKeywords.length > 0 || oboResult.detected;

  if (!detected) {
    return { detected: false, matchedKeywords: [], hints: [] };
  }

  const hints: string[] = [];
  if (matchedKeywords.length > 0) {
    hints.push(`Detected OBO keywords: ${matchedKeywords.join(', ')}`);
  }
  if (oboResult.detected) {
    hints.push(`Detected OBO patterns: ${oboResult.matchedPatterns.join(', ')}`);
  }
  hints.push('Add @Obo() decorator to require explicit user consent');
  hints.push('Add obo: true to skill.yaml for governance tracking');

  return { detected, matchedKeywords, hints };
}
