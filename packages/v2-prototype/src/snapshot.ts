/**
 * @bic/v2-prototype/snapshot — local fork of the v2 upstream `SnapshotStore`
 * contract that's being proposed to `openclaw/openclaw` at
 * `src/plugin-sdk/snapshot.ts`.
 *
 * **Replace with `@openclaw/plugin-sdk/snapshot` when the upstream PR lands.**
 *
 * Mirrors the exact shape from `.craft/waves/260427+hapi-the-bringer+
 * openclaw-upstream/pr-drafts/v2-snap-contract.md` § "The contract" and
 * `.craft/out/proposals/snap-pre-rfc.md`. Pure types, no runtime.
 *
 * @module @bic/v2-prototype/snapshot
 */

/**
 * Opaque content-hash identifier for a captured snapshot bundle.
 *
 * Format: `lower-hex(sha256(jcs(canonical-manifest)))` — RFC 8785 JSON
 * Canonicalization Scheme over the snapshot's manifest, then SHA-256
 * lower-hex. Two stores capturing byte-identical content produce
 * byte-identical IDs.
 */
export type SnapshotId = string;

/**
 * Workspace root identifier. Distinct from `OcPath` (which addresses a
 * file INSIDE a workspace). Implementations may map this to a directory,
 * a tenant-scoped namespace, an S3 prefix, etc.
 */
export type WorkspaceId = string;

/**
 * A path INSIDE a captured snapshot bundle. POSIX-style relative path.
 *
 * Distinct from `OcPath` (which addresses live workspace files via the
 * structured `oc://{file}/...` scheme constrained to the 9-entry
 * `OC_WORKSPACE_FILES` registry); `SnapshotInternalPath` is NOT
 * registry-constrained — any path inside the captured tree is valid.
 *
 * Example: `'.openclaw/policy/policy-ir.json'` for the conventional
 * PolicyIR location (see `policy-ir.ts` `POLICY_IR_PATH`).
 */
export type SnapshotInternalPath = string;

/** Snapshot-bundle handle. */
export interface Snapshot {
  readonly id: SnapshotId;
  readonly workspace: WorkspaceId;
  /** ISO-8601 UTC second-precision timestamp of capture. */
  readonly capturedAt: string;
}

/**
 * The contract every `SnapshotStore` implementation conforms to.
 *
 * - `capture(workspace)` materializes a bundle of the workspace's current
 *   state, computes the content-addressable `SnapshotId`, and returns it.
 * - `read(snap, path)` returns the bytes at the given snapshot-internal
 *   path. Throws `SnapshotError` (with a `SnapshotErrorCode`) on any
 *   failure; consumers MUST treat `read` failure as deny per the
 *   fail-closed semantics in `snap-pre-rfc.md` § "Failure semantics".
 * - `list(workspace, opts?)` enumerates snapshots for a workspace.
 *
 * **No signing API** — gateway is the sole signer; see snap-pre-rfc
 * § "Signing" for the full rationale.
 *
 * **No audit-emission API** — gateway is the sole audit emitter; see
 * snap-pre-rfc § "Audit emission".
 */
export interface SnapshotStore {
  capture(workspace: WorkspaceId): Promise<SnapshotId>;
  read(snap: SnapshotId, path: SnapshotInternalPath): Promise<Uint8Array>;
  list(
    workspace: WorkspaceId,
    opts?: { limit?: number },
  ): Promise<readonly Snapshot[]>;
}

/**
 * Stable error code set for `SnapshotStore` failures. Wire-shape and
 * conformance-test surface — both the gateway-mounted reference plugin
 * and `openclaw snap serve` standalone MUST return errors using this
 * code set, and the conformance test verifies cross-deployment parity.
 *
 * Consumers parse `code`; `message` is human-readable and MUST NOT be
 * parsed; `cause` is implementation-defined detail.
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
 * Canonical snapshot-internal manifest shape. The hashed input that
 * produces `SnapshotId`. Files MUST be lexicographically sorted by
 * `path` (JCS handles object-key ordering; array order is content,
 * not canonicalization).
 */
export interface CanonicalManifest {
  readonly workspace: WorkspaceId;
  /** ISO-8601 UTC second-precision. */
  readonly capturedAt: string;
  readonly files: readonly {
    readonly path: SnapshotInternalPath;
    /** Lower-hex SHA-256 of the file bytes inside the snapshot. */
    readonly sha256: string;
  }[];
}
