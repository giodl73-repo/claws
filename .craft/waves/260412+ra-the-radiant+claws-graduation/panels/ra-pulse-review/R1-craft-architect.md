---
role: craft:architect
round: 1
wave: 260412+ra-the-radiant+claws-graduation
scope: all 59 pulses (01-59)
tension: "Structural clarity > rapid delivery"
cluster: D
date: 2026-04-15
---

# R1 -- craft/architect Review: Ra Wave (59 Pulses)

## Summary

Reviewed all 59 pulse frontmatter, objectives, deliverables, and dependency declarations across 10 checkpoints and 4 plans (claws-sdk-graduation, craftworks-package-extraction, claws-cap-integration, claws-tui). 23 findings total: 5 high severity, 10 medium, 8 low.

---

## 1. Dependency Chain Correctness

### F-01 [HIGH] Pulse 7 (emit-oc-target) missing dependency on Pulse 6 (r5-fail-closed)

Pulse 7 deliverables state: "Calls compileGuard before emit" and acceptance criteria confirm "OC emitter calls compileGuard (pulse 6) before generating any files." Yet `depends_on: [1, 3]` -- Pulse 6 is absent from the dependency list. The emitter imports and calls `compileGuard` from the enforce module built in Pulse 6. This is a hard build-time dependency.

**Fix**: Add `6` to Pulse 7 `depends_on`.

### F-02 [HIGH] Pulse 8 (emit-claude-code) transitive dependency gap on Pulse 6

Pulse 8 depends only on `[7]`. It also "calls compileGuard before generating any files." While Pulse 7 transitively depends on Pulse 6 (if F-01 is fixed), the current chain is broken. Pulse 8 should explicitly declare `[6, 7]` or at minimum ensure Pulse 7 carries the dependency.

**Fix**: Add `6` to Pulse 7 `depends_on` (F-01 fix resolves this transitively) or add `6` explicitly to Pulse 8.

### F-03 [MEDIUM] Pulse 9 (ts-codegen) depends only on `[7]` but uses GovernanceIR from Pulse 3

Pulse 9 generates "Configuration interfaces derive from GovernanceIR analysis output" and uses "OCWorkspaceIR" from Pulse 3. The `depends_on: [7]` is insufficient because Pulse 7 depends on Pulses 1 and 3 (and should also depend on 6 per F-01), providing transitive coverage for Pulse 3. This is borderline -- if transitive deps are considered sufficient, it works. But the explicit use of GovernanceIR types suggests Pulse 3 should be a direct dependency for clarity.

**Fix**: Consider adding `3` to Pulse 9 `depends_on`.

### F-04 [MEDIUM] Pulse 11 (cache-compile) depends on `[1, 4]` but wires ALL prior modules

The compilation host in Pulse 11 "wires together all prior modules: readers (P1), sidecar (P2), IR (P3), crypto (P4), audit (P5), enforce (P6), emit (P7/P8), validate (P10)." The `depends_on: [1, 4]` declares only 2 of the 10 modules it orchestrates. The compile host cannot function without Pulses 2, 3, 5, 6, 7, 8, and 10.

**Fix**: `depends_on` should be `[1, 2, 3, 4, 5, 6, 7, 8, 10]` at minimum. Pulse 12 already declares `[1-11]` for the same reason. The host pulse should mirror this.

### F-05 [LOW] Pulse 29 (workspace-edit) depends on `[22]` but dependency description says "Pulse 22 (quality-matrix)"

The dependency section says "Pulse 22 (quality-matrix)" but Pulse 22's actual slug is `workspace-parser`. This is a documentation error in the dependency description, not a dependency chain error. The dep target is correct.

**Fix**: Correct dependency description to "Pulse 22 (workspace-parser)".

### F-06 [LOW] Pulse 30 (validation-layer) depends on `[29, 23]` but dependency description says "Pulse 23 (governance-cost-estimator)"

Pulse 23's actual slug is `chunk-assembler`. Same class of documentation error as F-05.

**Fix**: Correct dependency description to "Pulse 23 (chunk-assembler)".

### F-07 [LOW] Pulse 32 (incremental-cache) depends on `[21]` but dependency description says "Pulse 21 (pinch-profiles)"

