/**
 * Human-readable message templates for each PatchError code.
 *
 * Co-designed with `errors.ts` so the error surface stays coherent. Each
 * template accepts the structured fields of its PatchError variant and
 * returns the message string partners surface in UI, logs, and audit
 * events. The templates embed the `ocPath` so support tooling can jump
 * directly to the offending field.
 *
 * @module claws-sdk/workspace-edit/error-messages
 */

import type {
  CompilationFailedError,
  FileNotEditableError,
  FleetLockedError,
  GovernanceDeniedError,
  PatchError,
  PatchErrorCode,
  ProvenanceChain,
  R5LockedError,
  RollbackFailedError,
  UnknownError,
  ValidationFailedError,
} from './errors.js';

function messageForR5(err: Pick<R5LockedError, 'tool' | 'ocPath'>): string {
  return `R5_NON_NEGOTIABLE at ${err.ocPath}: tool "${err.tool}" is classified R5 (critical) and cannot be toggled via any write path`;
}

function messageForFleet(err: Pick<FleetLockedError, 'reason' | 'policyFile' | 'ocPath'>): string {
  const reasonText =
    err.reason === 'policy-missing'
      ? 'fleet policy file is missing'
      : err.reason === 'policy-corrupt'
        ? 'fleet policy file is unparseable'
        : 'field is locked by fleet policy';
  return `FLEET_LOCKED at ${err.ocPath}: ${reasonText} (${err.policyFile})`;
}

function messageForGovernance(
  err: Pick<GovernanceDeniedError, 'provenance' | 'ocPath'>,
): string {
  const p: ProvenanceChain = err.provenance;
  return `GOVERNANCE_DENIED at ${err.ocPath}: rule ${p.ruleId} (${p.origin}) from ${p.policySource} — see ${p.governanceFile}`;
}

function messageForValidation(
  err: Pick<ValidationFailedError, 'subCode' | 'ocPath'>,
): string {
  return `VALIDATION_FAILED at ${err.ocPath}: ${err.subCode}`;
}

function messageForFileNotEditable(
  err: Pick<FileNotEditableError, 'file' | 'ocPath'>,
): string {
  return `FILE_NOT_EDITABLE at ${err.ocPath}: file "${err.file}" is not in the editable allowlist`;
}

function messageForCompilation(
  err: Pick<CompilationFailedError, 'compilerMessage' | 'ocPath'>,
): string {
  return `COMPILATION_FAILED at ${err.ocPath}: ${err.compilerMessage}`;
}

function messageForRollback(
  err: Pick<RollbackFailedError, 'filesystemState' | 'ocPath'>,
): string {
  return `ROLLBACK_FAILED at ${err.ocPath}: ${err.filesystemState} — manual filesystem recovery required`;
}

function messageForUnknown(err: Pick<UnknownError, 'cause' | 'ocPath'>): string {
  return `UNKNOWN_ERROR at ${err.ocPath}: ${err.cause}`;
}

/**
 * Render the canonical message for a PatchError. Exhaustive over the union
 * at compile time — adding a new code without updating this function is a
 * TypeScript error.
 */
export function renderPatchErrorMessage(err: PatchError): string {
  switch (err.code) {
    case 'R5_LOCKED':
      return messageForR5(err);
    case 'FLEET_LOCKED':
      return messageForFleet(err);
    case 'GOVERNANCE_DENIED':
      return messageForGovernance(err);
    case 'VALIDATION_FAILED':
      return messageForValidation(err);
    case 'FILE_NOT_EDITABLE':
      return messageForFileNotEditable(err);
    case 'COMPILATION_FAILED':
      return messageForCompilation(err);
    case 'ROLLBACK_FAILED':
      return messageForRollback(err);
    case 'UNKNOWN_ERROR':
      return messageForUnknown(err);
  }
}

/**
 * Convenience: render a PatchError message from the error struct without
 * the `message` field, then attach the rendered message back. Lets
 * validator factories write the error once instead of twice.
 */
export function buildPatchError<E extends PatchError>(partial: Omit<E, 'message'>): E {
  const withMessage = { ...partial, message: '' } as E;
  return { ...withMessage, message: renderPatchErrorMessage(withMessage) };
}

/**
 * Stable short labels for each code — used in logs and audit events when
 * the full message is too verbose. One label per code, no drift.
 */
export const PATCH_ERROR_LABELS: Readonly<Record<PatchErrorCode, string>> = {
  R5_LOCKED: 'R5 non-negotiable',
  FLEET_LOCKED: 'Fleet policy lock',
  GOVERNANCE_DENIED: 'Governance denial',
  VALIDATION_FAILED: 'Validation failed',
  FILE_NOT_EDITABLE: 'File not editable',
  COMPILATION_FAILED: 'Compilation failed',
  ROLLBACK_FAILED: 'Rollback failed',
  UNKNOWN_ERROR: 'Unknown error',
};
