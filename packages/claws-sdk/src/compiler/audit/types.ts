/**
 * Audit chain types for the claws free tier.
 *
 * Local-only audit: Ed25519-signed entries chained via SHA-256.
 * SIEM export (CEF, syslog, NDJSON) and RFC3161 timestamps are paid-tier.
 *
 * @module claws-sdk/compiler/audit/types
 */

/** A single audit entry in the chain. */
export interface AuditEntry {
  /** Entry index in the chain (0-based). */
  readonly index: number;
  /** ISO-8601 timestamp of when the entry was created. */
  readonly timestamp: string;
  /** Action that triggered the audit entry (e.g. "compile", "sign", "deploy"). */
  readonly action: string;
  /** Subject of the action (e.g. file path, workspace id). */
  readonly subject: string;
  /** Arbitrary JSON-serializable payload. */
  readonly payload: Record<string, unknown>;
  /** SHA-256 hash of (JSON(payload) + previousHash). */
  readonly hash: string;
  /** Hash of the previous entry, or null for the genesis entry. */
  readonly previousHash: string | null;
  /** Ed25519 signature of the hash, hex-encoded. */
  readonly signature: string;
}

/** Metadata about an audit chain. */
export interface AuditChainMeta {
  /** Unique identifier for this chain. */
  readonly chainId: string;
  /** ISO-8601 timestamp of chain creation. */
  readonly createdAt: string;
  /** Hash of the last entry in the chain (null if empty). */
  readonly lastEntryHash: string | null;
  /** Number of entries in the chain. */
  readonly entryCount: number;
  /** SHA-256 fingerprint of the signing public key. */
  readonly publicKeyFingerprint: string;
}

/** Error thrown when a parsed object does not match the expected audit entry shape. */
export class AuditEntryValidationError extends Error {
  constructor(reason: string) {
    super(`Invalid audit entry: ${reason}`);
    this.name = 'AuditEntryValidationError';
  }
}

/**
 * Validate that a parsed JSON value has the correct AuditEntry shape.
 *
 * Checks all required fields exist and have the correct types.
 * Throws AuditEntryValidationError if validation fails.
 */
export function validateAuditEntry(parsed: unknown): AuditEntry {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new AuditEntryValidationError('expected an object');
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj['index'] !== 'number') {
    throw new AuditEntryValidationError('index must be a number');
  }
  if (typeof obj['timestamp'] !== 'string') {
    throw new AuditEntryValidationError('timestamp must be a string');
  }
  if (typeof obj['action'] !== 'string') {
    throw new AuditEntryValidationError('action must be a string');
  }
  if (typeof obj['subject'] !== 'string') {
    throw new AuditEntryValidationError('subject must be a string');
  }
  if (typeof obj['payload'] !== 'object' || obj['payload'] === null) {
    throw new AuditEntryValidationError('payload must be an object');
  }
  if (typeof obj['hash'] !== 'string') {
    throw new AuditEntryValidationError('hash must be a string');
  }
  if (obj['previousHash'] !== null && typeof obj['previousHash'] !== 'string') {
    throw new AuditEntryValidationError('previousHash must be a string or null');
  }
  if (typeof obj['signature'] !== 'string') {
    throw new AuditEntryValidationError('signature must be a string');
  }

  return obj as unknown as AuditEntry;
}

/** Header line in a chain NDJSON file. */
export interface ChainFileHeader {
  readonly type: 'audit-chain';
  readonly version: 1;
  readonly meta: AuditChainMeta;
}

/**
 * Validate that a parsed JSON value has the correct ChainFileHeader shape.
 *
 * Throws AuditEntryValidationError if validation fails.
 */
export function validateChainFileHeader(parsed: unknown): ChainFileHeader {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new AuditEntryValidationError('expected an object for chain file header');
  }
  const obj = parsed as Record<string, unknown>;

  if (obj['type'] !== 'audit-chain') {
    throw new AuditEntryValidationError(`header type must be 'audit-chain', got '${String(obj['type'])}'`);
  }
  if (obj['version'] !== 1) {
    throw new AuditEntryValidationError(`header version must be 1, got ${String(obj['version'])}`);
  }
  if (typeof obj['meta'] !== 'object' || obj['meta'] === null) {
    throw new AuditEntryValidationError('header meta must be an object');
  }

  return obj as unknown as ChainFileHeader;
}

/** Result of verifying an audit chain. */
export interface AuditVerifyResult {
  /** Whether the entire chain is valid. */
  readonly valid: boolean;
  /** Index of the first broken entry (undefined if valid). */
  readonly brokenAt?: number;
  /** Human-readable reason for failure (undefined if valid). */
  readonly reason?: string;
}
