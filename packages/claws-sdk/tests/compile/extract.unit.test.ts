/**
 * L0: Extract unit tests — ParsedManifest extraction from GovernanceAST.
 *
 * 3 unit tests covering:
 * 1. extract() produces ParsedManifest with tool entries (name, risk level, capabilities)
 * 2. extract() produces agent roster from AGENTS.md delegation intents
 * 3. extract() produces data label inventory from MEMORY.md memory intents
 */

import { describe, it, expect } from 'vitest';
import { extract } from '../../src/compile/extract.js';
import type {
  GovernanceAST,
  SoulIntent,
  ToolManifestEntry,
  DelegationIntent,
  MemoryIntent,
  SkillIntent,
} from '../../src/compile/types.js';

/** Helper to create a minimal GovernanceAST with specific categories populated. */
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

describe('extract() — tool entries', () => {
  it('produces ParsedManifest with tool entries from AST', () => {
    const toolIntents: ToolManifestEntry[] = [
      {
        name: 'Bash',
        riskClass: 2,
        oboFlag: false,
        capabilities: ['read', 'execute'],
        description: 'Shell access.',
        line: 3,
      },
      {
        name: 'prod-deploy',
        riskClass: 5,
        oboFlag: true,
        capabilities: ['write', 'execute'],
        description: 'Deploy to production.',
        line: 8,
      },
    ];

    const denyIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'tool',
        pattern: 'use prod-deploy in development',
        rawLine: 'Never use prod-deploy in development',
        line: 5,
        autoExtracted: true,
        intentKind: 'deny',
      },
    ];

    const ast = makeAST({
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      deny: [{ source: 'SOUL.md', intents: denyIntents }],
    });

    const manifest = extract(ast);

    expect(manifest.tools).toHaveLength(2);

    // Bash tool entry
    const bash = manifest.tools.find(t => t.name === 'Bash');
    expect(bash).toBeDefined();
    expect(bash!.normalizedName).toBe('bash');
    expect(bash!.riskClass).toBe(2);
    expect(bash!.oboFlag).toBe(false);
    expect(bash!.capabilities).toContain('read');
    expect(bash!.capabilities).toContain('execute');
    expect(bash!.source).toBe('TOOLS.md');
    expect(bash!.denyConstraints).toHaveLength(0);

    // prod-deploy tool entry with deny constraint
    const prodDeploy = manifest.tools.find(t => t.name === 'prod-deploy');
    expect(prodDeploy).toBeDefined();
    expect(prodDeploy!.normalizedName).toBe('prod-deploy');
    expect(prodDeploy!.riskClass).toBe(5);
    expect(prodDeploy!.oboFlag).toBe(true);
    expect(prodDeploy!.denyConstraints).toHaveLength(1);
    expect(prodDeploy!.denyConstraints[0]!.keyword).toBe('never');
  });
});

describe('extract() — agent roster', () => {
  it('produces agent roster from delegation intents', () => {
    const delegationIntents: DelegationIntent[] = [
      {
        from: 'Security Auditor',
        to: 'Compliance Checker',
        tools: ['Read', 'Bash'],
        line: 3,
      },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);

    expect(manifest.agents.length).toBeGreaterThanOrEqual(2);

    // Security Auditor agent
    const auditor = manifest.agents.find(a => a.name === 'Security Auditor');
    expect(auditor).toBeDefined();
    expect(auditor!.delegatesTo).toContain('Compliance Checker');
    expect(auditor!.source).toBe('AGENTS.md');

    // Compliance Checker agent (target)
    const checker = manifest.agents.find(a => a.name === 'Compliance Checker');
    expect(checker).toBeDefined();
    expect(checker!.tools).toContain('Read');
    expect(checker!.tools).toContain('Bash');
  });
});

describe('extract() — skill entries', () => {
  it('produces skill entries from skill intents', () => {
    const skillIntents: SkillIntent[] = [
      { name: 'build-run', description: 'Build and run', requiredTools: ['Bash', 'Read'], line: 3 },
    ];

    const ast = makeAST({
      skill: [{ source: 'skills/', intents: skillIntents }],
    });

    const manifest = extract(ast);

    expect(manifest.skills).toHaveLength(1);
    expect(manifest.skills[0]!.name).toBe('build-run');
    expect(manifest.skills[0]!.requiredTools).toContain('Bash');
    expect(manifest.skills[0]!.source).toBe('skills/');
  });
});

