/**
 * L0: DiagnosticError contract — WHAT + HOW + WHERE + docsUrl fields
 * and toDiagnostic() structured output.
 */

import { describe, it, expect } from 'vitest';
import { DiagnosticError } from '../../src/errors/contract.js';

describe('DiagnosticError', () => {
  it('has all four required fields (WHAT, HOW, WHERE, docsUrl)', () => {
    const err = new DiagnosticError({
      code: 'CLAWS-E010',
      what: 'No claws.json found',
      how: 'Run `claws init` to create a governance configuration.',
      where: { file: 'project/CLAUDE.md', line: 12, column: 1 },
      docsUrl: 'https://claws.dev/docs/getting-started',
    });

    // WHAT — inherited from Error.message
    expect(err.message).toBe('No claws.json found');

    // HOW — actionable remediation
    expect(err.how).toBe('Run `claws init` to create a governance configuration.');

    // WHERE — file + line + column
    expect(err.where).toEqual({ file: 'project/CLAUDE.md', line: 12, column: 1 });

    // docsUrl — optional documentation link
    expect(err.docsUrl).toBe('https://claws.dev/docs/getting-started');

    // Error identity
    expect(err.name).toBe('DiagnosticError');
    expect(err.code).toBe('CLAWS-E010');
    expect(err).toBeInstanceOf(Error);
  });

  it('toDiagnostic() produces correct structure with docsUrl and without', () => {
    // With docsUrl
    const withDocs = new DiagnosticError({
      code: 'CLAWS-E020',
      what: 'Compilation failed: parse error',
      how: 'Check your workspace files for syntax errors.',
      where: { file: 'SOUL.md', line: 5, column: 3 },
      docsUrl: 'https://claws.dev/docs/compile',
    });

    const diag1 = withDocs.toDiagnostic();
    expect(diag1.code).toBe('CLAWS-E020');
    expect(diag1.what).toBe('Compilation failed: parse error');
    expect(diag1.how).toBe('Check your workspace files for syntax errors.');
    expect(diag1.where).toEqual({ file: 'SOUL.md', line: 5, column: 3 });
    expect(diag1.docsUrl).toBe('https://claws.dev/docs/compile');
    expect(diag1.docsHint).toContain('claws help CLAWS-E020');

    // Without docsUrl — falls back to `claws help {code}` hint
    const withoutDocs = new DiagnosticError({
      code: 'CLAWS-E021',
      what: 'No governance source files found.',
      how: 'Create at least one governance file.',
      where: { file: '.', line: 0, column: 0 },
    });

    const diag2 = withoutDocs.toDiagnostic();
    expect(diag2.docsUrl).toBeNull();
    expect(diag2.docsHint).toContain('claws help CLAWS-E021');
    expect(diag2.docsHint).toContain('No governance source files found in workspace');
  });

  it('toDiagnostic() uses generic fallback hint when error code is not in registry', () => {
    const unknown = new DiagnosticError({
      code: 'CLAWS-E999',
      what: 'Unknown error',
      how: 'Contact support.',
      where: { file: 'unknown.md', line: 1, column: 1 },
    });

    const diag = unknown.toDiagnostic();
    expect(diag.docsUrl).toBeNull();
    // Falls back to generic hint since CLAWS-E999 is not in the registry
    expect(diag.docsHint).toBe('Run `claws help CLAWS-E999` for details');
  });
});
