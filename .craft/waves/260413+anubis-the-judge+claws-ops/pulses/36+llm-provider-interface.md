---
pulse: 36
slug: llm-provider-interface
plan: claws-llm-extraction
depends_on: [6]
governing_roles: [craft:architect, claws:founder]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && vitest run tests/compile/llm/"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 36: LLMProvider Interface + Anthropic Implementation

## Objective

Create the provider-agnostic LLM extraction interface following the craftworks AI provider pattern. The main code never imports a specific SDK — the CLI or host injects the provider at startup.

## Deliverables

- [ ] `claws-sdk/src/compile/llm/types.ts` — LLMProvider interface (`extract`, `validate`, `modelId`), LLMIntent, ExtractionResult, MergeResult, ExtractionOptions types
- [ ] `claws-sdk/src/compile/llm/anthropic-provider.ts` — Anthropic implementation using `@anthropic-ai/sdk`. Reads ANTHROPIC_API_KEY from env.
- [ ] `claws-sdk/src/compile/llm/extractor.ts` — ExtractorLLM class that takes LLMProvider, dispatches file-specific prompts, collects results
- [ ] `claws-sdk/src/compile/llm/index.ts` — barrel exports
- [ ] `claws-sdk/tests/compile/llm/provider.unit.test.ts` — LLMProvider interface contract tests with mock provider (8 L0)
- [ ] `claws-sdk/tests/compile/llm/extractor.integration.test.ts` — ExtractorLLM with mock provider against reference workspace (2 L1)

## Key Constraints

- Provider-agnostic: main code imports interface, never @anthropic-ai/sdk
- API key from ANTHROPIC_API_KEY env var only, never stored in .claws/
- ExtractorLLM accepts null provider (graceful no-op when LLM unavailable)
