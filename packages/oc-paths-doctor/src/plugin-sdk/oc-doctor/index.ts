/**
 * `@openclaw/oc-doctor` — public SDK surface.
 *
 * @module @openclaw/oc-doctor
 */

export type {
  DefaultFixerOptions,
  DoctorContext,
  DoctorFile,
  DoctorFinding,
  DoctorFixResult,
  DoctorHealthContribution,
  OcPathFixerSpec,
} from './types.js';

export { ocPathFixerContribution } from './adapter.js';
