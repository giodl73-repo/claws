/**
 * test/e2e/harness/audit-types — snapshot-switch audit entry shapes (CL-11 §3a).
 *
 * Pulse 41 drafts these two entry types so the snapshot-switch module
 * (`snapshot-switch.ts`) can emit them as first-class audit entries
 * alongside the pulse-39 `SinkDecisionEntry` / `SinkApprovalEntry` shapes.
 * The cross-linked hash-chain writer + finalized JCS canonicalization land in
 * pulse 43 — this module fixes the field surface so every CP-5 consumer
 * depends on the same record shape.
 *
 * Both entries extend the common `SinkEntry` base so a single `ApprovalSink`
 * can persist them via a unified store (pulse 43 adds the variant case
 * `kind: 'drain-window' | 'on-snapshot-promoted-timeout'` to the sink).
 *
 * @module test/e2e/harness/audit-types
 */

// ---------------------------------------------------------------------------
// Shared base shape — every entry carries sequence / prev+entry hash /
// emittedAt just like the decision + approval entries from pulse 39.
// ---------------------------------------------------------------------------

interface SinkEntryBase {
  readonly sinkId: string;
  readonly sequence: number;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly emittedAt: number;
}

// ---------------------------------------------------------------------------
// DrainWindowEntry — emitted for the drain period between promote and admit
// of N+1, ONLY when at least one in-flight call was captured against
// snapshot N (R1 invariants F-07 — empty-drain promotes do not emit).
// ---------------------------------------------------------------------------

export interface DrainWindowEntry extends SinkEntryBase {
  readonly kind: 'drain-window';
  readonly from: string | null;
  readonly to: string;
  readonly inflightCount: number;
  readonly openedAt: number;
  readonly closedAt: number;
  readonly outcome: 'drained' | 'timed-out';
}

// ---------------------------------------------------------------------------
// OnSnapshotPromotedTimeoutEntry — emitted on hook timeout (CL-11 §3a).
// One entry per provider that did not settle within `timeoutMs`.
// ---------------------------------------------------------------------------

export interface OnSnapshotPromotedTimeoutEntry extends SinkEntryBase {
  readonly kind: 'on-snapshot-promoted-timeout';
  readonly providerId: string;
  readonly from: string | null;
  readonly snapshotId: string;
  readonly timeoutMs: number;
  readonly reason: 'hook-threw' | 'hook-hung';
  readonly errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Inputs — the caller-facing shapes stripped of fields the sink computes
// (sinkId, sequence, prevHash, entryHash, emittedAt). Parallel to
// `AuditSinkDecisionInput` in host-context.ts.
// ---------------------------------------------------------------------------

export type DrainWindowEntryInput = Omit<
  DrainWindowEntry,
  'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'
>;

export type OnSnapshotPromotedTimeoutEntryInput = Omit<
  OnSnapshotPromotedTimeoutEntry,
  'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'
>;
