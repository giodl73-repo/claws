/**
 * R5 fail-closed enforcement module for the claws free tier.
 *
 * @module claws-sdk/compiler/enforce
 */

export type {
  FailClosedResult,
  FailClosedPass,
  FailClosedFail,
  FailClosedViolation,
  ViolationSeverity,
  EnforcementConfig,
  GovAnalysis,
  ConflictReport,
  OboConflict,
  MultiConstraintConflict,
  GovViolation,
} from './types.js';

export { enforceR5 } from './r5.js';
export { compileGuard } from './guard.js';
export { CompilationDeniedError } from './errors.js';