describe('extract() — delegation depth and agent fallbacks', () => {
  it('computes delegation depth for multi-hop chain', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'Root', to: 'Mid', tools: ['Read'], line: 3 },
      { from: 'Mid', to: 'Leaf', tools: ['Write'], line: 5 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);

    const root = manifest.agents.find(a => a.name === 'Root');
    expect(root).toBeDefined();
    expect(root!.delegationDepth).toBe(2);

    const mid = manifest.agents.find(a => a.name === 'Mid');
    expect(mid).toBeDefined();
    expect(mid!.delegationDepth).toBe(1);

    const leaf = manifest.agents.find(a => a.name === 'Leaf');
    expect(leaf).toBeDefined();
    expect(leaf!.delegationDepth).toBe(0);
  });

  it('handles delegation cycle without infinite loop in depth computation', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'A', to: 'B', tools: ['Read'], line: 3 },
      { from: 'B', to: 'A', tools: ['Read'], line: 5 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);

    // Both should have depth >= 1 and not hang
    const a = manifest.agents.find(ag => ag.name === 'A');
    expect(a).toBeDefined();
    expect(a!.delegationDepth).toBeGreaterThanOrEqual(1);
  });

  it('uses default source AGENTS.md when agent has no explicit source', () => {
    // Single delegation edge — both agents get source from group.source
    const delegationIntents: DelegationIntent[] = [
      { from: 'Alpha', to: 'Beta', tools: [], line: 10 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'custom-agents.md', intents: delegationIntents }],
    });

    const manifest = extract(ast);
    const alpha = manifest.agents.find(a => a.name === 'Alpha');
    expect(alpha).toBeDefined();
    expect(alpha!.source).toBe('custom-agents.md');
  });

  it('agent only referenced as "to" has empty delegatesTo and tools from intent', () => {
    // When an agent appears only as a "to" target, it gets tools from the intent
    // but has no delegation targets of its own
    const delegationIntents: DelegationIntent[] = [
      { from: 'Manager', to: 'Worker', tools: ['Read', 'Write'], line: 5 },
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

  it('agent referenced in multiple delegation groups accumulates tools', () => {
    // Two different groups reference the same target agent with different tools
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
  });

  it('deny intent with scope not "tool" does not cross-reference tools', () => {
    const toolIntents: ToolManifestEntry[] = [
      { name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read files', line: 3 },
    ];

    const denyIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'action', // Not 'tool' — should be skipped
        pattern: 'read production data',
        rawLine: 'Never read production data',
        line: 5,
        autoExtracted: true,
        intentKind: 'deny',
      },
    ];

    const ast = makeAST({
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      deny: [{ source: 'SOUL.md', intents: denyIntents }],
    });

    const manifest = extract(ast);
    const readTool = manifest.tools.find(t => t.name === 'Read');
    expect(readTool).toBeDefined();
    expect(readTool!.denyConstraints).toHaveLength(0);
  });
});

describe('extract() — data label inventory', () => {
  it('produces data labels from memory intents', () => {
    const memoryIntents: MemoryIntent[] = [
      {
        label: 'Security Incident 2026-03-15',
        sensitivity: 'internal',
        retention: 'dated',
        line: 3,
      },
      {
        label: 'Policy Update 2026-04-01',
        sensitivity: 'internal',
        retention: 'dated',
        line: 7,
      },
    ];

    const ast = makeAST({
      memory: [{ source: 'MEMORY.md', intents: memoryIntents }],
    });

    const manifest = extract(ast);

    expect(manifest.dataLabels).toHaveLength(2);

    const incident = manifest.dataLabels.find(d => d.label === 'Security Incident 2026-03-15');
    expect(incident).toBeDefined();
    expect(incident!.sensitivity).toBe('internal');
    expect(incident!.retention).toBe('dated');
    expect(incident!.source).toBe('MEMORY.md');
    expect(incident!.line).toBe(3);

    const policy = manifest.dataLabels.find(d => d.label === 'Policy Update 2026-04-01');
    expect(policy).toBeDefined();
    expect(policy!.sensitivity).toBe('internal');
  });
});
