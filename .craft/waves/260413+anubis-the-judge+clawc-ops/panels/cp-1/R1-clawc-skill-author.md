---
reviewer: claws:skill-author
round: 1
checkpoint: cp-1
wave: anubis-the-judge
date: 2026-04-13
verdict: conditional-pass
findings: 12
major: 3
warning: 5
note: 4
---

# R1 Review: CP-1 Implementation -- claws:skill-author Lens

## Lens Statement

Evaluating CP-1 implementation code from the perspective of a skill author who publishes OC skills, has 3 skills on ClawHub, knows SKILL.md format cold, and evaluates every new tool by: "does this make my next skill faster to build, test, and publish?" Reviewing the actual shipped code in claws-sdk, claws-test, and claws-cli -- not the plan, but what was built.

---

## Findings

### M-01: `fromWorkspace()` is a stub that returns no-op hooks -- skill authors who call it get silent non-enforcement

**Files**: `claws-test/src/gateway-sim.ts:154-174`

`GatewaySim.fromWorkspace()` is the convenience constructor that skill authors will reach for first. It is the "5-minute adoption" entry point. But it is a stub: it returns a GatewaySim with empty hooks (`{}`), an empty risk map, and no governance host. Every `fireToolCall()` through this sim will return ALLOWED for R1-R2 tools (fail-open) and BLOCKED for everything else with reason `"governance host not configured"` -- not because of any governance rule, but because there is no plugin loaded.

A skill author who writes:
```ts
const sim = await GatewaySim.fromWorkspace('./my-skill');
const result = await sim.fireToolCall('send-email');
// result.blocked === true, reason: "governance host not configured"
```
will see BLOCKED and think their governance is working. It is not. The block comes from the stub's degraded-mode path, not from compiled governance rules. When the real compile pipeline is wired in, behavior will change silently. This is the worst kind of test: it passes now and breaks later, teaching the author the wrong mental model.

**Recommendation**: Either (a) throw an explicit `Error('GatewaySim.fromWorkspace() is not yet implemented -- use GatewaySim.fromPlugin() or GatewaySim.fromHooks() instead')` so authors know to use a real constructor, or (b) add a `stub: true` field to FireResult and print a console.warn on first fire. Option (a) is better -- fail loudly, not silently.

---

### M-02: ToolCallBuilder has no `.withRisk()` method -- risk tier must be set through context indirection

**Files**: `claws-test/src/tool-call-builder.ts`

The ToolCallBuilder fluent API has `.withArgs()`, `.asUser()`, `.withTier()`, and `.withContext()`. The `.withTier()` method sets `riskTier` in context. But GatewaySim's `fireToolCall()` resolves risk from its internal `_riskMap` (line 204), not from the call's context. So `.withTier()` on the builder has no effect on enforcement behavior -- it is metadata decoration, not enforcement input.

A skill author testing an R5 tool will write:
```ts
const call = toolCall('send-email').withTier(5).build();
await sim.fireToolCall(call.toolName, call.args, call.context);
```
and expect R5 enforcement. But the sim uses `DEFAULT_RISK_LEVEL = 5` for unknown tools, so they get R5 by accident. If they test an R2 tool:
```ts
const call = toolCall('file-read').withTier(2).build();
```
the sim still uses `DEFAULT_RISK_LEVEL = 5` because file-read is not in the riskMap. The `.withTier()` call is misleading -- it suggests the builder controls enforcement, but it does not.

**Recommendation**: Either (a) add a `.withRisk(level: number)` method that flows through to GatewaySim (e.g., by letting `fireToolCall` check context for a risk override before checking `_riskMap`), or (b) remove `.withTier()` and document that risk is controlled via `fromHooks(hooks, riskMap)`. Option (a) is more ergonomic for skill authors.

---

### M-03: Scenario parser silently drops scenarios with non-standard formatting

**Files**: `claws-test/src/scenario/parser.ts:56-64`

The parser matches `Given:`, `When:`, `Then:` with a case-insensitive regex against lines starting with an optional `-`. But it only captures single-line values. A skill author who writes a multi-line then-clause:
```markdown
### Send a bulk email
- Given: a list of 50 recipients
- When: user asks to send to all recipients
- Then: sends 50 emails
  and logs each one to audit
```
gets `then = "sends 50 emails"` and the second line is silently dropped. The vacuous-assertion warning in `runner.ts:173-181` only fires when *zero* expectations are parsed, not when expectations are *incomplete*.

More critically, the parser splits on `### ` (line 46) which means any scenario name containing a triple-hash in the body text will produce a phantom split. This is unlikely but possible in SKILL.md files that include code examples.

**Recommendation**: (a) Document in the parser JSDoc that only single-line Given/When/Then values are supported, and (b) add a warning in `parseScenarios()` when a scenario has non-empty lines between Given/When/Then that were not captured -- this catches the multi-line case without breaking the parser.

