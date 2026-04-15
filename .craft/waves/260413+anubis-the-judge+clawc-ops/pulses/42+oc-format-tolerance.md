---
pulse: 42
slug: oc-format-tolerance
plan: claws-oc-format-alignment
depends_on: [6]
governing_roles: [claws:founder, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && vitest run"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 42: OC Format Tolerance — Parser Fixes

## Objective

Fix parsers to handle real OC workspace format diversity per CL-09. Each parser should accept structured annotations AND free-form prose AND the PEG grammar format. Update PEG grammar docstrings to clarify they describe emitter output, not required input.

## Deliverables

- [ ] `claws-sdk/src/compile/intent/tools-intent.ts` — Handle table format (`| Tool | Guidance |`) in addition to section format (`## tool-name`)
- [ ] `claws-sdk/src/compile/intent/soul-intent.ts` — Improve keyword extraction for natural language deny constraints ("don't let", "always check with me before")
- [ ] `design/astro/grammars/openclaw-agents.peg` — Add header comment: "This grammar describes claws init --template emitter output. Parsers accept broader input."
- [ ] `design/astro/grammars/openclaw-tools.peg` — Same header comment
- [ ] `design/astro/grammars/openclaw-soul.peg` — Same header comment
- [ ] Tests: 8 L0 (tools table + section format, soul natural language + keyword, agents nested + comma) + 3 L1 (each parser against community workspace examples from design/claws/examples/)
