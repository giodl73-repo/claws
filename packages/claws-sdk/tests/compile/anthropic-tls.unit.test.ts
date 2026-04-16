/**
 * L0: S-W2 — LLM endpoint HTTP warning logged when endpoint uses HTTP instead of HTTPS.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the SDK import so AnthropicLLMProvider doesn't actually load @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() {}
    messages = { create: vi.fn() };
  },
  Anthropic: class MockAnthropic {
    constructor() {}
    messages = { create: vi.fn() };
  },
}));

import { AnthropicLLMProvider } from '../../src/compile/llm/anthropic-provider.js';

describe('S-W2: LLM endpoint HTTP warning', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs warning when baseUrl uses HTTP instead of HTTPS', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    new AnthropicLLMProvider({ baseUrl: 'http://insecure-llm.example.com' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claws:security] LLM endpoint uses HTTP'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('HTTPS is required for production'),
    );
  });
});
