/**
 * L0 unit tests for CompletionProvider.
 *
 * 2 tests:
 *   1. RELAX completion items — operators, predicates, and tool names from IR
 *   2. Policy template snippet — completions include snippet bodies with placeholders
 */

import { describe, it, expect } from 'vitest';
import {
  computeCompletions,
  detectContext,
  extractTools,
  RELAX_OPERATORS,
  RELAX_PREDICATES,
  RISK_LEVELS,
  POLICY_TEMPLATES,
  CompletionItemKind,
} from '../../src/providers/completion.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

/** Build a minimal GovernanceIR with tool entries. */
function makeIR(tools: readonly { name: string; riskLevel: string; description?: string }[] = []): GovernanceIRLike {
  return {
    capabilities: {
      tools: tools.map((t) => ({
        name: t.name,
        riskLevel: t.riskLevel,
        description: t.description ?? `Tool ${t.name}`,
        oboFlag: false,
        classification: 'custom',
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

describe('CompletionProvider', () => {
  it('RELAX completion items include operators, predicates, and tool names from IR', () => {
    const ir = makeIR([
      { name: 'shell-exec', riskLevel: 'critical' },
      { name: 'file-read', riskLevel: 'low' },
    ]);

    // Simulate cursor inside a "when" value → RELAX expression context
    const lineText = '    "when": "';
    const items = computeCompletions(lineText, lineText.length, ir);

    // Should include all RELAX operators
    for (const op of RELAX_OPERATORS) {
      const found = items.find((i) => i.label === op);
      expect(found, `Missing operator: ${op}`).toBeDefined();
      expect(found!.kind).toBe(CompletionItemKind.Keyword);
    }

    // Should include all RELAX predicates
    for (const pred of RELAX_PREDICATES) {
      const found = items.find((i) => i.label === pred);
      expect(found, `Missing predicate: ${pred}`).toBeDefined();
      expect(found!.kind).toBe(CompletionItemKind.Function);
    }

    // Should include tools from IR
    const shellItem = items.find((i) => i.label === 'shell-exec');
    expect(shellItem).toBeDefined();
    expect(shellItem!.kind).toBe(CompletionItemKind.Variable);
    expect(shellItem!.detail).toContain('critical');

    const fileItem = items.find((i) => i.label === 'file-read');
    expect(fileItem).toBeDefined();
    expect(fileItem!.detail).toContain('low');

    // Total count: operators + predicates + tools
    expect(items.length).toBe(RELAX_OPERATORS.length + RELAX_PREDICATES.length + 2);
  });

  it('policy template snippets insert valid governance patterns', () => {
    // Empty line at start → policy template context
    const lineText = '  {  ';
    // "  {  " with cursor at position after { should suggest templates
    // But for a clean test, use the direct policy-template context
    const items = computeCompletions(lineText, 3, undefined);

    // Should include policy templates
    const templateItems = items.filter((i) => i.kind === CompletionItemKind.Snippet);
    expect(templateItems.length).toBe(POLICY_TEMPLATES.length);

    // Verify the deny-by-default template
    const denyDefault = templateItems.find((i) => i.label === 'deny-by-default');
    expect(denyDefault).toBeDefined();
    expect(denyDefault!.insertText).toContain('"defaultPolicy": "deny"');
    expect(denyDefault!.insertTextFormat).toBe(2); // Snippet format
    expect(denyDefault!.documentation).toContain('Deny all');

    // Verify the least-privilege template
    const leastPriv = templateItems.find((i) => i.label === 'least-privilege');
    expect(leastPriv).toBeDefined();
    expect(leastPriv!.insertText).toContain('has_approval');
    expect(leastPriv!.insertText).toContain('is_obo');

    // Verify all templates have valid structure
    for (const tpl of templateItems) {
      expect(tpl.insertText).toBeDefined();
      expect(tpl.insertTextFormat).toBe(2);
      expect(tpl.documentation).toBeTruthy();
      expect(tpl.detail).toContain('Policy template');
    }
  });

  it('detects RELAX expression context in "when" fields', () => {
    expect(detectContext('"when": "allow ', 15).type).toBe('relax-expression');
    expect(detectContext('"unless": "not ', 15).type).toBe('relax-expression');
    expect(detectContext('"if": "risk_level', 17).type).toBe('relax-expression');
    expect(detectContext('"require": "has_', 16).type).toBe('relax-expression');
  });

  it('detects tool-name context in "tools" arrays', () => {
    expect(detectContext('"tools": ["shell', 16).type).toBe('tool-name');
    expect(detectContext('"tools": ["a", "', 16).type).toBe('tool-name');
  });

  it('detects risk-level context after risk_level comparisons', () => {
    expect(detectContext('risk_level == ', 14).type).toBe('risk-level');
    expect(detectContext('risk_level <= ', 14).type).toBe('risk-level');
    expect(detectContext('risk_level >= ', 14).type).toBe('risk-level');
  });

  it('returns RELAX + templates for unknown context', () => {
    const items = computeCompletions('some random text', 10, undefined);
    // Should contain both RELAX operators and templates
    const keywords = items.filter((i) => i.kind === CompletionItemKind.Keyword);
    const snippets = items.filter((i) => i.kind === CompletionItemKind.Snippet);
    expect(keywords.length).toBe(RELAX_OPERATORS.length);
    expect(snippets.length).toBe(POLICY_TEMPLATES.length);
  });

  it('tool-name completions resolve from workspace manifest (IR)', () => {
    const ir = makeIR([
      { name: 'api-call', riskLevel: 'medium', description: 'API access' },
      { name: 'db-write', riskLevel: 'high', description: 'DB write' },
    ]);

    const lineText = '"tools": ["';
    const items = computeCompletions(lineText, lineText.length, ir);

    expect(items).toHaveLength(2);
    expect(items[0]!.label).toBe('api-call');
    expect(items[0]!.detail).toContain('medium');
    expect(items[1]!.label).toBe('db-write');
    expect(items[1]!.detail).toContain('high');
  });

  it('tool-name completions return empty without IR', () => {
    const lineText = '"tools": ["';
    const items = computeCompletions(lineText, lineText.length, undefined);
    expect(items).toHaveLength(0);
  });

  it('risk-level completions return all 5 levels', () => {
    const lineText = 'risk_level == ';
    const items = computeCompletions(lineText, lineText.length, undefined);

    expect(items).toHaveLength(5);
    for (const level of RISK_LEVELS) {
      const found = items.find((i) => i.label === level);
      expect(found).toBeDefined();
      expect(found!.kind).toBe(CompletionItemKind.EnumMember);
    }
  });

  it('extractTools returns empty for IR without tools', () => {
    const ir: GovernanceIRLike = {
      capabilities: {},
      analysis: {},
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };
    expect(extractTools(ir)).toHaveLength(0);
  });

  it('RELAX completions without IR omit tool names', () => {
    const lineText = '"when": "';
    const items = computeCompletions(lineText, lineText.length, undefined);
    const toolItems = items.filter((i) => i.kind === CompletionItemKind.Variable);
    expect(toolItems).toHaveLength(0);
    // But still has operators + predicates
    expect(items.length).toBe(RELAX_OPERATORS.length + RELAX_PREDICATES.length);
  });

  it('sort order places operators before predicates before tools', () => {
    const ir = makeIR([{ name: 'aaa-tool', riskLevel: 'low' }]);
    const lineText = '"when": "';
    const items = computeCompletions(lineText, lineText.length, ir);

    const sortTexts = items.map((i) => i.sortText!);
    // All operator sortTexts start with "0-"
    const opSorts = items.filter((i) => i.kind === CompletionItemKind.Keyword).map((i) => i.sortText!);
    const predSorts = items.filter((i) => i.kind === CompletionItemKind.Function).map((i) => i.sortText!);
    const toolSorts = items.filter((i) => i.kind === CompletionItemKind.Variable).map((i) => i.sortText!);

    for (const s of opSorts) expect(s.startsWith('0-')).toBe(true);
    for (const s of predSorts) expect(s.startsWith('1-')).toBe(true);
    for (const s of toolSorts) expect(s.startsWith('2-')).toBe(true);
  });
});
