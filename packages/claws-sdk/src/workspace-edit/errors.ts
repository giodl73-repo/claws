/**
 * PatchError — typed error surface for the write-time validation layer.
 *
 * Every write path (chunk PATCH, Loop sync, trust escalation, onboard)
 * routes through the same validation pipeline and surfaces failures as a
 * `PatchError`. The union has 8 codes, each carrying structured context
 * so API responses, audit events, TUI banners, and VS Code diagnostics
 * can render the failure without re-parsing string messages.
 *
 * Every PatchError carries an `ocPath` (oc://... reference) to the field
 * that triggered the error. Partners translate oc:// → HTTP via
 * `ocPathToRoute()`.
 *
 * @module claws-sdk/workspace-edit/errors
 */

/**
 * Provenance of a governance deny rule.
 *
 * `compiler-injected` — the rule originates from the compiler (template
 * deny rules, R5 enforcement). Non-removable via any write path.
 *
 * `user-authored` — the rule originates from text an admin authored in
 * SOUL.md. Removal is permitted but produces a governance warning.
 */
export type DenyRuleProvenance = 'compiler-injected' | 'user-authored';

/**
 * Provenance chain tag attached to governance denials (P-277).
 *
 * Each field is machine-readable; partners compose messages from these
 * without regexing the human-readable text.
 */
export interface ProvenanceChain {
  /** Which policy surfaced the denial (e.g. "fleet:q1-2026", "template:default"). */
  readonly policySource: string;
  /** Rule identifier (e.g. "G-INPUT-02", "G-CLASS-01"). */
  readonly ruleId: string;
  /** Absolute path of the governance file that triggered the denial. */
  readonly governanceFile: string;
  /** compiler-injected | user-authored. */
  readonly origin: DenyRuleProvenance;
}

/** Common fields present on every PatchError variant. */
interface PatchErrorBase {
  /** oc:// reference to the field that triggered the error. */
  readonly ocPath: string;
  /** Stable, human-readable error message (see `error-messages.ts`). */
  readonly message: string;
}

/** R5 tools are non-negotiable — no write path may toggle them. */
export interface R5LockedError extends PatchErrorBase {
  readonly code: 'R5_LOCKED';
  /** Name of the R5 tool (e.g. "send-email"). */
  readonly tool: string;
  /** Source annotation mirrored onto chunk `ItemLock.source`. */
  readonly lockSource: 'r5';
}

/** Fleet policy is missing/corrupt or explicitly locks the field. */
export interface FleetLockedError extends PatchErrorBase {
  readonly code: 'FLEET_LOCKED';
  /** Why the fleet policy layer rejected the edit. */
  readonly reason: 'policy-missing' | 'policy-corrupt' | 'field-locked';
  /** Absolute path of the fleet policy file (even if missing). */
  readonly policyFile: string;
  readonly lockSource: 'fleet';
}

/** Governance rule denial, with provenance chain (P-276, P-277). */
export interface GovernanceDeniedError extends PatchErrorBase {
  readonly code: 'GOVERNANCE_DENIED';
  /** Provenance chain — policy source, rule ID, file, origin. */
  readonly provenance: ProvenanceChain;
  readonly lockSource: 'governance';
}

/** Generic validation failure for structural/shape violations. */
export interface ValidationFailedError extends PatchErrorBase {
  readonly code: 'VALIDATION_FAILED';
  /** Nested validator-specific code (e.g. "EDIT_SECTION_REQUIRED"). */
  readonly subCode: string;
}

/** File is outside the EDITABLE_FILES / CHUNK_EDITABLE_FILES allowlist. */
export interface FileNotEditableError extends PatchErrorBase {
  readonly code: 'FILE_NOT_EDITABLE';
  readonly file: string;
}

/** Compilation failed after the edit was written (downstream signal). */
export interface CompilationFailedError extends PatchErrorBase {
  readonly code: 'COMPILATION_FAILED';
  readonly compilerMessage: string;
}

/** Atomic rollback itself failed — requires manual filesystem recovery. */
export interface RollbackFailedError extends PatchErrorBase {
  readonly code: 'ROLLBACK_FAILED';
  /** Current on-disk state for manual recovery. */
  readonly filesystemState: string;
}

/** Escape hatch for unexpected failures. Always has a cause string. */
export interface UnknownError extends PatchErrorBase {
  readonly code: 'UNKNOWN_ERROR';
  readonly cause: string;
}

/** Discriminated union of every validation failure the pipeline produces. */
export type PatchError =
  | R5LockedError
  | FleetLockedError
  | GovernanceDeniedError
  | ValidationFailedError
  | FileNotEditableError
  | CompilationFailedError
  | RollbackFailedError
  | UnknownError;

/** Every PatchError code, exported for exhaustive switch checks. */
export type PatchErrorCode = PatchError['code'];

const PATCH_ERROR_CODES: ReadonlySet<PatchErrorCode> = new Set<PatchErrorCode>([
  'R5_LOCKED',
  'FLEET_LOCKED',
  'GOVERNANCE_DENIED',
  'VALIDATION_FAILED',
  'FILE_NOT_EDITABLE',
  'COMPILATION_FAILED',
  'ROLLBACK_FAILED',
  'UNKNOWN_ERROR',
]);

/**
 * Type guard for PatchError. Checks the structural shape (code in the set,
 * required ocPath + message strings).
 */
export function isPatchError(value: unknown): value is PatchError {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.code !== 'string') return false;
  if (!PATCH_ERROR_CODES.has(v.code as PatchErrorCode)) return false;
  if (typeof v.ocPath !== 'string') return false;
  if (typeof v.message !== 'string') return false;
  return true;
}

/**
 * Translate an oc:// path to an HTTP route segment under `/api/oc/`.
 *
 * `oc://TOOLS.md/Tools/send-email` → `/api/oc/TOOLS.md/Tools/send-email`
 * `oc://SOUL.md/Boundaries` → `/api/oc/SOUL.md/Boundaries`
 *
 * Each segment is URL-encoded individually so section/item names with
 * spaces or reserved characters stay safe on the wire. The `oc://` scheme
 * prefix is stripped; everything after it is split on `/` and rejoined.
 */
export function ocPathToRoute(ocPath: string): string {
  const scheme = 'oc://';
  if (!ocPath.startsWith(scheme)) {
    throw new Error(`ocPathToRoute: missing oc:// scheme in "${ocPath}"`);
  }
  const afterScheme = ocPath.slice(scheme.length);
  const queryIndex = afterScheme.indexOf('?');
  const pathPart = queryIndex === -1 ? afterScheme : afterScheme.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : afterScheme.slice(queryIndex);
  const encoded = pathPart
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `/api/oc/${encoded}${queryPart}`;
}
