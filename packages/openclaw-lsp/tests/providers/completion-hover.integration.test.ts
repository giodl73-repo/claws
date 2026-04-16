/**
 * L1 integration tests for CompletionProvider + HoverProvider.
 *
 * 2 tests:
 *   1. Completion + hover on a fixture workspace — full server lifecycle
 *   2. RELAX expression completion pipeline — from document open through completion request
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '../../src/server.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';
import type {
  PublishDiagnosticsParams,
  CompletionParams,
  HoverParams,
} from 'vscode-languageserver';

/**
 * Simulated compile function that extracts tool and policy data from content.
 */
function simulateCompile(_uri: string, content: string): GovernanceIRLike {
  const tools: unknown[] = [];
  const intents: unknown[] = [];

  for (const line of content.split('\n')) {
    // tool: <name> (<risk>) [obo] [caps: a, b, c]
    const toolMatch = line.match(/tool:\s*(\S+)\s*\((\w+)\)(?:\s+obo)?(?:\s+caps:\s*(.+))?/i);
    if (toolMatch) {
      const caps = toolMatch[3]?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];
      tools.push({
        name: toolMatch[1],
        riskLevel: toolMatch[2],
        description: `Tool ${toolMatch[1]}`,
        oboFlag: line.includes('obo'),
        classification: 'custom',
        capabilities: caps,
      });
    }

    const denyMatch = line.match(/deny:\s*(\S+)/i);
    if (denyMatch) {
      intents.push({
        kind: 'deny',
        id: `deny-${denyMatch[1]}`,
        ruleId: 'SEC-AUTO',
        level: 5,
        target: denyMatch[1],
        description: `Auto-deny for ${denyMatch[1]}`,
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

describe('CompletionProvider + HoverProvider integration', () => {
  let published: PublishDiagnosticsParams[];
  let server: ClawsServer;

  beforeEach(() => {
    vi.useFakeTimers();
    published = [];

    const opts: ServerOptions = {
      compileFn: async (uri, content) => simulateCompile(uri, content),
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    };
    server = new ClawsServer(opts);
  });

  afterEach(() => {
    server.dispose();
    vi.useRealTimers();
  });

  it('completion + hover on fixture workspace — full server lifecycle', async () => {
    // Open a claws.json with tool definitions
    const content = [
      '{',
      '  "tools": [',
      '    tool: shell-exec (critical) obo caps: file-system, process-mgmt',
      '    tool: file-read (low)',
      '  ],',
      '  "policy": {',
      '    "when": "risk_level >= R3 and has_approval"',
      '  }',
      '}',
    ].join('\n');

    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/claws.json',
        languageId: 'json',
        version: 1,
        text: content,
      },
    });

    // --- Completion: tool name context ---
    const toolCompletionParams: CompletionParams = {
      textDocument: { uri: 'file:///ws/claws.json' },
      position: { line: 1, character: 14 }, // Inside "tools": [
    };
    const toolCompletions = server.onCompletion(toolCompletionParams);
    // Should include tools from the manifest
    const shellCompletion = toolCompletions.find((c) => c.label === 'shell-exec');
    expect(shellCompletion).toBeDefined();
    expect(shellCompletion!.detail).toContain('critical');

    const fileCompletion = toolCompletions.find((c) => c.label === 'file-read');
    expect(fileCompletion).toBeDefined();
    expect(fileCompletion!.detail).toContain('low');

    // --- Hover: tool name ---
    const hoverParams: HoverParams = {
      textDocument: { uri: 'file:///ws/claws.json' },
      position: { line: 2, character: 12 }, // Over "shell-exec"
    };
    const hover = server.onHover(hoverParams);
    expect(hover).toBeDefined();
    expect(hover!.contents).toContain('shell-exec');
    expect(hover!.contents).toContain('R5'); // critical → R5
    expect(hover!.contents).toContain('**OBO Status:** Enabled');
    expect(hover!.contents).toContain('file-system');
    expect(hover!.contents).toContain('process-mgmt');

    // --- Hover on a different tool ---
    const hoverParams2: HoverParams = {
      textDocument: { uri: 'file:///ws/claws.json' },
      position: { line: 3, character: 12 }, // Over "file-read"
    };
    const hover2 = server.onHover(hoverParams2);
    expect(hover2).toBeDefined();
    expect(hover2!.contents).toContain('file-read');
    expect(hover2!.contents).toContain('R2'); // low → R2
    expect(hover2!.contents).toContain('**OBO Status:** Disabled');
  });

  it('RELAX expression completion pipeline — document open through completion', async () => {
    // Open a claws.json with tools defined
    const content = [
      '{',
      '  tool: api-call (medium)',
      '  tool: db-write (high)',
      '  "rules": [',
      '    { "action": "allow", "when": "risk_level <= R2 and " }',
      '    { "action": "deny", "tools": ["',
      '  ]',
      '}',
    ].join('\n');

    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/policy.json',
        languageId: 'json',
        version: 1,
        text: content,
      },
    });

    // --- RELAX expression completion (inside "when" value) ---
    // Line 4: '    { "action": "allow", "when": "risk_level <= R2 and " }'
    // Position at the end of the "when" value before closing quote
    const relaxParams: CompletionParams = {
      textDocument: { uri: 'file:///ws/policy.json' },
      position: { line: 4, character: 53 }, // Inside "when": "..."
    };
    const relaxItems = server.onCompletion(relaxParams);

    // Should include RELAX operators
    expect(relaxItems.find((i) => i.label === 'allow')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'deny')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'and')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'or')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'not')).toBeDefined();

    // Should include RELAX predicates
    expect(relaxItems.find((i) => i.label === 'is_obo')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'has_approval')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'risk_level')).toBeDefined();

    // Should include tool names from IR
    expect(relaxItems.find((i) => i.label === 'api-call')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'db-write')).toBeDefined();

    // --- Tool name completion (inside "tools" array) ---
    // Line 5: '    { "action": "deny", "tools": ["'
    const toolParams: CompletionParams = {
      textDocument: { uri: 'file:///ws/policy.json' },
      position: { line: 5, character: 35 }, // Inside "tools": ["
    };
    const toolItems = server.onCompletion(toolParams);
    // Only tool names in this context
    expect(toolItems).toHaveLength(2);
    expect(toolItems.find((i) => i.label === 'api-call')).toBeDefined();
    expect(toolItems.find((i) => i.label === 'db-write')).toBeDefined();

    // --- Verify hover returns undefined for non-tool text ---
    const noHover = server.onHover({
      textDocument: { uri: 'file:///ws/policy.json' },
      position: { line: 0, character: 0 }, // On the opening brace
    });
    expect(noHover).toBeUndefined();

    // --- Verify completion returns empty for unknown document ---
    const unknownItems = server.onCompletion({
      textDocument: { uri: 'file:///ws/unknown.json' },
      position: { line: 0, character: 0 },
    });
    expect(unknownItems).toHaveLength(0);

    // --- Verify hover returns undefined for unknown document ---
    const unknownHover = server.onHover({
      textDocument: { uri: 'file:///ws/unknown.json' },
      position: { line: 0, character: 0 },
    });
    expect(unknownHover).toBeUndefined();
  });
});
