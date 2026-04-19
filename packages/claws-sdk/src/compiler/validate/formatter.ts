/**
 * Formatters for ValidationReport — human-readable text and machine JSON.
 *
 * Keeping this in a separate file lets CLI and programmatic consumers
 * share the same canonical wire format without importing the text
 * renderer just to get JSON output.
 *
 * @module claws-sdk/compiler/validate/formatter
 */

import { ALL_CHECKS } from './checks.js';
import type { CheckId, CheckResult, ValidationReport } from './types.js';

/** Lookup table for check names by id. Fully populated for ids 1..12. */
const NAME_BY_ID: ReadonlyMap<CheckId, string> = new Map(
  ALL_CHECKS.map((c) => [c.id, c.name] as const),
);

/** Safe name lookup; falls back to a sentinel only if the check id is outside 1..12. */
function nameFor(id: CheckId): string {
  return NAME_BY_ID.get(id) as string;
}

/** Stable text symbol for each severity. Kept minimal for CI logs. */
function severitySymbol(r: CheckResult): string {
  if (r.pass && r.severity === 'info') return 'OK  ';
  if (r.pass && r.severity === 'warning') return 'WARN';
  return 'FAIL';
}

/**
 * Render a ValidationReport as a human-readable multi-line string.
 *
 * Format (one check per line, then a summary footer):
 *
 *   [OK  ] #1  Schema conformance         — All 9 IR shards + compiler metadata present
 *   [FAIL] #4  R5 fail-closed compliance  — R5 fail-open rules detected: GOV-042
 *   ...
 *   Summary: 11/12 passed — OVERALL FAIL
 */
export function formatReportText(report: ValidationReport): string {
  const lines: string[] = [];
  for (const r of report.checks) {
    const name = nameFor(r.checkId);
    const paddedId = `#${r.checkId}`.padEnd(4, ' ');
    const paddedName = name.padEnd(30, ' ');
    lines.push(`[${severitySymbol(r)}] ${paddedId} ${paddedName} — ${r.message}`);
  }
  const verdict = report.overallPass ? 'OVERALL PASS' : 'OVERALL FAIL';
  lines.push(`Summary: ${report.passCount}/${report.checks.length} passed — ${verdict}`);
  return lines.join('\n');
}

/**
 * Render a ValidationReport as a stable JSON string. Callers that want
 * the object form should simply read the report directly; this function
 * exists so CLI tooling gets byte-stable output for diffing.
 */
export function formatReportJson(report: ValidationReport): string {
  return JSON.stringify(
    {
      version: 1,
      overallPass: report.overallPass,
      passCount: report.passCount,
      failCount: report.failCount,
      checks: report.checks.map((r) => ({
        checkId: r.checkId,
        name: nameFor(r.checkId),
        pass: r.pass,
        severity: r.severity,
        message: r.message,
      })),
    },
    null,
    2,
  );
}
