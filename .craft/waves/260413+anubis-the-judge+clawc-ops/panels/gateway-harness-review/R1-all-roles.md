# R1 Gateway Harness Review -- All 8 Claws Roles

**Scope**: Plan `claws-gateway-harness`, Pulse 01 (reference-workspace), Pulse 02 (gateway-simulator)
**Date**: 2026-04-13
**Round**: 1

---

## 1. Founder

**Lens**: Community trust, ecosystem identity, vendor lock-in risk

### F-01 [M] Reference workspace README must teach governance patterns, not claws patterns

The Pulse 01 README deliverable says "skill-author-oriented walkthrough" but the fixture lives inside `claws-sdk/tests/fixtures/`. A community contributor who opens the reference workspace should understand what governance rules are expressed and WHY -- not how claws's internals work. The README should be written as if it could be copy-pasted into any OC workspace. If the README references `claws-sdk` internals, `GovernanceIR`, or Craftworks concepts, a contributor will see it as vendor documentation, not community documentation.

**Fix**: Pulse 01 deliverable for `README.md` should specify: "Written from the OC workspace owner's perspective. No references to claws-sdk internals, Craftworks, or compiler pipeline. Governance patterns explained in terms of OC-native concepts (SOUL constraints, tool risk tiers, skill decorators)."

### F-02 [W] GatewaySim.fromWorkspace() must not require @bic/claws-test as a production dependency

The plan shows `import { GatewaySim } from '@bic/claws-test'` for skill author self-validation. If a skill author needs `@bic/claws-test` in their workspace to validate governance, that's a dev dependency -- fine. But the plan's "Use Cases Beyond Testing" section frames it as an operational tool (`claws test --sim`). Clarify that `@bic/claws-test` is always a devDependency and the CLI command is the production-facing surface.

**Fix**: Add a note to Pulse 02 deliverables: "GatewaySim is a test-time tool only. The `claws test --sim` CLI command wraps it. Skill authors install `@bic/claws-test` as a devDependency, never a production dependency. The `fromWorkspace()` convenience must not pull compile-time dependencies into the skill's runtime bundle."

### F-03 [W] before-claws/ variant should be usable as a standalone "why governance?" teaching tool

The before-claws/ directory is framed as a test fixture, but it is also the most powerful community advocacy asset claws has. Same 12 tools, zero governance, zero violations -- that is the "this is what you're running today" story. The README should be community-facing and self-contained.

**Fix**: Pulse 01 `before-claws/README.md` deliverable should specify: "Standalone document that works without the parent workspace. Explains what 'zero governance' means in practice: any tool runs without audit, any agent delegates without restriction, any skill executes without elicitation. Links to the 'after' workspace as the comparison."

---

## 2. CISO

**Lens**: Security assurance, audit survivability, fail-closed guarantees, legal discovery

### CI-01 [M] No test for fail-closed behavior when GovernanceHost is absent or crashes

The plan specifies MockGovernanceHost with configurable responses, but there is no test or deliverable for the DEGRADED case: what happens when the GovernanceHost is not configured, throws an exception mid-evaluation, or returns malformed data? The plan mentions `{allowed: false, blockReason: 'governance host not configured'}` in passing, but this is the single most important security property. R5 tools MUST be blocked when governance is degraded. This needs explicit test coverage, not a comment in a deliverable description.

**Fix**: Add to Pulse 02 L0 tests: "3 degraded-mode tests: (1) GovernanceHost missing -- R5 tool blocked, R1 tool allowed (fail-open for R1-R2); (2) GovernanceHost throws mid-evaluation -- R5 tool blocked; (3) GovernanceHost returns malformed response -- R5 tool blocked." Add to L1 tests: "1 degraded-mode integration test with real compiled plugin: remove MockGovernanceHost, fire R5 tool, assert blocked." Adjust test counts: L0 from 12 to 15, L1 from 3 to 4.

