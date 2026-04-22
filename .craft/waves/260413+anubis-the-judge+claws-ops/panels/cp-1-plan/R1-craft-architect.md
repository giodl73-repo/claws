---
role: craft:architect
round: 1
checkpoint: cp-1
scope: plan-review
date: 2026-04-12
verdict: conditional-pass
findings: 12
major: 3
warning: 5
note: 4
---

# R1 — craft:architect — CP-1 Plan Review

## Summary

CP-1 lays a solid foundation: reference workspace, gateway simulator, base CLI modules, and three E2E loops proving compile/check/init pipelines end-to-end. The batch ordering is sound and the SDK-owns-logic rule is mostly respected. Three structural issues need resolution before implementation begins: (1) GatewaySim is placed in `claws-sdk/src/testing/` when `claws-test` already owns the test harness surface and has a `MockGateway`; (2) fixtures are placed at a bare `fixtures/` path with no package ownership; (3) several pulses route config/platform/bypass logic into `claws-cli` when it belongs in `claws-sdk`.

---

## Findings

### M-01: GatewaySim duplicates claws-test MockGateway — package boundary collision

**Pulse:** 02 (gateway-simulator)
**Severity:** Major

Pulse 02 creates `claws-sdk/src/testing/gateway-sim.ts` with load-plugin, fire-tool-call, audit-chain, and reset capabilities. But `claws-test` already exists as a dedicated test harness package with `mock/mock-gateway.ts` (re-exported from `claws-skill-kit`), `scenario/runner.ts`, and `governance/validator.ts`. Adding a parallel testing surface inside `claws-sdk` creates two competing test infrastructure homes.

A new contributor looking at `claws-sdk/src/testing/` and `claws-test/src/` will not know which one to extend. The MockGateway in skill-kit already handles registration, per-tool decisions (allow/deny/require-approval), before_tool_call events, and approval provider — overlapping significantly with GatewaySim's planned scope.

**Recommendation:** GatewaySim should live in `claws-test/src/gateway-sim/` (or enhance `claws-test/src/mock/mock-gateway.ts`). The ToolCallBuilder should also land in `claws-test`. If claws-sdk needs compile-time testing helpers, those should be thin re-exports from claws-test, not a parallel implementation. Alternatively, if the argument is that GatewaySim is a fundamentally different abstraction (compiled-plugin loader vs. skill-handler mock), the pulse plan must explicitly document the distinction and explain why MockGateway cannot be extended.

---

### M-02: Reference workspace fixtures have no package home

**Pulse:** 01 (reference-workspace)
**Severity:** Major

Pulse 01 places the reference workspace at `fixtures/oc-reference-workspace/` — a bare repo-root path. The `Glob` search confirms no `fixtures/` directory exists anywhere in the repo. This path has no owning package, no `tsconfig.json` coverage, no build pipeline, and no test runner scope.

The tests for these fixtures are in `claws-sdk/tests/fixtures/reference-workspace.unit.test.ts`, meaning claws-sdk tests reach outside their own package boundary to consume fixtures from a shared root directory. This creates an invisible coupling: any package can read (or break) the fixtures, and there is no dependency declaration.

**Recommendation:** Place fixtures inside `claws-sdk/tests/fixtures/oc-reference-workspace/` (co-located with the tests that consume them) or inside `claws-test/fixtures/` (if multiple packages need them). If shared cross-package, `claws-test` is the natural home since it is the designated test infrastructure package. The fixture path should be resolvable via a package import, not a relative `../../fixtures/` traversal.

---

### M-03: Config, platform-detect, and bypass logic placed in claws-cli violates SDK-owns-logic

**Pulse:** 06 (base-cli-config)
**Severity:** Major

Pulse 06 creates `claws-cli/src/config/loader.ts`, `claws-cli/src/config/platform.ts`, `claws-cli/src/config/bypass.ts`, and `claws-cli/src/config/types.ts`. These are business logic: Zod schema validation, platform detection from marker files, bypass policy enforcement, and audit event recording. The SDK-owns-logic rule (CLAUDE.md) is explicit: "All business logic, domain decisions, orchestration, and state transitions live in the SDK packages."

The existing codebase already follows this pattern correctly: `claws-cli/src/core/platform-detect.ts` is a thin wrapper that calls `detect()` and `resolve()` from `@bic/claws-sdk/detect`. `claws-sdk` already has `src/detect/` with full marker-based detection. Pulse 06 would undo this by duplicating platform detection logic in the CLI.

