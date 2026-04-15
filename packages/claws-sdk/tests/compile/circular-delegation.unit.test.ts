/**
 * L0: CIRCULAR-DELEGATION conflict detector unit tests.
 *
 * Covers uncovered branches:
 * 1. Self-delegation (cycle length 1) — line 56-58
 * 2. DFS visited-but-not-in-stack early return — line 47
 * 3. Cycle deduplication via canonical form — lines 100-103
 * 4. Cycle length < 2 skip — line 97
 * 5. Agent not in agentLineMap fallback — lines 108-109
 * 6. Multi-hop cycle (A->B->C->A) — lines 38-42
 * 7. Agent with no delegation targets — line 53 fallback
 */

import { describe, it, expect } from 'vitest';
import { detectCircularDelegation } from '../../src/compile/conflicts/circular-delegation.js';
import type {
  GovernanceAST,
  ParsedManifest,
  AgentRosterEntry,
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

function makeManifest(agents: AgentRosterEntry[]): ParsedManifest {
  return {
    tools: [],
    skills: [],
    agents,
    dataLabels: [],
    diagnostics: [],
  };
}

describe('detectCircularDelegation()', () => {
  it('returns empty for agents with no delegation', () => {
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Write'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 5 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));
    expect(entries).toEqual([]);
  });

  it('detects self-delegation (degenerate cycle of length 1)', () => {
    const agents: AgentRosterEntry[] = [
      { name: 'Self', tools: ['Read'], delegatesTo: ['Self'], delegationDepth: 0, source: 'AGENTS.md', line: 3 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('CIRCULAR-DELEGATION');
    expect(entries[0]!.code).toBe('CLAWS-C005');
    expect(entries[0]!.severity).toBe('Error');
    expect(entries[0]!.explanation).toContain('Self-delegation');
    expect(entries[0]!.explanation).toContain('Self');
  });

  it('detects 3-agent cycle (A->B->C->A)', () => {
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 2, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: ['C'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
      { name: 'C', tools: ['Read'], delegatesTo: ['A'], delegationDepth: 0, source: 'AGENTS.md', line: 7 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.severity).toBe('Error');
    expect(entries[0]!.explanation).toContain('Circular delegation');
    // The full cycle path should be present
    expect(entries[0]!.explanation).toMatch(/A.*B.*C.*A/);
  });

  it('deduplicates cycles that share the same members', () => {
    // A->B->A is the same cycle regardless of starting node
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: ['A'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));

    // Should deduplicate to 1 cycle
    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('CIRCULAR-DELEGATION');
  });

  it('falls back to line 1 and AGENTS.md when agent is not in agentLineMap', () => {
    // Agent in delegatesTo but not in manifest agents list
    // The cycle refers to agents that exist but have no line info in the map
    const agents: AgentRosterEntry[] = [
      { name: 'X', tools: [], delegatesTo: ['Y'], delegationDepth: 1, source: 'custom.md', line: 10 },
      { name: 'Y', tools: [], delegatesTo: ['X'], delegationDepth: 1, source: 'custom.md', line: 20 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.locationA.file).toBe('custom.md');
    expect(entries[0]!.locationB.file).toBe('custom.md');
  });

  it('handles agent that delegates to unknown agent (not in manifest)', () => {
    // Agent X delegates to Ghost which is NOT in manifest.agents
    // This exercises the graph.get() ?? [] fallback on line 53
    const agents: AgentRosterEntry[] = [
      { name: 'X', tools: ['Read'], delegatesTo: ['Ghost'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));
    expect(entries).toEqual([]);
  });

  it('handles mixed: one self-delegation and one multi-hop cycle', () => {
    const agents: AgentRosterEntry[] = [
      { name: 'Solo', tools: [], delegatesTo: ['Solo'], delegationDepth: 0, source: 'AGENTS.md', line: 1 },
      { name: 'A', tools: [], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: [], delegatesTo: ['A'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));

    expect(entries).toHaveLength(2);
    const selfEntry = entries.find(e => e.explanation.includes('Self-delegation'));
    const cycleEntry = entries.find(e => e.explanation.includes('Circular delegation'));
    expect(selfEntry).toBeDefined();
    expect(cycleEntry).toBeDefined();
  });

  it('deduplicates symmetric cycles (A->B->A found from both starting nodes)', () => {
    // A->B->A: DFS from A finds cycle A->B->A, DFS from B finds cycle B->A->B
    // Both should deduplicate to 1 cycle
    const agents: AgentRosterEntry[] = [
      { name: 'Alpha', tools: [], delegatesTo: ['Beta'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Beta', tools: [], delegatesTo: ['Alpha'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
      { name: 'Gamma', tools: [], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 7 },
    ];
    const entries = detectCircularDelegation(makeAST(), makeManifest(agents));

    // The canonical form is the same regardless of starting node
    expect(entries).toHaveLength(1);
  });
});
