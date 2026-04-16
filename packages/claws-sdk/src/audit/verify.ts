/**
 * Audit chain integrity verification with tamper-type detection.
 *
 * Fixes THOTH-FINDINGS T-02: no tamper detection test. Walks the chain from
 * first to last entry, recomputing HMAC-SHA256(auditKey, previousHash + content)
 * at each step. Detects three tamper modes:
 *
 * - **Deletion**: a gap where an entry's previousHash references a hash not
 *   found in the preceding entry (entry was removed from the chain).
 * - **Reorder**: entries whose previousHash doesn't match the actual preceding
 *   entry's hash (entries were shuffled).
 * - **Modification**: content hash mismatch where the stored hash doesn't match
 *   the recomputed HMAC-SHA256 (content was altered after signing).
 *
 * Reports the exact break-point index so downstream consumers know precisely
 * where integrity was lost.
 *
 * @module claws-sdk/audit/verify
 */

import { timingSafeEqual } from 'node:crypto';
import { computeChainHash } from './chain.js';
import type { ChainEntry, ChainVerifyResult, TamperType } from './types.js';

/**
 * Constant-time hex string comparison to prevent timing side-channels.
 */
function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Build a failure result with tamper-type enrichment.
 */
function failResult(
  entries: readonly ChainEntry[],
  breakPoint: number,
  tamperType: TamperType,
  details: string,
): ChainVerifyResult {
  return {
    valid: false,
    length: entries.length,
    genesisHash: entries[0]!.hash,
    latestHash: entries[entries.length - 1]!.hash,
    brokenAtSeq: breakPoint,
    error: details,
    breakPoint,
    tamperType,
    details,
  };
}

/**
 * Verify the integrity of an audit chain with tamper-type detection.
 *
 * Walks the chain entry-by-entry, checking three invariants at each position:
 *
 * 1. **Genesis check**: the first entry must have `previousHash === null`.
 * 2. **Link check**: each entry's `previousHash` must match the preceding
 *    entry's `hash`. A mismatch indicates deletion (previousHash references a
 *    non-existent predecessor) or reordering (previousHash references a
 *    different predecessor).
 * 3. **Content check**: each entry's `hash` must match the recomputed
 *    HMAC-SHA256(auditKey, previousHash + canonicalContent). A mismatch
 *    indicates content modification.
 *
 * The verifier distinguishes deletion from reordering by building a set of all
 * known hashes. If an entry's previousHash doesn't match its immediate
 * predecessor but DOES appear elsewhere in the chain, it's a reorder. If it
 * doesn't appear anywhere, it's a deletion.
 *
 * @param entries - Ordered chain entries to verify.
 * @param auditKey - The HMAC key used when the chain was created.
 * @returns Verification result with breakPoint, tamperType, and details on failure.
 */
export function verifyChainIntegrity(
  entries: readonly ChainEntry[],
  auditKey: Buffer | string,
): ChainVerifyResult {
  if (entries.length === 0) {
    return { valid: true, length: 0 };
  }

  const keyBuf = typeof auditKey === 'string' ? Buffer.from(auditKey, 'hex') : auditKey;

  // Build a set of all hashes in the chain for deletion vs reorder detection.
  const knownHashes = new Set<string>();
  for (const entry of entries) {
    knownHashes.add(entry.hash);
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    // --- Link check ---
    if (i === 0) {
      // Genesis entry must have null previousHash
      if (entry.previousHash !== null) {
        // The genesis entry references a predecessor — something was deleted
        // before it, or entries were reordered.
        const tamperType: TamperType = knownHashes.has(entry.previousHash)
          ? 'reorder'
          : 'deletion';
        return failResult(
          entries,
          0,
          tamperType,
          tamperType === 'deletion'
            ? 'Genesis entry references a previousHash not found in the chain — entries were deleted before position 0'
            : 'Genesis entry has a non-null previousHash that exists in the chain — entries were reordered',
        );
      }
    } else {
      const prevEntry = entries[i - 1]!;

      if (entry.previousHash === null) {
        // Non-genesis entry with null previousHash — reorder (a genesis entry
        // was moved to this position)
        return failResult(
          entries,
          i,
          'reorder',
          `Entry at index ${i} has null previousHash but is not the genesis entry — entries were reordered`,
        );
      }

      if (!safeHexEqual(entry.previousHash, prevEntry.hash)) {
        // previousHash doesn't match the actual predecessor.
        // If previousHash exists elsewhere in the chain → reorder.
        // If previousHash doesn't exist anywhere → deletion.
        const tamperType: TamperType = knownHashes.has(entry.previousHash)
          ? 'reorder'
          : 'deletion';
        return failResult(
          entries,
          i,
          tamperType,
          tamperType === 'deletion'
            ? `Entry at index ${i} references previousHash not found in the chain — entries were deleted before this position`
            : `Entry at index ${i} previousHash matches a different entry — entries were reordered`,
        );
      }
    }

    // --- Content check ---
    const recomputed = computeChainHash(keyBuf, entry.previousHash, entry);
    if (!safeHexEqual(recomputed, entry.hash)) {
      return failResult(
        entries,
        i,
        'modification',
        `Entry at index ${i} hash does not match recomputed HMAC-SHA256 — content was modified after signing`,
      );
    }
  }

  return {
    valid: true,
    length: entries.length,
    genesisHash: entries[0]!.hash,
    latestHash: entries[entries.length - 1]!.hash,
  };
}

