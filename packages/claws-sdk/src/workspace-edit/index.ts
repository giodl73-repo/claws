/**
 * @bic/claws-sdk/workspace-edit — lossless structured edits to OC
 * files through the CAP settings UI write path.
 *
 * @module claws-sdk/workspace-edit
 */

export {
  StructuredEditor,
  recoverAtomicWrite,
  type StructuredEditorOptions,
  type WatcherNotifier,
  type FileSnapshot,
  type RawWriteResult,
  type EditorTransaction,
} from './editor.js';
export { applyLossless, previewLossless } from './lossless.js';
export {
  EDITABLE_FILES,
  CHUNK_EDITABLE_FILES,
  EditableFilesError,
  EditTargetError,
  type ChunkEditableFile,
  type ContentHash,
  type Diff,
  type EditOperation,
  type EditResult,
  type EditableFile,
  type ToggleEdit,
  type SetEdit,
  type AppendEdit,
  type RemoveEdit,
  type ValidationResult,
} from './types.js';
export {
  isPatchError,
  ocPathToRoute,
  type PatchError,
  type PatchErrorCode,
  type R5LockedError,
  type FleetLockedError,
  type GovernanceDeniedError,
  type ValidationFailedError,
  type FileNotEditableError,
  type CompilationFailedError,
  type RollbackFailedError,
  type UnknownError,
  type DenyRuleProvenance,
  type ProvenanceChain,
} from './errors.js';
export {
  buildPatchError,
  renderPatchErrorMessage,
  PATCH_ERROR_LABELS,
} from './error-messages.js';
export { ValidationPipeline, type ValidationPipelineResult } from './validation.js';
export type { Validator, ValidatorResult, ValidationWarning } from './validators/validator.js';
export { createR5Validator } from './validators/r5-validator.js';
export {
  createFleetValidator,
  createCachedFleetPolicyLoader,
  loadFleetPolicy,
  type FleetValidatorOptions,
  type FleetPolicyLoader,
  type FleetPolicyLoadResult,
  type FleetPolicyStat,
  type CachedFleetPolicyLoader,
  type CachedFleetPolicyLoaderOptions,
  type LoadedFleetPolicy,
} from './validators/fleet-validator.js';
export {
  createGovernanceValidator,
  type GovernanceValidatorOptions,
  type DenyProvenanceRegistry,
} from './validators/governance-validator.js';
export {
  createDenyRemovalValidator,
  type DenyRemovalValidatorOptions,
  type DenyRemovalEdit,
} from './validators/deny-removal-validator.js';
export {
  VersionManager,
  parseETag,
  formatETag,
  type WorkspaceVersion,
  type VersionConflictError,
  type VersionCheckResult,
  type VersionManagerOptions,
} from './versioning.js';
export {
  planAllowAll,
  toggleEditFor,
  type AllowAllCompileState,
  type AllowAllOptions,
  type AllowAllPlan,
  type AllowAllSkipReason,
  type AllowAllSkippedTool,
} from './allow-all.js';
export {
  BatchExecutor,
  MAX_BATCH_SIZE,
  type BatchExecutorDeps,
  type BatchExecuteOptions,
  type BatchOperationOutcome,
  type BatchOperationResult,
  type BatchOperationFailure,
  type BatchGovernanceSummary,
  type BatchResult,
} from './batch-executor.js';