### CI-02 [M] Audit chain integrity is not verified

SimReport captures audit entries, but there is no verification that the audit chain is tamper-evident. The plan mentions `getAuditChain()` and `toHaveAuditEntries(count)` but never checks HMAC signatures, sequential ordering, or chain continuity. An auditor needs to know: are these entries in the order they were generated? Has anything been inserted or removed?

**Fix**: Add to Pulse 02 deliverables: "SimReport audit chain validation: `toHaveValidAuditChain()` matcher that verifies sequential entry IDs, monotonic timestamps, and (when signed) valid HMAC chain. MockGovernanceHost's `emitAuditEvent` must generate entries with sequential IDs and timestamps." Add 1 L0 test for chain ordering validation.

### CI-03 [W] No SIEM-format export in SimReport.toJSON()

The CISO's top question: "Can I export governance events to our SIEM?" SimReport has `toJSON()` for CI, but it should also support CEF (Common Event Format) or at minimum include fields that map to SIEM schemas: severity, source, action, outcome, timestamp, actor. If the test harness produces JSON that doesn't map to SIEM fields, the production output won't either.

**Fix**: Add to Pulse 02 `report.ts` deliverable: "SimReport.toJSON() output must include SIEM-mappable fields per entry: `{ timestamp, severity, source, action, outcome, actor, toolName, ruleId }`. Document the field mapping to CEF in a code comment."

---

## 3. Compliance

**Lens**: Evidence completeness, auditor acceptance, tamper-evident artifacts

### CO-01 [M] expected-violations.json lacks policy version and timestamp metadata

The compliance role needs every governance check to record: what was checked, when, by what policy version, with what result. The `expected-violations.json` golden master lists violation codes with file + line references, but no policy version, no timestamp of generation, and no schema version. An auditor receiving this artifact cannot determine which policy set produced these violations.

**Fix**: Pulse 01 `expected-violations.json` deliverable should specify: "Each violation entry includes `{ code, file, line, message, policyVersion, ruleId, severity }`. File-level metadata includes `{ generatedAt, clawsVersion, policySetHash, schemaVersion }`. This establishes the golden master format that `claws check` output must match."

### CO-02 [W] No compliance artifact generation test in the harness

The plan covers enforcement testing (block/allow/elicit) but not compliance evidence testing. `claws comply soc2` generates artifacts from the same governance rules that GatewaySim tests. If the harness doesn't test that compliance artifacts are generated correctly from the reference workspace, there's a gap between "enforcement works" and "we can prove enforcement works."

**Fix**: Add to plan scope (future pulse or scope note): "E2E loop: compile reference workspace, generate compliance artifact (`claws comply --format json`), verify artifact references the same rules that GatewaySim enforces. This is the 'prove it to the auditor' loop."

---

## 4. Gateway-Eng

**Lens**: Runtime performance, Gateway stability, generated code quality

### GE-01 [M] 50ms timing assertion in L1 is a test, not an enforcement mechanism

Pulse 02 specifies `toEnforceWithin('send-email', 50)` and an L1 test for "timing under 50ms per hook." This tests that the mock harness is fast -- not that the generated plugin is fast. The mock doesn't hit real I/O, real policy evaluation, or real audit persistence. A plugin that passes `toEnforceWithin(50)` in GatewaySim could easily blow the 50ms budget in a real Gateway.

**Fix**: Add a note to Pulse 02 timing deliverable: "GatewaySim timing is a baseline sanity check, not a production performance guarantee. The timing capture infrastructure (`performance.now()` wrapping) must be reusable by real Gateway integration tests. Add a `SimReport.timingBaseline()` method that returns per-hook p50/p95/p99 from accumulated calls, usable as a regression baseline for future real-Gateway tests."

### GE-02 [M] No test for hook error propagation behavior

