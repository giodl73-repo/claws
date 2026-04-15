---
pulse: 41
slug: watch-debounce
plan: claws-llm-extraction
depends_on: [40]
governing_roles: [claws:gateway-eng, claws:power-user]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && vitest run"
  typecheck:
    - "cd claws-cli && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 41: Watch Mode LLM Debounce

## Objective

When `claws watch --llm` is active, file changes trigger regex extraction immediately (sub-second feedback) and queue LLM extraction as a background job. When the LLM result returns, it merges into the next compile cycle. This keeps the watch loop fast while providing LLM-enhanced results on a delay.

## Deliverables

- [ ] `claws-cli/src/commands/watch.ts` — EDIT: debounce logic. On file change: run regex pipeline immediately → display results. Queue LLM extraction for changed files. On LLM result: merge into next cycle, display "LLM extraction updated: +N intents". **Cancellation**: rapid edits cancel pending LLM jobs (only latest file version extracted). Latency budget: 200ms for debounce window, 30s max for LLM timeout (gateway-eng finding).
- [ ] Tests: 8 L0 (debounce timing, regex-first display, LLM merge on next cycle, no-llm watch unchanged, rapid-edit cancellation, LLM timeout handling, error fallback to regex, partial file set) + 2 L1 (watch with mock provider verify regex→LLM sequence, rapid edits cancel correctly)
