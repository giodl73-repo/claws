/**
 * Dry-run audit + response sanitization.
 *
 * Dry-run is a governance-policy oracle: a caller probes the server with
 * `?dryRun=true` to learn "would this edit be allowed?" without committing
 * anything. Left unconstrained, this is an exfiltration surface — an
 * attacker can enumerate which rules exist, which files back them, and
 * which ruleIds map to which fields.
 *
 * This module provides two safeguards used by the patch-chunks dry-run
 * branch:
 *
 *   1. {@link sanitizeDryRunPatchError} — strips ruleId, policySource,
 *      governanceFile paths, cause strings, compiler messages, and policy
 *      file paths from a {@link PatchError} so the caller only learns the
 *      stable code + oc:// path of the target field.
 *
 *   2. {@link DryRunAuditSink} — optional sink the route invokes per
 *      dry-run probe so SOC tooling can track probe patterns over time.
 *      Failures are logged but do not fail the dry-run response.
 *
 * NOTE: Rate limiting is a broader cross-cutting concern (every PATCH /
 * batch / allow-all endpoint needs it). It is deliberately NOT implemented
 * here — see W-level TODO below. The sanitizer + audit sink address the
 * disclosure side of the oracle; a rate limiter addresses the probing
 * throughput side. Both are required for a complete fix.
 *
 * W-level TODO (cross-cutting): introduce a shared rate-limit middleware
 * applied to all write + dry-run routes. Tracked separately from cluster-E.
 *
 * @module claws-serve/middleware/dry-run-sanitize
 */

import type {
  CompilationFailedError,
  FleetLockedError,
  GovernanceDeniedError,
  PatchError,
  R5LockedError,
  RollbackFailedError,
  UnknownError,
  ValidationFailedError,
  FileNotEditableError,
} from '../../../claws-sdk/src/workspace-edit/index.js';

/**
 * Record passed to the dry-run audit sink. Captures the probe pattern
 * (who, when, what target, what verdict) without the identifying detail
 * of the target value.
 */
export interface DryRunAuditRecord {
  readonly timestamp: string;
  readonly actor: string;
  /** Final outcome surfaced to the caller (before or after sanitization). */
  readonly outcome: 'dry_run_allowed' | 'dry_run_denied';
  /** Short stable denial code (e.g. `R5_LOCKED`) when denied; undefined when allowed. */
  readonly denialCode?: string;
  /** oc:// path of the target field — never absolute paths. */
  readonly ocPath: string;
  /** Edit kind (`toggle`, `set`, `append`, `remove`). */
  readonly editKind: string;
  /** OC file being targeted (e.g. `TOOLS.md`). */
  readonly file: string;
  /** Section inside the OC file. */
  readonly section: string;
}

/**
 * Audit sink invoked per dry-run probe. Implementations forward to SIEM or
 * the same chain the write-path audit uses. Sink failures are logged but
 * never propagate — dry-run probes must stay cheap.
 */
export type DryRunAuditSink = (record: DryRunAuditRecord) => void | Promise<void>;

/**
 * Sanitize a {@link PatchError} for the dry-run response path.
 *
 * Removes every field that encodes governance internals: ruleId,
 * policySource, governanceFile, policyFile, raw compiler messages, cause
 * strings, and sub-codes. Preserves the stable `code`, a generic message,
 * and the oc:// path so callers still know which field they asked about.
 *
 * Governance denial messages are rewritten so they no longer carry
 * "rule G-XYZ from policy:X — see /abs/path/file.yaml"; instead they read
 * "Edit would be denied by governance policy".
 */
