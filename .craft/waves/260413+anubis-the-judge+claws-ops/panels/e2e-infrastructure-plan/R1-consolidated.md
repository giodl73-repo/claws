# R1 Consolidated Review: claws-e2e-infrastructure

**Panel**: claws:gateway-eng, craft:architect, claws:skill-author
**Date**: 2026-04-12
**Plan**: `.craft/plans/claws-e2e-infrastructure.md`
**Verdict**: Conditionally Approved — 3 Major findings require resolution before implementation

---

## Role 1: claws:gateway-eng

### GE-01 [MAJOR] — checkElicitation signature mismatch between GovernanceHost and generated code

The GovernanceHost interface (`claws-sdk/src/adapter/governance-host.ts:83`) declares `checkElicitation(toolName: string, principal: string): Promise<boolean>` — **2 parameters**. But the generated elicitation gate (`claws-sdk/src/emit/emit-plugin.ts:435`) emits `host.checkElicitation(toolName, principal, signal)` — **3 parameters**, passing an AbortSignal that the interface does not accept. The existing unit test (`emit-plugin.unit.test.ts:133`) explicitly asserts this 3-arg call, meaning the test validates the wrong signature.

If GatewaySim wires a MockGovernanceHost that implements the 2-arg interface, the generated code will silently pass a third argument that gets ignored. TypeScript strict mode may or may not catch this depending on how the mock is typed. The e2e loop will appear to work but the timeout enforcement on elicitation is untested.

**Resolution**: Either (a) update GovernanceHost to accept an optional AbortSignal as third parameter, or (b) update emit-plugin.ts to not pass signal to checkElicitation. Then fix the unit test. This must be resolved before Pulse 02 implements MockGovernanceHost.

### GE-02 [MAJOR] — Generated plugin uses `import('@openclaw/governance')` but this package does not exist in the monorepo

The generated plugin index.ts (emit-plugin.ts:262) contains `import('@openclaw/governance').GovernanceHost`. The handler files (e.g., `handlers/before-tool-call.ts:321`) contain `import type { GovernanceHost } from '@openclaw/governance'`. This is a phantom package — it does not exist in node_modules, package.json, or anywhere in the monorepo. The generated code is designed for the OC runtime (where `@openclaw/governance` would be provided by the gateway), but GatewaySim needs to load this generated code in a test environment.

Dynamic `import()` of the generated `index.ts` will fail at module resolution because `@openclaw/governance` cannot be resolved. The plan says "load via dynamic import()" but does not address how phantom imports are handled. The plugin-loader (Pulse 02) must either:
- Provide a module resolution shim/alias that maps `@openclaw/governance` to the real GovernanceHost type from `claws-sdk/src/adapter/`
- Strip the phantom import and inject the host via context (as the inline plugin already does via `ctx['__governanceHost']`)
- Use only the inline `index.ts` (which uses context injection, not imports) rather than the handler files

The plan needs to specify which approach GatewaySim uses. The inline plugin index.ts uses context injection (`ctx['__governanceHost']`), which is the loadable path. The separate handler files use explicit imports, which are not loadable. The plan conflates both.

**Resolution**: Clarify that GatewaySim loads the inline plugin (index.ts with context injection), not the separate handler files. The handler files are for real OC Gateway deployment, not test simulation. Update the plan and Pulse 02 deliverables accordingly.

### GE-03 [MINOR] — 6-facet contract is correct and complete

The 6-facet GovernanceHost contract (`evaluatePolicy`, `emitAuditEvent`, `getConfig`, `resolveToolRisk`, `checkElicitation`, `reportDiagnostic`) matches the authoritative interface in `claws-sdk/src/adapter/governance-host.ts`. The facet names in the plan match the code. The type-level assertion (`AssertSixFacets`) ensures no drift. No issues.

### GE-04 [MINOR] — Hook lifecycle only covers `before_tool_call`; 7 other hooks exist

The hook-registry (`claws-sdk/src/adapter/hook-registry.ts`) defines 7 governance concepts mapping to 8 OC event names: `before_tool_call`, `after_tool_call`, `before_elicitation`, `before_agent_handoff`, `on_audit`, `before_context_assembly`, `on_start`, `on_stop`. The plan's GatewaySim only wires `before_tool_call`. The generated plugin currently only registers `before_tool_call`, but the handler files include `beforeAgentHandoff` (A2A firewall) and `beforeElicitation` (elicitation gate).

For CP-1 this is acceptable — the inline plugin only uses `before_tool_call`. But the plan should note that CP-2+ GatewaySim will need to wire all 3 generated hooks (tool gate, A2A firewall, elicitation gate), not just the primary one. Currently the plan mentions elicitation as a result of `fireToolCall()` but that's actually a `before_elicitation` event, not part of `before_tool_call`.

**Resolution**: Add a note that elicitation testing via `fireToolCall('send-email')` tests the inline code path (which checks OBO tools inline), not the separate elicitation gate handler. If true elicitation gate testing is desired, GatewaySim needs to wire `before_elicitation` in CP-2.

### GE-05 [MINOR] — Fail-mode coverage is well-designed

The plan includes fail-mode testing (R2 fail-open, R4 fail-closed) with GovernanceHost throwing. This maps correctly to the generated `resolveFailMode` function (riskLevel <= 2 = open, >= 3 = closed). The e2e loop (Pulse 07) tests both paths. Good coverage.

---

## Role 2: craft:architect

### CA-01 [MAJOR] — Dynamic import() of generated TypeScript requires compilation; plan is underspecified

The plan states GatewaySim loads `index.ts` via dynamic `import()`. Node.js cannot dynamically import raw TypeScript files. The Pulse 02 deliverable mentions `plugin-loader.ts` with "(1) write generated source to a temp .ts file, (2) pre-compile to .js via tsc or use `tsx`, (3) dynamic import() the result."

