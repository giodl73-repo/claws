/**
 * test/e2e/harness/audit-types — CL-11 §3a audit entry shapes.
 *
 * Six entry variants compose the sink log:
 *
 *   - `ProducerEntry`               — policy artifact emission (per `claws policy generate`)
 *   - `DecisionEntry`               — authorization decision per tool call
 *   - `ApprovalEntry`               — approval verdict record
 *   - `DrainWindowEntry`            — snapshot-switch drain window envelope
 *   - `OnSnapshotPromotedTimeoutEntry` — hook timeout per provider
 *   - `SidecarUnreachableEntry`     — companion sidecar unreachable
 *   - `CrossTenantAccessDeniedEntry` — tenant-boundary denial
 *
 * Every entry carries `ts` (ISO-8601 string), `seq` (monotonic), `prevHash`
 * (previous entry's `hash`), and `hash` (sha256 of the canonicalized body
 * excluding the `hash` field itself). Cross-linking is by
 * `policyArtifactSha256` (producer↔decision) and `correlationId`
 * (decision↔approval) — the `audit-chain` writer + reader + `verifyChain`
 * oracle in `audit-chain.ts` enforce the invariants.
 *
 * Emission sites for DrainWindow/Timeout/SidecarUnreachable/CrossTenant are
 * owned by specific adapters (CP-7); the types live here because every CP-5
 * consumer depends on the same record shape.
 *
 * @module test/e2e/harness/audit-types
 */

// ---------------------------------------------------------------------------
// Tier ladder — per CL-07 §1a R0-R5 trust tiers. Authoritative union.
// ---------------------------------------------------------------------------

export type Tier = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

// ---------------------------------------------------------------------------
// InvalidReason enums.
// ---------------------------------------------------------------------------

/**
 * Reasons a DecisionEntry may carry `invalidReason` — 7 values covering:
 *  - `divergent-content-hash`        → P-02 canonical invocation hash drift
 *  - `redirect-path-escape`          → SC-14 redirect target escapes workspace
 *  - `redirect-path-short-name`      → SC-14 8.3 short-name redirection
 *  - `redirect-path-ads`             → SC-14 NTFS alternate data stream
 *  - `redirect-path-symlink-escape`  → SC-14 symlink target escape
 *  - `ttl-expired`                   → decision evaluated against expired handle
 *  - `invalid-snapshot`              → snapshot id unknown or unfit
 */
export type DecisionInvalidReason =
  | 'divergent-content-hash'
  | 'redirect-path-escape'
  | 'redirect-path-short-name'
  | 'redirect-path-ads'
  | 'redirect-path-symlink-escape'
  | 'ttl-expired'
  | 'invalid-snapshot';

/**
 * Reasons an ApprovalEntry may carry `invalidReason` — 8 values covering the
 * 7 bound fields + HMAC signature pre-check, in the canonical first-failing
 * order evaluated by pulse-49's handle-binding-validator:
 *
 *   1. `provider-id-mismatch`
 *   2. `content-hash-mismatch`
 *   3. `sequence-rollback`
 *   4. `principal-mismatch`
 *   5. `unknown-keyId`
 *   6. `ttl-expired`
 *   7. `nonce-reuse`
 *   8. `signature-mismatch`    (canonical label; NOT 'bad-signature')
 */
export type ApprovalInvalidReason =
  | 'provider-id-mismatch'
  | 'content-hash-mismatch'
  | 'sequence-rollback'
  | 'principal-mismatch'
  | 'unknown-keyId'
  | 'ttl-expired'
  | 'nonce-reuse'
  | 'signature-mismatch';

// ---------------------------------------------------------------------------
// Shared chain fields — every CL-11 §3a entry carries these four.
// ---------------------------------------------------------------------------

/**
 * Common hash-chain fields on every sink entry. `ts` is ISO-8601 (UTC); `seq`
 * is a strictly monotonic integer; `prevHash` is the previous entry's `hash`
 * (genesis sentinel for the first entry — see `GENESIS_HASH`); `hash` is
 * sha256 of the canonicalized entry body excluding the `hash` field itself.
 */
