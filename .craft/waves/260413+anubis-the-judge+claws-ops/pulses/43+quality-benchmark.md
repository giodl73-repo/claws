---
pulse: 43
slug: quality-benchmark
plan: claws-llm-extraction
depends_on: [40, 42]
governing_roles: [claws:gateway-eng, craft:testing]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && vitest run"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 5
checkpoint_gate: true
---

# Pulse 43: Quality Benchmark + CP-5 Gate

## Objective

Measure the delta between regex-only and LLM-enhanced extraction on the reference workspace. This is the proof that the LLM stage adds value. CP-5 gate pulse — all prior pulses must pass.

## Deliverables

- [ ] `claws-sdk/tests/benchmark/llm-quality.benchmark.ts` — Benchmark test that runs the reference workspace through both paths and reports the delta:
  - Tools classified (regex vs LLM-enhanced)
  - Deny constraints found
  - Delegation edges extracted
  - OBO boundaries detected
  - Risk accuracy vs expected-violations.json ground truth
- [ ] `claws-sdk/tests/accept/gateway/llm-enhanced.accept.test.ts` — L3 acceptance: LLM-enhanced compile + GatewaySim produces strictly more enforcement than regex-only (never less) AND positive delta on at least 3 of 5 metrics (testing finding: minimum delta, not just superset)
- [ ] `claws-sdk/tests/e2e/llm-compile.e2e.test.ts` — L2: full --llm compile on reference workspace with mock provider, verify merged GovernanceIR has extractionMethod tags
- [ ] Tests: 4 L0 (benchmark metrics calculated correctly) + 2 L1 (mock LLM benchmark, delta is positive) + 1 L2 (full pipeline) + 1 L3 (accept)

## CP-5 Gate Verification

```bash
cd claws-sdk && vitest run
cd claws-cli && vitest run
cd claws-sdk && tsc --noEmit
cd claws-cli && tsc --noEmit
npm run build
```

## Exit Criteria

- [ ] LLM-enhanced extraction finds >= regex-only results (never fewer)
- [ ] Benchmark report shows positive delta on at least 3 of 5 metrics
- [ ] extractionMethod field present on all GovernanceIR entries
- [ ] All acceptance tests pass
- [ ] Build clean across all packages