This is the right direction but needs concrete design choices:
- **tsx**: Requires tsx installed globally (matches CLAUDE.md globals list). But tsx registers as an ESM loader — if vitest is already running with its own ESM transform, double-registration can cause module resolution conflicts.
- **tsc pre-compile**: Requires writing to temp dir, running tsc, then importing .js. Slower but reliable. But the generated code imports `@openclaw/governance` (see GE-02) which tsc can't resolve either.
- **vitest transform**: If e2e tests run under vitest, vitest's built-in TypeScript transform may handle the import. But this couples the simulator to the test runner.

The plan should commit to one approach and document it. The most robust path is: (a) generate the plugin as JavaScript (or use the inline form which has no external imports), (b) write to temp file, (c) dynamic import the JS file. This avoids both TypeScript compilation and phantom import issues.

**Resolution**: Specify the plugin-loader strategy in the plan. Recommended: use vitest's transform (since GatewaySim is always used in tests) and load the inline `index.ts` (which uses context injection, no phantom imports). Document this as a constraint.

### CA-02 [APPROVE] — Correct as a separate plan; does not belong in existing plans

This plan is correctly separated. It does not belong in `claws-test-framework` (which is Ptah, already Implemented, and focused on governance validation/security scanning — not runtime enforcement). It does not belong in `claws-acceptance-harness` (which validates compiler spec conformance via scenario replay, not runtime plugin loading). The e2e infrastructure is genuinely new: it bridges compile output to runtime enforcement. The "enables everything in Anubis" framing is accurate.

### CA-03 [APPROVE] — Package boundaries are correct

GatewaySim in `claws-test` is the right home. It's test infrastructure, not production code. The reference workspace in `claws-sdk/tests/fixtures/` is correct — it's an SDK fixture, not a test-package fixture, because the SDK owns the compile pipeline that consumes it. The separation between MockGateway (skill-kit, per-handler mocking) and GatewaySim (test, full-plugin loading) is clean and well-documented in the plan.

### CA-04 [MINOR] — Expected baselines will be fragile

The `expected-violations.json`, `expected-artifacts.json`, and `expected-enforcement.json` golden-master files will break whenever the compiler changes output format, adds a new violation code, or modifies artifact structure. The plan acknowledges this ("they are the assertion source-of-truth") but doesn't specify a maintenance strategy.

**Resolution**: Add a note that baseline files should be regenerated via a script (e.g., `npm run fixtures:update`) rather than hand-edited. This is a CP-2 concern but should be noted now.

### CA-05 [MINOR] — Pulse 07 depends on Pulses 03-06 but they are base-cli concerns

Pulse 07 (e2e compile loop) depends on Pulses 01-06, but Pulses 03-06 are base-cli formatters, error contract, progress, and config. The e2e test only needs the compile pipeline (Pulses 01-02), not CLI formatters. If Pulses 03-06 are delayed, the e2e loop is unnecessarily blocked.

**Resolution**: Consider making Pulse 07 depend only on Pulses 01-02 (reference workspace + gateway sim). The compile pipeline (claws-sdk) does not depend on CLI formatters (claws-cli).

---

## Role 3: claws:skill-author

### SA-01 [MINOR] — Reference workspace README must include a "how to use GatewaySim" quick start

The plan says the workspace includes a README explaining "what each file demonstrates." But skill authors need more than file descriptions — they need a 5-minute path from "I have a skill" to "I can test enforcement." The README should include:
1. How to point GatewaySim at their own workspace
2. How to create a minimal workspace (SOUL.md + TOOLS.md only)
3. How to add expected baselines for their own enforcement rules
4. A working code example (copy-paste-run)

The plan mentions a minimal workspace variant (SA-M03 from R1) which is good. But the README needs the quick-start examples.

**Resolution**: Add "quick-start code example" to the Pulse 01 README deliverable.

### SA-02 [MINOR] — ToolCallBuilder fluent API is a good DX decision

The `toolCall('send-email').withArgs({to: 'x'}).asUser('sarah').withTier(2)` API is exactly what skill authors need. Clean approval.

### SA-03 [MINOR] — Relationship between MockGateway and GatewaySim needs a decision tree

The plan explains that MockGateway is for individual skill testing and GatewaySim is for full plugin testing. But skill authors will ask "which one do I use?" The answer depends on their adoption tier:
- Tier 1 (standalone): MockGateway only
- Tier 2 (governed): MockGateway for unit tests, GatewaySim for integration
- Tier 3 (verified): Both, plus acceptance harness

This decision tree should be in the README or a linked concept guide.

**Resolution**: Add a "MockGateway vs GatewaySim" decision section to the reference workspace README or to `docs/claws/test/getting-started.md`.

---

## Findings Summary

| ID | Role | Severity | Title |
|----|------|----------|-------|
| GE-01 | gateway-eng | MAJOR | checkElicitation 2-arg vs 3-arg signature mismatch |
| GE-02 | gateway-eng | MAJOR | Generated code imports phantom `@openclaw/governance` package |
| CA-01 | architect | MAJOR | Dynamic import() of raw TS is underspecified; phantom imports |
| GE-04 | gateway-eng | MINOR | Only before_tool_call wired; 7 other hooks exist |
| CA-04 | architect | MINOR | Expected baselines fragile without regen script |
| CA-05 | architect | MINOR | Pulse 07 over-depends on CLI pulses 03-06 |
| SA-01 | skill-author | MINOR | README needs quick-start code example |
| SA-03 | skill-author | MINOR | Need MockGateway vs GatewaySim decision tree |

**3 Major findings** must be resolved before Pulse 02 implementation begins.
**5 Minor findings** are recommended improvements; can be addressed during implementation.
