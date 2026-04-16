/**
 * Audit chain types for tamper-evident governance event logging.
 *
 * These types extend the existing compliance audit types with chaining
 * hash support, enabling detection of deletion or reordering of entries.
 *
 * @module claws-sdk/audit/types
 */

/**
 * Base audit entry — the fields captured for every governance event.
 * Does not include chain metadata (hash, previousHash).
 */
export interface AuditEntry {
  /** ISO 8601 timestamp of the event. */
  readonly timestamp: string;
  /** Category of the event (e.g. 'BYPASS_ACTIVATED', 'TOOL_CALL'). */
  readonly eventType: string;
  /** Who triggered the event (agent ID, user ID). */
  readonly actor: string;
  /** What the event applies to (workspace path, tool name, etc.). */
  readonly target: string;
  /** The action taken. */
  readonly action: string;
  /** Result of the action. */
  readonly outcome: string;
  /** Rule ID for audit trail correlation. */
  readonly ruleId: string;
  /** Severity level (1-5). */
  readonly severity: number;
  /** Policy version at the time of the event. */
  readonly policyVersion: string;
}

/**
 * A chain entry — an AuditEntry with chaining hash metadata.
 *
 * Each entry's `hash` is computed as HMAC-SHA256(auditKey, previousHash + canonicalContent).
 * The first entry has `previousHash === null`. All subsequent entries reference
 * the hash of their predecessor, forming an append-only integrity chain.
 */
export interface ChainEntry extends AuditEntry {
  /** Sequential index in the chain (0-based). */
  readonly seq: number;
  /** HMAC-SHA256 hash of this entry (64-char hex). */
  readonly hash: string;
  /** Hash of the preceding entry, or null for the genesis entry. */
  readonly previousHash: string | null;
}

/**
 * Tamper type detected during chain verification.
 *
 * - `deletion`: A gap in the chain — an entry's previousHash references a
 *   hash not found in any preceding entry.
 * - `reorder`: An entry's previousHash does not match the actual preceding
 *   entry's hash (entries were shuffled).
 * - `modification`: An entry's stored hash does not match the recomputed
 *   HMAC-SHA256 (content was altered after signing).
 */
export type TamperType = 'deletion' | 'reorder' | 'modification';

/**
 * Result of verifying an audit chain's integrity.
 */
export interface ChainVerifyResult {
  /** Whether the entire chain is valid. */
  readonly valid: boolean;
  /** Total number of entries checked. */
  readonly length: number;
  /** Hash of the first entry, if chain is non-empty. */
  readonly genesisHash?: string;
  /** Hash of the last entry, if chain is non-empty. */
  readonly latestHash?: string;
  /** Seq index of the first broken entry, if chain is invalid. */
  readonly brokenAtSeq?: number;
  /** Description of what failed, if chain is invalid. */
  readonly error?: string;
  /** Index of the first tampered entry (alias for brokenAtSeq for verify API). */
  readonly breakPoint?: number;
  /** Type of tampering detected at the break point. */
  readonly tamperType?: TamperType;
  /** Human-readable explanation of the integrity failure. */
  readonly details?: string;
}

/**
 * Supported export formats for audit chain data.
 */
/**
 * Implemented export formats for audit chain data.
 */
export type ExportFormat = 'cef' | 'json' | 'syslog';

/**
 * Planned but not-yet-implemented export formats.
 */
export type PlannedExportFormat = 'jsonl' | 'csv' | 'sarif';

/**
 * A witness receipt — Merkle proof that a specific chain entry
 * was included at a given root hash.
 *
 * Each sibling in the proof path is tagged with its position (left/right)
 * so the verifier knows the hash concatenation order when recomputing
 * the root.
 */
export interface WitnessReceipt {
  /** Hash of the chain entry this receipt proves inclusion of. */
  readonly entryHash: string;
  /** The chain root hash at the time of receipt issuance. */
  readonly rootHash: string;
  /** Ordered sibling hashes from leaf to root. */
  readonly proof: ReadonlyArray<{ readonly hash: string; readonly position: 'left' | 'right' }>;
  /** ISO 8601 timestamp when the receipt was issued. */
  readonly issuedAt: string;
  /** Sequential index of the entry in the chain. */
  readonly entrySeq: number;
  /** Total chain length at time of receipt issuance. */
  readonly chainLength: number;
}

/**
 * Options for PII redaction in export formatters.
 *
 * Fields listed in `redactFields` will have their values replaced with
 * the `replacement` string (default: `[REDACTED]`).
 */
export interface RedactionOptions {
  /** Entry field names to redact (e.g. 'actor', 'target'). */
  readonly redactFields: readonly string[];
  /** Replacement string for redacted values. Default: '[REDACTED]'. */
  readonly replacement?: string;
}

/**
 * Options for the streaming export generator.
 */
export interface StreamExportOptions {
  /** Export format. */
  readonly format: 'cef' | 'json' | 'syslog';
  /** PII redaction settings. */
  readonly redaction?: RedactionOptions;
  /** Batch size for processing entries. Default: 500. */
  readonly batchSize?: number;
}
