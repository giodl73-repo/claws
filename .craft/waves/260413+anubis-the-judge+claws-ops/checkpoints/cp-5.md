---
checkpoint: 5
name: "LLM Extraction + OC Format Alignment"
pulse_range: [36, 43]
depends_on_cp: 4
review_panel: [claws:ciso, claws:founder, claws:skill-author, claws:gateway-eng, craft:architect, craft:testing]
---

# CP-5: LLM Extraction + OC Format Alignment

## Scope

Plans claws-llm-extraction + claws-oc-format-alignment. Optional LLM stage
in the compile pipeline using craftworks AI provider pattern. Source verification,
raise-only security invariant, composite-key cache, CLI flags, watch debounce.
Parser tolerance fixes for real OC workspace format diversity.

## Dispatch Plan

### Batch 1
- Pulse 36: LLMProvider interface + Anthropic implementation

### Batch 2 (depends on batch 1)
- Pulse 37: 4 file-specific extraction prompts (SOUL, TOOLS, AGENTS, SKILL)

### Batch 3 (depends on batch 2)
- Pulse 38: Source verifier + intent merger (raise-only invariant)
- Pulse 42: OC format tolerance — parser fixes (parallel, independent)

### Batch 4 (depends on batch 3)
- Pulse 39: LLM extraction cache (composite key, export/import)

### Batch 5 (depends on batch 4)
- Pulse 40: CLI --llm flags + extract --preview command
- Pulse 41: Watch mode LLM debounce

### Batch 6 (depends on batch 5) — GATE
- Pulse 43: Quality benchmark + CP-5 gate

## Review Panel

| Role | Focus |
|------|-------|
| **claws:ciso** | Raise-only invariant, adversarial resistance, audit trail |
| **claws:founder** | Opt-in default, provider-agnostic, community impact |
| **claws:skill-author** | SKILL.md prompt quality, extract --preview usability |
| **claws:gateway-eng** | Watch debounce, no runtime impact, latency |
| **craft:architect** | Provider pattern, pipeline stage boundary, SDK-owns-logic |
| **craft:testing** | Benchmark metrics, mock provider coverage, acceptance tests |

## Exit Criteria

- [ ] `claws compile --llm` runs with Anthropic provider on reference workspace
- [ ] `claws extract --preview` shows extraction results without merging
- [ ] LLM can only raise risk, never lower (security invariant verified by test)
- [ ] Source verifier drops intents with wrong sourceText/sourceLine
- [ ] Cache invalidates on model or prompt change
- [ ] `claws cache export` / `claws cache import` round-trips
- [ ] Watch mode: regex immediate, LLM background
- [ ] Parsers accept table + section + free-form formats
- [ ] Quality benchmark shows positive delta on 3+ metrics
- [ ] All packages build + typecheck clean
