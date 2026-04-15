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
  /** WHERE in docs — URL or CLI help hint. */
  readonly docsRef: string;
  /** Optional CLI help command hint (e.g. "Run `claws help CLAWS-E080`"). */
  readonly docsHint?: string;
}

/**
 * Format a ClawsError for terminal output.
 */
export function formatError(err: ClawsError): string {
  const lines = [
    `Error ${err.code}: ${err.what}`,
    `  Fix: ${err.howToFix}`,
    `  Docs: ${err.docsRef}`,
  ];
  if (err.docsHint) {
    lines.push(`  Help: ${err.docsHint}`);
  }
  return lines.join('\n');
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

/**
 * Init error: workspace already initialized.
 */
export function alreadyInitializedError(configPath: string): ClawsError {
  return {
    code: 'CLAWS-E080',
    what: `Workspace already initialized: ${configPath} exists.`,
    howToFix: `Remove or rename ${configPath} and run \`claws init\` again to reinitialize.`,
    docsRef: 'https://claws.dev/docs/init',
    docsHint: 'Run `claws help CLAWS-E080` for details',
  };
}

/**
 * Init error: platform detection failed.
 */
export function initDetectFailedError(reason: string): ClawsError {
  return {
    code: 'CLAWS-E083',
    what: `Platform detection failed: ${reason}`,
    howToFix: 'Check file permissions in the workspace and run `claws init` again.',
    docsRef: 'https://claws.dev/docs/init',
    docsHint: 'Run `claws help CLAWS-E083` for details',
  };
}

/**
 * Init error: could not write claws.json or scaffold sidecar.
 */
export function initWriteFailedError(reason: string): ClawsError {
  return {
    code: 'CLAWS-E081',
    what: `Init failed: ${reason}`,
    howToFix: 'Check write permissions in the workspace directory and try again.',
    docsRef: 'https://claws.dev/docs/init',
    docsHint: 'Run `claws help CLAWS-E081` for details',
  };
}

/**
 * Init error: template not found.
 */
export function templateNotFoundError(
  name: string,
  available: readonly string[],
): ClawsError {
  return {
    code: 'CLAWS-E082',
    what: `Template "${name}" not found.`,
    howToFix: `Available templates: ${available.join(', ')}. Use --template <name>.`,
    docsRef: 'https://claws.dev/docs/templates',
    docsHint: 'Run `claws help CLAWS-E082` for details',
  };
}

/**
 * LLM error: API key not set for the configured provider.
 */
export function llmApiKeyMissingError(provider = 'Anthropic', envVar = 'ANTHROPIC_API_KEY'): ClawsError {
  return {
    code: 'CLAWS-E040',
    what: `--llm requires ${provider} API key (${envVar}), but it is not set.`,
    howToFix: `Set ${envVar} in your environment before running claws with --llm.`,
    docsRef: 'https://claws.dev/docs/llm-extraction',
  };
}

/**
 * LLM error: provider SDK not installed.
 */
export function llmSdkMissingError(sdkPackage = '@anthropic-ai/sdk'): ClawsError {
  return {
    code: 'CLAWS-E041',
    what: `--llm requires ${sdkPackage}, but the package is not installed.`,
    howToFix: `Install the LLM SDK: npm install ${sdkPackage}`,
    docsRef: 'https://claws.dev/docs/llm-extraction',
  };
}
