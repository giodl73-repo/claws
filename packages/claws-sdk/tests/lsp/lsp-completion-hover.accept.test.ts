/**
 * L3 acceptance test — SDK consumer requests RELAX completions and tool hover
 * via LSP protocol. Verifies completion items contain valid policy patterns
 * and hover cards show correct R-level classification.
 *
 * This test validates the consumer contract: a downstream client can create
 * a ClawsServer, open a governance document, and receive meaningful
 * completions and hover information via the standard LSP request/response flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer } from '@bic/openclaw-lsp';
import type { ServerOptions } from '@bic/openclaw-lsp';
import type { GovernanceIRLike } from '@bic/openclaw-lsp';
import type {
  PublishDiagnosticsParams,
  CompletionParams,
  HoverParams,
  InitializeParams,
} from 'vscode-languageserver';

/**
 * Consumer-supplied compile function — transforms governance source
 * into a GovernanceIR. In production this comes from claws-sdk's compile
 * pipeline; here we use a minimal simulation.
 */
function consumerCompile(_uri: string, content: string): GovernanceIRLike {
  const tools: unknown[] = [];

  for (const line of content.split('\n')) {
    const m = line.match(/tool:\s*(\S+)\s*\((\w+)\)(?:\s+(obo))?(?:\s+caps:\s*(.+))?/i);
    if (m) {
      const caps = m[4]?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];
      tools.push({
        name: m[1],
        riskLevel: m[2],
        description: `Consumer-registered tool: ${m[1]}`,
        oboFlag: Boolean(m[3]),
        classification: 'consumer',
        capabilities: caps,
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
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('LSP completion + hover acceptance (SDK consumer)', () => {
  let published: PublishDiagnosticsParams[];
  let server: ClawsServer;

  beforeEach(() => {
    vi.useFakeTimers();
    published = [];

    const opts: ServerOptions = {
      compileFn: async (uri, content) => consumerCompile(uri, content),
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    };
    server = new ClawsServer(opts);
  });

  afterEach(() => {
    server.dispose();
    vi.useRealTimers();
  });

  it('consumer requests RELAX completions and tool hover, verifies policy patterns and R-level classification', async () => {
    // --- Consumer initializes the server ---
    const initResult = server.onInitialize({} as InitializeParams);
    expect(initResult.capabilities.completionProvider).toBeDefined();
    expect(initResult.capabilities.hoverProvider).toBe(true);

    // --- Consumer opens a governance document ---
    const governanceDoc = [
      '{',
      '  tool: code-exec (critical) obo caps: shell, subprocess, file-io',
      '  tool: http-fetch (medium) caps: http-get, http-post',
      '  tool: log-read (minimal)',
      '  "policy": {',
      '    "rules": [',
      '      { "action": "deny", "when": "is_obo and not has_approval", "tools": ["code-exec"] },',
      '      { "action": "allow", "when": "risk_level <= R2 and " },',
      '      { "action": "deny", "tools": ["',
      '    ]',
      '  }',
      '}',
    ].join('\n');

    await server.onDidOpen({
      textDocument: {
        uri: 'file:///consumer/workspace/claws.json',
        languageId: 'json',
        version: 1,
        text: governanceDoc,
      },
    });

    // --- Consumer requests RELAX completions ---
    // Line 7: '      { "action": "allow", "when": "risk_level <= R2 and " },'
    const relaxParams: CompletionParams = {
      textDocument: { uri: 'file:///consumer/workspace/claws.json' },
      position: { line: 7, character: 52 },
    };
    const relaxItems = server.onCompletion(relaxParams);

    // Verify completion items contain valid RELAX operators
    const operators = ['allow', 'deny', 'require', 'when', 'unless', 'if', 'then', 'else', 'and', 'or', 'not'];
    for (const op of operators) {
      const found = relaxItems.find((i) => i.label === op);
      expect(found, `Consumer expects RELAX operator "${op}"`).toBeDefined();
    }

    // Verify RELAX predicates for policy evaluation
    const predicates = ['is_obo', 'has_approval', 'risk_level', 'in_context', 'has_label', 'is_delegated'];
    for (const pred of predicates) {
      const found = relaxItems.find((i) => i.label === pred);
      expect(found, `Consumer expects RELAX predicate "${pred}"`).toBeDefined();
    }

    // Verify tool names are included for context-aware completion
    expect(relaxItems.find((i) => i.label === 'code-exec')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'http-fetch')).toBeDefined();
    expect(relaxItems.find((i) => i.label === 'log-read')).toBeDefined();

    // --- Consumer requests tool name completions ---
    // Line 8: '      { "action": "deny", "tools": ["'
    //          position 36 is the opening " inside ["
    const toolParams: CompletionParams = {
      textDocument: { uri: 'file:///consumer/workspace/claws.json' },
      position: { line: 8, character: 37 },
    };
    const toolItems = server.onCompletion(toolParams);
    expect(toolItems).toHaveLength(3);
    const toolNames = toolItems.map((i) => i.label).sort();
    expect(toolNames).toEqual(['code-exec', 'http-fetch', 'log-read']);

    // --- Consumer hovers over a critical tool — verifies R-level ---
    // Line 1: '  tool: code-exec (critical) obo caps: shell, subprocess, file-io'
    const hoverParams: HoverParams = {
      textDocument: { uri: 'file:///consumer/workspace/claws.json' },
      position: { line: 1, character: 10 }, // Over "code-exec"
    };
    const hover = server.onHover(hoverParams);
    expect(hover).toBeDefined();

    const card = hover!.contents;

    // R-level classification: critical → R5
    expect(card).toContain('R5');
    expect(card).toContain('Risk Level: R5');
    expect(card).toContain('**code-exec**');

    // OBO status: enabled
    expect(card).toContain('**OBO Status:** Enabled');

    // Capabilities list
    expect(card).toContain('**Capabilities:**');
    expect(card).toContain('- shell');
    expect(card).toContain('- subprocess');
    expect(card).toContain('- file-io');

    // --- Consumer hovers over a minimal-risk tool ---
    const minHover = server.onHover({
      textDocument: { uri: 'file:///consumer/workspace/claws.json' },
      position: { line: 3, character: 10 }, // Over "log-read"
    });
    expect(minHover).toBeDefined();
    expect(minHover!.contents).toContain('R1'); // minimal → R1
    expect(minHover!.contents).toContain('**OBO Status:** Disabled');

    // --- Consumer hovers over non-tool text — no hover ---
    const noHover = server.onHover({
      textDocument: { uri: 'file:///consumer/workspace/claws.json' },
      position: { line: 0, character: 0 },
    });
    expect(noHover).toBeUndefined();

    // --- Lifecycle: dispose ---
    server.dispose();
    expect(server.openDocuments).toHaveLength(0);
  });
});
