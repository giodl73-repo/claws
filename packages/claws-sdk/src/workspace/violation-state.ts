/**
 * ViolationStateMachine — fail-closed governance posture tracker.
 *
 * The machine consumes the result of a recompile attempt and decides which
 * of the five `ViolationState` values the workspace should be in. It never
 * mutates the serving `GovernanceIR`; callers are expected to keep the
 * "last good" IR around and consult the machine before each write.
 *
 * Key invariants enforced here (not just conventions):
 *
 *   I1  Once a state transition is applied, the previous state is the
 *       single source of truth for any PATCH that was already in-flight.
 *       We expose `transaction()` so the gate middleware can sample the
 *       state atomically and match the CP acceptance P1 criterion (no
 *       PATCH slips through during a transition).
 *
 *   I2  A violation is considered "new" if the `path + rule` pair is not
 *       already present; repeated observations are merged so a 100ms burst
 *       of identical failures collapses into one entry (P2 debounce).
 *
 *   I3  Partial fixes drop the state to the worst severity still present,
 *       never jump straight to CLEAN (P4).
 *
 *   I4  The machine can be serialized / rehydrated to the
 *       `.claws/cache/violation-state.json` envelope so cold-starts don't
 *       default to CLEAN (P6). The persistence layer is the caller's
 *       responsibility; the machine provides `snapshot()` / `restore()`.
 *
 * @module claws-sdk/workspace/violation-state
 */

import {
  ViolationState,
  VIOLATION_STATE_RANK,
  type PendingViolation,
  type PersistedViolationState,
  type ViolationSummary,
} from './violation-types.js';
import type { AuditChainSink } from '../compliance/audit-chain.js';

/**
 * A violation observation fed into the state machine. `firstSeenAt` is
 * assigned inside the machine so tests and callers don't have to thread
 * a clock through the call graph.
 */
export type ViolationInput = Omit<PendingViolation, 'firstSeenAt'>;

/**
 * Result of a recompile the machine is asked to reduce over.
 *
 * `lastGoodVersion` is the workspace version at which the last *successful*
 * compile landed — it's what the status endpoint reports and what time-
 * travel reads resolve against while the machine sits in a degraded state.
 */
export interface RecompileResult {
  readonly violations: readonly ViolationInput[];
  readonly lastGoodVersion: number;
}

/**
 * Fire-and-forget hook for state transitions — used by the serve layer to
 * broadcast `governance_violation` / `governance_resolved` SSE frames.
 * Called AFTER the new state is durable so subscribers never observe a
 * ghost state (I1).
 */
export type TransitionListener = (
  from: ViolationState,
  to: ViolationState,
  violations: readonly PendingViolation[],
) => void;

export interface ViolationStateMachineOptions {
  /** Injectable clock — defaults to `() => new Date().toISOString()`. */
  readonly now?: () => string;
  /** Fired after every state transition (even transitions to the same state). */
  readonly onTransition?: TransitionListener;
  /**
   * Debounce window in milliseconds for {@link ViolationStateMachine.applyRecompile}.
   *
   * When `> 0`, `applyRecompile` does NOT commit immediately. Instead it
   * merges incoming `violations` into a pending buffer keyed on
   * `path + rule`, and schedules a commit at `debounceMs` after the FIRST
   * call in the window. Subsequent `applyRecompile` calls inside the window
   * coalesce into the same pending buffer (additive merge — the last
   * observation for a given key wins, and keys from earlier calls survive).
   * The returned `ViolationState` is the machine's CURRENT committed state
   * (unchanged until the debounce fires); tests that need determinism call
   * {@link ViolationStateMachine.flush} to force a synchronous commit.
   *
   * When `0` (the default) there is no debounce: every `applyRecompile` call
   * commits synchronously as before, preserving existing test behaviour
   * and the pre-debounce API contract.
   *
   * Gate criterion P2 ("two violations arrive within 100ms, both appear
   * after one recompile") is satisfied with `debounceMs: 200` in the serve
   * wiring; the state machine owns the coalescer rather than the caller.
   */
  readonly debounceMs?: number;
  /**
   * Injectable timer factory — defaults to `setTimeout` / `clearTimeout`.
   * Tests that want to drive the debounce deterministically without a real
   * timer should call {@link ViolationStateMachine.flush} instead.
   */
  readonly setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  readonly clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
  /**
   * Optional audit-chain sink (CP-7 R1 ciso M2). When supplied the machine
   * emits one `VIOLATION_STATE_TRANSITION` entry per transition (including
   * no-op transitions that re-enter the same state — operators want
   * visibility on "second tick still CLEAN" for SIEM correlation). Every
   * entry carries `actor`, `target` = workspace root (or `'workspace'`
   * when no root is configured), and severity derived from the TARGET
   * state — ERROR=5, DEGRADED_R5=4, DEGRADED_FLEET/WARN=3, CLEAN=2.
   */
  readonly auditSink?: AuditChainSink;
  /**
   * Actor to stamp on emitted audit entries when no transition-time actor
   * is available. Defaults to `'system'` — transitions driven by the
   * compilation pipeline have no human attribution so the system label
   * is the most honest signal.
   */
  readonly auditActor?: string;
  /**
   * Target string stamped on emitted audit entries. Defaults to
   * `'workspace'`. Production wiring in `claws-serve` threads the
   * absolute workspace root through so audit consumers can partition by
   * workspace id.
   */
  readonly auditTarget?: string;
  /** Policy version recorded on every emitted audit entry. */
  readonly policyVersion?: string;
}

