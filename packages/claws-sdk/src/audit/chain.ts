/**
 * Audit chain — read/append with HMAC-SHA256 chaining hash.
 *
 * Fixes THOTH-FINDINGS D-02: entries were independently signed, allowing
 * deletion or reordering without detection. This module introduces a chained
 * hash model where each entry's hash is:
 *
 *   HMAC-SHA256(auditKey, previousHash + canonicalContent)
 *
 * The first entry has `previousHash === null`. All subsequent entries reference
 * the hash of their predecessor, forming an append-only integrity chain.
 *
 * Content canonicalization uses RFC 8785 (JCS) — deterministic JSON
 * serialization via sorted keys, preventing false tamper-detection from
 * non-deterministic property ordering.
 *
 * Uses the internalized canonicalJson helper (`../util/canonical-json.js`)
 * for RFC 8785 (JCS) serialization -- no external SDK dependency.
 *
 * @module claws-sdk/audit/chain
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalJson } from '../util/canonical-json.js';
import type { AuditEntry, ChainEntry, ChainVerifyResult } from './types.js';

/**
 * Canonical JSON fields included in the hash computation.
 * Ordered alphabetically for deterministic hashing. Excludes `hash`, `seq`,
 * and `previousHash` since those are chain metadata (previousHash is prepended
 * separately; seq is derived from position; hash is the output).
 */
const CONTENT_FIELDS = [
  'action',
  'actor',
  'eventType',
  'outcome',
  'policyVersion',
  'ruleId',
  'severity',
  'target',
  'timestamp',
] as const;

/**
 * Extract the canonical content payload from an audit entry for hashing.
 * Uses RFC 8785 canonical JSON serialization (sorted keys, no whitespace).
 */
function canonicalContent(entry: AuditEntry): string {
  const record: Record<string, unknown> = {};
  for (const key of CONTENT_FIELDS) {
    const value = entry[key];
    if (value !== undefined) {
      record[key] = value;
    }
  }
  return canonicalJson(record);
}

/**
 * Compute the HMAC-SHA256 chaining hash for an entry.
 *
 * hash = HMAC-SHA256(auditKey, previousHash + canonicalContent)
 *
 * For the first entry, previousHash is the empty string (since it's null).
 *
 * @param auditKey - The workspace HMAC key (Buffer or hex string).
 * @param previousHash - Hash of the preceding entry, or null for genesis.
 * @param entry - The audit entry content to hash.
 * @returns 64-character lowercase hex string.
 */
export function computeChainHash(
  auditKey: Buffer | string,
  previousHash: string | null,
  entry: AuditEntry,
): string {
  const keyBuf = typeof auditKey === 'string' ? Buffer.from(auditKey, 'hex') : auditKey;
  const prevStr = previousHash ?? '';
  const payload = prevStr + canonicalContent(entry);
  return createHmac('sha256', keyBuf).update(payload, 'utf8').digest('hex');
}

/**
 * In-memory audit chain with append and read operations.
 *
 * Entries are stored in append order. Each entry's hash chains to its
 * predecessor via HMAC-SHA256(auditKey, previousHash + canonicalContent).
 */
export class AuditChain {
  private readonly entries: ChainEntry[] = [];
  private readonly auditKey: Buffer;

  constructor(auditKey: Buffer | string) {
    this.auditKey = typeof auditKey === 'string' ? Buffer.from(auditKey, 'hex') : auditKey;
  }

  /**
   * Append a new audit entry to the chain.
   *
   * Computes the chaining hash referencing the previous entry's hash
   * (or null for the first entry) and returns the complete ChainEntry.
   */
  append(entry: AuditEntry): ChainEntry {
    const seq = this.entries.length;
    const previousHash = seq === 0 ? null : this.entries[seq - 1]!.hash;
    const hash = computeChainHash(this.auditKey, previousHash, entry);

    const chainEntry: ChainEntry = {
      ...entry,
      seq,
      hash,
      previousHash,
    };

    this.entries.push(chainEntry);
    return chainEntry;
  }

  /**
   * Read all entries in append order.
   */
  read(): readonly ChainEntry[] {
    return [...this.entries];
  }

  /**
   * Get the number of entries in the chain.
   */
  get length(): number {
    return this.entries.length;
  }

  /**
   * Verify the integrity of the entire chain.
   *
   * Checks:
   * 1. First entry has previousHash === null
   * 2. Each subsequent entry's previousHash matches the preceding entry's hash
   * 3. Each entry's hash matches the recomputed HMAC-SHA256
   *
   * Uses constant-time comparison to prevent timing side-channels.
   */
  verify(): ChainVerifyResult {
    return verifyChain(this.entries, this.auditKey);
  }
}

/**
 * Constant-time hex string comparison to prevent timing side-channels.
 */
function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Verify the integrity of an audit chain.
 *
 * Accepts a chain of entries and an audit key. Recomputes each entry's
 * HMAC-SHA256 hash and verifies the chain linkage.
 *
 * @param entries - Ordered chain entries to verify.
 * @param auditKey - The HMAC key used when the chain was created.
 * @returns Verification result with details on any failures.
 */
export function verifyChain(
  entries: readonly ChainEntry[],
  auditKey: Buffer | string,
): ChainVerifyResult {
  if (entries.length === 0) {
    return { valid: true, length: 0 };
  }

  const keyBuf = typeof auditKey === 'string' ? Buffer.from(auditKey, 'hex') : auditKey;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    // Check previousHash linkage
    if (i === 0) {
      if (entry.previousHash !== null) {
        return {
          valid: false,
          length: entries.length,
          genesisHash: entries[0]!.hash,
          latestHash: entries[entries.length - 1]!.hash,
          brokenAtSeq: 0,
          error: 'First entry must have previousHash === null',
        };
      }
    } else {
      const prevEntry = entries[i - 1]!;
      if (entry.previousHash === null || !safeHexEqual(entry.previousHash, prevEntry.hash)) {
        return {
          valid: false,
          length: entries.length,
          genesisHash: entries[0]!.hash,
          latestHash: entries[entries.length - 1]!.hash,
          brokenAtSeq: i,
          error: `Entry ${i} previousHash does not match entry ${i - 1} hash`,
        };
      }
    }

    // Recompute hash and compare
    const recomputed = computeChainHash(keyBuf, entry.previousHash, entry);
    if (!safeHexEqual(recomputed, entry.hash)) {
      return {
        valid: false,
        length: entries.length,
        genesisHash: entries[0]!.hash,
        latestHash: entries[entries.length - 1]!.hash,
        brokenAtSeq: i,
        error: `Entry ${i} hash does not match recomputed HMAC-SHA256`,
      };
    }
  }

  return {
    valid: true,
    length: entries.length,
    genesisHash: entries[0]!.hash,
    latestHash: entries[entries.length - 1]!.hash,
  };
}
