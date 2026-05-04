import { describe, it, expect } from 'vitest';
import { parseWorkspaceFile } from '../src/compile/parse.js';

function blockBody(parsed: ReturnType<typeof parseWorkspaceFile>, heading: string): string {
  const block = parsed.ast.blocks.find((b) => b.heading === heading);
  return block ? block.bodyText.trim() : '';
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

  it('skill: returns diagnostics array (empty on success)', () => {
    const parsed = parseWorkspaceFile('skill', 'skills/x/SKILL.md', '## Meta\nr: 1\n');
    expect(parsed.diagnostics).toEqual([]);
  });

  it('memory: records raw body alongside structured blocks', () => {
    const raw = '## Memory\n- key: value\n';
    const parsed = parseWorkspaceFile('memory', 'MEMORY.md', raw);
    expect(parsed.ast.raw).toBe(raw);
    expect(blockBody(parsed, 'Memory')).toContain('key: value');
  });

  it('heartbeat: preserves path field on ParsedFile', () => {
    const parsed = parseWorkspaceFile(
      'heartbeat',
      'HEARTBEAT.md',
      '## Cadence\nevery 10m\n',
    );
    expect(parsed.path).toBe('HEARTBEAT.md');
  });

  it('bootstrap: empty body yields empty block list', () => {
    const parsed = parseWorkspaceFile('bootstrap', 'BOOTSTRAP.md', '');
    expect(parsed.ast.blocks).toEqual([]);
  });

  it('parser is kind-generic — table-shape validation belongs to lint, not parse', () => {
    // Post oc-paths-substrate migration: `parseMd` is kind-agnostic and
    // does NOT enforce kind-specific shape (e.g., "TOOLS.md tables must
    // have a separator row"). That validation moves to oc-paths-lint
    // rule packs, where it belongs. The parse phase produces only
    // structural diagnostics for genuinely malformed markdown.
    //
    // This test locks the new boundary: a malformed TOOLS-table input
    // parses cleanly through the substrate; the lint layer is what
    // surfaces the table-shape problem.
    const parsed = parseWorkspaceFile(
      'tools',
      'TOOLS.md',
      '## Tool Guidance\n| Tool | Guidance |\n| tool-a | do stuff |\n',
    );
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.path).toBe('TOOLS.md');
  });
});
