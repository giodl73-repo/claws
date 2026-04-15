/**
 * CLI config loader — thin wrapper around SDK config loader.
 *
 * Reads the `--config` flag override, delegates to the SDK loader,
 * and handles DiagnosticError rendering for invalid configs.
 *
 * @module claws-cli/config/loader
 */

import { loadConfig, type ConfigLoadResult, type ConfigValidationError } from '@bic/claws-sdk/config';
import { DiagnosticError } from '../errors/contract.js';

/**
 * Load claws.json config via the SDK loader.
 *
 * Translates SDK config validation errors into DiagnosticErrors
 * for consistent terminal output.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param configFlagOverride - Value of --config CLI flag (optional)
 * @returns ConfigLoadResult from SDK
 * @throws DiagnosticError when config is invalid
 */
export async function loadCliConfig(
  workspaceRoot: string,
  configFlagOverride?: string,
): Promise<ConfigLoadResult> {
  try {
    return await loadConfig(workspaceRoot, configFlagOverride);
  } catch (err) {
    // Attempt to parse structured error detail from SDK
    if (err instanceof Error) {
      try {
        const detail = JSON.parse(err.message) as ConfigValidationError;
        throw new DiagnosticError({
          code: detail.code,
          what: detail.what,
          how: detail.how,
          where: detail.where,
          docsUrl: detail.docsUrl ?? undefined,
        });
      } catch (parseErr) {
        if (parseErr instanceof DiagnosticError) throw parseErr;
      }
    }
    throw err;
  }
}
