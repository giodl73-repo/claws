/**
 * Per-session bounded LRU cache for PolicyIR. Plugin-private state for
 * the registered policy plugin shell.
 *
 * Per `.craft/out/proposals/guardrails-adapter.md` § "3. Cache eviction":
 *
 *   - Inner map (per session): bounded LRU at `MAX_SNAPSHOTS_PER_SESSION = 8`.
 *     On overflow, evict the least-recently-used `(snapshotId, PolicyIR)` entry.
 *   - Outer map (session-scoped): periodic sweep every `SWEEP_INTERVAL_MS` (60s),
 *     dropping sessions whose last `evaluate()` was >`SESSION_IDLE_MS` (15min) ago.
 *   - Invalidation NOT required. PolicyIR is content-addressable via
 *     `policyId`; new snapshot promotion → new SnapshotId → different
 *     cache key. Stale entries are naturally orphaned.
 *
 * The starting tunables (8, 60s, 15min) are downstream config concerns;
 * not contract-bearing.
 *
 * @module @bic/openclaw-guardrails/policy-runtime/cache
 */

import type { PolicyIR, SnapshotId } from "@bic/v2-prototype";

export const MAX_SNAPSHOTS_PER_SESSION = 8;
export const SWEEP_INTERVAL_MS = 60_000;
export const SESSION_IDLE_MS = 15 * 60_000;

type SessionKey = string;

interface SessionEntry {
  /** LRU-ordered: most-recently-accessed at the END of insertion order
   *  (Map preserves insertion order; we reinsert on access to bump). */
  readonly snapshots: Map<SnapshotId, PolicyIR>;
  /** Wall-clock time of last `get`/`set`. Used by the sweep. */
  lastAccessed: number;
}

export interface PolicyIrCacheOptions {
  readonly maxSnapshotsPerSession?: number;
  readonly sessionIdleMs?: number;
  /** Inject a clock for tests (default: `Date.now`). */
  readonly now?: () => number;
}

/**
 * The cache. Two-layer: outer Map keyed by `SessionKey`, inner Map
 * keyed by `SnapshotId`. Both layers are LRU-bounded; the outer is
 * swept periodically rather than capped (sessions of unknown
 * cardinality are bounded by the periodic sweep).
 */
export class PolicyIrCache {
  private readonly sessions = new Map<SessionKey, SessionEntry>();
  private readonly maxSnapshotsPerSession: number;
  private readonly sessionIdleMs: number;
  private readonly now: () => number;

  constructor(opts: PolicyIrCacheOptions = {}) {
    this.maxSnapshotsPerSession = opts.maxSnapshotsPerSession ?? MAX_SNAPSHOTS_PER_SESSION;
    this.sessionIdleMs = opts.sessionIdleMs ?? SESSION_IDLE_MS;
    this.now = opts.now ?? (() => Date.now());
  }

  get(sessionKey: SessionKey, snapshotId: SnapshotId): PolicyIR | undefined {
    const entry = this.sessions.get(sessionKey);
    if (entry === undefined) return undefined;
    const ir = entry.snapshots.get(snapshotId);
    if (ir === undefined) return undefined;
    // Bump LRU: re-insert at end of insertion order.
    entry.snapshots.delete(snapshotId);
    entry.snapshots.set(snapshotId, ir);
    entry.lastAccessed = this.now();
    return ir;
  }

  set(sessionKey: SessionKey, snapshotId: SnapshotId, ir: PolicyIR): void {
    let entry = this.sessions.get(sessionKey);
    if (entry === undefined) {
      entry = { snapshots: new Map(), lastAccessed: this.now() };
      this.sessions.set(sessionKey, entry);
    }
    // If already present, refresh; if new, possibly evict LRU first.
    if (entry.snapshots.has(snapshotId)) {
      entry.snapshots.delete(snapshotId);
    } else if (entry.snapshots.size >= this.maxSnapshotsPerSession) {
      // Evict least-recently-used (first insertion-order entry).
      const oldestKey = entry.snapshots.keys().next().value;
      if (oldestKey !== undefined) entry.snapshots.delete(oldestKey);
    }
    entry.snapshots.set(snapshotId, ir);
    entry.lastAccessed = this.now();
  }

  /**
   * Drop sessions whose last access was older than `sessionIdleMs`.
   * Caller invokes periodically (e.g., setInterval at `SWEEP_INTERVAL_MS`).
   * Returns the number of sessions evicted.
   */
  sweep(): number {
    const now = this.now();
    let evicted = 0;
    for (const [key, entry] of this.sessions) {
      if (now - entry.lastAccessed > this.sessionIdleMs) {
        this.sessions.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  /** Diagnostic: total number of cached PolicyIR entries across all sessions. */
  size(): number {
    let total = 0;
    for (const entry of this.sessions.values()) total += entry.snapshots.size;
    return total;
  }

  /** Diagnostic: number of distinct sessions in the cache. */
  sessionCount(): number {
    return this.sessions.size;
  }

  /** Test helper: clear all entries. */
  clear(): void {
    this.sessions.clear();
  }
}
