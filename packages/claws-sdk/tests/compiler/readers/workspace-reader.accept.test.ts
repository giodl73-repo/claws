/**
 * L3 acceptance test — verifies workspace/forma/input scenario findings.
 *
 * Validates that the reader module produces the correct results for
 * the scenarios referenced in the pulse plan: workspace/S01, workspace/S03,
 * workspace/S04, forma/S03, forma/S04, input/S01.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('workspace reader acceptance', () => {
  it('satisfies workspace/forma/input scenario findings', async () => {
    // workspace/S01: Full workspace reads all 9 files
    const full = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));
    expect(full.presentCount).toBe(9);
    expect(full.absentCount).toBe(0);

    // workspace/S03: Missing optional files produce warnings, not errors
    const missing = await readOCWorkspace(resolve(FIXTURES, 'missing-files'));
    expect(missing.soul.ok).toBe(true);
    const optionalFailures = [
      missing.agents,
      missing.memory,
      missing.identity,
      missing.user,
      missing.heartbeat,
      missing.skills,
      missing.lobster,
    ];
    for (const result of optionalFailures) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.diagnostics[0].severity).toBe('warning');
      }
    }

    // workspace/S04: Missing required files produce errors
    const noSoul = await readOCWorkspace(resolve(FIXTURES, 'reader-test-no-soul'));
    expect(noSoul.soul.ok).toBe(false);
    if (!noSoul.soul.ok) {
      expect(noSoul.soul.diagnostics[0].severity).toBe('error');
    }

    // forma/S03: BOM stripping works on normalized content
    if (full.soul.ok) {
      expect(full.soul.file.normalizedContent.charCodeAt(0)).not.toBe(0xFEFF);
      expect(full.soul.file.normalizedContent.charCodeAt(0)).not.toBe(0xFFFE);
    }

    // forma/S04: CRLF normalization produces LF-only output
    if (full.soul.ok) {
      expect(full.soul.file.normalizedContent).not.toContain('\r\n');
    }

    // input/S01: All parsers produce structured data from fixtures
    if (full.soul.ok) {
      expect(full.soul.data.sections.length).toBeGreaterThan(0);
    }
    if (full.tools.ok) {
      expect(full.tools.data.tools.length).toBeGreaterThan(0);
    }
    if (full.lobster.ok) {
      expect(full.lobster.data.steps.length).toBeGreaterThan(0);
    }
  });
});
