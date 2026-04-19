/**
 * L0: LLM provider creation — flag parsing, null provider graceful, help text.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLLMProvider, LLM_HELP_TEXT, isModuleNotFoundError } from '../../src/core/llm.js';

describe('createLLMProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when --llm is not set (no provider needed)', async () => {
    const result = await createLLMProvider({ llm: false }, false);
    expect(result).toBeNull();
  });

  it('returns null when --llm is not set even with --llm-model', async () => {
    const result = await createLLMProvider({ llm: false, llmModel: 'custom' }, false);
    expect(result).toBeNull();
  });

  it('returns error when --llm is set but ANTHROPIC_API_KEY is missing', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createLLMProvider({ llm: true }, false);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(false);
      if (!result!.ok) {
        expect(result.exitCode).toBe(3);
      }

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E040');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });

  it('returns JSON error when --llm is set but ANTHROPIC_API_KEY is missing and json=true', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createLLMProvider({ llm: true }, true);
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(false);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E040');
    } finally {
      consoleSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    }
  });
});

describe('createLLMProvider — SDK probe failure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns OC-POLICY-E041 when SDK probe fails (text output)', async () => {
    // @anthropic-ai/sdk is not installed, so the dynamic import naturally
    // throws ERR_MODULE_NOT_FOUND, exercising the first catch block.
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';

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

  it('returns OC-POLICY-E041 when SDK probe fails (JSON output)', async () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-fake-key';

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
});

describe('isModuleNotFoundError', () => {
  it('returns true for ERR_MODULE_NOT_FOUND code', () => {
    const err: NodeJS.ErrnoException = new Error('some message');
    err.code = 'ERR_MODULE_NOT_FOUND';
    expect(isModuleNotFoundError(err)).toBe(true);
  });

  it('returns true for "Cannot find module" message without code', () => {
    const err = new Error('Cannot find module @anthropic-ai/sdk');
    expect(isModuleNotFoundError(err)).toBe(true);
  });

  it('returns false for non-Error values', () => {
    expect(isModuleNotFoundError('string error')).toBe(false);
    expect(isModuleNotFoundError(null)).toBe(false);
    expect(isModuleNotFoundError(undefined)).toBe(false);
    expect(isModuleNotFoundError(42)).toBe(false);
  });

  it('returns false for Error with unrelated message and no code', () => {
    expect(isModuleNotFoundError(new Error('timeout'))).toBe(false);
  });

  it('returns false for Error with unrelated code', () => {
    const err: NodeJS.ErrnoException = new Error('timeout');
    err.code = 'ETIMEDOUT';
    expect(isModuleNotFoundError(err)).toBe(false);
  });
});

describe('LLM_HELP_TEXT', () => {
  it('contains required help message content', () => {
    expect(LLM_HELP_TEXT).toContain('--llm');
    expect(LLM_HELP_TEXT).toContain('ANTHROPIC_API_KEY');
    expect(LLM_HELP_TEXT).toContain('keyword heuristics');
  });
});
