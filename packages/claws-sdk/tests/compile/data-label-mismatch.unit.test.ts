/**
 * L0: DATA-LABEL-MISMATCH conflict detector unit tests.
 *
 * Covers:
 * 1. Empty data labels → no conflicts
 * 2. Empty agents → no conflicts
 * 3. Public/internal-only data labels → no conflicts (below confidential threshold)
 * 4. Confidential data with agent delegation chain → conflict detected
 * 5. Restricted data with Bash tool in delegation chain → conflict detected
 * 6. Agent with no reachable agents → no conflict
 * 7. Deduplication of entries by (label.line, agent.line) pair
 * 8. Data ceiling unknown (no memory intents) → Warning severity
 * 9. Data ceiling known → Error severity
 * 10. Transitive reachability through multiple delegation hops
 */

import { describe, it, expect } from 'vitest';
import { detectDataLabelMismatch } from '../../src/compile/conflicts/data-label-mismatch.js';
import type {
  GovernanceAST,
  ParsedManifest,
  AgentRosterEntry,
  DataLabelEntry,
  MemoryIntent,
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

function makeManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    tools: [],
    skills: [],
    agents: [],
    dataLabels: [],
    diagnostics: [],
    ...overrides,
  };
}

describe('detectDataLabelMismatch()', () => {
  it('returns empty for empty data labels', () => {
    const entries = detectDataLabelMismatch(
      makeAST(),
      makeManifest({ agents: [{ name: 'A', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 3 }] }),
    );
    expect(entries).toEqual([]);
  });

  it('returns empty for empty agents', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const entries = detectDataLabelMismatch(makeAST(), makeManifest({ dataLabels }));
    expect(entries).toEqual([]);
  });

  it('returns empty when all data labels are public or internal', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'docs', sensitivity: 'public', retention: 'permanent', source: 'MEMORY.md', line: 3 },
      { label: 'notes', sensitivity: 'internal', retention: 'session', source: 'MEMORY.md', line: 5 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 5 },
    ];
    const entries = detectDataLabelMismatch(makeAST(), makeManifest({ dataLabels, agents }));
    expect(entries).toEqual([]);
  });

  it('detects confidential data accessible via delegation chain with Read tool', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'API Keys', sensitivity: 'confidential', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'Orchestrator', tools: ['Read'], delegatesTo: ['Worker'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Worker', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];
    const memoryIntents: MemoryIntent[] = [
      { label: 'API Keys', sensitivity: 'confidential', retention: 'session', line: 3 },
    ];

    const ast = makeAST({ memory: [{ source: 'MEMORY.md', intents: memoryIntents }] });
    const entries = detectDataLabelMismatch(ast, makeManifest({ dataLabels, agents }));

    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0]!.category).toBe('DATA-LABEL-MISMATCH');
    expect(entries[0]!.code).toBe('CLAWS-C004');
    expect(entries[0]!.explanation).toContain('confidential');
  });

  it('detects restricted data accessible via agent with Bash tool', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'permanent', source: 'MEMORY.md', line: 5 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Bash'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 10 },
    ];
    const memoryIntents: MemoryIntent[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'permanent', line: 5 },
    ];

    const ast = makeAST({ memory: [{ source: 'MEMORY.md', intents: memoryIntents }] });
    const entries = detectDataLabelMismatch(ast, makeManifest({ dataLabels, agents }));

    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0]!.explanation).toContain('restricted');
  });

  it('no conflict when agent has no reachable agents', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'Solo', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 3 },
    ];
    const entries = detectDataLabelMismatch(makeAST(), makeManifest({ dataLabels, agents }));
    expect(entries).toEqual([]);
  });

  it('severity is Warning when data ceiling is unknown (no memory intents)', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'confidential', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];

    // No memory intents in AST → ceiling unknown
    const ast = makeAST({ memory: [] });
    const entries = detectDataLabelMismatch(ast, makeManifest({ dataLabels, agents }));

    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0]!.severity).toBe('Warning');
    expect(entries[0]!.explanation).toContain('manual review recommended');
  });

  it('severity is Error when data ceiling is known', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'confidential', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];
    const memoryIntents: MemoryIntent[] = [
      { label: 'secrets', sensitivity: 'confidential', retention: 'session', line: 3 },
    ];

    const ast = makeAST({ memory: [{ source: 'MEMORY.md', intents: memoryIntents }] });
    const entries = detectDataLabelMismatch(ast, makeManifest({ dataLabels, agents }));

    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0]!.severity).toBe('Error');
  });

  it('deduplicates entries by (label.line, agent.line) pair', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets1', sensitivity: 'restricted', retention: 'session', source: 'MEMORY.md', line: 3 },
      { label: 'secrets2', sensitivity: 'confidential', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];
    const memoryIntents: MemoryIntent[] = [
      { label: 'secrets1', sensitivity: 'restricted', retention: 'session', line: 3 },
    ];

    const ast = makeAST({ memory: [{ source: 'MEMORY.md', intents: memoryIntents }] });
    const entries = detectDataLabelMismatch(ast, makeManifest({ dataLabels, agents }));

    // Both labels have line 3, agent B has line 8 — dedup key "3:8"
    const uniqueKeys = new Set(entries.map(e => `${e.locationA.line}:${e.locationB.line}`));
    expect(entries.length).toBe(uniqueKeys.size);
  });

  it('detects transitive reachability through multiple hops', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: [], delegatesTo: ['B'], delegationDepth: 2, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: [], delegatesTo: ['C'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
      { name: 'C', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];
    const memoryIntents: MemoryIntent[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'session', line: 3 },
    ];

    const ast = makeAST({ memory: [{ source: 'MEMORY.md', intents: memoryIntents }] });
    const entries = detectDataLabelMismatch(ast, makeManifest({ dataLabels, agents }));

    // A delegates to B delegates to C (has Read tool) — transitive chain detected
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const cEntry = entries.find(e => e.explanation.includes('C'));
    expect(cEntry).toBeDefined();
  });

  it('skips reachable agents without Read or Bash tools', () => {
    const dataLabels: DataLabelEntry[] = [
      { label: 'secrets', sensitivity: 'restricted', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];
    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Write'], delegatesTo: ['B'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Write'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];

    const entries = detectDataLabelMismatch(makeAST(), makeManifest({ dataLabels, agents }));
    expect(entries).toEqual([]);
  });
});
