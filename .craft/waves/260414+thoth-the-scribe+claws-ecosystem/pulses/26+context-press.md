---
pulse: 26
slug: context-press
plan: claws-press-context
depends_on: [21, 22, 23, 24, 25]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [lossless-roundtrip/S05]
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 26: Context PRESS

## Objective
Implement the PRESS compression adapter for governance context subgraphs. This is the integration pulse that wires together all prior optimization components into a unified pipeline:

1. **Pinch Profile Selection** (from Pulse 21) — select the appropriate G0-G3 profile based on agent configuration or fleet policy
2. **Cost Estimation** (from Pulse 23) — estimate token cost of each governance rule using governance-specific heuristics
3. **Dead-Code Elimination** (from Pulse 24) — remove rules for absent tools and disabled policies
4. **Redundant Check Merging** (from Pulse 24) — combine compatible governance checks
5. **PRESS Compression** — apply the full compression pass to produce budget-compliant output
6. **Quality Validation** (from Pulse 22) — score compressed output against the 5-dimension quality matrix and reject below-threshold results

The pipeline is ordered: profile selection drives budget, cost estimation informs ordering, dead-code and merge reduce the rule set, compression fits within budget, and quality validation ensures governance fidelity is maintained.

**Validation Target**: Compressed SKILL.md at G2 profile achieves <= 1,100 tokens with >= 0.92 fidelity across all 5 quality dimensions. Round-trip fidelity check confirms no governance semantics are lost.

**Integration Coverage Hardening** (THOTH-INTEGRATION-COVERAGE): emit area at 73% and adapter area at 41% are well below the 90% target. This pulse adds 2 additional L1 integration tests to close both gaps.

## Deliverables
- [ ] `claws-sdk/src/context/context-press.ts` — PRESS compression adapter: applies pinch profile, cost estimation, dead-code elimination, merge, compress, quality check in sequence
- [ ] `claws-sdk/tests/context/context-press.unit.test.ts` — L0: PRESS compression produces output within profile budget (1), quality check rejects below-threshold output (1)
- [ ] `claws-sdk/tests/context/context-press.integration.test.ts` — L1: full PRESS pipeline at G2 on 2400-token SKILL.md (1), round-trip fidelity check (1), compile → emit for each of 3 platform targets, verify artifact correctness (emit 73% → 90%) (1), adapter layer transforms for 4 remaining platform targets (adapter 41% → 90%) (1)
- [ ] `claws-sdk/tests/context/context-press.e2e.test.ts` — L2: fleet-scale PRESS + DAG pipeline with quality validation (1), full PRESS compress at G2 on 2400-token SKILL.md with quality verification (1)
- [ ] `claws-sdk/tests/context/context-press.accept.test.ts` — L3: SDK acceptance — consumer invokes PRESS pipeline at G2, verifies output <= 1,100 tokens with >= 0.92 fidelity and no governance semantics lost
- [ ] `claws-cli/tests/context/context-press.accept.test.ts` — L3: CLI acceptance — `claws press` on 2400-token SKILL.md at G2 produces budget-compliant output with fidelity report

## Acceptance Criteria
- [ ] PRESS pipeline applies all 6 stages in correct order
- [ ] Compressed output at G2 is <= 1,100 tokens
- [ ] Compressed output at G2 achieves >= 0.92 fidelity on all 5 quality dimensions
- [ ] Quality check rejects output below profile threshold
- [ ] Round-trip fidelity check confirms no governance semantics lost
- [ ] Fleet-scale PRESS + DAG pipeline produces valid output
- [ ] All 2 L0 unit tests pass
- [ ] All 4 L1 integration tests pass
- [ ] All 2 L2 e2e tests pass
- [ ] All 2 L3 accept tests pass (SDK + CLI)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies
- Pulse 21 (pinch-profiles) — G0-G3 profile definitions
- Pulse 22 (quality-matrix) — 5-dimension fidelity scoring
- Pulse 23 (governance-cost-estimator) — token cost estimation and rule ordering
- Pulse 24 (dead-code-merge) — dead-code elimination, redundant check merging, materialization
- Pulse 25 (context-dag) — content-addressed DAG for fleet-scale context sharing

## Test Gates
- [ ] L0 unit (2 tests): PRESS compression within profile budget, quality check rejects below-threshold output
- [ ] L1 integration (4 tests): full PRESS pipeline at G2 on 2400-token SKILL.md, round-trip fidelity check, compile → emit for each of 3 platform targets verifying artifact correctness (emit 73% → 90%), adapter layer transforms for 4 remaining platform targets (adapter 41% → 90%)
- [ ] L2 e2e (2 tests): fleet-scale PRESS + DAG pipeline with quality validation, full PRESS compress at G2 on 2400-token SKILL.md with quality verification
- [ ] L3 accept (2 tests): SDK — PRESS at G2 with fidelity verification; CLI — `claws press` budget-compliant output with fidelity report
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
