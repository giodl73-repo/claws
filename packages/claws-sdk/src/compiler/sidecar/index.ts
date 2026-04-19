/**
 * .claws Sidecar Resolver — barrel exports.
 *
 * @module claws-sdk/compiler/sidecar
 */

// ── Resolver ────────────────────────────────────────────────────────
export { resolveSidecar, validateFreeTierOverrides, SidecarValidationError } from './resolver.js';

// ── Detection heuristics ────────────────────────────────────────────
export { detectWorkspacePlatforms } from './detect.js';

// ── Types ───────────────────────────────────────────────────────────
export type {
  SidecarPlatformTarget,
  SidecarOverrides,
  ClawsSidecar,
  SidecarFormat,
  SidecarResolveFound,
  SidecarResolveNotFound,
  SidecarResolveResult,
  DetectionHeuristic,
} from './types.js';
