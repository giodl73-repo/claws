import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StructuredEditor } from '../../src/workspace-edit/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REFERENCE_WORKSPACE = join(__dirname, '../fixtures/oc-reference-workspace');

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ws-edit-e2e-'));
  await cp(REFERENCE_WORKSPACE, workspace, { recursive: true });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('workspace-edit e2e on reference workspace', () => {
  it('SetEdit on TOOLS.md tool only changes the target tool section', async () => {
    const originalRaw = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    const editor = new StructuredEditor({ workspaceRoot: workspace });

    const result = await editor.apply({
      kind: 'set',
      file: 'TOOLS.md',
      section: 'db-query',
      field: 'Risk',
      value: 'R5',
    });
    expect(result.success).toBe(true);

    const updated = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');

    // Every other section is byte-for-byte identical.
    const headings = [
      'web-search',
      'web-scrape',
      'file-read',
      'file-list',
      'file-write',
      'calendar-read',
      'api-call',
      'send-email',
      'send-slack',
      'shell-exec',
      'deploy-trigger',
    ];
    for (const h of headings) {
      expect(slice(updated, h)).toBe(slice(originalRaw, h));
    }

    // Only the db-query section differs and its Risk line is updated.
    expect(slice(updated, 'db-query')).not.toBe(slice(originalRaw, 'db-query'));
    expect(slice(updated, 'db-query')).toContain('- Risk: R5');
  });
});

function slice(content: string, heading: string): string {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) return '';
  const next = content.indexOf('\n## ', start + marker.length);
  return next === -1 ? content.slice(start) : content.slice(start, next);
}
