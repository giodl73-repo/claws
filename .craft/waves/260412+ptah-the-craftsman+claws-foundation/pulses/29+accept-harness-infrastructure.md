---
pulse: 29
title: "Acceptance Harness Infrastructure"
plan: claws-acceptance-harness
checkpoint: 5
governing_roles: [claws:gateway-eng, craft:dragon, craft:testing]
depends_on: [26, 27]
---

# Pulse 29: Acceptance Harness Infrastructure

## Objective

Build the claws acceptance test harness — scenario loader, 5 runner implementations,
workspace fixture builder, and IR assertion helpers. Reuse the manifest-runner and
discover patterns from `compiler-sdk/tests/astro/helpers/` but with claws-specific
compilation pipeline (parse → extract → analyze → emit).

## Context

- 331 scenarios exist in `design/claws/scenarios/` across 30 series
- 5 runner types defined in `design/claws/scenarios/domain.yaml`: compile-sim, pinch-sim, emit-sim, fleet-sim, security-sim
- Astro pattern to replicate: `compiler-sdk/tests/astro/helpers/scenario-runner.ts`
- Manifest runner is generic: `compiler-sdk/tests/astro/helpers/manifest-runner.ts`
- Discover algorithm is generic: `compiler-sdk/tests/astro/helpers/discover.ts`

## Deliverables

### D1: Scenario Loader (`claws-sdk/tests/accept/utils/scenario-loader.ts`)
- Parse scenario.yaml files from `design/claws/scenarios/{series}/S##-{name}/`
- Validate with **Zod schema** against ScenarioYaml shape (name, series, version, specs, expect, simulate, problem, findings)
- Support all 5 expect block schemas (governance_ir, rules_applied, artifacts, workspaces, attack_class)
- Reuse discover algorithm from `compiler-sdk/tests/astro/helpers/discover.ts`
- **MUST override** marker to `scenario.yaml` (default is `20+program.yaml`) and basePath to `design/claws/scenarios/`

### D2: Manifest Runner Adapter (`claws-sdk/tests/accept/utils/manifest-runner.ts`)
- Adapt `compiler-sdk/tests/astro/helpers/manifest-runner.ts` for claws runner types
- Dispatch table: `compile-sim` → compileSimRunner, `pinch-sim` → pinchSimRunner, `emit-sim` → emitSimRunner, `fleet-sim` → fleetSimRunner, `security-sim` → securitySimRunner
- Read `design/claws/scenarios/manifest.yaml` (or local copy)
- Compatibility checking per runner type

### D3: Compile-Sim Runner (`claws-sdk/tests/accept/runners/compile-sim.ts`)
- Full pipeline (correct function names): `parse()` → `extractAllIntents()` → `buildGovernanceAST()` → `extract()` → `createRegistry()` + register rules → `registry.evaluate(manifest)` → `detectConflicts(ast, manifest)` → `emitPlugin()` + `emitSkill()` + `emitExecApprovals()` + `invertWorkflow()`
- Note: `parse()` is **async** (file I/O) — runner must await it
- Note: `analyze()` is the lightweight orchestrator shell — import from `compile/analyze.js`
- Assert `expect.governance_ir`: version, manifest.files_parsed, manifest.intent_types, analysis.rules_evaluated, analysis.violations, analysis.warnings
- Assert `expect.violations` and `expect.warnings` arrays
- Assert `expect.artifacts.count`
- **Copy** workspace from `{scenario}/00+workspace/` to a temp directory per test (filesystem isolation — parallel emit-sim tests must not corrupt shared fixtures)
- **Structured failure diagnostics**: on assertion failure, output must include scenario.yaml path, spec references from scenario, and expected-vs-actual diff

### D4: Pinch-Sim Runner (`claws-sdk/tests/accept/runners/pinch-sim.ts`)
- Parse + analyze only (no emit): `parse()` → `extractAllIntents()` → `buildGovernanceAST()` → `extract()` → `analyze()`
- Assert `expect.rules_applied` — which rules fired
- Assert `expect.violations` — specific violations with IDs
- Assert `expect.pass` — boolean overall pass/fail
- Assert `expect.severity` — highest severity level

