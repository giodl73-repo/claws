---
pulse: 2
slug: gateway-simulator
plan: claws-gateway-harness
depends_on: []
governing_roles: [claws:gateway-eng, craft:architect, claws:ciso]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 19
  L1_integration: 4
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-test && vitest run"
  typecheck:
    - "cd claws-test && tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 02: Gateway Simulator

## Objective

Create the GatewaySim test harness that loads a compiled claws plugin (generated `index.ts`) and simulates gateway enforcement. This is the core test infrastructure that allows e2e tests to verify that compiled plugins actually enforce the governance rules they were built from, without requiring a real gateway runtime.

GatewaySim must support loading a plugin, registering its hooks (before_tool_call, after_tool_call, on_error), firing individual and sequenced tool calls, and inspecting the resulting audit chain. A companion ToolCallBuilder provides a fluent API for constructing realistic tool call payloads.

## Deliverables

### Core GatewaySim

- [ ] `claws-test/src/gateway-sim.ts` — GatewaySim class: loads generated `index.ts` plugin via dynamic `import()` from temp file path (**ban `eval`/`new Function`**), registers plugin hooks (before_tool_call, after_tool_call, on_error), `fireToolCall(toolName, args, context)` returning `{ allowed, blocked, elicited, auditEntries, reason }`, `fireToolCallSequence(calls[])` for multi-call scenarios, `getAuditChain()` for accumulated entries, `reset(opts?)` with optional `{ auditOnly?: boolean }` for partial reset (PU-03). `static fromWorkspace(path, opts?)` convenience constructor that compiles + loads, with `{ verbose?: boolean }` for skill author debugging (SA-01). **Relationship to MockGateway**: MockGateway is per-skill handler-level mocking. GatewaySim EXTENDS MockGateway for full compiled plugin loading.
- [ ] `claws-test/src/gateway-sim/plugin-loader.ts` — Plugin loading: dynamic `import()` only, no eval. After import, validates module exports: `beforeToolCall`, `afterToolCall`, `onError` must be functions (or absent). Wrong shape throws `PluginLoadError` with module path, expected exports, actual exports (GE-03).
- [ ] `claws-test/src/gateway-sim/mock-governance-host.ts` — MockGovernanceHost implementing all 6 facets (`evaluatePolicy`, `emitAuditEvent`, `getConfig`, `resolveToolRisk`, `checkElicitation`, `reportDiagnostic`) with configurable responses. `checkElicitation` accepts optional 3rd `signal?: AbortSignal`. Without MockGovernanceHost, the generated plugin returns `{allowed: false, blockReason: 'governance host not configured'}`.
- [ ] `claws-test/src/tool-call-builder.ts` — Fluent builder: `toolCall('send-email').withArgs({to: 'x'}).asUser('sarah').withTier(2)`

### SimReport (human + machine readable)

- [ ] `claws-test/src/gateway-sim/report.ts` — SimReport with:
  - `toString()`: per-tool enforcement summary (BLOCKED/ALLOWED/ELICITED with rule ID, risk level, timing), total stats line, audit chain summary
  - `toJSON()`: machine-readable with SIEM-mappable fields per entry: `{ timestamp, severity, source, action, outcome, actor, toolName, ruleId }` (CI-03). Includes workspace metadata: `{ workspacePath, workspaceId, policyVersion, clawsVersion }` (PE-02)
  - `static diff(a: SimReport, b: SimReport): SimDiff` for regression detection
  - SimDiff type: `{ regressions: ToolDiff[], improvements: ToolDiff[], unchanged: string[] }` with `hasRegressions(): boolean` and `severity(): 'critical' | 'warning' | 'clean'` (PU-01). Critical = R5 regression. Warning = R3-R4 regression. Clean = no regressions.
  - `timingBaseline()`: returns per-hook p50/p95/p99 from accumulated calls (GE-01)

### Timing + Matchers

- [ ] `claws-test/src/gateway-sim/timing.ts` — Hook timing capture: wraps each hook call with `performance.now()`, stores per-call `{ hookName, toolName, elapsedMs }`, exposed via `sim.getTimings()` and included in SimReport. **Note**: GatewaySim timing is a baseline sanity check, not a production performance guarantee. The timing infrastructure is reusable by real Gateway integration tests.
- [ ] `claws-test/src/matchers/gateway.ts` — GatewaySim vitest matchers:
  - `toBlock(toolName)` — asserts GatewaySim blocked the named tool
  - `toAllow(toolName)` — asserts GatewaySim allowed the named tool
  - `toElicit(toolName)` — asserts GatewaySim triggered elicitation for the named tool
  - `toHaveAuditEntries(count)` — asserts audit chain length
  - `toEnforceWithin(toolName, maxMs)` — asserts enforcement completed within timing budget
  - `toHaveValidAuditChain()` — verifies sequential entry IDs, monotonic timestamps, and (when signed) valid HMAC chain (CI-02)

### Barrel + Tests

- [ ] `claws-test/src/index.ts` — barrel exports updated with GatewaySim, MockGovernanceHost, ToolCallBuilder, SimReport, gateway matchers
- [ ] `claws-test/tests/gateway-sim.unit.test.ts` — L0: 19 tests:
  - Original 8: plugin loading, fire calls, block/allow/elicit, audit chain, reset, sequencing, error hooks, builder output
  - SimReport: toString, toJSON with SIEM fields, diff with hasRegressions (3)
  - Timing: capture, timingBaseline p50/p95/p99 (2)
  - Matchers: toBlock/toAllow pass/fail, toHaveValidAuditChain (2)
  - **Degraded mode (CI-01)**: GovernanceHost missing — R5 blocked, R1 allowed (1). GovernanceHost throws — R5 blocked (1). GovernanceHost returns malformed — R5 blocked (1)
  - **Error propagation (GE-02)**: before_tool_call throws on R1 — allowed (fail-open) (1). before_tool_call throws on R5 — blocked (fail-closed) (1). after_tool_call throws — audit entry still written (1)
