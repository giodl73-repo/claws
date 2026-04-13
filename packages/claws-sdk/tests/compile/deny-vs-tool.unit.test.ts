/**
 * L0: DENY-vs-TOOL conflict detector — tokenize, semanticScore, both strategies.
 */

import { describe, it, expect } from 'vitest';
import { detectDenyVsTool } from '../../src/compile/conflicts/deny-vs-tool.js';
import type {
  GovernanceAST,
  ParsedManifest,
  SoulIntent,
  ToolEntry,
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

function makeDeny(overrides: Partial<SoulIntent> = {}): SoulIntent {
  return {
    keyword: 'never',
    confidence: 0.95,
    scope: 'tool',
    pattern: 'access production databases',
    rawLine: 'Never access production databases',
    line: 5,
    autoExtracted: true,
    intentKind: 'deny',
    ...overrides,
  };
}

function makeTool(overrides: Partial<ToolEntry> = {}): ToolEntry {
  return {
    name: 'file-read',
    normalizedName: 'file-read',
    riskClass: 2,
    oboFlag: false,
    capabilities: ['read', 'filesystem'],
    source: 'TOOLS.md',
    line: 8,
    denyConstraints: [],
    ...overrides,
  };
}

describe('detectDenyVsTool', () => {
  it('returns empty array when no deny intents and no deny constraints', () => {
    const ast = makeAST();
    const manifest = makeManifest({ tools: [makeTool()] });

    const entries = detectDenyVsTool(ast, manifest);
    expect(entries).toEqual([]);
  });

  // ── Strategy 1: Pre-cross-referenced deny constraints ──────────────

  it('emits conflict from cross-referenced denyConstraints on tool (Strategy 1)', () => {
    const deny = makeDeny({ line: 3, rawLine: 'Never deploy to production' });
    const tool = makeTool({
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      line: 10,
      denyConstraints: [deny],
    });

    const ast = makeAST();
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);

    expect(entries.length).toBe(1);
    expect(entries[0]!.category).toBe('DENY-vs-TOOL');
    expect(entries[0]!.code).toBe('CLAWS-C001');
    expect(entries[0]!.severity).toBe('Error');
    expect(entries[0]!.locationA.file).toBe('SOUL.md');
    expect(entries[0]!.locationA.line).toBe(3);
    expect(entries[0]!.locationB.file).toBe('TOOLS.md');
    expect(entries[0]!.locationB.line).toBe(10);
    expect(entries[0]!.explanation).toContain('prod-deploy');
  });

  it('emits multiple conflicts from multiple denyConstraints on one tool', () => {
    const deny1 = makeDeny({ line: 3, rawLine: 'Never deploy' });
    const deny2 = makeDeny({ line: 7, rawLine: 'Must not write production' });
    const tool = makeTool({
      name: 'prod-deploy',
      line: 10,
      denyConstraints: [deny1, deny2],
    });

    const ast = makeAST();
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);
    expect(entries.length).toBe(2);
  });

  // ── Strategy 2: Semantic matching ──────────────────────────────────

  it('emits conflict via semantic matching when deny pattern overlaps tool capabilities', () => {
    const deny = makeDeny({
      pattern: 'deploy production servers',
      rawLine: 'Never deploy production servers',
      line: 5,
    });

    const tool = makeTool({
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      capabilities: ['deploy', 'production', 'servers'],
      line: 12,
      denyConstraints: [],  // No cross-refs — must use semantic matching
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);

    // Should have at least one semantic match
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const semantic = entries.find(e => e.explanation.includes('score'));
    expect(semantic).toBeDefined();
    expect(semantic!.category).toBe('DENY-vs-TOOL');
    expect(semantic!.severity).toBe('Error');
  });

  it('does not emit semantic match when overlap is below threshold', () => {
    const deny = makeDeny({
      pattern: 'modify encryption keys',
      rawLine: 'Never modify encryption keys',
      line: 5,
    });

    const tool = makeTool({
      name: 'file-read',
      normalizedName: 'file-read',
      capabilities: ['read', 'filesystem'],
      line: 12,
      denyConstraints: [],
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);
    expect(entries.length).toBe(0);
  });

  it('does not duplicate conflict already found by Strategy 1', () => {
    const deny = makeDeny({
      pattern: 'deploy production',
      rawLine: 'Never deploy production',
      line: 5,
    });

    const tool = makeTool({
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      capabilities: ['deploy', 'production'],
      line: 12,
      denyConstraints: [deny],  // Already cross-referenced
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);

    // Same line pair should not be duplicated
    const pairs = entries.map(e => `${e.locationA.line}:${e.locationB.line}`);
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(pairs.length);
  });

  // ── Edge cases: tokenize and semanticScore internals ───────────────

  it('handles deny pattern with only stop words (zero meaningful tokens)', () => {
    const deny = makeDeny({
      pattern: 'the to in of and or for',
      rawLine: 'the to in of and or for',
      line: 5,
    });

    const tool = makeTool({
      name: 'anything',
      capabilities: ['the', 'to', 'in'],
      line: 12,
      denyConstraints: [],
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    // Zero meaningful tokens means score=0, no conflict
    const entries = detectDenyVsTool(ast, manifest);
    expect(entries.length).toBe(0);
  });

  it('handles empty deny pattern', () => {
    const deny = makeDeny({
      pattern: '',
      rawLine: '',
      line: 5,
    });

    const tool = makeTool({
      name: 'anything',
      capabilities: ['deploy'],
      line: 12,
      denyConstraints: [],
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    // Empty pattern has no tokens, score=0
    const entries = detectDenyVsTool(ast, manifest);
    expect(entries.length).toBe(0);
  });

  it('tokenizes punctuation and single-char words correctly', () => {
    // Deny pattern with punctuation-heavy text — tokens are stripped
    const deny = makeDeny({
      pattern: 'database-write x a production-deploy',
      rawLine: 'Never database-write x a production-deploy',
      line: 5,
    });

    const tool = makeTool({
      name: 'db-writer',
      normalizedName: 'db-writer',
      capabilities: ['database-write', 'production-deploy'],
      line: 12,
      denyConstraints: [],
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);
    // "database-write" and "production-deploy" should match tool capabilities
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it('matches across multiple deny groups and multiple tools', () => {
    const deny1 = makeDeny({
      pattern: 'deploy servers production',
      rawLine: 'Never deploy servers production',
      line: 3,
    });
    const deny2 = makeDeny({
      pattern: 'read sensitive credentials',
      rawLine: 'Never read sensitive credentials',
      line: 7,
    });

    const tool1 = makeTool({
      name: 'prod-deploy',
      capabilities: ['deploy', 'production', 'servers'],
      line: 10,
      denyConstraints: [],
    });
    const tool2 = makeTool({
      name: 'cred-reader',
      capabilities: ['read', 'sensitive', 'credentials'],
      source: 'TOOLS.md',
      line: 15,
      denyConstraints: [],
    });

    const ast = makeAST({
      deny: [
        { source: 'SOUL.md', intents: [deny1] },
        { source: 'SOUL.md', intents: [deny2] },
      ],
    });
    const manifest = makeManifest({ tools: [tool1, tool2] });

    const entries = detectDenyVsTool(ast, manifest);
    // Should match deny1→tool1 and deny2→tool2
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it('uses tool name tokens in semantic matching (not just capabilities)', () => {
    // The tokenizer preserves hyphens, so "production-deploy" is one token.
    // Use a deny pattern that matches the hyphenated token directly.
    const deny = makeDeny({
      pattern: 'production-deploy forbidden',
      rawLine: 'Never use production-deploy forbidden',
      line: 5,
    });

    const tool = makeTool({
      name: 'production-deploy',
      normalizedName: 'production-deploy',
      capabilities: [],
      line: 12,
      denyConstraints: [],
    });

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [deny] }],
    });
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectDenyVsTool(ast, manifest);
    // Deny token "production-deploy" matches tool name token "production-deploy"
    // Score = 1/2 meaningful tokens = 0.50 >= 0.3 threshold
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });
});
