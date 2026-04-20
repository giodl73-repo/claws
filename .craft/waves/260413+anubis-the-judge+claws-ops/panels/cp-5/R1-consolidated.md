# CP-5 Consolidated Review — Round 1

**Type**: impl
**Panel**: claws:ciso, claws:founder, claws:skill-author, claws:gateway-eng, craft:architect, craft:testing
**Round**: 1
**Date**: 2026-04-14

---

## Summary

**Raw totals**: 22 Major, 41 Warning, 28 Notes across 6 roles.
**After dedup**: 13 unique Major findings, 18 unique Warnings.

The SDK infrastructure (types, verifier, merger, adversarial guard, cache, prompts) is
well-designed and community-friendly. The critical problem is **pipeline wiring**: the
infrastructure is built but never connected. `--llm` currently costs API tokens with zero
governance effect. Five of six reviewers independently flagged this as the top issue.

---

## Deduplicated Major Findings

### Theme A: Pipeline Wiring (consensus: 5/6 roles)

| # | Finding | Flagged by | Fix |
|---|---------|-----------|-----|
| **CM1** | **Merger never called** — LLM intents are extracted, counted, then discarded. compile/check/build never invoke `mergeIntents()`. --llm has zero governance effect. Blocks CP-5 exit criteria. | CISO M2, Founder W2-W4, Architect M3 | Wire verifier→merger→GovernanceIR in compile pipeline |
| **CM2** | **Verifier never called** — `verifyExtractionResult()` exists but is never invoked. Hallucinated LLM intents survive undetected. `extract --preview` also skips verification. | CISO M1, Skill-Author M2 | Call verifier before merger in pipeline; also in extract --preview |
| **CM3** | **File-specific prompts are dead code** — AnthropicProvider calls generic `buildSystemPrompt()` (7 lines, no adversarial defense) instead of per-file prompt builders (soul-extract, tools-extract, etc.) with `withAdversarialGuard()`. | CISO M4, Founder W6, Skill-Author M1, Architect W2 | Dispatch file-specific prompts based on source filename |
| **CM4** | **raiseOnlyRisk invariant broken** — `LLMIntent` has no `riskClass` field, so `raiseOnlyRisk(regexRisk, undefined)` is vacuously true. LLM can never raise risk above regex baseline. | CISO M3, Founder W8, Gateway W5, Architect M4, Testing M3 | Add riskClass to LLMIntent; populate from extraction prompts |

### Theme B: CLI Wiring

| # | Finding | Flagged by | Fix |
|---|---------|-----------|-----|
| **CM5** | **Cache commands not registered** — `claws cache status/export/import/clear` implemented but never wired into cli.ts command router. Commands are unreachable. | Architect M2 | Register cache subcommands in cli.ts |
| **CM6** | **Watch bypasses createLLMProvider** — constructs `AnthropicLLMProvider` directly, skipping API key validation that all other commands use. | Architect M1 | Use createLLMProvider() in watch command |

### Theme C: Provider Robustness

| # | Finding | Flagged by | Fix |
|---|---------|-----------|-----|
| **CM7** | **Anthropic client created per extract call** — new SDK instance on every call causes connection pool thrash in watch mode. | Gateway M1/M3, Architect W1, CISO M5 | Cache client instance in provider constructor |
| **CM8** | **Unhandled rejection in watch debounce** — async function inside setTimeout has no outer try/catch. Non-AbortError rejections crash the watcher. | Gateway M2 | Wrap debounce async in try/catch |
| **CM9** | **Vendor lock-in in error contract** — OC-POLICY-E040/E041 bake "Anthropic" into user-facing errors. Default model pinned to specific dated version. | Founder M1/M2/M3 | Parameterize error messages; use stable model alias or require explicit --llm-model |

### Theme D: Test & Security Gaps

| # | Finding | Flagged by | Fix |
|---|---------|-----------|-----|
| **CM10** | **Benchmark logic in test file** — `calculateMetrics`, `calculateDelta`, `BenchmarkMetrics` defined in test file, imported by other tests. Violates SDK-owns-logic. | Testing M1 | Move to claws-sdk/src/compile/llm/benchmark.ts |
| **CM11** | **AnthropicLLMProvider untested** — zero test coverage on the only concrete provider. Testable logic: key validation, timeout, response parsing, SDK caching. | Testing M2 | Add unit test with vi.mock('@anthropic-ai/sdk') |
| **CM12** | **Cache import trusts arbitrary JSON** — no schema validation on imported entries. Attacker can inject fabricated intents bypassing provider + verifier. | CISO M6 | Validate schema on import (version, entry shape, required fields) |

### Theme E: Prompt Quality

| # | Finding | Flagged by | Fix |
|---|---------|-----------|-----|
| **CM13** | **SKILL.md prompt `---` separator** collides with YAML frontmatter delimiters, creating ambiguous prompt boundaries. | Skill-Author M3 | Use `===` or other non-YAML separator |

---

## Recommended Fix Priority

**Block 1 (pipeline wiring — fixes CM1-CM4):** Single fix agent that wires
verifier→merger into compile pipeline, dispatches file-specific prompts from
extractor, adds riskClass to LLMIntent. This is one cohesive change.

**Block 2 (CLI wiring — fixes CM5-CM6):** Register cache commands, fix watch
provider construction. Small targeted fixes.

**Block 3 (robustness — fixes CM7-CM9):** Cache Anthropic client, wrap debounce
try/catch, parameterize error messages. Independent fixes.

**Block 4 (quality — fixes CM10-CM13):** Move benchmark to SDK, add provider
test, validate cache import, fix prompt separator. Independent fixes.

---

## Verdict

**13 Major findings. Cannot merge until all are resolved.** Re-review after fixes.
