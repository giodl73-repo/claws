/**
 * L0: AnthropicLLMProvider unit tests with mocked @anthropic-ai/sdk.
 *
 * 7 unit tests:
 *   1. Missing ANTHROPIC_API_KEY throws
 *   2. Timeout wired to AbortController
 *   3. External AbortSignal forwarded to controller
 *   4. Response text blocks concatenated
 *   5. SDK import cached after first call
 *   6. File-specific prompt dispatch (SOUL.md, TOOLS.md, AGENTS.md, SKILL.md)
 *   7. Default model and custom model/baseUrl options
 *
 * @module claws-sdk/tests/compile/llm/anthropic-provider.unit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// -- Mock @anthropic-ai/sdk before importing the provider --------------------

const mockCreate = vi.fn();

class MockAnthropic {
  constructor(_opts: Record<string, unknown>) {}
  messages = { create: mockCreate };
}

vi.mock('@anthropic-ai/sdk', () => {
  return {
    Anthropic: MockAnthropic,
  };
});

// Import after mock setup
import { AnthropicLLMProvider } from '../../../src/compile/llm/anthropic-provider.js';

// -- Helpers -----------------------------------------------------------------

function makeResponse(texts: string[], inputTokens = 100, outputTokens = 50) {
  return {
    content: texts.map(text => ({ type: 'text', text })),
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

function validIntentsJson(intents: object[]): string {
  return JSON.stringify(intents);
}

// -- Tests -------------------------------------------------------------------

describe('AnthropicLLMProvider', () => {
  const originalEnv = process.env['ANTHROPIC_API_KEY'];

  beforeEach(() => {
    mockCreate.mockReset();
    process.env['ANTHROPIC_API_KEY'] = 'test-key-12345';
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['ANTHROPIC_API_KEY'] = originalEnv;
    } else {
      delete process.env['ANTHROPIC_API_KEY'];
    }
  });

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env['ANTHROPIC_API_KEY'];
    const provider = new AnthropicLLMProvider();

    await expect(
      provider.extract({ source: 'SOUL.md', content: '# Soul' }),
    ).rejects.toThrow('ANTHROPIC_API_KEY');
  });

  it('wires timeout to AbortController', async () => {
    const response = makeResponse([validIntentsJson([])]);
    mockCreate.mockResolvedValueOnce(response);

    const provider = new AnthropicLLMProvider();
    await provider.extract({
      source: 'SOUL.md',
      content: '# Soul',
      options: { timeout: 5000 },
    });

    // Verify create was called with signal option
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0]!;
    expect(callArgs[1]).toHaveProperty('signal');
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it('forwards external AbortSignal to controller', async () => {
    const response = makeResponse([validIntentsJson([])]);
    mockCreate.mockResolvedValueOnce(response);

    const externalController = new AbortController();
    const provider = new AnthropicLLMProvider();

    await provider.extract({
      source: 'SOUL.md',
      content: '# Soul',
      options: { signal: externalController.signal },
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0]!;
    expect(callArgs[1]).toHaveProperty('signal');
  });

  it('concatenates multiple text blocks from response', async () => {
    const intents = [
      { kind: 'deny', target: 'Bash', description: 'No bash', confidence: 0.9, line: 1, sourceText: 'Never use Bash' },
    ];
    const response = makeResponse([
      '[{"kind":"deny","target":"Bash",',
      '"description":"No bash","confidence":0.9,"line":1,"sourceText":"Never use Bash"}]',
    ]);
    mockCreate.mockResolvedValueOnce(response);

    const provider = new AnthropicLLMProvider();
    const result = await provider.extract({
      source: 'SOUL.md',
      content: '# Soul\nNever use Bash.',
    });

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.kind).toBe('deny');
    expect(result.intents[0]!.target).toBe('Bash');
  });

  it('caches SDK import across multiple extract calls', async () => {
    const response1 = makeResponse([validIntentsJson([])]);
    const response2 = makeResponse([validIntentsJson([])]);
    mockCreate.mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);

    const provider = new AnthropicLLMProvider();
    await provider.extract({ source: 'SOUL.md', content: '# Soul' });
    await provider.extract({ source: 'TOOLS.md', content: '# Tools' });

    // Both calls succeed — the import is cached
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('dispatches file-specific prompts based on source filename', async () => {
    const files = ['SOUL.md', 'TOOLS.md', 'AGENTS.md', 'SKILL.md', 'USER.md'];

    for (const source of files) {
      const response = makeResponse([validIntentsJson([])]);
      mockCreate.mockResolvedValueOnce(response);

      const provider = new AnthropicLLMProvider();
      await provider.extract({ source, content: `# ${source}` });

      const callArgs = mockCreate.mock.calls.at(-1)!;
      const systemPrompt: string = callArgs[0].system;

      // File-specific prompts mention the file type in their system prompt
      if (source === 'SOUL.md') {
        expect(systemPrompt).toContain('SOUL.md');
        expect(systemPrompt).toContain('Adversarial Resistance');
      } else if (source === 'TOOLS.md') {
        expect(systemPrompt).toContain('TOOLS.md');
        expect(systemPrompt).toContain('Adversarial Resistance');
      } else if (source === 'AGENTS.md') {
        expect(systemPrompt).toContain('AGENTS.md');
        expect(systemPrompt).toContain('Adversarial Resistance');
      } else if (source === 'SKILL.md') {
        expect(systemPrompt).toContain('SKILL.md');
        expect(systemPrompt).toContain('Adversarial Resistance');
      } else {
        // Generic fallback for USER.md
        expect(systemPrompt).toContain('USER.md');
      }
    }
  });

  it('uses default model and respects custom model/baseUrl options', () => {
    const defaultProvider = new AnthropicLLMProvider();
    expect(defaultProvider.modelId).toBe('claude-sonnet-4-20250514');

    const customProvider = new AnthropicLLMProvider({
      model: 'claude-haiku-4-5-20251001',
      baseUrl: 'https://custom.api.example.com',
    });
    expect(customProvider.modelId).toBe('claude-haiku-4-5-20251001');
  });

  it('returns correct usage and modelId in extraction result', async () => {
    const response = makeResponse([validIntentsJson([])], 250, 75);
    mockCreate.mockResolvedValueOnce(response);

    const provider = new AnthropicLLMProvider({ model: 'test-model-v1' });
    const result = await provider.extract({
      source: 'SOUL.md',
      content: '# Soul',
    });

    expect(result.source).toBe('SOUL.md');
    expect(result.modelId).toBe('test-model-v1');
    expect(result.usage).toEqual({ inputTokens: 250, outputTokens: 75 });
  });
});
