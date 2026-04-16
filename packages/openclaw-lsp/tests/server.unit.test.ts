/**
 * L0 unit tests for ClawsServer.
 *
 * Tests:
 *   1. onInitialize returns correct capabilities
 *   2. onDidOpen compiles and publishes diagnostics
 *   3. onDidChange recompiles on content change
 *   4. onDidClose clears diagnostics and state
 *   5. onDidSave recompiles from cached content
 *   6. compile failure clears diagnostics
 *   7. empty contentChanges is a no-op
 *   8. openDocuments / dispose lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '../src/server.js';
import type { GovernanceIRLike } from '../src/compilation-host.js';
import type { PublishDiagnosticsParams, InitializeParams } from 'vscode-languageserver';

function makeIR(tag: string): GovernanceIRLike {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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

describe('ClawsServer', () => {
  let published: PublishDiagnosticsParams[];
  let compileFn: ReturnType<typeof vi.fn>;
  let server: ClawsServer;

  beforeEach(() => {
    vi.useFakeTimers();
    published = [];
    compileFn = vi.fn(async (_uri: string, _content: string) => makeIR('test'));
    server = new ClawsServer({
      compileFn,
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    });
  });

  afterEach(() => {
    server.dispose();
    vi.useRealTimers();
  });

  it('onInitialize returns textDocumentSync Full capability', () => {
    const result = server.onInitialize({} as InitializeParams);
    expect(result.capabilities.textDocumentSync).toBe(1); // Full
  });

  it('onInitialize advertises codeActionProvider', () => {
    const result = server.onInitialize({} as InitializeParams);
    expect(result.capabilities.codeActionProvider).toBe(true);
  });

  it('onInitialize advertises semanticTokensProvider with legend', () => {
    const result = server.onInitialize({} as InitializeParams);
    const semTokens = result.capabilities.semanticTokensProvider as {
      legend: { tokenTypes: string[]; tokenModifiers: string[] };
      full: boolean;
    };
    expect(semTokens).toBeDefined();
    expect(semTokens.full).toBe(true);
    expect(semTokens.legend.tokenTypes.length).toBeGreaterThan(0);
    expect(semTokens.legend.tokenModifiers.length).toBeGreaterThan(0);
    expect(semTokens.legend.tokenTypes).toContain('governance.risk.r5');
    expect(semTokens.legend.tokenModifiers).toContain('underline');
  });

  it('onInitialize advertises codeLensProvider', () => {
    const result = server.onInitialize({} as InitializeParams);
    expect(result.capabilities.codeLensProvider).toBeDefined();
  });

  it('onDidOpen compiles and publishes diagnostics', async () => {
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///a.md',
        languageId: 'markdown',
        version: 1,
        text: '# Test',
      },
    });

    expect(compileFn).toHaveBeenCalledWith('file:///a.md', '# Test');
    expect(published.length).toBeGreaterThanOrEqual(1);
    expect(published[0]!.uri).toBe('file:///a.md');
    expect(server.openDocuments).toContain('file:///a.md');
  });

  it('onDidChange recompiles on content change', async () => {
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///b.md',
        languageId: 'markdown',
        version: 1,
        text: '# Original',
      },
    });

    compileFn.mockClear();
    published = [];

    await server.onDidChange({
      textDocument: { uri: 'file:///b.md', version: 2 },
      contentChanges: [{ text: '# Modified' }],
    });

    expect(compileFn).toHaveBeenCalledWith('file:///b.md', '# Modified');
    expect(published.length).toBeGreaterThanOrEqual(1);
  });

  it('onDidClose clears diagnostics and removes document state', async () => {
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///c.md',
        languageId: 'markdown',
        version: 1,
        text: '# Close Me',
      },
    });

    published = [];
    server.onDidClose({
      textDocument: { uri: 'file:///c.md' },
    });

    expect(server.openDocuments).not.toContain('file:///c.md');
    // Should publish empty diagnostics
    expect(published).toHaveLength(1);
    expect(published[0]!.uri).toBe('file:///c.md');
    expect(published[0]!.diagnostics).toHaveLength(0);
  });

  it('onDidSave recompiles from cached content', async () => {
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///d.md',
        languageId: 'markdown',
        version: 1,
        text: '# Save Me',
      },
    });

    compileFn.mockClear();
    published = [];

    await server.onDidSave({
      textDocument: { uri: 'file:///d.md' },
    });

    // Should recompile from the cached content
    expect(published.length).toBeGreaterThanOrEqual(1);
    expect(published[0]!.uri).toBe('file:///d.md');
  });

  it('onDidSave does nothing for unknown documents', async () => {
    published = [];
    await server.onDidSave({
      textDocument: { uri: 'file:///unknown.md' },
    });

    expect(published).toHaveLength(0);
  });

  it('compile failure clears diagnostics', async () => {
    compileFn.mockRejectedValueOnce(new Error('compile failed'));

    await server.onDidOpen({
      textDocument: {
        uri: 'file:///fail.md',
        languageId: 'markdown',
        version: 1,
        text: '# Bad',
      },
    });

    // Should publish empty diagnostics (compile failed, no IR)
    const failPublish = published.filter((p) => p.uri === 'file:///fail.md');
    expect(failPublish.length).toBeGreaterThanOrEqual(1);
    const lastPublish = failPublish[failPublish.length - 1]!;
    expect(lastPublish.diagnostics).toHaveLength(0);
  });

  it('empty contentChanges is a no-op', async () => {
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///e.md',
        languageId: 'markdown',
        version: 1,
        text: '# Test',
      },
    });

    compileFn.mockClear();
    published = [];

    await server.onDidChange({
      textDocument: { uri: 'file:///e.md', version: 2 },
      contentChanges: [],
    });

    // No compile should happen for empty changes
    expect(compileFn).not.toHaveBeenCalled();
    expect(published).toHaveLength(0);
  });

  it('dispose clears all state', async () => {
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///f.md',
        languageId: 'markdown',
        version: 1,
        text: '# Dispose Me',
      },
    });

    expect(server.openDocuments).toHaveLength(1);
    server.dispose();
    expect(server.openDocuments).toHaveLength(0);
    expect(server.compilationHost.size).toBe(0);
  });

  it('compilationHost getter returns the underlying host', () => {
    expect(server.compilationHost).toBeDefined();
    expect(server.compilationHost.size).toBe(0);
  });

  it('buildWorkspaceSnapshot excludes docs without cached IR', async () => {
    // Open a document whose compile will fail (no cached IR)
    const failThenSucceedFn = vi.fn<(uri: string, content: string) => Promise<GovernanceIRLike>>();
    failThenSucceedFn.mockRejectedValueOnce(new Error('fail'));
    failThenSucceedFn.mockResolvedValue(makeIR('ok'));

    const snapshotServer = new ClawsServer({
      compileFn: failThenSucceedFn,
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    });

    // This open will fail compilation — doc is tracked but no IR cached
    await snapshotServer.onDidOpen({
      textDocument: { uri: 'file:///ws/NO-IR.md', languageId: 'markdown', version: 1, text: '# No IR' },
    });

    // Compile host should have no cached IR for this doc
    expect(snapshotServer.compilationHost.getCachedIR('file:///ws/NO-IR.md')).toBeUndefined();
    // But the document is tracked
    expect(snapshotServer.openDocuments).toContain('file:///ws/NO-IR.md');

    // Now open another doc — this exercises buildWorkspaceSnapshot where
    // NO-IR.md is in documents but not in cache (the `if (ir)` false branch)
    published = [];
    await snapshotServer.onDidOpen({
      textDocument: { uri: 'file:///ws/TOOLS.md', languageId: 'markdown', version: 1, text: '# Tools' },
    });

    // TOOLS.md should compile fine
    expect(snapshotServer.compilationHost.getCachedIR('file:///ws/TOOLS.md')).toBeDefined();

    snapshotServer.dispose();
  });

  it('tension for closed document does not publish (doc not open)', async () => {
    // Create a server that produces tensions pointing to a file that's NOT open
    const tensionCompileFn = vi.fn(async (uri: string, _content: string) => {
      // Return IR with deny intents so TOOLS→SOUL tension fires
      if (uri.includes('TOOLS')) {
        return {
          ...makeIR('tools'),
          capabilities: {
            tools: [{ name: 'shell', riskLevel: 'high', description: 'shell', oboFlag: false, classification: 'execution' }],
            skills: [], agents: [], workflows: [],
          },
        };
      }
      return {
        ...makeIR('soul'),
        intents: [{ kind: 'deny', id: 'd1', ruleId: 'SEC-01', level: 5, target: 'shell', description: 'deny shell', reason: 'policy' }],
      };
    });

    const tensionServer = new ClawsServer({
      compileFn: tensionCompileFn,
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    });

    // Open SOUL.md
    await tensionServer.onDidOpen({
      textDocument: { uri: 'file:///ws/SOUL.md', languageId: 'markdown', version: 1, text: '# Soul\nshell deny' },
    });

    // Close SOUL.md
    tensionServer.onDidClose({ textDocument: { uri: 'file:///ws/SOUL.md' } });
    published = [];

    // Open TOOLS.md — tension should fire toward SOUL.md but SOUL is closed
    await tensionServer.onDidOpen({
      textDocument: { uri: 'file:///ws/TOOLS.md', languageId: 'markdown', version: 1, text: '# Tools\nshell' },
    });

    // No SOUL.md diagnostics should be published since it's closed
    const soulPublish = published.filter((p) => p.uri === 'file:///ws/SOUL.md');
    expect(soulPublish).toHaveLength(0);

    tensionServer.dispose();
  });

  it('multiple tensions to the same URI group correctly', async () => {
    // IR that produces multiple deny intents
    const multiCompileFn = vi.fn(async (uri: string, _content: string) => {
      if (uri.includes('SOUL')) {
        return {
          ...makeIR('soul'),
          intents: [
            { kind: 'deny', id: 'd1', ruleId: 'SEC-01', level: 5, target: 'shell', description: 'deny shell', reason: 'p' },
            { kind: 'deny', id: 'd2', ruleId: 'SEC-02', level: 5, target: 'rm', description: 'deny rm', reason: 'p' },
          ],
        };
      }
      return makeIR('tools');
    });

    const multiServer = new ClawsServer({
      compileFn: multiCompileFn,
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    });

    // Open SOUL.md
    await multiServer.onDidOpen({
      textDocument: { uri: 'file:///ws/SOUL.md', languageId: 'markdown', version: 1, text: '# Soul\nshell deny\nrm deny' },
    });

    published = [];

    // Open TOOLS.md — should produce 2 tensions on SOUL.md
    await multiServer.onDidOpen({
      textDocument: { uri: 'file:///ws/TOOLS.md', languageId: 'markdown', version: 1, text: '# Tools' },
    });

    const soulPublish = published.filter((p) => p.uri === 'file:///ws/SOUL.md');
    expect(soulPublish.length).toBeGreaterThanOrEqual(1);
    const lastPublish = soulPublish[soulPublish.length - 1]!;
    const tensionDiags = lastPublish.diagnostics.filter((d) => d.code === 'CLAWS-T001');
    expect(tensionDiags).toHaveLength(2);

    multiServer.dispose();
  });

  it('onCompletion falls back to empty string for out-of-range line', async () => {
    await server.onDidOpen({
      textDocument: { uri: 'file:///g.md', languageId: 'markdown', version: 1, text: 'single line' },
    });

    // Request completion at line 999 — out of range
    const items = server.onCompletion({
      textDocument: { uri: 'file:///g.md' },
      position: { line: 999, character: 0 },
    });
    // Should still return items (falls back to empty lineText → unknown context)
    expect(Array.isArray(items)).toBe(true);
  });

  it('onHover returns undefined when document has no cached IR', async () => {
    // Force a compile failure so doc is tracked but IR is not cached
    const failCompileFn = vi.fn<(uri: string, content: string) => Promise<GovernanceIRLike>>();
    failCompileFn.mockRejectedValue(new Error('fail'));

    const noIRServer = new ClawsServer({
      compileFn: failCompileFn,
      publishDiagnostics: () => {},
      batchMs: 0,
    });

    await noIRServer.onDidOpen({
      textDocument: { uri: 'file:///h.md', languageId: 'markdown', version: 1, text: 'some tool' },
    });

    // Document is tracked but no IR
    expect(noIRServer.openDocuments).toContain('file:///h.md');
    expect(noIRServer.compilationHost.getCachedIR('file:///h.md')).toBeUndefined();

    const hover = noIRServer.onHover({
      textDocument: { uri: 'file:///h.md' },
      position: { line: 0, character: 5 },
    });
    expect(hover).toBeUndefined();

    noIRServer.dispose();
  });

  it('onHover falls back to empty string for out-of-range line', async () => {
    await server.onDidOpen({
      textDocument: { uri: 'file:///i.md', languageId: 'markdown', version: 1, text: 'line one' },
    });

    // Hover at line 999 — out of range, falls back to empty lineText
    const hover = server.onHover({
      textDocument: { uri: 'file:///i.md' },
      position: { line: 999, character: 0 },
    });
    // No tool match on empty line → undefined
    expect(hover).toBeUndefined();
  });
});
