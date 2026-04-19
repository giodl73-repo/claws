/**
 * @bic/claws-sdk — enterprise governance compiler for agent workspaces.
 *
 * @module claws-sdk
 */

export { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE, type ClawsSidecarDir } from './types/sidecar.js';
export { CLAWS_SIDECAR_VERSION, CLAWS_GITIGNORE_DIRS } from './types/sidecar.js';
export { scaffoldSidecar as initSidecar } from './init/sidecar-scaffold.js';
export type { Platform, EnforcementModel, PlatformCapability } from './types/platform.js';
export { detect } from './detect/index.js';
export type {
  PlatformId,
  TrustTierDefault,
  MarkerResult,
  PlatformInfo,
  PlatformInventory,
} from './detect/index.js';
export { normalizePath, normalizeName, levenshtein, stripBOM, normalizeLF } from './util/index.js';
export {
  OC_POLICY_E001,
  validateFailModes,
  serialize,
  deserialize,
  hashIR,
  hashRaw,
  type FailMode,
  type RuleLevel,
  type DenyIntent,
  type ElicitIntent,
  type RequireIntent,
  type LimitIntent,
  type LabelIntent,
  type MechanicalIntent,
  type IntentBase,
  type CapabilityManifest,
  type ToolCapability,
  type ToolRiskLevel,
  type ToolClassification,
  type SkillCapability,
  type AgentCapability,
  type DelegationMapEntry,
  type WorkflowCapability,
  type GovAnalysis,
  type GovViolation,
  type GovWarning,
  type EnforcementPlan,
  type FixSuggestion,
  type ToolFuzzyMatch,
  type ChannelRedactionConfig,
  type RuleSuppressionMarker,
  type ReclassificationEntry,
  type EffectiveR5Count,
  type ConflictReport,
  type OboConflict,
  type MultiConstraintConflict,
  type ConflictSeverity,
  type GovernanceIR,
  type DelegationEntry,
  type CompilerMeta,
  type AuditEvent,
  type AuditOutcome,
  type AuditAlgorithm,
} from './ir/index.js';
export {
  signAuditEntry,
  verifyAuditEntry,
  type AuditChainEntry,
} from './compliance/artifact-signer.js';
export {
  appendAuditEvent,
  readAuditChain,
  resolveActor,
  type AuditEventInput,
} from './compliance/audit-chain.js';
export {
  hashContent,
  type ICompilationHost,
  type GovernanceIRLike,
} from './compilation-host.js';
export { compile } from './compiler/host/index.js';
export type {
  CompileOptions,
  CompileResult,
  CompileDiagnostic,
  CompileStage,
} from './compiler/host/index.js';
