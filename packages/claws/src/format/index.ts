/**
 * Formatter registry for claws output.
 *
 * Maps format names to formatter implementations. Selected via
 * the `--format` CLI flag; defaults to 'default' (terminal).
 *
 * Supported formats:
 *   - sarif    — SARIF 2.1.0 for CI/CD integration
 *   - json     — JSON with what/fix/docsUrl for programmatic use
 *   - csv      — CSV for fleet-scale reporting
 *   - default  — Human-readable terminal with colored severity
 *
 * @module claws-cli/format
 */

import type { CheckResult } from '../output/format-default.js';
import { renderCheckSarif } from './sarif.js';
import { renderFormattedJson } from './json.js';
import { renderCheckCsv } from './csv.js';
import { renderTerminalOutput } from './default.js';

/**
 * A formatter renders a CheckResult into a string for a specific output format.
 */
export interface Formatter {
  /**
   * Render the check result.
   *
   * @param result - The check result to format
   * @param workspaceRoot - Absolute path to workspace root (used by SARIF for URI normalization)
   */
  (result: CheckResult, workspaceRoot: string): string;
}

/**
 * Known format names.
 */
export type FormatName = 'sarif' | 'json' | 'csv' | 'default';

const formatters: Record<FormatName, Formatter> = {
  sarif: (result, workspaceRoot) => renderCheckSarif(result, workspaceRoot),
  json: (result) => renderFormattedJson(result),
  csv: (result) => renderCheckCsv(result),
  default: (result) => renderTerminalOutput(result),
};

/**
 * Structured diagnostic for an unsupported output format.
 */
class UnknownFormatError extends Error {
  readonly code = 'CLAWS_UNKNOWN_FORMAT';
  readonly what: string;
  readonly how: string;
  readonly where: string;

  constructor(name: string, knownFormats: readonly FormatName[]) {
    const known = knownFormats.join(', ');
    const what = `Unknown format: "${name}".`;
    const how = `Use one of: ${known}.`;
    const where = 'CLI option "--format"';

    super(`${what} ${how}`);
    this.name = 'UnknownFormatError';
    this.what = what;
    this.how = how;
    this.where = where;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Get a formatter by name.
 *
 * @param name - The format name ('sarif', 'json', 'csv', or 'default')
 * @returns The formatter function
 * @throws UnknownFormatError if the format name is unknown
 */
export function getFormatter(name: string): Formatter {
  const formatter = formatters[name as FormatName];
  if (!formatter) {
    throw new UnknownFormatError(name, FORMAT_NAMES);
  }
  return formatter;
}

/**
 * List of all supported format names.
 */
export const FORMAT_NAMES: readonly FormatName[] = ['sarif', 'json', 'csv', 'default'] as const;
