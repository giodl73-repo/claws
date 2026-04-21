/**
 * test/e2e/harness/snapshot-switch — CL-07 snapshot-switch Rules 1-4.
 *
 * Implements the non-uplift promote loop: in-flight calls continue on
 * snapshot N while new calls are gated on N+1 until every registered
 * provider's `onSnapshotPromoted` hook settles, or the host-configured
 * `hookTimeoutMs` elapses — at which point N+1 is admitted anyway and an
 * `OnSnapshotPromotedTimeoutEntry` is emitted for each provider that timed
 * out or threw.
 *
 * Rules (per pulse 41 plan):
 *
 *   1. Snapshot in-force at decision-start is captured before any await —
 *      the harness-side caller exposes `beginInflight(correlationId)` so
 *      tests can model real callers that have started against snapshot N.
 *   2. New calls use N+1 only AFTER the hook fans out and settles / admits.
 *   3. Hook throw/hang → in-flight continues on N, new calls gated until
 *      timeout, then admitted to N+1 regardless.
 *   4. On timeout: `OnSnapshotPromotedTimeoutEntry` per stuck provider.
 *
 * A `DrainWindowEntry` is emitted ONLY when the drain is non-trivial
 * (≥1 in-flight call captured at promote time) — R1 invariants F-07 keeps
 * the audit chain clean on the common "empty-drain" promote path.
 *
 * First-promote handling (R1 type-system F-10): when
 * `HostContext.snapshot.currentId === null`, `promote(id)` admits directly
 * as the initial snapshot with no drain window, but still fires
 * `onSnapshotPromoted({ from: null, to: id })` on each provider.
 *
 * This module is **not** the final audit writer — `DrainWindowEntry` and
 * `OnSnapshotPromotedTimeoutEntry` are drafted here and finalized in pulse
 * 43. It also does NOT reload trust sets — trust-set reload is a separate
 * `fs.watch` loop (TRUST-R-001, pulse 44).
 *
 * @module test/e2e/harness/snapshot-switch
 */

import type {
  DrainWindowEntry,
  OnSnapshotPromotedTimeoutEntry,
} from './audit-types.ts';
import type { LifecycleManager, SnapshotMeta } from './provider-lifecycle.ts';

export const DEFAULT_HOOK_TIMEOUT_MS = 5_000;

export interface PromoteOptions {
  /** Upper bound on the per-provider hook fan-out (default 5s). */
  readonly hookTimeoutMs?: number;
}

export interface PromoteResult {
  readonly from: string | null;
  readonly to: string;
  readonly promotedAt: number;
  readonly drainWindow: DrainWindowEntry | null;
  readonly timeouts: readonly OnSnapshotPromotedTimeoutEntry[];
  readonly fanout: readonly string[];
  readonly inflightAtStart: number;
}

export interface InflightHandle {
  readonly correlationId: string;
  readonly snapshotId: string;
  /** Mark the call complete — releases the drain window countdown. */
  settle(): void;
}

export interface SnapshotSwitchAuditSink {
  writeDrainWindow(
    entry: Omit<
      DrainWindowEntry,
      'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'
    >,
  ): Promise<DrainWindowEntry>;
  writeOnSnapshotPromotedTimeout(
    entry: Omit<
      OnSnapshotPromotedTimeoutEntry,
      'kind' | 'sinkId' | 'sequence' | 'prevHash' | 'entryHash' | 'emittedAt'
    >,
  ): Promise<OnSnapshotPromotedTimeoutEntry>;
}

export interface SnapshotSwitchOptions {
  readonly lifecycle: LifecycleManager;
  readonly auditSink: SnapshotSwitchAuditSink;
  readonly clock?: () => number;
  /**
   * Harness-level commit: flips `HostContext.snapshot.currentId` once the
   * drain window closes (or the timeout elapses). The caller wires this to
   * the host-context handle's own snapshot state.
   */
  readonly commit: (to: string) => void | Promise<void>;
  /** Fallback when `commit` hasn't run yet — reports current in-force id. */
  readonly currentId: () => string | null;
}

