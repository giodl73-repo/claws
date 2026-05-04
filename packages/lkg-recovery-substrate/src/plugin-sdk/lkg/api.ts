/**
 * `LKGStore` interface — the contract any backend implements.
 *
 * Plugins call `register(tracker)` to opt a path into LKG protection;
 * the host calls `observe(path, opts)` on every read or write to drive
 * the promote/observe/recover lifecycle.
 *
 * **Multi-tenant note**: the contract intentionally has NO `tenantId`
 * argument. Hosts instantiate one `LKGStore` per tenant scope; tracker
 * registration + observe happen against the tenant's store. Cross-
 * tenant collisions are structurally impossible (no shared mutable
 * state inside the store; no parameter that could be forgotten).
 *
 * @module @openclaw/plugin-sdk/lkg/api
 */

import type {
  LKGEntry,
  LKGObservation,
  LKGObserveOptions,
  LKGTracker,
  ValidationIssue,
} from './types.js';

export interface LKGStore {
  /**
   * Register a tracker. Backend rejects path collisions with
   * `LKG_TRACKER_PATH_COLLISION` and out-of-root paths with
   * `LKG_TRACKER_PATH_INVALID`.
   */
  register<TParsed, TIssue = ValidationIssue>(
    tracker: LKGTracker<TParsed, TIssue>,
  ): void;

  /**
   * Observe a tracked path. Reads bytes from disk, computes
   * fingerprint, parses, validates, and either promotes (valid),
   * recovers (invalid + LKG available), or skips (no LKG / plugin-
   * local invalidity).
   *
   * The optional `opts.actor` and `opts.correlationEventId` flow into
   * the recovery observation's forensic fields when recovery happens.
   */
  observe(path: string, opts?: LKGObserveOptions): Promise<LKGObservation>;

  /**
   * Read the most-recent promoted-good bytes for a tracked path.
   * Used by consumers (PolicyIR, hook-output recovery) to re-load
   * after a recovery event without re-walking the recovery flow.
   *
   * Throws `LKGError(LKG_STORE_UNAVAILABLE)` if no LKG has been
   * promoted yet for `path`. Throws `LKGError(LKG_ABORTED)` if the
   * caller's signal is already aborted.
   */
  readLastKnownGood(path: string, opts?: LKGObserveOptions): Promise<Uint8Array>;

  /**
   * Look up the entry record for a tracked path. Returns `null` if
   * the path is registered but no observation has produced an entry
   * yet (initial state).
   */
  getEntry(path: string): LKGEntry | null;
}
