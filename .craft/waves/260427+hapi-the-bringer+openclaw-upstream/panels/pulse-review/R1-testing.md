# R1 · Testing Review — Hapi-the-bringer Pulse Coverage

**Wave**: 260427+hapi-the-bringer+openclaw-upstream  
**Date**: 2026-04-27  
**Reviewer**: Testing lens

---

## Verdict

**CONDITIONAL PASS** — tier coverage targets exceeded for L0/L1/L2; L3 acceptance fixtures undersized (4 vs 8 target). All HC-BLOCKs have explicit TDD coverage. Verification gates are executable. Pulse 04 (PR-1) contains the backward-compat proof (F-83) as explicit test. Cross-OS matrices present in pulses 04, 05, 10 for canonicalize, URI stability, snapshotId. Fixture path conventions (pulse 12: `scenarios/{series}/`) consistent across 6 series + runners (simulation, forward, contract). One critical gap: L3 acceptance count is 4 (SOC 2 + HIPAA rubrics × 2 fixtures) vs plan target of 8 — needs +4 compliance-rubric mappings or per-PR verification fixtures.

---

## Top 3 Findings

1. **L3 Acceptance Underdeveloped**: Pulse 12 manifests 2 compliance fixtures (SOC 2 + HIPAA) covering findings F-71..F-75. Plan targets 8 L3 total (6 per-PR + 2 rubric). Missing: per-PR acceptance verification (are all 7 PRs individually testable at acceptance tier?). Recommend: add 4 acceptance fixtures (one per wave checkpoint) validating PR merge state + baseline-hash consistency on trunk.

2. **Verification Gate Asymmetry**: Pulses 01–03 (documentation) have content-only gates (grep checks, no execution). Pulses 04–10 (PRs) have full build+test gates + bot-preempt pre-flight. Pulse 12 (fixtures) gates on upstream PR merge status + scope-flip completion. No pulse has explicit "fixture census pass" gate — pulse 12 gate runs manifest but doesn't assert `min:` counts are met. Recommend: add `npx vitest run --reporter=json | jq '.countTests >= 41'` to pulse 12 gate.

3. **Cross-OS Matrix Coverage Explicit**: Pulses 04 (canonicalize), 05 (URI parser round-trip — no matrix needed, pure logic), 10 (snapshotId cross-OS) all cite CI matrices for Linux/macOS/Windows. PR-1 + PR-7 gates explicitly include matrix. Good. But pulse 05's "URI parser" test at L0 doesn't need cross-OS since it's not a canonicalization operation — that's correct.

---

## Strength

**HC-BLOCK + Scenario Traceability Perfect**: Every HC-BLOCK (F-17, F-22, F-26, F-38, F-76, F-83) has a specific, named test in its governing pulse. Pulse 04 calls out F-83 (plain-JSON backward-compat) as "THE invariant" and "proof that conversion is risk-free." All 24 scenarios (SC-01..SC-24) map 1:N to pulse TDD sections + pulse 12 fixtures. No orphaned scenarios. Finding numbers explicitly cited throughout pulses — full traceability chain: plan → scenarios → findings → pulse TDD.

---

## Tier Aggregate Counts

| Tier | Pulse-Sum | Target | Status |
|------|-----------|--------|--------|
| L0 | ~50 | 30 | ✓ +67% |
| L1 | ~39 | 24 | ✓ +63% |
| L2 | ~11 | 8 | ✓ +38% |
| L3 | 4 | 8 | ⚠ −50% |
| **Total** | **104** | **70** | ✓ +49% (counting pulses 04–12 TDD sections + pulse 12 manifest) |

L3 shortfall is compliance-rubric-specific, not risk-wide. Per-PR acceptance gates (W2 post-merge verification) can bridge.

---

## Fixture Path Convention Validation (Pulse 12)

Pulse 12 specifies 6 series under `packages/claws-sdk/tests/accept/scenarios/`:
- `bot-preempt/` — 13 fixtures, runners: `[simulation]` ✓
- `governance/` — 11 fixtures, runners: `[simulation, forward]` ✓
- `adapter/` — 4 fixtures, runners: `[contract, simulation]` ✓
- `oc4/` — 1 fixture, runners: `[forward]` ✓
- `pkg-invariants/` — 10 fixtures, runners: `[forward]` ✓
- `compliance/` — 2 fixtures, runners: `[contract]` ✓

Manifest includes runner declarations. Naming convention `{series}/{number}+{slug}/` is consistent per examples. One question: scenario files within each fixture (e.g., `scenario.yaml` vs `20+program.yaml` marker) — pulse 12 manifest allows per-series variation. This is acceptable if fixture harness is flexible; confirm runner implementations match marker declarations during acceptance-test run.

---

## Specific Gaps & Recommendations

- **Pulse 04 TDD**: Lists 4 L1 tests (round-trip with comments, plain JSON, doctor idempotency, update E2E). Verification gate includes JSONC round-trip proof node snippet — good. Gap: does the fixture exercise the internal "comments survived" invariant, or just assert the bytes match? Recommend: Pulse 04's L1 test parses the output and validates comment preservation structurally, not just byte-match.

- **Pulse 07 Audit-Stream Wire-Shape (F-38)**: Declared as "HARD DEPENDENCY: pulse 01 adapter-audits.md must publish verdict FIRST." Pulse 07 gate checks for adapter-audits.md presence + audit-stream keyword. But does it verify the VERDICT is "OK to land"? Recommend: pulse 07 gate asserts `grep -q "verdict.*OK to land" docs/upstream/guides/adapter-audits.md`.

- **Pulse 10 Compliance Rubrics (F-71..F-75)**: Declared as "TBD location upstream" in pulse 10 scope. Pulse 12 has 2 fixtures (`compliance/01+soc2-cc61/`, `compliance/02+hipaa-312/`) but doesn't specify *how* the rubric files are sourced (upstream post-merge? copied? generated?). Recommend: pulse 12 gate asserts rubric files exist at expected location upstream OR locally post-merge.

---

End review. All pulses ready for execution pending L3 fixture expansion.