interface InflightEntry {
  readonly correlationId: string;
  readonly snapshotId: string;
  resolve: () => void;
  done: Promise<void>;
}

/**
 * Thin, stateful controller that owns the admission gate + drain set for a
 * single harness instance. `promote(id)` runs CL-07 Rules 1-4; callers
 * use `beginInflight(correlationId)` to model a decision that started
 * before the promote.
 */
export class SnapshotSwitch {
  private readonly lifecycle: LifecycleManager;
  private readonly auditSink: SnapshotSwitchAuditSink;
  private readonly clock: () => number;
  private readonly commit: (to: string) => void | Promise<void>;
  private readonly getCurrentId: () => string | null;
  private readonly inflight = new Map<string, InflightEntry>();
  private admitGate: Promise<void> | null = null;

  constructor(opts: SnapshotSwitchOptions) {
    this.lifecycle = opts.lifecycle;
    this.auditSink = opts.auditSink;
    this.clock = opts.clock ?? ((): number => Date.now());
    this.commit = opts.commit;
    this.getCurrentId = opts.currentId;
  }

  /**
   * Register a call as started against the current snapshot — returns a
   * handle the caller settles when the work completes. The drain window
   * will not close until every open handle settles OR the hook timeout
   * elapses.
   */
  beginInflight(correlationId: string): InflightHandle {
    const snapshotId = this.getCurrentId();
    if (snapshotId === null) {
      throw new Error(
        'snapshot-switch: cannot beginInflight before first promote',
      );
    }
    let resolve!: () => void;
    const done = new Promise<void>((r) => {
      resolve = r;
    });
    const entry: InflightEntry = { correlationId, snapshotId, resolve, done };
    this.inflight.set(correlationId, entry);
    return {
      correlationId,
      snapshotId,
      settle: (): void => {
        const cur = this.inflight.get(correlationId);
        if (cur === undefined) return;
        this.inflight.delete(correlationId);
        cur.resolve();
      },
    };
  }

  /**
   * Wait for the current admission gate to clear before proceeding with
   * a new call. Callers hit this as a `beforeToolCall` barrier — when no
   * promote is active it resolves immediately.
   */
  async awaitAdmission(): Promise<void> {
    if (this.admitGate !== null) {
      await this.admitGate;
    }
  }

  /**
   * Rule 1-4 promote: fans out `onSnapshotPromoted` on every provider in
   * parallel; holds the admission gate until all settle OR `hookTimeoutMs`
   * elapses; emits `DrainWindowEntry` (non-trivial drains only) +
   * `OnSnapshotPromotedTimeoutEntry` (one per stuck provider).
   */
  async promote(
    snapshotId: string,
    opts: PromoteOptions = {},
  ): Promise<PromoteResult> {
    const hookTimeoutMs = opts.hookTimeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS;
    const from = this.getCurrentId();
    const promotedAt = this.clock();

    // First-promote path (R1 F-10): no prior snapshot → admit directly,
    // no drain window. Still fan out the hook so providers see the
    // `{ from: null, to: id }` event.
    if (from === null) {
      const meta: SnapshotMeta = {
        from: null,
        to: snapshotId,
        snapshotId,
        promotedAt,
      };
      const fanoutResult = await this.fanoutWithTimeout(meta, hookTimeoutMs);
      await this.commit(snapshotId);
      return {
        from: null,
        to: snapshotId,
        promotedAt,
        drainWindow: null,
        timeouts: fanoutResult.timeouts,
        fanout: fanoutResult.fanout,
        inflightAtStart: 0,
      };
    }

    // Non-first-promote path (Rules 1-4): capture in-flight set, gate new
    // calls, fan out hook in parallel, drain OR timeout, emit entries.
    const inflightAtStart = this.inflight.size;
    const capturedCalls = Array.from(this.inflight.values());
    const openedAt = promotedAt;

    let releaseGate!: () => void;
    this.admitGate = new Promise<void>((r) => {
      releaseGate = r;
    });

    const meta: SnapshotMeta = {
      from,
      to: snapshotId,
      snapshotId,
      promotedAt,
    };

    const fanoutResult = await this.fanoutWithTimeout(meta, hookTimeoutMs);

    // Drain: wait for the in-flight set captured at promote time OR the
    // same timeout budget (if the hook hung/threw, we still cap drain).
    const drainOutcome = await this.waitForDrain(
      capturedCalls,
      hookTimeoutMs,
      fanoutResult.timedOut,
    );

    const closedAt = this.clock();
    let drainWindow: DrainWindowEntry | null = null;
    if (inflightAtStart > 0) {
      drainWindow = await this.auditSink.writeDrainWindow({
        from,
        to: snapshotId,
        inflightCount: inflightAtStart,
        openedAt,
        closedAt,
        outcome: drainOutcome,
      });
    }

    await this.commit(snapshotId);
    releaseGate();
    this.admitGate = null;

    return {
      from,
      to: snapshotId,
      promotedAt,
      drainWindow,
      timeouts: fanoutResult.timeouts,
      fanout: fanoutResult.fanout,
      inflightAtStart,
    };
  }

