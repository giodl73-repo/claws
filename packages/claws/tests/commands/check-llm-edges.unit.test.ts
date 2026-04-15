/**
 * L0: check command LLM edge cases — mocked SDK for verbose LLM branch.
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
  buildCapabilityManifest: vi.fn(),
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

vi.mock('../../src/core/audit.js', () => ({
  writeBypassAuditEvent: vi.fn(),
}));

vi.mock('../../src/core/llm.js', () => ({
  createLLMProvider: vi.fn(),
  LLM_HELP_TEXT: 'test help text',
}));

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  buildCapabilityManifest,
  analyze,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import { createLLMProvider } from '../../src/core/llm.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCheck } from '../../src/commands/check.js';

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

function setupMocks(violations: unknown[] = []) {
  vi.mocked(parse).mockResolvedValue({
    shouldHalt: false, entries: [], presentCount: 1, absentCount: 0,
  } as Awaited<ReturnType<typeof parse>>);
  vi.mocked(extractAllIntents).mockReturnValue([] as ReturnType<typeof extractAllIntents>);
  vi.mocked(buildGovernanceAST).mockReturnValue({} as ReturnType<typeof buildGovernanceAST>);
  vi.mocked(extract).mockReturnValue({} as ReturnType<typeof extract>);
  vi.mocked(buildCapabilityManifest).mockReturnValue({} as ReturnType<typeof buildCapabilityManifest>);
  vi.mocked(createDefaultRegistry).mockReturnValue({} as ReturnType<typeof createDefaultRegistry>);
  vi.mocked(analyze).mockReturnValue({ violations } as ReturnType<typeof analyze>);
}

describe('claws check — LLM edge branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockLLMAvailable = false;
    mockModelId = 'none';
    mockExtractVerifyMerge = vi.fn().mockResolvedValue(null);
  });

  it('verbose output includes LLM extraction count when --llm is active', async () => {
    const ctx = makeCtx();
    setupMocks();
    vi.mocked(createLLMProvider).mockResolvedValue({
      ok: true,
      provider: { modelId: 'test-model', extract: vi.fn(), validate: vi.fn() },
    });
    mockLLMAvailable = true;
    mockModelId = 'test-model';
    mockExtractVerifyMerge = vi.fn().mockResolvedValue({
      extractionResults: [
        { intents: [{ kind: 'deny', target: 'db' }], source: 'SOUL.md', modelId: 'test-model' },
      ],
      verificationResults: [{ exactCount: 1, fuzzyCount: 0, mismatchCount: 0 }],
      mergeResults: [{ intents: [{ kind: 'deny', target: 'db' }] }],
      diagnostics: [],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(
        ctx,
        { json: false, verbose: true, color: false },
        { llm: true },
      );
      expect(exitCode).toBeLessThanOrEqual(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('LLM extracted 1 intent(s) via test-model');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
