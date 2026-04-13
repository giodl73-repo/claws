/**
 * JSON output mode for claws check --json.
 *
 * Produces a machine-readable JSON array of violation objects.
 *
 * @module claws-cli/output/format-json
 */

import { severityLabel } from './color.js';
import type { RenderableViolation, CheckResult } from './format-default.js';

/**
 * JSON-serializable violation for --json output.
 */
export interface JsonViolation {
  readonly rule: string;
  readonly severity: string;
  readonly level: number;
  readonly target: string;
  readonly message: string;
  readonly diagnosticCode: string;
}

/**
 * JSON-serializable check result.
 */
export interface JsonCheckResult {
  readonly status: 'pass' | 'fail';
  readonly violations: readonly JsonViolation[];
  readonly summary: {
    readonly total: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly durationMs: number;
}

/**
 * Convert a violation to JSON-serializable form.
 */
function toJsonViolation(v: RenderableViolation): JsonViolation {
  return {
    rule: v.ruleId,
    severity: severityLabel(v.level),
    level: v.level,
    target: v.target,
    message: v.message,
    diagnosticCode: v.diagnosticCode,
  };
}

/**
 * Render check result as JSON string.
 */
export function renderCheckJson(result: CheckResult): string {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const v of result.violations) {
    if (v.level >= 4) high++;
    else if (v.level === 3) medium++;
    else low++;
  }

  const output: JsonCheckResult = {
    status: result.violations.length === 0 ? 'pass' : 'fail',
    violations: result.violations.map(toJsonViolation),
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
