/**
 * Error contract for all claws commands.
 *
 * Every error follows the same format:
 * - WHAT happened
 * - HOW to fix
 * - WHERE in docs
 *
 * @module claws-cli/output/errors
 */

/**
 * Structured error for user-facing output.
 */
export interface ClawsError {
  /** Error code (e.g. "CLAWS-E001", "CLAWS-E002"). */
  readonly code: string;
  /** WHAT happened — concise description. */
  readonly what: string;
  /** HOW to fix — actionable guidance. */
  readonly howToFix: string;
  /** WHERE in docs — pointer to relevant documentation. */
  readonly docsRef: string;
}

/**
 * Format a ClawsError for terminal output.
 */
export function formatError(err: ClawsError): string {
  return [
    `Error ${err.code}: ${err.what}`,
    `  Fix: ${err.howToFix}`,
    `  Docs: ${err.docsRef}`,
  ].join('\n');
}

/**
 * Format a ClawsError as JSON.
 */
export function formatErrorJson(err: ClawsError): string {
  return JSON.stringify({ error: err }, null, 2);
}

/**
 * Common error: no workspace detected.
 */
export function noWorkspaceError(): ClawsError {
  return {
    code: 'CLAWS-E010',
    what: 'No claws.json found in this directory or any parent.',
    howToFix: 'Run `claws init` to create a governance configuration.',
    docsRef: 'https://claws.dev/docs/getting-started',
  };
}

/**
 * Common error: compile pipeline failure.
 */
export function compileFailedError(reason: string): ClawsError {
  return {
    code: 'CLAWS-E020',
    what: `Compilation failed: ${reason}`,
    howToFix: 'Check your workspace files (SOUL.md, TOOLS.md, etc.) for syntax errors.',
    docsRef: 'https://claws.dev/docs/compile',
  };
}

/**
 * Common error: all source files missing.
 */
export function noSourceFilesError(): ClawsError {
  return {
    code: 'CLAWS-E021',
    what: 'No governance source files found (SOUL.md, TOOLS.md, etc.).',
    howToFix: 'Create at least one governance file. Run `claws init --template soc2` for a starter.',
    docsRef: 'https://claws.dev/docs/workspace-files',
  };
}
