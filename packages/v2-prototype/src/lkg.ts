/**
 * @bic/v2-prototype/lkg — local fork of the v2 upstream `LKGTracker` /
 * `LKGStore` contract being proposed at upstream
 * `src/plugin-sdk/lkg.ts`.
 *
 * **Replace with `@openclaw/plugin-sdk/lkg` when the upstream PR
 * lands.** See `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/
 * pr-drafts/v2-lkg-contract.md`.
 *
 * The contract generalizes the existing config-LKG mechanism in
 * `openclaw-core/src/config/io.observe-recovery.ts` (shipped at
 * commit `af56926e2fc4` for issue #70528 in `v2026.4.23`) so any
 * plugin can register a per-file tracker and inherit:
 *
 *   - automatic promote-on-validate
 *   - restore-on-invalid (or suspicious-vs-LKG) from the LKG copy
 *   - `.clobbered.<ts>` preservation of the bad bytes
 *   - audit emission
 *   - recovery notice for the next agent turn
 *
 * Pure types, no runtime. The reference impl lives downstream in
 * `@bic/openclaw-lkg` until the upstream PR lands.
 *
 * @module @bic/v2-prototype/lkg
 */

/**
 * Stable lower-hex SHA-256 of file bytes plus stat-shape metadata.
 * Mirrors `ConfigHealthFingerprint` in
 * `openclaw-core/src/config/io.observe-recovery.ts:88`.
 */
export interface LKGFingerprint {
  /** lower-hex SHA-256 over the raw file bytes. */
  readonly hash: string;
  readonly bytes: number;
  readonly mtimeMs: number | null;
  readonly ctimeMs: number | null;
  readonly dev: string | null;
  readonly ino: string | null;
  readonly mode: number | null;
  readonly nlink: number | null;
  readonly uid: number | null;
  readonly gid: number | null;
  /** ISO-8601 UTC observation timestamp. */
  readonly observedAt: string;
}

/**
 * Per-file LKG state. Mirrors `ConfigHealthEntry` upstream.
 *
 * `lastKnownGood`   most recent valid observation (may regress if a later
 *                   invalid observation is rejected — we keep the last
 *                   valid one).
 * `lastPromotedGood` last fingerprint we promoted to be the restoration
 *                   target. The `<path>.lkg` file's bytes hash to this.
 * `lastObservedSuspiciousSignature` dedup signal so the same suspicious
 *                   pattern doesn't loop the recovery path.
 */
export interface LKGEntry {
  readonly lastKnownGood?: LKGFingerprint;
  readonly lastPromotedGood?: LKGFingerprint;
  readonly lastObservedSuspiciousSignature?: string | null;
}

/**
 * One issue surfaced by a tracker's validator. Mirrors
 * `ConfigValidationIssue` upstream.
 */
export interface ValidationIssue {
  /** Dotted path within the parsed structure (e.g. `"plugins.entries.foo.kind"`). */
  readonly path: string;
  /** Human-readable issue. */
  readonly message: string;
  /** Optional code for programmatic handling. */
  readonly code?: string;
}

/**
 * Validator return shape.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

/**
 * The pluggable contract a plugin registers per tracked file.
 *
 * `path` is an absolute filesystem path (normalized). The store
 * manages `<path>`, `<path>.lkg`, and `<path>.clobbered.<ts>` for
 * trackers it owns.
 *
 * `parse(raw)` is the type-erased entry to the tracker's domain
 * format. The store reads bytes; the tracker turns them into `T` for
 * validation. Throwing in `parse` is treated as `valid: false` with
 * an `unparseable` issue.
 *
 * `validate(parsed)` is the load-bearing per-tracker decision.
 *
 * `suspiciousReasons` (optional) returns reasons a *parseable*
 * snapshot is still suspicious vs the LKG fingerprint. Empty array
 * = not suspicious. Non-empty → recovery flow runs (deduped by
 * signature).
 *
 * `shouldRecover` (optional) gates whole-file recovery. Returning
 * `false` keeps the bad bytes in place — used upstream for
 * plugin-local invalidity. Default: any invalid snapshot recovers.
 */
export interface LKGTracker<T = unknown> {
  readonly path: string;
  parse(raw: string): T;
  validate(parsed: T): ValidationResult;
  suspiciousReasons?(args: {
    current: LKGFingerprint;
    lastKnownGood: LKGFingerprint;
    parsed: T;
  }): readonly string[];
  shouldRecover?(snapshot: { valid: boolean; issues: readonly ValidationIssue[] }): boolean;
}

/**
 * Outcome of the store's promote/observe/recover loop for one file
 * read.
 */
export type LKGObservation =
  | { readonly outcome: 'valid'; readonly fingerprint: LKGFingerprint }
  | { readonly outcome: 'promoted'; readonly fingerprint: LKGFingerprint }
  | {
      readonly outcome: 'recovered';
      readonly reason: string;
      readonly clobberedPath: string;
      readonly restoredFrom: LKGFingerprint;
    }
  | {
      readonly outcome: 'skipped';
      readonly reason: 'plugin-local-invalidity' | 'no-lkg-available' | 'tracker-shouldRecover-false';
      readonly issues: readonly ValidationIssue[];
    }
  | {
      readonly outcome: 'failed';
      readonly reason: string;
      readonly issues: readonly ValidationIssue[];
    };

/**
 * Stable error code set for LKGStore failures. Consumers parse
 * `code`; `message` is human-readable and MUST NOT be parsed.
 */
export type LKGErrorCode =
  | 'LKG_TRACKER_PATH_COLLISION'
  | 'LKG_TRACKER_PATH_INVALID'
  | 'LKG_STORE_UNAVAILABLE'
  | 'LKG_VALIDATOR_THREW'
  | 'LKG_INTERNAL';

export interface LKGError {
  readonly code: LKGErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Convenience class for typed throws.
 */
export class LKGErrorImpl extends Error implements LKGError {
  readonly code: LKGErrorCode;
  override readonly cause?: unknown;
  constructor(code: LKGErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'LKGError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

/**
 * The runtime API a plugin uses to register a tracker.
 *
 * Implementations own:
 *   - per-tracker LKGEntry state (in-memory + persisted per host's policy)
 *   - the on-disk lifecycle (promote → `.lkg` copy; recover → copy
 *     back, preserve `.clobbered.<ts>`)
 *   - audit emission
 *   - recovery-notice queueing for the next agent turn
 *
 * Trackers MAY be registered before the file exists (first valid
 * write becomes the initial LKG promote).
 */
export interface LKGStore {
  /**
   * Register a tracker. Throws `LKG_TRACKER_PATH_COLLISION` if the
   * path is already managed by another tracker (or by upstream's
   * config-LKG when migration completes).
   */
  register<T>(tracker: LKGTracker<T>): void;

  /**
   * Observe the current state of a tracked file. Drives the
   * promote-on-validate / restore-on-invalid loop. Returns the
   * outcome.
   *
   * The store calls `observe` automatically at startup and on file
   * change events; explicit invocation is for tests + manual
   * recovery flows.
   */
  observe(path: string): Promise<LKGObservation>;

  /**
   * Read the current LKG bytes for a tracked file. Throws if the
   * path isn't registered or the LKG isn't yet established (no valid
   * write has happened).
   */
  readLastKnownGood(path: string): Promise<Uint8Array>;

  /**
   * Snapshot of the current per-tracker state for a path. Useful for
   * dashboards / audit / tests. Returns null if not registered.
   */
  getEntry(path: string): LKGEntry | null;
}