export function sanitizeDryRunPatchError(err: PatchError): PatchError {
  switch (err.code) {
    case 'R5_LOCKED': {
      const sanitized: R5LockedError = {
        code: 'R5_LOCKED',
        ocPath: err.ocPath,
        tool: err.tool,
        lockSource: 'r5',
        message: `Edit would be denied: tool is classified R5 (non-negotiable)`,
      };
      return sanitized;
    }
    case 'FLEET_LOCKED': {
      const sanitized: FleetLockedError = {
        code: 'FLEET_LOCKED',
        ocPath: err.ocPath,
        // Keep high-level reason (missing/corrupt/field-locked) but strip
        // the policyFile path — the caller learns "fleet policy blocks
        // this" not where the policy lives on disk.
        reason: err.reason,
        policyFile: '',
        lockSource: 'fleet',
        message: `Edit would be denied: field is locked by fleet policy`,
      };
      return sanitized;
    }
    case 'GOVERNANCE_DENIED': {
      // Scrub the provenance chain. The caller learns that governance
      // would deny, but NOT which rule, which policy, or which file.
      const sanitized: GovernanceDeniedError = {
        code: 'GOVERNANCE_DENIED',
        ocPath: err.ocPath,
        provenance: {
          policySource: '',
          ruleId: '',
          governanceFile: '',
          origin: err.provenance.origin,
        },
        lockSource: 'governance',
        message: `Edit would be denied by a governance policy`,
      };
      return sanitized;
    }
    case 'VALIDATION_FAILED': {
      // subCode can leak internal validator names — drop it.
      const sanitized: ValidationFailedError = {
        code: 'VALIDATION_FAILED',
        ocPath: err.ocPath,
        subCode: '',
        message: `Edit would fail validation`,
      };
      return sanitized;
    }
    case 'FILE_NOT_EDITABLE': {
      const sanitized: FileNotEditableError = {
        code: 'FILE_NOT_EDITABLE',
        ocPath: err.ocPath,
        file: err.file,
        message: `File is not in the editable allowlist`,
      };
      return sanitized;
    }
    case 'COMPILATION_FAILED': {
      // Raw compiler messages embed absolute paths + stack-trace noise.
      const sanitized: CompilationFailedError = {
        code: 'COMPILATION_FAILED',
        ocPath: err.ocPath,
        compilerMessage: '',
        message: `Edit would cause compilation to fail`,
      };
      return sanitized;
    }
    case 'ROLLBACK_FAILED': {
      const sanitized: RollbackFailedError = {
        code: 'ROLLBACK_FAILED',
        ocPath: err.ocPath,
        filesystemState: '',
        message: `Rollback would fail`,
      };
      return sanitized;
    }
    case 'UNKNOWN_ERROR': {
      // `cause` routinely carries filesystem paths + error stacks.
      const sanitized: UnknownError = {
        code: 'UNKNOWN_ERROR',
        ocPath: err.ocPath,
        cause: '',
        message: `Edit would fail for an unexpected reason`,
      };
      return sanitized;
    }
  }
}

/**
 * Sanitize a governance warning emitted by a validator. Warnings are the
 * "would-allow but flag" counterpart to {@link sanitizeDryRunPatchError}.
 *
 * Keeps the stable fields (code, severity if present) and scrubs any
 * free-form text that could embed policy paths or ruleIds.
 */
export function sanitizeDryRunWarning(
  warning: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof warning['code'] === 'string') out['code'] = warning['code'];
  if (typeof warning['severity'] === 'string') out['severity'] = warning['severity'];
  // Everything else (message, ruleId, policySource, governanceFile, cause,
  // path, file) is intentionally dropped.
  return out;
}

/**
 * Build a structured dry-run audit record from the edit + outcome.
 */
export function buildDryRunAuditRecord(args: {
  readonly actor: string;
  readonly timestamp: string;
  readonly editKind: string;
  readonly file: string;
  readonly section: string;
  readonly denialCode?: string;
}): DryRunAuditRecord {
  const ocPath = `oc://${args.file}/${args.section}`;
  if (args.denialCode !== undefined) {
    return {
      timestamp: args.timestamp,
      actor: args.actor,
      outcome: 'dry_run_denied',
      denialCode: args.denialCode,
      ocPath,
      editKind: args.editKind,
      file: args.file,
      section: args.section,
    };
  }
  return {
    timestamp: args.timestamp,
    actor: args.actor,
    outcome: 'dry_run_allowed',
    ocPath,
    editKind: args.editKind,
    file: args.file,
    section: args.section,
  };
}

/**
 * Fire-and-log dry-run sink invocation. Sink failures are reported via
 * console.error but never rethrown — dry-run probes must stay cheap.
 */
export async function emitDryRunAudit(
  sink: DryRunAuditSink | undefined,
  record: DryRunAuditRecord,
): Promise<void> {
  if (sink === undefined) return;
  try {
    await sink(record);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('dry-run audit sink failed:', err);
  }
}
