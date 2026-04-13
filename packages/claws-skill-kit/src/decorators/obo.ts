/**
 * @obo(type) decorator — annotates a skill handler with OBO boundary metadata.
 *
 * OBO = "on-behalf-of" — indicates the skill acts on behalf of a principal
 * in the specified domain (email, message, calendar, social, purchase, transact).
 *
 * This is compile-time metadata only — no runtime wrapping.
 *
 * @module @bic/claws-skill-kit/decorators/obo
 */

import {
  GOVERNANCE_METADATA_KEY,
  type OboBoundary,
  type SkillHandler,
} from '../types.js';

const VALID_OBO_TYPES: ReadonlySet<OboBoundary> = new Set([
  'email', 'message', 'calendar', 'social', 'purchase', 'transact',
]);

/**
 * Annotate a skill handler with an OBO boundary type.
 *
 * @param type - The OBO boundary domain.
 * @param handler - The skill handler to annotate.
 * @returns The same handler, with OBO metadata set.
 */
export function obo<TInput, TOutput>(
  type: OboBoundary,
  handler: SkillHandler<TInput, TOutput>,
): SkillHandler<TInput, TOutput> {
  if (!VALID_OBO_TYPES.has(type)) {
    throw new Error(`[claws/skill-kit] invalid OBO boundary type: "${type}". Valid: ${[...VALID_OBO_TYPES].join(', ')}`);
  }
  handler[GOVERNANCE_METADATA_KEY].obo = type;
  return handler;
}
