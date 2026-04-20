---
pulse: 39
slug: llm-cache
plan: claws-llm-extraction
depends_on: [38]
governing_roles: [claws:power-user, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 12
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

# Pulse 39: LLM Extraction Cache

## Objective

Composite-key cache for LLM extractions. Key = content hash + prompt hash + model ID. Supports export/import for deterministic CI builds without re-calling the API.

## Deliverables

- [ ] `claws-sdk/src/compile/llm/cache.ts` — LLMCache class: `check(fileHash, promptHash, modelId)`, `store(key, result)`, `export()`, `import(data)`, `status()` (size, hit rate, model version, prompt version). Stored at `.claws/cache/llm-intents.json`.
- [ ] `claws-cli/src/commands/cache.ts` — `claws cache status`, `claws cache export > cache.json`, `claws cache import cache.json`, `claws cache clear`. **Note**: cache logic lives in SDK, CLI is thin adapter (founder finding). CLI commands call SDK functions only.
- [ ] Tests: 8 L0 (hit, miss, key components, export/import round-trip, model change invalidates, prompt change invalidates, clear, status) + 2 L1 (cache survives across two compile runs, export/import in fresh workspace)
- [ ] `claws-cli/tests/commands/cache.unit.test.ts` — 4 L0 tests for CLI cache commands (architect finding: CLI cache was untested)

## Key Constraints

- Cache key MUST include model ID — model updates invalidate cache (P1)
- Export format is portable JSON — CI can commit or store as artifact (PE2)
- `.claws/cache/` is gitignored by initSidecar — cache is local by default
- `claws cache clear` removes all LLM cache without affecting other .claws/ state
