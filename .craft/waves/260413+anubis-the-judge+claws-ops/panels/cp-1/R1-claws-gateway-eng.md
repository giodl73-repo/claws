---
round: R1
role: claws:gateway-eng
reviewer: gateway-eng
scope: CP-1 (Pulses 01-09)
date: 2026-04-13
verdict: PASS with warnings
findings: 11
must-fix: 2
warnings: 5
nits: 4
---

# R1 Review: claws:gateway-eng

**Lens**: Gateway runtime model, hook lifecycle, plugin loading, enforcement correctness, audit events.

**Tension**: Runtime performance > Governance completeness. The Gateway is a production system -- governance is a guest, not the owner.

---

## Findings

### M-01: `evaluatePolicy` ignores AbortSignal -- no timeout enforcement on host calls

**File**: `claws-test/src/gateway-sim/mock-governance-host.ts:94-101`
**Severity**: MUST-FIX

`evaluatePolicy()` and `checkElicitation()` accept an `AbortSignal` parameter but never wire it into the mock implementation. More critically, `GatewaySim.fireToolCall()` (`claws-test/src/gateway-sim.ts:199-305`) never passes an AbortSignal at all when calling hooks. This means the 50ms latency budget from the role spec is architecturally unenforceable -- a governance host that hangs will block the Gateway event loop indefinitely.

The `TimingCollector` measures elapsed time _after_ the call returns, but it cannot _enforce_ the budget. A real Gateway integration would need `AbortController` with a deadline to cut off slow hosts.

**Recommendation**: Wire an `AbortController` with configurable timeout (default 50ms) into `GatewaySim.fireToolCall()` before the `beforeToolCall` hook invocation. The mock can remain simple, but the sim must model the timeout behavior that production will need.

---

### M-02: `afterToolCall` hook only fires on ALLOWED outcome -- BLOCKED/ELICITED calls skip post-hook

**File**: `claws-test/src/gateway-sim.ts:261`
**Severity**: MUST-FIX

```typescript
if (this._hooks.afterToolCall && outcome === 'ALLOWED') {
```

The `afterToolCall` hook is gated behind `outcome === 'ALLOWED'`. This means blocked and elicited tool calls never trigger the post-hook. In a real Gateway, `afterToolCall` is the audit completion hook -- it records that enforcement happened, writes SIEM events, and closes the trace span. Skipping it on BLOCKED/ELICITED calls creates an audit gap: the audit chain records the outcome via `_createAuditEntry`, but the governance host's own `emitAuditEvent` (fired inside `afterToolCall` in the E2E test hooks at `compile-to-gateway.e2e.test.ts:175-184`) never fires for blocked tools.

This violates the "every action writes an audit entry, even on error" contract stated in the module docstring (line 12).

**Recommendation**: Remove the `outcome === 'ALLOWED'` guard. Fire `afterToolCall` for all outcomes, passing the outcome in the result parameter so the host can distinguish allowed/blocked/elicited in its audit logic.

---

### W-01: `fromWorkspace()` stub returns empty hooks and empty risk map -- callers get silent no-ops

**File**: `claws-test/src/gateway-sim.ts:154-174`
**Severity**: WARNING

`GatewaySim.fromWorkspace()` is a placeholder that returns `{}` hooks and an empty `Map()`. Any test that calls `fromWorkspace()` will get a GatewaySim that allows all tools (no `beforeToolCall` hook means the degraded-mode path runs, and with no host set, R1-R2 tools pass while R3+ block -- but risk levels are all unknown because the risk map is empty, so everything defaults to R5 and blocks).

This is misleading: the verbose logging on lines 161-164 prints "Detected: SOUL.md, TOOLS.md..." suggesting real parsing happened, but no parsing occurred. A test relying on `fromWorkspace()` would pass today only because the E2E tests use `fromHooks()` instead, but it's a latent trap for future test authors.

**Recommendation**: Either mark `fromWorkspace()` as `@deprecated` with a clear docstring, or throw a "not implemented" error so tests fail immediately rather than silently producing wrong enforcement.

---

### W-02: Plugin loader `fakeApi.on()` has no validation -- unknown events silently ignored

**File**: `claws-test/src/gateway-sim/plugin-loader.ts:88-94`
**Severity**: WARNING

The registration API in `loadPlugin()` uses a `fakeApi` with an `on()` method that only recognizes three event names (`before_tool_call`, `after_tool_call`, `on_error`). Any other event name is silently dropped. If a compiled plugin registers a handler for a different lifecycle event (e.g., `on_connect`, `on_disconnect`, `before_agent_call`), the loader returns successfully but the handler is lost.

In a production Gateway, unrecognized events would either throw or log a warning. Silent drops mean a plugin author can ship code that compiles and loads but does nothing at runtime -- a governance gap.

**Recommendation**: Add an `else` branch that either logs a warning (test-friendly) or collects unrecognized events into a `PluginLoadError`-style diagnostic.

---

### W-03: `diffSeverity()` returns 'clean' for R1-R2 regressions -- enforcement weakening of low-risk tools is invisible

**File**: `claws-test/src/gateway-sim/report.ts:106-113`
**Severity**: WARNING

```typescript
export function diffSeverity(diff: SimDiff): DiffSeverity {
  if (diff.regressions.length === 0) return "clean";
  const hasR5 = diff.regressions.some((r) => r.riskLevel >= 5);
  if (hasR5) return "critical";
  const hasR3R4 = diff.regressions.some((r) => r.riskLevel >= 3);
  if (hasR3R4) return "warning";
  return "clean"; // <-- R1-R2 regressions get 'clean'
}
```

