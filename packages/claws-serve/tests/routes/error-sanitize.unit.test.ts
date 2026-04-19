/**
 * L0 unit tests for the response-layer PatchError sanitizer.
 *
 * Guards CISO W05 + gateway N-1: absolute workspace paths and raw
 * compiler/editor error strings MUST be stripped from user-facing
 * response bodies. The sanitizer is the single seam — every assertion
 * here maps to a specific disclosure finding from the CP-6 R1 review.
 */

import { describe, expect, it } from 'vitest';
import {
  buildPatchError,
  type CompilationFailedError,
  type FleetLockedError,
  type GovernanceDeniedError,
  type R5LockedError,
  type RollbackFailedError,
  type UnknownError,
} from '@bic/claws-sdk/workspace-edit';
import { sanitizePatchErrorForResponse } from '../../src/routes/error-sanitize.js';

const ROOT = '/abs/workspace/project';

describe('sanitizePatchErrorForResponse', () => {
  it('strips workspaceRoot from UNKNOWN_ERROR.message and clears cause', () => {
    const err = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath: 'oc://TOOLS.md/send-email',
      cause: `Editor failed on ${ROOT}/TOOLS.md: ENOENT`,
    });
    const out = sanitizePatchErrorForResponse(err, ROOT);
    expect(out.code).toBe('UNKNOWN_ERROR');
    expect((out as UnknownError).cause).toBe('');
    expect(JSON.stringify(out)).not.toContain(ROOT);
    // ocPath (logical) is preserved so partners keep their diagnostic hook.
    expect(out.ocPath).toBe('oc://TOOLS.md/send-email');
  });

  it('clears COMPILATION_FAILED.compilerMessage and strips workspaceRoot', () => {
    const err = buildPatchError<CompilationFailedError>({
      code: 'COMPILATION_FAILED',
      ocPath: 'oc://TOOLS.md/send-email',
      compilerMessage: `Cannot find module at ${ROOT}/SOUL.md line 42`,
    });
    const out = sanitizePatchErrorForResponse(err, ROOT);
    expect((out as CompilationFailedError).compilerMessage).toBe('');
    expect(JSON.stringify(out)).not.toContain(ROOT);
  });

  it('rewrites ROLLBACK_FAILED.filesystemState to a generic operator-only pointer', () => {
    const err = buildPatchError<RollbackFailedError>({
      code: 'ROLLBACK_FAILED',
      ocPath: 'oc://TOOLS.md/send-email',
      filesystemState: `file at ${ROOT}/TOOLS.md has post-edit content; restore failed: EACCES`,
    });
    const out = sanitizePatchErrorForResponse(err, ROOT);
    expect((out as RollbackFailedError).filesystemState).not.toContain(ROOT);
    expect((out as RollbackFailedError).filesystemState).toContain('server logs');
  });

  it('handles Windows-style backslashed absolute paths on a POSIX workspaceRoot', () => {
    const winRoot = 'C:\\src\\craftworks\\scratch';
    const err = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath: 'oc://TOOLS.md/x',
      cause: `failed on ${winRoot}\\TOOLS.md`,
    });
    const out = sanitizePatchErrorForResponse(err, winRoot);
    expect(JSON.stringify(out)).not.toContain('C:/src/craftworks/scratch');
    expect(JSON.stringify(out)).not.toContain('C:\\src\\craftworks\\scratch');
  });

  it('leaves pipeline-rejection errors untouched (R5_LOCKED)', () => {
    const err = buildPatchError<R5LockedError>({
      code: 'R5_LOCKED',
      ocPath: 'oc://TOOLS.md/send-email/enabled',
      tool: 'send-email',
      lockSource: 'r5',
    });
    const out = sanitizePatchErrorForResponse(err, ROOT);
    // R5 errors never carry workspace paths — preserve byte-for-byte so
    // partners retain their existing diagnostic fields.
    expect(out).toEqual(err);
  });

  it('leaves FLEET_LOCKED untouched — policyFile is expected partner surface on commit path', () => {
    // The commit path surfaces fleet policy file paths intentionally;
    // dry-run has its own sanitizer that scrubs them. Sanity-check the
    // split of concerns: the response sanitizer is NOT the dry-run
    // sanitizer.
    const err = buildPatchError<FleetLockedError>({
      code: 'FLEET_LOCKED',
      ocPath: 'oc://TOOLS.md/send-email/enabled',
      reason: 'field-locked',
      policyFile: '/etc/claws/fleet.json',
      lockSource: 'fleet',
    });
    const out = sanitizePatchErrorForResponse(err, ROOT);
    expect(out).toEqual(err);
  });

  it('is a no-op when workspaceRoot is empty (server misconfigured)', () => {
    // Covers the `workspaceRoot.length === 0` guard. The sanitizer must
    // still clear cause / compilerMessage / filesystemState — the empty
    // root only skips the prefix strip.
    const err = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath: 'oc://TOOLS.md/x',
      cause: 'anything here — still gets stripped',
    });
    const out = sanitizePatchErrorForResponse(err, '');
    expect((out as UnknownError).cause).toBe('');
    // Message must be returned verbatim (no root to substitute).
    expect(out.message).toBe(err.message);
  });

  it('leaves message unchanged when the workspace root is not present in it', () => {
    // Covers the `!normalisedValue.includes(normalisedRoot)` early-return.
    const err = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath: 'oc://TOOLS.md/x',
      cause: 'something',
    });
    const out = sanitizePatchErrorForResponse(err, '/not/in/message/ever');
    expect(out.message).toBe(err.message);
  });

  it('leaves GOVERNANCE_DENIED untouched — provenance chain is intended on commit path', () => {
    const err = buildPatchError<GovernanceDeniedError>({
      code: 'GOVERNANCE_DENIED',
      ocPath: 'oc://SOUL.md/Boundaries',
      provenance: {
        policySource: 'fleet:q2',
        ruleId: 'G-BOUND-01',
        governanceFile: '/etc/claws/fleet.json',
        origin: 'compiler-injected',
      },
      lockSource: 'governance',
    });
    const out = sanitizePatchErrorForResponse(err, ROOT);
    expect(out).toEqual(err);
  });
});
