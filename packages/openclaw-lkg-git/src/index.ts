/**
 * @bic/openclaw-lkg-git — git-backed LKGStore impl.
 *
 * Implements the same `LKGStore` contract as the FS-backed
 * `@bic/openclaw-lkg`, but uses git for promote (commit) and recover
 * (checkout HEAD). Designed for OneDrive-backed workspaces via
 * rclone+FUSE — git's three-way merge semantics replace rclone's
 * last-writer-wins for shared multi-agent state.
 *
 * Pre-conditions: `repoRoot` is an existing git work tree. Trackers
 * register absolute paths under `repoRoot` that are NOT gitignored.
 *
 * @module @bic/openclaw-lkg-git
 */

export { gitLKGStore } from "./git-lkg-store.js";
export type {
  AuditRecord,
  GitAuthorship,
  GitLKGStoreOptions,
  RecoveryNotice,
} from "./git-lkg-store.js";

// Re-export the v2 contract types so consumers don't need a direct
// `@bic/v2-prototype` dep just for type imports.
export type {
  LKGEntry,
  LKGError,
  LKGErrorCode,
  LKGFingerprint,
  LKGObservation,
  LKGStore,
  LKGTracker,
  ValidationIssue,
  ValidationResult,
} from "@bic/v2-prototype";
export { LKGErrorImpl } from "@bic/v2-prototype";
