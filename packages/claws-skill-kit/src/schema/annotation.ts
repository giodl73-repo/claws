/**
 * Zod schema for SKILL.md governance frontmatter validation.
 *
 * Features:
 * - Collect-all-errors (S04-F02): validates all fields before reporting
 * - Nearest-value suggestion (S04-F01): suggests closest valid enum value
 * - YAML None/null disambiguation (S04-F04 / P-229): string "none" -> R1
 * - Semantic error context (S04-F03): explains risk level scale
 * - Cross-field validation: R1 + transact OBO contradiction (S03-F06)
 *
 * @module @bic/claws-skill-kit/schema/annotation
 */

import { z } from 'zod';
import type { RiskLevelCode, OboBoundary } from '../types.js';
import type { AnnotationError, AnnotationParseResult, GovernanceFrontmatter } from './types.js';

const VALID_RISK_LEVELS = ['R1', 'R2', 'R3', 'R4', 'R5'] as const;
const VALID_OBO_BOUNDARIES = ['email', 'message', 'calendar', 'social', 'purchase', 'transact'] as const;

const RISK_LEVEL_DESCRIPTIONS: Record<string, string> = {
  R1: 'READ (informational, no side effects)',
  R2: 'ANNOTATE (metadata changes only)',
  R3: 'MODIFY (modifies user data)',
  R4: 'SEND (acts on behalf of user externally)',
  R5: 'TRANSACT (financial or irreversible operations)',
};

/**
 * Compute Levenshtein distance between two strings.
 *
 * Local copy — skill-kit must remain standalone (no claws-sdk hard dep).
 * Canonical version with bounded early-exit: claws-sdk/src/util/levenshtein.ts
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

/**
 * Find the nearest valid value from a list of candidates.
 */
function nearestValue(input: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  const lower = input.toLowerCase();
  for (const candidate of candidates) {
    const dist = levenshtein(lower, candidate.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return bestDist <= 3 ? best : undefined;
}

/**
 * The raw Zod schema for governance frontmatter.
 * This validates structure only; cross-field validation is done in parseAnnotation.
 */
export const GovernanceAnnotationSchema = z.object({
  risk_level: z.union([
    z.enum(VALID_RISK_LEVELS),
    z.literal('none'),
  ]),
  obo: z.enum(VALID_OBO_BOUNDARIES).optional(),
  data_labels: z.array(z.string()).optional(),
  tier: z.enum(['prompt-only', 'typed', 'compiled']).optional(),
});

/**
 * Parse and validate governance frontmatter from SKILL.md YAML.
 *
 * Returns a structured result with all errors collected (S04-F02)
 * and nearest-value suggestions (S04-F01).
 */
export function parseAnnotation(input: unknown): AnnotationParseResult {
  const errors: AnnotationError[] = [];
  const warnings: string[] = [];

  // Handle null/undefined input
  if (input == null || typeof input !== 'object') {
    return {
      success: false,
      errors: [{ path: '', message: 'Governance frontmatter must be an object' }],
    };
  }

  const obj = input as Record<string, unknown>;

  // --- risk_level validation ---
  const rawRisk = obj['risk_level'];
  let normalizedRiskLevel: RiskLevelCode | undefined;

  if (rawRisk === null || rawRisk === undefined) {
    errors.push({
      path: 'risk_level',
      message: 'risk_level is required. Valid values: R1 (READ), R2 (ANNOTATE), R3 (MODIFY), R4 (SEND), R5 (TRANSACT)',
    });
  } else if (typeof rawRisk === 'string') {
    const upper = rawRisk.toUpperCase();
    if (rawRisk.toLowerCase() === 'none') {
      // S04-F04: "none" normalizes to R1
      normalizedRiskLevel = 'R1';
    } else if ((VALID_RISK_LEVELS as readonly string[]).includes(upper)) {
      normalizedRiskLevel = upper as RiskLevelCode;
    } else {
      const suggestion = nearestValue(rawRisk, VALID_RISK_LEVELS);
      const scaleExplanation = VALID_RISK_LEVELS.map(
        (l) => `${l}=${RISK_LEVEL_DESCRIPTIONS[l]}`,
      ).join(', ');
      errors.push({
        path: 'risk_level',
        message: `Invalid risk_level "${rawRisk}". Valid values: ${scaleExplanation}`,
        suggestion,
      });
    }
  } else {
    errors.push({
      path: 'risk_level',
      message: 'risk_level must be a string (R1–R5 or "none")',
    });
  }

  // --- obo validation ---
  const rawObo = obj['obo'];
  let normalizedObo: OboBoundary | undefined;

  if (rawObo !== undefined) {
    if (typeof rawObo === 'string') {
      if ((VALID_OBO_BOUNDARIES as readonly string[]).includes(rawObo)) {
        normalizedObo = rawObo as OboBoundary;
      } else {
        const suggestion = nearestValue(rawObo, VALID_OBO_BOUNDARIES);
        errors.push({
          path: 'obo',
          message: `Invalid obo boundary "${rawObo}". Valid values: ${VALID_OBO_BOUNDARIES.join(', ')}`,
          suggestion,
        });
      }
    } else {
      errors.push({
        path: 'obo',
        message: 'obo must be a string',
      });
    }
  }

  // --- data_labels validation ---
  const rawLabels = obj['data_labels'];
  let normalizedLabels: string[] | undefined;

  if (rawLabels !== undefined) {
    if (Array.isArray(rawLabels)) {
      normalizedLabels = rawLabels.map(String);
    } else {
      errors.push({
        path: 'data_labels',
        message: 'data_labels must be an array of strings',
      });
    }
  }

  // --- Cross-field validation (S03-F06) ---
  if (normalizedRiskLevel === 'R1' && normalizedObo === 'transact') {
    warnings.push(
      'Contradictory governance: R1 (READ — informational) with obo=transact (financial operations). ' +
      'Consider raising risk_level to R4 or R5 to match the OBO boundary.',
    );
  }

  // --- Return result ---
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const data: GovernanceFrontmatter & { risk_level: RiskLevelCode } = {
    risk_level: normalizedRiskLevel!,
    ...(normalizedObo !== undefined ? { obo: normalizedObo } : {}),
    ...(normalizedLabels !== undefined ? { data_labels: normalizedLabels } : {}),
  };

  // Preserve tier if provided
  const rawTier = obj['tier'];
  if (typeof rawTier === 'string' && ['prompt-only', 'typed', 'compiled'].includes(rawTier)) {
    data.tier = rawTier as 'prompt-only' | 'typed' | 'compiled';
  }

  return {
    success: true,
    data,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
