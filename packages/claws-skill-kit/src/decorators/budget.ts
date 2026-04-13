/**
 * @budget(tokens) decorator — annotates a skill handler with a token budget limit.
 *
 * The token budget is a compile-time annotation that the claws compiler
 * reads to generate appropriate cost enforcement hooks.
 *
 * This is compile-time metadata only — no runtime wrapping.
 *
 * @module @bic/claws-skill-kit/decorators/budget
 */

import {
  GOVERNANCE_METADATA_KEY,
  type SkillHandler,
} from '../types.js';

/**
 * Annotate a skill handler with a token budget limit.
 *
 * @param tokens - Maximum token budget for a single invocation.
 * @param handler - The skill handler to annotate.
 * @returns The same handler, with token budget metadata set.
 */
export function budget<TInput, TOutput>(
  tokens: number,
  handler: SkillHandler<TInput, TOutput>,
): SkillHandler<TInput, TOutput> {
  if (!Number.isFinite(tokens) || tokens <= 0) {
    throw new Error(`[claws/skill-kit] invalid token budget: ${tokens}. Must be a positive finite number.`);
  }
  handler[GOVERNANCE_METADATA_KEY].tokenBudget = tokens;
  return handler;
}
