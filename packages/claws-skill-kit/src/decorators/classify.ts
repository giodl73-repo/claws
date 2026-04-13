/**
 * @classify(level) decorator — annotates a skill handler with a risk level.
 *
 * Valid levels: R1 (informational) through R5 (critical).
 * Maps to RuleLevel 1–5 in the GovernanceIR.
 *
 * This is compile-time metadata only — no runtime wrapping.
 *
 * @module @bic/claws-skill-kit/decorators/classify
 */

import {
  GOVERNANCE_METADATA_KEY,
  RISK_LEVEL_MAP,
  type RiskLevelCode,
  type SkillHandler,
} from '../types.js';

const VALID_LEVELS: ReadonlySet<string> = new Set(['R1', 'R2', 'R3', 'R4', 'R5']);

/**
 * Annotate a skill handler with a risk classification level.
 *
 * @param level - Risk level code (R1–R5).
 * @param handler - The skill handler to annotate.
 * @returns The same handler, with risk level metadata set.
 */
export function classify<TInput, TOutput>(
  level: RiskLevelCode,
  handler: SkillHandler<TInput, TOutput>,
): SkillHandler<TInput, TOutput> {
  if (!VALID_LEVELS.has(level)) {
    throw new Error(`[claws/skill-kit] invalid risk level: "${level}". Valid: R1, R2, R3, R4, R5`);
  }
  handler[GOVERNANCE_METADATA_KEY].riskLevel = level;
  handler[GOVERNANCE_METADATA_KEY].riskLevelNumeric = RISK_LEVEL_MAP[level];
  return handler;
}
