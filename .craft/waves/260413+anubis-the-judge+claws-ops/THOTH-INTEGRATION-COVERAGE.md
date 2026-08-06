# Thoth Plan Input: Integration Test Coverage Hardening

Source: claws-sdk integration-only coverage run (2026-04-14)

Baseline: E2E alone covers 64% stmts / 48% branches.
Integration adds to 76% stmts / 59% branches.
Unit fills to 97%+ across all metrics.

**Goal**: Push integration-only coverage to 90%+ stmts across all areas,
reducing reliance on mocked unit tests for confidence.

---

## Priority 1 — Quick Wins (already >70%, need 2-5 tests each)

These areas have strong foundations — a few integration tests close the gap.

| Area            | Current | Target | What to test                                                                   |
| --------------- | ------- | ------ | ------------------------------------------------------------------------------ |
| **scaffold**    | 79%     | 90%+   | Full scaffold → compile → check round-trip for each tier (R1/R3/R5)            |
| **fleet**       | 74%     | 90%+   | scan → drift → broadcast → report across 3+ workspaces                         |
| **snapshot**    | 74%     | 90%+   | save → diff → restore → promote lifecycle                                      |
| **compile**     | 73%     | 90%+   | Multi-file workspace compile with conflict detection                           |
| **compile/llm** | 74%     | 90%+   | TracingMockProvider: extract → verify → merge full pipeline (partially exists) |
| **emit**        | 73%     | 90%+   | Compile → emit for each platform target, verify artifact correctness           |

## Priority 2 — Moderate Gaps (60-70%, need 5-10 tests each)

| Area              | Current | Target | What to test                                                                    |
| ----------------- | ------- | ------ | ------------------------------------------------------------------------------- |
| **doctor/checks** | 68%     | 90%+   | Run all 12 health checks against fixture workspaces (healthy, degraded, broken) |
| **keys**          | 68%     | 90%+   | Full key lifecycle: generate → list → rotate → revoke → ceremony threshold      |
| **amend**         | 67%     | 90%+   | Amend pipeline: re-parse → re-evaluate → merge → re-emit on modified workspace  |
| **detect**        | 62%     | 90%+   | Platform detection across openclaw, cursor, claude-code fixture workspaces      |
| **annotate**      | 61%     | 90%+   | Annotate → accuracy report → apply suggestions on multi-skill workspace         |

## Priority 3 — Infrastructure Gaps (< 50%, need test harness work)

| Area        | Current | Target | What to test                                             | Notes                                                 |
| ----------- | ------- | ------ | -------------------------------------------------------- | ----------------------------------------------------- |
| **config**  | 38%     | 90%+   | Config create → validate → merge → override lifecycle    | Needs fixture config files for each override scenario |
| **adapter** | 41%     | 90%+   | Adapter layer transforms across all 7 platform targets   | Needs platform-specific fixture workspaces            |
| **publish** | 49%     | 90%+   | Full publish lifecycle: compile → sign → upload → verify | Needs mock registry server                            |

---

## Test Design Principles

1. **Integration tests exercise real module boundaries** — no mocks for internal modules.
   Mock only external I/O (filesystem for fleet, network for publish registry).

2. **Each test should trace a user workflow** — "I scaffold a skill, compile it, check it,
   and publish it" is one integration test, not four unit tests.

3. **Use fixture workspaces** — real .claws/ sidecars, real SOUL.md/TOOLS.md files,
   real claws.json configs. The reference workspace at
   `tests/accept/workspaces/oc-reference-workspace/` is the starting point.

4. **TracingMockProvider for LLM paths** — already exists at
   `tests/helpers/tracing-mock-provider.ts`. Deterministic, traceable, includes
   deliberate hallucination for verifier testing.

5. **Coverage target: 90% stmts from integration tests alone** — this means the
   codebase is exercisable through real workflows, not just isolated function calls.

---

## Estimated Effort

| Priority  | Areas    | Tests needed        | Effort          |
| --------- | -------- | ------------------- | --------------- |
| P1        | 6 areas  | ~20 tests           | 1 checkpoint    |
| P2        | 5 areas  | ~35 tests           | 1-2 checkpoints |
| P3        | 3 areas  | ~25 tests + harness | 2 checkpoints   |
| **Total** | 14 areas | ~80 tests           | 4-5 checkpoints |

---

## Suggested Thoth Plan: `claws-integration-hardening`

```yaml
slug: claws-integration-hardening
preset: claws
area: claws
phase: thoth
atoms: [atom:test-coverage, atom:integration-testing]
specs: [CL-07]
```

This could be its own Thoth plan or folded into `claws-protect` (which already
covers hardening). The 80 integration tests would provide the regression
safety net for all the security findings in THOTH-FINDINGS.md.
