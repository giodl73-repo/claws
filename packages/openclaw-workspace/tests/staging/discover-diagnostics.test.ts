/**
 * Discovery diagnostics — covers the three new codes:
 *   • OC_WS_UNKNOWN_FILE         (info, with did-you-mean when within edit distance)
 *   • OC_WS_CASING_VIOLATION     (warning, lowercase variant of canonical bootstrap basename)
 *   • OC_WS_LEGACY_BASENAME      (info, deprecated basename like memory.md)
 *
 * These close the "silent drop" gap: any file we read but don't fully
 * recognize now produces a structured diagnostic that downstream
 * consumers (doctor surface, editor extensions) can render.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverWorkspaceFiles } from '../../src/staging/discover.js';

function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), 'oc-workspace-discover-diag-'));
}

describe('discoverWorkspaceFiles — diagnostics', () => {
  it('emits OC_WS_UNKNOWN_FILE with did-you-mean for close basenames', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'AGENT.md'), '# agent\n', 'utf8'); // missing S
      writeFileSync(join(root, 'TOOL.md'), '# tool\n', 'utf8'); // missing S
      const res = await discoverWorkspaceFiles(root);
      const codes = res.diagnostics.map((d) => d.code);
      expect(codes.every((c) => c === 'OC_WS_UNKNOWN_FILE')).toBe(true);
      const agentDiag = res.diagnostics.find((d) => d.relPath === 'AGENT.md')!;
      expect(agentDiag.suggestion).toBe('AGENTS.md');
      expect(agentDiag.message).toContain("did you mean 'AGENTS.md'");
      // Info-level (downgraded from warning) — unknown files are an
      // expected outcome of an evolving workspace, not an error.
      expect(agentDiag.severity).toBe('info');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('emits OC_WS_UNKNOWN_FILE without suggestion for unrelated names', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'CHANGELOG.md'), '# changelog\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      expect(res.diagnostics).toHaveLength(1);
      const diag = res.diagnostics[0]!;
      expect(diag.code).toBe('OC_WS_UNKNOWN_FILE');
      expect(diag.suggestion).toBe(null);
      expect(diag.message).not.toContain('did you mean');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('emits OC_WS_CASING_VIOLATION for agents.md (still classifies)', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'agents.md'), '# agents\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      // File is classified leniently — no silent drop.
      expect(res.files.map((f) => f.kind)).toEqual(['agents']);
      expect(res.unclassified).toEqual([]);
      // But a warning is surfaced.
      const diag = res.diagnostics.find((d) => d.code === 'OC_WS_CASING_VIOLATION');
      expect(diag).toBeDefined();
      expect(diag!.relPath).toBe('agents.md');
      expect(diag!.suggestion).toBe('AGENTS.md');
      expect(diag!.severity).toBe('warning');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('emits OC_WS_LEGACY_BASENAME for memory.md (still classifies, warning-level)', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'memory.md'), '# memory\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      expect(res.files.map((f) => f.kind)).toEqual(['memory']);
      const diag = res.diagnostics.find((d) => d.code === 'OC_WS_LEGACY_BASENAME');
      expect(diag).toBeDefined();
      expect(diag!.suggestion).toBe('MEMORY.md');
      // Bumped from 'info' to 'warning' so editor UIs surface the
      // deprecation visibly instead of rendering a faint info squiggle.
      expect(diag!.severity).toBe('warning');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns empty diagnostics + empty files for an empty workspace', async () => {
    const root = makeRoot();
    try {
      const res = await discoverWorkspaceFiles(root);
      expect(res.files).toEqual([]);
      expect(res.unclassified).toEqual([]);
      expect(res.diagnostics).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('emits NO diagnostics for a clean canonical workspace', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'SOUL.md'), '# soul\n', 'utf8');
      writeFileSync(join(root, 'AGENTS.md'), '# agents\n\n## Main\n- model: x\n', 'utf8');
      writeFileSync(join(root, 'BOOTSTRAP.md'), '# bootstrap\n', 'utf8');
      writeFileSync(join(root, 'openclaw.json'), '{}\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      expect(res.diagnostics).toEqual([]);
      expect(res.unclassified).toEqual([]);
      expect(res.files.map((f) => f.kind).sort()).toEqual(
        ['agents', 'bootstrap', 'config', 'soul'],
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
