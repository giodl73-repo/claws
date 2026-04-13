/**
 * Frontmatter-to-decorator value propagation (S02-F02).
 *
 * During `claws import`, frontmatter values from SKILL.md are the source
 * of truth for decorator arguments. This module maps parsed frontmatter
 * to the decorator argument shape.
 *
 * @module @bic/claws-skill-kit/schema/propagation
 */

import type { RiskLevelCode, OboBoundary } from '../types.js';
import type { GovernanceFrontmatter } from './types.js';

/**
 * Decorator argument map — the output of frontmatter-to-decorator propagation.
 * Each key corresponds to a decorator function name.
 */
export interface DecoratorArgMap {
  classify: RiskLevelCode;
  obo?: OboBoundary;
  data_labels?: string[];
}

/**
 * Convert parsed governance frontmatter into decorator arguments.
 *
 * @param frontmatter - Validated governance frontmatter from SKILL.md.
 * @returns Decorator argument map for code generation.
 * @throws If prompt-only tier attempts Tier 2 decorator usage (S02-F01).
 */
export function propagateToDecorators(frontmatter: GovernanceFrontmatter): DecoratorArgMap {
  // S02-F01: Prompt-only skills cannot be TYPED (no code to decorate)
  if (frontmatter.tier === 'prompt-only') {
    throw new Error(
      'Prompt-only skills cannot use Tier 2 decorators — there is no handler code to decorate. ' +
      'Use YAML-only governance annotations in SKILL.md frontmatter instead.',
    );
  }

  const result: DecoratorArgMap = {
    classify: frontmatter.risk_level as RiskLevelCode,
  };

  if (frontmatter.obo !== undefined) {
    result.obo = frontmatter.obo as OboBoundary;
  }

  if (frontmatter.data_labels !== undefined) {
    result.data_labels = frontmatter.data_labels;
  }

  return result;
}
