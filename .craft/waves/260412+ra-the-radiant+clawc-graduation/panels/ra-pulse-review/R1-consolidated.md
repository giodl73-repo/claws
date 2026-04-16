# R1 Consolidated — Ra Wave 59-Pulse Review

**Panel**: ra-pulse-review
**Type**: plan (59 pulses across 10 checkpoints)
**Round**: 1
**Date**: 2026-04-15
**Roles**: architect (D), conformance (C), dragon (A), navigator (E)

---

## Totals

| Role | HC-BLOCK | HIGH | MEDIUM | LOW | Total |
|------|----------|------|--------|-----|-------|
| architect | 0 | 5 | 10 | 8 | 23 |
| conformance | 7 | 7 | 6 | 0 | 20 |
| dragon | 2 | 3 | 4 | 2 | 11 |
| navigator | 3 | 7 | 5 | 3 | 18 |
| **Raw** | **12** | **22** | **25** | **13** | **72** |
| **Dedup** | **8** | **12** | **14** | **8** | **42** |

---

## HC-BLOCKs (must fix before implementation)

### HC-1: Missing depends_on on CP-1 gate and emitter pulses

**Flagged by**: architect (F-01, F-02, F-18)

Pulse 6 (CP-1 gate) depends_on `[1, 3]` but should depend on `[1, 2, 3, 4, 5]` — all infra pulses. Pulses 7-8 (emitters) depend on `[1, 3]` but need `[6]` for R5 enforcement.

### HC-2: L0 floor violations — pulses 12, 19, 44 have L0=0

**Flagged by**: conformance (HC-BLOCK-02)

Minimum L0 is 2 per pulse. Three gate/E2E pulses have zero unit tests.

### HC-3: CP-9 and CP-10 gates have zero L3 acceptance tests

**Flagged by**: conformance (HC-BLOCK-03, HC-BLOCK-06, HC-BLOCK-07)

Gate pulses 55 and 59 need at least 1 L3 acceptance test each.

### HC-4: 3 orphaned scenarios — S28, S31, S32 unreferenced

**Flagged by**: conformance (HC-BLOCK-01)

S28 (circular-delegation), S31 (identity-impersonation), S32 (stale-preauthorization-cascade) have zero pulse references.

### HC-5: R5 risk classification diverges across 3 determination points

**Flagged by**: dragon (D-01)

Compile-time (pulse 6), write-time (pulse 30), and chunk assembly (pulse 23) each determine R5 independently. If they disagree, UI shows toggles the server rejects.

### HC-6: Fleet policy fail-closed not enforced at startup

**Flagged by**: dragon (D-02)

Missing fleet policy passes startup health check as "healthy" but rejects every PATCH. Must fail-closed at startup.

### HC-7: Business logic in claws-serve route handlers

**Flagged by**: architect (F-15 + 5 more)

Pulses 33, 35, 36, 38, 40, 42 place orchestration logic in serve routes. Must extract to claws-sdk.

### HC-8: No partner handoff artifact (OpenAPI spec)

**Flagged by**: navigator (F-01)

CP-5 says "partners can build" but no pulse produces an OpenAPI schema or typed client.

---

## HIGH Priority (fix before wave start)

| ID | Role | Finding |
|----|------|---------|
| H-1 | navigator | Error UX fragmented: PatchError codes (P30), HTTP mapping (P31), human messages (P49) — should be co-designed in P30 |
| H-2 | navigator | VS Code LSP (P56) in CP-10 but only depends on CP-6 P30 — move diagnostics earlier |
| H-3 | architect | Workspace parser file sets differ between P1 (compiler readers) and P22 (serve parser) |
| H-4 | dragon | Onboard (P43) scans input transcript but not generated SOUL.md/MEMORY.md output |
| H-5 | dragon | No explicit deny-rule-removal validator in P30 for HTTP API (TUI hides toggle, API doesn't) |
| H-6 | dragon | Trust JWT signing key provenance unspecified in P39 |
| H-7 | conformance | P-279 (trust JWT) not cited by ID in pulse 39 |
| H-8 | conformance | CL-10 has no mechanical spec→pulse traceability |
| H-9 | architect | Pulse 11 (compile host) wires 10 modules but declares only 2 depends_on |
| H-10 | navigator | Demo fixture workspace defined in P55 (last TUI pulse) — should be earlier |
| H-11 | dragon | VS Code code actions (P58) could bypass serve validation |
| H-12 | architect | 4 dependency descriptions reference wrong pulse slugs |

---

## Summary

**59 pulses, 10 checkpoints, 4 plans — structurally sound with 8 HC-BLOCKs.**

The dependency DAG is valid (no cycles) but underdeclared — 6 pulses have incomplete `depends_on`. The SDK-owns-logic rule is violated by 6 serve-route pulses. Test floors are violated by 3 pulses. 3 scenarios are orphaned. The R5 invariant chain is conceptually complete but has a divergence risk at 3 independent determination points.

The positive: plan attribution is 100% correct, checkpoint assignments match wave.yaml perfectly, 12/13 pitfalls are cited, 32/35 scenarios are covered, and total test budget is 545 tests.

**Recommended action**: Fix all 8 HC-BLOCKs as pulse amendments, then the wave is ready for `/craft-start`.