export interface AuditChainFields {
  readonly ts: string;
  readonly seq: number;
  readonly prevHash: string;
  readonly hash: string;
}

// ---------------------------------------------------------------------------
// ProducerEntry — emitted when a policy artifact is produced
// (`claws policy generate` output). The `scope` field names the npm scope
// owning the artifact; validated against a runtime-configurable allowlist so
// older entries remain deserializable across the `@bic/openclaw` →
// `@openclaw` scope flip (F-07 widening).
// ---------------------------------------------------------------------------

export interface ProducerEntry extends AuditChainFields {
  readonly type: 'producer';
  readonly policyArtifactSha256: string;
  readonly generatedAt: string;
  readonly scope: string;
  readonly producerVersion: string;
}

// ---------------------------------------------------------------------------
// DecisionEntry — authorization decision per tool call. `declaredTier` is
// the provider's self-declared tier; `effectiveTier` is the host's capped
// result after non-uplift rules (CL-07 §1a Rules 1-4). BOTH are present on
// every entry, even when equal (SC-01 F-01).
// ---------------------------------------------------------------------------

/**
 * Decision action recorded in CL-11 §3a audit entries. Distinct from
 * `DecisionAction` in host-mock (merger surface, 4 values) because the audit
 * surface adds `pending-conjunctive` — the provisional state for a decision
 * waiting on a conjunctive companion approval.
 */
export type AuditDecisionAction =
  | 'allow'
  | 'deny'
  | 'review'
  | 'modify'
  | 'pending-conjunctive';

/**
 * Why a `DecisionEntry.effectiveTier` differs from `declaredTier`. SC-05 is
 * the compile-time case (generator reads `args_from` and bakes the R5
 * uplift into `policy-ir.json`); SC-06 is the runtime case (the runtime
 * provider observes a RESTRICTED provenance that was not statically
 * knowable at generate time). `null` means no escalation happened and
 * `effectiveTier === declaredTier`.
 */
export type EscalationSource =
  | 'generator-compile-time'
  | 'runtime-provenance'
  | null;

export interface DecisionEntry extends AuditChainFields {
  readonly type: 'decision';
  readonly correlationId: string;
  readonly snapshotId: string;
  readonly policyArtifactSha256: string;
  readonly tool: string;
  readonly decision: AuditDecisionAction;
  readonly declaredTier: Tier;
  readonly effectiveTier: Tier;
  readonly modifiedArgsHash?: string;
  readonly invalidReason?: DecisionInvalidReason;
  /**
   * `true` when the tool declared `failOpen: true` but the host still
   * denied the call because a non-recoverable invariant fired (TTL expiry
   * is the only case today, per SC-04 F-04). `undefined` when the tool
   * did not declare fail-open or when fail-open was honored. Load-bearing
   * audit marker — governance dashboards filter on this to catch
   * fail-open regressions.
   */
  readonly failOpenOverridden?: boolean;
  /**
   * Axis on which the tier was escalated (compile-time generator vs
   * runtime provenance). `null` is the "no escalation" sentinel —
   * writers set it explicitly when `effectiveTier === declaredTier`.
   * The field is optional at the type level because entries written
   * before this field existed remain deserializable; new DecisionEntry
   * writers SHOULD populate it (null or a specific source) so older
   * "absent" vs newer "explicit null" cases can be distinguished
   * downstream.
   */
  readonly escalationSource?: EscalationSource;
}

// ---------------------------------------------------------------------------
// ApprovalEntry — approval verdict record. Bound to a DecisionEntry by
// `correlationId`. `keyId` + `sequenceNumber` + `signature` replay the
// HMAC-signed handle per CL-07 §1a + pulse 38.
// ---------------------------------------------------------------------------

/**
 * Outcome recorded in a CL-11 §3a `ApprovalEntry`. Distinct from
 * `ApprovalOutcome` in `companion-mock.ts` (the signed-response shape the
 * companion returns before the adapter persists it).
 */
export type ApprovalEntryOutcome = 'approve' | 'deny' | 'timeout' | 'rejected';

