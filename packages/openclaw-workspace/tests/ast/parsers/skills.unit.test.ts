/**
 * Tests for `parseSkillsKind` — SKILL.md structured parser per
 * `openclaw-skills.peg`. Covers:
 *   • Required frontmatter (name + description)
 *   • Tier validation (T1/T2/T3 only)
 *   • YAML list extraction (tools, trigger_phrases) which the base
 *     parser's flat-key extraction would lose
 *   • Opaque key passthrough (anything not in the structured set)
 *   • Body extraction (markdown after frontmatter)
 *   • Soft errors: missing frontmatter, missing required keys,
 *     invalid tier, unterminated frontmatter
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import type { SkillsAst } from '../../../src/ast/ast-types.js';

describe('parseSkillsKind — happy path', () => {
  it('parses full frontmatter + body', () => {
    const src = `---
name: email-drafter
description: Compose well-formatted emails matching organizational tone.
tier: T2
tools:
  - Bash
  - Edit
trigger_phrases:
  - draft email
  - compose email
param_set: email
---

# Body

Use this skill to draft emails.
`;
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(diagnostics).toEqual([]);
    expect(sk.kind).toBe('skills');
    expect(sk.skill.name).toBe('email-drafter');
    expect(sk.skill.description).toContain('Compose');
    expect(sk.skill.tier).toBe('T2');
    expect(sk.skill.tools).toEqual(['Bash', 'Edit']);
    expect(sk.skill.triggerPhrases).toEqual(['draft email', 'compose email']);
    expect(sk.skill.paramSet).toBe('email');
    expect(sk.skill.body).toContain('Use this skill');
  });

  it('handles quoted values', () => {
    const src = `---
name: "fancy name"
description: 'with apostrophes'
tier: T1
---
body
`;
    const { ast } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.name).toBe('fancy name');
    expect(sk.skill.description).toBe('with apostrophes');
  });

  it('preserves opaque (non-structured) keys for round-trip', () => {
    const src = `---
name: x
description: y
custom_key: custom value
---
body
`;
    const { ast } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.opaque).toEqual([{ key: 'custom_key', value: 'custom value' }]);
  });

  it('round-trip via raw is byte-identical', () => {
    const src = `---
name: x
description: y
tier: T1
---

body
`;
    const { ast } = parse('skills', src);
    expect(ast.raw).toBe(src);
  });
});

describe('parseSkillsKind — soft errors', () => {
  it('warns on missing name', () => {
    const src = '---\ndescription: y\n---\nbody\n';
    const { diagnostics } = parse('skills', src);
    expect(diagnostics.some((d) => d.message.includes("'name'"))).toBe(true);
  });

  it('warns on missing description', () => {
    const src = '---\nname: x\n---\nbody\n';
    const { diagnostics } = parse('skills', src);
    expect(diagnostics.some((d) => d.message.includes("'description'"))).toBe(true);
  });

  it('warns on invalid tier value', () => {
    const src = '---\nname: x\ndescription: y\ntier: T9\n---\nbody\n';
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.tier).toBe(null); // rejected
    expect(diagnostics.some((d) => d.message.includes('invalid tier'))).toBe(true);
  });

  it('warns on missing frontmatter entirely', () => {
    const src = '# Body\nno frontmatter\n';
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.name).toBe(null);
    expect(diagnostics.some((d) => d.message.includes('missing required YAML frontmatter'))).toBe(true);
  });

  it('warns on unterminated frontmatter', () => {
    const src = '---\nname: x\n(no closing fence)\nbody\n';
    const { diagnostics } = parse('skills', src);
    expect(
      diagnostics.some((d) => d.message.includes('opens with --- but never closes')),
    ).toBe(true);
  });

  it('does not throw on empty input', () => {
    const { ast, diagnostics } = parse('skills', '');
    const sk = ast as SkillsAst;
    expect(sk.skill.name).toBe(null);
    // Empty input → "missing frontmatter" warning expected.
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
  });

  it('warns on duplicate frontmatter key (first-seen value retained)', () => {
    const src = '---\nname: a\nname: b\ndescription: y\n---\nbody\n';
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    // First-seen wins.
    expect(sk.skill.name).toBe('a');
    const dupDiag = diagnostics.find((d) => d.message.includes("duplicate frontmatter key 'name'"));
    expect(dupDiag).toBeDefined();
    expect(dupDiag!.severity).toBe('warning');
  });

  it('warns on lowercase tier value (t1 not T1)', () => {
    const src = '---\nname: x\ndescription: y\ntier: t1\n---\nbody\n';
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.tier).toBe(null);
    expect(diagnostics.some((d) => d.message.includes('invalid tier'))).toBe(true);
  });

  it('handles tier with trailing whitespace (T2 ) — trimmed before match', () => {
    const src = '---\nname: x\ndescription: y\ntier: T2 \n---\nbody\n';
    const { ast } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.tier).toBe('T2');
  });

  it('empty tools list (tools:\\n with no items) is no-op, no warning', () => {
    const src = '---\nname: x\ndescription: y\ntools:\n---\nbody\n';
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.tools).toEqual([]);
    // No warning specifically about tools being empty.
    expect(diagnostics.find((d) => d.message.includes('tools'))).toBeUndefined();
  });

  it('tolerates UTF-8 BOM at start of file', () => {
    const src = '﻿---\nname: x\ndescription: y\n---\nbody\n';
    const { ast, diagnostics } = parse('skills', src);
    const sk = ast as SkillsAst;
    expect(sk.skill.name).toBe('x');
    expect(sk.skill.description).toBe('y');
    // Should NOT emit "missing frontmatter" warning.
    expect(diagnostics.find((d) => d.message.includes('missing required YAML frontmatter'))).toBeUndefined();
  });

  it('preserves frontmatter on AST via base spread', () => {
    const src = '---\nname: x\ndescription: y\n---\nbody\n';
    const { ast } = parse('skills', src);
    // base parser populates frontmatter as flat key:value pairs.
    expect(ast.frontmatter).toContainEqual({ key: 'name', value: 'x' });
    expect(ast.frontmatter).toContainEqual({ key: 'description', value: 'y' });
  });
});
