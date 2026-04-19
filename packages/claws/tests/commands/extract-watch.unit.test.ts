/**
 * L0: extract-watch command (legacy LLM-integrated watcher) — start/stop,
 * event rendering, error paths, LLM debounce.
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
      { source: 'AGENTS.md', status: 'absent' },
    ],
    presentCount: 2,
    absentCount: 1,
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

describe('claws extract-watch', () => {
  let originalProcessOn: typeof process.on;

  beforeEach(() => {
    capturedOnBatch = undefined;
    capturedOnError = undefined;
    mockUpdateFn = vi.fn().mockResolvedValue({
      presentCount: 2,
      diagnostics: [],
    });
    mockAnalyzerRunFn = vi.fn().mockReturnValue({
      analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
      diff: { added: [], resolved: [], unchanged: [], totalCount: 0, delta: 0 },
      durationMs: 5,
    });
    mockRecompileFn = vi.fn().mockResolvedValue({
      triggered: false,
      recompiledCount: 0,
      recompiledArtifacts: [],
      durationMs: 1,
      compiledDirExists: false,
    });

    // Intercept process.on to capture signal handlers
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

  /** Simulate signal delivery by calling captured handler. */
  function emitSignal(signal: 'SIGINT' | 'SIGTERM'): void {
    for (const handler of signalHandlers[signal] ?? []) {
      handler();
    }
  }

  it('returns exit 3 when no workspace is detected (text)', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtractWatch(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 when no workspace is detected (json)', async () => {
    const ctx = makeCtx({ hasConfig: false });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtractWatch(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('prints text start message and resolves 0 on SIGINT', async () => {
    const ctx = makeCtx();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      // Give microtask queue a tick so runWatch registers signal handlers
      await new Promise(r => setTimeout(r, 0));

      emitSignal('SIGINT');

      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('claws extract-watch');
      expect(output).toContain('monitoring 2 files');
      expect(output).toContain('violation(s) at start');
      expect(output).toContain('Ctrl+C');
      expect(output).toContain('Stopped watching');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('prints JSON start event and resolves 0 on SIGTERM', async () => {
    const ctx = makeCtx();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: true, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      emitSignal('SIGTERM');

      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const calls = consoleSpy.mock.calls.flat();
      const startEvent = JSON.parse(calls[0] as string);
      expect(startEvent.event).toBe('start');
      expect(startEvent.workspaceRoot).toBe('/tmp/fake-ws');
      expect(startEvent.watchedFiles).toEqual(['SOUL.md', 'TOOLS.md']);
      expect(startEvent.initialViolations).toBe(0);

      const stopEvent = JSON.parse(calls[calls.length - 1] as string);
      expect(stopEvent.event).toBe('stop');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders text change and violation result via onBatch callback', { timeout: 15_000 }, async () => {
    const ctx = makeCtx();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      // Allow watcher setup — CI runners may need more than one tick
      for (let i = 0; i < 50 && !capturedOnBatch; i++) {
        await new Promise(r => setTimeout(r, 10));
      }
      expect(capturedOnBatch).toBeDefined();
      await capturedOnBatch!({
        changedFiles: ['SOUL.md'],
        timestamp: Date.now(),
      });

      emitSignal('SIGINT');
      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('changed:');
      expect(output).toContain('SOUL.md');
      expect(output).toContain('re-checking');
      expect(output).toContain('violation(s)');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders JSON change and result events via onBatch callback', async () => {
    const ctx = makeCtx();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: true, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({
        changedFiles: ['TOOLS.md'],
        timestamp: 1700000000000,
      });

      emitSignal('SIGINT');
      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const calls = consoleSpy.mock.calls.flat().map(c => JSON.parse(c as string));
      const changeEvent = calls.find((c: { event: string }) => c.event === 'change');
      expect(changeEvent).toBeDefined();
      expect(changeEvent.files).toEqual(['TOOLS.md']);
      expect(changeEvent.timestamp).toBe(1700000000000);

      const resultEvent = calls.find((c: { event: string }) => c.event === 'result');
      expect(resultEvent).toBeDefined();
      expect(resultEvent.presentCount).toBe(2);
      expect(resultEvent.diagnosticCount).toBe(0);
      expect(resultEvent.violations).toBeDefined();
      expect(resultEvent.violations.total).toBe(0);
      expect(resultEvent.violations.delta).toBe(0);
      expect(resultEvent.recompile).toBeDefined();
      expect(resultEvent.recompile.triggered).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders violation count and timing when diagnostics exist', async () => {
    const ctx = makeCtx();

    mockUpdateFn = vi.fn().mockResolvedValue({
      presentCount: 2,
      diagnostics: [{ message: 'warning 1' }, { message: 'warning 2' }],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({
        changedFiles: ['SOUL.md'],
        timestamp: Date.now(),
      });

      emitSignal('SIGINT');
      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('violation(s)');
      expect(output).toContain('ms');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('onError callback logs in verbose mode', async () => {
    const ctx = makeCtx();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: true, color: false });

      await new Promise(r => setTimeout(r, 0));
      expect(capturedOnError).toBeDefined();
      capturedOnError!(new Error('fs watch failure'));

      emitSignal('SIGINT');
      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('watch error:');
      expect(output).toContain('fs watch failure');
    } finally {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('onError callback is silent when not verbose', async () => {
    const ctx = makeCtx();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      expect(capturedOnError).toBeDefined();
      capturedOnError!(new Error('fs watch failure'));

      emitSignal('SIGINT');
      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).not.toContain('watch error');
    } finally {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // ── Violation delta branches ──────────────────────────────────────────

  it('renders positive violation delta as +N', async () => {
    const ctx = makeCtx();

    // After initial analysis, override run to return positive delta on batch
    let callCount = 0;
    mockAnalyzerRunFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Initial analysis
        return {
          analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
          diff: { added: [], resolved: [], unchanged: [], totalCount: 0, delta: 0 },
          durationMs: 5,
        };
      }
      return {
        analysis: { violations: [{ ruleId: 'R1' }], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
        diff: {
          added: [{ ruleId: 'TOOL-001', message: 'new violation', severity: 'error' }],
          resolved: [],
          unchanged: [],
          totalCount: 1,
          delta: 1,
        },
        durationMs: 3,
      };
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

      emitSignal('SIGINT');
      await promise;

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('+1');
      expect(output).toContain('new: TOOL-001');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders negative violation delta', async () => {
    const ctx = makeCtx();

    let callCount = 0;
    mockAnalyzerRunFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          analysis: { violations: [{ ruleId: 'R1' }], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
          diff: { added: [], resolved: [], unchanged: [], totalCount: 1, delta: 0 },
          durationMs: 5,
        };
      }
      return {
        analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
        diff: {
          added: [],
          resolved: [{ ruleId: 'TOOL-001', message: 'was violated', severity: 'error' }],
          unchanged: [],
          totalCount: 0,
          delta: -1,
        },
        durationMs: 4,
      };
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

      emitSignal('SIGINT');
      await promise;

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('-1');
      expect(output).toContain('resolved: TOOL-001');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  // ── Recompile branches ────────────────────────────────────────────────

  it('renders recompile summary when triggered', async () => {
    const ctx = makeCtx();

    mockRecompileFn = vi.fn().mockResolvedValue({
      triggered: true,
      recompiledCount: 2,
      recompiledArtifacts: ['governance-ir.json', 'capability-manifest.json'],
      durationMs: 45,
      compiledDirExists: true,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({ changedFiles: ['TOOLS.md'], timestamp: Date.now() });

      emitSignal('SIGINT');
      await promise;

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('recompiled 2 artifact(s)');
      expect(output).toContain('45ms');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders "artifacts up-to-date" when compiled dir exists but not triggered', async () => {
    const ctx = makeCtx();

    mockRecompileFn = vi.fn().mockResolvedValue({
      triggered: false,
      recompiledCount: 0,
      recompiledArtifacts: [],
      durationMs: 1,
      compiledDirExists: true,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: false, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

      emitSignal('SIGINT');
      await promise;

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('artifacts up-to-date');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  // ── JSON batch result with recompile triggered ────────────────────────

  it('renders JSON result with recompile triggered', async () => {
    const ctx = makeCtx();

    mockRecompileFn = vi.fn().mockResolvedValue({
      triggered: true,
      recompiledCount: 1,
      recompiledArtifacts: ['governance-ir.json'],
      durationMs: 30,
      compiledDirExists: true,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runExtractWatch(ctx, { json: true, verbose: false, color: false });

      await new Promise(r => setTimeout(r, 0));
      await capturedOnBatch!({ changedFiles: ['TOOLS.md'], timestamp: 1700000000000 });

      emitSignal('SIGINT');
      await promise;

      const calls = consoleSpy.mock.calls.flat().map(c => JSON.parse(c as string));
      const resultEvent = calls.find((c: { event: string }) => c.event === 'result');
      expect(resultEvent).toBeDefined();
      expect(resultEvent.recompile.triggered).toBe(true);
      expect(resultEvent.recompile.count).toBe(1);
      expect(resultEvent.recompile.durationMs).toBe(30);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  // ── LLM debounce ──────────────────────────────────────────────────────

  /** Create a mock LLMProvider for testing. */
  function makeMockProvider(overrides?: {
    extractDelay?: number;
    extractFn?: (req: LLMExtractionRequest) => Promise<ExtractionResult>;
  }): LLMProvider {
    const delay = overrides?.extractDelay ?? 0;
    const extractFn = overrides?.extractFn ?? (async (req: LLMExtractionRequest): Promise<ExtractionResult> => {
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
      return {
        source: req.source,
        intents: [
          {
            kind: 'deny',
            target: 'shell',
            description: 'LLM found shell denial',
            confidence: 0.95,
            sourceText: 'Do not use shell',
          },
        ],
        modelId: 'mock-model',
      };
    });

    return {
      modelId: 'mock-model',
      extract: vi.fn(extractFn),
      validate: vi.fn(async (): Promise<readonly ParseDiagnostic[]> => []),
    };
  }

  /** Make watch options with LLM enabled. */
  function makeLLMOpts(provider: LLMProvider, overrides?: Partial<ExtractWatchOptions>): ExtractWatchOptions {
    return {
      json: false,
      verbose: false,
      color: false,
      llm: true,
      llmProvider: provider,
      ...overrides,
    };
  }

  describe('LLM debounce', () => {
    it('runs regex pipeline immediately and queues LLM extraction in background', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      // Return entries with content so LLM extraction can find them
      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 2,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDo not use shell.' },
          { source: 'TOOLS.md', status: 'present', content: '# Tools' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));

        // Trigger a file change
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Regex result should be displayed immediately (before debounce fires)
        const outputBeforeDebounce = consoleSpy.mock.calls.flat().join(' ');
        expect(outputBeforeDebounce).toContain('violation(s)');

        // LLM extraction has NOT fired yet (it's debounced)
        expect(provider.extract).not.toHaveBeenCalled();

        // Wait for debounce (200ms) + extraction
        await new Promise(r => setTimeout(r, 300));

        // Now LLM extraction should have been called
        expect(provider.extract).toHaveBeenCalledTimes(1);

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('displays regex-first results and LLM update notification', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 2,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell.' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + extraction to complete
        await new Promise(r => setTimeout(r, 300));

        const output = consoleSpy.mock.calls.flat().join(' ');
        expect(output).toContain('LLM extraction updated: +1 intent(s)');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('merges LLM results into the next compile cycle', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 2,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell.' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider, { json: true }));

        await new Promise(r => setTimeout(r, 0));

        // First batch — triggers LLM extraction
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + extraction
        await new Promise(r => setTimeout(r, 300));

        // Second batch — should merge LLM results
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        const calls = consoleSpy.mock.calls.flat();
        const results = calls
          .filter(c => typeof c === 'string' && c.includes('"event":"result"'))
          .map(c => JSON.parse(c as string));

        // Second result should contain LLM merge data
        const secondResult = results[1];
        expect(secondResult).toBeDefined();
        expect(secondResult.llm).toBeDefined();
        expect(secondResult.llm.merged).toBe(true);
        expect(secondResult.llm.intents).toBe(1);

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('watch without --llm does not trigger LLM extraction', async () => {
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 2,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, { json: true, verbose: false, color: false });

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait longer than debounce window
        await new Promise(r => setTimeout(r, 300));

        const calls = consoleSpy.mock.calls.flat();
        const hasLLMEvent = calls.some(c =>
          typeof c === 'string' && c.includes('"llm-update"'),
        );
        expect(hasLLMEvent).toBe(false);

        // Result should not contain llm key
        const results = calls
          .filter(c => typeof c === 'string' && c.includes('"event":"result"'))
          .map(c => JSON.parse(c as string));
        expect(results[0]?.llm).toBeUndefined();

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('cancels pending LLM jobs on rapid edits (only latest file extracted)', async () => {
      let extractCallCount = 0;
      const provider = makeMockProvider({
        extractDelay: 100,
        extractFn: async (req: LLMExtractionRequest): Promise<ExtractionResult> => {
          extractCallCount++;
          // Simulate delay during which abort could fire
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 100);
            if (req.options?.signal) {
              req.options.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
              }, { once: true });
            }
          });
          return {
            source: req.source,
            intents: [{
              kind: 'deny',
              target: 'shell',
              description: 'LLM intent',
              confidence: 0.9,
              sourceText: 'deny shell',
            }],
            modelId: 'mock-model',
          };
        },
      });
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 2,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul v1' },
          { source: 'TOOLS.md', status: 'present', content: '# Tools v1' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));

        // Rapid edits — fire 3 batches in quick succession (within debounce window)
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });
        await new Promise(r => setTimeout(r, 50)); // within 200ms debounce
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });
        await new Promise(r => setTimeout(r, 50)); // still within debounce
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for final debounce + extraction
        await new Promise(r => setTimeout(r, 400));

        // Only 1 extraction should have completed (the last one)
        // Earlier ones should have been cancelled
        expect(extractCallCount).toBeLessThanOrEqual(1);

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('handles LLM timeout by falling back to regex silently', async () => {
      const provider = makeMockProvider({
        extractFn: async (): Promise<ExtractionResult> => {
          throw new Error('Request timed out');
        },
      });
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + failed extraction
        await new Promise(r => setTimeout(r, 300));

        // No crash — regex results should still be displayed
        const output = consoleSpy.mock.calls.flat().join(' ');
        expect(output).toContain('violation(s)');

        // Error should NOT be logged in non-verbose mode
        const errorOutput = errorSpy.mock.calls.flat().join(' ');
        expect(errorOutput).not.toContain('LLM extraction error');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('logs LLM error in verbose mode', async () => {
      const provider = makeMockProvider({
        extractFn: async (): Promise<ExtractionResult> => {
          throw new Error('API rate limited');
        },
      });
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider, { verbose: true }));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + failed extraction
        await new Promise(r => setTimeout(r, 300));

        // Error should be logged in verbose mode
        const errorOutput = errorSpy.mock.calls.flat().join(' ');
        expect(errorOutput).toContain('LLM extraction error');
        expect(errorOutput).toContain('API rate limited');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('text mode shows LLM model in start message and merged intents on next cycle', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell.' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));

        // Start message should include LLM model
        const startOutput = consoleSpy.mock.calls.flat().join(' ');
        expect(startOutput).toContain('LLM extraction: mock-model');

        // Trigger first batch to queue LLM extraction
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + extraction
        await new Promise(r => setTimeout(r, 300));

        // Trigger second batch to merge LLM results (text mode)
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        const fullOutput = consoleSpy.mock.calls.flat().join(' ');
        expect(fullOutput).toContain('LLM merged: +1 intent(s)');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('JSON start event includes llm info when enabled', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider, { json: true }));

        await new Promise(r => setTimeout(r, 0));

        const calls = consoleSpy.mock.calls.flat();
        const startEvent = JSON.parse(calls[0] as string);
        expect(startEvent.event).toBe('start');
        expect(startEvent.llm).toBeDefined();
        expect(startEvent.llm.enabled).toBe(true);
        expect(startEvent.llm.modelId).toBe('mock-model');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('shutdown cancels pending LLM jobs', async () => {
      const provider = makeMockProvider({ extractDelay: 500 });
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));

        // Trigger batch to queue LLM extraction
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Immediately shutdown (before debounce fires)
        emitSignal('SIGINT');

        const exitCode = await promise;
        expect(exitCode).toBe(0);

        // LLM extraction should NOT have been called (cancelled by shutdown)
        expect(provider.extract).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('emits JSON llm-update event when extraction finds intents', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell.' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider, { json: true }));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + extraction
        await new Promise(r => setTimeout(r, 300));

        const calls = consoleSpy.mock.calls.flat();
        const llmUpdate = calls
          .filter(c => typeof c === 'string' && c.includes('"event":"llm-update"'))
          .map(c => JSON.parse(c as string));

        expect(llmUpdate.length).toBe(1);
        expect(llmUpdate[0].intents).toBe(1);
        expect(llmUpdate[0].files).toContain('SOUL.md');
        expect(llmUpdate[0].timestamp).toBeTypeOf('number');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('suppresses LLM-update notification when extraction finds zero intents', async () => {
      const provider = makeMockProvider({
        extractFn: async (req: LLMExtractionRequest): Promise<ExtractionResult> => ({
          source: req.source,
          intents: [],
          modelId: 'mock-model',
        }),
      });
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + extraction
        await new Promise(r => setTimeout(r, 300));

        const output = consoleSpy.mock.calls.flat().join(' ');
        // No LLM update should appear (0 intents)
        expect(output).not.toContain('LLM extraction updated');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('outer debounce catch logs in verbose mode when inner catch re-throws', async () => {
      // To reach the outer .catch() safety net, the inner catch must fail.
      // We make console.error throw during the inner catch's verbose logging,
      // which escapes the inner catch and is caught by the outer .catch.
      const provider = makeMockProvider({
        extractFn: async (): Promise<ExtractionResult> => {
          throw new Error('LLM API failure');
        },
      });
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell.' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // Make console.error throw once (inner catch) then work normally (outer catch)
      let errorCallCount = 0;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation((..._args: unknown[]) => {
        errorCallCount++;
        if (errorCallCount === 1) {
          throw new Error('console.error blew up');
        }
        // Subsequent calls (outer .catch) work normally
      });
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider, { verbose: true }));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        // Wait for debounce + extraction + inner catch throw + outer catch
        await new Promise(r => setTimeout(r, 400));

        const errorOutput = errorSpy.mock.calls.flat().join(' ');
        expect(errorOutput).toContain('LLM debounce error');
        expect(errorOutput).toContain('console.error blew up');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('outer debounce catch is silent when not verbose', async () => {
      // Same trigger mechanism but verbose=false so outer catch is silent.
      // We also need the inner catch to trigger: provider throws,
      // verbose is false so inner catch is silent (no console.error call).
      // But then nothing escapes inner catch and outer catch isn't reached.
      // For non-verbose outer catch, we need a different trigger:
      // make provider.extract return a result, then make the reduce throw.
      const provider: LLMProvider = {
        modelId: 'crash-model',
        extract: vi.fn(async (req: LLMExtractionRequest): Promise<ExtractionResult> => {
          // Return a result that will be pushed to results[]
          return {
            source: req.source,
            intents: [{
              kind: 'deny',
              target: 'shell',
              description: 'found',
              confidence: 0.9,
              sourceText: 'deny shell',
            }],
            modelId: 'crash-model',
          };
        }),
        validate: vi.fn(async (): Promise<readonly ParseDiagnostic[]> => []),
      };
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'present', content: '# Soul\nDeny shell.' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        // Make console.log throw when LLM-update JSON is logged
        const text = args.map(a => String(a)).join(' ');
        if (text.includes('LLM extraction updated') || text.includes('llm-update')) {
          throw new Error('log crash');
        }
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider, { verbose: false }));

        await new Promise(r => setTimeout(r, 0));
        await capturedOnBatch!({ changedFiles: ['SOUL.md'], timestamp: Date.now() });

        await new Promise(r => setTimeout(r, 400));

        const errorOutput = errorSpy.mock.calls.flat().join(' ');
        // Non-verbose: outer catch should NOT log
        expect(errorOutput).not.toContain('LLM debounce error');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('skips LLM extraction for files with no content (partial file set)', async () => {
      const provider = makeMockProvider();
      const ctx = makeCtx();

      mockUpdateFn = vi.fn().mockResolvedValue({
        presentCount: 1,
        diagnostics: [],
        entries: [
          { source: 'SOUL.md', status: 'absent' },
          { source: 'TOOLS.md', status: 'present', content: '# Tools' },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const promise = runExtractWatch(ctx, makeLLMOpts(provider));

        await new Promise(r => setTimeout(r, 0));

        // Change includes an absent file and a present file
        await capturedOnBatch!({ changedFiles: ['SOUL.md', 'TOOLS.md'], timestamp: Date.now() });

        // Wait for debounce + extraction
        await new Promise(r => setTimeout(r, 300));

        // Only TOOLS.md should be extracted (SOUL.md is absent)
        const extractCalls = (provider.extract as ReturnType<typeof vi.fn>).mock.calls;
        expect(extractCalls.length).toBe(1);
        expect(extractCalls[0]![0].source).toBe('TOOLS.md');

        emitSignal('SIGINT');
        await promise;
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });
});
