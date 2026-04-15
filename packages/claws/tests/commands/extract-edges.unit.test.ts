/**
 * L0: extract command edge cases — mocked SDK for branch coverage on
 * happy path, JSON output, verbose output, and empty results.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

let mockExtractAll = vi.fn().mockResolvedValue([]);

vi.mock('@bic/claws-sdk/compile', () => ({
  parse: vi.fn(),
  verifyExtractionResult: vi.fn(),
  ExtractorLLM: class MockExtractorLLM {
    get available() { return true; }
    get modelId() { return 'mock-model'; }
    extractAll(...args: unknown[]) { return mockExtractAll(...args); }
  },
}));

vi.mock('../../src/core/llm.js', () => ({
  createLLMProvider: vi.fn(),
  LLM_HELP_TEXT: 'Use --llm to extract governance intent from natural language (requires ANTHROPIC_API_KEY). Without --llm, only explicit annotations and keyword heuristics are used.',
}));

import { parse, verifyExtractionResult } from '@bic/claws-sdk/compile';
import { createLLMProvider } from '../../src/core/llm.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runExtract } from '../../src/commands/extract.js';

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

/** Default verifier mock: passes all intents through as-is. */
function setupVerifierPassthrough() {
  vi.mocked(verifyExtractionResult).mockImplementation((result) => ({
    source: result.source,
    verifiedIntents: result.intents.map((i) => ({ intent: i, outcome: 'exact' as const, verified: true })),
    passedIntents: result.intents,
    diagnostics: [],
    exactCount: result.intents.length,
    fuzzyCount: 0,
    mismatchCount: 0,
  }));
}

describe('claws extract — edge-case branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockExtractAll = vi.fn().mockResolvedValue([]);
  });

  it('renders text preview with intents', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [{ source: 'SOUL.md', status: 'present', content: '# Soul\n' }],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'deny', target: 'production-db', description: 'No prod DB access', confidence: 0.92, line: 3, sourceText: 'Never access production databases.' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('LLM Extraction Preview');
      expect(output).toContain('SOUL.md:');
      expect(output).toContain('deny production-db');
      expect(output).toContain('confidence 0.92');
      expect(output).toContain('1 verified intent(s) extracted');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders text preview with verbose sourceText', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [{ source: 'SOUL.md', status: 'present', content: '# Soul\n' }],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'deny', target: 'production-db', description: 'No prod DB access', confidence: 0.92, line: 3, sourceText: 'Never access production databases.' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: true, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('"Never access production databases."');
      expect(output).toContain('Parsed 1 files');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders JSON preview with intents', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [{ source: 'SOUL.md', status: 'present', content: '# Soul\n' }],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'deny', target: 'production-db', description: 'No prod DB access', confidence: 0.92, line: 3, sourceText: 'Never access production databases.' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: true, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('preview');
      expect(parsed.model).toBe('mock-model');
      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0].source).toBe('SOUL.md');
      expect(parsed.files[0].intents).toHaveLength(1);
      expect(parsed.files[0].intents[0].kind).toBe('deny');
      expect(parsed.files[0].intents[0].confidence).toBe(0.92);
      expect(parsed.totalIntents).toBe(1);
      expect(typeof parsed.durationMs).toBe('number');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders empty results with help text', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [{ source: 'SOUL.md', status: 'present', content: '# Soul\n' }],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('0 verified intent(s) extracted');
      expect(output).toContain('No intents found');
      expect(output).toContain('ANTHROPIC_API_KEY');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 when parse halts', async () => {
    const ctx = makeCtx();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: true,
      entries: [],
      presentCount: 0,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(3);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 when parse halts with --json', async () => {
    const ctx = makeCtx();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: true,
      entries: [],
      presentCount: 0,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: true, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('CLAWS-E021');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders intent without line number', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'require', target: 'validation', description: 'Input validation', confidence: 0.85, sourceText: 'Always validate input.' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: true, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.files[0].intents[0]).not.toHaveProperty('line');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('passes llmModel through when provided', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'custom-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true, llmModel: 'claude-haiku-4-5-20251001' },
      );
      expect(exitCode).toBe(0);
      // Verify createLLMProvider was called with the model
      expect(createLLMProvider).toHaveBeenCalledWith(
        expect.objectContaining({ llm: true, llmModel: 'claude-haiku-4-5-20251001' }),
        false,
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders text output with dropped intents from verification failure', async () => {
    const ctx = makeCtx();
    // Verifier drops 2 of 3 intents due to source mismatch
    vi.mocked(verifyExtractionResult).mockImplementation((result) => {
      const passed = result.intents.slice(0, 1);
      return {
        source: result.source,
        verifiedIntents: result.intents.map((i, idx) => ({
          intent: i,
          outcome: idx === 0 ? 'exact' as const : 'mismatch' as const,
          verified: idx === 0,
        })),
        passedIntents: passed,
        diagnostics: [],
        exactCount: 1,
        fuzzyCount: 0,
        mismatchCount: 2,
      };
    });
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [{ source: 'SOUL.md', status: 'present', content: '# Soul\nNever access prod.\n' }],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'deny', target: 'prod-db', description: 'No prod DB', confidence: 0.92, sourceText: 'Never access prod.' },
          { kind: 'deny', target: 'shell', description: 'No shell', confidence: 0.80, sourceText: 'hallucinated line' },
          { kind: 'require', target: 'approval', description: 'Need approval', confidence: 0.70, sourceText: 'also hallucinated' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('1 verified intent(s) extracted');
      expect(output).toContain('2 intent(s) dropped (source verification failed)');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders JSON output with droppedIntents when verification fails', async () => {
    const ctx = makeCtx();
    vi.mocked(verifyExtractionResult).mockImplementation((result) => ({
      source: result.source,
      verifiedIntents: result.intents.map((i) => ({
        intent: i,
        outcome: 'mismatch' as const,
        verified: false,
      })),
      passedIntents: [],
      diagnostics: [],
      exactCount: 0,
      fuzzyCount: 0,
      mismatchCount: result.intents.length,
    }));
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [{ source: 'SOUL.md', status: 'present', content: '# Soul\n' }],
      presentCount: 1,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'deny', target: 'shell', description: 'No shell', confidence: 0.9, sourceText: 'hallucinated' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: true, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.totalIntents).toBe(0);
      expect(parsed.droppedIntents).toBe(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders text output with file that has 0 intents (skipped)', async () => {
    const ctx = makeCtx();
    setupVerifierPassthrough();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'mock-model', extract: vi.fn(), validate: vi.fn() },
    });
    vi.mocked(parse).mockResolvedValue({
      shouldHalt: false,
      entries: [],
      presentCount: 2,
      absentCount: 0,
    } as Awaited<ReturnType<typeof parse>>);
    mockExtractAll = vi.fn().mockResolvedValue([
      { source: 'TOOLS.md', intents: [], modelId: 'mock-model' },
      {
        source: 'SOUL.md',
        intents: [
          { kind: 'deny', target: 'db', description: 'No DB', confidence: 0.9, sourceText: 'text' },
        ],
        modelId: 'mock-model',
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runExtract(
        ctx,
        { json: false, verbose: false, preview: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      // TOOLS.md should not appear (0 intents, skipped)
      expect(output).not.toContain('TOOLS.md:');
      expect(output).toContain('SOUL.md:');
      expect(output).toContain('1 verified intent(s) extracted');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
