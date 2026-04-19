/**
 * Types for the auto-snapshot safety net.
 *
 * The auto-snapshot manager captures the previous compiled state
 * (GovernanceIR hash + per-file content hashes) whenever an external
 * writer mutates OC files on disk — OC runtime installing a skill,
 * VS Code editing SOUL.md, OneDrive syncing a conflict resolution.
 *
 * Unlike named snapshots ({@link import('../snapshot/save.js').save}),
 * auto-snapshots are small metadata-only records: they store hashes,
 * not file copies, because the compilation forest cache already holds
 * the full IR body. The resolver rehydrates a full GovernanceIR from
 * the forest at query time.
 *
 * @module claws-sdk/workspace/auto-snapshot-types
 */

/**
 * Why an auto-snapshot was taken. The middleware that triggers the
 * snapshot decides which bucket applies — the trigger is free-form
 * from the SDK's perspective but the HTTP layer reports the string
 * unchanged so operators can attribute drift to the right source.
 */
export type AutoSnapshotTrigger = 'oc_runtime' | 'external_edit' | 'onedrive_sync';

/**
 * A single auto-snapshot entry. Metadata only — no governance IR body
 * and no file contents. The `governanceIrHash` pairs with the
 * {@link import('./version-store.js').VersionStore} snapshot at the
 * same version; the resolver walks from hash → store entry → IR.
 */
export interface AutoSnapshot {
  /** Monotonic workspace version counter value at capture time. */
  readonly version: number;
  /** ISO 8601 timestamp when the snapshot was taken. */
  readonly timestamp: string;
  /** Per-file SHA-256 content hashes keyed by OC file name. */
  readonly fileHashes: Readonly<Record<string, string>>;
  /** SHA-256 of the GovernanceIR JSON at capture time. */
  readonly governanceIrHash: string;
  /** Why this snapshot was taken (which external writer fired the watcher). */
  readonly trigger: AutoSnapshotTrigger;
}

/** Default cap on retained auto-snapshots before LRU eviction. */
export const DEFAULT_MAX_AUTO_SNAPSHOTS = 20;

/** Relative directory (under the workspace root) that holds auto-snapshot metadata. */
export const AUTO_SNAPSHOT_DIR = '.claws/snapshots/auto';
