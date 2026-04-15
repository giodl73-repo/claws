/**
 * Remediation message injection for claws annotate errors.
 *
 * Provides actionable remediation hints ("Or run: claws annotate")
 * and versioned documentation URLs for governance errors.
 *
 * @module claws-sdk/annotate/remediation
 */

import { suggestClosestRiskLabel } from './yaml-edge.js';
import type { LevenshteinSuggestion } from './yaml-edge.js';
import { CLAWS_SDK_VERSION } from '../version.js';

/**
 * Base URL for claws documentation.
 */
const DOC_BASE_URL = 'https://microsoft.ghe.com/bic/claws/blob';

// ── Remediation Hints ────────────────────────────────────────────────

/**
 * A remediation message with optional documentation link.
 */
export interface RemediationHint {
  /** The actionable hint text. */
  readonly message: string;
  /** Optional documentation URL with version. */
  readonly docUrl: string | undefined;
  /** Near-miss suggestion if the error was a typo. */
  readonly suggestion: LevenshteinSuggestion | undefined;
}

/**
 * Build a versioned documentation URL.
 *
 * @param docPath - Path relative to repo root (e.g., "docs/claws/annotate.md")
 * @returns Full URL with version tag
 */
export function buildDocUrl(docPath: string): string {
  return `${DOC_BASE_URL}/v${CLAWS_SDK_VERSION}/${docPath}`;
}

/**
 * Get the current claws version for remediation messages.
 */
export function getClawsVersion(): string {
  return CLAWS_SDK_VERSION;
}

/**
 * Create a remediation hint for an unrecognized risk label.
 *
 * Includes:
 * 1. "Or run: claws annotate" hint
 * 2. Versioned doc URL
 * 3. Near-miss suggestion if available
 *
 * @param invalidLabel - The unrecognized risk label
 * @returns Remediation hint with message and optional suggestion
 */
export function remediateInvalidRiskLabel(invalidLabel: string): RemediationHint {
  const suggestion = suggestClosestRiskLabel(invalidLabel);

  let message = `Unrecognized risk label "${invalidLabel}".`;

  if (suggestion) {
    message += ` Did you mean "${suggestion.suggestion}"?`;
  }

  message += ' Or run: claws annotate';

  return {
    message,
    docUrl: buildDocUrl('docs/claws/concepts/risk-classification.md'),
    suggestion,
  };
}

/**
 * Create a remediation hint for a missing governance field.
 *
 * @param fieldName - The missing field name
 * @returns Remediation hint
 */
export function remediateMissingGovernance(fieldName: string): RemediationHint {
  return {
    message: `Missing governance field "${fieldName}". Or run: claws annotate`,
    docUrl: buildDocUrl('docs/claws/concepts/governance-metadata.md'),
    suggestion: undefined,
  };
}

/**
 * Format a remediation hint as a single error output line.
 *
 * @param hint - Remediation hint to format
 * @returns Formatted string suitable for inclusion in error output
 */
export function formatRemediation(hint: RemediationHint): string {
  let output = `  hint: ${hint.message}`;
  if (hint.docUrl) {
    output += `\n  docs: ${hint.docUrl}`;
  }
  return output;
}

/**
 * Inject remediation hints into an error message string.
 *
 * Appends "Or run: claws annotate" and a doc URL to error messages
 * that reference governance metadata issues.
 *
 * @param errorMessage - Original error message
 * @param docPath - Optional doc path for versioned URL
 * @returns Error message with remediation hint appended
 */
export function injectRemediation(errorMessage: string, docPath?: string): string {
  const hint = '\n  Or run: claws annotate';
  const url = docPath
    ? `\n  docs: ${buildDocUrl(docPath)}`
    : '';
  return `${errorMessage}${hint}${url}`;
}
