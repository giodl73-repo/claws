/**
 * LSP Server — language server entry point for governance compilation.
 *
 * Handles LSP initialize, capabilities negotiation, and document lifecycle
 * (open, change, close, save). Wires the CompilationHost to the diagnostic
 * provider so that governance violations surface as real-time editor diagnostics.
 *
 * @module claws-lsp/server
 */

import type {
  Connection,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind as TextDocumentSyncKindType,
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidSaveTextDocumentParams,
  PublishDiagnosticsParams,
  CompletionParams,
  HoverParams,
  SemanticTokensOptions,
} from 'vscode-languageserver';

import { CompilationHost, type CompileFn, type GovernanceIRLike } from './compilation-host.js';
import {
  extractDiagnostics,
  toLspDiagnostics,
  computeTensions,
  type TensionDiagnostic,
} from './providers/diagnostic.js';
import { computeCompletions, type CompletionItem as ClawsCompletionItem } from './providers/completion.js';
import { computeHover, type HoverResult } from './providers/hover.js';
import { buildTokenLegend } from './providers/semantic-tokens.js';

/**
 * Document state tracked per open file.
 */
interface DocumentState {
  uri: string;
  content: string;
  version: number;
}

/**
 * Callback invoked when diagnostics should be published to the client.
 * This indirection allows the server to work without a live LSP connection
 * in tests.
 */
export type PublishDiagnosticsFn = (params: PublishDiagnosticsParams) => void;

/**
 * Options for creating a ClawsServer instance.
 */
export interface ServerOptions {
  /** The compile function for GovernanceIR. */
  compileFn: CompileFn;
  /** Callback to publish diagnostics (typically connection.sendDiagnostics). */
  publishDiagnostics: PublishDiagnosticsFn;
  /** Batch window in milliseconds for the CompilationHost. */
  batchMs?: number;
}

/**
 * ClawsServer — the stateful LSP server logic.
 *
 * Decoupled from the transport layer (stdin/stdout, WebSocket) so it
 * can be tested without a real LSP connection.
 */
export class ClawsServer {
  private readonly host: CompilationHost;
  private readonly publishDiagnostics: PublishDiagnosticsFn;
  private readonly documents = new Map<string, DocumentState>();

  constructor(opts: ServerOptions) {
    this.host = new CompilationHost(opts.compileFn, opts.batchMs);
    this.publishDiagnostics = opts.publishDiagnostics;
  }

  /**
   * Handle LSP initialize request. Returns server capabilities.
   */
  onInitialize(_params: InitializeParams): InitializeResult {
    return {
      capabilities: {
        // Full document sync — client sends the entire document on change.
        textDocumentSync: 1 as TextDocumentSyncKindType, // TextDocumentSyncKind.Full
        completionProvider: {
          triggerCharacters: ['"', ' ', '.', ':'],
        },
        hoverProvider: true,
        codeActionProvider: true,
        semanticTokensProvider: {
          legend: buildTokenLegend(),
          full: true,
        } as SemanticTokensOptions,
        codeLensProvider: {},
      },
    };
  }

  /**
   * Handle textDocument/didOpen — compile and publish diagnostics.
   */
  async onDidOpen(params: DidOpenTextDocumentParams): Promise<void> {
    const { uri, text, version } = params.textDocument;
    this.documents.set(uri, { uri, content: text, version });
    await this.compileAndPublish(uri, text);
  }

  /**
   * Handle textDocument/didChange — update content and recompile.
   */
  async onDidChange(params: DidChangeTextDocumentParams): Promise<void> {
    const { uri, version } = params.textDocument;
    // Full sync: the last contentChange has the full text.
    const changes = params.contentChanges;
    const fullText = changes[changes.length - 1]?.text;
    if (fullText === undefined) return;

    this.documents.set(uri, { uri, content: fullText, version });
    await this.compileAndPublish(uri, fullText);
  }

  /**
   * Handle textDocument/didClose — remove state and clear diagnostics.
   */
  onDidClose(params: DidCloseTextDocumentParams): void {
    const { uri } = params.textDocument;
    this.documents.delete(uri);
    this.host.invalidate(uri);
    this.publishDiagnostics({ uri, diagnostics: [] });
  }

  /**
   * Handle textDocument/didSave — recompile to catch on-disk changes.
   */
  async onDidSave(params: DidSaveTextDocumentParams): Promise<void> {
    const { uri } = params.textDocument;
    const doc = this.documents.get(uri);
    if (doc) {
      await this.compileAndPublish(uri, doc.content);
    }
  }

  /**
   * Handle textDocument/completion — return completion items for the cursor position.
   */
  onCompletion(params: CompletionParams): readonly ClawsCompletionItem[] {
    const { uri } = params.textDocument;
    const { line, character } = params.position;
    const doc = this.documents.get(uri);
    if (!doc) return [];

    const lines = doc.content.split('\n');
    const lineText = lines[line] ?? '';

    const ir = this.host.getCachedIR(uri);
    return computeCompletions(lineText, character, ir);
  }

