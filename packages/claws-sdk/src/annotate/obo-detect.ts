/**
 * OBO (on-behalf-of) detection from tool names and descriptions.
 *
 * Scans tool names and description text for OBO-indicative patterns
 * ("as user", "on behalf", "impersonate", etc.) and returns matches
 * with confidence scores.
 *
 * @module claws-sdk/annotate/obo-detect
 */

import type { ConfidenceEvidence } from './confidence.js';
import { combineConfidence } from './confidence.js';

/**
 * Result of OBO detection on a single tool.
 */
export interface OboDetectionResult {
  /** Whether OBO was detected. */
  readonly detected: boolean;
  /** Combined confidence score (0.0–1.0). */
  readonly confidence: number;
  /** Matched patterns that triggered detection. */
  readonly matchedPatterns: readonly string[];
}

/**
 * OBO keyword pattern with its weight.
 */
interface OboPattern {
  /** Regex to match against text (case-insensitive). */
  readonly regex: RegExp;
  /** Pattern label for reporting. */
  readonly label: string;
  /** Confidence weight (0.0–1.0). */
  readonly weight: number;
}

/**
 * OBO patterns ordered by specificity (most specific first).
 */
const OBO_PATTERNS: readonly OboPattern[] = [
  { regex: /on\s+behalf\s+of/i, label: 'on behalf of', weight: 0.90 },
  { regex: /as\s+(?:the\s+)?user/i, label: 'as user', weight: 0.85 },
  { regex: /impersonat/i, label: 'impersonate', weight: 0.95 },
  { regex: /delegate[ds]?\s+to/i, label: 'delegates to', weight: 0.70 },
  { regex: /act(?:s|ing)?\s+(?:as|for)/i, label: 'acts as/for', weight: 0.75 },
  { regex: /behalf/i, label: 'behalf', weight: 0.60 },
  { regex: /proxy/i, label: 'proxy', weight: 0.55 },
  { regex: /represent/i, label: 'represent', weight: 0.50 },
];

/**
 * Detect OBO patterns in a tool's name and description.
 *
 * @param toolName - The tool name (e.g., "send-email")
 * @param description - The tool description text
 * @returns Detection result with confidence and matched patterns
 */
export function detectObo(toolName: string, description: string): OboDetectionResult {
  const text = `${toolName} ${description}`;
  const evidence: ConfidenceEvidence[] = [];
  const matchedPatterns: string[] = [];

  for (const pattern of OBO_PATTERNS) {
    if (pattern.regex.test(text)) {
      evidence.push({ source: pattern.label, weight: pattern.weight });
      matchedPatterns.push(pattern.label);
    }
  }

  if (evidence.length === 0) {
    return { detected: false, confidence: 0.0, matchedPatterns: [] };
  }

  const result = combineConfidence(evidence);
  return {
    detected: true,
    confidence: result.score,
    matchedPatterns,
  };
}
