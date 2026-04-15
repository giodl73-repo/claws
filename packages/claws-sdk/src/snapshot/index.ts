/**
 * Snapshot module — save, restore, verify governance snapshots.
 *
 * @module claws-sdk/snapshot
 */

export type { SnapshotManifest, ManifestFileEntry } from './manifest.js';
export { MANIFEST_SCHEMA_VERSION } from './manifest.js';
export type { FileVerification, VerificationResult } from './integrity.js';
export { TamperError, hashBuffer, computeWorkspaceHash, verifyManifest } from './integrity.js';
export type { SnapshotInfo } from './storage.js';
export { exists, list, remove, readManifest, snapshotDir } from './storage.js';
export type { SaveResult } from './save.js';
export { save } from './save.js';
export type { RestoreResult } from './restore.js';
export { restore } from './restore.js';
export type {
  ChangeDirection,
  ToolRiskChange,
  PolicyChange,
  ViolationChange,
  TrustTierShift,
  DiffSummary,
  SnapshotDiff,
} from './diff.js';
export { diff } from './diff.js';
export { renderDiff, renderDiffJson } from './diff-renderer.js';
export type { PromoteProvenance } from './provenance.js';
export type { PromoteResult, PromoteOptions } from './promote.js';
export { PromotionError, promote, computeBundleHash, runPinchGate } from './promote.js';
export type { RegistryEntry } from './fleet-registry.js';
export {
  storePromoted,
  readProvenance,
  readRegistryManifest,
  listVersions,
  listNames,
  verifyProvenance,
  registryNameDir,
  registryVersionDir,
  nextVersion,
} from './fleet-registry.js';
