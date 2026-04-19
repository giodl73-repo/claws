/**
 * The 12-check validator entry point.
 *
 * `validate(workspace, analysis, emitResult?)` runs all 12 checks
 * independently — a failure in check N never short-circuits check N+1 —
 * and aggregates the results into a ValidationReport. The report's
 * `overallPass` field is true iff every check passed.
 *
 * Pure function: no side effects, no I/O. Suitable for CLI, server,
 * and unit-test contexts.
 *
 * @module claws-sdk/compiler/validate/validator
 */

import type { OCWorkspaceIR } from '../ir/workspace-ir.js';
import type { GovAnalysis } from '../enforce/types.js';
import { ALL_CHECKS } from './checks.js';
import type { CheckResult, EmitResultShape, ValidationReport } from './types.js';

/**
 * Run every validation check against the supplied inputs and return
 * a full ValidationReport.
 *
 * Inputs:
 * - workspace: the OCWorkspaceIR produced by the reader pipeline.
 * - analysis:  the governance analysis produced by the analyze stage.
 * - emitResult: optional — present when a platform emitter has run.
 *   When absent, emit-dependent checks (5, 9, 10, 12) degrade to
 *   non-fatal warnings so the validator remains useful pre-emit.
 */
export function validate(
  workspace: OCWorkspaceIR,
  analysis: GovAnalysis,
  emitResult?: EmitResultShape,
): ValidationReport {
  const checks: CheckResult[] = [];

  for (const check of ALL_CHECKS) {
    checks.push(check.run(workspace, analysis, emitResult));
  }

  let passCount = 0;
  let failCount = 0;
  for (const r of checks) {
    if (r.pass) passCount += 1;
    else failCount += 1;
  }

  return {
    checks,
    passCount,
    failCount,
    overallPass: failCount === 0,
  };
}
