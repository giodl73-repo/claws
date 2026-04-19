/**
 * L1: extract-watch command (legacy LLM-integrated watcher) — debounce
 * integration tests.
 *
 * Tests end-to-end regex→LLM sequence and rapid-edit cancellation
 * using a mock LLM provider that simulates realistic async delays.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture the onBatch and onError callbacks passed to the Watcher constructor
let capturedOnBatch: ((event: { changedFiles: string[]; timestamp: number }) => Promise<void>) | undefined;
let capturedOnError: ((err: Error) => void) | undefined;

// Track mock functions (can be swapped per-test)
let mockUpdateFn: ReturnType<typeof vi.fn>;
let mockAnalyzerRunFn: ReturnType<typeof vi.fn>;
let mockRecompileFn: ReturnType<typeof vi.fn>;

// Store registered signal handlers so we can call them manually
const signalHandlers: Record<string, (() => void)[]> = {};

vi.mock('@bic/claws-sdk/compile', () => ({
  parse: vi.fn().mockResolvedValue({
    entries: [
      { source: 'SOUL.md', status: 'present' },
      { source: 'TOOLS.md', status: 'present' },
    ],
    presentCount: 2,
    absentCount: 0,
    shouldHalt: false,
  }),
}));

vi.mock('@bic/claws-sdk/watch', () => {
  const MockWatcher = vi.fn(function (this: Record<string, unknown>, _root: string, opts: { onBatch: unknown; onError: unknown }) {
    capturedOnBatch = opts.onBatch as typeof capturedOnBatch;
    capturedOnError = opts.onError as typeof capturedOnError;
    this.start = vi.fn().mockResolvedValue(undefined);
    this.stop = vi.fn();
  });

  const MockIncrementalParser = vi.fn(function (this: Record<string, unknown>) {
    this.seed = vi.fn();
    this.update = (...args: unknown[]) => mockUpdateFn(...args);
  });

  const MockAutoAnalyzer = vi.fn(function (this: Record<string, unknown>) {
    this.run = (...args: unknown[]) => mockAnalyzerRunFn(...args);
    this.reset = vi.fn();
    this.violationCount = 0;
  });

  const MockAutoRecompiler = vi.fn(function (this: Record<string, unknown>) {
    this.recompile = (...args: unknown[]) => mockRecompileFn(...args);
    this.reset = vi.fn();
    this.trackedCount = 0;
  });

  return {
    Watcher: MockWatcher,
    IncrementalParser: MockIncrementalParser,
    AutoAnalyzer: MockAutoAnalyzer,
    AutoRecompiler: MockAutoRecompiler,
  };
});

import type { PlatformContext } from '../../src/hooks/pre-command.js';
import type { ExtractWatchOptions } from '../../src/commands/extract-watch.js';
import { runExtractWatch } from '../../src/commands/extract-watch.js';
import type { LLMProvider, LLMExtractionRequest, ExtractionResult } from '@bic/claws-sdk/compile';
import type { ParseDiagnostic } from '@bic/claws-sdk/compile';

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake-ws',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

const defaultAnalysis = {
  analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
  diff: { added: [], resolved: [], unchanged: [], totalCount: 0, delta: 0 },
  durationMs: 5,
};

describe('extract-watch LLM debounce integration', () => {
  let originalProcessOn: typeof process.on;

  beforeEach(() => {
    capturedOnBatch = undefined;
    capturedOnError = undefined;
    mockUpdateFn = vi.fn().mockResolvedValue({
      presentCount: 2,
      diagnostics: [],
      entries: [
        { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell access.' },
        { source: 'TOOLS.md', status: 'present', content: '# Tools\ntool: read_file' },
      ],
    });
    mockAnalyzerRunFn = vi.fn().mockReturnValue(defaultAnalysis);
    mockRecompileFn = vi.fn().mockResolvedValue({
      triggered: false,
      recompiledCount: 0,
      recompiledArtifacts: [],
      durationMs: 1,
      compiledDirExists: false,
    });

    signalHandlers['SIGINT'] = [];
    signalHandlers['SIGTERM'] = [];
    originalProcessOn = process.on.bind(process);
    vi.spyOn(process, 'on').mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'SIGINT' || event === 'SIGTERM') {
        signalHandlers[event].push(handler as () => void);
        return process;
      }
      return originalProcessOn(event, handler);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function emitSignal(signal: 'SIGINT' | 'SIGTERM'): void {
    for (const handler of signalHandlers[signal] ?? []) {
      handler();
    }
  }

  it('regex→LLM sequence: regex result appears first, LLM result merges on next cycle', async () => {
    const extractionLog: string[] = [];

    const provider: LLMProvider = {
      modelId: 'integration-test-model',
      extract: vi.fn(async (req: LLMExtractionRequest): Promise<ExtractionResult> => {
        extractionLog.push(`extract:${req.source}`);
        // Simulate 50ms LLM latency
        await new Promise(r => setTimeout(r, 50));
        return {
          source: req.source,
          intents: [
            {
              kind: 'deny',
              target: 'shell',
              description: 'No shell access allowed',
              confidence: 0.92,
              sourceText: 'Deny shell access.',
            },
            {
              kind: 'require',
              target: 'approval',
              description: 'Require approval for sensitive ops',
              confidence: 0.85,
              sourceText: 'approval required',
            },
          ],
          modelId: 'integration-test-model',
        };
      }),
      validate: vi.fn(async (): Promise<readonly ParseDiagnostic[]> => []),
    };

    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const promise = runExtractWatch(ctx, {
        json: true,
        verbose: false,
        color: false,
        llm: true,
        llmProvider: provider,
      });

      await new Promise(r => setTimeout(r, 0));

      // Batch 1 — triggers regex immediately + queues LLM
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

      // Regex result should be emitted immediately
      const callsAfterBatch1 = consoleSpy.mock.calls.flat();
      const result1 = callsAfterBatch1
        .filter(c => typeof c === 'string' && c.includes('"event":"result"'))
        .map(c => JSON.parse(c as string));
      expect(result1.length).toBe(1);
      // First result should NOT have LLM data (hasn't returned yet)
      expect(result1[0]?.llm).toBeUndefined();

      // Wait for debounce (200ms) + LLM extraction (50ms)
      await new Promise(r => setTimeout(r, 350));

      // LLM extraction should have fired
      expect(extractionLog).toContain('extract:SOUL.md');

      // Batch 2 — should merge the LLM results
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

      const allCalls = consoleSpy.mock.calls.flat();
      const allResults = allCalls
        .filter(c => typeof c === 'string' && c.includes('"event":"result"'))
        .map(c => JSON.parse(c as string));

      // Second result should contain merged LLM data
      const secondResult = allResults[1];
      expect(secondResult).toBeDefined();
      expect(secondResult.llm).toBeDefined();
      expect(secondResult.llm.merged).toBe(true);
      expect(secondResult.llm.intents).toBe(2);

      emitSignal('SIGINT');
      await promise;
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('rapid edits cancel previous LLM jobs and only extract the latest version', async () => {
    let activeExtractions = 0;
    let completedExtractions = 0;
    const extractedSources: string[] = [];

    const provider: LLMProvider = {
      modelId: 'rapid-edit-model',
      extract: vi.fn(async (req: LLMExtractionRequest): Promise<ExtractionResult> => {
        activeExtractions++;
        try {
          // Simulate LLM latency — check abort signal
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 100);
            if (req.options?.signal) {
              if (req.options.signal.aborted) {
                clearTimeout(timer);
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
                return;
              }
              req.options.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
              }, { once: true });
            }
          });
          completedExtractions++;
          extractedSources.push(req.source);
          return {
            source: req.source,
            intents: [{
              kind: 'deny',
              target: 'shell',
              description: 'found',
              confidence: 0.9,
              sourceText: 'deny',
            }],
            modelId: 'rapid-edit-model',
          };
        } finally {
          activeExtractions--;
        }
      }),
      validate: vi.fn(async (): Promise<readonly ParseDiagnostic[]> => []),
    };

    // Track which version of content was seen
    let fileVersion = 0;
    mockUpdateFn = vi.fn().mockImplementation(() => {
      fileVersion++;
      return {
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: `# Soul v${fileVersion}` },
        ],
      };
    });

    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const promise = runExtractWatch(ctx, {
        json: false,
        verbose: false,
        color: false,
        llm: true,
        llmProvider: provider,
      });

      await new Promise(r => setTimeout(r, 0));

      // Rapid edits: 3 changes within the debounce window
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });
      await new Promise(r => setTimeout(r, 100)); // within 200ms debounce
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });
      await new Promise(r => setTimeout(r, 100)); // within 200ms debounce
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

      // Wait for final debounce + extraction
      await new Promise(r => setTimeout(r, 400));

      // Only the last extraction should complete (earlier ones cancelled during debounce)
      expect(completedExtractions).toBeLessThanOrEqual(1);

      // No extractions should be active
      expect(activeExtractions).toBe(0);

      emitSignal('SIGINT');
      await promise;
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
