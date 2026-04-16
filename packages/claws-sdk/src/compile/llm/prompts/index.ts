/**
 * File-specific extraction prompts for LLM governance extraction.
 *
 * Each prompt module targets a specific OC workspace file type and
 * produces typed JSON governance intents with confidence scores.
 *
 * @module claws-sdk/compile/llm/prompts
 */

export {
  ADVERSARIAL_GUARD,
  withAdversarialGuard,
  DEFAULT_ADVERSARIAL_CONFIDENCE_THRESHOLD,
  KNOWN_INJECTION_PATTERNS,
  containsJsonStructure,
  normalizeForPatternMatch,
  checkAdversarialIntent,
  validateAdversarialIntents,
} from './adversarial-guard.js';
export type {
  AdversarialGuardConfig,
  AdversarialCheckResult,
  AdversarialValidationResult,
} from './adversarial-guard.js';

export {
  SOUL_PROMPT_VERSION,
  buildSoulSystemPrompt,
  buildSoulUserPrompt,
} from './soul-extract.js';

export {
  TOOLS_PROMPT_VERSION,
  buildToolsSystemPrompt,
  buildToolsUserPrompt,
} from './tools-extract.js';

export {
  AGENTS_PROMPT_VERSION,
  buildAgentsSystemPrompt,
  buildAgentsUserPrompt,
} from './agents-extract.js';

export {
  SKILL_PROMPT_VERSION,
  buildSkillSystemPrompt,
  buildSkillUserPrompt,
} from './skill-extract.js';
