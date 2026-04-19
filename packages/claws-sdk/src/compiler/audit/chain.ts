/**
 * Append-only Ed25519-signed audit chain.
 *
 * Each entry is SHA-256 hashed (payload + previousHash) and Ed25519 signed.
 * The chain is tamper-evident: modifying any entry breaks verification
 * from that point forward.
 *
 * @module claws-sdk/compiler/audit/chain
 */

import { randomUUID } from 'node:crypto';
import { sha256 } from '../crypto/hash.js';
import { ed25519Sign } from '../crypto/ed25519.js';
import { keyFingerprint } from '../crypto/keys.js';
import type { AuditEntry, AuditChainMeta } from './types.js';

/** Error thrown when the audit chain has been corrupted. */
export class AuditChainCorruptionError extends Error {
  readonly brokenAt: number;

  constructor(index: number, reason: string) {
    super(`Audit chain corruption at entry ${index}: ${reason}`);
    this.name = 'AuditChainCorruptionError';
    this.brokenAt = index;
  }
}

/** Input for creating a new audit entry. */
export interface AuditEntryInput {
  readonly action: string;
  readonly subject: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Compute the SHA-256 hash for an audit entry.
 *
 * Hash covers: index, timestamp, action, subject, payload, and previousHash.
 * This ensures every field is tamper-evident.
 */
export function computeEntryHash(
  index: number,
  timestamp: string,
  action: string,
  subject: string,
  payload: Record<string, unknown>,
  previousHash: string | null,
): string {
  const preimage = JSON.stringify({ index, timestamp, action, subject, payload, previousHash });
  return sha256(preimage);
}

/** Append-only audit chain with Ed25519 signing. */
export class AuditChain {
  private readonly entries: AuditEntry[] = [];
  private readonly chainId: string;
  private readonly createdAt: string;
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(privateKey: string, publicKey: string, chainId?: string, createdAt?: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.chainId = chainId ?? randomUUID();
    this.createdAt = createdAt ?? new Date().toISOString();
  }

  /** Append a new entry to the chain. Returns the created entry. */
  append(input: AuditEntryInput): AuditEntry {
    const index = this.entries.length;
    const previousHash = index === 0 ? null : this.entries[index - 1]!.hash;
    const timestamp = new Date().toISOString();

    const hash = computeEntryHash(
      index,
      timestamp,
      input.action,
      input.subject,
      input.payload,
      previousHash,
    );

    const signature = ed25519Sign(hash, this.privateKey);

    const entry: AuditEntry = {
      index,
      timestamp,
      action: input.action,
      subject: input.subject,
      payload: input.payload,
      hash,
      previousHash,
      signature,
    };

    this.entries.push(entry);
    return entry;
  }

  /** Get entry by index. Returns undefined if out of range. */
  getEntry(index: number): AuditEntry | undefined {
    return this.entries[index];
  }

  /** Get entries in range [start, end). */
  getEntries(start: number, end?: number): readonly AuditEntry[] {
    return this.entries.slice(start, end);
  }

  /** Number of entries in the chain. */
  get length(): number {
    return this.entries.length;
  }

  /** Hash of the last entry, or null if the chain is empty. */
  get lastHash(): string | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1]!.hash;
  }

  /** All entries (immutable snapshot). */
  get allEntries(): readonly AuditEntry[] {
    return [...this.entries];
  }

  /** Chain metadata. */
  get meta(): AuditChainMeta {
    return {
      chainId: this.chainId,
      createdAt: this.createdAt,
      lastEntryHash: this.lastHash,
      entryCount: this.entries.length,
      publicKeyFingerprint: keyFingerprint(this.publicKey),
    };
  }

  /**
   * Load entries into the chain (used for restoring from storage).
   *
   * Verifies hash chain linkage during load: each entry's `previousHash`
   * must match the prior entry's `hash`. Also verifies each entry's content
   * hash is consistent. Throws AuditChainCorruptionError if any check fails.
   *
   * Entries must be in order and the chain must be empty.
   */
  load(entries: readonly AuditEntry[]): void {
    if (this.entries.length > 0) {
      throw new Error('Cannot load into a non-empty chain');
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;

      // Verify hash chain linkage
      const expectedPreviousHash = i === 0 ? null : entries[i - 1]!.hash;
      if (entry.previousHash !== expectedPreviousHash) {
        throw new AuditChainCorruptionError(
          i,
          `previousHash mismatch (expected ${String(expectedPreviousHash)}, got ${String(entry.previousHash)})`,
        );
      }

      // Verify content hash
      const expectedHash = computeEntryHash(
        entry.index,
        entry.timestamp,
        entry.action,
        entry.subject,
        entry.payload,
        entry.previousHash,
      );
      if (entry.hash !== expectedHash) {
        throw new AuditChainCorruptionError(i, 'content hash mismatch');
      }

      this.entries.push(entry);
    }
  }
}