The plan mentions `on_error` hooks are registered, but there is no test for what happens when `before_tool_call` throws. Does GatewaySim propagate the error? Swallow it? Log it? The Gateway-eng needs to know the EXACT fail mode: R1-R2 fail-open, R3-R4 configurable, R5 fail-closed. The mock must replicate this behavior, or it's testing a different runtime than production.

**Fix**: Add to Pulse 02 L0 tests: "3 error-propagation tests: (1) before_tool_call throws on R1 tool -- tool allowed (fail-open); (2) before_tool_call throws on R5 tool -- tool blocked (fail-closed); (3) after_tool_call throws -- audit entry still written (best-effort audit)." These map directly to the gateway-eng lens verify item on fail-mode policy.

### GE-03 [W] Plugin loader should validate generated code structure before execution

The plugin-loader.ts deliverable says "dynamic import() only, no eval." Good. But it should also validate that the loaded module exports the expected hook interface before wiring it into GatewaySim. A generated plugin that exports nothing (empty compile) or exports the wrong shape should produce a clear diagnostic, not a runtime TypeError deep in the hook lifecycle.

**Fix**: Add to Pulse 02 `plugin-loader.ts` deliverable: "After dynamic import, validate the module exports: `beforeToolCall`, `afterToolCall`, `onError` must be functions (or absent). If the module exports nothing or has wrong types, throw `PluginLoadError` with the module path, expected exports, and actual exports."

---

## 5. Skill Author

**Lens**: Developer productivity, adoption speed, generated code readability

### SA-01 [M] fromWorkspace() example hides the compile step -- skill authors need visibility

The plan shows `GatewaySim.fromWorkspace('./my-oc-workspace')` as a one-liner. For a skill author debugging why their governance isn't working, the black-box compile step is the problem. They need to see: what did claws detect? What rules were generated? What was the compile output? The convenience method is great for CI, but the skill author workflow needs a verbose mode.

**Fix**: Add to Pulse 02 GatewaySim deliverable: "fromWorkspace() accepts an optional `{ verbose: boolean }` option. When verbose, it logs: (1) detected OC files, (2) parsed governance rules with risk tiers, (3) generated plugin file path, (4) loaded hook names. This is the skill author's debugger -- they need to see the pipeline, not just the result."

### SA-02 [W] Reference workspace skills lack governance annotation examples at different tiers

Pulse 01 has 3 skills: summarize (R3), email-drafter (R5), web-lookup (R1). These cover three risk tiers, but the plan doesn't specify what governance annotations they use. A skill author reading the fixture needs to see: "this is what a 3-line YAML governance annotation looks like for R1, R3, R5." The fixture is the de facto tutorial.

**Fix**: Pulse 01 SKILL.md deliverables should specify: "Each skill includes a governance section in its SKILL.md showing the minimum annotation for its risk tier. web-lookup (R1): `governance: { audit: true }`. summarize (R3): `governance: { audit: true, approval: manager }`. email-drafter (R5): `governance: { audit: true, approval: exec, elicit: true }`. These are the Tier 1 adoption examples."

### SA-03 [N] No ClawHub badge reference in reference workspace

The skill-author lens asks: "Will ClawHub governance badges actually help my skill get more installs?" The reference workspace is the place to show what a governed skill looks like on ClawHub. Even a comment in the SKILL.md files showing `# ClawHub badge: governance-verified` would connect the dots.

**Fix**: Add a comment in each reference workspace SKILL.md: "When published to ClawHub with `claws publish`, this skill earns the governance-verified badge at tier [R1/R3/R5]." Low effort, high signal for skill authors evaluating adoption.

---

## 6. New Hire

**Lens**: First-5-minutes experience, progressive disclosure, actionable error messages

### NH-01 [M] Reference workspace has no "getting started" path for someone who has never seen governance

The README is described as "skill-author-oriented walkthrough." A new hire who is told "set up governance for your agent" doesn't know what a risk tier is, what SOUL deny constraints do, or why 12 tools need different governance levels. The reference workspace is the first thing they'll be pointed to. It needs a "Start Here" section that assumes zero governance knowledge.

