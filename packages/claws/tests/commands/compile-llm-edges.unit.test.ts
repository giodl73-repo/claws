/**
 * L0: compile command LLM edge cases — mocked SDK for branch coverage on
 * LLM extraction verbose path and JSON LLM section.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

let mockExtractVerifyMerge = vi.fn().mockResolvedValue(null);
let mockLLMAvailable = false;
let mockModelId = 'none';

vi.mock('@bic/claws-sdk/compile', () => ({
  parse: vi.fn(),
  extractAllIntents: vi.fn(),
  buildGovernanceAST: vi.fn(),
  extract: vi.fn(),
  detectConflicts: vi.fn(),
  buildCapabilityManifest: vi.fn(),
  toIRConflictReport: vi.fn(),
  COMPILER_VERSION: '0.36.0',
  SCHEMA_VERSION: 1,
  analyze: vi.fn(),
  buildRegexIntentMap: vi.fn().mockReturnValue(new Map()),
  ExtractorLLM: class MockExtractorLLM {
    get available() { return mockLLMAvailable; }
    get modelId() { return mockModelId; }
    extractVerifyMerge(...args: unknown[]) { return mockExtractVerifyMerge(...args); }
  },
}));

vi.mock('@bic/claws-sdk/governance', () => ({
  createDefaultRegistry: vi.fn(),
}));

vi.mock('@bic/claws-sdk/ir', () => ({
  serialize: vi.fn().mockReturnValue('{}'),
}));

vi.mock('../../src/core/cache.js', () => ({
  checkBuildCache: vi.fn(),
  storeBuildCache: vi.fn(),
}));

vi.mock('../../src/core/audit.js', () => ({
  writeBypassAuditEvent: vi.fn(),
}));

vi.mock('../../src/core/llm.js', () => ({
  createLLMProvider: vi.fn(),
  LLM_HELP_TEXT: 'test help text',
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  detectConflicts,
  buildCapabilityManifest,
  toIRConflictReport,
  analyze,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import { checkBuildCache, storeBuildCache } from '../../src/core/cache.js';
import { createLLMProvider } from '../../src/core/llm.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';

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

function setupPipelineMocks() {
  vi.mocked(checkBuildCache).mockResolvedValue({ skip: false, message: '' });
  vi.mocked(storeBuildCache).mockResolvedValue(undefined);
  vi.mocked(parse).mockResolvedValue({
    shouldHalt: false, entries: [], presentCount: 1, absentCount: 0,
  } as Awaited<ReturnType<typeof parse>>);
  vi.mocked(extractAllIntents).mockReturnValue([] as ReturnType<typeof extractAllIntents>);
  vi.mocked(buildGovernanceAST).mockReturnValue({} as ReturnType<typeof buildGovernanceAST>);
  vi.mocked(extract).mockReturnValue({} as ReturnType<typeof extract>);
  vi.mocked(detectConflicts).mockReturnValue({ conflicts: [] } as ReturnType<typeof detectConflicts>);
  vi.mocked(buildCapabilityManifest).mockReturnValue({} as ReturnType<typeof buildCapabilityManifest>);
  vi.mocked(toIRConflictReport).mockReturnValue({ conflicts: [] } as ReturnType<typeof toIRConflictReport>);
  vi.mocked(createDefaultRegistry).mockReturnValue({} as ReturnType<typeof createDefaultRegistry>);
  vi.mocked(analyze).mockReturnValue({ violations: [] } as ReturnType<typeof analyze>);
}

describe('claws compile — LLM edge branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockLLMAvailable = false;
    mockModelId = 'none';
    mockExtractVerifyMerge = vi.fn().mockResolvedValue(null);
  });

  it('verbose output includes LLM extraction count when --llm is active', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'test-model', extract: vi.fn(), validate: vi.fn() },
    });
    mockLLMAvailable = true;
    mockModelId = 'test-model';
    mockExtractVerifyMerge = vi.fn().mockResolvedValue({
      extractionResults: [
        { intents: [{ kind: 'deny', target: 't0' }, { kind: 'deny', target: 't1' }, { kind: 'deny', target: 't2' }], source: 'SOUL.md', modelId: 'test-model' },
      ],
      verificationResults: [{ exactCount: 2, fuzzyCount: 1, mismatchCount: 0 }],
      mergeResults: [{ intents: [{ kind: 'deny', target: 't0' }, { kind: 'deny', target: 't1' }, { kind: 'deny', target: 't2' }] }],
      diagnostics: [],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: false, verbose: true },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('LLM extracted 3 intent(s) via test-model');
      expect(output).toContain('LLM: 3 intent(s) extracted via test-model');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON output includes llm section when --llm is active', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'test-model', extract: vi.fn(), validate: vi.fn() },
    });
    mockLLMAvailable = true;
    mockModelId = 'test-model';
    mockExtractVerifyMerge = vi.fn().mockResolvedValue({
      extractionResults: [
        { intents: [{ kind: 'deny', target: 't0' }, { kind: 'deny', target: 't1' }], source: 'SOUL.md', modelId: 'test-model' },
      ],
      verificationResults: [{ exactCount: 2, fuzzyCount: 0, mismatchCount: 0 }],
      mergeResults: [{ intents: [{ kind: 'deny', target: 't0' }, { kind: 'deny', target: 't1' }] }],
      diagnostics: [],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: true, verbose: false },
        { llm: true },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.llm).toBeDefined();
      expect(parsed.llm.model).toBe('test-model');
      expect(parsed.llm.extractedIntents).toBe(2);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('no LLM section in text output when --llm is not active', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(createLLMProvider).mockResolvedValue(null);
    mockLLMAvailable = false;
    mockModelId = 'none';

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(
        ctx,
        { force: true, json: false, verbose: false },
        { llm: false },
      );
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).not.toContain('LLM:');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
