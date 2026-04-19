/**
 * @bic/openclaw-guardrails/audit — Core types (absorbed from the prior audit-chain orphan).
 *
 * Hash-chained JSONL audit trail types: event, chain entry (WAL wrapper),
 * verify result, prune result, query filter, export format.
 */

/**
 * A single auditable action in the hash chain.
 *
 * `AuditEntry` is the canonical name in guardrails.md §/audit and §/siem;
 * `AuditEvent` is a legacy alias kept for in-package callers.
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  source: string;
  actor?: string;
  action: string;
  target: string;
  scope: string;
  outcome: 'pending' | 'success' | 'failed';
  reason?: string;
  hash: string;
  previousHash: string;
  retentionDays?: number;
}

/** @deprecated Use {@link AuditEntry}. Retained for in-package callers. */
export type AuditEvent = AuditEntry;

/** A WAL-wrapped audit event: pending intent + optional completion. */
export interface ChainEntry {
  pendingEvent: AuditEvent;
  completeEvent?: AuditEvent;
}

/** Outcome of chain integrity verification. */
export interface VerifyResult {
  valid: boolean;
  length: number;
  genesis?: string;
  latest?: string;
  brokenAt?: string;
}

/** Outcome of a prune operation. */
export interface PruneResult {
  pruned: number;
  retained: number;
  blockedByRetention: number;
  anchorHash?: string;
}

/** Filter criteria for querying events. AND semantics. */
export interface AuditQuery {
  actor?: string;
  from?: string;
  to?: string;
  action?: string;
  scope?: string;
  source?: string;
}

/** Supported audit trail export formats. Per guardrails.md §/audit. */
export type ExportFormat = 'cef' | 'jsonl' | 'syslog';
