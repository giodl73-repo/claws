import { describe, it, expect } from 'vitest';
import { parseWorkspaceFile } from '../src/compile/parse.js';

function blockBody(parsed: ReturnType<typeof parseWorkspaceFile>, heading: string): string {
  const block = parsed.ast.blocks.find((b) => b.heading === heading);
  return block ? block.bodyLines.join('\n').trim() : '';
}

describe('parseWorkspaceFile — per workspace-file kind (8 tests)', () => {
  it('soul: splits ## sections into structured blocks', () => {
    const parsed = parseWorkspaceFile(
      'soul',
      'SOUL.md',
      '# SOUL\n\n## Tone\nFriendly.\n\n## Boundaries\n- Never post publicly\n',
    );
    expect(blockBody(parsed, 'Tone')).toBe('Friendly.');
    expect(blockBody(parsed, 'Boundaries')).toBe('- Never post publicly');
  });

  it('tools: preserves H3 tool declarations inside the Tools block', () => {
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tools\n### post-to-channel # R5, COMMUNICATE\n  args_from:\n    message: [user_prompt]\n',
    );
    const toolsBlock = blockBody(parsed, 'Tools');
    expect(toolsBlock).toContain('### post-to-channel');
    expect(toolsBlock).toContain('args_from');
  });

  it('agents: captures Delegation section body', () => {
    const parsed = parseWorkspaceFile(
      'agents',
      'AGENTS.md',
      '## Delegation\n- waffles -> drafter (writing)\n',
    );
    expect(blockBody(parsed, 'Delegation')).toContain('drafter');
  });

  it('memory: captures single-section body as a block', () => {
    const parsed = parseWorkspaceFile('memory', 'MEMORY.md', '## OBO\n- team:waffles\n');
    expect(blockBody(parsed, 'OBO')).toBe('- team:waffles');
  });

  it('skills: returns diagnostics array (empty on success)', () => {
    const parsed = parseWorkspaceFile('skills', 'skills/x/SKILL.md', '## Meta\nr: 1\n');
    expect(parsed.diagnostics).toEqual([]);
  });

  it('memory: records raw body alongside structured blocks', () => {
    const raw = '## Memory\n- key: value\n';
    const parsed = parseWorkspaceFile('memory', 'MEMORY.md', raw);
    expect(parsed.ast.raw).toBe(raw);
    expect(blockBody(parsed, 'Memory')).toContain('key: value');
  });

  it('config: preserves path field on ParsedFile', () => {
    const parsed = parseWorkspaceFile(
      'config',
      'HEARTBEAT.md',
      '## Cadence\nevery 10m\n',
    );
    expect(parsed.path).toBe('HEARTBEAT.md');
  });

  it('workflows: empty body yields empty block list', () => {
    const parsed = parseWorkspaceFile('workflows', 'WORKFLOW.md', '');
    expect(parsed.ast.blocks).toEqual([]);
  });

  it('maps workspace warning diagnostics to policy Diagnostic shape', () => {
    // Malformed TOOLS table (header row but no separator row) triggers a
    // workspace parser warning; verify it surfaces with an OC-POLICY code.
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tool Guidance\n| Tool | Guidance |\n| tool-a | do stuff |\n',
    );
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    const first = parsed.diagnostics[0]!;
    expect(first.code).toBe('OC-POLICY-W-PARSE');
    expect(first.severity).toBe('warning');
    expect(first.path).toBe('TOOLS.md');
    expect(typeof first.line).toBe('number');
  });
});
