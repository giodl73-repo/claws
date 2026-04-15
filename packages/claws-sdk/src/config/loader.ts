/**
 * Config loader — load and validate claws.json from workspace root.
 *
 * Reads the config file, validates against the Zod schema, and supplies
 * defaults for missing fields. Invalid configs produce a DiagnosticError-
 * compatible error with structured details.
 *
 * @module claws-sdk/config/loader
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ClawsConfigSchema, type ClawsConfig } from './types.js';
import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';

/**
 * Structured error detail for config validation failures.
 * Contains WHAT/HOW/WHERE fields for DiagnosticError rendering.
 */
export interface ConfigValidationError {
  readonly code: string;
  readonly what: string;
  readonly how: string;
  readonly where: { readonly file: string; readonly line: number; readonly column: number };
  readonly docsUrl: string | null;
}

/**
 * Result of loading claws.json — either success with validated config,
 * or missing (no claws.json found) with defaults applied.
 */
export interface ConfigLoadResult {
  /** Whether claws.json was found on disk. */
  readonly found: boolean;
  /** Validated config (defaults applied if file was missing). */
  readonly config: ClawsConfig;
  /** Absolute path to the config file (even if not found). */
  readonly configPath: string;
}

/**
 * Load and validate claws.json from a workspace root.
 *
 * When the file exists, it is parsed as JSON and validated against
 * ClawsConfigSchema. Missing optional fields receive defaults.
 *
 * When the file does not exist, a full-defaults config is returned
 * with `found: false`.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param configPathOverride - Optional explicit path to claws.json
 * @returns ConfigLoadResult with validated config
 * @throws Error with ConfigValidationError-shaped message for invalid JSON or schema violations
 */
export async function loadConfig(
  workspaceRoot: string,
  configPathOverride?: string,
): Promise<ConfigLoadResult> {
  const configPath = configPathOverride ?? join(workspaceRoot, CLAWS_CONFIG_FILE);

  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    // File not found — return defaults
    return {
      found: false,
      config: ClawsConfigSchema.parse({}),
      configPath,
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const detail: ConfigValidationError = {
      code: 'CLAWS-E001',
      what: `Invalid JSON in ${CLAWS_CONFIG_FILE}: ${err instanceof Error ? err.message : String(err)}`,
      how: `Fix the JSON syntax in ${configPath}. Use a JSON linter to find the error.`,
      where: { file: configPath, line: 1, column: 1 },
      docsUrl: null,
    };
    throw new Error(JSON.stringify(detail));
  }

  // Validate against schema
  const result = ClawsConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    const detail: ConfigValidationError = {
      code: 'CLAWS-E001',
      what: `Invalid ${CLAWS_CONFIG_FILE}: schema validation failed\n${issues}`,
      how: `Fix the fields listed above in ${configPath}. Run \`claws help CLAWS-E001\` for the expected schema.`,
      where: { file: configPath, line: 1, column: 1 },
      docsUrl: null,
    };
    throw new Error(JSON.stringify(detail));
  }

  return {
    found: true,
    config: result.data,
    configPath,
  };
}
