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

export { AnthropicLLMProvider } from './anthropic-provider.js';
export type { AnthropicLLMProviderOptions } from './anthropic-provider.js';

export { ExtractorLLM, buildRegexIntentMap } from './extractor.js';
export type { LLMPipelineResult } from './extractor.js';

export {
  buildSystemPrompt,
  buildUserPrompt,
  parseIntentsFromResponse,
  validateExtractionResult,
} from './prompts.js';

export {
  ADVERSARIAL_GUARD,
  withAdversarialGuard,
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
