/**
 * L0 unit tests for workspace-reader.ts — the orchestrator.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('readOCWorkspace (unit)', () => {
  it('aggregates diagnostics from all readers', async () => {
    const model = await readOCWorkspace(resolve(FIXTURES, 'missing-files'));
    // Should have diagnostics for missing optional files
    expect(model.diagnostics.length).toBeGreaterThan(0);
    const warnings = model.diagnostics.filter(d => d.severity === 'warning');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('counts present and absent correctly for full workspace', async () => {
    const model = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));
    expect(model.presentCount).toBe(9);
    expect(model.absentCount).toBe(0);
  });

  it('counts present and absent correctly for partial workspace', async () => {
    const model = await readOCWorkspace(resolve(FIXTURES, 'missing-files'));
    expect(model.presentCount).toBe(2); // SOUL.md + TOOLS.md
    expect(model.absentCount).toBe(7);
  });
});
