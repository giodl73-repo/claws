/**
 * SnapshotManifest — the integrity contract for claws snapshots.
 *
 * A manifest records every file in the snapshot with its SHA-256 hash,
 * a composite workspaceHash, ISO 8601 timestamp, clawsVersion, and
 * a schemaVersion for forward compatibility.
 *
 * @module claws-sdk/snapshot/manifest
 */

/**
 * A single file entry in the snapshot manifest.
 */
export interface ManifestFileEntry {
  /** Relative path from snapshot root. */
  readonly relativePath: string;
  /** SHA-256 hex digest of the file content. */
  readonly sha256: string;
  /** Byte size of the file. */
  readonly size: number;
}

/**
 * SnapshotManifest — the root type serialized to manifest.json.
 */
export interface SnapshotManifest {
  /** Schema version for forward compatibility (starts at 1). */
  readonly schemaVersion: number;
  /** claws SDK version that produced this snapshot. */
  readonly clawsVersion: string;
  /** ISO 8601 timestamp of when the snapshot was taken. */
  readonly timestamp: string;
  /** Composite SHA-256 hash of all file hashes (integrity root). */
  readonly workspaceHash: string;
  /** Per-file entries with paths and hashes. */
  readonly files: readonly ManifestFileEntry[];
}

/** Current manifest schema version. */
export const MANIFEST_SCHEMA_VERSION = 1;
