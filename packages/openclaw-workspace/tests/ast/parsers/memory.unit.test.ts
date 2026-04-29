/**
 * Tests for `parseMemoryKind` — MEMORY.md structured parser per
 * `openclaw-memory.peg`. Covers:
 *   • Frontmatter scope: extraction (project/wave/role/task/ephemeral)
 *   • H2 entry parsing (heading + content lines)
 *   • Duplicate-entry-name diagnostic
 *   • Unknown-scope warning (extensible-fallback rule still parses)
 *   • Round-trip via raw
 *   • Empty / malformed input tolerated
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import type { MemoryAst } from '../../../src/ast/ast-types.js';

describe('parseMemoryKind — happy path', () => {
  it('parses frontmatter scope + multiple entries', () => {
    const src = `---
scope: project
---

## OpenClaw upstream relationship
claws consumes upstream OpenClaw; negotiating release cadence.

## Repo layout decision
Workspace uses src/* for SDK modules.
`;
    const { ast, diagnostics } = parse('memory', src);
    const mem = ast as MemoryAst;
    expect(diagnostics).toEqual([]);
    expect(mem.kind).toBe('memory');
    expect(mem.scope).toBe('project');
    expect(mem.entries.map((e) => e.name)).toEqual([
      'OpenClaw upstream relationship',
      'Repo layout decision',
    ]);
    expect(mem.entries[0]!.content).toContain('release cadence');
  });

  it('parses scope: ephemeral / task / wave / role', () => {
    for (const scope of ['ephemeral', 'task', 'wave', 'role'] as const) {
      const src = `---\nscope: ${scope}\n---\n\n## E\nbody\n`;
      const { ast, diagnostics } = parse('memory', src);
      expect((ast as MemoryAst).scope).toBe(scope);
      expect(diagnostics).toEqual([]);
    }
  });

  it('parses entries without frontmatter', () => {
    const src = '## A\ncontent A\n\n## B\ncontent B\n';
    const { ast, diagnostics } = parse('memory', src);
    const mem = ast as MemoryAst;
    expect(diagnostics).toEqual([]);
    expect(mem.scope).toBe(null);
    expect(mem.entries.map((e) => e.name)).toEqual(['A', 'B']);
  });

  it('round-trip via raw is byte-identical', () => {
    const src = `---
scope: project
---

## E1
body 1

## E2
body 2
`;
    const { ast } = parse('memory', src);
    expect(ast.raw).toBe(src);
  });
});

describe('parseMemoryKind — soft errors', () => {
  it('warns on unknown scope value but still parses', () => {
    const src = '---\nscope: galactic\n---\n\n## E\n';
    const { ast, diagnostics } = parse('memory', src);
    const mem = ast as MemoryAst;
    expect(mem.scope).toBe('galactic'); // extensible fallback preserves
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.message).toContain('unknown memory scope');
    expect(diagnostics[0]!.severity).toBe('warning');
  });

  it('flags duplicate entry headings at second occurrence', () => {
    const src = '## A\nfirst\n\n## A\nsecond\n';
    const { ast, diagnostics } = parse('memory', src);
    const mem = ast as MemoryAst;
    expect(mem.entries).toHaveLength(2);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.message).toContain("'A'");
    expect(diagnostics[0]!.message).toContain('duplicate');
  });

  it('does not throw on empty input', () => {
    const { ast, diagnostics } = parse('memory', '');
    const mem = ast as MemoryAst;
    expect(mem.entries).toEqual([]);
    expect(mem.scope).toBe(null);
    expect(diagnostics).toEqual([]);
  });

  it('does not throw on input with only frontmatter', () => {
    const { ast, diagnostics } = parse('memory', '---\nscope: project\n---\n');
    const mem = ast as MemoryAst;
    expect(mem.scope).toBe('project');
    expect(mem.entries).toEqual([]);
    expect(diagnostics).toEqual([]);
  });

  it('handles whitespace around scope value', () => {
    const src = '---\nscope:    project   \n---\n\n## E\n';
    const { ast } = parse('memory', src);
    const mem = ast as MemoryAst;
    // parseBase trims values, so 'project' is what we get.
    expect(mem.scope).toBe('project');
  });

  it('preserves frontmatter on AST via base spread', () => {
    const src = '---\nscope: wave\n---\n\n## E\n';
    const { ast } = parse('memory', src);
    expect(ast.frontmatter).toEqual([{ key: 'scope', value: 'wave' }]);
  });
});