export interface ApprovalEntry extends AuditChainFields {
  readonly type: 'approval';
  readonly correlationId: string;
  readonly approver: string;
  readonly outcome: ApprovalEntryOutcome;
  readonly invalidReason?: ApprovalInvalidReason;
  readonly ttl: number;
  readonly nonce: string;
  readonly keyId: string;
  readonly sequenceNumber: number;
  readonly signature: string;
}

// ---------------------------------------------------------------------------
// DrainWindowEntry — drain period between promote and admit of N+1, ONLY
// when at least one in-flight call was captured against snapshot N (R1
// invariants F-07 — empty-drain promotes do not emit).
// ---------------------------------------------------------------------------

export interface DrainWindowEntry extends AuditChainFields {
  readonly type: 'drain-window';
  readonly from: string | null;
  readonly to: string;
  readonly inflightCount: number;
  readonly openedAt: number;
  readonly closedAt: number;
  readonly outcome: 'drained' | 'timed-out';
}

// ---------------------------------------------------------------------------
// OnSnapshotPromotedTimeoutEntry — emitted on hook timeout. One entry per
// provider that did not settle within `timeoutMs`.
// ---------------------------------------------------------------------------

export interface OnSnapshotPromotedTimeoutEntry extends AuditChainFields {
  readonly type: 'on-snapshot-promoted-timeout';
  readonly providerId: string;
  readonly from: string | null;
  readonly snapshotId: string;
  readonly timeoutMs: number;
  readonly reason: 'hook-threw' | 'hook-hung';
  readonly errorMessage?: string;
}

// ---------------------------------------------------------------------------
// SidecarUnreachableEntry — companion sidecar failed to answer within the
// health window. `attempts` captures retries before giving up; `lastError`
// is the terminal socket/HTTP error surface.
// ---------------------------------------------------------------------------

export interface SidecarUnreachableEntry extends AuditChainFields {
  readonly type: 'sidecar-unreachable';
  readonly sidecarId: string;
  readonly endpoint: string;
  readonly attempts: number;
  readonly lastError: string;
}

// ---------------------------------------------------------------------------
// CrossTenantAccessDeniedEntry — a decision denied at the tenant boundary.
// Logged with both `attemptedTenantId` (what the caller claimed / tried)
// and `callerTenantId` (what identity bridge extracted).
// ---------------------------------------------------------------------------

export interface CrossTenantAccessDeniedEntry extends AuditChainFields {
  readonly type: 'cross-tenant-access-denied';
  readonly correlationId: string;
  readonly callerTenantId: string | null;
  readonly attemptedTenantId: string;
  readonly tool: string;
  readonly denialReason: string;
}

// ---------------------------------------------------------------------------
// AuditChainEntry — the full discriminated union.
// ---------------------------------------------------------------------------

export type AuditChainEntry =
  | ProducerEntry
  | DecisionEntry
  | ApprovalEntry
  | DrainWindowEntry
  | OnSnapshotPromotedTimeoutEntry
  | SidecarUnreachableEntry
  | CrossTenantAccessDeniedEntry;

// ---------------------------------------------------------------------------
// Inputs — the caller-facing shapes stripped of fields the writer computes
// (ts, seq, prevHash, hash). Parallel to `AuditSinkDecisionInput` in
// host-context.ts.
// ---------------------------------------------------------------------------

type Inputize<T extends AuditChainFields & { readonly type: string }> = Omit<
  T,
  keyof AuditChainFields | 'type'
>;

export type ProducerEntryInput = Inputize<ProducerEntry>;
export type DecisionEntryInput = Inputize<DecisionEntry>;
export type ApprovalEntryInput = Inputize<ApprovalEntry>;
export type DrainWindowEntryInput = Inputize<DrainWindowEntry>;
export type OnSnapshotPromotedTimeoutEntryInput = Inputize<OnSnapshotPromotedTimeoutEntry>;
export type SidecarUnreachableEntryInput = Inputize<SidecarUnreachableEntry>;
export type CrossTenantAccessDeniedEntryInput = Inputize<CrossTenantAccessDeniedEntry>;
