/**
 * Badge staleness detection — handler hash comparison, signature validation,
 * tier downgrade logic, and per-version badge storage.
 *
 * Staleness rules:
 * - Handler modification after VERIFIED build → downgrade to TYPED
 *   (decorators still present, but verified compilation is stale)
 * - Frontmatter-only edits preserve DECLARED tier (self-reported metadata)
 * - Per-version badge storage: each version has independent badge state
 * - Re-verification (claws build --skill) restores VERIFIED badge
 *
 * Pitfall coverage:
 * - P-226: Concurrent edits handled via read-then-compare (no locking)
 * - P-227: Per-version isolation — badge queries require explicit version
 *
 * @module claws-sdk/maker/badge-staleness
 */

import { sha256 } from './manifest.js';
import type { GovernanceTier } from './types.js';
import type { BadgeStaleness } from './badge-types.js';
import type { ClawsManifest } from './manifest.js';

// ── Handler Hash ────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of handler source content.
 */
export function computeHandlerHash(handlerContent: string): string {
  return sha256(handlerContent);
}

// ── Staleness Check Result ──────────────────────────────────────────

/**
 * Result of a staleness check for a single version.
 */
export interface StalenessCheckResult {
  /** Version checked. */
  readonly version: string;
  /** Whether the handler has been modified since the manifest was generated. */
  readonly handlerModified: boolean;
  /** Whether the frontmatter has been modified since the manifest was generated. */
  readonly frontmatterModified: boolean;
  /** Staleness state. */
  readonly staleness: BadgeStaleness;
  /** Original tier from manifest. */
  readonly originalTier: GovernanceTier;
  /** Effective tier after staleness evaluation. */
  readonly effectiveTier: GovernanceTier;
  /** Whether a downgrade occurred. */
  readonly downgraded: boolean;
}

// ── Staleness Detection ─────────────────────────────────────────────

/**
 * Input for staleness detection.
 */
export interface StalenessCheckInput {
  /** Current handler.ts content (source of truth). */
  readonly currentHandlerContent: string;
  /** Current SKILL.md frontmatter content. */
  readonly currentFrontmatterContent: string;
  /** Manifest from the published version. */
  readonly manifest: ClawsManifest;
  /** Handler hash stored at publish time. */
  readonly publishedHandlerHash: string;
  /** Frontmatter hash stored at publish time. */
  readonly publishedFrontmatterHash: string;
}

/**
 * Check whether a badge is stale for a specific version.
 *
 * Compares current handler and frontmatter hashes against the
 * stored hashes from publish time. Handler modification triggers
 * a VERIFIED→TYPED downgrade. Frontmatter-only edits preserve
 * DECLARED tier (self-reported metadata is expected to change).
 *
 * P-226: No file-level locking — read-then-compare is safe because
 * the worst case is a transient stale=true that resolves on next check.
 */
export function checkStaleness(input: StalenessCheckInput): StalenessCheckResult {
  const currentHandlerHash = computeHandlerHash(input.currentHandlerContent);
  const currentFrontmatterHash = sha256(input.currentFrontmatterContent);

  const handlerModified = currentHandlerHash !== input.publishedHandlerHash;
  const frontmatterModified = currentFrontmatterHash !== input.publishedFrontmatterHash;

  const originalTier = input.manifest.provenance.tier;
  let effectiveTier = originalTier;
  let downgraded = false;

  // Handler modification: VERIFIED → TYPED (decorators still present)
  if (handlerModified && originalTier === 'VERIFIED') {
    effectiveTier = 'TYPED';
    downgraded = true;
  }

  // Frontmatter-only edits: DECLARED stays DECLARED (self-reported)
  // No downgrade for frontmatter changes — this is by design.

  const staleness: BadgeStaleness = handlerModified ? 'stale' : 'current';

  return {
    version: input.manifest.publishedVersion,
    handlerModified,
    frontmatterModified,
    staleness,
    originalTier,
    effectiveTier,
    downgraded,
  };
}

// ── Per-Version Badge Store ─────────────────────────────────────────

/**
 * A per-version badge entry (P-227: version-isolated).
 */
