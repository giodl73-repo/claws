/**
 * Platform adapter interface — defines the contract for per-platform emitters.
 *
 * Each platform adapter translates GovernanceIR into the artifact format
 * native to that platform. OC gets full fidelity (4 artifact types);
 * advisory platforms get SKILL.md only.
 *
 * @module claws-sdk/emit/platforms/platform-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import type { Platform } from '../../types/platform.js';

/**
 * A single emitted artifact — a named file with string content.
 */
export interface EmittedArtifact {
  /** Relative path for the artifact (e.g. "index.ts", "SKILL.md"). */
  readonly path: string;
  /** The artifact content. */
  readonly content: string;
}

/**
 * Result of platform-specific emission.
 */
export interface PlatformEmitResult {
  /** The platform this result is for. */
  readonly platform: Platform;
  /** Emitted artifacts for this platform. */
  readonly artifacts: readonly EmittedArtifact[];
  /** Warnings produced during emission. */
  readonly warnings: readonly string[];
}

/**
 * Platform adapter contract — each platform implements this interface.
 */
export interface PlatformAdapter {
  /** Which platform this adapter targets. */
  readonly platform: Platform;

  /**
   * Emit governance artifacts for this platform from a GovernanceIR.
   *
   * @param ir - The compiled GovernanceIR
   * @returns Platform-specific emission result
   */
  emit(ir: GovernanceIR): PlatformEmitResult;
}
