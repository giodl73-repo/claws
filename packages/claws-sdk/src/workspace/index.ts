/**
 * @bic/claws-sdk/workspace — workspace parser for the serve layer.
 *
 * @module claws-sdk/workspace
 */

export { parseWorkspace } from './parser.js';
export {
  OC_WORKSPACE_FILES,
  OC_PARSED_FILES,
  WorkspaceError,
  parseOcPath,
  formatOcPath,
  isValidOcPath,
  OcPathError,
  type OcParsedFile,
  type OcWorkspaceFile,
  type WorkspaceFileName,
  type WorkspaceState,
  type SectionBase,
  type ParsedSection,
  type SoulSection,
  type MemorySection,
  type IdentitySection,
  type ToolsSection,
  type AgentsSection,
  type UserSection,
  type HeartbeatSection,
  type OcPath,
} from '@bic/openclaw-workspace/path';
export {
  parseSoulSections,
  reassembleSoulSections,
  replaceSectionContent,
  SoulSectionError,
  type EolShape,
  type SoulGovernanceContext,
  type SoulLockSource,
  type SoulSectionView,
  type SoulSectionsParse,
} from './soul-sections.js';
export {
  CHUNK_TABS,
  type Chunk,
  type ChunkAssemblyResult,
  type ChunkDataMap,
  type ChunkGovernance,
  type ChunkTab,
  type ChunkWarning,
  type ChunkWriteBack,
  type ConnectionsData,
  type ConnectionsSummary,
  type ConnectionsToolEntry,
  type DataLabel,
  type EntitlementEntry,
  type EntitlementsData,
  type FieldEditability,
  type GeneralData,
  type GroupsData,
  type ItemLock,
  type KnowledgeSourceEntry,
  type MemoryData,
  type PendingViolation,
  type PreferencesData,
  type RiskClassification,
  type ScheduleData,
  type TrustData,
  type TrustTier,
  type WorkqueueData,
} from '@bic/openclaw-workspace/path';
export {
  assembleChunks,
  type AssembleChunksOptions,
  type FleetPolicy,
  type MtimeReader,
} from './chunk-assembler.js';
export {
  buildWorkspaceSchema,
  type BuildWorkspaceSchemaOptions,
} from './schema-builder.js';
export type {
  CompilationStatus,
  CompilationStatusKind,
  FileSchema,
  SectionSchema,
  ViolationState,
  WorkspaceSchema,
  WorkspaceSessionInfo,
} from './schema-types.js';
export {
  VersionStore,
  DEFAULT_MAX_VERSIONS,
  type AvailableRange,
  type EvictedVersionMarker,
  type VersionLookupResult,
  type VersionSnapshot,
  type VersionStoreOptions,
} from './version-store.js';
export {
  parseAt,
  resolveAt,
  defaultSnapshotIRReader,
  type AtMode,
  type AtParseError,
  type AtParseResult,
  type ParsedAt,
  type ResolvedAt,
  type ResolveError,
  type ResolveResult,
  type ResolverContext,
  type SnapshotIRReader,
} from './version-resolver.js';
export {
  diffGovernance,
  type ChangeClassifier,
  type DiffGovernanceOptions,
} from './governance-diff.js';
export {
  parseHeartbeatSchedule,
  computeNextOccurrence,
  HeartbeatScheduleError,
  type CalendarEvent,
} from './heartbeat-parser.js';
export type {
  DiffChangeSource,
  DiffChangeType,
  DiffEntry,
  DiffResult,
  DiffSummary,
} from './diff-types.js';
export {
  buildWorkQueue,
  heartbeatTaskId,
  type BuildWorkQueueOptions,
  type WorkQueueItem,
  type WorkQueueRuntimeState,
  type WorkQueueSource,
  type WorkQueueStatus,
} from './workqueue-builder.js';
export {
  isValidCronSchedule,
  type AgentSessionConfig,
  type ApprovalTimeoutFailMode,
  type ChannelSessionConfig,
  type CronSessionConfig,
  type MainSessionConfig,
  type SessionConfig,
  type SessionRunStatus,
  type SessionState,
  type SessionStatus,
  type SessionSummary,
  type SessionType,
  type ToolCall,
  type ToolCallContext,
  type ToolDefinition,
} from './session-types.js';
export {
  resolveSessionTools,
  resolveUnattendedFailMode,
  UNATTENDED_SESSION_TYPES,
  type ResolveSessionToolsOptions,
  type SessionLookup,
} from './session-tool-resolver.js';
export {
  countMemoryEntries,
  memorySectionId,
  parseMemorySections,
  reassembleMemorySections,
  type MemoryLoopSection,
  type ParsedMemorySections,
} from './memory-sections.js';
export {
  TrustManager,
  generateJti,
  deriveWorkspaceId,
  scopedTrustAudience,
  DEFAULT_JWT_LEEWAY_MS,
  DEFAULT_NONCE_TTL_MS,
  JWT_NONCE_STORE_FILE,
  TRUST_JWT_AUDIENCE,
  type EscalateResult,
  type PendingEscalation,
  type TierTransition,
  type TrustApprovalClaims,
  type TrustError,
  type TrustManagerOptions,
  type TrustState,
} from './trust-manager.js';
export {
  createApprovalRequest,
  formatApprovalLabel,
  type ApprovalContext,
  type ApprovalGovernance,
  type ApprovalRequestEvent,
  type ApprovalRiskAssessment,
  type ApprovalRiskClassification,
  type ApprovalRiskLevel,
  type ApprovalSchemaVersion,
  type ApprovalSessionDescriptor,
  type ApprovalSessionType,
  type ApprovalToolCall,
  type CreateApprovalRequestOptions,
} from './approval-events.js';
export {
  AutoSnapshotManager,
  type AutoSnapshotManagerOptions,
  type SaveAutoSnapshotInput,
} from './auto-snapshot.js';
export {
  AUTO_SNAPSHOT_DIR,
  DEFAULT_MAX_AUTO_SNAPSHOTS,
  type AutoSnapshot,
  type AutoSnapshotTrigger,
} from './auto-snapshot-types.js';
export {
  invokeAutoSnapshotHook,
  type AutoSnapshotHookInput,
  type AutoSnapshotHookResult,
  type IntegrityCheck,
} from './auto-snapshot-trigger.js';
export {
  atomicWriteFile,
  WORKSPACE_TEMPFILE_MARKER,
  type WorkspaceFileEncoding,
} from './fs-atomic.js';