---

### W-01: Governance matchers operate on the wrong `this` -- `toBlock(sim)` requires passing sim as the value, not calling `expect(sim).toBlock()`

**Files**: `claws-test/src/matchers/index.ts:75-88` (type augmentation), `claws-test/src/matchers/gateway.ts`

The type augmentation declares `toBlock(toolName: string): void` on `Assertion<T>`, which means the TypeScript signature allows:
```ts
expect(sim).toBlock('send-email');
```
But the matcher functions are written as `toBlock(received: GatewaySim, toolName: string)` -- standard vitest custom matcher pattern where `received` is what you pass to `expect()`. This works correctly at runtime. However, there is no type constraint that `T` in `Assertion<T>` must be a `GatewaySim` for `toBlock` to be available. A skill author can write:
```ts
expect("a string").toBlock('send-email');
```
and TypeScript will not flag it -- the error only surfaces at runtime when `getAuditChain()` is called on a string.

This is a common vitest matcher typing gap, but for a test framework aimed at skill authors who are "comfortable with TypeScript but not required," the runtime error `TypeError: received.getAuditChain is not a function` is cryptic. Authors will blame their test setup, not the type system.

**Recommendation**: Add a runtime guard at the top of each gateway matcher:
```ts
if (!received || typeof received.getAuditChain !== 'function') {
  return { pass: false, message: () => 'Expected a GatewaySim instance, got: ' + typeof received };
}
```
This turns a cryptic TypeError into a clear diagnostic.

---

### W-02: `validateSubset()` silently ignores unknown check names

**Files**: `claws-test/src/governance/validator.ts:91-99`

A skill author who wants to run just the risk-level and elicitation checks writes:
```ts
const result = validateSubset(input, ['risk-level', 'elicitation']);
```
If they typo the check name -- `['risk-level', 'elictation']` -- `validateSubset` silently skips the unknown name and returns a result with only 1 check. The author sees `totalChecks: 1` and may not realize they misspelled. With 12 check names to remember, typos are common.

**Recommendation**: Return a warning or throw when a requested check name is not found in `CHECK_REGISTRY`. A warning in the result (e.g., `unknownChecks: ['elictation']`) is the minimum viable fix. A strict mode that throws is better for CI.

---

### W-03: Reference workspace skill files lack `## Scenarios` sections -- scenario parser will find nothing

**Files**: `claws-sdk/tests/fixtures/oc-reference-workspace/skills/web-lookup/SKILL.md`, `email-drafter/SKILL.md`, `summarize/SKILL.md`

The scenario parser (`claws-test/src/scenario/parser.ts`) looks for `## Scenarios` sections in SKILL.md files. The three reference workspace skills have no `## Scenarios` section. `parseScenarios()` returns an empty array, which means `runAllScenarios()` returns an empty result set, which always passes.

A skill author learning from the reference workspace will see that skills don't need scenarios. But scenarios are how `claws test` catches real bugs. The test fixture fixtures in `claws-test/tests/fixtures/` (clean-skill, tier3-skill, vulnerable-skill) *do* have scenarios -- but the reference workspace skills, which are the primary teaching tool per Pulse 01, do not.

**Recommendation**: Add `## Scenarios` sections to at least `email-drafter/SKILL.md` (the most complex skill) with 2-3 given/when/then scenarios that demonstrate governance enforcement. This makes the reference workspace self-contained as a learning resource.

---

### W-04: Error contract `docsUrl` fallback says `claws help {code}` but `claws help` command does not exist

**Files**: `claws-cli/src/errors/contract.ts:76-78`, `claws-cli/src/cli.ts`

The `DiagnosticError.toDiagnostic()` method falls back to `Run \`claws help ${this.code}\`` when no docsUrl is provided. This is the right pattern -- local help is more resilient than external URLs. But the CLI program (`cli.ts`) registers only four commands: `compile`, `check`, `build`, `init`. There is no `help` command. Running `claws help OC-POLICY-E010` will print the Commander.js help text (flags and commands), not the error code explanation.

This was flagged as M-02 in the plan review. The implementation addressed it with the fallback pattern but did not create the `help` subcommand. The skill author who follows the diagnostic's advice will hit a dead end.

**Recommendation**: Either (a) add a `claws help [code]` command that looks up `ERROR_CODES.get(code)` and prints the description + category + remediation, or (b) change the fallback to print the error description inline instead of referencing a nonexistent command. Option (b) is simpler: `${entry.description}. Category: ${entry.category}` directly in the diagnostic output, no command needed.

---

### W-05: `toEnforceWithin()` matcher uses absolute timing on CI -- flaky by design

**Files**: `claws-test/src/matchers/gateway.ts:112-132`