Pulse 21's actual slug is `serve-scaffold`. Same class of documentation error.

**Fix**: Correct dependency description to "Pulse 21 (serve-scaffold)".

### F-08 [LOW] Pulse 41 (audit-query) dependency description says "Pulse 21 (@openclaw/audit-chain)"

Pulse 21's slug is `serve-scaffold`, not `@openclaw/audit-chain`. The intent is correct (audit-query needs the serve scaffold), but the description references a wrong module name.

**Fix**: Correct to "Pulse 21 (serve-scaffold)".

### F-09 [MEDIUM] No cycles detected

I walked the full DAG. No cycles exist. The dependency graph is acyclic. All terminal nodes (1, 3, 4, 21 with no deps) root correctly.

**Status**: PASS -- no action needed.

---

## 2. Package Boundary

### F-10 [MEDIUM] Pulses 38 (workqueue) and 40 (skills-store) have business logic in claws-serve

Pulse 38 deliverables place `workqueue-store.ts` in `claws-serve/src/state/`. This is persistent state management with conflict resolution, stale entry cleanup, and atomic writes -- this is business logic, not an HTTP adapter. The SDK-owns-logic rule requires this in claws-sdk.

Pulse 40 (skills-store) route handler at `claws-serve/src/routes/skills.ts` performs skill directory scanning, governance lock evaluation, skill installation (file copy + recompile trigger). The directory scanning and lock evaluation are business logic that belongs in claws-sdk.

**Fix**: Move `workqueue-store.ts` to `claws-sdk/src/workspace/workqueue-store.ts`. Extract skill scanning/installation logic from Pulse 40 route into `claws-sdk/src/workspace/skills-manager.ts`, keeping only the HTTP adapter in claws-serve.

### F-11 [MEDIUM] Pulse 42 (fleet-claws) route contains fleet aggregation logic

`claws-serve/src/routes/fleet.ts` performs multi-claw aggregation, drift detection computation, and policy compliance calculation. These are domain operations that belong in claws-sdk. The route should call an SDK function like `aggregateFleetView()`.

**Fix**: Extract fleet aggregation into `claws-sdk/src/fleet/fleet-aggregator.ts`.

### F-12 [MEDIUM] Pulse 33 (allow-all) route contains batch orchestration logic

`claws-serve/src/routes/allow-all.ts` enumerates tools, filters R5, generates batch ToggleEdit operations, sequences them through the validation pipeline, and computes summary statistics. This is orchestration logic, not HTTP adaptation.

**Fix**: Extract batch allow-all logic into `claws-sdk/src/workspace-edit/allow-all.ts`, keeping the route as a thin adapter.

### F-13 [LOW] Pulse 43 (onboard-api) correctly splits SDK and serve

The onboard-validator is in claws-sdk, route handler is in claws-serve. This is the correct pattern. Noted as reference.

**Status**: PASS.

### F-14 [MEDIUM] Pulses 56-59 span two different package directories

Pulse 56 and 58 place code in `claws-lsp/`. Pulses 57 and 59 place code in `extensions/vscode-claws/`. This implies the VS Code extension is split across two packages. If `claws-lsp` is a standalone language server package and `extensions/vscode-claws` is the VS Code extension that consumes it, the split is architecturally sound. But the pulse plan is `claws-tui` for all four pulses, which is misleading. These are not TUI pulses -- they are VS Code extension pulses.

**Fix**: Consider splitting Pulses 56-59 into a separate plan (e.g., `claws-vscode`) or at minimum renaming the plan field to `claws-vscode` for these four pulses. The `claws-tui` plan name creates navigability confusion.

---

## 3. SDK-Owns-Logic Rule Violations

### F-15 [HIGH] Pulse 35 (loop-soul-sync) route in claws-serve contains Loop sync logic

`claws-serve/src/routes/loop-soul.ts` handles "PATCH /api/loop/soul: accepts section id + new content, validates via write-time validation layer, writes back to SOUL.md, triggers incremental recompile." The section parser is correctly in claws-sdk, but the PATCH orchestration (validate + write + recompile) is described as being in the route handler. This orchestration should be an SDK function like `editSoulSection(sectionId, content)`.

Same issue in Pulse 36 (loop-memory-sync) for `claws-serve/src/routes/loop-memory.ts`.

