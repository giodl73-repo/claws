---
slug: claws-gateway-harness
preset: "claws"
plan: "Gateway evaluation harness — reference OC workspace, GatewaySim plugin loader, before/after demo, self-validation, upgrade regression detection"
area: claws
status: Implemented
wave: 260413+anubis-the-judge+claws-ops
atoms: [atom:eval-harness, atom:gateway-host, atom:governance-ir, atom:sidecar-mode]
specs: [CL-01, CL-02, CL-07]
stages:
  implementation:
    reviews: [claws:gateway-eng, craft:architect, claws:platform-eng, claws:founder]
  testing:
    reviews: [claws:gateway-eng, craft:testing, claws:skill-author]
---

# Gateway Evaluation Harness

## Summary

End-to-end validation infrastructure for the claws governance compiler. Proves that compiled plugins actually enforce the rules they were built from — not just correct syntax, but correct behavior.

Three capabilities:

1. **Reference OC Workspace** — Canonical workspace with all 9 file types, 12 tools (R1-R5), before/after variants for demo story
2. **GatewaySim** — Loads compiled plugins, fires tool calls, reports enforcement with timing, human-readable reports, and vitest matchers
3. **Self-Validation** — OC developers test their own workspaces before submitting; upgrade regression detection for `claws doctor`

## Why This Exists

Without a gateway simulator, claws's output is code you have to trust. GatewaySim closes the loop:

```
  compile → load → fire → verify → report
```

This serves four audiences:
- **Developers**: `GatewaySim.fromWorkspace('./my-oc')` — test your own skills
- **CI pipelines**: `claws test --sim --assert-no-regressions` — gate on enforcement
- **Upgraders**: `SimReport.diff(before, after)` — catch enforcement regressions
- **Demos**: Before/after side-by-side showing claws's impact on a real workspace

## Headlines

1. **Reference workspace** with all 9 OC files, 12 tools R1-R5, before/after variants
2. **Before/After demo**: same tools, zero governance vs 29 rules — side-by-side terminal output
3. **GatewaySim** loads compiled plugins, fires tool calls, captures timing per hook
4. **SimReport** human-readable `toString()` + machine-readable `toJSON()` for CI
5. **SimReport.diff()** compares two reports, flags enforcement regressions (blocked→allowed)
6. **Gateway matchers**: `toBlock()`, `toAllow()`, `toElicit()`, `toEnforceWithin()`
7. **MockGovernanceHost** implements 6 facets with configurable responses
8. **ToolCallBuilder** fluent API for constructing realistic tool call payloads
9. **fromWorkspace()** convenience: compile + load + ready to fire in one call
10. **E2E loops**: compile→sim→verify, check→compare, init→check→build→sim→verify

## The Demo Story

```
  BEFORE CLAWS                           AFTER CLAWS
  ────────────                           ───────────
  12 tools, 0 governance                 12 tools, 29 rules applied
  send-email: ALLOWED (no gate)          send-email: BLOCKED (R5, elicit required)
  db-query: ALLOWED (no audit)           db-query: GATED (R4, approval needed)
  web-search: ALLOWED                    web-search: ALLOWED (R1, audit logged)
  0 violations, 0 audit entries          7 violations, full audit chain
```

## Use Cases

### Skill Author Self-Validation
```ts
const sim = await GatewaySim.fromWorkspace('./my-oc-workspace');
const result = await sim.fireToolCall('send-email', { to: 'user@example.com' });
console.log(result.report.toString());
// send-email: BLOCKED (G-ELICIT-GATE, R5, 2.3ms)
```

### Upgrade Regression Detection
```ts
const before = await GatewaySim.fromSnapshot('.claws/snapshots/v0.36');
const after = await GatewaySim.fromWorkspace('.');
const diff = SimReport.diff(before.report, after.report);
// send-email: BLOCKED → ALLOWED (REGRESSION!)
```

### CI Pre-Submit Gate
```bash
claws build && claws test --sim --assert-no-regressions
```

## Deliverables

### Reference Workspace (Pulse 01)
- 9 OC source files (SOUL, TOOLS, AGENTS, IDENTITY, USER, MEMORY, HEARTBEAT, skills, lobster)
- claws.json + openclaw.json config
- expected-violations.json + expected-artifacts.json golden masters
- **before-claws/** variant: same tools, no governance, empty violations
- README with governance pattern walkthrough + before/after explanation

### GatewaySim (Pulse 02)
- GatewaySim class with plugin loading, hook registration, tool call firing
- `fromWorkspace(path)` convenience constructor (compile + load)
- MockGovernanceHost with configurable 6-facet responses
- ToolCallBuilder fluent API
- Plugin loader (dynamic import, no eval)
- **SimReport** with `toString()` (human-readable) and `toJSON()` (CI)
- **SimReport.diff()** for upgrade regression detection
- **Hook timing capture** per call with `getTimings()`
- **Gateway matchers**: `toBlock()`, `toAllow()`, `toElicit()`, `toHaveAuditEntries()`, `toEnforceWithin()`

### E2E Loops (Pulses 07-09)
- claws build → GatewaySim → verify enforcement
- claws check → compare against expected violations
- claws init → check → build → GatewaySim → full lifecycle

## Scope

| In scope | Out of scope |
|----------|-------------|
| OC reference workspace + before/after | Real gateway runtime integration |
| GatewaySim mock harness | Production plugin hosting |
| MockGovernanceHost (6 facets) | Real GovernanceHost implementation |
| SimReport + diff + timing | Full perf benchmarking suite |
| Gateway vitest matchers | CLI `claws test` command (separate plan) |
| fromWorkspace() convenience | Multi-platform sim (OpenClaw only for now) |
| E2E compile-check-build loops | CI/CD pipeline integration |

## Dependencies

- claws-sdk (GovernanceIR, compile pipeline, emit) — shipped in Ptah
- claws-cli (compile, check, build commands) — shipped in Ptah
- @bic/skill-kit (MockGateway base) — shipped in Ptah
- @bic/test (ScenarioRunner, GovernanceValidator) — shipped in Ptah

## Coverage Contract

| Tier | Count | What |
|------|-------|------|
| L0 unit | 17 | Fixture parsing (3+2), GatewaySim (12) |
| L1 integration | 3 | Real plugin + matchers, before/after comparison, timing |
| L2 e2e | 3 | Full compile→sim→verify loops |
