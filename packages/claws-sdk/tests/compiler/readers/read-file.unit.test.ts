/**
 * L0 unit tests for read-file.ts — shared file reading utility.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readWorkspaceFile, buildFailure } from '#src/compiler/readers/read-file.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('readWorkspaceFile', () => {
  it('reads an existing file and normalizes content', async () => {
    const file = await readWorkspaceFile(resolve(FIXTURES, 'full-workspace'), 'SOUL.md');
    expect(file).not.toBeNull();
    expect(file!.path).toBe('SOUL.md');
    expect(file!.normalizedContent).toContain('Agent Soul');
    // Trailing newline enforced
    expect(file!.normalizedContent.endsWith('\n')).toBe(true);
  });

  it('returns null for nonexistent file', async () => {
    const file = await readWorkspaceFile(resolve(FIXTURES, 'full-workspace'), 'NONEXISTENT.md');
    expect(file).toBeNull();
  });

  it('normalizes backslash paths to forward slashes', async () => {
    const file = await readWorkspaceFile(resolve(FIXTURES, 'full-workspace'), 'SOUL.md');
    expect(file).not.toBeNull();
    expect(file!.path).not.toContain('\\');
  });
});

describe('buildFailure', () => {
  it('builds error diagnostic for required files', () => {
    const result = buildFailure('SOUL.md', true, 'File not found');
    expect(result.ok).toBe(false);
    expect(result.path).toBe('SOUL.md');
    expect(result.diagnostics[0]!.severity).toBe('error');
    expect(result.diagnostics[0]!.code).toBe('WORKSPACE-MISSING-REQUIRED');
  });

  it('builds warning diagnostic for optional files', () => {
    const result = buildFailure('AGENTS.md', false, 'File not found');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]!.severity).toBe('warning');
    expect(result.diagnostics[0]!.code).toBe('WORKSPACE-MISSING-OPTIONAL');
  });

  it('normalizes backslash paths', () => {
    const result = buildFailure('some\\path\\file.md', false, 'Missing');
    expect(result.path).toBe('some/path/file.md');
  });
});
