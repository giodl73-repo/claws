/**
 * File-specific extraction prompts for LLM governance extraction.
 *
 * Each prompt module targets a specific OC workspace file type and
 * produces typed JSON governance intents with confidence scores.
 *
 * @module claws-sdk/compile/llm/prompts
 */

export { ADVERSARIAL_GUARD, withAdversarialGuard } from './adversarial-guard.js';

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