export interface VersionBadgeEntry {
  /** Published version string. */
  readonly version: string;
  /** Governance tier at publish time. */
  readonly tier: GovernanceTier;
  /** Handler hash at publish time. */
  readonly handlerHash: string;
  /** Frontmatter hash at publish time. */
  readonly frontmatterHash: string;
  /** Badge staleness state. */
  readonly staleness: BadgeStaleness;
  /** Badge generation timestamp (ISO 8601). */
  readonly generatedAt: string;
}

/**
 * Per-version badge store — each version has independent badge state.
 *
 * P-227: Badge queries require an explicit version. No cross-version
 * leakage is possible because the store is keyed by version string.
 */
export class BadgeStore {
  private readonly entries: Map<string, VersionBadgeEntry> = new Map();

  /**
   * Store a badge entry for a specific version.
   *
   * P-226: Last-write-wins for concurrent edits to the same version.
   * This is intentional — the most recent publish is authoritative.
   */
  set(entry: VersionBadgeEntry): void {
    this.entries.set(entry.version, entry);
  }

  /**
   * Get the badge entry for a specific version.
   *
   * Returns undefined if no badge exists for this version (P-227).
   */
  get(version: string): VersionBadgeEntry | undefined {
    return this.entries.get(version);
  }

  /**
   * Check if a badge exists for a specific version.
   */
  has(version: string): boolean {
    return this.entries.has(version);
  }

  /**
   * List all stored versions (sorted lexicographically).
   */
  versions(): readonly string[] {
    return [...this.entries.keys()].sort();
  }

  /**
   * Remove the badge entry for a specific version.
   */
  remove(version: string): boolean {
    return this.entries.delete(version);
  }

  /**
   * Total number of stored badge entries.
   */
  get size(): number {
    return this.entries.size;
  }
}

// ── Re-Verification ─────────────────────────────────────────────────

/**
 * Input for badge re-verification.
 */
export interface ReverifyInput {
  /** Version to re-verify. */
  readonly version: string;
  /** Current handler.ts content. */
  readonly handlerContent: string;
  /** Current SKILL.md frontmatter content. */
  readonly frontmatterContent: string;
  /** Whether all governance checks passed during rebuild. */
  readonly governanceChecksPassed: boolean;
}

/**
 * Result of badge re-verification.
 */
export interface ReverifyResult {
  /** Version re-verified. */
  readonly version: string;
  /** Whether re-verification succeeded (VERIFIED restored). */
  readonly verified: boolean;
  /** New tier after re-verification. */
  readonly tier: GovernanceTier;
  /** Updated handler hash. */
  readonly handlerHash: string;
  /** Updated frontmatter hash. */
  readonly frontmatterHash: string;
  /** Timestamp of re-verification (ISO 8601). */
  readonly verifiedAt: string;
}

/**
 * Re-verify a badge after handler modification.
 *
 * Running `claws build --skill` re-compiles governance checks.
 * If all pass, the badge is restored to VERIFIED with updated
 * handler and frontmatter hashes.
 */
export function reverifyBadge(input: ReverifyInput): ReverifyResult {
  const handlerHash = computeHandlerHash(input.handlerContent);
  const frontmatterHash = sha256(input.frontmatterContent);

  if (input.governanceChecksPassed) {
    return {
      version: input.version,
      verified: true,
      tier: 'VERIFIED',
      handlerHash,
      frontmatterHash,
      verifiedAt: new Date().toISOString(),
    };
  }

  return {
    version: input.version,
    verified: false,
    tier: 'TYPED',
    handlerHash,
    frontmatterHash,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Apply a re-verification result to the badge store.
 *
 * Updates the stored badge entry with new hashes and tier.
 */
export function applyReverification(
  store: BadgeStore,
  result: ReverifyResult,
): VersionBadgeEntry {
  const entry: VersionBadgeEntry = {
    version: result.version,
    tier: result.tier,
    handlerHash: result.handlerHash,
    frontmatterHash: result.frontmatterHash,
    staleness: result.verified ? 'current' : 'stale',
    generatedAt: result.verifiedAt,
  };

  store.set(entry);
  return entry;
}