**Fix**: Pulse 01 README.md deliverable should specify: "Includes a 'Start Here' section (first 20 lines) that answers: What is governance? Why do these tools need it? What does claws do to this workspace? Uses concrete examples, not abstract concepts. Written for someone who has used OC for 2 months but has never heard of governance."

### NH-02 [W] expected-violations.json is opaque without an explanation of what each violation means

A new hire looking at `expected-violations.json` will see violation codes like `SOUL-DENY-CONFLICT` and have no idea what to do. The fixture is a test artifact, but it's also a learning tool. Each violation should include a human-readable `message` field AND a `howToFix` field.

**Fix**: Pulse 01 `expected-violations.json` format should include per-violation: `{ code, file, line, message, howToFix }`. Example: `{ code: "SOUL-DENY-CONFLICT", file: "TOOLS.md", line: 15, message: "Tool 'send-email' conflicts with SOUL deny constraint 'never send without approval'", howToFix: "Add 'approval: exec' to the tool's governance section or remove the deny constraint" }`. This is error-messages-as-tutorials.

### NH-03 [N] No mention of what commands to run against the reference workspace

The reference workspace exists as a fixture, but a new hire will want to know: "What do I DO with this?" There should be a section showing: `claws check .` (see violations), `claws build .` (generate plugin), `claws test --sim` (see enforcement). Three commands, progressive complexity.

**Fix**: Pulse 01 README.md deliverable should include: "Try It section: 3 commands to run against this workspace, with expected output summaries. `claws check .` -> shows 7 violations. `claws build .` -> generates gateway plugin. `claws test --sim` -> shows before/after enforcement."

---

## 7. Power User

**Lens**: Operational control, upgrade regression, script replacement

### PU-01 [M] SimReport.diff() needs a machine-readable exit code for CI scripting

The plan shows `SimReport.diff(before, after)` returning a `SimDiff` object with regressions/improvements/unchanged. But a power user running this in their upgrade script needs an exit code: 0 = no regressions, 1 = regressions found, 2 = error. The `--assert-no-regressions` flag in `claws test` implies this, but the underlying `SimReport.diff()` must expose a `hasRegressions(): boolean` method and the SimDiff type must include a severity classification (regression = R4+ tool went blocked-to-allowed vs. R1 tool changed audit format).

**Fix**: Add to Pulse 02 `report.ts` deliverable: "SimDiff includes `hasRegressions(): boolean` (true if any R4+ tool went from blocked/gated to allowed) and `severity(): 'critical' | 'warning' | 'clean'`. Critical = R5 regression. Warning = R3-R4 regression. Clean = no regressions. This feeds the exit code in `claws test --sim --assert-no-regressions`."

### PU-02 [W] No snapshot format specified for upgrade regression detection

The plan shows `GatewaySim.fromSnapshot('.claws/snapshots/v0.36')` but doesn't specify what a snapshot contains or how it's created. A power user needs to know: does `claws build` auto-create a snapshot? Is it a copy of the compiled plugin? Does it include the SimReport? Without a snapshot spec, the upgrade regression feature is vapor.

**Fix**: Add to plan scope or a future pulse deliverable: "Snapshot format specification: `.claws/snapshots/{version}/` contains `plugin.ts` (compiled output), `report.json` (SimReport.toJSON() at compile time), `meta.json` (claws version, policy hash, timestamp). `claws build --snapshot` creates one. `GatewaySim.fromSnapshot()` loads plugin.ts and reconstructs SimReport from report.json."

### PU-03 [N] reset() should support partial reset for multi-scenario scripts

The plan says `reset()` clears "accumulated audit entries and mock GovernanceHost configuration." A power user running a sequence of scenarios in a single script wants to reset audit entries between scenarios WITHOUT resetting the GovernanceHost configuration (which they set up once at the top). Offer `reset({ auditOnly: true })`.

