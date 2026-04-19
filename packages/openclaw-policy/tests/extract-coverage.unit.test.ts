import { describe, it, expect } from 'vitest';
import {
  clampIrreversibleExternal,
  extractArgsFrom,
  extractCapabilities,
  extractDenyRules,
  extractTools,
} from '../src/compile/extract.js';
import { parseWorkspaceFile } from '../src/compile/parse.js';

describe('extract — branch coverage top-ups', () => {
  it('extractDenyRules: non-soul files return empty', () => {
    const parsed = parseWorkspaceFile('memory', 'MEMORY.md', '## Any\n- whatever\n');
    expect(extractDenyRules(parsed)).toEqual([]);
  });

  it('extractDenyRules: soul with no Boundaries block returns empty', () => {
    const parsed = parseWorkspaceFile('soul', 'SOUL.md', '## Tone\nFriendly\n');
    expect(extractDenyRules(parsed)).toEqual([]);
  });

  it('extractDenyRules: skips lines that are not list items', () => {
    const parsed = parseWorkspaceFile(
      'soul',
      'SOUL.md',
      '## Boundaries\n  no bullet\n- real rule\n  more text\n',
    );
    const rules = extractDenyRules(parsed);
    expect(rules).toHaveLength(1);
  });

  it('extractDenyRules: rule with no meaningful keywords falls back to *', () => {
    const parsed = parseWorkspaceFile('soul', 'SOUL.md', '## Boundaries\n- ok\n');
    const rules = extractDenyRules(parsed);
    expect(rules[0]?.pattern).toBe('*');
  });

  it('extractArgsFrom: empty body returns empty map', () => {
    expect(extractArgsFrom('')).toEqual({});
  });

  it('extractArgsFrom: unknown source token defaults to user_prompt', () => {
    const map = extractArgsFrom('  k: [mystery]\n');
    expect(map['k']).toEqual(['user_prompt']);
  });

  it('extractArgsFrom: memory.* with unknown sensitivity falls through to user_prompt default', () => {
    const map = extractArgsFrom('  k: [memory.PUBLIC]\n');
    expect(map['k']).toEqual([{ memory: 'PUBLIC' }]);
  });

  it('extractTools: non-tools files return empty', () => {
    const parsed = parseWorkspaceFile('soul', 'SOUL.md', '## Tools\n### a # R1\n');
    expect(extractTools(parsed)).toEqual([]);
  });

  it('extractTools: tools file with no Tools block returns empty', () => {
    const parsed = parseWorkspaceFile('tools', 'TOOLS.md', '## Other\nnothing\n');
    expect(extractTools(parsed)).toEqual([]);
  });

  it('extractTools: missing risk token defaults to R1', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### no-risk\n',
    );
    const tools = extractTools(parsed);
    expect(tools[0]?.riskLevel).toBe(1);
  });

  it('extractTools: args_from block attaches to the tool spec', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### t # R3, READ\n  args_from:\n    a: [user_prompt]\n',
    );
    const tools = extractTools(parsed);
    expect(tools[0]?.argsFrom).toEqual({ a: ['user_prompt'] });
  });

  it('clampIrreversibleExternal: leaves R5+IRREVERSIBLE untouched', () => {
    const tool = clampIrreversibleExternal({
      name: 't',
      riskLevel: 5,
      capabilities: ['IRREVERSIBLE_EXTERNAL'],
    });
    expect(tool.riskLevel).toBe(5);
  });

  it('extractCapabilities: token with no known capability returns empty', () => {
    expect(extractCapabilities('R2')).toEqual([]);
  });

  // --- Post-refactor branch-coverage top-ups (2026-04-19) ---------------
  // The regex → string-ops refactor added deterministic branches that
  // existing tests didn't drive. These walk the remaining paths.

  it('extractDenyRules: skips lines that do not start with - or *', () => {
    const parsed = parseWorkspaceFile('soul', 'SOUL.md', '## Boundaries\n+ not a bullet\n- real one\n');
    const rules = extractDenyRules(parsed);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.reason).toBe('real one');
  });

  it('extractDenyRules: skips bullet with no whitespace after marker', () => {
    const parsed = parseWorkspaceFile('soul', 'SOUL.md', '## Boundaries\n-no-space\n- ok one\n');
    const rules = extractDenyRules(parsed);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.reason).toBe('ok one');
  });

  it('extractDenyRules: skips bullet with only whitespace content', () => {
    const parsed = parseWorkspaceFile('soul', 'SOUL.md', '## Boundaries\n-   \t\t\n- real\n');
    const rules = extractDenyRules(parsed);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.reason).toBe('real');
  });

  it('extractArgsFrom: skips lines with <2 leading whitespace', () => {
    const out = extractArgsFrom(' foo: [user_prompt]\n  bar: [agent_literal]\n');
    expect(out).toEqual({ bar: ['agent_literal'] });
  });

  it('extractArgsFrom: skips lines with no colon', () => {
    const out = extractArgsFrom('  nocolon here\n  foo: [user_prompt]\n');
    expect(out).toEqual({ foo: ['user_prompt'] });
  });

  it('extractArgsFrom: skips keys with non-word chars', () => {
    const out = extractArgsFrom('  foo-bar: [user_prompt]\n  foo: [agent_literal]\n');
    // `foo-bar` fails /^\w+$/ (hyphen); only `foo` captured
    expect(out).toEqual({ foo: ['agent_literal'] });
  });

  it('extractArgsFrom: skips when value is not a bracketed list', () => {
    const out = extractArgsFrom('  foo: justascalar\n  bar: [user_prompt]\n');
    expect(out).toEqual({ bar: ['user_prompt'] });
  });

  it('extractArgsFrom: skips when closing bracket missing', () => {
    const out = extractArgsFrom('  foo: [open-only\n  bar: [user_prompt]\n');
    expect(out).toEqual({ bar: ['user_prompt'] });
  });

  it('extractArgsFrom: skips when trailing content after closing bracket', () => {
    const out = extractArgsFrom('  foo: [user_prompt] garbage-tail\n  bar: [agent_literal]\n');
    expect(out).toEqual({ bar: ['agent_literal'] });
  });

  it('extractTools: skips sub-block not starting with ###', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\nsome prose\n### real-tool # R2\n- cap\n',
    );
    const tools = extractTools(parsed);
    expect(tools.map((t) => t.name)).toEqual(['real-tool']);
  });

  it('extractTools: skips ### header without whitespace after the hashes', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### real-tool # R1\n\n###nowhitespace # R2\n',
    );
    const tools = extractTools(parsed);
    expect(tools.map((t) => t.name)).toEqual(['real-tool']);
  });

  it('extractTools: handles ### header with trailing garbage (rejects)', () => {
    // "### tool-name garbage" — garbage is non-whitespace after name,
    // not a `#` comment. Should be rejected per the strict parser.
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### good-one # R3\n### bad junk\n',
    );
    const tools = extractTools(parsed);
    expect(tools.map((t) => t.name)).toEqual(['good-one']);
  });

  it('extractTools: ### header with only whitespace after name (no comment)', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### bare-tool   \n',
    );
    const tools = extractTools(parsed);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe('bare-tool');
  });

  it('extractTools: args_from marker but not followed by newline (skipped)', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### t # R2\nargs_from: inline-not-newline\n',
    );
    const tools = extractTools(parsed);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.argsFrom).toBeUndefined();
  });

  it('extractTools: args_from body terminates at next ### (not end of section)', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### t1 # R2\nargs_from:\n  foo: [user_prompt]\n### t2 # R1\nargs_from:\n  bar: [agent_literal]\n',
    );
    const tools = extractTools(parsed);
    expect(tools).toHaveLength(2);
    expect(tools[0]!.argsFrom).toEqual({ foo: ['user_prompt'] });
    expect(tools[1]!.argsFrom).toEqual({ bar: ['agent_literal'] });
  });
});
