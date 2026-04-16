/**
 * L0 unit tests for HoverProvider.
 *
 * 2 tests:
 *   1. Risk card shows R-level classification for a tool
 *   2. OBO status is displayed correctly in the hover card
 */

import { describe, it, expect } from 'vitest';
import {
  computeHover,
  buildRiskCard,
  findTool,
  extractToolMeta,
  riskToNumeric,
  numericToRLabel,
  wordAt,
} from '../../src/providers/hover.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

/** Build a minimal GovernanceIR with tool entries. */
function makeIR(tools: readonly {
  name: string;
  riskLevel: string;
  description?: string;
  oboFlag?: boolean;
  classification?: string;
  capabilities?: readonly string[];
}[] = []): GovernanceIRLike {
  return {
    capabilities: {
      tools: tools.map((t) => ({
        name: t.name,
        riskLevel: t.riskLevel,
        description: t.description ?? `Tool ${t.name}`,
        oboFlag: t.oboFlag ?? false,
        classification: t.classification ?? 'custom',
        capabilities: t.capabilities,
      })),
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-15T00:00:00Z',
      schemaVersion: 1,
    },
  };
}

describe('HoverProvider', () => {
  it('risk card shows R-level classification for a tool', () => {
    const ir = makeIR([
      {
        name: 'shell-exec',
        riskLevel: 'high',
        description: 'Execute shell commands',
        classification: 'execution',
        capabilities: ['file-system', 'process-management'],
      },
    ]);

    const hover = computeHover('"tools": ["shell-exec"]', 13, ir);
    expect(hover).toBeDefined();

    const { contents } = hover!;
    // Should contain the tool name and R-level
    expect(contents).toContain('shell-exec');
    expect(contents).toContain('R4');
    expect(contents).toContain('Risk Level: R4');
    // Should contain the severity bar
    expect(contents).toContain('\u2588'); // Filled blocks
    expect(contents).toContain('\u2591'); // Empty blocks

    // Should show capabilities
    expect(contents).toContain('file-system');
    expect(contents).toContain('process-management');

    // Should show classification
    expect(contents).toContain('execution');

    // Should show description
    expect(contents).toContain('Execute shell commands');
  });

  it('OBO status is displayed correctly in the hover card', () => {
    const irOboEnabled = makeIR([
      { name: 'send-email', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
    ]);

    const hoverEnabled = computeHover('send-email', 5, irOboEnabled);
    expect(hoverEnabled).toBeDefined();
    expect(hoverEnabled!.contents).toContain('**OBO Status:** Enabled');
    expect(hoverEnabled!.contents).toContain('R5');

    const irOboDisabled = makeIR([
      { name: 'file-read', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
    ]);

    const hoverDisabled = computeHover('file-read', 4, irOboDisabled);
    expect(hoverDisabled).toBeDefined();
    expect(hoverDisabled!.contents).toContain('**OBO Status:** Disabled');
    expect(hoverDisabled!.contents).toContain('R2');
  });

  it('riskToNumeric maps all risk levels correctly', () => {
    expect(riskToNumeric('R1')).toBe(1);
    expect(riskToNumeric('R2')).toBe(2);
    expect(riskToNumeric('R3')).toBe(3);
    expect(riskToNumeric('R4')).toBe(4);
    expect(riskToNumeric('R5')).toBe(5);
    expect(riskToNumeric('minimal')).toBe(1);
    expect(riskToNumeric('low')).toBe(2);
    expect(riskToNumeric('medium')).toBe(3);
    expect(riskToNumeric('high')).toBe(4);
    expect(riskToNumeric('critical')).toBe(5);
    expect(riskToNumeric('unknown')).toBe(0);
  });

  it('numericToRLabel maps levels 1-5 and unknown', () => {
    expect(numericToRLabel(1)).toBe('R1');
    expect(numericToRLabel(2)).toBe('R2');
    expect(numericToRLabel(3)).toBe('R3');
    expect(numericToRLabel(4)).toBe('R4');
    expect(numericToRLabel(5)).toBe('R5');
    expect(numericToRLabel(0)).toBe('R?');
    expect(numericToRLabel(6)).toBe('R?');
  });

  it('wordAt extracts the word under cursor', () => {
    expect(wordAt('hello world', 2)).toBe('hello');
    expect(wordAt('hello world', 7)).toBe('world');
    expect(wordAt('"shell-exec"', 3)).toBe('shell-exec');
    expect(wordAt('["tool-a", "tool-b"]', 3)).toBe('tool-a');
    expect(wordAt('', 0)).toBe('');
    expect(wordAt('word', -1)).toBe('');
    expect(wordAt('word', 10)).toBe('');
  });

  it('computeHover returns undefined for unknown tool names', () => {
    const ir = makeIR([{ name: 'known-tool', riskLevel: 'low' }]);
    const hover = computeHover('"tools": ["unknown-tool"]', 13, ir);
    expect(hover).toBeUndefined();
  });

  it('computeHover returns undefined without document or IR', () => {
    const ir = makeIR([]);
    const hover = computeHover('some-text', 4, ir);
    expect(hover).toBeUndefined();
  });

  it('findTool returns undefined when tool not in IR', () => {
    const ir = makeIR([{ name: 'a', riskLevel: 'low' }]);
    expect(findTool(ir, 'b')).toBeUndefined();
    expect(findTool(ir, 'a')).toBeDefined();
    expect(findTool(ir, 'a')!.name).toBe('a');
  });

  it('extractToolMeta returns empty for IR without tools', () => {
    const ir: GovernanceIRLike = {
      capabilities: {},
      analysis: {},
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };
    expect(extractToolMeta(ir)).toHaveLength(0);
  });

  it('buildRiskCard includes all sections for a fully-populated tool', () => {
    const card = buildRiskCard({
      name: 'test-tool',
      riskLevel: 'medium',
      description: 'A test tool',
      oboFlag: true,
      classification: 'testing',
      capabilities: ['read', 'write'],
    });

    expect(card.contents).toContain('**test-tool**');
    expect(card.contents).toContain('R3');
    expect(card.contents).toContain('**OBO Status:** Enabled');
    expect(card.contents).toContain('**Classification:** testing');
    expect(card.contents).toContain('**Capabilities:**');
    expect(card.contents).toContain('- read');
    expect(card.contents).toContain('- write');
    expect(card.contents).toContain('> A test tool');
  });

  it('buildRiskCard omits capabilities section when empty', () => {
    const card = buildRiskCard({
      name: 'minimal-tool',
      riskLevel: 'low',
      description: '',
      oboFlag: false,
      classification: 'unclassified',
    });

    expect(card.contents).not.toContain('**Capabilities:**');
    expect(card.contents).not.toContain('> '); // No description line
  });

  it('extractToolMeta sets defaults for missing optional fields', () => {
    const ir: GovernanceIRLike = {
      capabilities: {
        tools: [{ name: 'sparse', riskLevel: 'low' }],
      },
      analysis: {},
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const tools = extractToolMeta(ir);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.description).toBe('');
    expect(tools[0]!.oboFlag).toBe(false);
    expect(tools[0]!.classification).toBe('unclassified');
  });
});
