/**
 * L0: Windows path normalization.
 *
 * C07 amendment: Windows-style backslash paths must normalize to
 * forward slashes for cross-platform consistency.
 */

import { describe, it, expect } from 'vitest';
import { normalizePath } from '../../src/util/path.js';

describe('normalizePath', () => {
  it('converts Windows backslashes to forward slashes', () => {
    expect(normalizePath('C:\\src\\workspace\\SOUL.md')).toBe('C:/src/workspace/SOUL.md');
  });

  it('leaves forward-slash paths unchanged', () => {
    expect(normalizePath('C:/src/workspace/SOUL.md')).toBe('C:/src/workspace/SOUL.md');
  });

  it('handles mixed separators', () => {
    expect(normalizePath('C:\\src/workspace\\file.md')).toBe('C:/src/workspace/file.md');
  });

  it('handles empty string', () => {
    expect(normalizePath('')).toBe('');
  });

  it('handles relative paths with backslashes', () => {
    expect(normalizePath('.claws\\policies\\default.yaml')).toBe('.claws/policies/default.yaml');
  });
});
