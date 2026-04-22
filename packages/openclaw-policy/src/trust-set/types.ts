/**
 * @bic/openclaw-policy/trust-set — public types.
 *
 * Per pulse 50 (P-04 mitigation): trust-set entries authorize HMAC-signed
 * approval handles. The loader reloads on `fs.watch` events and retains the
 * previous in-memory snapshot on parse failure; callers observe staleness via
 * `TrustSetSnapshot.stale` and the audit sink receives `TrustSetReloadFailedEntry`.
 *
 * @module @bic/openclaw-policy/trust-set/types
 */

/** Cancellable handle for a scheduled timer. Mirrors Node's `clearTimeout` contract. */
export interface Disposable {
  dispose(): void;
}

/**
 * Full clock interface used by the loader. Production wiring uses a
 * `Date.now` + native `setTimeout` adapter; tests inject a deterministic fake
 * that advances on `advance(ms)`.
 */
export interface Clock {
  /** Current epoch millis. */
  now(): number;
  /** Schedule `fn` after `ms` — return a handle whose `dispose()` cancels. */
  setTimeout(fn: () => void, ms: number): Disposable;
}

/** A single entry in `trust-set.json`. */
export interface TrustSetEntry {
  /** keyId referenced by approval handles. */
  readonly keyId: string;
  /** HMAC secret — hex-encoded, 64 chars (32 bytes). */
  readonly hmacSecret: string;
  /** Epoch millis after which this entry is no longer valid. */
  readonly notAfter: number;
  /** `true` if `clock.now() > notAfter` at load time. Callers filter. */
  readonly expired: boolean;
}

/** In-memory snapshot returned by `TrustSetLoader.get()`. */
export interface TrustSetSnapshot {
  readonly entries: readonly TrustSetEntry[];
  /** Most recent successful reload (or initial construction) — epoch millis. */
  readonly lastSuccessfulReloadAt: number;
  /** True if a reload failed and the 30s staleness budget has elapsed. */
  readonly stale: boolean;
}

/** Loader handle. `get()` returns the current snapshot; `close()` stops the watcher. */
export interface TrustSetLoader {
  get(): TrustSetSnapshot;
  close(): void;
}
