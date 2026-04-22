/**
 * @bic/openclaw-guardrails/handle-binding
 *
 * Pure approvalHandle validator per CL-07 §1a + CL-11 §3a. The library form
 * of the harness `validateHandle` (test/e2e/harness/handle-binding-validator.ts)
 * — production code consumes this module, harness code retains its own copy
 * for isolation.
 */

export type { InvalidReason } from './types.js';
export {
  validateHandle,
  EVALUATION_ORDER,
} from './validator.js';
export type {
  ApprovalHandle,
  ValidationContext,
  ValidationDeps,
  ValidationResult,
} from './validator.js';
