/**
 * Types for SKILL.md governance frontmatter validation.
 *
 * @module @bic/claws-skill-kit/schema/types
 */

import type { RiskLevelCode, OboBoundary } from '../types.js';

/**
 * Governance frontmatter as parsed from SKILL.md YAML.
 */
export interface GovernanceFrontmatter {
  /** Risk classification (R1–R5, or "none" which normalizes to R1). */
  risk_level: RiskLevelCode | string;
  /** OBO boundary type (optional). */
  obo?: OboBoundary | string | undefined;
  /** Data classification labels (optional). */
  data_labels?: string[] | undefined;
  /** Skill tier: prompt-only, typed, or compiled (optional). */
  tier?: 'prompt-only' | 'typed' | 'compiled' | undefined;
}

/**
 * Structured validation error from annotation parsing.
 */
export interface AnnotationError {
  /** Dot-path to the invalid field. */
  path: string;
  /** Human-readable error message. */
  message: string;
  /** Suggested nearest valid value, if applicable (S04-F01). */
  suggestion?: string | undefined;
}

/**
 * Result of parsing governance frontmatter.
 */
export type AnnotationParseResult =
  | {
      success: true;
      data: GovernanceFrontmatter & { risk_level: RiskLevelCode };
      warnings?: string[] | undefined;
    }
  | {
      success: false;
      errors: AnnotationError[];
    };