### D5: Emit-Sim Runner (`claws-sdk/tests/accept/runners/emit-sim.ts`)
- Full pipeline + emit assertion: parse → analyze → emit
- Assert `expect.artifacts` — count, types, content patterns
- Assert `expect.plugin_hooks` — which hooks generated
- Assert `expect.skill_content` — SKILL.md governance frontmatter
- Assert `expect.approvals` — exec-approvals.json entries
- Verify zero `@craftworks/` or `@claws/` in generated output

### D6: Security-Sim Runner (`claws-sdk/tests/accept/runners/security-sim.ts`)
- Parse + analyze with security focus
- Assert `expect.attack_class` — which attack category
- Assert `expect.defense_layer` — which defense activated
- Assert `expect.blocked` — boolean, was the attack stopped
- Assert `expect.audit_event` — audit trail generated

### D7: Fleet-Sim Runner (stub) (`claws-sdk/tests/accept/runners/fleet-sim.ts`)
- Stub for Anubis wave — fleet operations not implemented in Ptah
- Assert `expect.workspaces` count
- Mark fleet-sim scenarios as `describe.skip()` with clear message
- Will be implemented in Anubis wave (fleet-operations plan)

### D8: Workspace Builder (`claws-sdk/tests/accept/utils/workspace-builder.ts`)
- **Copy** `00+workspace/` from scenario directory to a temp dir (via `mkdtempSync`)
- If `00+workspace/` doesn't exist, **skip the scenario** (return null — no generative materialization from `problem:` text)
- Read SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/, lobster.yaml
- Return temp workspace path ready for `parse()`
- Clean up temp dir after test (vitest `afterEach`)

### D9: IR Assertion Helpers (`claws-sdk/tests/accept/utils/expect-ir.ts`)
- `expectGovernanceIR(actual, expected)` — deep partial match on GovernanceIR
- `expectViolations(actual, expected)` — match violation IDs, severities, rule references
- `expectArtifacts(actual, expected)` — count and type validation
- `expectNoForbiddenImports(code)` — zero @craftworks/@claws in generated output

### D10: Config
- `claws-sdk/vitest.config.ts` — add `accept` as a **4th project** alongside unit/integration/e2e, targeting `tests/accept/**/*.accept.test.ts`
- Accept tests run in the default `vitest run` suite (not excluded — part of CI)
- Wire `npm run test:accept` as a convenience shortcut for `vitest run --project accept`
- Update `.github/workflows/` to include claws-sdk accept tests in the CI matrix (same pattern as craft-cli acceptance tests)
- No barrel `index.ts` — test internals don't need a public surface

## Test Plan

### Infrastructure Tests (self-testing the harness)
- [x] Scenario loader discovers 331 scenarios across 30 series
- [x] Manifest runner dispatches to correct runner type
- [x] Workspace builder loads minimal fixture (SOUL.md + TOOLS.md)
- [x] IR assertion helpers correctly validate/reject GovernanceIR
- [x] Fleet-sim runner skips with clear message

### Smoke Tests (prove pipeline works)
- [ ] compile-sim: S01-minimal-workspace produces valid GovernanceIR — blocked on P30 (fixture materialization, 00+workspace/ dirs)
- [ ] pinch-sim: S01-g-class-risk-scoring classifies R1 and R5 correctly — blocked on P30
- [ ] emit-sim: S01 produces gateway plugin with no forbidden imports — blocked on P30
- [ ] security-sim: S01 blocks known attack pattern — blocked on P30
- [ ] security-sim **negative self-test**: runner rejects when blocked=false but expect.blocked=true — blocked on P30

## Verification Gate

```bash
cd claws-sdk && vitest run --project accept
cd claws-sdk && tsc --noEmit
npm run build
```

## HC-BLOCK Findings

- Scenarios without `00+workspace/` directories must be auto-skipped, not failed
- Scenarios with runner types not implemented must use `describe.skip()`
- IR assertion must handle `undefined` vs `[]` for violations/warnings
