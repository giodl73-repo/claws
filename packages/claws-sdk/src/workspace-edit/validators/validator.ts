/**
 * Validator contract — the common shape used by every validator plugged
 * into the write-time ValidationPipeline.
 *
 * @module claws-sdk/workspace-edit/validators/validator
 */

import type { PatchError } from '../errors.js';
import type { EditOperation } from '../types.js';

/**
 * Validators may warn without blocking. Warnings do not short-circuit
 * the pipeline — the write proceeds, but the downstream audit entry
 * carries the warning context.
 */
export interface ValidationWarning {
  readonly code: string;
  readonly ocPath: string;
  readonly message: string;
}

/**
 * A validator returns `{ ok: true }` to continue the pipeline or
 * `{ ok: false, error }` to short-circuit with a typed PatchError.
 * Optionally includes a `warnings` array to attach non-blocking notes.
 */
export type ValidatorResult =
  | { readonly ok: true; readonly warnings?: readonly ValidationWarning[] }
  | { readonly ok: false; readonly error: PatchError; readonly warnings?: readonly ValidationWarning[] };

/**
 * A validator is a named function that produces a ValidatorResult for an
 * EditOperation. Validators may be sync or async (pipeline awaits both).
 */
export interface Validator {
  readonly name: string;
  validate(op: EditOperation): ValidatorResult | Promise<ValidatorResult>;
}
