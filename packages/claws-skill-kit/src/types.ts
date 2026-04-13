/**
 * Core types for @bic/claws-skill-kit — governance annotations, skill metadata,
 * and decorator metadata shapes.
 *
 * @module @bic/claws-skill-kit/types
 */

import type { RuleLevel } from '@bic/claws-sdk/ir';

/**
 * OBO boundary types — the principal domains that a skill may
 * act on-behalf-of. Maps to the OC Gateway OBO enforcement.
 */
export type OboBoundary =
  | 'email'
  | 'message'
  | 'calendar'
  | 'social'
  | 'purchase'
  | 'transact';

/**
 * Risk level codes (R1–R5) as used in the skill-kit decorator API.
 * Maps to RuleLevel 1–5 in the GovernanceIR.
 */
export type RiskLevelCode = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

/**
 * Map from RiskLevelCode string to numeric RuleLevel.
 */
export const RISK_LEVEL_MAP: Record<RiskLevelCode, RuleLevel> = {
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
  R5: 5,
} as const;

/**
 * Governance annotation — a single piece of governance metadata
 * attached to a skill handler by a decorator.
 */
export interface GovernanceAnnotation {
  /** Decorator that produced this annotation. */
  readonly decorator: string;
  /** Annotation payload — shape depends on the decorator. */
  readonly value: unknown;
}

/**
 * Full governance metadata for a skill handler.
 * Populated incrementally by decorators; read at compile time.
 */
export interface SkillGovernanceMetadata {
  /** OBO boundary (set by @obo). */
  obo?: OboBoundary;
  /** Risk classification (set by @classify). */
  riskLevel?: RiskLevelCode;
  /** Numeric risk level derived from riskLevel. */
  riskLevelNumeric?: RuleLevel;
  /** Audit trail inclusion flag (set by @audit). */
  audit?: boolean;
  /** Input validation schema (set by @validate). */
  validationSchema?: unknown;
  /** Token budget limit (set by @budget). */
  tokenBudget?: number;
  /** Execution timeout in seconds (set by @timeout). */
  timeoutSeconds?: number;
}

/**
 * Skill handler — the function shape returned by skill().
 * A decorated skill IS a normal OC skill handler plus governance metadata.
 */
export interface SkillHandler<TInput = unknown, TOutput = unknown> {
  /** The skill handler function. */
  (input: TInput): TOutput | Promise<TOutput>;
  /** Skill name. */
  readonly skillName: string;
  /** Governance metadata slots — populated by decorators. */
  readonly [GOVERNANCE_METADATA_KEY]: SkillGovernanceMetadata;
}

/**
 * Well-known symbol key for storing governance metadata on skill handlers.
 */
export const GOVERNANCE_METADATA_KEY: unique symbol = Symbol.for('claws.governance');

/**
 * Read governance metadata from a skill handler.
 * Returns the metadata object, or undefined if the handler has none.
 */
export function getGovernanceMetadata(
  handler: SkillHandler,
): SkillGovernanceMetadata | undefined {
  return handler[GOVERNANCE_METADATA_KEY];
}
