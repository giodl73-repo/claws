/**
 * Amend module — governed amendment pipeline for workspace modifications.
 *
 * @module claws-sdk/amend
 */

export {
  runAmendPipeline,
  type AmendPipelineResult,
  type AmendPipelineStep,
  type AmendPipelineOptions,
} from './amend.js';
export {
  validateAmendment,
  type Amendment,
  type AmendmentType,
  type AmendValidationResult,
  type AmendValidationViolation,
} from './validate.js';
export {
  previewAmendment,
  type AmendPreviewResult,
  type PreviewDiff,
} from './preview.js';
export {
  applyAmendment,
  OC_PROTECTED_FILES,
  type AmendApplyResult,
  type RecompileFn,
} from './apply.js';
