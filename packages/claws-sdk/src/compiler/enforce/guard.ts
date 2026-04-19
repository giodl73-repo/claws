/**
 * compileGuard — top-level R5 fail-closed enforcement gate.
 *
 * This is the single enforcement point that emit must call before
 * generating output. Permanent in the free tier — cannot be turned off.
 *
 * @module claws-sdk/compiler/enforce/guard
 */

import type { GovAnalysis } from './types.js';
import type { OCWorkspaceIR } from '../ir/workspace-ir.js';
import { enforceR5 } from './r5.js';
import { CompilationDeniedError } from './errors.js';

/**
 * Top-level guard that enforces R5 fail-closed before emit.
 *
 * Calls enforceR5 with the governance analysis and workspace IR.
 * If any violations are found, throws a typed
 * CompilationDeniedError with the full violations array.
 *
 * This function returns void on success and throws on failure.
 * It is permanent in the free tier — no flag, no env var,
 * no config, no constructor option can turn it off.
 *
 * The free tier does not accept a conflict report; rich conflict
 * detection is a paid-tier extension.
 *
 * @throws {CompilationDeniedError} When R5 violations are detected.
 */
export function compileGuard(
  analysis: GovAnalysis,
  workspace: OCWorkspaceIR,
): void {
  const result = enforceR5(analysis, workspace);

  if (!result.ok) {
    throw new CompilationDeniedError(result.violations, result.rulesChecked);
  }
}
