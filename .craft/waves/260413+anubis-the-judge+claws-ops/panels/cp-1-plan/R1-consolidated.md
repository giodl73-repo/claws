---
round: 1
checkpoint: cp-1
scope: plan-review
date: 2026-04-12
reviewers:
  - craft:architect
  - claws:gateway-eng
  - claws:platform-eng
  - claws:skill-author
verdict: conditional-pass
total_findings: 48
deduped_findings: 24
consensus_findings: 2
major: 12
warning: 9
note: 3
---

# R1 Consolidated Review -- CP-1 Plan

## Panel

| Role               | Verdict          | Findings | Major | Warning | Note |
| ------------------ | ---------------- | -------- | ----- | ------- | ---- |
| craft:architect    | conditional-pass | 12       | 3     | 5       | 4    |
| claws:gateway-eng  | conditional-pass | 13       | 4     | 5       | 4    |
| claws:platform-eng | conditional-pass | 12       | 3     | 5       | 4    |
| claws:skill-author | conditional-pass | 12       | 3     | 5       | 4    |

All four reviewers issued conditional-pass with Major findings requiring resolution before implementation.

---

## Consensus Findings

These findings were flagged independently by multiple reviewers, confirming high confidence.

### CONSENSUS-01: Reference workspace fixture has no package home

**Flagged by**: craft:architect (M-02), claws:platform-eng (M-02)
**Pulse**: 01 (reference-workspace)
**Severity**: Major

The fixture at `fixtures/oc-reference-workspace/` has no owning package, no `tsconfig.json` coverage, and no build pipeline. Tests in `claws-sdk` reach outside their package boundary. No `fixtures/` directory exists at the repo root.

**Resolution**: Move fixture to `claws-sdk/tests/fixtures/oc-reference-workspace/`, consistent with existing claws-sdk fixture patterns. claws-cli formatter tests use inline fixture data, not cross-package references.

### CONSENSUS-02: Config/bypass/platform logic must live in SDK, not CLI

**Flagged by**: craft:architect (M-03), claws:platform-eng (M-03), claws:gateway-eng (GE-09)
**Pulse**: 06 (base-cli-config)
**Severity**: Major

Pulse 06 places config loading, Zod schema validation, platform detection, bypass detection, and fleet policy checking in `claws-cli/src/config/`. These are domain decisions and governance logic. The SDK-owns-logic rule (CLAUDE.md) is explicit. The existing codebase already follows the correct pattern: `claws-sdk/src/detect/` owns platform detection, CLI wraps it.

**Resolution**: Move all logic deliverables to `claws-sdk/src/config/` (loader, bypass, types with Zod schema). Platform detection stays in `claws-sdk/src/detect/`. CLI gets thin wrappers that call SDK functions.

---

## Unique Major Findings

### GE-01: GatewaySim plugin loading unspecified

**Source**: claws:gateway-eng
**Pulse**: 02 (gateway-simulator)
**Severity**: Major

Pulse 02 says GatewaySim "loads generated index.ts plugin (import or eval)" without specifying which. `eval` is a security risk and breaks module isolation. Dynamic `import()` requires a file on disk with a resolvable path. All downstream e2e tests depend on this.

**Resolution**: Mandate dynamic `import()` from a temp file path. Ban `eval`/`new Function`. Add explicit plugin loading contract to Pulse 02: write generated source to temp `.ts` file, pre-compile or use `tsx`, dynamic `import()` the result.

### GE-02: GatewaySim missing GovernanceHost 6-facet contract wiring

**Source**: claws:gateway-eng
**Pulse**: 02 (gateway-simulator)
**Severity**: Major

The existing `governance-host.ts` defines 6 facets: `evaluatePolicy`, `emitAuditEvent`, `getConfig`, `resolveToolRisk`, `checkElicitation`, `reportDiagnostic`. GatewaySim does not mention how GovernanceHost is wired. Without a mock GovernanceHost, the generated plugin's `before_tool_call` handler will return "governance host not configured."

**Resolution**: Add MockGovernanceHost deliverable to Pulse 02 that implements all 6 facets with configurable responses. Wire it into GatewaySim's context as `__governanceHost`.

### GE-03: E2E compile loop has zero fail-mode coverage

**Source**: claws:gateway-eng
**Pulse**: 07 (e2e-compile-loop)
**Severity**: Major

Pulse 07 fires R1 (allowed), R5 (blocked), R5 (blocked) -- all happy-path. Never tests GovernanceHost throwing or timing out. Generated plugin has `resolveFailMode` logic (fail-open for R1-R2, fail-closed for R5), but no e2e test proves it.

**Resolution**: Add fail-mode test cases to Pulse 07: (1) GovernanceHost throws on R2 tool call -> ALLOWED (fail-open), (2) GovernanceHost throws on R4 tool call -> BLOCKED (fail-closed).

### GE-04: Reference workspace has no audit-only tool

**Source**: claws:gateway-eng
**Pulse**: 01 (reference-workspace)
**Severity**: Major

CP-1 exit criteria say "audit chain written" but no tool in the fixture triggers audit-only (log-only, no block) behavior. The e2e tests cannot prove audit-chain correctness for non-blocking governance.

**Resolution**: Add an R2 tool (e.g., `file-read`) with audit tap to the reference workspace. Expected output should show an audit entry without a block.

### SA-M01: Reference workspace has no README for skill authors

**Source**: claws:skill-author
**Pulse**: 01 (reference-workspace)
**Severity**: Major