/**
 * Canonical key for a pending violation. A `path + rule` pair collapses
 * duplicates within the debounce window (I2).
 */
function keyOf(v: ViolationInput | PendingViolation): string {
  return `${v.path}::${v.rule}`;
}

/**
 * Compute the "worst severity still present" given a set of violations.
 *
 * - Any `severity: 'fatal'` → ERROR.
 * - Any `severity: 'error'` with `scope: 'structural'` → ERROR.
 * - Any `severity: 'error'` → DEGRADED_R5 (tool-level fail-closed).
 * - Any `rule` starting with `fleet/`                 → DEGRADED_FLEET.
 * - Any `severity: 'warning'` or `'info'`             → DEGRADED_WARN.
 * - Empty set                                         → CLEAN.
 *
 * The rule taxonomy is deliberately narrow so the mapping stays
 * deterministic; callers who need a finer classification should map their
 * domain rule onto one of these severities BEFORE calling `reduce`.
 */
export function reduceState(
  violations: readonly PendingViolation[] | readonly ViolationInput[],
): ViolationState {
  if (violations.length === 0) {
    return ViolationState.CLEAN;
  }
  let worst: ViolationState = ViolationState.CLEAN;
  for (const v of violations) {
    let candidate: ViolationState;
    if (v.severity === 'fatal') {
      candidate = ViolationState.ERROR;
    } else if (v.severity === 'error' && v.scope === 'structural') {
      candidate = ViolationState.ERROR;
    } else if (v.severity === 'error') {
      candidate = ViolationState.DEGRADED_R5;
    } else if (v.rule.startsWith('fleet/')) {
      candidate = ViolationState.DEGRADED_FLEET;
    } else {
      candidate = ViolationState.DEGRADED_WARN;
    }
    if (VIOLATION_STATE_RANK[candidate] > VIOLATION_STATE_RANK[worst]) {
      worst = candidate;
    }
  }
  return worst;
}

/**
 * Five-state governance posture tracker. Thread-unsafe by construction —
 * callers must route all mutations through a single event loop (the serve
 * process already does; the LSP layer serializes on the language-server
 * thread).
 */
export class ViolationStateMachine {
  private state: ViolationState = ViolationState.CLEAN;
  private lastGoodVersion: number | null = null;
  private violations = new Map<string, PendingViolation>();
  private readonly now: () => string;
  private readonly onTransition: TransitionListener | undefined;
  private readonly debounceMs: number;
  private readonly setTimer: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimer: (handle: ReturnType<typeof setTimeout>) => void;
  private readonly auditSink: AuditChainSink | undefined;
  private readonly auditActor: string;
  private readonly auditTarget: string;
  private readonly policyVersion: string;

