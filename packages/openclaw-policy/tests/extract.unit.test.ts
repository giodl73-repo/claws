import { describe, it, expect } from 'vitest';
import {
  clampIrreversibleExternal,
  extractArgsFrom,
  extractCapabilities,
  extractDenyRules,
  extractTools,
} from '../src/compile/extract.js';
import { parseWorkspaceFile } from '../src/compile/parse.js';

describe('Extract phase (6 tests)', () => {
  it('deny rules: lifts SOUL Boundaries bullets into DenyRule records', () => {
    const parsed = parseWorkspaceFile(
      'soul',
      'SOUL.md',
      '## Boundaries\n- Never post publicly without asking\n- Never share RESTRICTED externally\n',
    );
    const rules = extractDenyRules(parsed);
    expect(rules).toHaveLength(2);
    expect(rules[0]?.id).toBe('SOUL-1');
    expect(rules[0]?.reason).toMatch(/Never post publicly/);
  });

  it('args_from: parses ProvenanceSource arrays including memory + tool_output?', () => {
    const map = extractArgsFrom(
      '  message: [user_prompt, tool_output.draft?]\n  channel: [memory.RESTRICTED]\n',
    );
    expect(map['message']).toEqual([
      'user_prompt',
      { tool_output: 'draft', optional: true },
    ]);
    expect(map['channel']).toEqual([{ memory: 'RESTRICTED' }]);
  });

  it('capability clamp: IRREVERSIBLE_EXTERNAL bumps to R5 when declared lower', () => {
    const tool = clampIrreversibleExternal({
      name: 't',
      riskLevel: 3,
      capabilities: ['IRREVERSIBLE_EXTERNAL'],
    });
    expect(tool.riskLevel).toBe(5);
  });

  it('R5 invariants: tool with R5 token keeps riskLevel 5 through extraction', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### send # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL\n',
    );
    const tools = extractTools(parsed);
    expect(tools[0]?.riskLevel).toBe(5);
  });

  it('sensitivity propagation: capability list is deterministic', () => {
    const caps = extractCapabilities('R3, READ, COMMUNICATE, WRITE');
    expect(caps).toEqual(['READ', 'WRITE', 'COMMUNICATE']);
  });

  it('governance surface: extractTools reads full Tools block', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### a # R1, READ\n### b # R2, WRITE\n### c # R0\n',
    );
    const tools = extractTools(parsed);
    expect(tools.map((t) => t.name)).toEqual(['a', 'b', 'c']);
  });
});
