/**
 * Human-readable terminal formatter for the format registry.
 *
 * Wraps the existing output/format-default module to conform to
 * the Formatter interface used by the registry. Adds colored severity
 * indicators:
 *   CRITICAL = bright red (bold + red)
 *   HIGH     = red
 *   MEDIUM   = yellow
 *   LOW      = dim
 *
 * @module claws-cli/format/default
 */

import type { Palette } from '../output/color.js';
import { createPalette, severityColor, severityLabel } from '../output/color.js';
import type { RenderableViolation, CheckResult } from '../output/format-default.js';

/**
 * Map severity level to a color function that includes CRITICAL distinction.
 * Uses palette.bold + palette.fail for CRITICAL (level >= 5) so NO_COLOR is respected.
 */
function criticalAwareSeverityColor(level: number, palette: Palette): (text: string) => string {
  if (level >= 5) return (text: string) => palette.bold(palette.fail(text));
  return severityColor(level, palette);
}

/**
 * Format a single violation with colored severity for terminal display.
 */
function formatTerminalViolation(v: RenderableViolation, palette: Palette): string {
  const color = criticalAwareSeverityColor(v.level, palette);
  const label = severityLabel(v.level);
  const severity = color(label.toUpperCase());
  const ruleId = palette.dim(v.ruleId ?? v.diagnosticCode);
  const target = v.target ? palette.cyan(v.target) : '';
  const parts = [
    `  ${severity} ${ruleId}`,
    target ? ` ${target}` : '',
    `  ${v.message}`,
  ];
  return parts.join('');
}

/**
 * Render check result as human-readable terminal output with colored severity.
 */
export function renderTerminalOutput(result: CheckResult, palette?: Palette): string {
  const pal = palette ?? createPalette();
  const lines: string[] = [];

  if (result.violations.length > 0) {
    for (const v of result.violations) {
      lines.push(formatTerminalViolation(v, pal));
    }
    lines.push('');
  }

  // Summary line
  const elapsed = (result.durationMs / 1000).toFixed(1);
  if (result.violations.length === 0) {
    lines.push(`${pal.pass('PASS')}  No violations (${elapsed}s)`);
  } else {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const v of result.violations) {
      if (v.level >= 4) high++;
      else if (v.level === 3) medium++;
      else low++;
    }
    const parts: string[] = [];
    if (high > 0) parts.push(`${high} high`);
    if (medium > 0) parts.push(`${medium} medium`);
    if (low > 0) parts.push(`${low} low`);
    const breakdown = parts.join(', ');
    lines.push(`${pal.fail('FAIL')}  ${result.violations.length} violation(s) (${breakdown}) in ${elapsed}s`);
  }

  return lines.join('\n');
}
