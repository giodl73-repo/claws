/**
 * Human-readable colored output for claws check.
 *
 * Renders violation details with color-coded severity,
 * summary line with counts, and elapsed time.
 *
 * @module claws-cli/output/format-default
 */

import type { Palette } from './color.js';
import { severityColor, severityLabel } from './color.js';

/**
 * A violation to render (mirrors GovViolation shape).
 */
export interface RenderableViolation {
  readonly ruleId: string;
  readonly level: number;
  readonly message: string;
  readonly target: string;
  readonly diagnosticCode: string;
}

/**
 * Check result to render.
 */
export interface CheckResult {
  readonly violations: readonly RenderableViolation[];
  readonly durationMs: number;
}

/**
 * Format a single violation line with color.
 */
export function formatViolation(v: RenderableViolation, palette: Palette): string {
  const color = severityColor(v.level, palette);
  const label = severityLabel(v.level);
  const severity = color(label.toUpperCase());
  const ruleId = palette.dim(v.diagnosticCode);
  const target = v.target ? palette.cyan(v.target) : '';
  const parts = [
    `  ${severity} ${ruleId}`,
    target ? ` ${target}` : '',
    `  ${v.message}`,
  ];
  return parts.join('');
}

/**
 * Count violations by severity bucket.
 */
export function countBySeverity(violations: readonly RenderableViolation[]): {
  high: number;
  medium: number;
  low: number;
} {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const v of violations) {
    if (v.level >= 4) high++;
    else if (v.level === 3) medium++;
    else low++;
  }
  return { high, medium, low };
}

/**
 * Format the summary line.
 *
 * Clean: "PASS  No violations (0.3s)"
 * Violations: "FAIL  3 violations (1 high, 1 medium, 1 low) in 0.5s"
 */
export function formatSummary(result: CheckResult, palette: Palette): string {
  const { violations, durationMs } = result;
  const elapsed = (durationMs / 1000).toFixed(1);

  if (violations.length === 0) {
    return `${palette.pass('PASS')}  No violations (${elapsed}s)`;
  }

  const { high, medium, low } = countBySeverity(violations);
  const parts: string[] = [];
  if (high > 0) parts.push(`${high} high`);
  if (medium > 0) parts.push(`${medium} medium`);
  if (low > 0) parts.push(`${low} low`);

  const breakdown = parts.join(', ');
  return `${palette.fail('FAIL')}  ${violations.length} violation(s) (${breakdown}) in ${elapsed}s`;
}

/**
 * Render the full check output: violations + summary.
 */
export function renderCheckOutput(result: CheckResult, palette: Palette): string {
  const lines: string[] = [];

  if (result.violations.length > 0) {
    for (const v of result.violations) {
      lines.push(formatViolation(v, palette));
    }
    lines.push('');
  }

  lines.push(formatSummary(result, palette));
  return lines.join('\n');
}
