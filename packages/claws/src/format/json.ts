/**
 * JSON formatter for claws check output.
 *
 * Produces a machine-readable JSON object with top-level `status`,
 * `violations`, `summary`, and `durationMs` fields for programmatic
 * consumption. Each entry in `violations` includes actionable
 * `what`, `fix`, and `docsUrl` fields.
 *
 * @module claws-cli/format/json
 */

import type { RenderableViolation, CheckResult } from '../output/format-default.js';
import { severityLabel } from '../output/color.js';

/**
 * JSON violation with actionable fields.
 */
export interface FormattedJsonViolation {
  readonly ruleId: string;
  readonly severity: string;
  readonly level: number;
  readonly target: string;
  readonly what: string;
  readonly fix: string;
  readonly docsUrl: string;
}

/**
 * Full JSON formatter output.
 */
export interface FormattedJsonResult {
  readonly status: 'pass' | 'fail';
  readonly violations: readonly FormattedJsonViolation[];
  readonly summary: {
    readonly total: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly durationMs: number;
}

/**
 * Generate a docs URL for a rule.
 */
function docsUrlForRule(ruleId: string): string {
  return `https://claws.dev/rules/${ruleId.toLowerCase()}`;
}

/**
 * Generate a fix suggestion for a violation.
 */
function fixForViolation(v: RenderableViolation): string {
  const target = v.target || 'workspace';
  const ruleId = v.ruleId ?? v.diagnosticCode ?? 'unknown';
  return `Review ${target} for rule ${ruleId} compliance`;
}

/**
 * Render check result as formatted JSON string with what/fix/docsUrl fields.
 */
export function renderFormattedJson(result: CheckResult): string {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const v of result.violations) {
    if (v.level >= 4) high++;
    else if (v.level === 3) medium++;
    else low++;
  }

  const violations: FormattedJsonViolation[] = result.violations.map((v) => {
    const ruleId = v.ruleId ?? v.diagnosticCode ?? 'unknown';
    const target = v.target ?? '';
    return {
      ruleId,
      severity: severityLabel(v.level),
      level: v.level,
      target,
      what: v.message,
      fix: fixForViolation(v),
      docsUrl: docsUrlForRule(ruleId),
    };
  });

  const output: FormattedJsonResult = {
    status: result.violations.length === 0 ? 'pass' : 'fail',
    violations,
    summary: {
      total: result.violations.length,
      high,
      medium,
      low,
    },
    durationMs: result.durationMs,
  };

  return JSON.stringify(output, null, 2);
}
