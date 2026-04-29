/**
 * @bic/openclaw-snap/types — v2 SnapshotStore contract + downstream RefStore.
 *
 * **Two-layer design** (see `.craft/waves/260427+hapi-the-bringer+openclaw-
 * upstream/pr-drafts/v2-snap-contract.md` and lifecycle discussion):
 *
 *   Layer 1 — `SnapshotStore`  immutable, content-addressable bundles.
 *                               capture/read/list. Goes upstream as the
 *                               v2 SDK contract.
 *
 *   Layer 2 — `RefStore`        mutable per-workspace pointers (HEAD,
 *                               STAGE, history). Stays downstream;
 *                               separates lifecycle from storage.
 *
 * Lifecycle behaviors (promote, rollback, stage, discard) are pointer ops
 * over `RefStore` — they never mutate snapshot bundles. Same model as git
 * (refs over an immutable object store).
 *
 * @module @bic/openclaw-snap/types
 */

/**
 * Opaque content-hash identifier for a captured snapshot bundle.
 *
 * Format: `sha256-<base64url>` (per `@bic/openclaw-workspace/canonicalize`).
 * Two stores capturing byte-identical content produce byte-identical IDs.
 */
export type SnapshotId = string;

/**
 * Workspace root identifier. Distinct from a path INSIDE a snapshot.
 * Implementations may map this to a directory, a tenant-scoped namespace,
 * an object-store prefix, etc.
 */
export type WorkspaceId = string;

/**
 * A path INSIDE a captured snapshot bundle. POSIX-style relative path.
 *
 * Example: `'.openclaw/policy/policy-ir.json'` for the conventional
 * PolicyIR location.
 */
export type SnapshotInternalPath = string;

/** Snapshot-bundle handle (metadata only — bytes accessed via `read`). */
export interface Snapshot {
  readonly id: SnapshotId;
  readonly workspace: WorkspaceId;
  /** ISO-8601 UTC second-precision timestamp of capture. */
  readonly capturedAt: string;
}

export interface ListOpts {
  readonly limit?: number;
}

/**
 * Layer 1 — the v2 SnapshotStore contract. Three methods. Immutable
 * content-addressable bundles.
 *
 * - `capture(workspace)` materializes the workspace's current state into
 *   an immutable bundle, computes the content-addressable id, and returns
 *   it. The same workspace state always yields the same id.
 * - `read(snap, path)` returns bytes at the given snapshot-internal path.
 *   Throws `SnapshotError` on any failure; consumers MUST treat read
 *   failure as deny per fail-closed semantics.
 * - `list(workspace, opts?)` enumerates snapshots for a workspace.
 *
 * **No put / promote / rollback / current.** Those are ref ops; see
 * `RefStore` below.
 */
export interface SnapshotStore {
  capture(workspace: WorkspaceId): Promise<SnapshotId>;
  read(snap: SnapshotId, path: SnapshotInternalPath): Promise<Uint8Array>;
  list(workspace: WorkspaceId, opts?: ListOpts): Promise<readonly Snapshot[]>;
}

/**
 * Layer 2 — mutable per-workspace pointer state.
 *
 * `HEAD`     the snapshot in force right now (gateway binds this to
 *            `ctx.snapshotId` at session start).
 * `STAGE`    a draft capture that has not been promoted to HEAD.
 * `history`  prior HEAD values, newest-first, for rollback / undo.
 *
 * Pointer ops are atomic per workspace (impl-defined: file lock for
 * `WorkspaceRefStore`, conditional PUT for an S3-backed impl, etc.).
 */
export interface RefStore {
  getHead(workspace: WorkspaceId): Promise<SnapshotId | null>;
  setHead(workspace: WorkspaceId, id: SnapshotId): Promise<void>;
  getStage(workspace: WorkspaceId): Promise<SnapshotId | null>;
  setStage(workspace: WorkspaceId, id: SnapshotId | null): Promise<void>;
  history(workspace: WorkspaceId, limit?: number): Promise<readonly SnapshotId[]>;
}

/**
 * Stable error code set for `SnapshotStore` failures. Consumers parse
 * `code`; `message` is human-readable and MUST NOT be parsed.
 */
export type SnapshotErrorCode =
  | 'SNAP_NOT_FOUND'
  | 'SNAP_INVALID_PATH'
  | 'SNAP_STORE_UNAVAILABLE'
  | 'SNAP_AUTH_DENIED'
  | 'SNAP_CAPTURE_FAILED'
  | 'SNAP_LIMIT_EXCEEDED'
  | 'SNAP_CHECKSUM_MISMATCH'
  | 'SNAP_CONTRACT_VIOLATION'
  | 'SNAP_INTERNAL';

export interface SnapshotError {
  readonly code: SnapshotErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Convenience class for throwing typed errors that carry a SnapshotErrorCode.
 * Catch sites can `instanceof SnapshotErrorImpl` then read `.code`.
 */
export class SnapshotErrorImpl extends Error implements SnapshotError {
  readonly code: SnapshotErrorCode;
  override readonly cause?: unknown;
  constructor(code: SnapshotErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'SnapshotError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}
