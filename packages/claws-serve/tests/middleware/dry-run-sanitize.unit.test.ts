/**
 * L0 unit tests for the dry-run sanitization and audit helpers.
 *
 * Guards CISO E3: dry-run must not leak ruleIds, policy sources,
 * governance file paths, policyFile paths, compiler messages, or cause
 * strings. Every PatchError variant has a dedicated cell here so adding
 * a new code to the union without updating the sanitizer trips a failure.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  buildPatchError,
  type CompilationFailedError,
  type FleetLockedError,
  type GovernanceDeniedError,
  type FileNotEditableError,
  type R5LockedError,
  type RollbackFailedError,
  type UnknownError,
  type ValidationFailedError,
} from '@bic/claws-sdk/workspace-edit';
import {
  buildDryRunAuditRecord,
  emitDryRunAudit,
  sanitizeDryRunPatchError,
  sanitizeDryRunWarning,
} from '../../src/middleware/dry-run-sanitize.js';

describe('sanitizeDryRunPatchError', () => {
  it('R5_LOCKED: keeps code + tool, drops free-form text', () => {
    const err = buildPatchError<R5LockedError>({
      code: 'R5_LOCKED',
      ocPath: 'oc://TOOLS.md/send-email/enabled',
      tool: 'send-email',
      lockSource: 'r5',
    });
    const out = sanitizeDryRunPatchError(err);
    expect(out.code).toBe('R5_LOCKED');
    expect((out as R5LockedError).tool).toBe('send-email');
    expect(out.message).not.toContain('R5_NON_NEGOTIABLE');
  });

  it('FLEET_LOCKED: scrubs policyFile absolute path', () => {
    const err = buildPatchError<FleetLockedError>({
      code: 'FLEET_LOCKED',
      ocPath: 'oc://TOOLS.md/send-email/enabled',
      reason: 'field-locked',
      policyFile: '/abs/secret/fleet.json',
      lockSource: 'fleet',
    });
    const out = sanitizeDryRunPatchError(err);
    expect(out.code).toBe('FLEET_LOCKED');
    expect((out as FleetLockedError).policyFile).toBe('');
    const serialised = JSON.stringify(out);
    expect(serialised).not.toContain('/abs/secret/fleet.json');
  });

  it('GOVERNANCE_DENIED: scrubs ruleId, policySource, governanceFile', () => {
    const err = buildPatchError<GovernanceDeniedError>({
      code: 'GOVERNANCE_DENIED',
      ocPath: 'oc://SOUL.md/Boundaries',
      provenance: {
        policySource: 'fleet:q2',
        ruleId: 'G-BOUND-01',
        governanceFile: '/etc/claws/governance/boundaries.yaml',
        origin: 'compiler-injected',
      },
      lockSource: 'governance',
    });
    const out = sanitizeDryRunPatchError(err) as GovernanceDeniedError;
    expect(out.provenance.ruleId).toBe('');
    expect(out.provenance.policySource).toBe('');
    expect(out.provenance.governanceFile).toBe('');
    // origin stays — it is a stable label (compiler-injected vs user-authored).
    expect(out.provenance.origin).toBe('compiler-injected');
    const serialised = JSON.stringify(out);
    expect(serialised).not.toContain('fleet:q2');
    expect(serialised).not.toContain('G-BOUND-01');
    expect(serialised).not.toContain('boundaries.yaml');
  });

  it('VALIDATION_FAILED: scrubs subCode', () => {
    const err = buildPatchError<ValidationFailedError>({
      code: 'VALIDATION_FAILED',
      ocPath: 'oc://TOOLS.md/x',
      subCode: 'INTERNAL_VALIDATOR_NAME_XYZ',
    });
    const out = sanitizeDryRunPatchError(err) as ValidationFailedError;
    expect(out.subCode).toBe('');
    expect(JSON.stringify(out)).not.toContain('INTERNAL_VALIDATOR_NAME_XYZ');
  });

  it('FILE_NOT_EDITABLE: preserves file (a logical name, safe to surface)', () => {
    const err = buildPatchError<FileNotEditableError>({
      code: 'FILE_NOT_EDITABLE',
      ocPath: 'oc://ARCHIVE.md/x',
      file: 'ARCHIVE.md',
    });
    const out = sanitizeDryRunPatchError(err) as FileNotEditableError;
    expect(out.file).toBe('ARCHIVE.md');
  });

  it('COMPILATION_FAILED: clears compilerMessage', () => {
    const err = buildPatchError<CompilationFailedError>({
      code: 'COMPILATION_FAILED',
      ocPath: 'oc://TOOLS.md/x',
      compilerMessage: 'Error: Cannot find module at /abs/path/SOUL.md',
    });
    const out = sanitizeDryRunPatchError(err) as CompilationFailedError;
    expect(out.compilerMessage).toBe('');
    expect(JSON.stringify(out)).not.toContain('/abs/path');
  });

  it('ROLLBACK_FAILED: clears filesystemState', () => {
    const err = buildPatchError<RollbackFailedError>({
      code: 'ROLLBACK_FAILED',
      ocPath: 'oc://TOOLS.md/x',
      filesystemState: 'file at /abs/tmp/TOOLS.md.bak is corrupt',
    });
    const out = sanitizeDryRunPatchError(err) as RollbackFailedError;
    expect(out.filesystemState).toBe('');
    expect(JSON.stringify(out)).not.toContain('/abs/tmp');
  });

  it('UNKNOWN_ERROR: clears cause', () => {
    const err = buildPatchError<UnknownError>({
      code: 'UNKNOWN_ERROR',
      ocPath: 'oc://TOOLS.md/x',
      cause: `ENOENT: no such file or directory, open '/abs/workspace/SOUL.md'`,
    });
    const out = sanitizeDryRunPatchError(err) as UnknownError;
    expect(out.cause).toBe('');
    expect(JSON.stringify(out)).not.toContain('/abs/workspace');
  });
});

describe('sanitizeDryRunWarning', () => {
  it('keeps code + severity, drops everything else', () => {
    const w = {
      code: 'STALE_POLICY',
      severity: 'warn',
      ruleId: 'G-XYZ-01',
      policySource: 'fleet:q2',
      governanceFile: '/abs/path/fleet.yaml',
      message: 'rule G-XYZ-01 is deprecated in /abs/path/fleet.yaml',
    };
    const out = sanitizeDryRunWarning(w);
    expect(out).toEqual({ code: 'STALE_POLICY', severity: 'warn' });
  });

  it('handles warnings with no code or severity', () => {
    const w = { ruleId: 'hidden', message: 'leak' };
    const out = sanitizeDryRunWarning(w);
    expect(out).toEqual({});
  });
});

describe('buildDryRunAuditRecord', () => {
  it('records outcome=dry_run_allowed when no denialCode is supplied', () => {
    const record = buildDryRunAuditRecord({
      actor: 'alice@example.com',
      timestamp: '2026-04-17T12:00:00.000Z',
      editKind: 'toggle',
      file: 'TOOLS.md',
      section: 'send-email',
    });
    expect(record.outcome).toBe('dry_run_allowed');
    expect(record.ocPath).toBe('oc://TOOLS.md/send-email');
    expect(record.denialCode).toBeUndefined();
  });

  it('records outcome=dry_run_denied with the code when supplied', () => {
    const record = buildDryRunAuditRecord({
      actor: 'bob@example.com',
      timestamp: '2026-04-17T12:00:00.000Z',
      editKind: 'set',
      file: 'TOOLS.md',
      section: 'send-email',
      denialCode: 'R5_LOCKED',
    });
    expect(record.outcome).toBe('dry_run_denied');
    expect(record.denialCode).toBe('R5_LOCKED');
  });
});

describe('emitDryRunAudit', () => {
  it('fires the sink and resolves', async () => {
    let called = false;
    await emitDryRunAudit(
      async () => {
        called = true;
      },
      buildDryRunAuditRecord({
        actor: 'a',
        timestamp: 't',
        editKind: 'toggle',
        file: 'TOOLS.md',
        section: 's',
      }),
    );
    expect(called).toBe(true);
  });

  it('logs but does not throw when the sink rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        emitDryRunAudit(
          () => {
            throw new Error('sink down');
          },
          buildDryRunAuditRecord({
            actor: 'a',
            timestamp: 't',
            editKind: 'toggle',
            file: 'TOOLS.md',
            section: 's',
          }),
        ),
      ).resolves.toBeUndefined();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('is a no-op when no sink is configured', async () => {
    await expect(
      emitDryRunAudit(
        undefined,
        buildDryRunAuditRecord({
          actor: 'a',
          timestamp: 't',
          editKind: 'toggle',
          file: 'TOOLS.md',
          section: 's',
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
