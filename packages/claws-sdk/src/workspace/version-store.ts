/**
 * Version index over the compilation forest cache.
 *
 * Maps a monotonic workspace version number (advanced by
 * {@link import('../workspace-edit/versioning.js').VersionManager}) to a
 * snapshot of compilation outputs: the {@link GovernanceIR}, the per-OC
 * file content hashes that produced it, and the ISO timestamp of the
 * compile. The store is intentionally in-memory — it rides on top of the
 * compilation forest cache and disappears on restart, at which point only
 * the current version is reachable until new PATCHes re-populate it.
 *
 * Bounded to the most recent N versions (default 100) via a ring-buffer
 * style eviction. An evicted version returns a structured
 * {@link EvictedVersionMarker} so the HTTP layer can distinguish
 * "version never existed" (out-of-range) from "version existed but was
 * aged out" (evicted).
 *
 * This class is NOT a separate copy of the GovernanceIR — callers feed
 * it the IR handle their compilation phase already produced. Read
 * latency is a Map lookup; write amortises at O(1) with occasional O(1)
 * eviction.
 *
 * @module claws-sdk/workspace/version-store
 */

import type { GovernanceIR } from '../ir/governance-ir.js';

/** Default cap on retained versions before the oldest is evicted. */
export const DEFAULT_MAX_VERSIONS = 100;

/** Snapshot entry recorded at each successful compile. */
export interface VersionSnapshot {
  /** Monotonic workspace version counter value. */
  readonly version: number;
  /** ISO 8601 timestamp of when the compile completed. */
  readonly compiledAt: string;
  /** Per-file SHA-256 content hashes keyed by OC file name. */
  readonly fileHashes: Readonly<Record<string, string>>;
  /**
   * GovernanceIR produced by the compile. Held by reference — the store
   * does not deep-clone, so callers must treat the IR as immutable.
   */
  readonly governanceIR: GovernanceIR;
}

/**
 * Marker returned when a version is known to have existed but has been
 * aged out of the store. The HTTP layer surfaces this as a 404 with
 * `reason: 'version_evicted'`.
 */
export interface EvictedVersionMarker {
  readonly evicted: true;
  readonly version: number;
}

/** Lookup result for {@link VersionStore.get}. */
export type VersionLookupResult =
  | { readonly kind: 'found'; readonly snapshot: VersionSnapshot }
  | { readonly kind: 'evicted'; readonly version: number }
  | { readonly kind: 'out_of_range'; readonly available: AvailableRange };

/** Inclusive [min, max] window of versions currently retained in the store. */
export interface AvailableRange {
  /** Lowest retained version, or null when the store is empty. */
  readonly min: number | null;
  /** Highest retained version, or null when the store is empty. */
  readonly max: number | null;
  /** Count of retained snapshots. */
  readonly count: number;
}

/** Options for {@link VersionStore}. */
export interface VersionStoreOptions {
  /**
   * Maximum retained versions. When a push would exceed this, the
   * lowest-numbered retained version is evicted. Defaults to 100.
   */
  readonly maxVersions?: number;
}

/**
 * Bounded in-memory index from workspace version → forest cache entry.
 *
 * Not thread-safe — callers must serialize access through the
 * compilation queue (the same serialization the forest cache relies on).
 *
 * Eviction is version-ordered: when the retained count exceeds
 * {@link VersionStoreOptions.maxVersions}, the **lowest-numbered**
 * snapshot is dropped. This is the contract UI code expects — the
 * retained window is always a contiguous suffix of the monotonically
 * increasing version counter, and `available().min` always names the
 * oldest retained snapshot, never a re-recorded entry that happens to
 * sit first in Map insertion order.
 *
 * Non-monotonic records are rejected: once a version has been recorded,
 * a later `record(snapshot)` with a lower `snapshot.version` throws. The
 * caller-driven version counter is itself monotonic (see
 * {@link import('../workspace-edit/versioning.js').VersionManager}); any
 * out-of-order call is a correctness bug in the caller, not a valid
 * back-fill. Re-recording the same version is allowed (idempotent).
 */
export class VersionStore {
  private readonly maxVersions: number;
  private readonly snapshots = new Map<number, VersionSnapshot>();
  private readonly evicted = new Set<number>();
  /** Highest version ever accepted by {@link record}; `-1` until the first call. */
  private highWaterMark = -1;

  constructor(options: VersionStoreOptions = {}) {
    const cap = options.maxVersions ?? DEFAULT_MAX_VERSIONS;
    if (!Number.isInteger(cap) || cap <= 0) {
      throw new Error(`VersionStore maxVersions must be a positive integer; got ${String(cap)}`);
    }
    this.maxVersions = cap;
  }

