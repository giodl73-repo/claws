/**
 * Emit types for the claws compiler pipeline.
 *
 * The free tier supports exactly 2 emit targets: oc and claude-code.
 * Additional targets (cursor, copilot, crewai, langgraph, bedrock) are
 * paid-tier extensions.
 *
 * @module claws-sdk/compiler/emit/types
 */

import type { EmitTarget } from '../targets/constants.js';

/**
 * Emit target enum -- the platforms supported by the free tier.
 *
 * Re-exported from `compiler/targets/constants.ts`, the single source of
 * truth shared with `compiler/validate/`. Do NOT hardcode this union
 * here -- keeping it derived prevents validate/emit drift (CM-3).
 */
export type { EmitTarget };

/**
 * Diagnostic severity for emit diagnostics.
 */
export type EmitDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A single diagnostic produced during emit.
 */
export interface EmitDiagnostic {
  /** Diagnostic code (e.g. "EMIT-001"). */
  readonly code: string;
  /** Human-readable message. */
  readonly message: string;
  /** Severity level. */
  readonly severity: EmitDiagnosticSeverity;
  /** Optional target file path this diagnostic refers to. */
  readonly target?: string;
}

/**
 * A single emitted file.
 */
export interface EmittedFile {
  /** Relative path under the output directory. */
  readonly path: string;
  /** File contents. */
  readonly content: string;
  /** Whether to overwrite an existing file at this path. */
  readonly overwrite: boolean;
}

/**
 * Result of an emit operation.
 */
export interface EmitResult {
  /** The emit target that produced this result. */
  readonly target: EmitTarget;
  /** Generated files (empty array on dryRun=false after write, same paths populated). */
  readonly files: readonly EmittedFile[];
  /** Diagnostics produced during emit. */
  readonly diagnostics: readonly EmitDiagnostic[];
}

/**
 * Options controlling emitter behavior.
 */
export interface EmitterOptions {
  /** Output directory for written files. */
  readonly outputDir: string;
  /** When true, no files are written to disk -- EmitResult still contains files. */
  readonly dryRun?: boolean;
  /** When true, diagnostics include info-level messages. */
  readonly verbose?: boolean;
}
