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
export type { AnalyzeOptions } from './analyze.js';
export { detectConflicts } from './conflict-detect.js';
export { buildCapabilityManifest, riskClassToLevel, riskLevelFromClassification } from './manifest.js';
export { toIRConflictReport } from './conflicts-ir.js';
export { COMPILER_VERSION, SCHEMA_VERSION } from './version.js';
export { check as cacheCheck, store as cacheStore } from './cache.js';
export type { CacheEntry, CacheCheckResult, CacheOptions } from './cache.js';
export {
  IncrementalCompilationCache,
  PhaseCache,
  DependencyGraph,
  CompilationQueue,
} from './cache.js';
export type {
  FileHashEntry,
  RecompilePlan,
  IncrementalCacheOptions,
  PhaseName,
  PhaseOutput,
  CachedOutput,
  PhaseCacheOptions,
  CompileTrigger,
  QueueCompileResult,
} from './cache.js';
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
// A-W1: AnthropicLLMProvider is NOT exported from barrel — only the LLMProvider
// interface. Consumers should import AnthropicLLMProvider directly from
// './llm/anthropic-provider.js' when they need the concrete implementation.
export {
  compileWithViolationGuard,
  type CompileFn as ViolationAwareCompileFn,
  type ViolationAwareCompileOptions,
  type ViolationAwareCompileResult,
  type ViolationClassifier,
} from './violation-aware-compile.js';
export {
  ExtractorLLM,
  LLMCache,
  hashContent as llmHashContent,
  hashPrompt as llmHashPrompt,
  verifyExtractionResult,
  mergeIntents,
  mergeAllIntents,
  raiseOnlyRisk,
  buildRegexIntentMap,
} from './llm/index.js';
export type {
  LLMProvider,
  LLMIntent,
  LLMIntentKind,
  LLMExtractionRequest,
  ExtractionResult,
  ExtractionUsage,
  ExtractionOptions,
  ExtractionHints,
  MergeResult,
  AnthropicLLMProviderOptions,
  CacheKey as LLMCacheKey,
  LLMCacheEntry,
  LLMCacheExport,
  LLMCacheStatus,
  LLMPipelineResult,
  VerificationResult,
  IntentMergeResult,
  MergedIntent,
  RegexIntent,
  ExtractionMethod,
} from './llm/index.js';
