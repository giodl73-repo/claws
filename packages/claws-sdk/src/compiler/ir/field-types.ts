/**
 * Shared field types for the OC workspace intermediate representation.
 *
 * These types are owned by claws-sdk -- no imports from compiler-sdk.
 * They cover trust levels, platforms, diagnostics, and file references
 * needed across workspace IR sub-types.
 *
 * @module claws-sdk/compiler/ir/field-types
 */

/**
 * Trust level T0--T4 for tool and agent trust annotations.
 *
 * - T0: untrusted (sandbox only)
 * - T1: low trust (read-only, local)
 * - T2: moderate trust (local writes, controlled APIs)
 * - T3: high trust (external APIs, production reads)
 * - T4: full trust (production writes, admin)
 */
export type TrustLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Supported agent platforms for OC workspace compilation.
 *
 * Minimum set required by acceptance criteria: oc, claude-code, cursor,
 * copilot, crewai, langgraph, bedrock.
 */
export type Platform =
  | 'oc'
  | 'claude-code'
  | 'cursor'
  | 'copilot'
  | 'crewai'
  | 'langgraph'
  | 'bedrock';

/**
 * Severity levels for parse and workspace diagnostics.
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A reference to a file in the OC workspace with integrity metadata.
 */
export interface FileReference {
  /** Relative path from workspace root. */
  readonly path: string;
  /** SHA-256 content hash (hex-encoded). */
  readonly hash: string;
  /** File size in bytes. */
  readonly size: number;
}

/**
 * A diagnostic emitted during workspace parsing or IR construction.
 *
 * Includes source file location for editor integration.
 */
export interface ParseDiagnostic {
  /** Severity of the diagnostic. */
  readonly severity: DiagnosticSeverity;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Source file path (relative to workspace root). */
  readonly file: string;
  /** 1-based line number (undefined if not locatable). */
  readonly line?: number | undefined;
  /** 1-based column number (undefined if not locatable). */
  readonly column?: number | undefined;
  /** Diagnostic code for programmatic matching. */
  readonly code: string;
}