- [ ] `claws-test/tests/gateway-sim.integration.test.ts` — L1: 4 tests:
  - Real compiled plugin + matchers (1)
  - Before-claws baseline comparison: all tools allowed (1)
  - Timing under 50ms per hook (1)
  - **Degraded integration (CI-01)**: real compiled plugin, remove MockGovernanceHost, fire R5 tool, assert blocked (1)

## fromWorkspace() Verbose Mode (SA-01)

When `verbose: true`, fromWorkspace() logs:
1. Detected OC files (which of the 9 were found)
2. Parsed governance rules with risk tiers
3. Generated plugin file path
4. Loaded hook names

This is the skill author's debugger — they see the pipeline, not just the result.

```ts
const sim = await GatewaySim.fromWorkspace('./my-oc', { verbose: true });
// [claws] Detected: SOUL.md, TOOLS.md, AGENTS.md, USER.md (4/9 files)
// [claws] Rules: 12 tools (3×R1, 2×R2, 3×R3, 2×R4, 2×R5)
// [claws] Plugin: /tmp/claws-sim-abc123/index.ts
// [claws] Hooks: beforeToolCall, afterToolCall, onError
```

## Use Cases Beyond Testing

### Skill Author Self-Validation
```ts
const sim = await GatewaySim.fromWorkspace('./my-oc-workspace');
const result = await sim.fireToolCall('send-email', { to: 'user@example.com' });
console.log(result.report.toString());
// send-email: BLOCKED (G-ELICIT-GATE, R5, 2.3ms) — elicitation required
```
`@bic/claws-test` is a devDependency. The `claws test --sim` CLI command is the production-facing surface (F-02).

### Compare Any Two Workspaces
```ts
// Before/after on any workspace pair — not locked to our fixtures
const before = await GatewaySim.fromWorkspace('./workspace-v1');
const after = await GatewaySim.fromWorkspace('./workspace-v2');
const diff = SimReport.diff(before.report, after.report);
console.log(diff.toString());
// send-email: BLOCKED → ALLOWED (REGRESSION!)
// db-query: ALLOWED → GATED (improvement)
```

### Upgrade Regression Detection (Doctor)
```ts
const before = await GatewaySim.fromSnapshot('.claws/snapshots/v0.36');
const after = await GatewaySim.fromWorkspace('.');
const diff = SimReport.diff(before.report, after.report);
if (diff.hasRegressions()) {
  console.error(`${diff.severity()} regression: ${diff.regressions.length} tools`);
  process.exit(1);
}
```
**Snapshot format** (PU-02): `.claws/snapshots/{version}/` contains `plugin.ts`, `report.json` (SimReport.toJSON()), `meta.json` (claws version, policy hash, timestamp). `claws build --snapshot` creates one.

### CI Pre-Submit Gate
```bash
claws build && claws test --sim --assert-no-regressions
# Exit 0 = clean, 1 = regressions, 2 = error
```

## Acceptance Criteria

- [ ] GatewaySim can load a compiled plugin via dynamic `import()` and fire tool calls
- [ ] Plugin loader validates exported hook shape, throws PluginLoadError on mismatch (GE-03)
- [ ] MockGovernanceHost implements all 6 facets, wired into GatewaySim context
- [ ] `fireToolCall` returns correct allowed/blocked/elicited status
- [ ] `fireToolCallSequence` executes calls in order, accumulates audit entries
- [ ] `reset()` with no args clears everything; `reset({ auditOnly: true })` preserves host config (PU-03)
- [ ] **Degraded mode**: R5 tools BLOCKED when GovernanceHost is missing, throws, or returns malformed (CI-01)
- [ ] **Error propagation**: R1 fail-open, R5 fail-closed, after_tool_call errors still write audit (GE-02)
- [ ] SimReport `toString()` produces human-readable enforcement summary
- [ ] SimReport `toJSON()` includes SIEM-mappable fields + workspace metadata (CI-03, PE-02)
- [ ] SimReport.diff() returns SimDiff with hasRegressions() + severity() (PU-01)
- [ ] `toHaveValidAuditChain()` verifies sequential IDs + monotonic timestamps (CI-02)
- [ ] `fromWorkspace()` with `verbose: true` logs detection → compile → load pipeline (SA-01)
- [ ] Hook timing captured per call, timingBaseline() returns p50/p95/p99 (GE-01)
- [ ] `npm run build` exits 0
- [ ] `tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — gateway runtime model, hook lifecycle, audit event schema
- `.craft/roles/craft/architect.md` — testing infrastructure patterns, module boundaries
- `.craft/roles/claws/ciso.md` — fail-closed guarantees, degraded mode, audit integrity

## Dependencies

None — this pulse has no dependencies on other pulses.

## Test Gates

- [ ] L0 unit: 19 tests — core (8), SimReport (3), timing (2), matchers (2), degraded (3), error propagation (3) [note: 8+3+2+2+3+1=19]
- [ ] L1 integration: 4 tests — real plugin + matchers, before/after comparison, timing, degraded with real plugin
- [ ] `npm run build` exits 0
- [ ] `tsc --noEmit` exits 0
