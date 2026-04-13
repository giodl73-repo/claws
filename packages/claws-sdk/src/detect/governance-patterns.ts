/**
 * Shared OpenClaw governance keyword patterns and threshold.
 *
 * Used by both the marker-registry validator and the openclaw marker
 * detector to distinguish governance SOUL.md files from generic
 * company-culture documents.
 *
 * @module claws-sdk/detect/governance-patterns
 */

/**
 * Governance keywords that distinguish an OpenClaw SOUL.md from a
 * generic company-culture SOUL.md.
 */
export const GOVERNANCE_PATTERNS: readonly RegExp[] = [
  /\bmust\s+not\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\btool\s+declaration/i,
  /\btrust\s+tier/i,
  /\bgovernance\b/i,
  /\benforcement\b/i,
  /\bagent[s]?\s+(must|should|shall)\b/i,
];

/**
 * Minimum number of governance keyword matches required to consider
 * a SOUL.md as OpenClaw governance rather than a mission statement.
 */
export const MIN_GOVERNANCE_HITS = 2;