  /**
   * Handle textDocument/hover — return a risk card for tool names.
   */
  onHover(params: HoverParams): HoverResult | undefined {
    const { uri } = params.textDocument;
    const { line, character } = params.position;
    const doc = this.documents.get(uri);
    if (!doc) return undefined;

    const ir = this.host.getCachedIR(uri);
    if (!ir) return undefined;

    const lines = doc.content.split('\n');
    const lineText = lines[line] ?? '';

    return computeHover(lineText, character, ir);
  }

  /**
   * Get all open document URIs (for testing).
   */
  get openDocuments(): readonly string[] {
    return [...this.documents.keys()];
  }

  /**
   * Get the underlying CompilationHost (for testing/advanced usage).
   */
  get compilationHost(): CompilationHost {
    return this.host;
  }

  /**
   * Dispose the server — clear all state.
   */
  dispose(): void {
    this.host.clear();
    this.documents.clear();
  }

  /**
   * Compile a file and publish diagnostics for it and any cross-file tensions.
   */
  private async compileAndPublish(uri: string, content: string): Promise<void> {
    this.host.notifyChange(uri, content);
    await this.host.flush();

    const ir = this.host.getCachedIR(uri);
    if (!ir) {
      // Compile failed — clear diagnostics for this file
      this.publishDiagnostics({ uri, diagnostics: [] });
      return;
    }

    // Primary diagnostics on the changed file
    const rawDiags = extractDiagnostics(ir);
    const lspDiags = toLspDiagnostics(rawDiags, content);
    this.publishDiagnostics({ uri, diagnostics: lspDiags });

    // Cross-file tension diagnostics
    const workspaceFiles = this.buildWorkspaceSnapshot();
    const tensions = computeTensions(uri, workspaceFiles);
    this.publishTensions(tensions);
  }

  /**
   * Build a snapshot of all open documents with their cached IR
   * for cross-file tension analysis.
   */
  private buildWorkspaceSnapshot(): Map<string, { content: string; ir: GovernanceIRLike }> {
    const snapshot = new Map<string, { content: string; ir: GovernanceIRLike }>();
    for (const [docUri, doc] of this.documents) {
      const ir = this.host.getCachedIR(docUri);
      if (ir) {
        snapshot.set(docUri, { content: doc.content, ir });
      }
    }
    return snapshot;
  }

  /**
   * Publish tension diagnostics grouped by target URI.
   * Tensions are only emitted for open documents with cached IR
   * (guaranteed by buildWorkspaceSnapshot producing the tension inputs).
   */
  private publishTensions(tensions: readonly TensionDiagnostic[]): void {
    if (tensions.length === 0) return;

    // Group by target URI
    const grouped = new Map<string, TensionDiagnostic[]>();
    for (const t of tensions) {
      const existing = grouped.get(t.targetUri);
      if (existing) {
        existing.push(t);
      } else {
        grouped.set(t.targetUri, [t]);
      }
    }

    for (const [targetUri, items] of grouped) {
      const doc = this.documents.get(targetUri)!;
      const ir = this.host.getCachedIR(targetUri)!;
      const baseDiags = toLspDiagnostics(extractDiagnostics(ir), doc.content);
      const tensionDiags = items.map((t) => t.diagnostic);
      this.publishDiagnostics({
        uri: targetUri,
        diagnostics: [...baseDiags, ...tensionDiags],
      });
    }
  }
}

/**
 * Wire a ClawsServer to an LSP Connection.
 * Call this from the transport-specific entry point.
 */
export function attachToConnection(connection: Connection, compileFn: CompileFn): ClawsServer {
  const server = new ClawsServer({
    compileFn,
    publishDiagnostics: (params) => connection.sendDiagnostics(params),
  });

  connection.onInitialize((params) => server.onInitialize(params));
  connection.onDidOpenTextDocument((params) => { void server.onDidOpen(params); });
  connection.onDidChangeTextDocument((params) => { void server.onDidChange(params); });
  connection.onDidCloseTextDocument((params) => server.onDidClose(params));
  connection.onDidSaveTextDocument((params) => { void server.onDidSave(params); });
  connection.onCompletion((params) => {
    const items = server.onCompletion(params);
    // Cast to LSP CompletionItem[] — our CompletionItem is structurally
    // compatible but uses numeric literals instead of the enum type.
    return items as unknown as import('vscode-languageserver').CompletionItem[];
  });
  connection.onHover((params) => {
    const result = server.onHover(params);
    if (!result) return null;
    return { contents: { kind: 'markdown' as const, value: result.contents } };
  });
  connection.onShutdown(() => server.dispose());

  return server;
}
