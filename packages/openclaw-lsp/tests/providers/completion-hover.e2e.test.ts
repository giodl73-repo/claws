/**
 * L2 E2E test for CompletionProvider + HoverProvider lifecycle.
 *
 * 1 test:
 *   1. Full lifecycle: open workspace → request completion at RELAX position →
 *      verify items → hover over tool name → verify risk card
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '../../src/server.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';
import type {
  PublishDiagnosticsParams,
  CompletionParams,
  HoverParams,
  InitializeParams,
} from 'vscode-languageserver';

/**
 * Full-fidelity compile function for E2E — extracts governance patterns.
 */
function compileGovernance(_uri: string, content: string): GovernanceIRLike {
  const tools: unknown[] = [];
  const intents: unknown[] = [];

  for (const line of content.split('\n')) {
    // tool: <name> (<risk>) [obo] [caps: a, b]
    const toolMatch = line.match(/tool:\s*(\S+)\s*\((\w+)\)(?:\s+(obo))?(?:\s+caps:\s*(.+))?/i);
    if (toolMatch) {
      const caps = toolMatch[4]?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];
      tools.push({
        name: toolMatch[1],
        riskLevel: toolMatch[2],
        description: `Governance-controlled tool: ${toolMatch[1]}`,
        oboFlag: Boolean(toolMatch[3]),
        classification: 'e2e-test',
        capabilities: caps,
      });
    }

    const denyMatch = line.match(/deny:\s*(\S+)/i);
    if (denyMatch) {
      intents.push({
        kind: 'deny',
        id: `deny-${denyMatch[1]}`,
        ruleId: 'E2E-SEC',
        level: 5,
        target: denyMatch[1],
        description: `Deny ${denyMatch[1]}`,
      });
    }
  }

  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
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
    intents,
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
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('Completion + Hover E2E lifecycle', () => {
  let published: PublishDiagnosticsParams[];
  let server: ClawsServer;

  beforeEach(() => {
    vi.useFakeTimers();
    published = [];

    const opts: ServerOptions = {
      compileFn: async (uri, content) => compileGovernance(uri, content),
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    };
    server = new ClawsServer(opts);
  });

  afterEach(() => {
    server.dispose();
    vi.useRealTimers();
  });

  it('full lifecycle: open → complete at RELAX position → verify → hover → verify risk card', async () => {
    // Step 1: Initialize server
    const initResult = server.onInitialize({} as InitializeParams);
    expect(initResult.capabilities.completionProvider).toBeDefined();
    expect(initResult.capabilities.completionProvider!.triggerCharacters).toContain('"');
    expect(initResult.capabilities.hoverProvider).toBe(true);

    // Step 2: Open a governance workspace document
    const workspaceContent = [
      '{',
      '  "manifest": {',
      '    tool: network-api (high) obo caps: http, dns-resolve',
      '    tool: file-write (critical) caps: create, delete, modify',
      '    tool: log-reader (minimal)',
      '  },',
      '  "policy": {',
      '    deny: network-api',
      '    "rules": [',
      '      { "action": "allow", "when": "risk_level <= R2 and " },',
      '      { "action": "deny", "tools": ["',
      '    ]',
      '  }',
      '}',
    ].join('\n');

    await server.onDidOpen({
      textDocument: {
        uri: 'file:///e2e/claws.json',
        languageId: 'json',
        version: 1,
        text: workspaceContent,
      },
    });

    // Verify document is tracked
    expect(server.openDocuments).toContain('file:///e2e/claws.json');

    // Step 3: Request completion at a RELAX expression position
    // Line 9: '      { "action": "allow", "when": "risk_level <= R2 and " },'
    const relaxCompletionParams: CompletionParams = {
      textDocument: { uri: 'file:///e2e/claws.json' },
      position: { line: 9, character: 55 }, // Inside "when" value
    };
    const relaxItems = server.onCompletion(relaxCompletionParams);

    // Verify RELAX operators present
    const operatorLabels = ['allow', 'deny', 'require', 'when', 'unless', 'if', 'then', 'else', 'and', 'or', 'not'];
    for (const op of operatorLabels) {
      expect(relaxItems.find((i) => i.label === op), `Missing RELAX operator: ${op}`).toBeDefined();
    }

    // Verify RELAX predicates present
    const predicateLabels = ['is_obo', 'has_approval', 'risk_level', 'in_context', 'has_label', 'is_delegated'];
    for (const pred of predicateLabels) {
      expect(relaxItems.find((i) => i.label === pred), `Missing predicate: ${pred}`).toBeDefined();
    }

    // Verify tool names from workspace manifest
    expect(relaxItems.find((i) => i.label === 'network-api')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'file-write')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'log-reader')).toBeDefined();

    // Step 4: Request completion for tool names
    // Line 10: '      { "action": "deny", "tools": ["'
    const toolCompletionParams: CompletionParams = {
      textDocument: { uri: 'file:///e2e/claws.json' },
      position: { line: 10, character: 36 },
    };
    const toolItems = server.onCompletion(toolCompletionParams);
    expect(toolItems).toHaveLength(3);
    expect(toolItems.map((i) => i.label).sort()).toEqual(['file-write', 'log-reader', 'network-api']);

    // Step 5: Hover over tool name — verify risk card
    // Line 2: '    tool: network-api (high) obo caps: http, dns-resolve'
    const hoverParams: HoverParams = {
      textDocument: { uri: 'file:///e2e/claws.json' },
      position: { line: 2, character: 14 }, // Over "network-api"
    };
    const hover = server.onHover(hoverParams);
    expect(hover).toBeDefined();

    const card = hover!.contents;
    // Verify R-level classification
    expect(card).toContain('**network-api**');
    expect(card).toContain('R4'); // high → R4
    expect(card).toContain('Risk Level: R4');

    // Verify OBO status
    expect(card).toContain('**OBO Status:** Enabled');

    // Verify capabilities list
    expect(card).toContain('**Capabilities:**');
    expect(card).toContain('- http');
    expect(card).toContain('- dns-resolve');

    // Verify classification
    expect(card).toContain('**Classification:** e2e-test');

    // Step 6: Hover over a critical tool
    const criticalHover = server.onHover({
      textDocument: { uri: 'file:///e2e/claws.json' },
      position: { line: 3, character: 12 }, // Over "file-write"
    });
    expect(criticalHover).toBeDefined();
    expect(criticalHover!.contents).toContain('R5'); // critical → R5
    expect(criticalHover!.contents).toContain('**OBO Status:** Disabled');
    expect(criticalHover!.contents).toContain('- create');
    expect(criticalHover!.contents).toContain('- delete');
    expect(criticalHover!.contents).toContain('- modify');

    // Step 7: Edit the document and verify completions update
    await server.onDidChange({
      textDocument: { uri: 'file:///e2e/claws.json', version: 2 },
      contentChanges: [{
        text: workspaceContent + '\n    tool: new-tool (medium) caps: alpha',
      }],
    });

    // Re-request tool completions — should now include the new tool
    const updatedToolItems = server.onCompletion(toolCompletionParams);
    expect(updatedToolItems.find((i) => i.label === 'new-tool')).toBeDefined();
    expect(updatedToolItems).toHaveLength(4);

    // Step 8: Close document — completions and hover should return empty/undefined
    server.onDidClose({ textDocument: { uri: 'file:///e2e/claws.json' } });

    const closedCompletion = server.onCompletion(relaxCompletionParams);
    expect(closedCompletion).toHaveLength(0);

    const closedHover = server.onHover(hoverParams);
    expect(closedHover).toBeUndefined();
  });
});
