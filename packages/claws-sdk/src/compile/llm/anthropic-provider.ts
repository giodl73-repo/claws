/**
 * Anthropic LLM provider for governance extraction.
 *
 * Uses `@anthropic-ai/sdk` for LLM-assisted intent extraction.
 * API key read from ANTHROPIC_API_KEY env var only — never stored in .claws/.
 *
 * This file is the ONLY module that imports @anthropic-ai/sdk.
 * All other compile code depends on the LLMProvider interface.
 *
 * @module claws-sdk/compile/llm/anthropic-provider
 */

import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
} from './types.js';
import type { ParseDiagnostic } from '../types.js';
import {
  buildSystemPrompt as buildGenericSystemPrompt,
  buildUserPrompt as buildGenericUserPrompt,
  parseIntentsFromResponse,
  validateExtractionResult,
} from './prompts.js';
import {
  buildSoulSystemPrompt,
  buildSoulUserPrompt,
  buildToolsSystemPrompt,
  buildToolsUserPrompt,
  buildAgentsSystemPrompt,
  buildAgentsUserPrompt,
  buildSkillSystemPrompt,
  buildSkillUserPrompt,
} from './prompts/index.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.1;

// ── File-specific prompt dispatch ────────────────────────────────────────

/**
 * Dispatch to file-specific system+user prompts based on source filename.
 *
 * SOUL.md, TOOLS.md, AGENTS.md, and SKILL.md each have specialized prompts
 * with adversarial guard. Other file types fall back to the generic prompt.
 */
function dispatchPrompt(request: LLMExtractionRequest): { system: string; prompt: string } {
  const name = request.source.toUpperCase();

  if (name === 'SOUL.MD') {
    return { system: buildSoulSystemPrompt(), prompt: buildSoulUserPrompt(request) };
  }
  if (name === 'TOOLS.MD') {
    return { system: buildToolsSystemPrompt(), prompt: buildToolsUserPrompt(request) };
  }
  if (name === 'AGENTS.MD') {
    return { system: buildAgentsSystemPrompt(), prompt: buildAgentsUserPrompt(request) };
  }
  if (name.endsWith('.SKILL.MD') || name === 'SKILL.MD') {
    return { system: buildSkillSystemPrompt(), prompt: buildSkillUserPrompt(request) };
  }

  // Fallback: generic prompt for USER.md, MEMORY.md, HEARTBEAT.md, WORKFLOW.md, etc.
  return {
    system: buildGenericSystemPrompt(request.source),
    prompt: buildGenericUserPrompt(request),
  };
}

/**
 * Options for the Anthropic LLM provider.
 */
export interface AnthropicLLMProviderOptions {
  /** Model to use. Default: claude-sonnet-4-20250514. */
  readonly model?: string;
  /** Custom base URL for the Anthropic API. */
  readonly baseUrl?: string;
}

/**
 * Anthropic implementation of the LLMProvider interface.
 *
 * Reads ANTHROPIC_API_KEY from environment. Never stores keys in .claws/.
 */
export class AnthropicLLMProvider implements LLMProvider {
  readonly modelId: string;
  private readonly baseUrl: string | undefined;

  /** Cached Anthropic client instance — reused across extract() calls. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  /** API key the cached client was created with — recreate if key changes. */
  private clientApiKey: string | undefined;

  constructor(options?: AnthropicLLMProviderOptions) {
    this.modelId = options?.model ?? DEFAULT_MODEL;
    this.baseUrl = options?.baseUrl;
  }

  /**
   * Get or create the Anthropic client. Reuses the same instance across calls
   * to avoid connection pool thrash. Recreates if the API key changes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getClient(): Promise<any> {
    const { Anthropic } = await importSdk();
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    if (this.client && this.clientApiKey === apiKey) {
      return this.client;
    }

    this.client = new Anthropic({
      apiKey,
      ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
    });
    this.clientApiKey = apiKey;
    return this.client;
  }

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    const client = await this.getClient();

    const timeout = request.options?.timeout ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    if (request.options?.signal) {
      request.options.signal.addEventListener(
        'abort',
        () => controller.abort(),
        { once: true },
      );
    }

    try {
      const { system, prompt } = dispatchPrompt(request);

      const response = await client.messages.create(
        {
          model: this.modelId,
          system,
          messages: [{ role: 'user' as const, content: prompt }],
          max_tokens: request.options?.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: request.options?.temperature ?? DEFAULT_TEMPERATURE,
        },
        { signal: controller.signal },
      );

      const content = response.content
        .filter((block: { type: string }) => block.type === 'text')
        .map((block: { type: string; text: string }) => block.text)
        .join('');

      const intents = parseIntentsFromResponse(content, request.source);

      return {
        source: request.source,
        intents,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        modelId: this.modelId,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async validate(result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return validateExtractionResult(result);
  }
}

// ── SDK import ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedSdk: any;

async function importSdk(): Promise<{ Anthropic: any }> {
  if (cachedSdk) return cachedSdk;
  // Optional dependency — only resolved at runtime when --llm is used.
  // @ts-expect-error Module not installed in monorepo; resolved at runtime.
  cachedSdk = await import('@anthropic-ai/sdk');
  return cachedSdk;
}
