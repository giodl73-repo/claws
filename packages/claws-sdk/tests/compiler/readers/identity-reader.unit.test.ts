/**
 * L0 unit tests for identity-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { identityReader } from '#src/compiler/readers/identity-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('identityReader', () => {
  it('parses IDENTITY.md with org, team, trust level', async () => {
    const result = await identityReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.organization).toBe('Acme Corp Engineering');
    expect(result.data.team).toBe('Platform Security');
    expect(result.data.trustLevel).toContain('L3');
    expect(result.data.sections.length).toBeGreaterThanOrEqual(3);
  });

  it('produces warning when IDENTITY.md has no Organization section', async () => {
    const result = await identityReader.read(resolve(FIXTURES, 'reader-test-empty-content'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.organization).toBe('');
    const warning = result.diagnostics.find(d => d.code === 'IDENTITY-NO-ORG');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('returns warning for missing optional IDENTITY.md', async () => {
    const result = await identityReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
    }
  });
});
