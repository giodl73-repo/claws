/**
 * L2 e2e test — end-to-end read from fixture directory with all 9 files.
 *
 * Verifies the complete OCWorkspaceModel shape.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';
import type { OCWorkspaceModel } from '#src/compiler/readers/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('readOCWorkspace e2e', () => {
  it('produces a complete OCWorkspaceModel from full-workspace fixture', async () => {
    const model: OCWorkspaceModel = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));

    // ── Shape validation ─────────────────────────────────────────────
    expect(model).toHaveProperty('soul');
    expect(model).toHaveProperty('tools');
    expect(model).toHaveProperty('agents');
    expect(model).toHaveProperty('memory');
    expect(model).toHaveProperty('identity');
    expect(model).toHaveProperty('user');
    expect(model).toHaveProperty('heartbeat');
    expect(model).toHaveProperty('skills');
    expect(model).toHaveProperty('lobster');
    expect(model).toHaveProperty('diagnostics');
    expect(model).toHaveProperty('presentCount');
    expect(model).toHaveProperty('absentCount');

    // ── All 9 present ────────────────────────────────────────────────
    expect(model.presentCount).toBe(9);
    expect(model.absentCount).toBe(0);

    // ── SOUL data ────────────────────────────────────────────────────
    expect(model.soul.ok).toBe(true);
    if (model.soul.ok) {
      expect(model.soul.data.persona).toBeTruthy();
      expect(model.soul.data.sections.length).toBeGreaterThan(0);
    }

    // ── TOOLS data ───────────────────────────────────────────────────
    expect(model.tools.ok).toBe(true);
    if (model.tools.ok) {
      expect(model.tools.data.tools.length).toBeGreaterThan(0);
      expect(model.tools.data.tools[0].name).toBeTruthy();
    }

    // ── AGENTS data ──────────────────────────────────────────────────
    expect(model.agents.ok).toBe(true);
    if (model.agents.ok) {
      expect(model.agents.data.agents.length).toBeGreaterThan(0);
      expect(model.agents.data.agents[0].name).toBeTruthy();
    }

    // ── MEMORY data ──────────────────────────────────────────────────
    expect(model.memory.ok).toBe(true);
    if (model.memory.ok) {
      expect(model.memory.data.entries.length).toBeGreaterThan(0);
    }

    // ── IDENTITY data ────────────────────────────────────────────────
    expect(model.identity.ok).toBe(true);
    if (model.identity.ok) {
      expect(model.identity.data.organization).toBeTruthy();
      expect(model.identity.data.team).toBeTruthy();
    }

    // ── USER data ────────────────────────────────────────────────────
    expect(model.user.ok).toBe(true);
    if (model.user.ok) {
      expect(model.user.data.role).toBeTruthy();
      expect(model.user.data.preferences.length).toBeGreaterThan(0);
    }

    // ── HEARTBEAT data ───────────────────────────────────────────────
    expect(model.heartbeat.ok).toBe(true);
    if (model.heartbeat.ok) {
      expect(model.heartbeat.data.schedules.length).toBeGreaterThan(0);
    }

    // ── SKILLS data ──────────────────────────────────────────────────
    expect(model.skills.ok).toBe(true);
    if (model.skills.ok) {
      expect(model.skills.data.skills.length).toBeGreaterThan(0);
      expect(model.skills.data.skills[0].name).toBeTruthy();
    }

    // ── LOBSTER data ─────────────────────────────────────────────────
    expect(model.lobster.ok).toBe(true);
    if (model.lobster.ok) {
      expect(model.lobster.data.name).toBeTruthy();
      expect(model.lobster.data.steps.length).toBeGreaterThan(0);
    }
  });
});