The fixture has 15+ files with no documentation explaining what each file demonstrates, what governance patterns it teaches, or why specific risk tiers were chosen. Built for machines (golden-master assertions), not humans (learning).

**Resolution**: Add `README.md` deliverable to Pulse 01 explaining what each file demonstrates, what governance pattern it covers, and what violations are intentionally embedded.

### SA-M02: Error contract requires docsUrl but no docs exist

**Source**: claws:skill-author
**Pulse**: 04 (base-cli-error-contract)
**Severity**: Major

DiagnosticError requires `docsUrl` but no deliverable creates the documentation those URLs point to. docsUrl pointing to a 404 is worse than no URL.

**Resolution**: Make docsUrl optional. Add `claws help {code}` inline fallback that resolves error code descriptions from the registry without requiring external docs. External docs can be added incrementally as they are written.

### SA-M03: E2E init loop only tests full 9-file workspace

**Source**: claws:skill-author
**Pulse**: 09 (e2e-init-loop)
**Severity**: Major

Pulse 09 copies the full reference workspace (9 OC files, 3 skills) and removes claws.json. Real skill authors start with just SOUL.md + TOOLS.md. The "day 1" experience is untested.

**Resolution**: Add a minimal-workspace e2e variant to Pulse 09 that tests init on a directory with only SOUL.md + TOOLS.md.

### AR-M01: GatewaySim duplicates MockGateway from claws-test

**Source**: craft:architect
**Pulse**: 02 (gateway-simulator)
**Severity**: Major

Pulse 02 creates `claws-sdk/src/testing/gateway-sim.ts` but `claws-test` already has `mock/mock-gateway.ts` with overlapping capabilities (registration, per-tool decisions, before_tool_call events).

**Resolution**: Move GatewaySim to `claws-test/src/gateway-sim.ts`. Document that GatewaySim EXTENDS MockGateway for full plugin loading: MockGateway is per-skill (handler-level mocking), GatewaySim is per-plugin (loads compiled index.ts, fires through full hook lifecycle).

### PE-M01: SARIF paths not normalized for Windows

**Source**: claws:platform-eng
**Pulse**: 03 (base-cli-formatters)
**Severity**: Major

SARIF `physicalLocation.artifactLocation.uri` must use forward-slash URI paths. On Windows, `path.resolve()` produces backslashes. Schema validation won't catch this -- backslash paths are valid JSON strings but break CI tool URI resolution.

**Resolution**: Add `toSarifUri(absolutePath, workspaceRoot)` normalizer deliverable to Pulse 03. Add test asserting no `uri` field in SARIF output contains a backslash.

---

## Additional Issue

### Pulse 09 depends on `claws init` which doesn't exist until CP-2

**Source**: claws:platform-eng (N-03)
**Pulse**: 09 (e2e-init-loop)
**Severity**: Notable (elevated for resolution)

Pulse 09 calls `claws init` but this command is delivered in CP-2 (Pulses 10-11). Pulse 09 is the CP-1 gate and cannot depend on undelivered CP-2 code.

**Resolution**: Clarify that Pulse 09 uses manual setup: copy reference workspace, manually create claws.json + .claws/ directory. The real `claws init` command is tested in CP-2 Pulse 18. Update pulse description to avoid "run claws init" language.

---

## Deduped Warning Summary

| ID   | Source(s)    | Pulse(s) | Finding                                       |
| ---- | ------------ | -------- | --------------------------------------------- |
| W-01 | Architect    | 03, 04   | Batch 2 false dependency on Pulse 02          |
| W-02 | Architect    | 07-09    | E2E tests in claws-sdk but test CLI commands  |
| W-03 | Architect    | 05       | Pulse 05 dependency direction inverted        |
| W-04 | Architect    | 02       | No subpath export for testing module          |
| W-05 | Architect    | 09       | L3 acceptance test with no L3 infrastructure  |
| W-06 | Platform-eng | 04       | FORCE_COLOR missing, dual color module        |
| W-07 | Platform-eng | 03,04,06 | Existing code at planned deliverable paths    |
| W-08 | Platform-eng | 07-09    | No temp dir cleanup strategy for e2e          |
| W-09 | Skill-author | 01       | Fixture skills lack adoption tier annotations |

---

## Verdict

**Conditional pass.** All four reviewers agree the plan structure is sound but require Major finding resolution before implementation begins.

**Must resolve (12 Major findings, 2 consensus)**:

1. **CONSENSUS-01**: Fixture location -> `claws-sdk/tests/fixtures/oc-reference-workspace/`
2. **CONSENSUS-02**: Config/bypass logic -> `claws-sdk/src/config/`, CLI thin wrappers only
3. **GE-01**: Mandate dynamic `import()` for plugin loading, ban eval
4. **GE-02**: Add MockGovernanceHost with 6-facet contract
5. **GE-03**: Add fail-mode test cases to E2E compile loop
6. **GE-04**: Add R2 audit-only tool to reference workspace
7. **SA-M01**: Add README.md to reference workspace fixture
8. **SA-M02**: Make docsUrl optional, add `claws help {code}` fallback
9. **SA-M03**: Add minimal-workspace e2e variant to Pulse 09
10. **AR-M01**: Move GatewaySim to `claws-test/src/gateway-sim.ts`
11. **PE-M01**: Add `toSarifUri()` normalizer to Pulse 03
12. **Pulse 09 init dependency**: Clarify manual setup, no claws init dependency

**Address during implementation (9 Warnings)**: W-01 through W-09 above.
