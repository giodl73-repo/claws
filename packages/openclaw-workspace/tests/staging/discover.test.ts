/**
 * L1 integration: discoverWorkspaceFiles — reads + classifies + parses
 * workspace files under a root, honouring `.stage/` precedence and
 * returning typed `DiscoveredWorkspaceFile` entries.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverWorkspaceFiles } from '../../src/staging/discover.js';

function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), 'oc-workspace-discover-'));
}

describe('discoverWorkspaceFiles', () => {
  it('returns classified + parsed files for a SOUL+TOOLS workspace', async () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, 'SOUL.md'),
        '# soul\n\n## Boundaries\n- do not leak\n',
        'utf8',
      );
      writeFileSync(
        join(root, 'TOOLS.md'),
        '# tools\n\n## Tools\n\n### post # R5 COMMUNICATE\n',
        'utf8',
      );
      const res = await discoverWorkspaceFiles(root);
      const kinds = res.files.map((f) => f.kind).sort();
      expect(kinds).toEqual(['soul', 'tools']);
      const soul = res.files.find((f) => f.kind === 'soul')!;
      expect(soul.relPath).toBe('SOUL.md');
      expect(soul.ast.blocks.some((b) => b.heading === 'Boundaries')).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('prefers .stage/<path> over canonical <path>', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'SOUL.md'), '# canonical\n', 'utf8');
      mkdirSync(join(root, '.stage'), { recursive: true });
      writeFileSync(join(root, '.stage', 'SOUL.md'), '# staged\n\n## Boundaries\n- staged rule\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      const soul = res.files.find((f) => f.relPath === 'SOUL.md')!;
      expect(soul.raw).toContain('staged');
      expect(soul.raw).not.toContain('canonical');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('collects unclassified files in the `unclassified` field', async () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, 'SOUL.md'), '# soul\n', 'utf8');
      writeFileSync(join(root, 'README.md'), '# readme\n', 'utf8');
      writeFileSync(join(root, 'notes.txt'), 'notes\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      expect(res.files.map((f) => f.kind)).toEqual(['soul']);
      expect(res.unclassified).toEqual(expect.arrayContaining(['README.md', 'notes.txt']));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips hidden directories other than .stage', async () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, '.openclaw', 'policy'), { recursive: true });
      writeFileSync(join(root, '.openclaw', 'policy', 'policy-ir.json'), '{}', 'utf8');
      writeFileSync(join(root, 'SOUL.md'), '# soul\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      expect(res.files.map((f) => f.relPath)).toEqual(['SOUL.md']);
      expect(res.unclassified).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns an empty DiscoveryResult for an empty workspace', async () => {
    const root = makeRoot();
    try {
      const res = await discoverWorkspaceFiles(root);
      expect(res.files).toEqual([]);
      expect(res.unclassified).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('classifies nested directory-based kinds (skills/, workflows/, roles/)', async () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, 'skills'), { recursive: true });
      writeFileSync(join(root, 'skills', 'summarize.md'), '# skill\n', 'utf8');
      mkdirSync(join(root, 'workflows'), { recursive: true });
      writeFileSync(join(root, 'workflows', 'onboard.md'), '# workflow\n', 'utf8');
      const res = await discoverWorkspaceFiles(root);
      const kinds = res.files.map((f) => f.kind).sort();
      expect(kinds).toEqual(['skills', 'workflows']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
