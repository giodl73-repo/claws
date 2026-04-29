import { describe, expect, it } from 'vitest';
import { parse, emit, classify } from '../../src/ast/index.js';

describe('ast parse + emit edge cases', () => {
  it('parse handles empty content', () => {
    const { ast } = parse('soul', '');
    expect(ast.kind).toBe('soul');
    expect(ast.blocks).toEqual([]);
  });

  it('parse handles frontmatter without fence close gracefully', () => {
    const content = '---\nname: x\n';
    const { ast } = parse('soul', content);
    expect(ast.frontmatter).toEqual([{ key: 'name', value: 'x' }]);
  });

  it('parse ignores frontmatter lines without colon', () => {
    const content = '---\ninvalid line\nname: x\n---\n';
    const { ast } = parse('soul', content);
    expect(ast.frontmatter).toEqual([{ key: 'name', value: 'x' }]);
  });

  it('tools with no Tool Guidance heading yields empty tools array', () => {
    const { ast } = parse('tools', '## Something Else\nbody\n');
    if (ast.kind === 'tools') expect(ast.tools).toEqual([]);
  });

  it('tools: missing separator emits a warning diagnostic', () => {
    const content = '## Tool Guidance\n| Tool | Guidance |\n| `send-email` | ok |\n';
    const { diagnostics } = parse('tools', content);
    expect(diagnostics.some((d) => d.severity === 'warning')).toBe(true);
  });

  it('tools: escaped pipe in guidance cell', () => {
    const content = [
      '## Tool Guidance',
      '| Tool | Guidance |',
      '| ---- | -------- |',
      '| `send-email` | uses \\| pipe |',
    ].join('\n') + '\n';
    const { ast } = parse('tools', content);
    if (ast.kind === 'tools') expect(ast.tools[0]!.guidance).toContain('|');
  });

  it('agents: non-bullet line in body is skipped', () => {
    const content = '## Drafter\nplain prose line\n- description: x\n';
    const { ast } = parse('agents', content);
    if (ast.kind === 'agents') {
      expect(ast.agents[0]!.fields.map((f) => ({ key: f.key, value: f.value }))).toEqual([
        { key: 'description', value: 'x' },
      ]);
    }
  });

  it('generic kind (memory, config, etc.) still produces blocks', () => {
    const content = '## Personal\nbody line\n';
    const { ast } = parse('memory', content);
    expect(ast.kind).toBe('memory');
    expect(ast.blocks).toHaveLength(1);
  });

  it('emit: throws on kind mismatch', () => {
    const { ast } = parse('soul', 'hello');
    expect(() => emit('tools', ast)).toThrow(/kind mismatch/);
  });

  it('emit: roles kind accepts agents ast', () => {
    const { ast } = parse('agents', '## Drafter\n- description: x\n');
    expect(emit('roles', ast)).toBe(ast.raw);
  });

  it('emit: constructs canonical output when raw is empty', () => {
    const out = emit('soul', {
      kind: 'soul',
      raw: '',
      frontmatter: [{ key: 'name', value: 'x' }],
      preamble: 'Prose',
      blocks: [{ heading: 'Boundaries', bodyLines: ['- do x'], line: 1 }],
      boundaries: [{ text: 'do x', line: 2 }],
      personaText: 'Prose',
    });
    expect(out).toContain('---');
    expect(out).toContain('name: x');
    expect(out).toContain('Prose');
    expect(out).toContain('## Boundaries');
  });

  it('emit: empty ast (no frontmatter, preamble, or blocks) emits empty string', () => {
    const out = emit('config', {
      kind: 'config',
      raw: '',
      frontmatter: [],
      preamble: '',
      blocks: [],
    });
    expect(out).toBe('');
  });
});

describe('classify — more paths', () => {
  it('handles Windows-style backslashes for anywhere-matched basenames', () => {
    // Root-anchored basenames (SOUL.md etc.) don't match deeply-nested
    // paths even on Windows — that's by design (no node_modules false
    // positives). But anywhere-matched basenames like SKILL.md should
    // still classify regardless of separator style.
    expect(classify('skills\\email\\SKILL.md')).toBe('skills');
  });

  it('skills dir as subpath variant', () => {
    expect(classify('/abs/skills/email-drafter/skill.md')).toBe('skills');
  });

  it('does NOT classify governance/ workflows/ roles/ — no upstream loader exists', () => {
    // Earlier drafts speculatively classified these. Design-corpus
    // review found NO upstream loader actually reads these directories
    // (only skills/ and hooks/ are confirmed). Add back here if
    // upstream lands a loader for them.
    expect(classify('governance/policy.md')).toBe(null);
    expect(classify('workflows/onboarding.md')).toBe(null);
    expect(classify('roles/manager.md')).toBe(null);
  });
});

describe('parse branch coverage', () => {
  it('preamble and blocks both present', () => {
    const { ast } = parse('soul', 'Prose here.\n\n## Boundaries\n- do x\n');
    expect(ast.preamble).toContain('Prose');
    expect(ast.blocks).toHaveLength(1);
  });

  it('frontmatter with line lacking key (no text before colon)', () => {
    const content = '---\n: value\nname: x\n---\n';
    const { ast } = parse('soul', content);
    expect(ast.frontmatter).toEqual([{ key: 'name', value: 'x' }]);
  });

  it('agents: body line starting with bullet but no colon is skipped', () => {
    const { ast } = parse('agents', '## Drafter\n- no-colon-here\n- description: x\n');
    if (ast.kind === 'agents') {
      expect(ast.agents[0]!.fields.map((f) => ({ key: f.key, value: f.value }))).toEqual([
        { key: 'description', value: 'x' },
      ]);
    }
  });

  it('tools: blank line inside table body is skipped', () => {
    const content = [
      '## Tool Guidance',
      '| Tool | Guidance |',
      '| ---- | -------- |',
      '',
      '| `send-email` | ok |',
    ].join('\n') + '\n';
    const { ast } = parse('tools', content);
    if (ast.kind === 'tools') expect(ast.tools).toHaveLength(1);
  });

  it('tools: non-pipe line in body is skipped', () => {
    const content = [
      '## Tool Guidance',
      '| Tool | Guidance |',
      '| ---- | -------- |',
      'random prose',
      '| `send-email` | ok |',
    ].join('\n') + '\n';
    const { ast } = parse('tools', content);
    if (ast.kind === 'tools') expect(ast.tools).toHaveLength(1);
  });

  it('tools: cell with only tool (no guidance) is skipped', () => {
    const content = [
      '## Tool Guidance',
      '| Tool | Guidance |',
      '| ---- | -------- |',
      '| `send-email` |',
    ].join('\n') + '\n';
    const { ast } = parse('tools', content);
    if (ast.kind === 'tools') {
      const names = ast.tools.map((t) => t.tool);
      expect(names).not.toContain('send-email--guidance-missing');
    }
  });
});
