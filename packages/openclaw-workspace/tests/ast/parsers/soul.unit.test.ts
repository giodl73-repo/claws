/**
 * Tests for `parseSoulKind` — SOUL.md structured parser per
 * `openclaw-soul.peg`. Covers the design scenarios:
 *   • Pristine input parses to expected typed AST
 *   • Malformed input emits warnings without throwing
 *   • Round-trip preserves original source via `raw`
 *   • Empty / minimal inputs are tolerated
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import type { SoulAst } from '../../../src/ast/ast-types.js';

describe('parseSoulKind — happy path', () => {
  it('parses frontmatter + persona + Boundaries section', () => {
    const src = `---
role: assistant
---

You are a careful assistant.

## Boundaries
- do not leak secrets
- do not impersonate humans
`;
    const { ast, diagnostics } = parse('soul', src);
    expect(ast.kind).toBe('soul');
    const soul = ast as SoulAst;
    expect(diagnostics).toEqual([]);
    expect(soul.frontmatter).toEqual([{ key: 'role', value: 'assistant' }]);
    expect(soul.boundaries.map((b) => b.text)).toEqual([
      'do not leak secrets',
      'do not impersonate humans',
    ]);
    expect(soul.personaText).toContain('careful assistant');
  });

  it('parses persona-only (no frontmatter, no Boundaries)', () => {
    const src = 'I am Sage.\n';
    const { ast, diagnostics } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(diagnostics).toEqual([]);
    expect(soul.frontmatter).toEqual([]);
    expect(soul.boundaries).toEqual([]);
    expect(soul.personaText).toBe('I am Sage.');
  });

  it('parses Boundaries-only (no persona)', () => {
    const src = '## Boundaries\n- only english\n';
    const { ast, diagnostics } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(diagnostics).toEqual([]);
    expect(soul.boundaries).toEqual([{ text: 'only english', line: 2 }]);
  });

  it('round-trip via raw field is byte-identical', () => {
    const src = `---
role: assistant
---

Persona.

## Boundaries
- a
- b
`;
    const { ast } = parse('soul', src);
    expect(ast.raw).toBe(src);
  });
});

describe('parseSoulKind — soft errors', () => {
  it('flags duplicate Boundaries sections (only first honored)', () => {
    const src = `## Boundaries
- a

## Boundaries
- b
`;
    const { ast, diagnostics } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(soul.boundaries).toEqual([{ text: 'a', line: 2 }]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.message).toContain('multiple');
    expect(diagnostics[0]!.severity).toBe('warning');
  });

  it('flags boundary item missing bullet marker (still parses other items)', () => {
    const src = `## Boundaries
- legitimate
this line has no bullet
- another
`;
    const { ast, diagnostics } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(soul.boundaries.map((b) => b.text)).toEqual(['legitimate', 'another']);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.message).toContain('boundary item missing');
  });

  it('does not throw on completely empty input', () => {
    const { ast, diagnostics } = parse('soul', '');
    const soul = ast as SoulAst;
    expect(soul.boundaries).toEqual([]);
    expect(diagnostics).toEqual([]);
  });

  it('does not throw on whitespace-only input', () => {
    const { ast, diagnostics } = parse('soul', '   \n\n  \n');
    const soul = ast as SoulAst;
    expect(soul.boundaries).toEqual([]);
    expect(diagnostics).toEqual([]);
  });

  it('empty Boundaries section produces zero boundaries, no diagnostic', () => {
    const src = '## Boundaries\n';
    const { ast, diagnostics } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(soul.boundaries).toEqual([]);
    expect(diagnostics).toEqual([]);
  });
});

describe('parseSoulKind — persona collects pre-Boundaries H2 sections (grammar fidelity)', () => {
  it('persona includes a non-Boundaries H2 section that appears BEFORE Boundaries', () => {
    // Grammar: PersonaBody is everything that is not the Boundaries
    // heading. So `## OtherSection` and its body should be part of
    // personaText. (`base.preamble` would have stopped at the first
    // H2 — this test locks in the grammar-faithful behavior.)
    const src = `Persona prose.

## OtherSection
extra context

## Boundaries
- only english
`;
    const { ast, diagnostics } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(soul.personaText).toContain('Persona prose');
    expect(soul.personaText).toContain('## OtherSection');
    expect(soul.personaText).toContain('extra context');
    expect(soul.personaText).not.toContain('## Boundaries');
    expect(soul.personaText).not.toContain('only english');
    expect(soul.boundaries.map((b) => b.text)).toEqual(['only english']);
    expect(diagnostics).toEqual([]);
  });

  it('persona excludes content after Boundaries even if more H2s follow', () => {
    const src = `Persona.

## Boundaries
- a

## Notes
trailing notes
`;
    const { ast } = parse('soul', src);
    const soul = ast as SoulAst;
    expect(soul.personaText).toBe('Persona.');
    expect(soul.boundaries.map((b) => b.text)).toEqual(['a']);
  });
});

describe('parseSoulKind — frontmatter is preserved on the AST', () => {
  it('round-trips frontmatter entries via base spread', () => {
    const src = '---\nrole: assistant\n---\n\nPersona.\n';
    const { ast } = parse('soul', src);
    expect(ast.frontmatter).toEqual([{ key: 'role', value: 'assistant' }]);
  });
});
