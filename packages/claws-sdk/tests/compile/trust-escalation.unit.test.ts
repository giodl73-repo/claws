/**
 * L0: TRUST-ESCALATION conflict detector unit tests.
 *
 * Covers uncovered branches:
 * 1. No escalation when child max risk < 4 — lines 102
 * 2. No escalation when parentTrust >= childMaxRisk — line 102
 * 3. Fallback to intent.line when agent not in agentLineMap — lines 103-104
 * 4. Fallback to trustMap default (1) when agent not in trustMap — line 94
 * 5. Tool lookup fallback (normalized vs original name) — line 51
 * 6. Custom defaultTrustTier parameter
 */

import { describe, it, expect } from 'vitest';
import { detectTrustEscalation } from '../../src/compile/conflicts/trust-escalation.js';
import type {
  GovernanceAST,
  ParsedManifest,
  DelegationIntent,
  ToolEntry,
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

describe('detectTrustEscalation()', () => {
  it('returns empty when no delegation edges exist', () => {
    const entries = detectTrustEscalation(makeAST(), makeManifest());
    expect(entries).toEqual([]);
  });

  it('returns empty when child has tools below R4', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'Parent', to: 'Child', tools: ['read-tool'], line: 5 },
    ];
    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });
    const agents: AgentRosterEntry[] = [
      { name: 'Parent', tools: ['Read'], delegatesTo: ['Child'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Child', tools: ['read-tool'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];
    const tools: ToolEntry[] = [
      { name: 'read-tool', normalizedName: 'read-tool', riskClass: 2, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];
    const manifest = makeManifest({ agents, tools });

    const entries = detectTrustEscalation(ast, manifest);
    expect(entries).toEqual([]);
  });

  it('returns empty when parent trust >= child max risk', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'Parent', to: 'Child', tools: ['deploy'], line: 5 },
    ];
    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });
    const agents: AgentRosterEntry[] = [
      { name: 'Parent', tools: ['Read'], delegatesTo: ['Child'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Child', tools: ['deploy'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];
    const tools: ToolEntry[] = [
      { name: 'deploy', normalizedName: 'deploy', riskClass: 4, oboFlag: false, capabilities: ['deploy'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];
    const manifest = makeManifest({ agents, tools });

    // defaultTrustTier = 5 means parent trust is 5 >= childMaxRisk 4
    const entries = detectTrustEscalation(ast, manifest, 5);
    expect(entries).toEqual([]);
  });

  it('detects escalation when child has R5 tools under T1 parent', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'Manager', to: 'Deployer', tools: ['prod-deploy'], line: 5 },
    ];
    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });
    const agents: AgentRosterEntry[] = [
      { name: 'Manager', tools: ['Read'], delegatesTo: ['Deployer'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Deployer', tools: ['prod-deploy'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 10 },
    ];
    const tools: ToolEntry[] = [
      { name: 'prod-deploy', normalizedName: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], source: 'TOOLS.md', line: 8, denyConstraints: [] },
    ];
    const manifest = makeManifest({ agents, tools });

    const entries = detectTrustEscalation(ast, manifest);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('TRUST-ESCALATION');
    expect(entries[0]!.code).toBe('CLAWS-C002');
    expect(entries[0]!.severity).toBe('Error');
    expect(entries[0]!.explanation).toContain('T1');
    expect(entries[0]!.explanation).toContain('R5');
  });

  it('falls back to intent.line when agent not in agentLineMap', () => {
    // Delegation edge references agents not in manifest.agents (no line info in map)
    const delegationIntents: DelegationIntent[] = [
      { from: 'Ghost-Parent', to: 'Worker', tools: ['danger-tool'], line: 42 },
    ];
    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });
    // Worker is in manifest.agents but Ghost-Parent is not
    const agents: AgentRosterEntry[] = [
      { name: 'Worker', tools: ['danger-tool'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 20 },
    ];
    const tools: ToolEntry[] = [
      { name: 'danger-tool', normalizedName: 'danger-tool', riskClass: 5, oboFlag: false, capabilities: ['write'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];
    const manifest = makeManifest({ agents, tools });

    const entries = detectTrustEscalation(ast, manifest);

    expect(entries).toHaveLength(1);
    // parentLine falls back to intent.line (42) because Ghost-Parent not in agentLineMap
    expect(entries[0]!.locationA.line).toBe(42);
    expect(entries[0]!.locationB.line).toBe(20);
  });

  it('skips delegation edge when child agent not found in manifest', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'Parent', to: 'NonExistent', tools: ['danger-tool'], line: 5 },
    ];
    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });
    const agents: AgentRosterEntry[] = [
      { name: 'Parent', tools: ['Read'], delegatesTo: ['NonExistent'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
    ];
    const tools: ToolEntry[] = [
      { name: 'danger-tool', normalizedName: 'danger-tool', riskClass: 5, oboFlag: false, capabilities: ['write'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];
    const manifest = makeManifest({ agents, tools });

    const entries = detectTrustEscalation(ast, manifest);
    expect(entries).toEqual([]);
  });

  it('uses original tool name when normalized lookup misses', () => {
    // Tool registered with non-standard casing — exercise both lookup paths in maxToolRisk
    const delegationIntents: DelegationIntent[] = [
      { from: 'Boss', to: 'Agent', tools: ['PROD_DEPLOY'], line: 5 },
    ];
    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });
    const agents: AgentRosterEntry[] = [
      { name: 'Boss', tools: ['Read'], delegatesTo: ['Agent'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Agent', tools: ['PROD_DEPLOY'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 10 },
    ];
    // Tool is registered by exact name PROD_DEPLOY but normalizedName is different
    const tools: ToolEntry[] = [
      { name: 'PROD_DEPLOY', normalizedName: 'prod_deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], source: 'TOOLS.md', line: 8, denyConstraints: [] },
    ];
    const manifest = makeManifest({ agents, tools });

    const entries = detectTrustEscalation(ast, manifest);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.explanation).toContain('R5');
  });
});
