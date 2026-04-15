/**
 * CSV formatter for claws fleet reports.
 *
 * Produces one header row followed by one data row per violation.
 * Columns: file, line, severity, ruleId, message
 *
 * @module claws-cli/format/csv
 */

import type { RenderableViolation, CheckResult } from '../output/format-default.js';
import { severityLabel } from '../output/color.js';

const CSV_HEADER = 'file,line,severity,ruleId,message';

/**
 * Escape a CSV field value.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Render a single violation as a CSV data row.
 */
function violationToCsvRow(v: RenderableViolation): string {
  const fields = [
    escapeCsvField(v.target ?? ''),
    '', // line number — violations don't carry line info in RenderableViolation
    escapeCsvField(severityLabel(v.level)),
    escapeCsvField(v.ruleId ?? v.diagnosticCode ?? ''),
    escapeCsvField(v.message),
  ];
  return fields.join(',');
}

/**
 * Render check result as CSV string with header row.
 */
export function renderCheckCsv(result: CheckResult): string {
  const lines = [CSV_HEADER];
  for (const v of result.violations) {
    lines.push(violationToCsvRow(v));
  }
  return lines.join('\n');
}