  private async fanoutWithTimeout(
    meta: SnapshotMeta,
    hookTimeoutMs: number,
  ): Promise<{
    fanout: readonly string[];
    timeouts: readonly OnSnapshotPromotedTimeoutEntry[];
    timedOut: boolean;
  }> {
    const ids = this.lifecycle.registeredIds();
    if (ids.length === 0) {
      return { fanout: [], timeouts: [], timedOut: false };
    }

    const timeouts: OnSnapshotPromotedTimeoutEntry[] = [];
    // Per-provider hook dispatch via the lifecycle manager's fan-out —
    // we re-fire individually so one stuck provider doesn't block the rest.
    const hookPromise = this.lifecycle
      .fireSnapshotPromoted(meta)
      .then((fanout) => ({ kind: 'settled' as const, fanout }))
      .catch((err: unknown) => ({
        kind: 'threw' as const,
        error: err instanceof Error ? err : new Error(String(err)),
      }));

    const timeoutPromise = new Promise<{ kind: 'timed-out' }>((resolve) => {
      setTimeout(
        () => resolve({ kind: 'timed-out' }),
        hookTimeoutMs,
      ).unref?.();
    });

    const result = await Promise.race([hookPromise, timeoutPromise]);

    if (result.kind === 'settled') {
      return { fanout: result.fanout, timeouts: [], timedOut: false };
    }

    // timeout or throw: emit one TimeoutEntry per registered provider
    // (CL-11 §3a — per-provider visibility into the stuck set).
    const reason: 'hook-threw' | 'hook-hung' =
      result.kind === 'threw' ? 'hook-threw' : 'hook-hung';
    const errorMessage =
      result.kind === 'threw' ? result.error.message : undefined;

    for (const providerId of ids) {
      const entry = await this.auditSink.writeOnSnapshotPromotedTimeout({
        providerId,
        from: meta.from,
        snapshotId: meta.to,
        timeoutMs: hookTimeoutMs,
        reason,
        ...(errorMessage !== undefined ? { errorMessage } : {}),
      });
      timeouts.push(entry);
    }
    return { fanout: [], timeouts, timedOut: true };
  }

  private async waitForDrain(
    captured: readonly InflightEntry[],
    hookTimeoutMs: number,
    hookAlreadyTimedOut: boolean,
  ): Promise<'drained' | 'timed-out'> {
    if (captured.length === 0) {
      return 'drained';
    }
    if (hookAlreadyTimedOut) {
      // Hook timeout already consumed the window budget — admit N+1
      // regardless of in-flight state (Rule 3: "admit to N+1 anyway").
      return 'timed-out';
    }
    const all = Promise.all(captured.map((e) => e.done));
    let timedOutHandle!: () => void;
    const timeoutPromise = new Promise<'timed-out'>((resolve) => {
      const handle = setTimeout(() => resolve('timed-out'), hookTimeoutMs);
      handle.unref?.();
      timedOutHandle = (): void => clearTimeout(handle);
    });
    const winner = await Promise.race([
      all.then((): 'drained' => 'drained'),
      timeoutPromise,
    ]);
    timedOutHandle();
    return winner;
  }
}
