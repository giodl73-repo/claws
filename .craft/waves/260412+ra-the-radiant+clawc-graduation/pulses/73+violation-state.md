---
pulse: 73
slug: violation-state
plan: claws-cap-integration
depends_on: [30, 32, 72]
governing_roles: [craft:dragon, craft:architect, claws:ciso]
scenario_codes: [S05, S22, S24, S29, S32, S35]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 6
  L2_e2e: 3
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 73: Policy Violation State Model

## Objective

When an external write (OC runtime, VS Code, OneDrive sync) creates a governance
violation, the system enters a severity-based degraded state. The key invariant:
**never accept a violation into the compiled GovernanceIR.**

The last good GovernanceIR (from the compilation forest) continues to serve while
violations are surfaced to the admin. In ERROR state, repair PATCHes targeting violation files are allowed; other PATCHes return 503. In DEGRADED_WARN, all PATCHes are allowed with warnings.

Five states: CLEAN, DEGRADED_R5, DEGRADED_WARN, DEGRADED_FLEET, ERROR.

Business logic in claws-sdk (violation state machine). Integrated with the
compilation pipeline and status endpoint in claws-serve.

## Deliverables

- [ ] `claws-sdk/src/workspace/violation-state.ts` — ViolationStateMachine. States: CLEAN → DEGRADED_R5 / DEGRADED_WARN / DEGRADED_FLEET / ERROR. Transitions triggered by recompilation results. Tracks: current state, pending violations (oc:// paths + severity + fix guidance + scope), last good version, violation source (oc_runtime/external_edit).
- [ ] `claws-sdk/src/workspace/violation-types.ts` — ViolationState enum (CLEAN, DEGRADED_R5, DEGRADED_WARN, DEGRADED_FLEET, ERROR), PendingViolation type (path, severity, rule, message, fixGuidance, source, scope: 'isolated' | 'structural'), ViolationSummary.
- [ ] Unclassified tool handler: tools in workspace but absent from serving IR are blocked (R5 fail-closed).
- [ ] Violation scope: isolated (per-tool) vs structural (dependency chain). Structural violations block the entire affected chain.
- [ ] `claws-sdk/src/compile/violation-aware-compile.ts` — Wraps the compilation pipeline: if recompile produces violations, keep the last good GovernanceIR from the forest, transition to degraded state, record violations.
- [ ] `claws-serve/src/routes/status.ts` (EDIT) — GET /api/status includes violation state: `{ status: 'degraded_r5', lastGoodVersion: 42, violations: [...], fixGuidance: '...' }`.
- [ ] `claws-serve/src/middleware/violation-gate.ts` — Middleware that gates PATCH requests: in ERROR state, repair PATCHes targeting files in `pendingViolations` are allowed (other PATCHes return 503); in DEGRADED_WARN, all PATCHes allowed with warnings in response; in DEGRADED_R5, PATCHes allowed except on the blocked tool's file.
- [ ] Chunk responses include `governance.violations` array when state is DEGRADED.
- [ ] SSE events: `governance_violation` with oc:// paths + severity when entering degraded state, `governance_resolved` when returning to CLEAN.
- [ ] R5 tool blocking in DEGRADED_R5: the specific R5-violating tool gets `lock.source: 'violation'` in chunks. All other tools operate normally.
- [ ] `claws-sdk/tests/workspace/violation-state.unit.test.ts` — L0: 8 tests (CLEAN→DEGRADED_R5, CLEAN→ERROR, DEGRADED→CLEAN on fix, ERROR→CLEAN on fix, R5 tool blocking, PATCH gate in ERROR, last-good-IR serving, violation attribution).
- [ ] `claws-serve/tests/workspace/violation-state.integration.test.ts` — L1: 6 tests (external edit creates R5 violation → DEGRADED_R5 → tool blocked → fix → CLEAN, structural error → ERROR → 503 → fix → CLEAN, OC runtime skill install → violation → auto-snapshot preserved, chunk response includes violations, SSE events fire, status endpoint reflects state).
- [ ] `claws-serve/tests/e2e/violation-recovery.e2e.test.ts` — L2: 3 tests (full external-write → violation → degraded → fix → clean cycle for R5, R3, and structural error).
- [ ] L3 acceptance (2): (1) OC runtime installs skill with R5 violation → DEGRADED_R5 → that tool blocked → admin fixes → CLEAN. (2) VS Code corrupts SOUL.md YAML → ERROR → last good IR serves → admin fixes → CLEAN.

## Acceptance Criteria

- [ ] External write creating R5 violation → DEGRADED_R5, specific tool blocked
- [ ] External write creating R3 violation → DEGRADED_WARN, warnings only
- [ ] Structural error (corrupt file) → ERROR, last good IR serves, repair PATCHes allowed, other PATCHes 503
- [ ] Last good GovernanceIR from compilation forest continues serving during degraded state
- [ ] In ERROR: repair PATCHes (targeting pendingViolations files) allowed, other PATCHes 503. In DEGRADED_WARN: all PATCHes allowed with warnings
- [ ] Chunks include governance.violations array
- [ ] SSE events for violation entry + resolution
- [ ] Violation attributed to source (oc_runtime, external_edit, onedrive_sync)
- [ ] Recovery: fix the violation → recompile succeeds → CLEAN state restored
- [ ] PATCH gating is atomic with state transitions — no window where a PATCH could slip through during a state change (P1)
- [ ] Concurrent violation merge depends on debounce window >= 200ms. Integration test: two violations arrive within 100ms, both appear in the violation set after one recompile (P2)
- [ ] Cold-start with violations: empty GovernanceIR blocks all tools. This is FATAL if not implemented — must be tested as a first-boot scenario (P3)
- [ ] Partial fix recalculation: when one violation is fixed but others remain, state drops to next-worst (not CLEAN). Test: ERROR + R5 violation → fix structural error → state = DEGRADED_R5 (not CLEAN) (P4)
- [ ] ERROR→DEGRADED transition: violation-gate middleware reads state atomically after transition, never serves stale ERROR gating rules to a now-DEGRADED request (P5)
- [ ] Startup loads persisted violation state from `.claws/cache/violation-state.json` BEFORE serving any requests. First request must see the correct state, not a default CLEAN (P6)
