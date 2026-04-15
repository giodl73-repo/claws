/**
 * L0: toSarifUri path normalization tests.
 */

import { describe, it, expect } from 'vitest';
import { toSarifUri } from '../../src/format/sarif-uri.js';

describe('toSarifUri', () => {
  it('converts Windows backslash paths to forward-slash URIs', () => {
    const result = toSarifUri(
      'C:\\Users\\dev\\workspace\\TOOLS.md',
      'C:\\Users\\dev\\workspace',
    );
    expect(result).toBe('TOOLS.md');
    expect(result).not.toContain('\\');
  });

  it('produces workspace-relative paths from absolute POSIX paths', () => {
    const result = toSarifUri(
      '/home/dev/workspace/subdir/SOUL.md',
      '/home/dev/workspace',
    );
    expect(result).toBe('subdir/SOUL.md');
    expect(result).not.toContain('\\');
  });

  it('handles mixed separators in workspace root', () => {
    const result = toSarifUri(
      'C:\\Projects\\myapp\\src\\config.md',
      'C:\\Projects\\myapp',
    );
    expect(result).toBe('src/config.md');
  });

  it('handles trailing slash on workspace root', () => {
    const result = toSarifUri(
      'C:\\Projects\\myapp\\TOOLS.md',
      'C:\\Projects\\myapp\\',
    );
    expect(result).toBe('TOOLS.md');
  });

  it('returns "." when path equals workspace root', () => {
    const result = toSarifUri(
      'C:\\Projects\\myapp',
      'C:\\Projects\\myapp',
    );
    expect(result).toBe('.');
  });

  it('returns "." when POSIX path equals workspace root', () => {
    const result = toSarifUri(
      '/home/dev/workspace',
      '/home/dev/workspace',
    );
    expect(result).toBe('.');
  });

  it('returns relative path when path is outside workspace root (same drive)', () => {
    const result = toSarifUri(
      'C:\\Other\\project\\file.md',
      'C:\\Projects\\myapp',
    );
    expect(result).toBe('../../Other/project/file.md');
    expect(result).not.toContain('\\');
  });

  it('returns relative POSIX path when outside workspace root', () => {
    const result = toSarifUri(
      '/other/project/file.md',
      '/home/dev/workspace',
    );
    expect(result).toBe('../../../other/project/file.md');
  });

  it('handles workspace root with trailing backslash on Windows', () => {
    const result = toSarifUri(
      'C:\\Projects\\myapp\\src\\main.ts',
      'C:\\Projects\\myapp\\',
    );
    expect(result).toBe('src/main.ts');
  });

  it('handles deeply nested paths', () => {
    const result = toSarifUri(
      'C:\\workspace\\src\\components\\ui\\Button.tsx',
      'C:\\workspace',
    );
    expect(result).toBe('src/components/ui/Button.tsx');
  });
});
