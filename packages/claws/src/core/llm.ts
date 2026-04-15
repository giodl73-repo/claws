/**
 * LLM provider creation — validates environment and constructs the provider.
 *
 * Thin CLI adapter: validates env vars / SDK availability, then delegates
 * to the SDK's AnthropicLLMProvider. No business logic here.
 *
 * @module claws-cli/core/llm
 */

import type { LLMProvider } from '@bic/claws-sdk/compile';
import {
  llmApiKeyMissingError,
  llmSdkMissingError,
  formatError,
  formatErrorJson,
} from '../output/errors.js';

/**
 * Check whether an error is a module-not-found error (ERR_MODULE_NOT_FOUND code
 * or "Cannot find module" message). Used to distinguish missing optional
 * dependencies from unexpected failures.
 */
export function isModuleNotFoundError(e: unknown): boolean {
  return (
    e instanceof Error &&
    (('code' in e && (e as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') ||
      e.message.includes('Cannot find module') ||
      e.message.includes('Cannot find package'))
  );
}

/**
 * LLM flags parsed from CLI options.
 */
export interface LLMFlags {
  /** Whether --llm was passed. */
  readonly llm: boolean;
  /** Optional model override from --llm-model. */
  readonly llmModel?: string;
}

/**
 * Result of attempting to create an LLM provider.
 */
export type LLMProviderResult =
  | { ok: true; provider: LLMProvider }
  | { ok: false; exitCode: number };

/**
 * Create an LLM provider from CLI flags.
 *
 * When --llm is not set, returns null (no provider needed).
 * When --llm is set, validates ANTHROPIC_API_KEY and SDK availability.
 * Logs errors via console.error and returns exitCode 3 on failure.
 */
export async function createLLMProvider(
  flags: LLMFlags,
  json: boolean,
): Promise<LLMProviderResult | null> {
  if (!flags.llm) return null;

  // Check API key first
  if (!process.env['ANTHROPIC_API_KEY']) {
    const err = llmApiKeyMissingError();
    console.error(json ? formatErrorJson(err) : formatError(err));
    return { ok: false, exitCode: 3 };
  }

  // Check provider SDK availability (@anthropic-ai/sdk is an optional dep).
  // Use a variable to prevent tsc from resolving the optional module at compile time.
  const providerSdkId = '@anthropic-ai/sdk';
  try {
    await import(/* webpackIgnore: true */ providerSdkId);
  } catch (e: unknown) {
    if (!isModuleNotFoundError(e)) throw e;
    const err = llmSdkMissingError();
    console.error(json ? formatErrorJson(err) : formatError(err));
    return { ok: false, exitCode: 3 };
  }

  // Provider SDK probe passed — construct the LLM provider
  try {
    const { AnthropicLLMProvider } = await import('@bic/claws-sdk/compile');
    const provider = new AnthropicLLMProvider(
      ...(flags.llmModel !== undefined ? [{ model: flags.llmModel }] : []),
    );
    return { ok: true, provider };
  } catch (e: unknown) {
    // Map module-not-found to SDK-missing diagnostic; re-throw all others
    if (!isModuleNotFoundError(e)) throw e;
    const err = llmSdkMissingError();
    console.error(json ? formatErrorJson(err) : formatError(err));
    return { ok: false, exitCode: 3 };
  }
}

/**
 * Help text for the --llm flag, used across all commands.
 */
export const LLM_HELP_TEXT =
  'Use --llm to extract governance intent from natural language (requires ANTHROPIC_API_KEY). ' +
  'Without --llm, only explicit annotations and keyword heuristics are used.';
