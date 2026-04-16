/**
 * L1 integration tests for ClawsServer — attachToConnection wiring.
 *
 * Tests:
 *   1. attachToConnection registers all handlers and lambdas execute
 *   2. connection.onShutdown disposes the server
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { attachToConnection } from '../src/server.js';
import type { GovernanceIRLike, CompileFn } from '../src/compilation-host.js';
import type { Connection } from 'vscode-languageserver';

function makeIR(): GovernanceIRLike {
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

/** Create a mock LSP Connection that captures registered handlers. */
function mockConnection() {
  const handlers: Record<string, Function> = {};
  return {
    connection: {
      sendDiagnostics: vi.fn(),
      onInitialize: vi.fn((cb: Function) => { handlers['initialize'] = cb; }),
      onDidOpenTextDocument: vi.fn((cb: Function) => { handlers['didOpen'] = cb; }),
      onDidChangeTextDocument: vi.fn((cb: Function) => { handlers['didChange'] = cb; }),
      onDidCloseTextDocument: vi.fn((cb: Function) => { handlers['didClose'] = cb; }),
      onDidSaveTextDocument: vi.fn((cb: Function) => { handlers['didSave'] = cb; }),
      onCompletion: vi.fn((cb: Function) => { handlers['completion'] = cb; }),
      onHover: vi.fn((cb: Function) => { handlers['hover'] = cb; }),
      onShutdown: vi.fn((cb: Function) => { handlers['shutdown'] = cb; }),
    } as unknown as Connection,
    handlers,
  };
}

/** Wait for pending microtasks to settle. */
async function settle(): Promise<void> {
  // Flush the promise queue multiple times to handle chained async
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('attachToConnection', () => {
  let server: ReturnType<typeof attachToConnection>;
  let mock: ReturnType<typeof mockConnection>;

  afterEach(() => {
    server?.dispose();
  });

  it('registers all handlers and lambdas fire correctly', async () => {
    mock = mockConnection();
    const compileFn: CompileFn = vi.fn(async () => makeIR());

    server = attachToConnection(mock.connection, compileFn);

    // All handlers registered
    expect(mock.connection.onInitialize).toHaveBeenCalledOnce();
    expect(mock.connection.onDidOpenTextDocument).toHaveBeenCalledOnce();
    expect(mock.connection.onDidChangeTextDocument).toHaveBeenCalledOnce();
    expect(mock.connection.onDidCloseTextDocument).toHaveBeenCalledOnce();
    expect(mock.connection.onDidSaveTextDocument).toHaveBeenCalledOnce();
    expect(mock.connection.onShutdown).toHaveBeenCalledOnce();

    // Initialize handler
    const initResult = mock.handlers['initialize']!({});
    expect(initResult.capabilities.textDocumentSync).toBe(1);

    // didOpen lambda — fires async, await settle
    mock.handlers['didOpen']!({
      textDocument: { uri: 'file:///test.md', languageId: 'markdown', version: 1, text: '# Test' },
    });
    await settle();

    expect(compileFn).toHaveBeenCalledWith('file:///test.md', '# Test');
    expect(mock.connection.sendDiagnostics).toHaveBeenCalled();

    // didChange lambda
    (compileFn as ReturnType<typeof vi.fn>).mockClear();
    mock.handlers['didChange']!({
      textDocument: { uri: 'file:///test.md', version: 2 },
      contentChanges: [{ text: '# Modified' }],
    });
    await settle();

    expect(compileFn).toHaveBeenCalledWith('file:///test.md', '# Modified');

    // didSave lambda
    mock.handlers['didSave']!({
      textDocument: { uri: 'file:///test.md' },
    });
    await settle();

    // didClose handler (synchronous)
    mock.handlers['didClose']!({
      textDocument: { uri: 'file:///test.md' },
    });

    expect(server.openDocuments).not.toContain('file:///test.md');
  });

  it('completion and hover lambdas return results via connection handlers', async () => {
    // Use an IR with a tool so hover returns a risk card
    const toolIR: GovernanceIRLike = {
      ...makeIR(),
      capabilities: {
        tools: [{
          name: 'shell-exec',
          riskLevel: 'critical',
          description: 'Execute shell',
          oboFlag: true,
          classification: 'execution',
          capabilities: ['file-system'],
        }],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    mock = mockConnection();
    const compileFn: CompileFn = vi.fn(async () => toolIR);
    server = attachToConnection(mock.connection, compileFn);

    // Open a document with tool name in content
    mock.handlers['didOpen']!({
      textDocument: {
        uri: 'file:///ws/claws.json',
        languageId: 'json',
        version: 1,
        text: '{ "when": "\n  shell-exec\n}',
      },
    });
    await settle();

    // Completion handler — invoke the lambda
    expect(mock.connection.onCompletion).toHaveBeenCalledOnce();
    const completionResult = mock.handlers['completion']!({
      textDocument: { uri: 'file:///ws/claws.json' },
      position: { line: 0, character: 11 }, // Inside "when" value
    });
    expect(Array.isArray(completionResult)).toBe(true);
    expect(completionResult.length).toBeGreaterThan(0);

    // Hover handler — tool name on line 1
    expect(mock.connection.onHover).toHaveBeenCalledOnce();
    const hoverResult = mock.handlers['hover']!({
      textDocument: { uri: 'file:///ws/claws.json' },
      position: { line: 1, character: 5 }, // Over "shell-exec"
    });
    expect(hoverResult).not.toBeNull();
    expect(hoverResult.contents.kind).toBe('markdown');
    expect(hoverResult.contents.value).toContain('shell-exec');
    expect(hoverResult.contents.value).toContain('R5');

    // Hover handler — no tool at position → null
    const noHover = mock.handlers['hover']!({
      textDocument: { uri: 'file:///ws/claws.json' },
      position: { line: 2, character: 0 }, // On "}"
    });
    expect(noHover).toBeNull();
  });

  it('onShutdown disposes the server completely', async () => {
    mock = mockConnection();
    const compileFn: CompileFn = vi.fn(async () => makeIR());

    server = attachToConnection(mock.connection, compileFn);

    // Open a doc via the lambda handler
    mock.handlers['didOpen']!({
      textDocument: { uri: 'file:///a.md', languageId: 'markdown', version: 1, text: '# A' },
    });
    await settle();

    expect(server.openDocuments).toHaveLength(1);

    // Shutdown via handler
    mock.handlers['shutdown']!();

    expect(server.openDocuments).toHaveLength(0);
    expect(server.compilationHost.size).toBe(0);
  });
});
