/**
 * Compile pipeline — intent resolution, policy compilation, code generation.
 *
 * @module claws-sdk/compile
 */

export { parse } from './parse.js';
export { resolveDefaultSources, normalizeContent } from './input-resolver.js';
export { buildGovernanceAST } from './governance-ast.js';
export { extract } from './extract.js';
export { analyze } from './analyze.js';
export { detectConflicts } from './conflict-detect.js';
export { buildCapabilityManifest, riskClassToLevel, riskLevelFromClassification } from './manifest.js';
export { toIRConflictReport } from './conflicts-ir.js';
export { COMPILER_VERSION, SCHEMA_VERSION } from './version.js';
export { check as cacheCheck, store as cacheStore } from './cache.js';
export type { CacheEntry, CacheCheckResult, CacheOptions } from './cache.js';
export type {
  ParseResult,
  ParseDiagnostic,
  DiagnosticSeverity,
  FileEntry,
  FileEntryPresent,
  FileEntryAbsent,
  CGRProvenance,
  ClawsConfig,
  InputSource,
  SourceType,
  DefaultFileSource,
  ConfidenceScore,
  ConstraintScope,
  SoulIntent,
  ToolRiskClass,
  ToolManifestEntry,
  DelegationIntent,
  AuthMethod,
  AttestationLevel,
  IdentityIntent,
  AuthorityIntent,
  DataSensitivity,
  MemoryIntent,
  ScheduleIntent,
  SkillIntent,
  WorkflowStep,
  WorkflowIntent,
  IntentResult,
  IntentCategory,
  IntentGroup,
  CrossReference,
  GovernanceAST,
  ToolEntry,
  SkillEntry,
  AgentRosterEntry,
  DataLabelEntry,
  ParsedManifest,
  ConflictCategory,
  ConflictLevel,
  ConflictEntry,
  ConflictLocation,
  ConflictReport,
  TrustTier,
} from './types.js';
export {
  DEFAULT_FILE_SOURCES,
  ABSENT_DEFAULTS,
  CONFIDENCE_THRESHOLD,
  SOUL_KEYWORD_CONFIDENCE,
  CONFLICT_DIAGNOSTIC_CODES,
} from './types.js';
export {
  extractAllIntents,
  extractSoulIntents,
  extractToolsIntents,
  extractAgentsIntents,
  extractIdentityIntents,
  extractUserIntents,
  extractMemoryIntents,
  extractHeartbeatIntents,
  extractSkillIntents,
  extractWorkflowIntents,
} from './intent/index.js';
export type { AnyIntentResult } from './intent/index.js';