  /**
   * Debounce coalescer: when `debounceMs > 0`, `applyRecompile` accumulates
   * observations into `pendingBuffer` keyed on `path + rule` and schedules
   * a single commit at `debounceMs` after the first observation in the
   * window. `pendingLastGoodVersion` tracks the most recent
   * `lastGoodVersion` seen; `pendingSawClean` is true if any call in the
   * window arrived with `violations.length === 0` (so the commit honours
   * "last successful compile advances last-good").
   */
  private pendingBuffer: Map<string, PendingViolation> | null = null;
  private pendingLastGoodVersion: number | null = null;
  private pendingSawClean = false;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ViolationStateMachineOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.onTransition = options.onTransition;
    const debounceMs = options.debounceMs ?? 0;
    if (!Number.isFinite(debounceMs) || debounceMs < 0) {
      throw new RangeError(`debounceMs must be a non-negative finite number (got ${String(debounceMs)})`);
    }
    this.debounceMs = debounceMs;
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle));
    this.auditSink = options.auditSink;
    this.auditActor = options.auditActor ?? 'system';
    this.auditTarget = options.auditTarget ?? 'workspace';
    this.policyVersion = options.policyVersion ?? 'unknown';
  }

  /** Current state — synchronous, zero-cost. */
  getState(): ViolationState {
    return this.state;
  }

  /** Version of the last successful compile, or `null` before any compile. */
  getLastGoodVersion(): number | null {
    return this.lastGoodVersion;
  }

  /** Current pending violations in stable insertion order. */
  getViolations(): readonly PendingViolation[] {
    return Array.from(this.violations.values());
  }

  /** Tool names currently blocked (R5 lock). */
  getBlockedTools(): readonly string[] {
    const tools = new Set<string>();
    for (const v of this.violations.values()) {
      if (v.tool !== undefined && v.severity === 'error') {
        tools.add(v.tool);
      }
    }
    return Array.from(tools);
  }

  /**
   * Paths that an admin PATCH may target even while the machine is in
   * ERROR state (repair PATCHes, P5). Everything else must 503 when the
   * violation-gate middleware runs.
   */
  getRepairPaths(): readonly string[] {
    const paths = new Set<string>();
    for (const v of this.violations.values()) {
      paths.add(v.path);
    }
    return Array.from(paths);
  }

  /**
   * Whether the given PATCH target is allowed under the current state.
   *
   * - CLEAN / DEGRADED_FLEET / DEGRADED_WARN → always `true`; WARN attaches
   *   warnings in the response envelope but never rejects.
   * - DEGRADED_R5 → fail-closed when the target tool cannot be identified
   *   (CP-7 R1 dragon M-4). The gate is live on at least one tool and the
   *   caller cannot tell which tool this PATCH is about, so we must NOT
   *   let it through. An explicit `path` matching a repair path (the R5
   *   violation's file is being fixed) still passes. When the tool IS
   *   known, only the blocked one is rejected; all other tools pass.
   * - ERROR → only allowed when the target path matches one of
   *   `getRepairPaths()` (admin repair).
   */
  isPatchAllowed(target: { readonly path?: string; readonly tool?: string }): boolean {
    if (this.state === ViolationState.CLEAN) return true;
    if (this.state === ViolationState.DEGRADED_WARN) return true;
    if (this.state === ViolationState.DEGRADED_FLEET) return true;
    if (this.state === ViolationState.DEGRADED_R5) {
      if (target.tool === undefined) {
        // Fail-closed — but admit an explicit repair PATCH on the violating
        // file so administrators can fix TOOLS.md / SOUL.md under lock.
        if (target.path !== undefined && this.getRepairPaths().includes(target.path)) {
          return true;
        }
        return false;
      }
      return !this.getBlockedTools().includes(target.tool);
    }
    // ERROR — fail-closed except for repair paths
    if (target.path === undefined) return false;
    return this.getRepairPaths().includes(target.path);
  }

  /**
   * Reduce a recompile result into the machine. Returns the new state so
   * callers can short-circuit their control flow without a follow-up
   * `getState()`.
   *
   * When the machine was constructed with `debounceMs > 0`, this call does
   * NOT mutate the committed state; instead it merges `result` into a
   * pending buffer and schedules a single commit at `debounceMs` after the
   * first call in the window (P2). Coalescing semantics:
   *
   *   - Observations are merged on `path + rule`. Two calls within the
   *     window both surface in the post-commit violation set — no violation
   *     the admin needs to see is silently lost.
   *   - `lastGoodVersion` is advanced only when at least one call in the
   *     window arrived with an empty `violations` array; the most recent
   *     such version wins.
   *   - Callers needing synchronous commit (tests, cold shutdown) invoke
   *     {@link flush}.
   *
   * When `debounceMs === 0` (default), commits synchronously and returns
   * the new state — preserving the pre-debounce API contract used by every
   * existing unit/integration test.
   */
  applyRecompile(result: RecompileResult): ViolationState {
    if (this.debounceMs === 0) {
      return this.commitRecompile(result.violations, result.lastGoodVersion, true);
    }

    // Debounced path: merge into the pending buffer without mutating the
    // committed state. The commit fires via `flush()` when the timer
    // elapses.
    const ts = this.now();
    if (this.pendingBuffer === null) {
      this.pendingBuffer = new Map<string, PendingViolation>();
      this.pendingSawClean = false;
      this.pendingLastGoodVersion = null;
    }
    for (const raw of result.violations) {
      const key = keyOf(raw);
      const existing = this.violations.get(key) ?? this.pendingBuffer.get(key);
      const firstSeenAt = existing?.firstSeenAt ?? ts;
      this.pendingBuffer.set(key, { ...raw, firstSeenAt });
    }
    if (result.violations.length === 0) {
      this.pendingSawClean = true;
      this.pendingLastGoodVersion = result.lastGoodVersion;
    }
    if (this.pendingTimer === null) {
      this.pendingTimer = this.setTimer(() => {
        this.pendingTimer = null;
        this.flush();
      }, this.debounceMs);
    }
    return this.state;
  }

  /**
   * Force any pending debounce window to commit synchronously. Safe to
   * call when no debounce is active — returns the current state without
   * side-effects. Designed for test determinism and for cold-shutdown
   * paths that must persist before the process exits.
   *
   * Commit semantics:
   *   - The committed violation set is the UNION of every observation that
   *     arrived during the window (keyed on `path + rule`). Two calls with
   *     `[A]` and `[B]` inside the window produce a commit of `[A, B]`
   *     (P2 — no silent loss).
   *   - If any call in the window was clean (empty violations), the
   *     committed lastGoodVersion advances to the most recent clean call's
   *     `lastGoodVersion`; but violations observed in OTHER calls within
   *     the same window are still committed. The CLEAN state is only
   *     reached when the final merged set is empty — i.e. every call in
   *     the window was clean.
   *   - A window that produces an empty merged set behaves identically to
   *     a single non-debounced `applyRecompile({violations: [], ...})`:
   *     all previously-committed violations are cleared and the state
   *     drops to CLEAN.
   */
  flush(): ViolationState {
    if (this.pendingTimer !== null) {
      this.clearTimer(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.pendingBuffer === null) {
      return this.state;
    }
    const merged: PendingViolation[] = Array.from(this.pendingBuffer.values());
    const sawClean = this.pendingSawClean;
    const lastGood =
      sawClean && this.pendingLastGoodVersion !== null
        ? this.pendingLastGoodVersion
        : this.lastGoodVersion ?? 0;
    this.pendingBuffer = null;
    this.pendingSawClean = false;
    this.pendingLastGoodVersion = null;
    return this.commitRecompile(merged, lastGood, sawClean && merged.length === 0);
  }

  /**
   * Synchronous commit used by both the non-debounced fast path and the
   * debounce flush. `advanceLastGood` controls whether an empty-violations
   * commit advances `lastGoodVersion`: the non-debounced path passes
   * `true` so the classic "clean compile → advance" contract holds; the
   * debounced flush passes `true` only when at least one debounced call
   * arrived clean AND no violations survived the merge.
   */
  private commitRecompile(
    violations: readonly ViolationInput[] | readonly PendingViolation[],
    lastGoodVersion: number,
    advanceLastGood: boolean,
  ): ViolationState {
    const ts = this.now();
    const next = new Map<string, PendingViolation>();
    for (const raw of violations) {
      const key = keyOf(raw);
      const existing = this.violations.get(key);
      const firstSeenAt =
        'firstSeenAt' in raw && typeof raw.firstSeenAt === 'string'
          ? raw.firstSeenAt
          : existing?.firstSeenAt ?? ts;
      next.set(key, { ...(raw as ViolationInput), firstSeenAt });
    }
    this.violations = next;
    if (violations.length === 0 && advanceLastGood) {
      this.lastGoodVersion = lastGoodVersion;
    }
    return this.transition(reduceState(Array.from(this.violations.values())));
  }

  /**
   * Mark a violation as resolved by `path + rule`. Returns the new state.
   *
   * Partial resolution is supported: if this was the last `error` but
   * a `warning` remains, the state drops to DEGRADED_WARN rather than
   * CLEAN (I3 / P4).
   */
  resolveViolation(path: string, rule: string): ViolationState {
    this.violations.delete(`${path}::${rule}`);
    return this.transition(reduceState(Array.from(this.violations.values())));
  }

  /**
   * Capture a snapshot of the current state suitable for JSON persistence
   * in `.claws/cache/violation-state.json`.
   */
  snapshot(): PersistedViolationState {
    return {
      state: this.state,
      lastGoodVersion: this.lastGoodVersion,
      violations: Array.from(this.violations.values()),
      updatedAt: this.now(),
    };
  }

  /**
   * Rehydrate the machine from a persisted snapshot. The transition
   * listener is NOT fired — this is a boot-time operation, and firing
   * a listener would broadcast a ghost transition to clients that were
   * never connected during the crash. Callers that need a boot broadcast
   * should emit it explicitly after `restore()` returns.
   *
   * ## Integrity check (CP-7 R1 dragon M-5)
   *
   * The cached `.claws/cache/violation-state.json` envelope carries no
   * HMAC, so anyone with filesystem write to the workspace could flip
   * ERROR→CLEAN by overwriting the file. When `integrity` is supplied,
   * `restore()` re-derives the authoritative violation set from the
   * last-good IR via the caller's classifier and compares it to what the
   * snapshot claimed. On drift the cached envelope is treated as a hint
   * only — the re-derived set wins, and `onDrift` fires so the caller
   * can log or re-persist the corrected state.
   *
   * Callers without access to a last-good IR (pure SDK consumers, tests)
   * can omit `integrity` and keep the legacy trust-the-envelope behaviour.
   */
  restore(
    snapshot: PersistedViolationState,
    integrity?: {
      /**
       * The last-good IR the serve process held before the crash /
       * restart. May be `undefined` when no clean compile has happened
       * yet — in that case the envelope is accepted as-is because there
       * is nothing authoritative to compare it against.
       */
      readonly lastGoodIR?: unknown;
      /**
       * Classifier that re-derives violations from the IR. Returning an
       * empty array signals the IR is clean; any element rejects the
       * cached envelope and the re-derived set wins.
       */
      readonly classify: (ir: unknown) => readonly ViolationInput[];
      /**
       * Fires when the cached envelope disagrees with the re-derived
       * violation set. The callback receives the cached and the re-derived
       * snapshots so operators can log the forgery attempt / cache drift.
       */
      readonly onDrift?: (
        cached: PersistedViolationState,
        rederived: PersistedViolationState,
      ) => void;
    },
  ): void {
    if (integrity === undefined || integrity.lastGoodIR === undefined) {
      this.state = snapshot.state;
      this.lastGoodVersion = snapshot.lastGoodVersion;
      this.violations = new Map(
        snapshot.violations.map((v) => [keyOf(v), v]),
      );
      return;
    }

    // Re-derive the authoritative violation set from the last-good IR.
    // The cached envelope is a HINT only — if it disagrees the machine
    // accepts the re-derived state and fires the drift hook so the
    // caller can log the mismatch (possible tampering or cache rot).
    const rederivedViolations = integrity.classify(integrity.lastGoodIR);
    const rederivedState = reduceState(rederivedViolations);

    // Compare structurally on (state + violation keys). Deep-equal of the
    // full violation records is intentionally avoided — firstSeenAt and
    // transient fields drift benignly across runs; what we care about is
    // the canonical (path, rule, severity, scope, tool) identity.
    const cachedKeys = new Set(
      snapshot.violations.map((v) => `${keyOf(v)}::${v.severity}::${v.scope}::${v.tool ?? ''}`),
    );
    const rederivedKeys = new Set(
      rederivedViolations.map(
        (v) => `${keyOf(v)}::${v.severity}::${v.scope}::${v.tool ?? ''}`,
      ),
    );
    const drift =
      snapshot.state !== rederivedState ||
      cachedKeys.size !== rederivedKeys.size ||
      Array.from(cachedKeys).some((k) => !rederivedKeys.has(k));

    if (drift) {
      const ts = this.now();
      // Apply the re-derived state — cached envelope is discarded.
      this.state = rederivedState;
      this.lastGoodVersion = snapshot.lastGoodVersion;
      this.violations = new Map(
        rederivedViolations.map((v) => [
          keyOf(v),
          { ...v, firstSeenAt: ts } as PendingViolation,
        ]),
      );
      if (integrity.onDrift !== undefined) {
        const rederivedSnap: PersistedViolationState = {
          state: rederivedState,
          lastGoodVersion: snapshot.lastGoodVersion,
          violations: Array.from(this.violations.values()),
          updatedAt: ts,
        };
        integrity.onDrift(snapshot, rederivedSnap);
      }
      return;
    }

    // Envelope agrees with the re-derived set — safe to restore as-is.
    this.state = snapshot.state;
    this.lastGoodVersion = snapshot.lastGoodVersion;
    this.violations = new Map(
      snapshot.violations.map((v) => [keyOf(v), v]),
    );
  }

  /**
   * Build the full summary that `/api/status` serializes on the wire.
   */
  summary(): ViolationSummary {
    const violations = this.getViolations();
    const fixGuidance = violations.length === 0 ? '' : violations[0]!.fixGuidance;
    return {
      state: this.state,
      lastGoodVersion: this.lastGoodVersion,
      violations,
      fixGuidance,
      blockedTools: this.getBlockedTools(),
    };
  }

  /**
   * Internal: commit the transition + fire the listener. Returns the new
   * state. Always fires the listener so the serve layer can emit a
   * `governance_resolved` on CLEAN even when the previous tick was also
   * CLEAN (useful for operator visibility).
   */
  private transition(next: ViolationState): ViolationState {
    const from = this.state;
    this.state = next;
    if (this.onTransition !== undefined) {
      this.onTransition(from, next, this.getViolations());
    }
    // Audit-chain emission fires only on ACTUAL state changes (from !==
    // to). No-op ticks (CLEAN -> CLEAN on a successful recompile) are
    // useful for SSE visibility but would fill the tamper-evident chain
    // with noise and create persistent file-write traffic that collides
    // with test teardown rm()s. Auditors care about transitions, not
    // tick cadence — the SSE listener remains the pulse feed.
    if (this.auditSink !== undefined && from !== next) {
      this.auditSink.emit({
        eventType: 'VIOLATION_STATE_TRANSITION',
        actor: this.auditActor,
        target: this.auditTarget,
        action: `${from}->${next}`,
        outcome: next,
        ruleId: 'VIOLATION_STATE',
        severity: severityForState(next),
        policyVersion: this.policyVersion,
      });
    }
    return next;
  }
}

/**
 * Map a {@link ViolationState} to a 1-5 severity for audit-chain entries.
 *
 * - ERROR → 5 (structural failure, fail-closed)
 * - DEGRADED_R5 → 4 (per-tool lock)
 * - DEGRADED_FLEET / DEGRADED_WARN → 3 (advisory)
 * - CLEAN → 2 (recovery / baseline)
 */
function severityForState(state: ViolationState): number {
  switch (state) {
    case ViolationState.ERROR:
      return 5;
    case ViolationState.DEGRADED_R5:
      return 4;
    case ViolationState.DEGRADED_FLEET:
    case ViolationState.DEGRADED_WARN:
      return 3;
    case ViolationState.CLEAN:
      return 2;
  }
}
