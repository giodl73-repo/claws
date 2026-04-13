/**
 * L0: OBO-WITHOUT-ELICIT conflict detector unit tests.
 *
 * Covers:
 * 1. R4 OBO tool without gate triggers Error
 * 2. R3 OBO tool without gate triggers Warning
 * 3. R2 OBO tool is skipped (below R3 threshold)
 * 4. Non-OBO tool is skipped even at R5
 * 5. SOUL.md elicit intent matching tool name satisfies the gate
 * 6. USER.md authority bounds matching tool name satisfies the gate
 * 7. USER.md authority bounds matching risk class range satisfies the gate
 * 8. USER.md authority bounds with exact risk class satisfies the gate
 */

import { describe, it, expect } from 'vitest';
import { detectOboWithoutElicit } from '../../src/compile/conflicts/obo-without-elicit.js';
import type {
  GovernanceAST,
  ParsedManifest,
  ToolEntry,
  SoulIntent,
  AuthorityIntent,
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

function makeTool(overrides: Partial<ToolEntry> = {}): ToolEntry {
  return {
    name: 'test-tool',
    normalizedName: 'test-tool',
    riskClass: 5,
    oboFlag: true,
    capabilities: ['deploy'],
    source: 'TOOLS.md',
    line: 8,
    denyConstraints: [],
    ...overrides,
  };
}

describe('detectOboWithoutElicit()', () => {
  it('R5 OBO tool without gate triggers Error', () => {
    const tool = makeTool({ name: 'prod-deploy', riskClass: 5, oboFlag: true });
    const ast = makeAST();
    const manifest = makeManifest({ tools: [tool] });

    const entries = detectOboWithoutElicit(ast, manifest);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('OBO-WITHOUT-ELICIT');
    expect(entries[0]!.severity).toBe('Error');
    expect(entries[0]!.code).toBe('CLAWS-C003');
    expect(entries[0]!.explanation).toContain('R5');
    expect(entries[0]!.explanation).toContain('fail-closed');
  });

  it('R4 OBO tool without gate triggers Error', () => {
    const tool = makeTool({ name: 'db-write', riskClass: 4, oboFlag: true });
    const entries = detectOboWithoutElicit(makeAST(), makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.severity).toBe('Error');
  });

  it('R3 OBO tool without gate triggers Warning', () => {
    const tool = makeTool({ name: 'api-call', riskClass: 3, oboFlag: true });
    const entries = detectOboWithoutElicit(makeAST(), makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.severity).toBe('Warning');
    expect(entries[0]!.explanation).toContain('R3');
    expect(entries[0]!.explanation).toContain('user confirmation');
  });

  it('R2 OBO tool is skipped (below R3 threshold)', () => {
    const tool = makeTool({ name: 'read-file', riskClass: 2, oboFlag: true });
    const entries = detectOboWithoutElicit(makeAST(), makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(0);
  });

  it('non-OBO tool is skipped even at R5', () => {
    const tool = makeTool({ name: 'prod-deploy', riskClass: 5, oboFlag: false });
    const entries = detectOboWithoutElicit(makeAST(), makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(0);
  });

  it('SOUL.md elicit intent matching tool name satisfies the gate', () => {
    const tool = makeTool({ name: 'prod-deploy', riskClass: 5, oboFlag: true });
    const elicitIntent: SoulIntent = {
      keyword: 'require',
      confidence: 0.85,
      scope: 'tool',
      pattern: 'confirm before using prod-deploy',
      rawLine: 'Require confirm before using prod-deploy',
      line: 3,
      autoExtracted: true,
      intentKind: 'elicit',
    };

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [elicitIntent] }],
    });

    const entries = detectOboWithoutElicit(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('USER.md authority bounds matching tool name satisfies the gate', () => {
    const tool = makeTool({ name: 'prod-deploy', riskClass: 5, oboFlag: true });
    const authority: AuthorityIntent = {
      role: 'admin',
      bounds: ['Authorize prod-deploy usage'],
      line: 5,
    };

    const ast = makeAST({
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectOboWithoutElicit(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('USER.md authority bounds with risk class range satisfies the gate', () => {
    const tool = makeTool({ name: 'prod-deploy', riskClass: 4, oboFlag: true });
    const authority: AuthorityIntent = {
      role: 'admin',
      bounds: ['Approve R1-R5 tool usage'],
      line: 5,
    };

    const ast = makeAST({
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectOboWithoutElicit(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('USER.md authority bounds with exact risk class satisfies the gate', () => {
    const tool = makeTool({ name: 'api-call', riskClass: 3, oboFlag: true });
    const authority: AuthorityIntent = {
      role: 'dev',
      bounds: ['Approve R3 calls'],
      line: 3,
    };

    const ast = makeAST({
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectOboWithoutElicit(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('USER.md authority bounds range that excludes tool risk class does not satisfy gate', () => {
    const tool = makeTool({ name: 'prod-deploy', riskClass: 5, oboFlag: true });
    const authority: AuthorityIntent = {
      role: 'dev',
      bounds: ['Approve R1-R3 tool usage'],
      line: 5,
    };

    const ast = makeAST({
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectOboWithoutElicit(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(1);
  });

  it('multiple OBO tools produce one entry each', () => {
    const tools = [
      makeTool({ name: 'deploy', riskClass: 5, oboFlag: true, line: 3 }),
      makeTool({ name: 'api-call', riskClass: 3, oboFlag: true, line: 8 }),
      makeTool({ name: 'read', riskClass: 1, oboFlag: true, line: 12 }),
    ];

    const entries = detectOboWithoutElicit(makeAST(), makeManifest({ tools }));

    // R5 -> Error, R3 -> Warning, R1 -> skipped
    expect(entries).toHaveLength(2);
  });
});