**Fix**: Extract PATCH orchestration (validate + write + recompile) into SDK functions. Route handler should be: parse request -> call SDK function -> serialize response.

### F-16 [MEDIUM] Pulse 34 (patch-errors-e2e) places health check lifecycle logic in claws-serve

`claws-serve/src/lifecycle/health-check.ts` performs full compilation, sets server mode, and manages degraded state. Compilation and mode determination are domain decisions that belong in claws-sdk. The serve package should call `CompilationHost.healthCheck()` which returns the mode.

**Fix**: Move compilation-based health check logic into CompilationHost in claws-sdk.

---

## 4. Checkpoint Gating

### F-17 [HIGH] Expected gate pulses vs actual `checkpoint_gate: true` markers

Expected gates per wave plan: 6, 12, 18, 20, 28, 34, 39, 44, 55, 59.

Actual `checkpoint_gate: true` values found:

- Pulse 6: `checkpoint_gate: true` -- CORRECT (CP-1 gate)
- Pulse 12: `checkpoint_gate: true` -- CORRECT (CP-2 gate)
- Pulse 18: `checkpoint_gate: true` -- CORRECT (CP-3 gate)
- Pulse 20: `checkpoint_gate: true` -- CORRECT (CP-4 gate)
- Pulse 28: `checkpoint_gate: true` -- CORRECT (CP-5 gate)
- Pulse 34: `checkpoint_gate: true` -- CORRECT (CP-6 gate)
- Pulse 39: `checkpoint_gate: true` -- CORRECT (CP-7 gate)
- Pulse 44: `checkpoint_gate: true` -- CORRECT (CP-8 gate)
- Pulse 55: `checkpoint_gate: true` -- CORRECT (CP-9 gate)
- Pulse 59: `checkpoint_gate: true` -- CORRECT (CP-10 gate)

All 10 gate pulses are correctly marked. No missing gates.

**Status**: PASS -- all gates properly declared.

### F-18 [HIGH] Gate pulse 6 depends on `[1, 3]` but not `[2, 4, 5]`

Pulse 6 is the CP-1 gate. Its body says "All prior infrastructure (readers, sidecar, IR, crypto, audit) must be stable before this lands." This refers to Pulses 1-5. Yet `depends_on: [1, 3]` -- Pulses 2, 4, and 5 are missing.

A gate pulse that does not depend on all pulses in its checkpoint cannot enforce that all checkpoint work is complete. A pulse agent could execute Pulse 6 before Pulses 2, 4, or 5 are finished.

**Fix**: `depends_on` for Pulse 6 should be `[1, 2, 3, 4, 5]`.

---

## 5. Cross-Checkpoint Dependencies

### F-19 [MEDIUM] CP-5 pulses (21-28) have no dependency on CP-4 gate (Pulse 20)

Pulses 21-28 are in CP-5. Pulse 21 (serve-scaffold) has `depends_on: []`. The CP-5 work builds the serve API that publishes the graduated compiler from CP-1-4. Without depending on the CP-4 gate, CP-5 work could theoretically start before the npm publish pipeline is verified.

However, CP-5 pulses consume CompilationHost from claws-sdk (not the published @claws/compiler), so the runtime dependency may not require CP-4 completion. The question is whether serve should reference the published @claws/compiler or the monorepo claws-sdk.

If serve consumes claws-sdk directly (monorepo internal), the cross-checkpoint dependency is relaxed. But the architectural narrative requires graduation to complete before building new surfaces on top.

**Fix**: Add Pulse 20 (CP-4 gate) as a dependency for Pulse 21 (first CP-5 pulse) to enforce sequencing.

### F-20 [LOW] CP-10 pulses (56-59) correctly depend on CP-5/6 outputs

Pulse 56 depends on Pulse 30 (validation layer from CP-6). Pulse 57 depends on 56. Pulse 58 depends on 56+57. Pulse 59 depends on 56. The VS Code pulses correctly build on the validation layer without needing to traverse through TUI (CP-9). This is a clean cross-checkpoint dependency.

**Status**: PASS.

---

## 6. Test Tier Coverage

### F-21 [MEDIUM] 14 pulses lack L2/L3 tests, including several with non-trivial cross-module integration

