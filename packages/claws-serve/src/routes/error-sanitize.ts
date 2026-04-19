/**
 * Response-layer sanitization for PatchError envelopes on the /chunks PATCH
 * path.
 *
 * The SDK's PatchError carries structured context that is appropriate for
 * server-side audit and logs (absolute filesystem paths, raw compiler
 * error messages with stack-trace fragments, arbitrary `cause` strings
 * from `StructuredEditor`). That context is NOT appropriate for the HTTP
 * response body — partners on the other end of /api/chunks may be
 * running on shared infra, unauthenticated dev tooling, or untrusted
 * browser extensions.
 *
 * CISO W05 + gateway N-1 flagged two specific leaks:
 *   - `UNKNOWN_ERROR.cause` echoes editor error messages that embed
 *     `/abs/workspace/TOOLS.md` and similar.
 *   - `COMPILATION_FAILED.compilerMessage` echoes the raw compiler throw
 *     which carries `Error: Cannot find module at /abs/...` or the
 *     rollback path's `sha256: ...` plus workspace absolute path.
 *
 * Sanitizer contract:
 *   - Preserve `code` (partners branch on it).
 *   - Preserve `ocPath` (already a logical path, never an absolute one).
 *   - Preserve `message` only after stripping workspace-absolute paths.
 *   - Blank out `cause`, `compilerMessage`, `filesystemState` in the
 *     response — operators read the full value from server logs.
 *
 * @module claws-serve/routes/error-sanitize
 */

import type {
  CompilationFailedError,
  PatchError,
  RollbackFailedError,
  UnknownError,
} from '../../../claws-sdk/src/workspace-edit/index.js';

/**
 * Strip the workspaceRoot prefix from a string. Non-destructive for any
 * string that does not start with the root.
 */
function stripWorkspaceRoot(value: string, workspaceRoot: string): string {
  if (workspaceRoot.length === 0) return value;
  // Path comparison is platform-specific — on Windows, fs operations may
  // yield either forward or backward slashes in error messages. Normalise
  // both sides before matching so the substitution works regardless.
  const normalisedRoot = workspaceRoot.replace(/\\/g, '/');
  const normalisedValue = value.replace(/\\/g, '/');
  if (!normalisedValue.includes(normalisedRoot)) return value;
  // Rebuild from normalised form so the output has no leftover Windows
  // slashes after the substitution.
  return normalisedValue.split(normalisedRoot).join('<workspace>');
}

/**
 * Sanitize a PatchError for the user-facing response body. Never mutates
 * the input. Server-side logs still receive the unsanitized error through
 * whatever log/audit sink the route already invokes.
 */
export function sanitizePatchErrorForResponse(
  err: PatchError,
  workspaceRoot: string,
): PatchError {
  switch (err.code) {
    case 'COMPILATION_FAILED': {
      const sanitized: CompilationFailedError = {
        code: 'COMPILATION_FAILED',
        ocPath: err.ocPath,
        compilerMessage: '',
        message: stripWorkspaceRoot(err.message, workspaceRoot),
      };
      return sanitized;
    }
    case 'UNKNOWN_ERROR': {
      const sanitized: UnknownError = {
        code: 'UNKNOWN_ERROR',
        ocPath: err.ocPath,
        cause: '',
        message: stripWorkspaceRoot(err.message, workspaceRoot),
      };
      return sanitized;
    }
    case 'ROLLBACK_FAILED': {
      const sanitized: RollbackFailedError = {
        code: 'ROLLBACK_FAILED',
        ocPath: err.ocPath,
        filesystemState: 'manual recovery required; see server logs for details',
        message: stripWorkspaceRoot(err.message, workspaceRoot),
      };
      return sanitized;
    }
    // Pipeline rejections (R5 / FLEET / GOVERNANCE / VALIDATION /
    // FILE_NOT_EDITABLE) never carry absolute workspace paths; leave them
    // untouched so partners keep their existing diagnostic fields.
    default:
      return err;
  }
}
