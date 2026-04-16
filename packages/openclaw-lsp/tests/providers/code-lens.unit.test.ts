/**
 * L0 unit tests for CodeLensProvider.
 *
 * 3 tests:
 *   1. Aggregate calculation correct — tools, risk breakdown, OBO, tensions
 *   2. Display format matches spec
 *   3. Empty section renders no lens
 */

import { describe, it, expect } from 'vitest';
import {
  parseSections,
  computeAggregates,
  formatRiskBreakdown,
  formatCodeLens,
  computeCodeLenses,
  type SectionAggregate,
  type Section,
} from '../../src/providers/code-lens.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';
import type { TensionDiagnostic } from '../../src/providers/diagnostic.js';

/** Build a GovernanceIR-like with tools and delegation entries. */
function makeIR(overrides: {
  tools?: readonly { name: string; riskLevel: string }[];
  delegationMap?: readonly { ruleId: string; target: string }[];
} = {}): GovernanceIRLike {
  return {
    capabilities: {
      tools: overrides.tools ?? [],
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
    delegationMap: overrides.delegationMap ?? [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.37.0',
      compiledAt: '2026-04-15T00:00:00Z',
      schemaVersion: 1,
    },
  };
}

/** Build a tension diagnostic targeting a specific line. */
function makeTension(targetUri: string, line: number, code: string): TensionDiagnostic {
  return {
    targetUri,
    diagnostic: {
      range: { start: { line, character: 0 }, end: { line, character: 10 } },
      severity: 2,
      code,
      source: 'claws-tension',
      message: `Tension at line ${line}`,
    },
  };
}

describe('CodeLensProvider', () => {
  it('computes aggregate calculation correctly', () => {
    const content = [
      '# Tool Registry',
      '',
      '## Execution Tools',
      'tool: shell-exec (critical)',
      'tool: rm-rf (high)',
      'delegate: cleanup-bot',
      '',
      '## Data Tools',
      'tool: read-file (low)',
      'tool: query-db (medium)',
    ].join('\n');

    const ir = makeIR({
      tools: [
        { name: 'shell-exec', riskLevel: 'critical' },
        { name: 'rm-rf', riskLevel: 'high' },
        { name: 'read-file', riskLevel: 'low' },
        { name: 'query-db', riskLevel: 'medium' },
      ],
      delegationMap: [
        { ruleId: 'DEL-01', target: 'cleanup-bot' },
      ],
    });

    const uri = 'file:///ws/TOOLS.md';
    const tensions: TensionDiagnostic[] = [
      makeTension(uri, 3, 'CLAWS-T001'), // line 3 → in "Execution Tools" section
    ];

    const aggregates = computeAggregates(content, ir, tensions, uri);

    // "Tool Registry" section (lines 0-2): no tools directly
    // "Execution Tools" section (lines 2-7): shell-exec, rm-rf, cleanup-bot, 1 tension
    // "Data Tools" section (lines 7-9): read-file, query-db

    // Find the Execution Tools aggregate
    const execAgg = aggregates.find((a) => a.section.title === 'Execution Tools');
    expect(execAgg).toBeDefined();
    expect(execAgg!.toolCount).toBe(2);
    expect(execAgg!.riskBreakdown['R4']).toBe(1);  // high → R4
    expect(execAgg!.riskBreakdown['R5']).toBe(1);  // critical → R5
    expect(execAgg!.oboCount).toBe(1);             // cleanup-bot delegation
    expect(execAgg!.tensionCount).toBe(1);          // 1 tension on line 3

    // Find the Data Tools aggregate
    const dataAgg = aggregates.find((a) => a.section.title === 'Data Tools');
    expect(dataAgg).toBeDefined();
    expect(dataAgg!.toolCount).toBe(2);
    expect(dataAgg!.riskBreakdown['R2']).toBe(1);  // low → R2
    expect(dataAgg!.riskBreakdown['R3']).toBe(1);  // medium → R3
    expect(dataAgg!.oboCount).toBe(0);
    expect(dataAgg!.tensionCount).toBe(0);
  });

  it('display format matches spec', () => {
    // Test formatRiskBreakdown
    expect(formatRiskBreakdown({ R3: 1, R5: 2 })).toBe('1xR3, 2xR5');
    expect(formatRiskBreakdown({ R1: 3 })).toBe('3xR1');
    expect(formatRiskBreakdown({})).toBe('');

    // Test formatCodeLens with full spec format
    const aggregate: SectionAggregate = {
      section: { title: 'Tools', startLine: 0, endLine: 10 },
      toolCount: 3,
      riskBreakdown: { R3: 1, R5: 2 },
      oboCount: 2,
      tensionCount: 1,
    };

    const display = formatCodeLens(aggregate);
    expect(display).toBe('3 tools: 1xR3, 2xR5 | 2 OBO boundaries | 1 tension');

    // Test with only tools (no OBO, no tensions)
    const toolsOnly: SectionAggregate = {
      section: { title: 'Tools', startLine: 0, endLine: 5 },
      toolCount: 2,
      riskBreakdown: { R1: 2 },
      oboCount: 0,
      tensionCount: 0,
    };
    expect(formatCodeLens(toolsOnly)).toBe('2 tools: 2xR1');

    // Test with only OBO (no tools, no tensions)
    const oboOnly: SectionAggregate = {
      section: { title: 'Delegation', startLine: 0, endLine: 5 },
      toolCount: 0,
      riskBreakdown: {},
      oboCount: 3,
      tensionCount: 0,
    };
    expect(formatCodeLens(oboOnly)).toBe('3 OBO boundaries');

    // Test with only tensions
    const tensionOnly: SectionAggregate = {
      section: { title: 'Conflicts', startLine: 0, endLine: 5 },
      toolCount: 0,
      riskBreakdown: {},
      oboCount: 0,
      tensionCount: 4,
    };
    expect(formatCodeLens(tensionOnly)).toBe('4 tension');

    // Test computeCodeLenses places lens on section heading line
    const content = '# Section A\ntool: alpha (high)\n# Section B\ntool: beta (low)';
    const ir = makeIR({
      tools: [
        { name: 'alpha', riskLevel: 'high' },
        { name: 'beta', riskLevel: 'low' },
      ],
    });
    const lenses = computeCodeLenses(content, ir, [], 'file:///test.md');
    expect(lenses.length).toBe(2);
    expect(lenses[0]!.line).toBe(0); // Section A heading
    expect(lenses[1]!.line).toBe(2); // Section B heading
    expect(lenses[0]!.display).toContain('1 tools');
    expect(lenses[0]!.display).toContain('R4');
  });

  it('empty section renders no code lens annotation', () => {
    const content = [
      '# Empty Section',
      '',
      'No tools, no delegation, no conflicts here.',
      '',
      '# Another Empty',
      'Just text content.',
    ].join('\n');

    const ir = makeIR(); // No tools, no delegation
    const lenses = computeCodeLenses(content, ir, [], 'file:///ws/EMPTY.md');

    // Both sections are empty — no lenses should be generated
    expect(lenses).toHaveLength(0);

    // Also test parseSections recognizes the headings
    const sections = parseSections(content);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.title).toBe('Empty Section');
    expect(sections[1]!.title).toBe('Another Empty');

    // Aggregates should be empty too
    const aggregates = computeAggregates(content, ir, [], 'file:///ws/EMPTY.md');
    expect(aggregates).toHaveLength(0);
  });

  it('parseSections handles content with no headings', () => {
    const content = 'Just plain text\nWith multiple lines\nBut no headings';
    const sections = parseSections(content);
    expect(sections).toHaveLength(0);
  });

  it('parseSections handles ### headings', () => {
    const content = '### Sub-heading\nContent here';
    const sections = parseSections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe('Sub-heading');
  });

  it('formatRiskBreakdown sorts labels alphabetically', () => {
    const breakdown = { R5: 1, R1: 2, R3: 1 };
    expect(formatRiskBreakdown(breakdown)).toBe('2xR1, 1xR3, 1xR5');
  });

  it('unknown risk levels normalize to R?', () => {
    const content = '# Tools\ntool: exotic (alien)';
    const ir = makeIR({ tools: [{ name: 'exotic', riskLevel: 'alien' }] });
    const aggregates = computeAggregates(content, ir, [], 'file:///test.md');
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0]!.riskBreakdown['R?']).toBe(1);
  });

  it('delegation entries without target property are skipped', () => {
    const content = '# Tools\ntool: test (low)\nbad-delegation';
    const ir: GovernanceIRLike = {
      capabilities: { tools: [{ name: 'test', riskLevel: 'low' }], skills: [], agents: [], workflows: [] },
      analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
      intents: [],
      delegationMap: ['not-an-object' as unknown, null as unknown, { mechanism: 'hook' } as unknown] as readonly unknown[],
      conflicts: { oboConflicts: [], multiConstraintConflicts: [], haltReason: null, hasOboWithoutElicit: false, totalConflicts: 0 },
      compiler: { compilerVersion: '0.37.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const aggregates = computeAggregates(content, ir, [], 'file:///test.md');
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0]!.oboCount).toBe(0);
  });

  it('tensions for different URIs are not counted', () => {
    const content = '# Section\ntool: alpha (high)';
    const ir = makeIR({ tools: [{ name: 'alpha', riskLevel: 'high' }] });
    const tensions: TensionDiagnostic[] = [
      makeTension('file:///other.md', 0, 'CLAWS-T001'), // Different URI
    ];

    const aggregates = computeAggregates(content, ir, tensions, 'file:///test.md');
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0]!.tensionCount).toBe(0);
  });
});
