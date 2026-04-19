/**
 * Structured diagnostics for fleet compile per-workspace failures.
 *
 * `CompileDiagnostic` is a discriminated union keyed on `kind`. The set of
 * kinds is closed per CL-01 v1.2 — adding a new kind is additive-only (new
 * consumers must handle it, existing consumers keep compiling). `stage`
 * identifies which pipeline boundary surfaced the failure so consumers can
 * route by remediation class (parse errors vs emit errors vs governance
 * denials).
 *
 * The free-form error text lives in `message`; the object wrapping is a
 * typed union so downstream systems (CI dashboards, Horus hot-reload) can
 * branch on `kind` without regex-parsing prose (fleet/S01 AC-02).
 *
 * @module claws-sdk/compiler/fleet/diagnostic
 */

/**
 * Canonical failure kinds per CL-01 v1.2 §`claws fleet compile`.
 *
 * - `MissingSoulFile` — SOUL.md missing or unreadable
 * - `MalformedLobsterYaml` — lobster.yaml present but YAML parse failed
 * - `MissingFrontmatterField` — required frontmatter field absent
 * - `PermissionDenied` — a workspace file or its directory is not readable
 * - `CompileFailed` — generic fallback for unclassified compile errors
 * - `EmitFailed` — emit stage threw or produced diagnostics
 * - `ValidationFailed` — 12-check validator rejected the emit output
 */
export type CompileDiagnosticKind =
  | 'MissingSoulFile'
  | 'MalformedLobsterYaml'
  | 'MissingFrontmatterField'
  | 'PermissionDenied'
  | 'CompileFailed'
  | 'EmitFailed'
  | 'ValidationFailed';

/**
 * Pipeline boundary at which a diagnostic surfaced (fleet/S01 AC-04).
 *
 * - `parse`    — reader stage (SOUL/TOOLS/AGENTS/lobster.yaml etc.)
 * - `enforce`  — governance R5 evaluation
 * - `emit`     — per-target emit
 * - `validate` — 12-check validator
 */
export type CompileDiagnosticStage = 'parse' | 'enforce' | 'emit' | 'validate';

/**
 * A structured per-workspace failure record.
 *
 * Free-form text goes in `message`; the wrapping object is a typed union
 * so downstream consumers can branch on `kind` + `stage`. `path` is an
 * optional file path when the failure points at a specific file; `exitCode`
 * is an optional integer for callers that wrap external processes.
 */
export interface CompileDiagnostic {
  readonly kind: CompileDiagnosticKind;
  readonly workspace: string;
  readonly stage: CompileDiagnosticStage;
  readonly message: string;
  readonly path?: string;
  readonly exitCode?: number;
}

const ALL_KINDS: ReadonlySet<CompileDiagnosticKind> = new Set<CompileDiagnosticKind>([
  'MissingSoulFile',
  'MalformedLobsterYaml',
  'MissingFrontmatterField',
  'PermissionDenied',
  'CompileFailed',
  'EmitFailed',
  'ValidationFailed',
]);

const ALL_STAGES: ReadonlySet<CompileDiagnosticStage> = new Set<CompileDiagnosticStage>([
  'parse',
  'enforce',
  'emit',
  'validate',
]);

/**
 * Build a `CompileDiagnostic`, narrowing invalid `kind`/`stage` inputs to
 * `CompileFailed` / `parse` respectively.
 *
 * Internal callers must pass known kinds; this narrowing is the defensive
 * fallback for future-proofing against unexpected-kind inputs.
 */
export function makeDiagnostic(input: {
  kind: CompileDiagnosticKind;
  workspace: string;
  stage: CompileDiagnosticStage;
  message: string;
  path?: string;
  exitCode?: number;
}): CompileDiagnostic {
  const kind: CompileDiagnosticKind = ALL_KINDS.has(input.kind) ? input.kind : 'CompileFailed';
  const stage: CompileDiagnosticStage = ALL_STAGES.has(input.stage) ? input.stage : 'parse';
  const base: CompileDiagnostic = {
    kind,
    workspace: input.workspace,
    stage,
    message: input.message,
  };
  const withPath = input.path !== undefined ? { ...base, path: input.path } : base;
  return input.exitCode !== undefined ? { ...withPath, exitCode: input.exitCode } : withPath;
}

/**
 * Map a thrown value into a `CompileDiagnostic`.
 *
 * Readers surface ENOENT on SOUL.md → `MissingSoulFile`. YAML parse errors
 * → `MalformedLobsterYaml`. Permission errors (`EACCES`) → `PermissionDenied`.
 * Unknown internal errors → `CompileFailed` with the original message
 * preserved (fleet/S01 AC-03).
 */
export function diagnosticFromError(
  workspace: string,
  stage: CompileDiagnosticStage,
  err: unknown,
): CompileDiagnostic {
  const message = err instanceof Error ? err.message : String(err);
  const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined;
  const path = typeof err === 'object' && err !== null ? (err as { path?: string }).path : undefined;

  let kind: CompileDiagnosticKind = 'CompileFailed';
  const lowerMessage = message.toLowerCase();
  if (code === 'EACCES' || code === 'EPERM') {
    kind = 'PermissionDenied';
  } else if (code === 'ENOENT' && stage === 'parse' && typeof path === 'string' && /SOUL\.md$/i.test(path)) {
    kind = 'MissingSoulFile';
  } else if (
    (lowerMessage.includes('yaml') || lowerMessage.includes('yml')) &&
    (lowerMessage.includes('parse') ||
      lowerMessage.includes('malformed') ||
      lowerMessage.includes('invalid'))
  ) {
    kind = 'MalformedLobsterYaml';
  } else if (
    lowerMessage.includes('frontmatter') ||
    lowerMessage.includes('required field') ||
    (lowerMessage.includes('missing') && lowerMessage.includes('field'))
  ) {
    kind = 'MissingFrontmatterField';
  }

  return makeDiagnostic(
    path !== undefined ? { kind, workspace, stage, message, path } : { kind, workspace, stage, message },
  );
}
