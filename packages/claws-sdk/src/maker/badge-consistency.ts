/**
 * Badge inconsistency detection — flags contradictions in governance
 * metadata before badge generation.
 *
 * Inconsistency rules:
 * - BADGE-IC-001: R1 (minimal risk) + OBO transact capability.
 *   Low-risk skills shouldn't act on behalf of users for financial
 *   transactions. Either the risk is under-declared or OBO is wrong.
 * - BADGE-IC-002: CONFIDENTIAL data label + DECLARED tier.
 *   Sensitive data should require at least TYPED governance — relying
 *   on self-reported attestation for confidential data is a red flag.
 *
 * @module claws-sdk/maker/badge-consistency
 */

import type { GovernanceTier, RiskLevel } from './types.js';
import type { BadgeInconsistency } from './badge-types.js';

// ── Consistency Input ───────────────────────────────────────────────

/**
 * Input for inconsistency detection.
 */
export interface ConsistencyInput {
  /** Governance tier. */
  readonly tier: GovernanceTier;
  /** Risk level (1-5). */
  readonly risk: RiskLevel;
  /** Whether OBO governance is enabled. */
  readonly obo: boolean;
  /** OBO scope description. */
  readonly oboScope: string;
  /** Data classification labels. */
  readonly dataLabels: readonly string[];
}

// ── Detection ───────────────────────────────────────────────────────

/**
 * Detect governance metadata inconsistencies.
 *
 * Returns an array of inconsistencies (empty if none found).
 * Each inconsistency has a machine-readable code and human message.
 */
export function detectInconsistencies(input: ConsistencyInput): readonly BadgeInconsistency[] {
  const inconsistencies: BadgeInconsistency[] = [];

  // BADGE-IC-001: R1 + OBO transact contradiction
  if (input.risk === 1 && input.obo && hasTransactScope(input.oboScope)) {
    inconsistencies.push({
      code: 'BADGE-IC-001',
      message: 'R1 (minimal risk) skill claims OBO transact capability — risk level may be under-declared',
      severity: 'warning',
    });
  }

  // BADGE-IC-002: CONFIDENTIAL data + DECLARED tier mismatch
  if (input.tier === 'DECLARED' && hasConfidentialLabel(input.dataLabels)) {
    inconsistencies.push({
      code: 'BADGE-IC-002',
      message: 'CONFIDENTIAL data label with DECLARED tier — sensitive data should require at least TYPED governance',
      severity: 'error',
    });
  }

  return inconsistencies;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Check if the OBO scope contains a transact-type capability.
 */
function hasTransactScope(oboScope: string): boolean {
  const lower = oboScope.toLowerCase();
  return lower.includes('transact') || lower.includes('payment') || lower.includes('purchase');
}

/**
 * Check if data labels include CONFIDENTIAL classification.
 */
function hasConfidentialLabel(dataLabels: readonly string[]): boolean {
  return dataLabels.some(
    label => label.toUpperCase() === 'CONFIDENTIAL',
  );
}
