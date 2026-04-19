/**
 * L0 unit tests for user-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { userReader } from '#src/compiler/readers/user-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('userReader', () => {
  it('parses USER.md with role and preferences', async () => {
    const result = await userReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.role).toBe('Senior Security Engineer');
    expect(result.data.preferences.length).toBe(3);
    expect(result.data.preferences[0]).toContain('Verbose audit');
    expect(result.data.sections.length).toBeGreaterThanOrEqual(2);
  });

  it('handles USER.md with no sections gracefully', async () => {
    const result = await userReader.read(resolve(FIXTURES, 'reader-test-empty-content'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.role).toBe('');
    expect(result.data.preferences).toHaveLength(0);
  });

  it('returns warning for missing optional USER.md', async () => {
    const result = await userReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
    }
  });
});
