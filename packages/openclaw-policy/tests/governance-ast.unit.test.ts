import { describe, it, expect } from 'vitest';
import { buildGovernanceAst } from '../src/compile/governance-ast.js';

describe('buildGovernanceAst', () => {
  it('parses delegation bullets into from/to/scope records', () => {
    const ast = buildGovernanceAst({
      Delegation: '- waffles -> drafter (writing)\n- waffles -> poster',
    });
    expect(ast.delegations).toEqual([
      { from: 'waffles', to: 'drafter', scope: 'writing' },
      { from: 'waffles', to: 'poster', scope: '' },
    ]);
  });

  it('parses boundary bullets distinguishing isolation vs delegation', () => {
    const ast = buildGovernanceAst({
      Boundaries: '- alpha | beta\n- gamma : delta',
    });
    expect(ast.boundaries[0]?.kind).toBe('isolation');
    expect(ast.boundaries[1]?.kind).toBe('delegation');
  });

  it('parses sensitivity propagation edges', () => {
    const ast = buildGovernanceAst({
      Propagation: '- draft => send : CONFIDENTIAL',
    });
    expect(ast.edges[0]).toEqual({
      from: 'draft',
      to: 'send',
      sensitivity: 'CONFIDENTIAL',
    });
  });

  it('parses backtick-wrapped governance surface paths', () => {
    const ast = buildGovernanceAst({
      Governance: '- `SOUL.md` is authoritative\n- `USER.md` too',
    });
    expect(ast.surface).toEqual(['SOUL.md', 'USER.md']);
  });

  it('returns empty structures for missing sections', () => {
    const ast = buildGovernanceAst({});
    expect(ast.delegations).toEqual([]);
    expect(ast.boundaries).toEqual([]);
    expect(ast.edges).toEqual([]);
    expect(ast.surface).toEqual([]);
  });

  it('skips malformed lines in each section', () => {
    const ast = buildGovernanceAst({
      Delegation: 'not a bullet\n- x -> y',
      Boundaries: 'header\n- a | b',
      Propagation: '- bad format\n- x => y : PUBLIC',
      Governance: '- no backticks\n- `good.md`',
    });
    expect(ast.delegations).toHaveLength(1);
    expect(ast.boundaries).toHaveLength(1);
    expect(ast.edges).toHaveLength(1);
    expect(ast.surface).toEqual(['good.md']);
  });
});