Pulses with ZERO L2 + L3 tests:

- Pulse 2 (forma-sidecar-resolver): L2=0, L3=0
- Pulse 3 (formir-types): L2=0, L3=0
- Pulse 4 (crypto-internalize): L2=0, L3=0
- Pulse 17 (extract-dialect-packages): L2=0, L3=0
- Pulse 22 (workspace-parser): L2=0, L3=0
- Pulse 36 (loop-memory-sync): L2=0, L3=0
- Pulse 46 (tui-general-preferences): L2=0, L3=0
- Pulse 47 (tui-connections-l1): L2=0, L3=0
- Pulse 50 (tui-memory-groups-entitlements): L2=0, L3=0
- Pulse 52 (tui-trust-schedule-queue): L2=0, L3=0
- Pulse 53 (tui-companion): L2=0, L3=0
- Pulse 56 (vscode-lsp-validation): L2=0, L3=0
- Pulse 57 (vscode-decorations): L2=0, L3=0
- Pulse 58 (vscode-code-actions): L2=0, L3=0

Most TUI screen pulses (46, 47, 50, 52, 53) lack E2E tests. This is acceptable because the gate pulse (55) has L2 coverage for the full TUI. However, Pulse 17 (extract-dialect-packages) performs a massive 10-package extraction with backward compatibility requirements and has ZERO L2/L3 tests. The L1 tests cover backward compat, but an E2E test verifying the full extraction (install from extracted package -> compile pipeline) would catch integration failures.

**Fix**: Add at least one L2 test to Pulse 17 (full pipeline from extracted packages). TUI pulses are acceptable as-is given the CP-9 gate.

### F-22 [LOW] Gate pulses have appropriate L3 acceptance tests

- Pulse 6 (CP-1 gate): L3=1 -- R5 non-bypassable verification
- Pulse 12 (CP-2 gate): L3=2 -- zero imports + zero deps
- Pulse 18 (CP-3 gate): L3=1 -- 17-package extraction complete
- Pulse 20 (CP-4 gate): L3=2 -- tarball install + run
- Pulse 28 (CP-5 gate): L3=1 -- SSE full scenario
- Pulse 34 (CP-6 gate): L3=3 -- all 8 PatchErrors + rollback + health check
- Pulse 39 (CP-7 gate): L3=2 -- trust escalation + JWT 5-check
- Pulse 44 (CP-8 gate): L3=5 -- policy violations + external edit + validation + full API
- Pulse 55 (CP-9 gate): L3=0 -- **MISSING**
- Pulse 59 (CP-10 gate): L3=0 -- **MISSING**

CP-9 and CP-10 gate pulses have zero L3 acceptance tests. Pulse 55 (TUI demo gate) has L0+L1+L2 but no acceptance test. Pulse 59 (VS Code webview gate) has L0+L1+L2 but no acceptance test. Gate pulses should have at least one L3 test per the "Does every gate pulse have L2/L3?" criterion.

**Fix**: Add L3 acceptance test to Pulse 55 (e.g., "TUI demo completes all 7 walkthrough steps with governance interactions") and Pulse 59 (e.g., "VS Code extension activates and renders all 3 webview panels with live data").

### F-23 [MEDIUM] Pulse 22 (workspace-parser) lists 9 files but names differ from Pulse 1 (readers)

Pulse 1 defines 9 OC files: SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md, HEARTBEAT.md, skills/, lobster.yaml.

Pulse 22 defines 9 OC files: SOUL.md, MEMORY.md, IDENTITY.md, TOOLS.md, AGENTS.md, HEARTBEAT.md, DENY.md, KNOWLEDGE.md, ENTITLEMENTS.md.

The file sets diverge: Pulse 1 has USER.md, skills/, lobster.yaml. Pulse 22 has DENY.md, KNOWLEDGE.md, ENTITLEMENTS.md. Only 6 files overlap. This means the "9 OC files" referenced in CP-1 (compiler readers) are a different 9 than in CP-5 (serve workspace parser). This is not necessarily wrong -- the compiler and the serve API may care about different subsets. But it creates confusion when both claim to parse "the 9 OC workspace files."