Similarly, config loading with Zod validation is a domain decision (what defaults apply, what schema is valid). Bypass detection with fleet policy checks and audit recording is governance logic. All three belong in `claws-sdk`.

**Recommendation:** Move all Pulse 06 logic to `claws-sdk/src/config/` (loader, bypass, types with Zod schema). Platform detection is already in `claws-sdk/src/detect/`. The CLI gets thin wrappers that call SDK functions — exactly as `claws-cli/src/core/platform-detect.ts` already demonstrates.

---

### W-01: Batch 2 dependency on Pulse 02 is unnecessary for Pulses 03 and 04

**Pulses:** 03 (formatters), 04 (error-contract)
**Severity:** Warning

Both Pulse 03 and Pulse 04 declare `depends_on: [1, 2]`. The stated reason for depending on Pulse 02 (gateway-simulator) is "audit entry types used in formatter input contracts" (Pulse 03) and "audit entry types inform error context fields" (Pulse 04). But audit entry types are already defined in `claws-sdk/src/ir/audit-event.ts` — they exist independent of the GatewaySim implementation.

Formatters transform violation objects; they do not need a running gateway simulator. Error codes and diagnostic contracts do not depend on test infrastructure. This false dependency prevents Batch 2 from starting as soon as Batch 1's Pulse 01 completes, reducing parallelism.

**Recommendation:** Change Pulses 03 and 04 to `depends_on: [1]`. If they need audit event types, import them from `claws-sdk/src/ir/audit-event.ts` directly. This allows Batch 2 to start as soon as the reference workspace (Pulse 01) lands, while Pulse 02 (gateway-sim) can run in parallel.

---

### W-02: E2E tests in claws-sdk but test_scope runs claws-sdk — init command lives in claws-cli

**Pulses:** 07, 08, 09 (E2E loops)
**Severity:** Warning

All three E2E pulses place their tests in `claws-sdk/tests/e2e/` and specify `test_scope.run: "cd claws-sdk && npx vitest run"`. But the E2E loops exercise the full pipeline including CLI commands (`claws build`, `claws check`, `claws init`). Pulse 09 specifically tests `claws init` which is a CLI command in `claws-cli/src/commands/init.ts`.

If these tests import and invoke CLI command functions directly, claws-sdk would need a dependency on claws-cli — an inverted dependency arrow (SDK depending on CLI). If they shell out to the `claws` binary, they are E2E tests that belong in a separate test scope, not the SDK unit test runner.

**Recommendation:** Clarify the import/invocation boundary. If E2E tests invoke SDK compile/check/emit functions directly (not CLI commands), they belong in claws-sdk and the pulse descriptions should say "run the SDK compile pipeline" not "run claws build." If they exercise the CLI binary, they belong in `claws-cli/tests/e2e/` or a dedicated E2E package. The init-to-enforcement loop (Pulse 09) almost certainly needs the CLI binary for `claws init`.

---

### W-03: Pulse 05 dependency direction is inverted — formatters should not consume table renderer

**Pulse:** 05 (base-cli-progress)
**Severity:** Warning

Pulse 05 states in its Dependencies section: "Pulse 03 (base-cli-formatters) — formatters consume table renderer for structured output." This implies formatters (Pulse 03) depend on the table renderer (Pulse 05), but Pulse 03 is in Batch 2 and Pulse 05 is in Batch 3 (depends on Batch 2). If formatters truly consume the table renderer, the dependency is circular: Pulse 03 needs Pulse 05 (table), but Pulse 05 needs Pulse 03 (formatters) and Pulse 04 (color).

