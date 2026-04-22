/**
 * test/e2e/harness/audit-chain — CL-11 §3a cross-linked audit chain.
 *
 * Three primitives compose the audit oracle:
 *
 *   - `AuditChainWriter` — appends entries to a JSONL file. Each entry is
 *     finalized with `ts` (ISO-8601), `seq` (strictly monotonic from 1),
 *     `prevHash` (previous entry's `hash`, `GENESIS_HASH` for the first),
 *     and `hash` (sha256 over the JCS-canonicalized body excluding the
 *     `hash` field itself).
 *   - `AuditChainReader` — loads entries back with cross-entry lookups:
 *     `byCorrelationId(id)` and `byPolicyArtifactSha256(sha)`.
 *   - `verifyChain(entries)` — the oracle. Three cross-link assertions + hash
 *     integrity + sequence monotonicity. Returns a structured reason on
 *     failure so scenarios can assert on specific invariant classes.
 *
 * CL-11 §3a is the single highest-leverage spec in this plan: ~15 of 30
 * audited HC-BLOCKs cite it. SC-01..SC-05 scenarios all assert on these
 * invariants in various combinations.
 *
 * @module test/e2e/harness/audit-chain
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { canonicalize } from '@bic/openclaw-guardrails/audit';
import type {
  AuditChainEntry,
  ApprovalEntry,
  DecisionEntry,
  ProducerEntry,
  ProducerEntryInput,
  DecisionEntryInput,
  ApprovalEntryInput,
  DrainWindowEntry,
  DrainWindowEntryInput,
  OnSnapshotPromotedTimeoutEntry,
  OnSnapshotPromotedTimeoutEntryInput,
  SidecarUnreachableEntry,
  SidecarUnreachableEntryInput,
  CrossTenantAccessDeniedEntry,
  CrossTenantAccessDeniedEntryInput,
} from './audit-types.ts';

/**
 * Genesis `prevHash` sentinel — the conventional 64-char zero string prefixed
 * `sha256:`. Present on the first entry in every chain; tested by
 * `audit-chain-hash.unit.test.ts`.
 */
export const GENESIS_HASH = 'sha256:' + '0'.repeat(64);

/**
 * Default scope allowlist for `ProducerEntry.scope` — widens across the
 * `@bic/openclaw` → `@openclaw` scope flip (F-07) so audit logs written under
 * either scope remain deserializable in the same reader.
 */
export const DEFAULT_SCOPE_ALLOWLIST: readonly string[] = Object.freeze([
  '@bic/openclaw',
  '@openclaw',
]);

// ---------------------------------------------------------------------------
// Hash computation — sha256 over JCS-canonicalized body excluding `hash`.
// ---------------------------------------------------------------------------

/**
 * Compute the `hash` field for an entry given a body that omits only `hash`.
 * The body is canonicalized via `@bic/openclaw-guardrails/audit.canonicalize`
 * (the single family-wide canonicalizer) so the bytes hashed are identical
 * across Linux + Windows + macOS per CL-NEW.
 */
