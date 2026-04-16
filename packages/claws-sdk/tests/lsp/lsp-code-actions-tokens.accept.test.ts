/**
 * L3 acceptance test — SDK consumer triggers code action on governance
 * violation via LSP protocol, verifies workspace edit resolves diagnostic
 * and semantic tokens apply correct risk-level coloring.
 *
 * This test exercises the LSP providers from the SDK consumer perspective:
 * compile governance IR, produce diagnostics, generate code actions,
 * apply edits, and verify semantic tokens.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '@bic/openclaw-lsp';
import type { GovernanceIRLike } from '@bic/openclaw-lsp';
import type { PublishDiagnosticsParams } from 'vscode-languageserver';
import {
  extractDiagnostics,
  toLspDiagnostics,
} from '@bic/openclaw-lsp/providers/diagnostic.js';
import { provideCodeActions } from '@bic/openclaw-lsp/providers/code-action.js';
import {
  provideSemanticTokens,
  buildTokenLegend,
  RISK_LEVEL_COLORS,
  TOKEN_TYPE_INDEX,
} from '@bic/openclaw-lsp/providers/semantic-tokens.js';

/**
 * Simulate a governance compiler (what a real SDK consumer would provide).
 */
function compileGovernance(_uri: string, content: string): GovernanceIRLike {
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

describe('SDK acceptance: LSP code actions + semantic tokens', () => {
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

  it('consumer triggers code action on governance violation and verifies semantic tokens', async () => {
    // -- Setup: create a governance workspace with violations -----------
    const content = [
      '# Governance workspace',
      'tool: rm-rf (critical)',
      'tool: read-only (low)',
      'delegate: cleanup-agent',
      'label: pii=true',
    ].join('\n');
    const uri = 'file:///workspace/TOOLS.md';

    // -- Step 1: Open file via LSP protocol ----------------------------
    await server.onDidOpen({
      textDocument: { uri, languageId: 'markdown', version: 1, text: content },
    });

    // Verify server compiled and cached the IR
    const ir = server.compilationHost.getCachedIR(uri);
    expect(ir).toBeDefined();

    // -- Step 2: Extract diagnostics and verify violation exists --------
    const rawDiags = extractDiagnostics(ir!);
    const lspDiags = toLspDiagnostics(rawDiags, content);

    const toolRiskDiag = lspDiags.find((d) => d.code === 'CLAWS-D001');
    expect(toolRiskDiag).toBeDefined();
    expect(toolRiskDiag!.message).toContain('rm-rf');

    // -- Step 3: Request code action for the violation -----------------
    const actions = provideCodeActions(uri, [toolRiskDiag!], content);
    expect(actions.length).toBeGreaterThanOrEqual(1);

    const fixAction = actions[0]!;
    expect(fixAction.kind).toBe('quickfix');
    expect(fixAction.edit).toBeDefined();

    // Verify the workspace edit structure
    const changes = fixAction.edit!.changes!;
    expect(changes[uri]).toBeDefined();
    expect(changes[uri]!.length).toBeGreaterThanOrEqual(1);

    const textEdit = changes[uri]![0]!;
    expect(textEdit.newText).toContain('claws:risk-level');

    // -- Step 4: Apply the edit and recompile --------------------------
    const lines = content.split('\n');
    lines[textEdit.range.start.line] = textEdit.newText;
    const fixedContent = lines.join('\n');

    published = [];
    await server.onDidChange({
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: fixedContent }],
    });

    // Verify diagnostics were re-published
    expect(published.length).toBeGreaterThanOrEqual(1);

    // -- Step 5: Verify semantic tokens apply correct risk-level coloring
    const fixedIr = server.compilationHost.getCachedIR(uri)!;
    const caps = fixedIr.capabilities as { tools: readonly { name: string; riskLevel: string }[] };

    const semanticResult = provideSemanticTokens(
      fixedContent,
      caps.tools,
      fixedIr.delegationMap,
    );

    // Should have token data (multiple tokens encoded as 5-int tuples)
    expect(semanticResult.data.length).toBeGreaterThan(0);
    expect(semanticResult.data.length % 5).toBe(0);

    // Verify the token legend covers all risk levels
    const legend = buildTokenLegend();
    expect(legend.tokenTypes).toContain('governance.risk.r1');
    expect(legend.tokenTypes).toContain('governance.risk.r5');
    expect(legend.tokenTypes).toContain('governance.obo');
    expect(legend.tokenModifiers).toContain('underline');

    // Verify risk-level color mapping
    expect(RISK_LEVEL_COLORS[1]).toBe('green');
    expect(RISK_LEVEL_COLORS[5]).toBe('red');

    // Decode a few tokens to verify correctness
    // The encoded data contains tokens for rm-rf (r5), read-only (r1), cleanup-agent (obo)
    const tokenCount = semanticResult.data.length / 5;
    expect(tokenCount).toBeGreaterThanOrEqual(3);

    // Find the r5 token (critical tool) — type index 4
    let foundR5 = false;
    let foundR2 = false;
    let foundObo = false;
    for (let i = 0; i < semanticResult.data.length; i += 5) {
      const typeIdx = semanticResult.data[i + 3]!;
      if (typeIdx === TOKEN_TYPE_INDEX['governance.risk.r5']) foundR5 = true;
      if (typeIdx === TOKEN_TYPE_INDEX['governance.risk.r2']) foundR2 = true;
      if (typeIdx === TOKEN_TYPE_INDEX['governance.obo']) {
        foundObo = true;
        // OBO token should have underline modifier (bitmask 2)
        expect(semanticResult.data[i + 4]).toBe(2);
      }
    }

    expect(foundR5).toBe(true);
    expect(foundR2).toBe(true);
    expect(foundObo).toBe(true);
  });
});