**Recommendation:** Clarify whether the table renderer is consumed by formatters or independently. If the terminal formatter (Pulse 03's `format/default.ts`) needs the table renderer, either: (a) move the table renderer into Pulse 03, or (b) have the terminal formatter use simple string formatting in Pulse 03, then enhance it in Pulse 05. The current dependency description is contradictory.

---

### W-04: No subpath export for claws-sdk testing module

**Pulse:** 02 (gateway-simulator)
**Severity:** Warning

Pulse 02 creates `claws-sdk/src/testing/index.ts` as a barrel export, but `claws-sdk/package.json` has no `./testing` subpath export. Without it, downstream packages (including claws-cli E2E tests and claws-test) cannot import GatewaySim via `@bic/claws-sdk/testing`. They would need deep relative imports, breaking the subpath convention used throughout the monorepo.

**Recommendation:** Add a `./testing` subpath export to `claws-sdk/package.json` (or, per M-01, place the code in `claws-test` which already has proper exports).

---

### W-05: Pulse 09 introduces L3 acceptance test with no L3 infrastructure defined

**Pulse:** 09 (e2e-init-loop)
**Severity:** Warning

Pulse 09 specifies `L3_accept: 1` and creates `claws-sdk/tests/accept/e2e/init-to-enforcement.accept.test.ts`. The vitest config has a `--project accept` flag in package.json scripts, but no prior pulse establishes what "acceptance test" means structurally: is it a separate vitest project? A different assertion style? A formal contract artifact? The test tier convention (CLAUDE.md) defines `.unit.test.ts`, `.integration.test.ts`, and `.e2e.test.ts` but does not define `.accept.test.ts`.

**Recommendation:** Either (a) define the L3/accept test infrastructure as a deliverable in an earlier pulse (or as a scope note in CP-1), or (b) treat the acceptance test as an L2 E2E with stricter assertions (no new test tier). If L3 is a real new tier, it needs a vitest project definition and a place in the test tier convention docs.

---

### N-01: Color system overlap between Pulse 04 and existing claws-cli/src/output/color.ts

**Pulse:** 04 (base-cli-error-contract)
**Severity:** Note

Pulse 04 creates `claws-cli/src/color/risk.ts`, `claws-cli/src/color/severity.ts`, and `claws-cli/src/color/index.ts` with NO_COLOR support. But `claws-cli/src/output/color.ts` already exists with a `createPalette()` function, `severityColor()`, `severityLabel()`, and full NO_COLOR/--no-color support. The existing implementation maps governance levels 1-5 to colors and provides a Palette interface.

Pulse 04 would create a second color system in a different directory (`src/color/` vs `src/output/`). Implementation should extend the existing `src/output/color.ts` rather than creating a parallel module.

---

### N-02: Error code registry OC-POLICY-E001..E099 is premature allocation

**Pulse:** 04 (base-cli-error-contract)
**Severity:** Note

The acceptance criterion "Error code registry covers OC-POLICY-E001 through OC-POLICY-E099 range with no gaps in allocated codes" implies pre-allocating 99 error codes in CP-1. At this stage, only a handful of error categories exist (parse, compile, config validation). Pre-allocating codes that have no implementation leads to placeholder entries that will drift from actual errors as the system evolves.

**Recommendation:** Allocate codes on demand (define the registry mechanism and the first 10-15 codes actually needed by CP-1). Reserve ranges for future categories but do not require "no gaps."

---

### N-03: Pulse 05 has only 4 L0 tests for 4 UI components — thin coverage

**Pulse:** 05 (base-cli-progress)
**Severity:** Note

Progress bar, spinner, banner, and table renderer each get exactly 1 unit test. These are stateful UI components with multiple states (progress: start/tick/done at various percentages; spinner: running/succeed/fail; table: varying column widths and alignments). One test per component is thin for L0 coverage.

**Recommendation:** Increase to 2-3 tests per component to cover state transitions and edge cases (e.g., progress at 0%, 50%, 100%; table with zero rows; spinner with long messages). This would bring Pulse 05 to 8-12 L0 tests, consistent with Pulses 03/04/06.

---

### N-04: Batch structure could parallelize Pulses 05 and 06

**Pulses:** 05 (progress), 06 (config)
**Severity:** Note

Pulses 05 and 06 are both in Batch 3, both depending on Pulses 03 and 04. They have no dependency on each other — progress UI and config loading are independent concerns. They are already structured for parallelism (same batch), but this is worth confirming: they should run as parallel agents within Batch 3, not sequentially.

**Recommendation:** Confirm in the dispatch plan that Batch 3 pulses run in parallel. The current "Batch 3 (depends on batch 2)" phrasing is correct but could be more explicit: "Batch 3 (parallel, each depends on batch 2)."

---

## Verdict

**Conditional pass.** The three Major findings (M-01 through M-03) must be resolved before CP-1 implementation begins:

1. **M-01**: Decide GatewaySim's package home (claws-test vs. claws-sdk) and document the relationship to MockGateway.
2. **M-02**: Assign the reference workspace fixture to a package (`claws-sdk/tests/fixtures/` or `claws-test/fixtures/`).
3. **M-03**: Move config/bypass/platform logic from claws-cli to claws-sdk; CLI gets thin wrappers only.

Warnings W-01 through W-05 should be addressed during implementation but do not block start. Notes are advisory.
