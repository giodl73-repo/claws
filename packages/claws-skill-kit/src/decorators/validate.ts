/**
 * @validate(schema) decorator — attaches an input validation schema to a skill handler.
 *
 * The schema is stored as metadata for the claws compiler to read at build time.
 * Runtime validation is handled by the generated governance hooks, not by this decorator.
 *
 * This is compile-time metadata only — no runtime wrapping.
 *
 * @module @bic/claws-skill-kit/decorators/validate
 */

import {
  GOVERNANCE_METADATA_KEY,
  type SkillHandler,
} from '../types.js';

/**
 * Attach an input validation schema to a skill handler.
 *
 * @param schema - A Zod schema or any schema object the compiler understands.
 * @param handler - The skill handler to annotate.
 * @returns The same handler, with validation schema attached.
 */
export function validate<TInput, TOutput>(
  schema: unknown,
  handler: SkillHandler<TInput, TOutput>,
): SkillHandler<TInput, TOutput> {
  if (typeof schema !== 'object' || schema === null) {
    throw new TypeError('validate() schema must be a non-null object');
  }
  handler[GOVERNANCE_METADATA_KEY].validationSchema = schema;
  return handler;
}
