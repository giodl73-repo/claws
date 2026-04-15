---
pulse: 40
slug: cli-llm-flags
plan: claws-llm-extraction
depends_on: [39]
governing_roles: [craft:navigator, claws:new-hire]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && vitest run"
  typecheck:
    - "cd claws-cli && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 40: CLI --llm Flags + Extract Preview

## Objective

Wire the LLM extraction stage into the CLI. `--llm` is opt-in (off by default). `claws extract --preview` shows what the LLM finds without merging. Compile summary labels each intent's source.

## Deliverables

- [ ] `claws-cli/src/commands/compile.ts` — Add `--llm` and `--llm-model` flags. When `--llm`, inject LLMProvider, run llm-extract stage, merge, then analyze. Compile summary shows intent sources: "send-email: R5 (LLM from SOUL.md:3, confidence 0.92)"
- [ ] `claws-cli/src/commands/check.ts` — Same `--llm` / `--llm-model` flags
- [ ] `claws-cli/src/commands/build.ts` — Same `--llm` / `--llm-model` flags
- [ ] `claws-cli/src/commands/extract.ts` — NEW: `claws extract --preview` shows LLM extraction results per file without merging into GovernanceIR. Output: file, extracted intents, confidence scores. `--json` for programmatic.
- [ ] Help text: "Use --llm to extract governance intent from natural language (requires ANTHROPIC_API_KEY). Without --llm, only explicit annotations and keyword heuristics are used."
- [ ] Tests: 6 L0 (flag parsing, provider injection, null provider graceful, preview output format, json preview, help text) + 2 L1 (compile --llm with mock provider, extract --preview) + 1 L2 (full --llm compile on reference workspace)

## Key Constraints

- --llm is OFF by default everywhere (not just CI)
- When ANTHROPIC_API_KEY is missing and --llm is passed, error with WHAT+HOW+WHERE
- When @anthropic-ai/sdk is not installed and --llm is passed, error with install instructions (founder finding)
- extract --preview is read-only — no disk writes, no GovernanceIR modification
- Watch mode: regex immediate, LLM queued as background (debounce)