/**
 * Chain break scope — classifies the severity of a chain break based on
 * how many entries are affected downstream from the break point.
 *
 * - 'localized': break affects < 10% of the chain
 * - 'sectional': break affects 10–50% of the chain
 * - 'catastrophic': break affects > 50% of the chain
 */
export type ChainBreakScope = 'localized' | 'sectional' | 'catastrophic';

/**
 * Post-break tamper analysis result.
 */
export interface PostBreakAnalysis {
  /** Scope classification of the chain break. */
  readonly scope: ChainBreakScope;
  /** Number of entries affected downstream (from break point to end). */
  readonly affectedEntries: number;
  /** Total entries in the chain. */
  readonly totalEntries: number;
  /** Percentage of chain affected. */
  readonly affectedPercent: number;
  /** Whether entries after the break point show additional modifications. */
  readonly postBreakModifications: number;
  /** Tamper type at the break point. */
  readonly primaryTamperType: TamperType;
}

/**
 * Classify the scope of a chain break.
 */
function classifyBreakScope(affectedPercent: number): ChainBreakScope {
  if (affectedPercent <= 10) return 'localized';
  if (affectedPercent <= 50) return 'sectional';
  return 'catastrophic';
}

/**
 * Analyze the chain after a break point to assess scope and additional tampering.
 *
 * Given a verification result that indicates a broken chain, this function:
 * 1. Classifies the break scope (localized/sectional/catastrophic)
 * 2. Counts how many entries are affected downstream
 * 3. Checks entries after the break for additional content modifications
 *
 * @param entries - The full chain of entries.
 * @param verifyResult - The verification result (must have valid === false).
 * @param auditKey - The HMAC key used when the chain was created.
 * @returns Post-break analysis, or null if the chain is valid.
 */
export function analyzePostBreak(
  entries: readonly ChainEntry[],
  verifyResult: ChainVerifyResult,
  auditKey: Buffer | string,
): PostBreakAnalysis | null {
  if (verifyResult.valid || entries.length === 0) return null;

  const breakPoint = verifyResult.breakPoint ?? verifyResult.brokenAtSeq ?? 0;
  const affectedEntries = entries.length - breakPoint;
  const affectedPercent = entries.length > 0
    ? Math.round((affectedEntries / entries.length) * 100)
    : 0;

  const keyBuf = typeof auditKey === 'string' ? Buffer.from(auditKey, 'hex') : auditKey;

  // Count entries after break with content modifications
  let postBreakModifications = 0;
  for (let i = breakPoint + 1; i < entries.length; i++) {
    const entry = entries[i]!;
    const recomputed = computeChainHash(keyBuf, entry.previousHash, entry);
    if (recomputed !== entry.hash) {
      postBreakModifications++;
    }
  }

  return {
    scope: classifyBreakScope(affectedPercent),
    affectedEntries,
    totalEntries: entries.length,
    affectedPercent,
    postBreakModifications,
    primaryTamperType: verifyResult.tamperType ?? 'modification',
  };
}