export function computeEntryHash(
  bodyWithoutHash: Omit<AuditChainEntry, 'hash'>,
): string {
  const bytes = canonicalize(bodyWithoutHash);
  return 'sha256:' + createHash('sha256').update(bytes, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// AuditChainWriter — append entries, persist as JSONL, track state.
// ---------------------------------------------------------------------------

export interface AuditChainWriterOptions {
  /** Absolute path to the JSONL file. Parent dir is created if missing. */
  readonly filePath: string;
  /** Injected clock for deterministic `ts`; defaults to `Date.now()`. */
  readonly clock?: () => number;
}

export class AuditChainWriter {
  private readonly filePath: string;
  private readonly clock: () => number;
  private seq = 0;
  private prevHash: string = GENESIS_HASH;

  constructor(opts: AuditChainWriterOptions) {
    this.filePath = opts.filePath;
    this.clock = opts.clock ?? ((): number => Date.now());
    const parent = dirname(this.filePath);
    if (!existsSync(parent)) {
      mkdirSync(parent, { recursive: true });
    }
  }

  /** Current sequence counter (last-written seq, 0 before any writes). */
  currentSeq(): number {
    return this.seq;
  }

  /** Current `prevHash` — the last-written entry's `hash`, or genesis. */
  currentPrevHash(): string {
    return this.prevHash;
  }

  appendProducer(input: ProducerEntryInput): ProducerEntry {
    const body = this.frame('producer', input) as Omit<ProducerEntry, 'hash'>;
    return this.finalize<ProducerEntry>(body);
  }

  appendDecision(input: DecisionEntryInput): DecisionEntry {
    const body = this.frame('decision', input) as Omit<DecisionEntry, 'hash'>;
    return this.finalize<DecisionEntry>(body);
  }

  appendApproval(input: ApprovalEntryInput): ApprovalEntry {
    const body = this.frame('approval', input) as Omit<ApprovalEntry, 'hash'>;
    return this.finalize<ApprovalEntry>(body);
  }

  appendDrainWindow(input: DrainWindowEntryInput): DrainWindowEntry {
    const body = this.frame('drain-window', input) as Omit<DrainWindowEntry, 'hash'>;
    return this.finalize<DrainWindowEntry>(body);
  }

  appendOnSnapshotPromotedTimeout(
    input: OnSnapshotPromotedTimeoutEntryInput,
  ): OnSnapshotPromotedTimeoutEntry {
    const body = this.frame(
      'on-snapshot-promoted-timeout',
      input,
    ) as Omit<OnSnapshotPromotedTimeoutEntry, 'hash'>;
    return this.finalize<OnSnapshotPromotedTimeoutEntry>(body);
  }

  appendSidecarUnreachable(
    input: SidecarUnreachableEntryInput,
  ): SidecarUnreachableEntry {
    const body = this.frame(
      'sidecar-unreachable',
      input,
    ) as Omit<SidecarUnreachableEntry, 'hash'>;
    return this.finalize<SidecarUnreachableEntry>(body);
  }

  appendCrossTenantAccessDenied(
    input: CrossTenantAccessDeniedEntryInput,
  ): CrossTenantAccessDeniedEntry {
    const body = this.frame(
      'cross-tenant-access-denied',
      input,
    ) as Omit<CrossTenantAccessDeniedEntry, 'hash'>;
    return this.finalize<CrossTenantAccessDeniedEntry>(body);
  }

  private frame(
    type: AuditChainEntry['type'],
    input: object,
  ): Record<string, unknown> {
    this.seq += 1;
    const ts = new Date(this.clock()).toISOString();
    return {
      type,
      ...input,
      ts,
      seq: this.seq,
      prevHash: this.prevHash,
    };
  }

  private finalize<T extends AuditChainEntry>(
    bodyWithoutHash: Omit<T, 'hash'>,
  ): T {
    const hash = computeEntryHash(bodyWithoutHash as Omit<AuditChainEntry, 'hash'>);
    const entry = { ...bodyWithoutHash, hash } as T;
    appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
    this.prevHash = hash;
    return entry;
  }
}

// ---------------------------------------------------------------------------
// AuditChainReader — load entries + cross-entry lookups.
// ---------------------------------------------------------------------------

export interface AuditChainReaderOptions {
  readonly filePath: string;
  /**
   * Runtime-configurable `ProducerEntry.scope` allowlist. Older logs written
   * under `@bic/openclaw` remain deserializable after the scope flip because
   * the reader accepts BOTH current + future scopes by default.
   */
  readonly scopeAllowlist?: readonly string[];
}

export class AuditChainReader {
  private readonly entries: readonly AuditChainEntry[];
  private readonly scopeAllowlist: ReadonlySet<string>;

  constructor(opts: AuditChainReaderOptions) {
    this.scopeAllowlist = new Set(opts.scopeAllowlist ?? DEFAULT_SCOPE_ALLOWLIST);
    this.entries = AuditChainReader.parseFile(opts.filePath);
    for (const entry of this.entries) {
      if (entry.type === 'producer' && !this.scopeAllowlist.has(entry.scope)) {
        throw new Error(
          `audit-chain: ProducerEntry.scope '${entry.scope}' not in allowlist ` +
            `[${[...this.scopeAllowlist].join(', ')}]`,
        );
      }
    }
  }

  all(): readonly AuditChainEntry[] {
    return this.entries;
  }

  byCorrelationId(correlationId: string): readonly AuditChainEntry[] {
    return this.entries.filter(
      (e): e is DecisionEntry | ApprovalEntry | CrossTenantAccessDeniedEntry =>
        (e.type === 'decision' ||
          e.type === 'approval' ||
          e.type === 'cross-tenant-access-denied') &&
        e.correlationId === correlationId,
    );
  }

  byPolicyArtifactSha256(
    sha: string,
  ): readonly (ProducerEntry | DecisionEntry)[] {
    return this.entries.filter(
      (e): e is ProducerEntry | DecisionEntry =>
        (e.type === 'producer' || e.type === 'decision') &&
        e.policyArtifactSha256 === sha,
    );
  }

  private static parseFile(filePath: string): AuditChainEntry[] {
    if (!existsSync(filePath)) return [];
    const text = readFileSync(filePath, 'utf8');
    if (text.length === 0) return [];
    const lines = text.split('\n').filter((line) => line.length > 0);
    return lines.map((line) => JSON.parse(line) as AuditChainEntry);
  }
}

// ---------------------------------------------------------------------------
// verifyChain — the oracle. Returns `{ ok: true }` or `{ ok: false, reason }`.
// ---------------------------------------------------------------------------

export type VerifyChainReason =
  | 'missing-producer-for-decision'
  | 'orphan-approval'
  | 'missing-approval-for-review'
  | 'correlation-mismatch'
  | 'chain-gap'
  | 'hash-mismatch'
  | 'sequence-rollback';

export interface VerifyChainOk {
  readonly ok: true;
}

export interface VerifyChainFail {
  readonly ok: false;
  readonly reason: VerifyChainReason;
  /** Offending entry's seq, when applicable. */
  readonly atSeq?: number;
}

export type VerifyChainResult = VerifyChainOk | VerifyChainFail;

/**
 * Oracle: assert all CL-11 §3a invariants on a complete chain.
 *
 * Invariants (in failure-order):
 *  1. `sequence-rollback`              — seq strictly monotonic from 1
 *  2. `chain-gap`                      — prevHash threading break (missing entry)
 *  3. `hash-mismatch`                  — entry content mutation (recomputed hash ≠ stored)
 *  4. `missing-producer-for-decision`  — every DecisionEntry's
 *                                        `policyArtifactSha256` is matched by
 *                                        a ProducerEntry
 *  5. `correlation-mismatch`           — both an orphan approval AND a review
 *                                        decision missing its approval
 *                                        co-exist (paired corruption)
 *  6. `missing-approval-for-review`    — every `decision === 'review'`
 *                                        DecisionEntry has a matching
 *                                        ApprovalEntry by correlationId
 *  7. `orphan-approval`                — every ApprovalEntry has a matching
 *                                        DecisionEntry by correlationId
 */
export function verifyChain(
  entries: readonly AuditChainEntry[],
): VerifyChainResult {
  // (1) sequence monotonicity
  for (let i = 0; i < entries.length; i++) {
    const expected = i + 1;
    const entry = entries[i]!;
    if (entry.seq !== expected) {
      return { ok: false, reason: 'sequence-rollback', atSeq: entry.seq };
    }
  }

  // (2) hash chain integrity — split into 'chain-gap' (prev-hash thread break,
  //      e.g. a missing entry) and 'hash-mismatch' (entry content mutation
  //      whose recomputed hash no longer matches stored). Operators need
  //      granular invalidReasons to script against specific failure modes.
  let expectedPrev = GENESIS_HASH;
  for (const entry of entries) {
    if (entry.prevHash !== expectedPrev) {
      return { ok: false, reason: 'chain-gap', atSeq: entry.seq };
    }
    const { hash: _h, ...body } = entry;
    void _h;
    const recomputed = computeEntryHash(body as Omit<AuditChainEntry, 'hash'>);
    if (recomputed !== entry.hash) {
      return { ok: false, reason: 'hash-mismatch', atSeq: entry.seq };
    }
    expectedPrev = entry.hash;
  }

  // (3) every DecisionEntry.policyArtifactSha256 has a ProducerEntry
  const producerShas = new Set<string>();
  for (const entry of entries) {
    if (entry.type === 'producer') producerShas.add(entry.policyArtifactSha256);
  }
  for (const entry of entries) {
    if (entry.type === 'decision' && !producerShas.has(entry.policyArtifactSha256)) {
      return { ok: false, reason: 'missing-producer-for-decision', atSeq: entry.seq };
    }
  }

  // (4 preflight) detect paired correlation-mismatch corruption — if BOTH
  // (a) some review decision has no matching approval, AND
  // (b) some approval has no matching decision,
  // then a correlationId mutation likely split a previously-paired (decision,
  // approval) pair. Report the more specific 'correlation-mismatch' reason
  // before falling through to the unpaired reasons below.
  const approvalByCorrId = new Map<string, ApprovalEntry>();
  const decisionCorrIds = new Set<string>();
  for (const entry of entries) {
    if (entry.type === 'approval') approvalByCorrId.set(entry.correlationId, entry);
    if (entry.type === 'decision') decisionCorrIds.add(entry.correlationId);
  }
  let reviewWithoutApprovalSeq: number | undefined;
  let orphanApprovalSeq: number | undefined;
  for (const entry of entries) {
    if (
      entry.type === 'decision' &&
      entry.decision === 'review' &&
      !approvalByCorrId.has(entry.correlationId)
    ) {
      reviewWithoutApprovalSeq ??= entry.seq;
    }
    if (entry.type === 'approval' && !decisionCorrIds.has(entry.correlationId)) {
      orphanApprovalSeq ??= entry.seq;
    }
  }
  if (reviewWithoutApprovalSeq !== undefined && orphanApprovalSeq !== undefined) {
    return { ok: false, reason: 'correlation-mismatch', atSeq: reviewWithoutApprovalSeq };
  }

  // (4) every review DecisionEntry has a matching ApprovalEntry
  if (reviewWithoutApprovalSeq !== undefined) {
    return { ok: false, reason: 'missing-approval-for-review', atSeq: reviewWithoutApprovalSeq };
  }

  // (5) every ApprovalEntry has a matching DecisionEntry
  if (orphanApprovalSeq !== undefined) {
    return { ok: false, reason: 'orphan-approval', atSeq: orphanApprovalSeq };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// modifiedArgsHash — canonical hash for the optional DecisionEntry field.
// Delegates to the shared canonicalizer so a redaction that flips any byte
// of the arguments record produces a different hash (modify-args-hash test).
// ---------------------------------------------------------------------------

/**
 * Compute `sha256:<hex>` over the JCS-canonical bytes of `modifiedArgs`.
 * Returns the identical hash for identical args (unchanged args produce an
 * identity hash), and a different hash for any redaction (hash reflects
 * redaction). Used by the harness to populate
 * `DecisionEntry.modifiedArgsHash` after a provider returns a `modify`
 * decision with mutated arguments.
 */
export function modifiedArgsHash(modifiedArgs: unknown): string {
  const bytes = canonicalize(modifiedArgs);
  return 'sha256:' + createHash('sha256').update(bytes, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// corruptAuditChain — targeted negative-test helper (pulse 60 CL-11 §3a).
// Produces chain variants that break one specific invariant so operators can
// prove `claws policy verify` / verifyChain reports the distinct invalidReason.
// ---------------------------------------------------------------------------

export type CorruptionMode = 'correlation-mismatch' | 'chain-gap' | 'hash-mismatch';

export interface CorruptAuditChainOptions {
  readonly mode: CorruptionMode;
}

/**
 * Return a corrupted copy of `entries` suitable for negative-case testing.
 *
 * - `correlation-mismatch`: mutates the first DecisionEntry's correlationId AND
 *   recomputes its hash AND re-threads subsequent prevHashes so the chain hash
 *   check passes. The ApprovalEntry retains the original correlationId, so
 *   verifyChain reports `correlation-mismatch` (paired decision-without-approval
 *   + orphan-approval). Caller must ensure at least one review DecisionEntry
 *   with a matched ApprovalEntry exists; if no such pair exists, throws.
 * - `chain-gap`: removes one intermediate entry. Subsequent entries' prevHash
 *   no longer threads, so verifyChain reports `chain-gap` at the first
 *   now-orphaned entry.
 * - `hash-mismatch`: mutates an entry's content (not hash) so computeEntryHash
 *   no longer matches the stored hash. verifyChain reports `hash-mismatch`.
 *
 * Returned entries are deep-copied; the input array is NOT mutated.
 */
export function corruptAuditChain(
  entries: readonly AuditChainEntry[],
  opts: CorruptAuditChainOptions,
): readonly AuditChainEntry[] {
  if (entries.length < 2) {
    throw new Error('corruptAuditChain: need at least 2 entries');
  }
  // Deep-clone via structuredClone-equivalent (JSON round-trip is sufficient
  // because entries are plain JSON values).
  const copy: AuditChainEntry[] = JSON.parse(JSON.stringify(entries));

  switch (opts.mode) {
    case 'correlation-mismatch': {
      // Find the first review DecisionEntry whose correlationId has a matching
      // ApprovalEntry; mutate the decision's correlationId and re-thread hashes.
      const approvalByCorrId = new Set<string>();
      for (const e of copy) if (e.type === 'approval') approvalByCorrId.add(e.correlationId);
      const idx = copy.findIndex(
        (e) =>
          e.type === 'decision' &&
          e.decision === 'review' &&
          approvalByCorrId.has(e.correlationId),
      );
      if (idx < 0) {
        throw new Error(
          'corruptAuditChain: correlation-mismatch mode requires at least one review DecisionEntry with a matching ApprovalEntry',
        );
      }
      const target = copy[idx] as DecisionEntry;
      // Mutate correlationId to something guaranteed not to match any approval.
      target.correlationId = `corrupted-${target.correlationId}`;
      // Recompute this entry's hash (content changed, so stored hash must be
      // refreshed to survive the hash-integrity check).
      const { hash: _oldHash, ...body } = target;
      void _oldHash;
      const newHash = computeEntryHash(body as Omit<AuditChainEntry, 'hash'>);
      (target as { hash: string }).hash = newHash;
      // Re-thread subsequent prevHashes so the chain-gap check still passes.
      let prev = newHash;
      for (let i = idx + 1; i < copy.length; i++) {
        const e = copy[i]!;
        (e as { prevHash: string }).prevHash = prev;
        const { hash: _oh, ...b } = e;
        void _oh;
        const rh = computeEntryHash(b as Omit<AuditChainEntry, 'hash'>);
        (e as { hash: string }).hash = rh;
        prev = rh;
      }
      return copy;
    }
    case 'chain-gap': {
      // Remove an intermediate entry (not first, not last). Renumber the seqs
      // of subsequent entries so sequence-monotonicity still passes — the
      // signal we want is specifically the prevHash thread break, not a seq
      // rollback. The next entry's prevHash now points to a hash no longer in
      // the chain.
      if (copy.length < 3) {
        throw new Error('corruptAuditChain: chain-gap mode requires at least 3 entries');
      }
      const removeIdx = 1; // deterministic: remove second entry
      copy.splice(removeIdx, 1);
      // Renumber seq on the remaining entries (keep 1..n contiguous). Recompute
      // each entry's hash since seq is part of the hashed body. Do NOT touch
      // prevHash — that's the gap signal.
      let prev: string | undefined;
      for (let i = 0; i < copy.length; i++) {
        const e = copy[i]!;
        (e as { seq: number }).seq = i + 1;
        // Recompute hash with the new seq (and whatever prevHash is currently
        // stored — we leave prevHash intentionally stale for index >= removeIdx).
        const { hash: _oh, ...b } = e;
        void _oh;
        (e as { hash: string }).hash = computeEntryHash(b as Omit<AuditChainEntry, 'hash'>);
        prev = (e as { hash: string }).hash;
      }
      void prev;
      return copy;
    }
    case 'hash-mismatch': {
      // Mutate the first DecisionEntry's content without touching its stored
      // hash. computeEntryHash(body) now produces a different hash; verifyChain
      // reports 'hash-mismatch' at that entry's seq.
      const idx = copy.findIndex((e) => e.type === 'decision');
      if (idx < 0) {
        throw new Error('corruptAuditChain: hash-mismatch mode requires at least one DecisionEntry');
      }
      const target = copy[idx] as DecisionEntry;
      // Flip one benign content field; any mutation that changes canonical
      // bytes is sufficient.
      target.principal = `${target.principal}-tampered`;
      // Leave entry.hash and entry.prevHash untouched so the gap check passes
      // but the content-hash check fails.
      return copy;
    }
    default: {
      const _exhaustive: never = opts.mode;
      throw new Error(`corruptAuditChain: unknown mode ${String(_exhaustive)}`);
    }
  }
}