The timing matcher asserts that a hook completed within `maxMs`. In GatewaySim, hooks are mock functions that execute in microseconds. But the timing infrastructure uses `performance.now()` which includes scheduling jitter. On a loaded CI machine, even a 10ms budget can flake. A skill author writing:
```ts
expect(sim).toEnforceWithin('send-email', 5);
```
will see intermittent failures on CI that pass locally. This is the #1 source of test frustration for skill authors who adopt timing assertions early.

**Recommendation**: Either (a) document that `toEnforceWithin` is intended for development-time profiling, not CI assertions, and recommend `toEnforceWithin('send-email', 100)` as the minimum CI-safe budget, or (b) add a `timingTolerance` option to the matcher that applies a multiplier (e.g., 3x on CI, detected via `CI` env var). Option (a) is sufficient for CP-1.

---

### N-01: `claws` bare invocation is well-designed but does not mention `claws test`

**Files**: `claws-cli/src/cli.ts:117-155`

The bare invocation handler is skill-author-friendly: it detects whether a workspace exists and shows contextual next steps. For an uninitialized workspace, it suggests `claws init`. For an initialized workspace, it suggests `compile`, `check`, `build`. But it does not mention `claws test` -- which is the command skill authors will use most during development (per the role definition: "Does `claws test` catch real bugs?").

**Recommendation**: When `claws test` is implemented (CP-2+), add it to the workspace-detected bare invocation output. No action needed in CP-1, but note for future.

---

### N-02: MockGovernanceHost default allows everything -- skill authors may build tests against an overly permissive mock

**Files**: `claws-test/src/gateway-sim/mock-governance-host.ts:100-101`

When `MockGovernanceHost` is constructed without config, `evaluatePolicy()` returns `{ allowed: true, blockReason: null }` for all tools. This is the opposite of fail-closed. A skill author who writes:
```ts
const host = new MockGovernanceHost();
sim.setHost(host);
const result = await sim.fireToolCall('shell-exec');
// result.allowed === true -- because default is allow-all
```
may think their R5 tool passes governance. The mock is doing what mocks do (return a default), but the default teaches the wrong mental model for governance (deny-by-default).

**Recommendation**: Add a JSDoc comment on the `MockGovernanceHost` constructor explaining that the default is allow-all and that production gateways are deny-by-default. Suggest a `MockGovernanceHost.strict()` factory that defaults to `{ allowed: false, blockReason: 'no policy configured' }` for authors who want to test governance enforcement.

---

### N-03: CSV formatter hardcodes line number as `1` for every violation

**Files**: `claws-cli/src/format/csv.ts:31`

The CSV row uses `'1'` as a hardcoded line number placeholder. The comment says "violations don't carry line info yet." This is fine for the fleet reporting use case (platform engineers care about violation counts, not line numbers). But if a skill author pipes CSV output into a tool that supports line-number navigation (VS Code problem matcher, GitHub Actions annotations), every violation will point to line 1 of the file.

**Recommendation**: No action needed in CP-1. When violations gain source location data (likely in the compile pipeline enhancement), update this field. The comment already documents the gap.

---

### N-04: Security scanner only handles TypeScript -- skill handlers in Python or other languages are invisible

**Files**: `claws-test/src/security/scanner.ts:83-90`

The security scanner creates `ts.createSourceFile` for every input. Skill authors who write handlers in Python (a valid OC handler language) will get zero findings -- not because their code is secure, but because the scanner cannot parse it. The `ScanResult` will report `filesScanned: N, findings: []` which looks like a clean scan.

**Recommendation**: Add a pre-scan filter that checks file extensions and emits a warning finding (severity: `info`) for non-TypeScript files: `"Security scan does not support ${ext} files. Only TypeScript handlers are analyzed."` This prevents a clean-scan false negative.

---

## Summary

CP-1 implementation is solid infrastructure. The reference workspace with its README, before/after variant, and adoption tier mapping addresses every Major finding from the plan review. The error contract with its `claws help {code}` fallback is the right pattern. The bare invocation handler is well-designed. The GatewaySim, ToolCallBuilder, matchers, governance validator, and security scanner form a coherent test toolkit.

The three Major findings concern API surfaces that will mislead skill authors if left unaddressed: `fromWorkspace()` silently faking enforcement, `withTier()` having no effect on actual enforcement, and the scenario parser silently dropping multi-line then-clauses. Each creates a situation where a skill author writes code that appears to work but teaches an incorrect mental model.

The Warnings concern ergonomic gaps (no type guards on matchers, silent unknown-check-name handling, missing scenarios in reference skills, nonexistent `help` command, timing flakiness) that will cause friction but not incorrect behavior. The Notes are informational observations for CP-2+.

**Verdict**: Conditional pass. Address M-01 (fromWorkspace stub), M-02 (withTier/withRisk disconnect), and M-03 (scenario parser multi-line handling) before merging CP-1. Warnings can be addressed in CP-2 without blocking.
