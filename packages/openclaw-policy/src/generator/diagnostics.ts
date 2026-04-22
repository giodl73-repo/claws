/**
 * Generator-level diagnostics (CP-6 pulse 53) — structured shapes emitted
 * when `claws policy generate` rejects a tool declaration at compile time.
 *
 * These are distinct from runtime `Diagnostic`s in `types/index.ts`: they
 * carry mandatory source-location fields (line/column) and a typed
 * `invalidReason` enum per CL-07 amendment §1a. Consumers like the
 * `--diagnostics-json` flag serialize this shape directly.
 *
 * @module @bic/openclaw-policy/generator/diagnostics
 */

export type GeneratorInvalidReason = 'r5-fail-open-declared';

export interface R5FailOpenDiagnostic {
  readonly kind: 'r5-fail-open';
  readonly toolName: string;
  readonly sourcePath: string;
  readonly line: number;
  readonly column: number;
  readonly invalidReason: 'r5-fail-open-declared';
  readonly message: string;
}

export type GeneratorDiagnostic = R5FailOpenDiagnostic;

export function formatR5FailOpenStderr(
  binaryName: string,
  diag: R5FailOpenDiagnostic,
): string {
  const loc = `${diag.sourcePath}:${String(diag.line)}:${String(diag.column)}`;
  return (
    `${binaryName} policy generate: ERROR: R5 + failOpen combination rejected\n` +
    `  Tool: ${diag.toolName}\n` +
    `  Location: ${loc}\n` +
    `  Reason: R5 risk tier requires fail-closed semantics; failOpen: true is forbidden by proposal §1.6\n`
  );
}
