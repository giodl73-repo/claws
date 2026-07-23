/**
 * @bic/openclaw-lkg — generalized last-known-good (LKG) tracker.
 *
 * Reference impl of the v2 `LKGStore` / `LKGTracker` contract proposed
 * for upstream `openclaw/openclaw` at `src/plugin-sdk/lkg.ts`. See
 * `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/
 * v2-lkg-contract.md`.
 *
 * Generalizes the existing config-LKG mechanism in
 * `openclaw-core/src/config/io.observe-recovery.ts` (issue #70528,
 * v2026.4.23, commit `af56926e2fc4`) so any plugin can register a
 * tracker.
 *
 * @module @bic/openclaw-lkg
 */

export { lkgStore } from "./lkg-store.js";
export type { AuditRecord, LKGStoreOptions, RecoveryNotice } from "./lkg-store.js";

export { lkgPathFor, clobberedPathFor, isCompanionPath } from "./paths.js";
export { makeFingerprint, hashRaw } from "./fingerprint.js";

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
