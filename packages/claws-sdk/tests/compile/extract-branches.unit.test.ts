/**
 * L0: Branch coverage gaps in extract.ts.
 *
 * Targets:
 * - Line 110: delegationGraph.get(name) ?? [] fallback in computeDelegationDepth
 * - Lines 182-186: agentSources/agentLines/agentTools/agentDelegates .get() ?? fallbacks
 *   in the roster builder
 */

import { describe, it, expect } from 'vitest';
import { extract } from '../../src/compile/extract.js';
import type {
  GovernanceAST,
  DelegationIntent,
} from '../../src/compile/types.js';

function makeAST(overrides: Partial<GovernanceAST> = {}): GovernanceAST {
  return {
    deny: [],
    tool: [],
    delegation: [],
    identity: [],
    authority: [],
    memory: [],
    schedule: [],
    skill: [],
    workflow: [],
    crossReferences: [],
    diagnostics: [],
    ...overrides,
  };
}

describe('extract — delegation depth fallback branches', () => {
  it('agent only appearing as "to" target uses default AGENTS.md source when no "from" edge', () => {
    // Agent "Worker" only appears as a delegation target.
    // It gets added to agentTools and agentDelegates via the "to" path,
    // but its line/source are set via agentLines/agentSources in the "to" block.
    // This exercises the "to" agent initialization path.
    const delegationIntents: DelegationIntent[] = [
      { from: 'Boss', to: 'Worker', tools: ['Read', 'Write'], line: 5 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);

    const worker = manifest.agents.find(a => a.name === 'Worker');
    expect(worker).toBeDefined();
    expect(worker!.tools).toContain('Read');
    expect(worker!.tools).toContain('Write');
    expect(worker!.delegatesTo).toEqual([]);
    expect(worker!.delegationDepth).toBe(0);
  });

  it('empty delegation produces empty agent roster', () => {
    const ast = makeAST({ delegation: [] });
    const manifest = extract(ast);
    expect(manifest.agents).toEqual([]);
  });

  it('multi-group delegation merges tools for the same target agent', () => {
    // Agent C appears as a "to" target in two different groups.
    // Second group should merge tools into the same set.
    const ast = makeAST({
      delegation: [
        { source: 'AGENTS.md', intents: [{ from: 'A', to: 'C', tools: ['Read'], line: 3 }] },
        { source: 'AGENTS.md', intents: [{ from: 'B', to: 'C', tools: ['Write'], line: 5 }] },
      ],
    });

    const manifest = extract(ast);
    const c = manifest.agents.find(a => a.name === 'C');
    expect(c).toBeDefined();
    expect(c!.tools).toContain('Read');
    expect(c!.tools).toContain('Write');
    // C has no outgoing delegation edges
    expect(c!.delegatesTo).toEqual([]);
  });

  it('agent with delegation to unknown target (not in any delegation group)', () => {
    // A delegates to Ghost. Ghost is not a top-level agent in any delegation intent.
    // Ghost won't appear in delegationGraph as a key, so computeDelegationDepth
    // for A will encounter graph.get("Ghost") returning undefined, hitting the ?? [] fallback.
    const delegationIntents: DelegationIntent[] = [
      { from: 'A', to: 'Ghost', tools: ['Read'], line: 3 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);

    const a = manifest.agents.find(ag => ag.name === 'A');
    expect(a).toBeDefined();
    // A delegates to Ghost, so depth should be 1
    expect(a!.delegationDepth).toBe(1);
    expect(a!.delegatesTo).toContain('Ghost');

    // Ghost should also be in the roster (as a "to" target)
    const ghost = manifest.agents.find(ag => ag.name === 'Ghost');
    expect(ghost).toBeDefined();
    expect(ghost!.delegationDepth).toBe(0);
  });

  it('chain A -> B -> C where C has no delegation group entry', () => {
    // C only exists as a target. computeDelegationDepth for A traverses
    // A -> B -> C, where C's neighbors come from delegationGraph.get("C") ?? [].
    const delegationIntents: DelegationIntent[] = [
      { from: 'A', to: 'B', tools: ['Read'], line: 3 },
      { from: 'B', to: 'C', tools: ['Write'], line: 5 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);

    const a = manifest.agents.find(ag => ag.name === 'A');
    expect(a).toBeDefined();
    expect(a!.delegationDepth).toBe(2);

    const b = manifest.agents.find(ag => ag.name === 'B');
    expect(b).toBeDefined();
    expect(b!.delegationDepth).toBe(1);

    const c = manifest.agents.find(ag => ag.name === 'C');
    expect(c).toBeDefined();
    expect(c!.delegationDepth).toBe(0);
  });

  it('deny with no tool groups does not crash', () => {
    const ast = makeAST({
      deny: [{
        source: 'SOUL.md',
        intents: [{
          keyword: 'never',
          confidence: 0.95,
          scope: 'tool',
          pattern: 'some-pattern',
          rawLine: 'Never some-pattern',
          line: 1,
          autoExtracted: true,
          intentKind: 'deny',
        }],
      }],
      tool: [], // no tool groups to cross-reference against
    });

    const manifest = extract(ast);
    expect(manifest.tools).toEqual([]);
  });
});
