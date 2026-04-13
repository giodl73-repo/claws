/**
 * @timeout(seconds) decorator — annotates a skill handler with an execution timeout.
 *
 * The timeout is a compile-time annotation that the claws compiler
 * reads to generate appropriate timeout enforcement hooks.
 *
 * This is compile-time metadata only — no runtime wrapping.
 *
 * @module @bic/claws-skill-kit/decorators/timeout
 */

import {
  GOVERNANCE_METADATA_KEY,
  type SkillHandler,
} from '../types.js';

/**
 * Annotate a skill handler with an execution timeout in seconds.
 *
 * @param seconds - Maximum execution time in seconds.
 * @param handler - The skill handler to annotate.
 * @returns The same handler, with timeout metadata set.
 */
export function timeout<TInput, TOutput>(
  seconds: number,
  handler: SkillHandler<TInput, TOutput>,
): SkillHandler<TInput, TOutput> {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`[claws/skill-kit] invalid timeout: ${seconds}. Must be a positive finite number of seconds.`);
  }
  handler[GOVERNANCE_METADATA_KEY].timeoutSeconds = seconds;
  return handler;
}
