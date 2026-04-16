/**
 * Badge metadata generation — tier-aware qualifiers, supply chain badge,
 * and pre-badge handling.
 *
 * Badge GENERATION lives in claws-sdk (the `claws` namespace).
 * Badge RENDERING for ClawHub display is a `clawhub` concern — not here.
 *
 * Tier-aware qualifiers:
 * - DECLARED → "self-reported" — attestation, not verification
 * - TYPED → no qualifier — decorators present, type-checked
 * - VERIFIED → "verified" — fully compiled, all checks passing
 *
 * Supply chain badge is independent of governance tier: a DECLARED skill
 * can be signed, and a VERIFIED skill can be unsigned.
 *
 * @module claws-sdk/maker/badge
 */

import type { GovernanceTier, RiskLevel } from './types.js';
import type { SignatureStatus } from './manifest.js';
import type {
  BadgeMetadata,
  BadgeQualifier,
  BadgeStaleness,
  PreBadge,
  SupplyChainBadge,
} from './badge-types.js';
import { detectInconsistencies } from './badge-consistency.js';

// ── Qualifier Resolution ────────────────────────────────────────────

/**
 * Resolve the tier-aware badge qualifier.
 *
 * - DECLARED → "self-reported"
 * - TYPED → null (no qualifier)
 * - VERIFIED → "verified"
 */
export function resolveQualifier(tier: GovernanceTier): BadgeQualifier {
  switch (tier) {
    case 'DECLARED':
      return 'self-reported';
    case 'TYPED':
      return null;
    case 'VERIFIED':
      return 'verified';
  }
}

// ── Supply Chain Badge ──────────────────────────────────────────────

/**
 * Build the supply chain badge from manifest signature status.
 *
 * Independent of governance tier — a DECLARED skill can be signed
 * (manifest is signed even though governance is self-reported).
 */
export function buildSupplyChainBadge(signatureStatus: SignatureStatus): SupplyChainBadge {
  return {
    signed: signatureStatus === 'signed',
    signatureStatus,
  };
}

// ── Badge Input ─────────────────────────────────────────────────────

/**
 * Input for badge metadata generation.
 */
export interface BadgeGenerationInput {
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
  /** Manifest signature status. */
  readonly signatureStatus: SignatureStatus;
  /** Badge staleness (default: 'current'). */
  readonly staleness?: BadgeStaleness | undefined;
}

// ── Badge Generation ────────────────────────────────────────────────

/**
 * Generate badge metadata for a skill.
 *
 * Returns full BadgeMetadata with tier-aware qualifier, supply chain
 * badge, and inconsistency detection. Pre-badge skills should use
 * {@link preBadge} instead — absence of badge, not error badge.
 */
export function generateBadgeMetadata(input: BadgeGenerationInput): BadgeMetadata {
  const qualifier = resolveQualifier(input.tier);
  const supplyChain = buildSupplyChainBadge(input.signatureStatus);
  const inconsistencies = detectInconsistencies({
    tier: input.tier,
    risk: input.risk,
    obo: input.obo,
    oboScope: input.oboScope,
    dataLabels: input.dataLabels,
  });

  return {
    tier: input.tier,
    qualifier,
    risk: input.risk,
    obo: input.obo,
    oboScope: input.oboScope,
    dataLabels: input.dataLabels,
    supplyChain,
    staleness: input.staleness ?? 'current',
    inconsistencies,
    generatedAt: new Date().toISOString(),
  };
}

// ── Pre-badge ───────────────────────────────────────────────────────

/**
 * Return the pre-badge sentinel.
 *
 * Skills that haven't been through the badge pipeline render with
 * no badge (not an error badge). Absence of badge is distinct from
 * failed badge.
 */
export function preBadge(): PreBadge {
  return null;
}
