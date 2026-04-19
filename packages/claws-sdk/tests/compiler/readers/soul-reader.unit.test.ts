/**
 * L0 unit tests for soul-reader.ts — SOUL.md parsing.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { soulReader } from '#src/compiler/readers/soul-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('soulReader', () => {
  it('parses a valid SOUL.md with all sections', async () => {
    const result = await soulReader.read(resolve(FIXTURES, 'full-workspace'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.persona).toContain('enterprise governance agent');
    expect(result.data.sections.length).toBeGreaterThanOrEqual(2);

    const purposeSection = result.data.sections.find(s => s.heading === 'Purpose');
    expect(purposeSection).toBeDefined();
    expect(purposeSection!.body).toContain('security standards');

    const boundariesSection = result.data.sections.find(s => s.heading === 'Boundaries');
    expect(boundariesSection).toBeDefined();
    expect(boundariesSection!.body).toContain('Never bypass');
  });

  it('produces warning when SOUL.md has no H2 sections', async () => {
    const result = await soulReader.read(resolve(FIXTURES, 'reader-test-empty-content'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.sections).toHaveLength(0);
    const warning = result.diagnostics.find(d => d.code === 'SOUL-NO-SECTIONS');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('returns error for missing SOUL.md (required)', async () => {
    const result = await soulReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('error');
      expect(result.diagnostics[0]!.code).toBe('WORKSPACE-MISSING-REQUIRED');
    }
  });
});
