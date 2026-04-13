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