If enforcement weakens on R1-R2 tools (e.g., a tool that was BLOCKED drops to ALLOWED), `diffSeverity()` returns `'clean'` because neither the R5 nor R3-R4 threshold is hit. The `hasRegressions()` function would still return `true`, but any consumer that checks only `diffSeverity()` would miss the regression entirely.

Per role spec: "Fail-open for R1-R2" means errors _allow through_ -- it does not mean regressions on R1-R2 are unimportant. An R1 tool going from BLOCKED to ALLOWED could indicate a policy misconfiguration.

**Recommendation**: Return `'warning'` (not `'clean'`) when any regressions exist, regardless of risk tier.

---

### W-04: Spinner `setInterval` timer is not unref'd -- can keep Node.js process alive after tests

**File**: `claws-cli/src/ui/spinner.ts:97`
**Severity**: WARNING

```typescript
timer = setInterval(render, INTERVAL_MS);
```

The spinner's `setInterval` is never `.unref()`'d. In a CLI context this is fine (the process exits when the command finishes), but in a test context, an orphaned spinner timer will keep the Node.js event loop alive, causing vitest to hang on exit or report "open handles" warnings.

The Gateway itself runs on a single event loop -- an unreferenced timer from a governance UI component keeping the process alive is exactly the kind of "governance as a guest, not the owner" violation the role guards against.

**Recommendation**: Call `timer.unref()` immediately after `setInterval()`. This lets the process exit naturally even if `stop()` / `succeed()` / `fail()` is never called (e.g., on early abort).

---

### W-05: Config loader throws serialized JSON as Error message -- not a DiagnosticError

**File**: `claws-sdk/src/config/loader.ts:76-86, 89-102`
**Severity**: WARNING

When `loadConfig()` encounters invalid JSON or schema violations, it constructs a `ConfigValidationError` object and then `throw new Error(JSON.stringify(detail))`. The caller receives a plain `Error` whose `.message` is a JSON string. This is not a `DiagnosticError` (from `claws-cli/src/errors/contract.ts`), so none of the diagnostic rendering pipeline (WHAT/HOW/WHERE/docsHint) applies automatically.

Any Gateway code that catches config errors and tries to call `.toDiagnostic()` will get `undefined` because plain `Error` has no such method. The error contract exists but is not used where it matters most.

**Recommendation**: Throw `DiagnosticError` directly (or a new `ConfigError` that extends it) instead of serializing to JSON and wrapping in a plain `Error`.

---

### N-01: `extractRuleId()` regex only matches `G-` prefixed rules -- misses `CLAWS-` diagnostic codes

**File**: `claws-test/src/gateway-sim.ts:378-381`
**Severity**: NIT

```typescript
function extractRuleId(reason: string): string {
  const match = reason.match(/G-[\w-]+/);
  return match ? match[0] : "default";
}
```

The error contract in `claws-cli/src/errors/codes.ts` uses `OC-POLICY-E{NNN}` codes, and governance rules use `G-` prefixed IDs. `extractRuleId()` only matches `G-` prefixes. If a block reason contains a `OC-POLICY-E040` code instead of (or in addition to) a `G-` prefixed rule, the audit entry will record `ruleId: 'default'` instead of the actual code.

---

### N-02: `SimReport.diff()` accesses private `_entries` of both `a` and `b` -- couples diff to internal state

**File**: `claws-test/src/gateway-sim/report.ts:233-237`
**Severity**: NIT

`SimReport.diff()` is a static method that reaches into `a._entries` and `b._entries` directly. This is valid TypeScript (same class), but it bypasses the `getEntries()` API and creates a coupling that makes it impossible to diff a `SimReport` subclass or mock without exposing the private field. For a test utility, this is acceptable but worth noting for future extensibility.

---

### N-03: `toSarifUri()` fallback returns absolute normalized path -- SARIF consumers may reject non-relative URIs

**File**: `claws-cli/src/format/sarif-uri.ts:35-36`
**Severity**: NIT

When the target path doesn't start with the workspace root (e.g., a symlinked file or a path on a different drive), `toSarifUri()` falls back to returning the full normalized path (`C:/src/...`). SARIF 2.1.0 recommends relative URIs in `artifactLocation.uri`. Some SARIF consumers (GitHub Code Scanning, Azure DevOps) may flag or reject absolute file:// paths.

---

### N-04: CSV formatter hardcodes line number as `'1'` -- loses location fidelity

**File**: `claws-cli/src/format/csv.ts:31`
**Severity**: NIT

```typescript
'1', // line number placeholder -- violations don't carry line info yet
```

Every CSV row has `line=1` regardless of the actual violation location. The expected-violations fixture (`expected-violations.json`) does carry line numbers (e.g., line 37, 42, 47, 52), so the data exists in the pipeline. When violations gain line information in the IR, the CSV formatter will need updating.

---

## Summary

| Grade    | Count | IDs                          |
| -------- | ----- | ---------------------------- |
| MUST-FIX | 2     | M-01, M-02                   |
| WARNING  | 5     | W-01, W-02, W-03, W-04, W-05 |
| NIT      | 4     | N-01, N-02, N-03, N-04       |

**Verdict**: PASS with warnings. The core gateway model is sound -- risk-tiered fail modes, audit chain integrity, and plugin loading without eval/Function are all correctly implemented. The two must-fixes are about enforcement completeness: M-01 (no timeout on host calls) means the 50ms latency budget is aspirational rather than enforced, and M-02 (afterToolCall skipped on blocked tools) creates an audit gap that contradicts the stated contract. Both are fixable without architectural changes. The warnings are hardening items for production readiness; the nits are polish.
