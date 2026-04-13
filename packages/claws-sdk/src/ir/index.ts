/**
 * GovernanceIR — intermediate representation for governance compilation.
 *
 * @module claws-sdk/ir
 */

export type { FailMode, RuleLevel } from './fail-mode.js';
export { CLAWS_E001 } from './fail-mode.js';
export type {
  DenyIntent,
  ElicitIntent,
  RequireIntent,
  LimitIntent,
  LabelIntent,
  MechanicalIntent,
  IntentBase,
} from './mechanical-intent.js';
export type {
  CapabilityManifest,
  ToolCapability,
  ToolRiskLevel,
  ToolClassification,
  SkillCapability,
  AgentCapability,
  DelegationMapEntry,
  WorkflowCapability,
} from './capability-manifest.js';
export type {
  GovAnalysis,
  GovViolation,
  GovWarning,
  EnforcementPlan,
  FixSuggestion,
  ToolFuzzyMatch,
  ChannelRedactionConfig,
  RuleSuppressionMarker,
  ReclassificationEntry,
  EffectiveR5Count,
} from './gov-analysis.js';
export type {
  ConflictReport,
  OboConflict,
  MultiConstraintConflict,
  ConflictSeverity,
} from './conflict-report.js';
export type {
  GovernanceIR,
  DelegationEntry,
  CompilerMeta,
} from './governance-ir.js';
export {
  serialize,
  deserialize,
  hashIR,
  hashRaw,
} from './governance-ir.js';
export type {
  AuditEvent,
  AuditOutcome,
  AuditAlgorithm,
} from './audit-event.js';
export { validateFailModes } from './validate-fail-modes.js';
