/**
 * Amendment pipeline orchestrator — validate → preview → apply → re-compile.
 *
 * Ensures every workspace modification is checked against GovernanceIR
 * constraints before being applied. The pipeline aborts at the validate
 * step if the amendment would violate constraints (no files modified).
 *
 * **Lossless OC fidelity**: apply writes ONLY to `.claws/` files and
 * `claws.json`, NEVER modifies OC workspace files.
 *
 * @module claws-sdk/amend/amend
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { Amendment, AmendValidationResult } from './validate.js';
import type { AmendPreviewResult } from './preview.js';
import type { AmendApplyResult, RecompileFn } from './apply.js';
import { validateAmendment } from './validate.js';
import { previewAmendment } from './preview.js';
import { applyAmendment } from './apply.js';

/**
 * Pipeline step that was reached before the pipeline completed or aborted.
 */
export type AmendPipelineStep = 'validate' | 'preview' | 'apply' | 'recompile' | 'done';

/**
 * Result of running the full amendment pipeline.
 */
export interface AmendPipelineResult {
  /** Final step the pipeline reached. */
  readonly step: AmendPipelineStep;
  /** Whether the pipeline completed successfully. */
  readonly success: boolean;
  /** Validation result (always present — first step). */
  readonly validation: AmendValidationResult;
  /** Preview result (present if validation passed). */
  readonly preview?: AmendPreviewResult;
  /** Apply result (present if preview succeeded). */
  readonly apply?: AmendApplyResult;
  /** Duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Options for the amendment pipeline.
 */
export interface AmendPipelineOptions {
  /** Preview only — do not apply the amendment. Default: false. */
  readonly dryRun?: boolean;
}

/**
 * Run the amendment pipeline: validate → preview → apply → re-compile.
 *
 * The pipeline aborts at the validate step if the amendment violates
 * GovernanceIR constraints. No files are modified until the apply step.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param amendment - The proposed amendment
 * @param ir - Current GovernanceIR state
 * @param trustTier - Workspace trust tier (1–5)
 * @param recompile - Callback to re-run the compile pipeline
 * @param options - Pipeline options (dry-run, etc.)
 * @returns Pipeline result with validation, preview, and apply details
 */
export async function runAmendPipeline(
  workspaceRoot: string,
  amendment: Amendment,
  ir: GovernanceIR,
  trustTier: number,
  recompile: RecompileFn,
  options: AmendPipelineOptions = {},
): Promise<AmendPipelineResult> {
  const start = Date.now();

  // ── Step 1: Validate ──────────────────────────────────────────────────
  const validation = validateAmendment(amendment, ir, trustTier);

  if (!validation.valid) {
    return {
      step: 'validate',
      success: false,
      validation,
      durationMs: Date.now() - start,
    };
  }

  // ── Step 2: Preview ───────────────────────────────────────────────────
  const preview = previewAmendment(amendment, ir);

  if (options.dryRun) {
    return {
      step: 'preview',
      success: true,
      validation,
      preview,
      durationMs: Date.now() - start,
    };
  }

  // ── Step 3: Apply + Re-compile ────────────────────────────────────────
  const applyResult = await applyAmendment(workspaceRoot, amendment, recompile);

  if (!applyResult.success) {
    return {
      step: 'apply',
      success: false,
      validation,
      preview,
      apply: applyResult,
      durationMs: Date.now() - start,
    };
  }

  return {
    step: 'done',
    success: true,
    validation,
    preview,
    apply: applyResult,
    durationMs: Date.now() - start,
  };
}
