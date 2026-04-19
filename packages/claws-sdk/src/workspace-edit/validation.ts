/**
 * ValidationPipeline — the single write-time gate every write path
 * (chunk PATCH, Loop sync, trust escalation, onboard) routes through.
 *
 * Validators run in the order they were added (R5 → fleet → governance →
 * deny-removal by convention). The first `{ ok: false }` short-circuits
 * the pipeline. Warnings from earlier validators accumulate onto the
 * final result so the caller can surface them alongside success.
 *
 * The pipeline is stateless per `validate()` call — concurrent calls do
 * not share state; each edit goes through an independent run. Thread-
 * safety is the caller's responsibility.
 *
 * @module claws-sdk/workspace-edit/validation
 */

import type { PatchError } from './errors.js';
import { buildPatchError } from './error-messages.js';
import type { FileNotEditableError, ValidationFailedError } from './errors.js';
import { CHUNK_EDITABLE_FILES } from './types.js';
import type { EditOperation } from './types.js';
import type { Validator, ValidationWarning } from './validators/validator.js';

/** Result of running the ValidationPipeline end-to-end. */
export type ValidationPipelineResult =
  | { readonly ok: true; readonly warnings: readonly ValidationWarning[] }
  | {
      readonly ok: false;
      readonly error: PatchError;
      readonly warnings: readonly ValidationWarning[];
      /** Name of the validator that produced the failure (for audit). */
      readonly failedValidator: string;
    };

/**
 * Orchestrates validators. Call `addValidator` to append validators in
 * order; `validate()` runs them sequentially and short-circuits on the
 * first failure. The shape validation (structural checks the
 * StructuredEditor already runs) is done up-front so external callers
 * get a consistent PatchError surface even if they skipped the editor's
 * validate() step.
 */
export class ValidationPipeline {
  private readonly validators: Validator[] = [];

  addValidator(validator: Validator): void {
    this.validators.push(validator);
  }

  /**
   * Number of validators currently registered. Intended for tests and
   * diagnostics — callers should not branch on this.
   */
  get size(): number {
    return this.validators.length;
  }

  async validate(op: EditOperation): Promise<ValidationPipelineResult> {
    const warnings: ValidationWarning[] = [];

    const structural = preflight(op);
    if (!structural.ok) {
      return { ok: false, error: structural.error, warnings, failedValidator: 'preflight' };
    }

    for (const validator of this.validators) {
      const result = await validator.validate(op);
      if (result.warnings !== undefined) warnings.push(...result.warnings);
      if (!result.ok) {
        return {
          ok: false,
          error: result.error,
          warnings,
          failedValidator: validator.name,
        };
      }
    }

    return { ok: true, warnings };
  }
}

/**
 * Preflight — structural shape + allowlist checks. These checks run
 * before any validator so every downstream validator can assume the
 * operation is well-formed against CHUNK_EDITABLE_FILES.
 */
function preflight(
  op: EditOperation,
): { readonly ok: true } | { readonly ok: false; readonly error: PatchError } {
  if (!CHUNK_EDITABLE_FILES.includes(op.file)) {
    const ocPath = `oc://${op.file}/${op.section}`;
    const error = buildPatchError<FileNotEditableError>({
      code: 'FILE_NOT_EDITABLE',
      ocPath,
      file: op.file,
    });
    return { ok: false, error };
  }
  if (op.section.trim().length === 0) {
    const error = buildPatchError<ValidationFailedError>({
      code: 'VALIDATION_FAILED',
      ocPath: `oc://${op.file}`,
      subCode: 'EDIT_SECTION_REQUIRED',
    });
    return { ok: false, error };
  }
  if ((op.kind === 'toggle' || op.kind === 'set') && op.field.trim().length === 0) {
    const error = buildPatchError<ValidationFailedError>({
      code: 'VALIDATION_FAILED',
      ocPath: `oc://${op.file}/${op.section}`,
      subCode: 'EDIT_FIELD_REQUIRED',
    });
    return { ok: false, error };
  }
  if ((op.kind === 'append' || op.kind === 'remove') && op.item.trim().length === 0) {
    const error = buildPatchError<ValidationFailedError>({
      code: 'VALIDATION_FAILED',
      ocPath: `oc://${op.file}/${op.section}`,
      subCode: 'EDIT_ITEM_REQUIRED',
    });
    return { ok: false, error };
  }
  return { ok: true };
}
