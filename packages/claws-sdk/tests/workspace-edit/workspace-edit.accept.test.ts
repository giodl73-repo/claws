/**
 * Acceptance tests for pulse 29 workspace-edit scenarios.
 *
 * cap-integration/S07 — structural preconditions for R5 rejection: the
 *   workspace-edit module exposes an EDITABLE_FILES allowlist for the CAP
 *   write path and an EditableFilesError type so the PATCH route (pulse 31)
 *   can reject R5 toggles without any file-state change. The SDK must not
 *   expose a path that lets chunk-write reach SOUL.md.
 *
 * cap-integration/S19 — zero side-effects prerequisite for incremental
 *   recompile: the editor preserves non-targeted content byte-for-byte,
 *   so dependency-graph invalidation (pulse 32) only needs to flag the
 *   single touched file.
 */

import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CHUNK_EDITABLE_FILES,
  EDITABLE_FILES,
  StructuredEditor,
  type EditOperation,
} from '../../src/workspace-edit/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, '../fixtures/workspace-edit');

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ws-edit-accept-'));
  await cp(FIXTURE_DIR, workspace, { recursive: true });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('workspace-edit acceptance (cap-integration/S07, /S19)', () => {
  it('S07 prerequisite: chunk-write allowlist and R5 protection by structure', async () => {
    // The chunk write path never targets SOUL.md / MEMORY.md — those flow
    // through the Loop sync endpoints (pulses 35-36). PATCH routes in pulse 31
    // build on this to return 403 R5_NON_NEGOTIABLE without any state change.
    expect(CHUNK_EDITABLE_FILES).toEqual(['TOOLS.md', 'SETTINGS.md', 'CONNECTIONS.md']);
    expect(EDITABLE_FILES).toContain('SOUL.md');
    expect(EDITABLE_FILES).toContain('MEMORY.md');

    const editor = new StructuredEditor({ workspaceRoot: workspace });
    const originalRaw = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');

    // Attempt a chunk-path edit to a non-chunk file and verify zero state change.
    const badOp = {
      kind: 'toggle',
      file: 'SOUL.md',
      section: 'Purpose',
      field: 'enabled',
      value: false,
    } as unknown as EditOperation;
    const blocked = await editor.apply(badOp);
    expect(blocked.success).toBe(false);
    expect(blocked.error).toContain('CHUNK_EDITABLE_FILES_VIOLATION');

    const toolsUnchanged = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    expect(toolsUnchanged).toBe(originalRaw);
  });

  it('S19 prerequisite: single-tool patch changes exactly one section byte-for-byte', async () => {
    const editor = new StructuredEditor({ workspaceRoot: workspace });
    const before = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');

    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'file-read',
      field: 'enabled',
      value: false,
    };
    const result = await editor.apply(op);
    expect(result.success).toBe(true);
    expect(result.before).not.toBe(result.after);

    const after = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');

    // Only the targeted region differs. This is what lets the dependency
    // graph in pulse 32 mark a single file dirty and keep other phase
    // caches warm (parsing, assembly, risk-classification).
    const untouched = ['web-search', 'file-write', 'db-query', 'send-email'];
    for (const h of untouched) {
      expect(slice(after, h)).toBe(slice(before, h));
    }
    expect(slice(after, 'file-read')).not.toBe(slice(before, 'file-read'));
  });
});

function slice(content: string, heading: string): string {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) return '';
  const next = content.indexOf('\n## ', start + marker.length);
  return next === -1 ? content.slice(start) : content.slice(start, next);
}