**Fix**: Document which 9 files each module handles and why they differ. Alternatively, reconcile to a single canonical file list with optional files.

---

## Findings Summary

| ID   | Severity | Category           | Pulse(s)   | Description                                                      |
| ---- | -------- | ------------------ | ---------- | ---------------------------------------------------------------- |
| F-01 | HIGH     | Dependency chain   | 7          | Missing dependency on Pulse 6 (compileGuard)                     |
| F-02 | HIGH     | Dependency chain   | 8          | Transitive gap on Pulse 6 via Pulse 7                            |
| F-03 | MEDIUM   | Dependency chain   | 9          | Missing direct dependency on Pulse 3 for GovernanceIR types      |
| F-04 | MEDIUM   | Dependency chain   | 11         | Declares 2 of 10 dependencies it orchestrates                    |
| F-05 | LOW      | Documentation      | 29         | Wrong pulse slug in dependency description                       |
| F-06 | LOW      | Documentation      | 30         | Wrong pulse slug in dependency description                       |
| F-07 | LOW      | Documentation      | 32         | Wrong pulse slug in dependency description                       |
| F-08 | LOW      | Documentation      | 41         | Wrong module name in dependency description                      |
| F-09 | MEDIUM   | Dependency chain   | --         | No cycles detected (PASS)                                        |
| F-10 | MEDIUM   | Package boundary   | 38, 40     | Business logic in claws-serve (workqueue-store, skills scanning) |
| F-11 | MEDIUM   | Package boundary   | 42         | Fleet aggregation logic in route handler                         |
| F-12 | MEDIUM   | Package boundary   | 33         | Batch orchestration logic in route handler                       |
| F-13 | LOW      | Package boundary   | 43         | Correct pattern (PASS)                                           |
| F-14 | MEDIUM   | Package boundary   | 56-59      | Plan name `claws-tui` for VS Code extension pulses is misleading |
| F-15 | HIGH     | SDK-owns-logic     | 35, 36     | Loop sync PATCH orchestration in claws-serve routes              |
| F-16 | MEDIUM   | SDK-owns-logic     | 34         | Health check lifecycle logic in claws-serve                      |
| F-17 | HIGH     | Checkpoint gating  | all        | All 10 gates correctly marked (PASS)                             |
| F-18 | HIGH     | Checkpoint gating  | 6          | CP-1 gate missing deps on Pulses 2, 4, 5                         |
| F-19 | MEDIUM   | Cross-checkpoint   | 21         | CP-5 start has no dependency on CP-4 gate                        |
| F-20 | LOW      | Cross-checkpoint   | 56-59      | Correct cross-CP deps (PASS)                                     |
| F-21 | MEDIUM   | Test coverage      | 17, 55, 59 | Missing L2 on massive extraction; missing L3 on CP-9/CP-10 gates |
| F-22 | LOW      | Test coverage      | gates      | 8 of 10 gate pulses have L3 tests (PASS for those 8)             |
| F-23 | MEDIUM   | Structural clarity | 1, 22      | Two different "9 OC file" sets across compiler and serve         |

---

## Required Fixes (HIGH)

1. **F-01**: Pulse 7 `depends_on` add `6`
2. **F-02**: Resolved by F-01 fix (transitive), or add `6` to Pulse 8 explicitly
3. **F-18**: Pulse 6 `depends_on` change to `[1, 2, 3, 4, 5]`
4. **F-15**: Extract Loop sync PATCH orchestration from claws-serve routes into claws-sdk functions

## Recommended Fixes (MEDIUM)

5. **F-04**: Pulse 11 `depends_on` expand to `[1, 2, 3, 4, 5, 6, 7, 8, 10]`
6. **F-10**: Move workqueue-store and skills-manager into claws-sdk
7. **F-11**: Extract fleet aggregation into claws-sdk
8. **F-12**: Extract allow-all batch logic into claws-sdk
9. **F-14**: Rename plan for Pulses 56-59 to `claws-vscode`
10. **F-16**: Move health check compilation logic into CompilationHost
11. **F-19**: Add Pulse 20 as dependency for Pulse 21
12. **F-21**: Add L2 test to Pulse 17; add L3 tests to Pulses 55 and 59
13. **F-23**: Reconcile or explicitly document the two different 9-file sets
