import { describe, expect, it } from 'vitest';
import {
  parse,
  emit,
  classify,
  grammars,
  WORKSPACE_FILE_KINDS,
} from '../../src/ast/index.js';

describe('ast parse + emit lossless round-trip', () => {
  it('SOUL.md: parse + emit returns byte-identical input', () => {
    const content = [
      '---',
      'name: support-agent',
      '---',
      '',
      'I am the support agent.',
      '',
      '## Boundaries',
      '- Do not send email without approval',
      '',
    ].join('\n');
    const { ast } = parse('soul', content);
    expect(emit('soul', ast)).toBe(content);
  });

  it('TOOLS.md: parse extracts table rows and round-trips raw', () => {
    const content = [
      '## Tool Guidance',
      '',
      '| Tool | Guidance |',
      '| ---- | -------- |',
      '| `send-email` | Drafts only, never sends without approval |',
      '',
    ].join('\n');
    const { ast } = parse('tools', content);
    expect(ast.kind).toBe('tools');
    if (ast.kind === 'tools') {
      expect(ast.tools).toHaveLength(1);
      expect(ast.tools[0]!.tool).toBe('send-email');
    }
    expect(emit('tools', ast)).toBe(content);
  });

  it('AGENTS.md: parse extracts fields and round-trips raw', () => {
    const content = [
      '## Drafter',
      '',
      '- description: drafts responses',
      '- model: claude-4',
      '',
    ].join('\n');
    const { ast } = parse('agents', content);
    expect(ast.kind).toBe('agents');
    if (ast.kind === 'agents') {
      expect(ast.agents).toHaveLength(1);
      expect(ast.agents[0]!.name).toBe('Drafter');
      expect(ast.agents[0]!.fields.map((f) => ({ key: f.key, value: f.value }))).toEqual([
        { key: 'description', value: 'drafts responses' },
        { key: 'model', value: 'claude-4' },
      ]);
    }
    expect(emit('agents', ast)).toBe(content);
  });
});

describe('ast grammar registry', () => {
  it('exports 13 WorkspaceFileKind grammars (11 PEG + bootstrap/hook stubs)', () => {
    expect(WORKSPACE_FILE_KINDS.length).toBe(13);
    for (const kind of WORKSPACE_FILE_KINDS) {
      expect(grammars[kind]).toBeTypeOf('string');
      expect(grammars[kind].length).toBeGreaterThan(0);
    }
  });
});

describe('classify', () => {
  it('maps canonical OC file basenames to kinds', () => {
    expect(classify('SOUL.md')).toBe('soul');
    expect(classify('TOOLS.md')).toBe('tools');
    expect(classify('AGENTS.md')).toBe('agents');
    expect(classify('BOOTSTRAP.md')).toBe('bootstrap');
    expect(classify('SKILL.md')).toBe('skills');
    expect(classify('openclaw.json')).toBe('config');
  });

  it('maps directory-qualified paths to kinds', () => {
    expect(classify('skills/email-drafter/SKILL.md')).toBe('skills');
    expect(classify('.hooks/my-hook/HOOK.md')).toBe('hook');
  });

  it('returns null for unknown paths', () => {
    expect(classify('README.md')).toBe(null);
  });

  it('classifies lobster.yaml as config (claws-internal; dropped at upstream extraction)', () => {
    expect(classify('lobster.yaml')).toBe('config');
  });
});
