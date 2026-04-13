/**
 * @audit() decorator — flags a skill handler for audit chain inclusion.
 *
 * When set, the claws compiler will include this skill's invocations
 * in the governance audit trail.
 *
 * This is compile-time metadata only — no runtime wrapping.
 *
 * @module @bic/claws-skill-kit/decorators/audit
 */

import {
  GOVERNANCE_METADATA_KEY,
  type SkillHandler,
} from '../types.js';

/**
 * Flag a skill handler for audit trail inclusion.
 *
 * @param handler - The skill handler to annotate.
 * @returns The same handler, with audit flag set.
 */
export function audit<TInput, TOutput>(
  handler: SkillHandler<TInput, TOutput>,
): SkillHandler<TInput, TOutput> {
  handler[GOVERNANCE_METADATA_KEY].audit = true;
  return handler;
}