  /**
   * Record a new snapshot. Triggers eviction of the **lowest-numbered**
   * retained entry when the size exceeds {@link maxVersions}. Re-recording
   * the same version is idempotent (overwrite in place). Recording a
   * version lower than any previously recorded version throws — the
   * caller-driven counter is monotonic by contract, and accepting an
   * out-of-order value would corrupt the `min`/`max` window the time-
   * travel resolver reports.
   */
  record(snapshot: VersionSnapshot): void {
    if (!Number.isInteger(snapshot.version) || snapshot.version < 0) {
      throw new Error(`snapshot.version must be a non-negative integer; got ${String(snapshot.version)}`);
    }
    if (snapshot.version < this.highWaterMark) {
      // Rehydrating a previously-seen version (either currently retained
      // or previously evicted) is allowed — it's idempotent from the
      // caller's perspective and preserves the rehydrate-on-re-record
      // contract. Rejecting an *unseen* lower version catches the real
      // bug: a caller that accidentally back-fills v5 after v10 because
      // a rolled-back compile completed late. W7 calls this out — the
      // counter is monotonic by the VersionManager contract, so unseen
      // back-fills are always a caller bug.
      const seen = this.snapshots.has(snapshot.version) || this.evicted.has(snapshot.version);
      if (!seen) {
        throw new Error(
          `VersionStore.record: non-monotonic version ${String(snapshot.version)} (highest seen: ${String(this.highWaterMark)}; caller must use a fresh version from VersionManager)`,
        );
      }
    }
    // Idempotent re-record of the current max: overwrite in place. Map.set
    // on an existing key preserves insertion order, but insertion order is
    // no longer the eviction criterion so the detail does not matter — the
    // version-ordered eviction still drops the lowest version first.
    this.snapshots.set(snapshot.version, snapshot);
    // Re-recording an already-evicted version rehydrates it.
    this.evicted.delete(snapshot.version);
    if (snapshot.version > this.highWaterMark) {
      this.highWaterMark = snapshot.version;
    }
    this.evictIfNeeded();
  }

  /**
   * Look up a version. Three outcomes:
   *
   * - `found`: the snapshot is still retained.
   * - `evicted`: the version was retained at some point but aged out.
   * - `out_of_range`: the version was never recorded (above or below
   *   the retained window); the available range is included so the HTTP
   *   layer can render a helpful 404.
   */
  get(version: number): VersionLookupResult {
    const snapshot = this.snapshots.get(version);
    if (snapshot !== undefined) {
      return { kind: 'found', snapshot };
    }
    if (this.evicted.has(version)) {
      return { kind: 'evicted', version };
    }
    return { kind: 'out_of_range', available: this.available() };
  }

  /**
   * Find the snapshot nearest to (and not after) the given ISO
   * timestamp — the canonical interpretation of "state as of T".
   * Returns `null` when every retained snapshot is newer than T, or
   * when the store is empty.
   */
  findNearestByTimestamp(isoTimestamp: string): VersionSnapshot | null {
    const target = Date.parse(isoTimestamp);
    if (Number.isNaN(target)) return null;
    let best: VersionSnapshot | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const snapshot of this.snapshots.values()) {
      const when = Date.parse(snapshot.compiledAt);
      if (Number.isNaN(when)) continue;
      if (when > target) continue;
      const delta = target - when;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = snapshot;
      }
    }
    return best;
  }

  /** Inclusive window of retained versions. */
  available(): AvailableRange {
    if (this.snapshots.size === 0) {
      return { min: null, max: null, count: 0 };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const version of this.snapshots.keys()) {
      if (version < min) min = version;
      if (version > max) max = version;
    }
    return { min, max, count: this.snapshots.size };
  }

  /** Whether this version number has been evicted. Primarily for tests. */
  isEvicted(version: number): boolean {
    return this.evicted.has(version);
  }

  /** Retained snapshot count. Primarily for tests and observability. */
  size(): number {
    return this.snapshots.size;
  }

  /** Drop every retained snapshot and eviction marker. */
  clear(): void {
    this.snapshots.clear();
    this.evicted.clear();
    this.highWaterMark = -1;
  }

  private evictIfNeeded(): void {
    while (this.snapshots.size > this.maxVersions) {
      // Drop the lowest-numbered retained version. This preserves the
      // "retained window is a contiguous suffix of the version counter"
      // contract even after re-recording a version (which would
      // otherwise move it to the tail of Map insertion order and cause
      // the wrong snapshot to be evicted on the next record).
      let lowest: number | null = null;
      for (const version of this.snapshots.keys()) {
        if (lowest === null || version < lowest) lowest = version;
      }
      if (lowest === null) return;
      this.snapshots.delete(lowest);
      this.evicted.add(lowest);
    }
  }
}
