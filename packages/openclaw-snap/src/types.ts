/**
 * @bic/openclaw-snap — Core types per snap.md §Interface.
 *
 * `Snapshot` is the canonical content-addressable workspace capture.
 * `SnapshotStore` is the pluggable backing-store interface with two
 * reference implementations (in-memory, filesystem).
 *
 * All identifiers are `sha256-<base64url>` strings computed by
 * `@bic/openclaw-workspace/canonicalize` — the server is the sole source
 * of truth for `snapshotId`.
 *
 * @module @bic/openclaw-snap/types
 */

export type SnapshotStatus = 'draft' | 'current' | 'superseded';

/** A content-addressable workspace snapshot. */
export interface Snapshot {
  readonly id: string;
  readonly files: Readonly<Record<string, string>>;
  readonly createdAt: string;
  readonly author: string;
  readonly status: SnapshotStatus;
  readonly parentId?: string;
}

/** Paginated listing metadata. */
export interface SnapshotMeta {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
  readonly status: SnapshotStatus;
}

export interface ListOpts {
  readonly limit?: number;
  readonly cursor?: string;
  readonly status?: SnapshotStatus;
}

export interface PromoteContext {
  readonly principal: string;
  readonly tenant?: string;
  readonly idempotencyKey: string;
}

export interface ResolveResult {
  readonly snapshotId: string;
  readonly content: string;
  readonly chunk?: {
    readonly file: string;
    readonly section?: string;
    readonly item?: string;
    readonly field?: string;
  };
}

/**
 * Pluggable snapshot backing store. All methods are async so adapters can
 * back onto remote object stores; in-memory impl resolves eagerly.
 */
export interface SnapshotStore {
  put(snapshot: Snapshot): Promise<void>;
  get(id: string): Promise<Snapshot | null>;
  list(opts?: ListOpts): Promise<readonly SnapshotMeta[]>;
  promote(id: string, ctx: PromoteContext): Promise<{ readonly promotedAt: string }>;
  rollback(toId: string, ctx: PromoteContext): Promise<{ readonly restoredAt: string }>;
  current(): Promise<Snapshot | null>;
  resolveOcPath(uri: string, id?: string): Promise<ResolveResult | null>;
}

/**
 * SnapError codes per snap.md §Fail-closed postures. A closed enum so
 * integrators switch on `code` without per-endpoint special-casing.
 */
export type SnapErrorCode =
  | 'SNAPSHOT_MALFORMED'
  | 'SNAPSHOT_ID_MISMATCH'
  | 'SNAPSHOT_NOT_FOUND'
  | 'POLICY_ID_MISMATCH'
  | 'POLICY_NOT_GENERATED'
  | 'POLICY_IR_MALFORMED'
  | 'POLICY_IR_INCONSISTENT'
  | 'POLICY_IR_VERSION_UNSUPPORTED'
  | 'FORBIDDEN'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'AUTH_CONTEXT_UNAVAILABLE';

export interface SnapError {
  readonly code: SnapErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly snapshotId?: string;
}
