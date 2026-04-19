/**
 * L0: LLM provider edge cases — SDK constructor failure and model override.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the SDK to control AnthropicLLMProvider behavior
let shouldThrow: false | 'module' | 'other' = false;
let constructorArgs: unknown[] = [];

// Mock the optional provider SDK so the probe in createLLMProvider succeeds
vi.mock('@anthropic-ai/sdk', () => ({ default: {} }));

vi.mock('@bic/claws-sdk/compile/llm/anthropic-provider', () => ({
  AnthropicLLMProvider: class MockAnthropicLLMProvider {
    readonly modelId: string;
    constructor(...args: unknown[]) {
      constructorArgs = args;
      if (shouldThrow === 'module') {
        throw new Error('Cannot find module @anthropic-ai/sdk');
      }
      if (shouldThrow === 'other') {
        throw new TypeError('SDK initialization failed: invalid config');
      }
      const opts = args[0] as { model?: string } | undefined;
      this.modelId = opts?.model ?? 'claude-sonnet-4-20250514';
    }
    async extract() { return { source: 'test', intents: [], modelId: this.modelId }; }
    async validate() { return []; }
  },
}));

import { createLLMProvider } from '../../src/core/llm.js';

describe('createLLMProvider — SDK edge cases', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    shouldThrow = false;
    constructorArgs = [];
  });

  it('returns error with OC-POLICY-E041 when SDK constructor throws', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';
    shouldThrow = 'module';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createLLMProvider({ llm: true }, false);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(false);
      if (!result!.ok) {
        expect(result.exitCode).toBe(3);
      }

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E041');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });

  it('returns error with JSON when SDK constructor throws and json=true', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';
    shouldThrow = 'module';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createLLMProvider({ llm: true }, true);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(false);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E041');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });

  it('creates provider successfully with default model', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';
    shouldThrow = false;

    try {
      const result = await createLLMProvider({ llm: true }, false);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(true);
      if (result!.ok) {
        expect(result.provider.modelId).toBe('claude-sonnet-4-20250514');
      }
    } finally {
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });

  it('passes llmModel to provider constructor', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';
    shouldThrow = false;

    try {
      const result = await createLLMProvider({ llm: true, llmModel: 'claude-haiku-4-5-20251001' }, false);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(true);
      if (result!.ok) {
        expect(result.provider.modelId).toBe('claude-haiku-4-5-20251001');
      }
      // Verify constructor was called with the model option
      expect(constructorArgs).toHaveLength(1);
      expect(constructorArgs[0]).toEqual({ model: 'claude-haiku-4-5-20251001' });
    } finally {
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });

  it('re-throws when provider constructor throws a non-module error', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';
    shouldThrow = 'other';

    try {
      await expect(
        createLLMProvider({ llm: true }, false),
      ).rejects.toThrow('SDK initialization failed: invalid config');
    } finally {
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });

  it('does not pass model option when llmModel is undefined', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';
    shouldThrow = false;

    try {
      const result = await createLLMProvider({ llm: true }, false);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(true);
      // Constructor called with no arguments (spread of empty array)
      expect(constructorArgs).toHaveLength(0);
    } finally {
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      } else {
        delete process.env['ANTHROPIC_API_KEY'];
      }
    }
  });
});
