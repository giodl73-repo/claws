/**
 * L2 E2E test for CodeAction + SemanticTokens lifecycle.
 *
 * 1 test: open file with violation, verify diagnostic, apply code action,
 * verify fix, check semantic tokens colored correctly.
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

describe('CodeAction + SemanticTokens E2E lifecycle', () => {
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

  it('full lifecycle: open, diagnose, fix, verify tokens', async () => {
    // STEP 1: Open a file with a governance violation (critical tool + delegation)
    const initialContent = [
      '# Governance Config',
      'tool: rm-rf (critical)',
      'tool: read-file (low)',
      'delegate: cleanup-bot',
      'label: pii=true',
    ].join('\n');
    const uri = 'file:///ws/TOOLS.md';

    await server.onDidOpen({
      textDocument: { uri, languageId: 'markdown', version: 1, text: initialContent },
    });

    // STEP 2: Verify diagnostics were published
    const initialPublish = published.find((p) => p.uri === uri);
    expect(initialPublish).toBeDefined();

    // Get IR and produce diagnostics manually to verify
    const ir = server.compilationHost.getCachedIR(uri)!;
    expect(ir).toBeDefined();

    const rawDiags = extractDiagnostics(ir);
    const lspDiags = toLspDiagnostics(rawDiags, initialContent);

    // Should have a tool-risk diagnostic for rm-rf (critical)
    const toolRiskDiag = lspDiags.find((d) => d.code === 'CLAWS-D001');
    expect(toolRiskDiag).toBeDefined();
    expect(toolRiskDiag!.message).toContain('rm-rf');
    expect(toolRiskDiag!.message).toContain('critical');

    // Should have a label-missing diagnostic for pii=true
    const labelDiag = lspDiags.find((d) => d.code === 'CLAWS-D009');
    expect(labelDiag).toBeDefined();

    // STEP 3: Generate code actions and apply fix for tool-risk
    const actions = provideCodeActions(uri, [toolRiskDiag!], initialContent);
    expect(actions).toHaveLength(1);
    expect(actions[0]!.title).toBe('Fix risk level declaration');

    const textEdit = actions[0]!.edit!.changes![uri]![0]!;
    expect(textEdit.newText).toContain('claws:risk-level');
    expect(textEdit.newText).toContain('rm-rf');

    // Apply the edit
    const lines = initialContent.split('\n');
    lines[textEdit.range.start.line] = textEdit.newText;
    const fixedContent = lines.join('\n');

    // Notify server of the change
    published = [];
    await server.onDidChange({
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: fixedContent }],
    });

    // Verify diagnostics were re-published
    const fixedPublish = published.find((p) => p.uri === uri);
    expect(fixedPublish).toBeDefined();

    // STEP 4: Verify semantic tokens are colored correctly
    const fixedIr = server.compilationHost.getCachedIR(uri)!;
    const fixedCaps = fixedIr.capabilities as { tools: readonly { name: string; riskLevel: string }[] };

    // Extract semantic tokens from the fixed content
    const tokens = extractSemanticTokens(
      fixedContent,
      fixedCaps.tools,
      fixedIr.delegationMap,
    );

    // rm-rf should have r5 tokens (critical)
    const r5Tokens = tokens.filter((t) => t.tokenType === 'governance.risk.r5');
    expect(r5Tokens.length).toBeGreaterThanOrEqual(1);
    const rmRfToken = r5Tokens.find((t) => t.length === 'rm-rf'.length);
    expect(rmRfToken).toBeDefined();

    // read-file should have r2 tokens (low)
    const r2Tokens = tokens.filter((t) => t.tokenType === 'governance.risk.r2');
    expect(r2Tokens.length).toBeGreaterThanOrEqual(1);

    // cleanup-bot should have OBO token with underline
    const oboTokens = tokens.filter((t) => t.tokenType === 'governance.obo');
    expect(oboTokens.length).toBeGreaterThanOrEqual(1);
    const botToken = oboTokens.find((t) => t.length === 'cleanup-bot'.length);
    expect(botToken).toBeDefined();
    expect(botToken!.modifiers).toContain('underline');

    // Encode and verify the complete result
    const encoded = encodeTokens(tokens);
    expect(encoded.data.length % 5).toBe(0);
    expect(encoded.data.length).toBeGreaterThan(0);

    // Also test via the top-level provideSemanticTokens
    const fullResult = provideSemanticTokens(
      fixedContent,
      fixedCaps.tools,
      fixedIr.delegationMap,
    );
    expect(fullResult.data.length).toBe(encoded.data.length);
  });
});
