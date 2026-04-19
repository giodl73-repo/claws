import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  StructuredEditor,
  recoverAtomicWrite,
  type EditOperation,
} from '../../src/workspace-edit/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, '../fixtures/workspace-edit');

let workspace: string;
let editor: StructuredEditor;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ws-edit-int-'));
  await cp(FIXTURE_DIR, workspace, { recursive: true });
  editor = new StructuredEditor({ workspaceRoot: workspace });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('StructuredEditor (integration)', () => {
  it('toggle then re-read shows only the targeted section changed', async () => {
    const originalRaw = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');

    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'file-write',
      field: 'enabled',
      value: false,
    };
    const result = await editor.apply(op);
    expect(result.success).toBe(true);
    expect(result.before).not.toBe(result.after);

    const updated = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    const untouchedSlices = ['web-search', 'file-read', 'db-query', 'send-email'];
    for (const heading of untouchedSlices) {
      expect(slice(updated, heading)).toBe(slice(originalRaw, heading));
    }
    // The touched slice changed.
    expect(slice(updated, 'file-write')).not.toBe(slice(originalRaw, 'file-write'));
  });

  it('sequential edits to different sections preserve each other', async () => {
    await editor.apply({
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'web-search',
      field: 'enabled',
      value: false,
    });
    await editor.apply({
      kind: 'set',
      file: 'TOOLS.md',
      section: 'db-query',
      field: 'Risk',
      value: 'R5',
    });

    const updated = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    expect(slice(updated, 'web-search')).toContain('- enabled: false');
    expect(slice(updated, 'db-query')).toContain('- Risk: R5');
    // Prior edit's changes remain after the second edit.
    expect(slice(updated, 'web-search')).toContain('- enabled: false');
  });

  it('concurrent edits to the same file serialise correctly', async () => {
    const ops: EditOperation[] = [
      { kind: 'toggle', file: 'TOOLS.md', section: 'web-search', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'file-read', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'db-query', field: 'enabled', value: true },
    ];
    const results = await Promise.all(ops.map((op) => editor.apply(op)));
    for (const r of results) expect(r.success).toBe(true);

    const updated = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    expect(slice(updated, 'web-search')).toContain('- enabled: false');
    expect(slice(updated, 'file-read')).toContain('- enabled: false');
    expect(slice(updated, 'db-query')).toContain('- enabled: true');
  });

  it('full edit cycle (preview → apply → recover) on fixture workspace', async () => {
    const op: EditOperation = {
      kind: 'append',
      file: 'CONNECTIONS.md',
      section: 'outlook',
      item: 'outlook-calendar-read',
    };

    const diff = await editor.preview(op);
    expect(diff.after).toContain('- outlook-calendar-read');

    // Preview does not write.
    const beforeApply = await readFile(join(workspace, 'CONNECTIONS.md'), 'utf-8');
    expect(beforeApply).not.toContain('outlook-calendar-read');

    await editor.apply(op);
    const afterApply = await readFile(join(workspace, 'CONNECTIONS.md'), 'utf-8');
    expect(afterApply).toContain('- outlook-calendar-read');

    // Idempotent recovery on a clean file is a no-op.
    await recoverAtomicWrite(join(workspace, 'CONNECTIONS.md'));
    const afterRecover = await readFile(join(workspace, 'CONNECTIONS.md'), 'utf-8');
    expect(afterRecover).toBe(afterApply);
  });
});

function slice(content: string, heading: string): string {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) return '';
  const next = content.indexOf('\n## ', start + marker.length);
  return next === -1 ? content.slice(start) : content.slice(start, next);
}
