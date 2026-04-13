/**
 * Platform detection types — structures returned by `detect()` when scanning
 * a workspace root for platform marker files.
 *
 * @module claws-sdk/detect/types
 */

import type { Platform, EnforcementModel } from '../types/platform.js';
export type { EnforcementCapabilityVector, LossMatrixEntry } from '../types/loss-matrix.js';

/**
 * Union of the 7 supported platform identifiers.
 * Re-exported from the canonical Platform type for convenience.
 */
export type PlatformId = Platform;

/**
 * Default trust tier for a detected platform.
 *
 * - `from-config`: trust tier is read from claws.json (OpenClaw).
 * - number: a fixed default tier (T1–T5, i.e. 1–5).
 */
export type TrustTierDefault = number | 'from-config';

/**
 * Result of detecting a single platform's marker file(s).
 */
export interface MarkerResult {
  /** Which platform was detected. */
  readonly platform: PlatformId;

  /** Confidence score 0–1. 1.0 = definitive file match. */
  readonly confidence: number;

  /** How strictly this platform can enforce governance rules. */
  readonly enforcement: EnforcementModel;

  /** Default trust tier for this platform. */
  readonly defaultTrustTier: TrustTierDefault;

  /** Absolute path(s) to the marker file(s) that triggered detection. */
  readonly markerFiles: readonly string[];

  /** Optional platform-specific variant (e.g. "JS" or "Python" for LangGraph). */
  readonly variant?: string;
}

/**
 * Per-platform detection info, including the marker result and
 * any platform-specific metadata.
 */
export interface PlatformInfo {
  /** The marker detection result. */
  readonly marker: MarkerResult;

  /** Optional notes about the detection (e.g. "JS variant" for LangGraph). */
  readonly notes?: string;
}

/**
 * Aggregated result of scanning a workspace root for all 7 platforms.
 */
export interface PlatformInventory {
  /** Detected platforms keyed by PlatformId. */
  readonly platforms: ReadonlyMap<PlatformId, PlatformInfo>;

  /** True if at least one platform was detected. */
  readonly detected: boolean;

  /**
   * Guidance message for the user. Present when no platforms are detected,
   * or when zero-config mode synthesizes defaults.
   */
  readonly guidance?: string;

  /**
   * True if no claws.json was found and defaults were synthesized
   * from detected platform markers.
   */
  readonly zeroConfig: boolean;
}

/**
 * How the primary platform was selected during resolution.
 */
export type ResolutionMethod = 'auto-enforcement' | 'config-override' | 'single-platform';

/**
 * Resolved platform target — the result of `resolve()`.
 *
 * Selects a primary platform from a PlatformInventory, tracks secondary
 * platforms, and records resolution metadata. Immutable after creation —
 * downstream phases read it, never modify it.
 */
export interface PlatformTarget {
  /** The selected primary platform for compilation. */
  readonly primary: PlatformInfo;

  /** Secondary platforms detected but not selected as primary. */
  readonly secondaries: readonly PlatformInfo[];

  /** How the primary was selected. */
  readonly method: ResolutionMethod;

  /** Total number of platforms in the original inventory. */
  readonly platformCount: number;
}

/**
 * Marker specification for extensible platform detection.
 *
 * Each MarkerSpec describes one or more file paths to check for a platform,
 * whether nested paths are included, and an optional content validator.
 */
export interface MarkerSpec {
  /** Which platform this marker belongs to. */
  readonly platform: PlatformId;

  /** Relative paths (from workspace root) to check for this marker. */
  readonly paths: readonly string[];

  /** Whether to check nested subdirectory paths (not just root). */
  readonly nested: boolean;

  /** Optional content validator — called with file content to confirm detection. */
  readonly validator?: (content: string) => boolean;
}
