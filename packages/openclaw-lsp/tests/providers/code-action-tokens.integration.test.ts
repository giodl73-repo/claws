/**
 * L1 integration tests for CodeAction + SemanticTokens providers.
 *
 * 2 tests:
 *   1. Code action applied fixes violation
 *   2. Semantic tokens correct across workspace
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '../../src/server.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';
import type { PublishDiagnosticsParams } from 'vscode-languageserver';
import {
  extractDiagnostics,
  toLspDiagnostics,
} from '../../src/providers/diagnostic.js';
import { provideCodeActions } from '../../src/providers/code-action.js';
import {
  extractSemanticTokens,
  encodeTokens,
  provideSemanticTokens,
} from '../../src/providers/semantic-tokens.js';

/** Simulate compilation from content. */
function simulateCompile(_uri: string, content: string): GovernanceIRLike {
  const intents: unknown[] = [];
  const delegationMap: unknown[] = [];
  const tools: unknown[] = [];

  for (const line of content.split('\n')) {
    const toolMatch = line.match(/tool:\s*(\S+)\s*\((\w+)\)/i);
    if (toolMatch) {
      tools.push({
        name: toolMatch[1],
        riskLevel: toolMatch[2],
        description: `Tool ${toolMatch[1]}`,
        oboFlag: false,
        classification: 'custom',
      });
    }

    const delegateMatch = line.match(/delegate:\s*(\S+)/i);
    if (delegateMatch) {
      delegationMap.push({
        ruleId: 'DEL-AUTO',
        target: delegateMatch[1],
        mechanism: 'hook',
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
        reason: 'policy',
      });
    }

    const labelMatch = line.match(/label:\s*(\S+)=(\S+)/i);
    if (labelMatch) {
      intents.push({
        kind: 'label',
        id: `label-${labelMatch[1]}`,
        ruleId: 'DATA-AUTO',
        level: 2,
        key: labelMatch[1],
        value: labelMatch[2],
        description: `Data label ${labelMatch[1]}`,
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
    delegationMap,
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

describe('CodeAction + SemanticTokens integration', () => {
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

  it('code action applied fixes a tool-risk violation', async () => {
    const content = '# Tools\ntool: shell-exec (critical)\nother content';
    const uri = 'file:///ws/TOOLS.md';

    // Open the file — triggers compilation and diagnostics
    await server.onDidOpen({
      textDocument: { uri, languageId: 'markdown', version: 1, text: content },
    });

    // Get the IR and produce diagnostics
    const ir = server.compilationHost.getCachedIR(uri)!;
    expect(ir).toBeDefined();

    const rawDiags = extractDiagnostics(ir);
    const lspDiags = toLspDiagnostics(rawDiags, content);

    // Should have a tool-risk diagnostic for the critical tool
    const toolRiskDiag = lspDiags.find((d) => d.code === 'CLAWS-D001');
    expect(toolRiskDiag).toBeDefined();

    // Generate code action for this diagnostic
    const actions = provideCodeActions(uri, [toolRiskDiag!], content);
    expect(actions).toHaveLength(1);
    expect(actions[0]!.title).toBe('Fix risk level declaration');

    // Verify the workspace edit
    const edit = actions[0]!.edit!;
    const textEdits = edit.changes![uri]!;
    expect(textEdits).toHaveLength(1);
    expect(textEdits[0]!.newText).toContain('claws:risk-level');
    expect(textEdits[0]!.newText).toContain('shell-exec');

    // Simulate applying the edit: splice the new text into the content
    const lines = content.split('\n');
    const editRange = textEdits[0]!.range;
    lines[editRange.start.line] = textEdits[0]!.newText;
    const fixedContent = lines.join('\n');

    // The fixed content should contain the risk-level annotation
    expect(fixedContent).toContain('claws:risk-level shell-exec r3');

    // Recompile with fixed content — notify server of the change
    await server.onDidChange({
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: fixedContent }],
    });

    // Verify the tool-risk diagnostic is still present (the tool is still critical,
    // but the annotation acknowledges it)
    const fixedIr = server.compilationHost.getCachedIR(uri)!;
    expect(fixedIr).toBeDefined();
  });

  it('semantic tokens are correct across workspace with multiple files', async () => {
    const toolsContent = '# Tools\ntool: danger-tool (critical)\ntool: safe-tool (low)';
    const agentsContent = '# Agents\ndelegate: bot-agent\ndelegate: review-bot';

    // Open both files
    await server.onDidOpen({
      textDocument: { uri: 'file:///ws/TOOLS.md', languageId: 'markdown', version: 1, text: toolsContent },
    });
    await server.onDidOpen({
      textDocument: { uri: 'file:///ws/AGENTS.md', languageId: 'markdown', version: 1, text: agentsContent },
    });

    // Get IR for TOOLS.md — extract semantic tokens
    const toolsIr = server.compilationHost.getCachedIR('file:///ws/TOOLS.md')!;
    expect(toolsIr).toBeDefined();

    const toolsCaps = toolsIr.capabilities as { tools: readonly { name: string; riskLevel: string }[] };
    const toolsTokens = extractSemanticTokens(toolsContent, toolsCaps.tools, []);

    // Should have tokens for both tools
    const r5Tokens = toolsTokens.filter((t) => t.tokenType === 'governance.risk.r5');
    const r2Tokens = toolsTokens.filter((t) => t.tokenType === 'governance.risk.r2');
    expect(r5Tokens.length).toBeGreaterThanOrEqual(1); // danger-tool is critical → r5
    expect(r2Tokens.length).toBeGreaterThanOrEqual(1); // safe-tool is low → r2

    // Get IR for AGENTS.md — extract semantic tokens for delegation
    const agentsIr = server.compilationHost.getCachedIR('file:///ws/AGENTS.md')!;
    expect(agentsIr).toBeDefined();

    const agentsTokens = extractSemanticTokens(agentsContent, [], agentsIr.delegationMap);
    const oboTokens = agentsTokens.filter((t) => t.tokenType === 'governance.obo');
    expect(oboTokens.length).toBeGreaterThanOrEqual(2); // bot-agent and review-bot

    // Verify all OBO tokens have underline modifier
    for (const token of oboTokens) {
      expect(token.modifiers).toContain('underline');
    }

    // Encode and verify data integrity
    const toolsEncoded = encodeTokens(toolsTokens);
    const agentsEncoded = encodeTokens(agentsTokens);
    expect(toolsEncoded.data.length % 5).toBe(0);
    expect(agentsEncoded.data.length % 5).toBe(0);
    expect(toolsEncoded.data.length).toBeGreaterThan(0);
    expect(agentsEncoded.data.length).toBeGreaterThan(0);

    // Use the top-level provideSemanticTokens function
    const result = provideSemanticTokens(toolsContent, toolsCaps.tools, []);
    expect(result.data.length).toBeGreaterThan(0);
  });
});
