/**
 * L1 integration tests for workspace-reader.ts — full workspace orchestration.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('readOCWorkspace', () => {
  it('reads a full 9-file workspace successfully', async () => {
    const model = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));

    expect(model.soul.ok).toBe(true);
    expect(model.tools.ok).toBe(true);
    expect(model.agents.ok).toBe(true);
    expect(model.memory.ok).toBe(true);
    expect(model.identity.ok).toBe(true);
    expect(model.user.ok).toBe(true);
    expect(model.heartbeat.ok).toBe(true);
    expect(model.skills.ok).toBe(true);
    expect(model.lobster.ok).toBe(true);

    expect(model.presentCount).toBe(9);
    expect(model.absentCount).toBe(0);
  });

  it('produces warning for missing optional file', async () => {
    // missing-files fixture has only SOUL.md and TOOLS.md
    const model = await readOCWorkspace(resolve(FIXTURES, 'missing-files'));

    expect(model.soul.ok).toBe(true);
    expect(model.tools.ok).toBe(true);
    // Optional files should be absent with warnings
    expect(model.agents.ok).toBe(false);
    expect(model.memory.ok).toBe(false);
    expect(model.identity.ok).toBe(false);
    expect(model.user.ok).toBe(false);
    expect(model.heartbeat.ok).toBe(false);
    expect(model.skills.ok).toBe(false);
    expect(model.lobster.ok).toBe(false);

    // Check diagnostics for optional files are warnings
    const agentsDiag = model.agents.diagnostics[0];
    expect(agentsDiag.severity).toBe('warning');
    expect(agentsDiag.code).toBe('WORKSPACE-MISSING-OPTIONAL');
  });

  it('produces error for missing required file', async () => {
    // Use a directory with no SOUL.md (required)
    const model = await readOCWorkspace(resolve(FIXTURES, 'reader-test-no-soul'));

    expect(model.soul.ok).toBe(false);
    if (!model.soul.ok) {
      expect(model.soul.diagnostics[0].severity).toBe('error');
      expect(model.soul.diagnostics[0].code).toBe('WORKSPACE-MISSING-REQUIRED');
    }
  });

  it('normalizes paths to forward slashes (cross-platform)', async () => {
    const model = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));

    if (model.soul.ok) {
      expect(model.soul.file.path).not.toContain('\\');
      expect(model.soul.file.path).toBe('SOUL.md');
    }

    if (model.skills.ok) {
      expect(model.skills.file.path).not.toContain('\\');
    }
  });
});
