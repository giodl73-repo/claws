/**
 * CompilationDeniedError — typed error carrying the full violations array.
 *
 * Thrown by compileGuard when R5 fail-closed enforcement detects violations.
 * The error message includes a rule-by-rule explanation of why compilation
 * was denied.
 *
 * @module claws-sdk/compiler/enforce/errors
 */

import type { FailClosedViolation } from './types.js';

/**
 * Format a single violation into a human-readable line.
 */
function formatViolation(v: FailClosedViolation, index: number): string {
  return `  ${index + 1}. [${v.severity.toUpperCase()}] ${v.rule}\n     ${v.explanation}\n     Context: ${v.context}`;
}

/**
 * CompilationDeniedError — thrown when R5 fail-closed enforcement
 * prevents compilation from proceeding.
 *
 * Carries the full violations array for programmatic inspection and
 * a formatted message with rule-by-rule explanation.
 */
export class CompilationDeniedError extends Error {
  /** All violations that triggered the denial. */
  readonly violations: readonly FailClosedViolation[];

  /** Number of rules that were checked before denial. */
  readonly rulesChecked: number;

  constructor(violations: readonly FailClosedViolation[], rulesChecked: number) {
    const header = `Compilation denied: ${violations.length} R5 fail-closed violation${violations.length === 1 ? '' : 's'} detected`;
    const details = violations.map(formatViolation).join('\n');
    const footer = `\n${rulesChecked} rule${rulesChecked === 1 ? '' : 's'} checked. All ambiguous or conflicting rules must be resolved before compilation can proceed.`;

    super(`${header}\n\n${details}\n${footer}`);

    this.name = 'CompilationDeniedError';
    this.violations = violations;
    this.rulesChecked = rulesChecked;
  }
}
