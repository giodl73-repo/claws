/**
 * skill() factory — creates a typed SkillHandler with governance metadata slots.
 *
 * The returned handler is a standard OC skill shape with an attached
 * governance metadata object readable by getGovernanceMetadata().
 *
 * @module @bic/claws-skill-kit/factory/skill
 */

import {
  GOVERNANCE_METADATA_KEY,
  type SkillGovernanceMetadata,
  type SkillHandler,
} from '../types.js';

/**
 * Skill directory name convention: lowercase, hyphen-separated, alphanumeric.
 */
const SKILL_NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Create a typed skill handler with empty governance metadata slots.
 *
 * @param name - Skill name (must match skill directory name convention).
 * @param handler - The handler function.
 * @returns A SkillHandler with governance metadata attached.
 */
export function skill<TInput = unknown, TOutput = unknown>(
  name: string,
  handler: (input: TInput) => TOutput | Promise<TOutput>,
): SkillHandler<TInput, TOutput> {
  if (!SKILL_NAME_RE.test(name)) {
    throw new Error(
      `Invalid skill name '${name}': must match /${SKILL_NAME_RE.source}/`,
    );
  }

  const metadata: SkillGovernanceMetadata = {};

  const skillHandler = handler as unknown as SkillHandler<TInput, TOutput>;
  Object.defineProperty(skillHandler, 'skillName', {
    value: name,
    writable: false,
    enumerable: true,
    configurable: false,
  });
  Object.defineProperty(skillHandler, GOVERNANCE_METADATA_KEY, {
    value: metadata,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return skillHandler;
}
