/**
 * L0 unit — CompileDiagnostic discriminated union (fleet/S01 AC-02/03/04).
 *
 * All 7 `kind` variants constructable, `stage` ∈ {parse, enforce, emit,
 * validate}, unknown failure maps to `CompileFailed`.
 */

import { describe, it, expect } from 'vitest';
import {
  makeDiagnostic,
  diagnosticFromError,
} from '#src/compiler/fleet/diagnostic.js';
import type {
  CompileDiagnostic,
  CompileDiagnosticKind,
  CompileDiagnosticStage,
} from '#src/compiler/fleet/diagnostic.js';

describe('CompileDiagnostic (unit)', () => {
  it('all 7 kind variants are constructable via makeDiagnostic', () => {
    const kinds: CompileDiagnosticKind[] = [
      'MissingSoulFile',
      'MalformedLobsterYaml',
      'MissingFrontmatterField',
      'PermissionDenied',
      'CompileFailed',
      'EmitFailed',
      'ValidationFailed',
    ];
    for (const kind of kinds) {
      const d: CompileDiagnostic = makeDiagnostic({
        kind,
        workspace: 'ws',
        stage: 'parse',
        message: `msg for ${kind}`,
      });
      expect(d.kind).toBe(kind);
      expect(d.workspace).toBe('ws');
      expect(d.stage).toBe('parse');
    }
  });

  it('all 4 stage variants are constructable', () => {
    const stages: CompileDiagnosticStage[] = ['parse', 'enforce', 'emit', 'validate'];
    for (const stage of stages) {
      const d = makeDiagnostic({
        kind: 'CompileFailed',
        workspace: 'ws',
        stage,
        message: 'x',
      });
      expect(d.stage).toBe(stage);
    }
  });

  it('carries optional path and exitCode only when supplied', () => {
    const bare = makeDiagnostic({ kind: 'CompileFailed', workspace: 'ws', stage: 'parse', message: 'x' });
    expect(bare.path).toBeUndefined();
    expect(bare.exitCode).toBeUndefined();

    const full = makeDiagnostic({
      kind: 'CompileFailed',
      workspace: 'ws',
      stage: 'emit',
      message: 'x',
      path: 'SOUL.md',
      exitCode: 3,
    });
    expect(full.path).toBe('SOUL.md');
    expect(full.exitCode).toBe(3);
  });

  it('diagnosticFromError maps ENOENT on SOUL.md to MissingSoulFile', () => {
    const err = Object.assign(new Error('ENOENT: no such file or directory'), {
      code: 'ENOENT',
      path: '/tmp/ws/SOUL.md',
    });
    const d = diagnosticFromError('ws', 'parse', err);
    expect(d.kind).toBe('MissingSoulFile');
    expect(d.stage).toBe('parse');
    expect(d.path).toBe('/tmp/ws/SOUL.md');
  });

  it('diagnosticFromError maps EACCES/EPERM to PermissionDenied', () => {
    const a = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    const b = Object.assign(new Error('permission denied'), { code: 'EPERM' });
    expect(diagnosticFromError('ws', 'parse', a).kind).toBe('PermissionDenied');
    expect(diagnosticFromError('ws', 'parse', b).kind).toBe('PermissionDenied');
  });

  it('diagnosticFromError maps YAML parse failures to MalformedLobsterYaml', () => {
    const err = new Error('YAML parse error: unexpected token at line 3');
    const d = diagnosticFromError('ws', 'parse', err);
    expect(d.kind).toBe('MalformedLobsterYaml');
  });

  it('diagnosticFromError maps missing-frontmatter messages to MissingFrontmatterField', () => {
    const err = new Error('required field "name" missing from frontmatter');
    const d = diagnosticFromError('ws', 'parse', err);
    expect(d.kind).toBe('MissingFrontmatterField');
  });

  it('diagnosticFromError falls back to CompileFailed for unknown internal errors', () => {
    const err = new Error('something went wrong in the governance rule engine');
    const d = diagnosticFromError('ws', 'enforce', err);
    expect(d.kind).toBe('CompileFailed');
    expect(d.stage).toBe('enforce');
    expect(d.message).toContain('something went wrong');
  });

  it('diagnosticFromError handles non-Error throw values', () => {
    const d = diagnosticFromError('ws', 'parse', 'plain string');
    expect(d.kind).toBe('CompileFailed');
    expect(d.message).toBe('plain string');
  });

  it('makeDiagnostic narrows unknown kind/stage to safe defaults', () => {
    const d = makeDiagnostic({
      kind: 'NotAKind' as CompileDiagnosticKind,
      workspace: 'ws',
      stage: 'banana' as CompileDiagnosticStage,
      message: 'x',
    });
    expect(d.kind).toBe('CompileFailed');
    expect(d.stage).toBe('parse');
  });
});
