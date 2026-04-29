/**
 * Tests for the 4 MEMORY.md workspace lint rules.
 * Each test pairs a positive case (rule fires) with a negative case
 * (rule does not fire on clean input). Evidence issues are cited in
 * each rule's docstring.
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import { lintWorkspace } from '../../../src/lint/workspace.js';
import type { DiscoveredWorkspaceFile } from '../../../src/staging/discover.js';
import type { WorkspaceContext } from '../../../src/lint/workspace-types.js';

function memoryFile(raw: string, relPath = 'MEMORY.md'): DiscoveredWorkspaceFile {
  const { ast, diagnostics } = parse('memory', raw);
  return { relPath, kind: 'memory', raw, ast, diagnostics };
}

function ctx(files: DiscoveredWorkspaceFile[]): WorkspaceContext {
  return { files };
}

describe('OC_MEMORY_HOOK_TOO_LONG (#73691, #45415)', () => {
  it('fires when first content line of an entry exceeds 150 chars', () => {
    const longHook = 'x'.repeat(160);
    const raw = `## Long entry\n${longHook}\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    const f = findings.find((x) => x.code === 'OC_MEMORY_HOOK_TOO_LONG');
    expect(f).toBeDefined();
    // Initial PR ships at 'note' severity — see rule docstring.
    expect(f!.severity).toBe('note');
    expect(f!.message).toContain('Long entry');
    expect(f!.relPath).toBe('MEMORY.md');
  });

  it('does NOT fire on hooks at or under 150 chars', () => {
    const goodHook = 'x'.repeat(150);
    const raw = `## OK entry\n${goodHook}\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_HOOK_TOO_LONG')).toBeUndefined();
  });

  it('only inspects the first non-blank line (entry body can be long)', () => {
    const raw = `## OK entry\nshort hook\n${'x'.repeat(300)}\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_HOOK_TOO_LONG')).toBeUndefined();
  });
});

describe('OC_MEMORY_INDEX_OVER_LIMIT (#73691, #45415)', () => {
  it('fires when MEMORY.md exceeds 200 lines', () => {
    const raw = '## E1\n' + 'body\n'.repeat(250);
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    const f = findings.find((x) => x.code === 'OC_MEMORY_INDEX_OVER_LIMIT' && x.message.includes('lines'));
    expect(f).toBeDefined();
    expect(f!.severity).toBe('warn');
  });

  it('fires when MEMORY.md has more than 50 entries', () => {
    let raw = '';
    for (let i = 0; i < 55; i++) raw += `## E${i}\nshort\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    const f = findings.find((x) => x.code === 'OC_MEMORY_INDEX_OVER_LIMIT' && x.message.includes('entries'));
    expect(f).toBeDefined();
  });

  it('does NOT fire on a normal-sized MEMORY.md', () => {
    const raw = '## E1\nbody\n\n## E2\nbody\n';
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_INDEX_OVER_LIMIT')).toBeUndefined();
  });
});

describe('OC_MEMORY_DEAD_LINK (#73691)', () => {
  it('fires on a relative link to a file not in the workspace', () => {
    const raw = `## E1\nSee [details](missing.md) for context.\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    const f = findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('note');
    expect(f!.suggestion).toBe('missing.md');
  });

  it('does NOT fire when the link target is in the workspace', () => {
    const raw = `## E1\nSee [details](existing.md) for context.\n`;
    const target: DiscoveredWorkspaceFile = {
      relPath: 'existing.md',
      kind: 'memory',
      raw: '',
      ast: { kind: 'memory', raw: '', frontmatter: [], preamble: '', blocks: [], scope: null, entries: [] } as never,
      diagnostics: [],
    };
    const findings = lintWorkspace(ctx([memoryFile(raw), target]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK')).toBeUndefined();
  });

  it('does NOT fire on external URLs', () => {
    const raw = `## E1\nSee [docs](https://example.com/page).\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK')).toBeUndefined();
  });

  it('does NOT fire on anchor-only links', () => {
    const raw = `## E1\nSee [section](#header).\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK')).toBeUndefined();
  });

  it('resolves ../ paths against the file parent directory', () => {
    const raw = `## E1\nLink: [up](../sibling.md)\n`;
    const file = memoryFile(raw, 'memory/MEMORY.md');
    const sibling: DiscoveredWorkspaceFile = {
      relPath: 'sibling.md',
      kind: 'memory',
      raw: '',
      ast: { kind: 'memory', raw: '', frontmatter: [], preamble: '', blocks: [], scope: null, entries: [] } as never,
      diagnostics: [],
    };
    const findings = lintWorkspace(ctx([file, sibling]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK')).toBeUndefined();
  });
});

describe('OC_MEMORY_RAW_CANDIDATE_LEAK (#67580, #67363, #68774)', () => {
  it('fires on a "Candidate:" line', () => {
    const raw = `## E1\nCandidate: undistilled stuff here\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    const f = findings.find((x) => x.code === 'OC_MEMORY_RAW_CANDIDATE_LEAK');
    expect(f).toBeDefined();
    // Initial PR ships at 'note' severity — see rule docstring.
    expect(f!.severity).toBe('note');
  });

  it('fires on a daily-log/ path leak', () => {
    const raw = `## E1\nfrom daily-log/2026-04-28.md: raw content\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_RAW_CANDIDATE_LEAK')).toBeDefined();
  });

  it('fires on a [dream:] trace prefix', () => {
    const raw = `## E1\n[dream:0xab12] internal trace\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_RAW_CANDIDATE_LEAK')).toBeDefined();
  });

  it('does NOT fire on clean entries', () => {
    const raw = `## E1\nNormal distilled memory hook line.\n`;
    const findings = lintWorkspace(ctx([memoryFile(raw)]));
    expect(findings.find((x) => x.code === 'OC_MEMORY_RAW_CANDIDATE_LEAK')).toBeUndefined();
  });
});
