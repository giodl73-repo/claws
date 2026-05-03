/**
 * `@openclaw/plugin-sdk/lkg` — public SDK surface.
 *
 * @module @openclaw/plugin-sdk/lkg
 */

export type {
  LKGActor,
  LKGEntry,
  LKGFingerprint,
  LKGFsStat,
  LKGObservation,
  LKGObserveOptions,
  LKGTracker,
  ValidationIssue,
  ValidationResult,
} from './types.js';
export { LKGError, type LKGErrorCode } from './types.js';

export type { LKGStore } from './api.js';
