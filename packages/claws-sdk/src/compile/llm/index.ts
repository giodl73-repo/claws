/**
 * LLM extraction module — provider-agnostic LLM interface for governance extraction.
 *
 * @module claws-sdk/compile/llm
 */

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
} from './types.js';

// A-W1: AnthropicLLMProvider intentionally NOT exported from sub-barrel.
// Consumers import the concrete provider directly from './anthropic-provider.js'.
export type { AnthropicLLMProviderOptions } from './anthropic-provider.js';

export { ExtractorLLM, buildRegexIntentMap } from './extractor.js';
export type { LLMPipelineResult } from './extractor.js';

export {
  buildSystemPrompt,
  buildUserPrompt,
  parseIntentsFromResponse,
  parseIntentsTyped,
  validateExtractionResult,
} from './prompts.js';
export type { IntentParseResult } from './prompts.js';

export {
  ADVERSARIAL_GUARD,
  withAdversarialGuard,
  DEFAULT_ADVERSARIAL_CONFIDENCE_THRESHOLD,
  KNOWN_INJECTION_PATTERNS,
  containsJsonStructure,
  normalizeForPatternMatch,
  checkAdversarialIntent,
  validateAdversarialIntents,
  SOUL_PROMPT_VERSION,
  buildSoulSystemPrompt,
  buildSoulUserPrompt,
  TOOLS_PROMPT_VERSION,
  buildToolsSystemPrompt,
  buildToolsUserPrompt,
  AGENTS_PROMPT_VERSION,
  buildAgentsSystemPrompt,
  buildAgentsUserPrompt,
  SKILL_PROMPT_VERSION,
  buildSkillSystemPrompt,
  buildSkillUserPrompt,
} from './prompts/index.js';
export type {
  AdversarialGuardConfig,
  AdversarialCheckResult,
  AdversarialValidationResult,
} from './prompts/index.js';

export {
  verifyIntent,
  verifyExtractionResult,
} from './verifier.js';
export type {
  VerificationOutcome,
  VerifiedIntent,
  VerificationResult,
} from './verifier.js';

export {
  mergeIntents,
  mergeAllIntents,
  raiseOnlyRisk,
} from './merger.js';
export type {
  ExtractionMethod,
  MergedIntent,
  IntentMergeResult,
  RegexIntent,
} from './merger.js';

export {
  LLMCache,
  hashContent,
  hashPrompt,
  signCacheExport,
  verifyCacheHmac,
  exportSigned,
  importVerified,
} from './cache.js';
export type {
  CacheKey,
  LLMCacheEntry,
  LLMCacheExport,
  LLMCacheStatus,
} from './cache.js';

export {
  calculateMetrics,
  calculateDelta,
} from './benchmark.js';
export type {
  BenchmarkMetrics,
  BenchmarkDelta,
} from './benchmark.js';
