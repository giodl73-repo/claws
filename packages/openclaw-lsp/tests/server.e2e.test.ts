/**
 * L2 E2E tests for full LSP lifecycle and cross-file tension workspace.
 *
 * 2 tests:
 *   1. Full LSP lifecycle: initialize, open, edit, diagnostics, code lens, shutdown
 *   2. LSP with cross-file tension workspace — multi-file governance analysis
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '../src/server.js';
import type { GovernanceIRLike } from '../src/compilation-host.js';
import type { PublishDiagnosticsParams, InitializeParams } from 'vscode-languageserver';
import { extractDiagnostics, toLspDiagnostics, computeTensions } from '../src/providers/diagnostic.js';
import { computeCodeLenses } from '../src/providers/code-lens.js';
import { detectAllClusters, type WorkspaceFile } from '../src/tension/cross-file.js';

// ── Shared compile simulator ────────────────────────────────────────

/** Parse content into a GovernanceIR-like, simulating the claws compiler. */
function simulateCompile(_uri: string, content: string): GovernanceIRLike {
  const intents: unknown[] = [];
  const delegationMap: unknown[] = [];
  const tools: unknown[] = [];
  const requiredApprovals: string[] = [];
  const ruleSuppressions: { ruleId: string; expiresAt: string }[] = [];
  const warnings: { ruleId: string; message: string; category?: string }[] = [];

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

    const denyMatch = line.match(/deny:\s*(\S+)/i);
    if (denyMatch) {
      intents.push({
        kind: 'deny',
        id: `deny-${denyMatch[1]}`,
        ruleId: 'SEC-AUTO',
        level: 5,
        target: denyMatch[1],
        description: `Deny ${denyMatch[1]}`,
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
        target: labelMatch[1],
        description: `Data label ${labelMatch[1]}`,
      });
    }

    const approvalMatch = line.match(/approval:\s*(\S+)/i);
    if (approvalMatch) {
      requiredApprovals.push(approvalMatch[1]!);
    }

    const suppressMatch = line.match(/suppression:\s*(\S+)\s*expires=(\S+)/i);
    if (suppressMatch) {
      ruleSuppressions.push({ ruleId: suppressMatch[1]!, expiresAt: suppressMatch[2]! });
    }

    const contextMatch = line.match(/context:\s*G-CONTEXT\s+(.+)/i);
    if (contextMatch) {
      warnings.push({ ruleId: `CTX-${contextMatch[1]}`, message: `Context: ${contextMatch[1]}`, category: 'G-CONTEXT' });
    }
  }

  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings,
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals,
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions,
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
      compilerVersion: '0.37.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('LSP lifecycle E2E', () => {
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

  it('full LSP lifecycle: initialize, open, edit, diagnostics, code lens, shutdown', async () => {
    // STEP 1: Initialize
    const initResult = server.onInitialize({} as InitializeParams);
    expect(initResult.capabilities.textDocumentSync).toBe(1); // Full sync
    expect(initResult.capabilities.completionProvider).toBeDefined();
    expect(initResult.capabilities.hoverProvider).toBe(true);

    // STEP 2: Open a governance file
    const toolsContent = [
      '# Tool Registry',
      '',
      '## Execution Tools',
      'tool: shell-exec (critical)',
      'tool: rm-rf (high)',
      'delegate: cleanup-bot',
      '',
      '## Data Tools',
      'tool: read-file (low)',
    ].join('\n');

    const toolsUri = 'file:///ws/TOOLS.md';
    await server.onDidOpen({
      textDocument: { uri: toolsUri, languageId: 'markdown', version: 1, text: toolsContent },
    });

    // Verify document tracked
    expect(server.openDocuments).toContain(toolsUri);

    // Verify diagnostics published
    const openPublish = published.find((p) => p.uri === toolsUri);
    expect(openPublish).toBeDefined();

    // Get IR and verify diagnostics manually
    const ir = server.compilationHost.getCachedIR(toolsUri)!;
    expect(ir).toBeDefined();

    const rawDiags = extractDiagnostics(ir);
    const toolRiskDiags = rawDiags.filter((d) => d.category === 'tool-risk');
    expect(toolRiskDiags.length).toBeGreaterThanOrEqual(2); // shell-exec (critical) + rm-rf (high)

    // Verify code lens works with the IR
    const lenses = computeCodeLenses(toolsContent, ir, [], toolsUri);
    expect(lenses.length).toBeGreaterThanOrEqual(1);

    const execLens = lenses.find((l) => l.aggregate.section.title === 'Execution Tools');
    expect(execLens).toBeDefined();
    expect(execLens!.aggregate.toolCount).toBe(2);
    expect(execLens!.aggregate.oboCount).toBe(1);
    expect(execLens!.display).toContain('tools:');
    expect(execLens!.display).toContain('OBO boundaries');

    // STEP 3: Edit the document — add a new tool
    const editedContent = toolsContent + '\ntool: api-call (medium)';
    published = [];
    await server.onDidChange({
      textDocument: { uri: toolsUri, version: 2 },
      contentChanges: [{ text: editedContent }],
    });

    // Verify re-compilation happened
    const editPublish = published.find((p) => p.uri === toolsUri);
    expect(editPublish).toBeDefined();

    const editedIR = server.compilationHost.getCachedIR(toolsUri)!;
    const editedTools = (editedIR.capabilities as { tools: readonly { name: string }[] }).tools;
    expect(editedTools.find((t) => t.name === 'api-call')).toBeDefined();

    // Code lens now includes the new tool
    const editedLenses = computeCodeLenses(editedContent, editedIR, [], toolsUri);
    const dataLens = editedLenses.find((l) => l.aggregate.section.title === 'Data Tools');
    expect(dataLens).toBeDefined();
    expect(dataLens!.aggregate.toolCount).toBe(2); // read-file + api-call

    // STEP 4: Save the document
    published = [];
    await server.onDidSave({ textDocument: { uri: toolsUri } });
    const savePublish = published.find((p) => p.uri === toolsUri);
    expect(savePublish).toBeDefined();

    // STEP 5: Completion works on the open document
    const completions = server.onCompletion({
      textDocument: { uri: toolsUri },
      position: { line: 0, character: 5 },
    });
    expect(Array.isArray(completions)).toBe(true);

    // STEP 6: Hover works on tool names
    const hover = server.onHover({
      textDocument: { uri: toolsUri },
      position: { line: 3, character: 8 }, // Over "shell-exec"
    });
    // May or may not resolve depending on word detection, but should not throw

    // STEP 7: Close the document
    published = [];
    server.onDidClose({ textDocument: { uri: toolsUri } });
    expect(server.openDocuments).not.toContain(toolsUri);

    const closePublish = published.find((p) => p.uri === toolsUri);
    expect(closePublish).toBeDefined();
    expect(closePublish!.diagnostics).toHaveLength(0);

    // STEP 8: Shutdown
    server.dispose();
    expect(server.openDocuments).toHaveLength(0);
    expect(server.compilationHost.size).toBe(0);
  });

  it('LSP with cross-file tension workspace — full multi-file analysis', async () => {
    // Open 5 governance files that create cross-file tensions

    const toolsContent = [
      '# Tool Registry',
      'tool: shell-exec (critical)',
      'tool: read-file (low)',
      'delegate: cleanup-bot',
    ].join('\n');

    const soulContent = [
      '# Soul Intent',
      'deny: shell-exec',
      'allow: read-file',
    ].join('\n');

    const agentsContent = [
      '# Agent Delegation',
      'delegate: shell-exec',
      'delegate: cleanup-bot',
    ].join('\n');

    const memoryContent = [
      '# Data Labels',
      'label: read-file=pii',
      'label: retention=90d',
    ].join('\n');

    const rulesContent = [
      '# Enforcement Rules',
      'approval: security-review',
      'suppression: security-review expires=2020-01-01',
      'context: G-CONTEXT production-only',
    ].join('\n');

    // Open all 5 files
    const uris = {
      tools: 'file:///ws/TOOLS.md',
      soul: 'file:///ws/SOUL.md',
      agents: 'file:///ws/AGENTS.md',
      memory: 'file:///ws/MEMORY.md',
      rules: 'file:///ws/RULES.md',
    };

    await server.onDidOpen({
      textDocument: { uri: uris.tools, languageId: 'markdown', version: 1, text: toolsContent },
    });
    await server.onDidOpen({
      textDocument: { uri: uris.soul, languageId: 'markdown', version: 1, text: soulContent },
    });
    await server.onDidOpen({
      textDocument: { uri: uris.agents, languageId: 'markdown', version: 1, text: agentsContent },
    });
    await server.onDidOpen({
      textDocument: { uri: uris.memory, languageId: 'markdown', version: 1, text: memoryContent },
    });
    await server.onDidOpen({
      textDocument: { uri: uris.rules, languageId: 'markdown', version: 1, text: rulesContent },
    });

    // All 5 documents should be tracked
    expect(server.openDocuments).toHaveLength(5);

    // Build workspace snapshot for cross-file analysis
    const workspaceFiles = new Map<string, WorkspaceFile>();
    for (const [key, uri] of Object.entries(uris)) {
      const ir = server.compilationHost.getCachedIR(uri);
      expect(ir).toBeDefined();
      const contentMap: Record<string, string> = {
        tools: toolsContent,
        soul: soulContent,
        agents: agentsContent,
        memory: memoryContent,
        rules: rulesContent,
      };
      workspaceFiles.set(uri, { content: contentMap[key]!, ir: ir! });
    }

    // Run cross-file tension detection
    const findings = detectAllClusters(workspaceFiles);
    expect(findings.length).toBeGreaterThan(0);

    // Verify TOOLS→SOUL tension via computeTensions (diagnostic provider)
    const toolsTensions = computeTensions(uris.tools, workspaceFiles);
    const soulTensions = toolsTensions.filter((t) => t.targetUri === uris.soul);
    expect(soulTensions.length).toBeGreaterThanOrEqual(1);
    expect(soulTensions[0]!.diagnostic.code).toBe('CLAWS-T001');

    // Verify AGENTS→other tension via computeTensions
    const agentsTensions = computeTensions(uris.agents, workspaceFiles);
    expect(agentsTensions.length).toBeGreaterThanOrEqual(1);

    // Verify code lens includes tension counts
    const toolsIR = server.compilationHost.getCachedIR(uris.tools)!;
    const toolsLenses = computeCodeLenses(
      toolsContent,
      toolsIR,
      toolsTensions.filter((t) => t.targetUri === uris.tools),
      uris.tools,
    );

    // The tool registry lens should show tools + OBO
    const registryLens = toolsLenses.find((l) => l.aggregate.section.title === 'Tool Registry');
    expect(registryLens).toBeDefined();
    expect(registryLens!.aggregate.toolCount).toBeGreaterThanOrEqual(1);

    // Run LSP diagnostics on TOOLS.md with cross-file tension context
    const toolsDiags = toLspDiagnostics(extractDiagnostics(toolsIR), toolsContent);
    expect(toolsDiags.length).toBeGreaterThanOrEqual(1); // At least shell-exec tool-risk

    // Edit TOOLS.md to add a new tool — should trigger re-analysis
    published = [];
    const editedTools = toolsContent + '\ntool: new-api (high)';
    await server.onDidChange({
      textDocument: { uri: uris.tools, version: 2 },
      contentChanges: [{ text: editedTools }],
    });

    // Diagnostics should be re-published
    const toolsPublish = published.filter((p) => p.uri === uris.tools);
    expect(toolsPublish.length).toBeGreaterThanOrEqual(1);

    // Verify tension findings include cluster info
    const clusterFindings = detectAllClusters(workspaceFiles);
    const clusters = new Set(clusterFindings.map((f) => f.cluster));
    // Should find at least clusters A (tool vs deny) and B (delegation vs deny)
    expect(clusters.has('A')).toBe(true);

    // Clean shutdown
    for (const uri of Object.values(uris)) {
      server.onDidClose({ textDocument: { uri } });
    }
    expect(server.openDocuments).toHaveLength(0);

    server.dispose();
    expect(server.compilationHost.size).toBe(0);
  });
});
