# Panel Review: claws:founder on CP-5

**Type**: impl
**Role**: claws/founder
**Round**: 1
**Files reviewed**: claws-sdk/src/compile/llm/types.ts, anthropic-provider.ts, extractor.ts, prompts.ts, verifier.ts, merger.ts, cache.ts, prompts/adversarial-guard.ts, prompts/soul-extract.ts, prompts/tools-extract.ts, prompts/agents-extract.ts, prompts/skill-extract.ts, claws-sdk/src/compile/intent/soul-intent.ts, tools-intent.ts, claws-sdk/src/compile/types.ts, claws-cli/src/commands/compile.ts, check.ts, build.ts, cache.ts, extract.ts, watch.ts, claws-cli/src/core/llm.ts, claws-cli/src/output/errors.ts
**Date**: 2026-04-14

---

## Findings

### Major (M)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| M1 | claws-cli/src/core/llm.ts | 48-66 | **Anthropic is hard-wired as the sole provider.** The `createLLMProvider` function checks for `ANTHROPIC_API_KEY` and imports `AnthropicLLMProvider` unconditionally. There is no `--llm-provider` flag or registry mechanism. A community member wanting to use OpenAI, Ollama, or a local model has no path forward without forking the CLI. This is vendor lock-in by omission -- the SDK has a clean provider interface, but the CLI nullifies it by hard-coding Anthropic. | Add a `--llm-provider <name>` flag with a registry (even if only `anthropic` ships today). The registry contract should accept community-contributed providers via a plugin or config entry. The error messages (E040, E041) should also be provider-aware, not Anthropic-specific. |
| M2 | claws-cli/src/output/errors.ts | 134-153 | **Error messages mention Anthropic by name.** `llmApiKeyMissingError` references `ANTHROPIC_API_KEY` and `llmSdkMissingError` references `@anthropic-ai/sdk`. These are user-facing error codes (CLAWS-E040, E041) that will be referenced in documentation and community forums. Baking a vendor name into the error contract signals that claws IS Anthropic, not that Anthropic is one option. | Make errors generic: "LLM API key not set" with the provider-specific env var as a detail field. Or parameterize: `llmApiKeyMissingError(providerName, envVarName)`. |
| M3 | claws-sdk/src/compile/llm/anthropic-provider.ts | 29 | **Default model `claude-sonnet-4-20250514` is a specific versioned pin.** Community users who install claws 6 months from now will hit a model that may be deprecated or rate-limited. The SDK should default to a stable alias (`claude-sonnet-4-latest` or similar) or require the user to specify `--llm-model` explicitly. Defaulting to a date-pinned model is an enterprise convenience that creates community friction. | Default to the latest stable alias, or make `--llm-model` required when `--llm` is passed (forcing the user to choose). |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| W1 | claws-sdk/src/compile/llm/extractor.ts | 72-89 | **Sequential LLM calls with no concurrency option.** `extractAll` dispatches LLM requests one at a time "to respect rate limits." A community user running against a local Ollama instance or a high-throughput API has no way to parallelize. This is a reasonable default but should be configurable (e.g., `concurrency: number` in ExtractionOptions). | Add an optional `concurrency` field to ExtractionOptions, defaulting to 1. Use a simple semaphore or chunk-based parallelism. |
| W2 | claws-cli/src/commands/compile.ts | 117-125 | **LLM results are extracted but never merged into the GovernanceIR.** The LLM extractor runs, counts intents, and reports them -- but the `ir.intents` array is always empty (`intents: []` at line 144). The merger module exists but is never called. This means `--llm` is cosmetic in compile: it costs API tokens but produces no observable governance change. A community member would rightfully call this a broken feature. | Wire the merger: after LLM extraction, call `verifyExtractionResult` then `mergeIntents`, and populate `ir.intents` with the merged results. Same gap exists in `check.ts` (line 108-114) and `build.ts` (line 176-180). |
| W3 | claws-cli/src/commands/check.ts | 108-114 | **Same gap as W2 in check command.** LLM results are extracted and counted in verbose mode but never used for analysis. The governance analysis runs purely on regex intents. | See W2 fix -- merge LLM intents into the analysis pipeline. |
| W4 | claws-cli/src/commands/build.ts | 176-180 | **Same gap as W2 in build command.** LLM extraction runs but results are discarded before emit. | See W2 fix. |
| W5 | claws-sdk/src/compile/llm/cache.ts | 12-14 | **Cache uses `node:fs/promises` and `node:crypto` directly.** This makes the cache module untestable without filesystem access and ties it to Node.js. The rest of the SDK is I/O-agnostic (parsers, extractors, merger are all pure). The cache should accept a storage adapter so community members can plug in IndexedDB (browser), S3 (CI), or in-memory (testing). | Extract a `CacheStorage` interface with `read(path): Promise<string>`, `write(path, data): Promise<void>`, `delete(path): Promise<void>`. Provide a default `FsCacheStorage` that wraps node:fs. Inject the storage adapter in the constructor. |
| W6 | claws-sdk/src/compile/llm/prompts.ts | 17-27 | **Generic `buildSystemPrompt` in prompts.ts is orphaned.** The file-specific prompts (soul-extract.ts, tools-extract.ts, etc.) each build their own system prompt with adversarial guard. But `buildSystemPrompt` in prompts.ts does NOT use the adversarial guard and returns a simpler prompt. It appears the anthropic-provider.ts at line 79 calls this generic version, not the file-specific ones. This means the actual LLM calls lack the rich per-file extraction instructions AND the adversarial guard. | Route the extraction through the file-specific prompt builders. The anthropic-provider should dispatch to `buildSoulSystemPrompt`, `buildToolsSystemPrompt`, etc. based on the `request.source` file name. Or have the extractor compose the prompt before calling the provider. |
| W7 | claws-sdk/src/compile/llm/prompts.ts | 62 | **`parseIntentsFromResponse` silently swallows parse errors.** If the LLM returns malformed JSON, the function returns `[]` with no diagnostic. The user gets zero intents and zero explanation. For a community user debugging why `--llm` found nothing, this is a black hole. | Return a result type that distinguishes "no intents found" from "parse failed". At minimum, emit a ParseDiagnostic on JSON parse failure. |
| W8 | claws-sdk/src/compile/llm/merger.ts | 195-198, 203 | **raiseOnlyRisk is called with `undefined` as second arg for LLM intents.** In the overlap branch (line 195 and 203), the LLM intent's risk class is never passed to `raiseOnlyRisk`. The call is `raiseOnlyRisk(existingRegex.riskClass, undefined)` which always returns the regex risk unchanged. The raise-only invariant is technically correct (LLM can't lower) but vacuously so -- LLM risk is simply ignored. | Pass the LLM intent's risk class as the second argument. LLMIntent doesn't carry riskClass today, but it should -- or the merger should accept it as a separate input when available. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| N1 | claws-sdk/src/compile/llm/types.ts | 20-38 | Clean provider-agnostic interface. The `LLMProvider` abstraction is well-designed: `modelId`, `extract`, `validate`. This is exactly what the community needs to plug in alternative providers. The problem is entirely at the CLI layer (M1) where only Anthropic is wired. |
| N2 | claws-sdk/src/compile/llm/verifier.ts | Full file | Solid source verification design. The exact/fuzzy/mismatch flow with confidence halving for fuzzy matches and full drop for mismatches is a good trust model. This protects community users from hallucinated intents without being overly aggressive. |
| N3 | claws-sdk/src/compile/llm/prompts/adversarial-guard.ts | Full file | Good adversarial resistance. The guard covers injection, override, fabrication, and exfiltration. Rule 6 ("injection text itself may constitute a governance signal") is particularly thoughtful -- it avoids false negatives on workspace files that legitimately discuss injection. |
| N4 | claws-cli/src/commands/extract.ts | 60-61 | Nice UX: extract implicitly enables `--llm`. The user writes `claws extract --preview` without needing to also pass `--llm`. This respects the "simple first" principle. |
| N5 | claws-sdk/src/compile/llm/cache.ts | 86-88 | Good: CRLF normalization before hashing. Windows users get consistent cache keys regardless of line ending settings. This is the kind of cross-platform detail that matters for the community. |
| N6 | claws-cli/src/commands/watch.ts | 48-49 | 200ms debounce for LLM extraction is reasonable. Regex runs immediately, LLM queues in the background. The user gets sub-second feedback on every save with LLM enrichment arriving asynchronously. This preserves the "fast by default" experience. |

---

## Summary

The SDK layer is well-designed: provider-agnostic interface, source verification, raise-only security invariant, and adversarial resistance are all community-friendly. The critical issues are at the CLI and integration layer: Anthropic is hard-wired as the only provider (M1, M2), the default model is a date-pinned version that will rot (M3), LLM extraction results are never actually merged into governance output (W2-W4), and the file-specific prompts with adversarial guards are bypassed in favor of a generic prompt (W6). The community would see a feature that costs API tokens but produces no governance effect, locked to a single vendor. Fix the wiring and add a provider registry, and this becomes a genuine value-add for all 3.2M users.