**Fix**: Add to Pulse 02 GatewaySim deliverable: "`reset()` accepts optional `{ auditOnly?: boolean }`. Default resets everything. `auditOnly: true` clears audit entries and timing but preserves MockGovernanceHost configuration."

---

## 8. Platform-Eng

**Lens**: Fleet consistency, CI/CD reliability, multi-workspace operations

### PE-01 [M] No fleet-scale testing scenario in the harness

The plan tests a single workspace. A platform-eng managing 47 workspaces needs to know: can GatewaySim run against multiple workspaces in parallel and produce a combined report? `claws drift` compares workspace governance against fleet policy. The harness should have at least one test that loads two workspaces (reference + before-claws) and produces a diff. This is the minimal fleet test.

**Fix**: Add to plan deliverables (E2E loops, Pulses 07-09): "Fleet-scale test: load reference workspace and before-claws workspace in parallel GatewaySim instances, produce SimReport for each, diff the two. This is the `claws drift` foundation -- proving that two workspaces with different governance produce different enforcement reports."

### PE-02 [W] SimReport.toJSON() should include workspace identity for fleet aggregation

When a platform-eng collects SimReports from 47 workspaces, each report needs to identify which workspace it came from. The current SimReport has per-tool enforcement data but no workspace identifier, no workspace path, no policy version. Fleet aggregation requires: `{ workspaceId, workspacePath, policyVersion, ...enforcementData }`.

**Fix**: Add to Pulse 02 `report.ts` deliverable: "SimReport includes workspace metadata: `{ workspacePath, workspaceId (hash of openclaw.json + claws.json), policyVersion, clawsVersion }`. Set from `fromWorkspace()` path or `fromSnapshot()` meta. This enables fleet-level report aggregation without external join logic."

### PE-03 [W] No CI/CD integration example in the plan

The plan mentions `claws build && claws test --sim --assert-no-regressions` as a CI pre-submit gate, but there's no GitHub Actions workflow example, no mention of `@bic/claws-action`, and no specification of what the CI output looks like (annotations, status checks, PR comments). A platform-eng needs to see the CI integration path.

**Fix**: Add to plan scope (future deliverable or scope note): "CI integration specification: what `claws test --sim` outputs in CI mode (GitHub Actions annotations, JSON summary for status checks, exit codes). Reference to `@bic/claws-action` integration point. This is out of scope for Pulses 01-02 but must be specified before E2E loops (Pulses 07-09)."

---

## Summary

| Role | Findings | Severities |
|------|----------|------------|
| Founder | 3 | M, W, W |
| CISO | 3 | M, M, W |
| Compliance | 2 | M, W |
| Gateway-Eng | 3 | M, M, W |
| Skill Author | 3 | M, W, N |
| New Hire | 3 | M, W, N |
| Power User | 3 | M, W, N |
| Platform-Eng | 3 | M, W, W |

**Total**: 23 findings (8M, 8W, 4N, 3W)

**Top 3 cross-cutting themes**:

1. **Degraded-mode / fail-closed testing is absent** (CI-01, GE-02): The single most important security property -- R5 fail-closed when governance is broken -- has zero explicit test coverage. This is the finding that should block implementation if unaddressed.

2. **Fixture is a test artifact but also the primary teaching tool** (F-01, NH-01, SA-02): The reference workspace will be the first thing new developers, skill authors, and community contributors see. It must work as both a test fixture AND a standalone learning resource. Currently written as an internal test fixture only.

3. **Fleet and CI are mentioned but not specified** (PE-01, PE-02, PE-03, PU-02): The plan references fleet operations, CI gates, and upgrade snapshots in "Use Cases" but none of these have deliverables, formats, or test coverage. The harness proves single-workspace enforcement but provides no foundation for fleet-scale operations.
