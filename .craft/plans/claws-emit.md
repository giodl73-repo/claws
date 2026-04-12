---
slug: claws-emit
preset: "claws"
plan: "2 headlines: claws build produces a working OC Gateway plugin, generated code passes OC developer test"
area: claws
status: Draft
phase: ptah
atoms: [atom:governance-plugin, atom:governance-skill, atom:three-engine-model, atom:workflow-inversion]
specs: [CL-04, CL-03, CL-02]
---

# claws-emit — Emit Gateway Plugin + SKILL.md

## Headlines

1. **H1: `claws build` produces a working OC Gateway plugin from compiled GovernanceIR** — The emit phase takes an optimized GovernanceIR and generates 4 artifacts: (1) a governance SKILL.md with PRESS-compressed advisory prompt (L1), (2) a Gateway plugin TypeScript module that registers `before_tool_call` + lifecycle hooks for enforcement (L2+L3), (3) an `exec-approvals.json` bridge for host-level backup (L4), and (4) a `lobster.compiled.yaml` with governance steps injected into the workflow DAG. The generated plugin uses the GovernanceHost 6-facet interface and follows OC plugin conventions.
   - Validation: `emit()` on a minimal GovernanceIR produces all 4 artifact files on disk
   - Validation: The generated `plugins/claws-governance/index.ts` type-checks with `tsc --noEmit` against OC plugin types
   - Validation: The generated `exec-approvals.json` contains entries for every R5 tool in the manifest

2. **H2: Generated code passes the OC developer test — zero @craftworks/ imports** — Every line of generated TypeScript looks like something an OC developer would write themselves. Generated code imports from `@openclaw/*` only. No `@craftworks/*`, no `@claws/*` (skill-kit is for authoring, not generated output), no internal SDK references. The OC adapter layer translates GovernanceIR concepts into OC-native hook registrations, config formats, and file paths.
   - Validation: `grep -r '@craftworks' plugins/claws-governance/` returns zero matches
   - Validation: `grep -r '@claws' plugins/claws-governance/` returns zero matches
   - Validation: Generated plugin follows `OpenClawPluginDefinition` interface exactly

3. **H3: Workflow inversion rewrites lobster.yaml with governance steps** — The compiler reads `lobster.yaml`, identifies governance-sensitive steps (R3+ tools, OBO actions, A2A delegation, sensitive data), and emits `lobster.compiled.yaml` with governance steps injected before and after sensitive operations. An R5/OBO `send-email` step gets a `claws-elicit-send-email` gate injected before it and a `claws-audit-send-email` step after it.
   - Validation: A lobster.yaml with a `send-email` R5 step produces `lobster.compiled.yaml` with elicit + audit steps injected
   - Validation: Original step ordering is preserved — governance steps are inserted, not reordered
   - Validation: Steps using R1-R2 tools get no injected governance steps

## Summary

The emit phase builds on compiler-sdk's existing emit infrastructure (`compiler-sdk/src/astro/emit/`) to add 4 new governance-specific emitters. The emit framework, platform target registry, and OperationIR TypeScript emitter patterns already exist in compiler-sdk. This plan adds new emitters that target OC governance artifacts: a Gateway plugin TypeScript module (L2+L3), an advisory SKILL.md (L1), an exec-approvals.json bridge (L4), and a lobster.compiled.yaml for governed workflows. The OC adapter layer translates GovernanceIR concepts into OC-native hook registrations, config formats, and file paths. This is CL-04 Phase 5 (EMIT) with the adapter layer from ARCHITECTURE.md priority items 7-10.

## Coverage Contract

### Specs
- [ ] CL-04 — Phase 5 EMIT: 4 artifacts, code templates, workflow inversion
- [ ] CL-03 — GovernanceHost 6-facet interface, plugin hook registration, fail-mode in generated code
- [ ] CL-02 — R5 fail-closed in generated `before_tool_call` handler, OBO gate generation

### Concept Guides
- [ ] docs/claws/compiler/emit.md — NEW: how GovernanceIR becomes 4 artifacts
- [ ] docs/claws/runtime/plugin.md — NEW: generated Gateway plugin structure and hook lifecycle

### Scenario Coverage
- [ ] emit/minimal-plugin — emit from minimal GovernanceIR (2 tools, no agents)
- [ ] emit/full-plugin — emit from SOC2 workspace (diverse tools, agents, workflows)
- [ ] emit/r5-fail-closed-handler — generated handler denies R5 on error
- [ ] emit/workflow-inversion — lobster.yaml → lobster.compiled.yaml with governance steps
- [ ] emit/exec-approvals-bridge — exec-approvals.json generated for R5 tools
- [ ] emit/skill-md-advisory — SKILL.md generated with governance instructions
- [ ] emit/no-craftworks-imports — generated code has zero @craftworks/ references

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 18 | Per-emitter (4), template rendering (6), adapter mapping (4), hook registry (2), workflow inversion (2) |
| L1 integration | 6 | Full emit pipeline per artifact, cross-artifact consistency |
| L2 e2e | 3 | Complete `emit()` on 3 fixture GovernanceIRs, type-check generated output |
| L3 acceptance | 0 | No CLI acceptance yet (Phase 1 foundation) |

## Scope

### Imported from compiler-sdk (NOT written here)
- `compiler-sdk/src/astro/emit/` — Emit framework, platform target registry, emitter base classes
- `compiler-sdk/src/astro/emit/platforms/` — Existing platform emitters (pattern reference for OC emitters)
- `compiler-sdk/src/astro/ir/operation/` — OperationIR TypeScript emitter patterns (OP9-ts-emit, pattern for plugin-handler emission)
- `compiler-sdk/src/astro/ir/press/` — PRESS compression modules (reused for SKILL.md token compression)

### New in claws-sdk (governance-specific emitters and adapter layer)
- `claws-sdk/src/emit/emit-plugin.ts` (NEW) — Generate Gateway plugin TypeScript: hook registrations, policy evaluation, fail-mode handlers. Uses compiler-sdk emit patterns.
- `claws-sdk/src/emit/emit-skill.ts` (NEW) — Generate governance SKILL.md: advisory prompt, uses PRESS compression from compiler-sdk (basic profile for Phase 1)
- `claws-sdk/src/emit/emit-exec-approvals.ts` (NEW) — Generate exec-approvals.json: R5 tool entries with approval requirements
- `claws-sdk/src/emit/emit-workflow.ts` (NEW) — Workflow inversion: read parsed lobster.yaml DAG from GovernanceAST, inject governance steps, emit lobster.compiled.yaml
- `claws-sdk/src/emit/templates/plugin-handler.ts.tmpl` (NEW) — Template for main plugin handler with try/catch fail-mode
- `claws-sdk/src/emit/templates/before-tool-call.ts.tmpl` (NEW) — Template for before_tool_call hook with R5 deny-on-error and AbortSignal.timeout(hookTimeoutMs)
- `claws-sdk/src/emit/templates/a2a-firewall.ts.tmpl` (NEW) — Template for A2A boundary enforcement
- `claws-sdk/src/emit/templates/elicitation-gate.ts.tmpl` (NEW) — Template for OBO elicitation gate
- `claws-sdk/src/adapter/oc-data-adapter.ts` (NEW) — DataFrame inversion: translate GovernanceIR data structures to OC config/memory formats. Uses compiler-sdk DataFrame patterns.
- `claws-sdk/src/adapter/governance-host.ts` (NEW) — GovernanceHost 6-facet interface definition (the contract between compiled governance and OC runtime)
- `claws-sdk/src/adapter/hook-registry.ts` (NEW) — OC hook name mapping: GovernanceIR concepts → OC `api.on()` event names

## Deliverables

### Specs & Design
- [ ] CL-04 amendment — Phase 5 EMIT finalized with artifact schemas and template inventory
- [ ] CL-03 amendment — GovernanceHost interface finalized with TypeScript definition

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/emit/emit-plugin.ts — Gateway plugin generation with all hook registrations
- [ ] claws-sdk/src/emit/emit-skill.ts — SKILL.md generation with governance advisory prompt
- [ ] claws-sdk/src/emit/emit-exec-approvals.ts — exec-approvals.json with R5 tool entries
- [ ] claws-sdk/src/emit/emit-workflow.ts — lobster.yaml DAG rewriting with governance step injection
- [ ] claws-sdk/src/emit/templates/plugin-handler.ts.tmpl — main handler template
- [ ] claws-sdk/src/emit/templates/before-tool-call.ts.tmpl — tool-call hook template
- [ ] claws-sdk/src/emit/templates/a2a-firewall.ts.tmpl — A2A enforcement template
- [ ] claws-sdk/src/emit/templates/elicitation-gate.ts.tmpl — OBO gate template
- [ ] claws-sdk/src/adapter/oc-data-adapter.ts — DataFrame inversion for OC formats
- [ ] claws-sdk/src/adapter/governance-host.ts — GovernanceHost TypeScript interface (6 facets)
- [ ] claws-sdk/src/adapter/hook-registry.ts — OC hook name → GovernanceIR concept mapping
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — plugin generation, hook registration, fail-mode
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — SKILL.md content, PRESS compression
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts — JSON schema, R5 entries
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts — DAG rewriting, step injection ordering
- [ ] claws-sdk/tests/emit/emit-plugin.integration.test.ts — full emit + tsc type-check on output
- [ ] claws-sdk/tests/emit/no-forbidden-imports.unit.test.ts — grep generated output for @craftworks/
- [ ] claws-sdk/tests/adapter/governance-host.unit.test.ts — interface contract
- [ ] claws-sdk/tests/adapter/hook-registry.unit.test.ts — hook name mapping completeness
- [ ] claws-sdk/tests/emit/governance-deny-priority.integration.test.ts — verify DENY cannot be overridden by subsequent plugins
- [ ] claws-sdk/tests/fixtures/minimal/expected-output/ (NEW) — expected generated files for snapshot testing

### CLI Wiring
- None in this plan (emit is SDK only — CLI `claws build` comes in claws-cli-foundation plan)

### Scenario Findings (added during wave)

**From compile-pipeline scenarios:**
- [ ] Workflow injected step naming: `claws-{type}-{tool-name}` with disambiguation for multiple R5 tools (CP-S08-F01)
- [ ] Parallel branch workflow inversion: handle elicitation in parallel DAG branches (CP-S08-F02)
- [ ] Classification step injection for ALL tool-using steps, not only R5 (CP-S08-F06)
- [ ] Audit step sync/async design: async by default, non-blocking on audit failure (CP-S08-F04)
- [ ] First-step governance edge case: pre-workflow gate pattern when trigger uses R5 tool (CP-S08-F07)
- [ ] Conditional artifact count: emit 3 artifacts when lobster.yaml absent, not always 4 (CP-S03-F07 implied)

**From cross-file-conflicts scenarios:**
- [ ] Elicitation as conditional deny resolution: suggest elicit gate for "never X UNLESS approved" patterns (CFC-S01-F07)
- [ ] Tool alternative suggestions in conflict resolution (e.g., R3 save-report-draft instead of R5 send-report-email) (CFC-S07-F04)

**From fail-mode scenarios:**
- [ ] Pre-computed risk map in generated handler — catch clause uses `riskMap.get(toolName) ?? 5` instead of calling riskLevel() (fail-S04-F01, fail-S05-F01)
- [ ] Error sanitization function in generated code — strip stack traces and paths from blockReason (fail-S04-F03, emit-S07-F03)
- [ ] Hardened audit path in catch clause — fire-and-forget to pre-opened fd (fail-S04-F02)
- [ ] Secondary audit via process.stderr for fail-open events (fail-S02-F01)
- [ ] Risk level branching exhaustive tests: all 5 risk levels in catch clause (fail-S05-F05)
- [ ] Configured vs default fail mode precedence in catch clause (fail-S05-F06)
- [ ] R3-R4 default fail mode is fail-closed — codify in generated handler defaults (fail-S03-F02)
- [ ] O(1) hook time complexity — pre-compiled ReadonlyMap lookups, no regex in hot path (fail-S06-F07)
- [ ] Platform-specific timeout implementation for non-Node targets (fail-S06-F02)

**From emit-artifacts scenarios:**
- [ ] Atomic artifact emission: staging directory + atomic rename (emit-S01-F01) — P-071
- [ ] exec-approvals.json schema validation against OC platform spec (emit-S01-F02, emit-S05-F01) — P-072
- [ ] OC plugin scaffold completeness: package.json + entry point + hook API (emit-S01-F06)
- [ ] Compiled workflow schema validation against lobster schema (emit-S02-F01)
- [ ] Workflow-plugin handler name contract: shared naming function (emit-S02-F02) — P-081
- [ ] Fail-mode metadata in compiled workflow governance steps (emit-S02-F06)
- [ ] Branch-aware workflow inversion for conditional DAGs (emit-S02-F07)
- [ ] Plugin loading order advisory warning (emit-S03-F01) — P-076
- [ ] try/catch fail-mode handler in generated code (emit-S03-F02)
- [ ] TypeScript version targeting (emit-S03-F06) — P-082
- [ ] Missing rule table graceful degradation: fail-closed for all tools (emit-S03-F07)
- [ ] SKILL.md imperative instruction quality (emit-S04-F01)
- [ ] PRESS governance compression profile: preserve safety-critical keywords (emit-S04-F02) — P-075
- [ ] Cross-artifact consistency validation (emit-S04-F04) — P-080
- [ ] SKILL.md size management: inline vs reference threshold at 20 tools (emit-S04-F06)
- [ ] Custom approval overrides in exec-approvals (emit-S05-F03)
- [ ] Built-in tool inclusion in exec-approvals (emit-S05-F04)
- [ ] AbortSignal propagation to evaluatePolicy (emit-S06-F01)
- [ ] Configurable hook timeout in generated code (emit-S06-F02)
- [ ] Timeout side effect cleanup (emit-S06-F03)
- [ ] Node.js version compatibility polyfill (emit-S06-F04) — P-077
- [ ] Error type distinction: AbortError vs TypeError in audit (emit-S06-F06)
- [ ] Catch clause minimalism in generated handler (emit-S07-F01) — P-070
- [ ] Post-emit static verification pass (emit-S07-F02)
- [ ] Async error handling with proper await (emit-S07-F06)
- [ ] Import scanning on TS source, not compiled JS (emit-S08-F01)
- [ ] Error string internal reference audit (emit-S08-F02)
- [ ] SKILL.md provenance invisibility (emit-S08-F03)
- [ ] Generated code comment policy (emit-S08-F04)
- [ ] Transitive dependency audit (emit-S08-F06)
- [ ] Platform field name mapping in exec-approvals (emit-S08-F07)
- [ ] Per-tool error granularity: CLAWS-E001 per-tool, not whole config (fail-S01-F07)
- [ ] Error code registry: E0xx type-level, E1xx parse, E2xx rule, E3xx emit (fail-S01-F02)
- [ ] Developer-friendly error messages with WHY context (fail-S01-F04)
- [ ] Fail-open code generation correctness: verify catch behavior per risk level (fail-S02-F05, fail-S03-F05)
- [ ] Risk-level branching in handler generation (fail-S03-F06)
- [ ] Overwrite vs incremental emit: content hash comparison (emit-S02-F04)
- [ ] SKILL.md self-sufficiency for advisory-only platforms (emit-S01-F07)
- [ ] PRESS compression level configuration (emit-S04-F03)

**From pitfall-coverage-1 scenarios (S01-S10):**
- [ ] Catch clause single point of failure: must be minimal map lookup with constant default (PC1-S10-F01, P-109)
- [ ] Pre-computed risk map at handler registration, not per-call (PC1-S10-F02)
- [ ] Unknown tool defaults to R5 (fail-closed) via `?? 5` — `?? 1` is a security vulnerability (PC1-S10-F03)
- [ ] Post-emit catch clause static verifier: whitelist of allowed AST operations (PC1-S10-F04)
- [ ] Explicit null/undefined toolName handling as hard deny before map lookup (PC1-S10-F05)
- [ ] Risk map immutability: Object.freeze or ReadonlyMap (PC1-S10-F06)
- [ ] Defense-in-depth: catch clause required regardless of platform default changes (PC1-S10-F07)
- [ ] Catch clause audit logging must not throw: fire-and-forget pattern (PC1-S10-F09)
- [ ] Runtime phantom tool interception: Gateway returns clear error for phantom tools in advisory mode (PC1-S06-F07)
- [ ] Skill update triggers recompilation via three-rings watch ring (PC1-S06-F08)

**New test additions from pitfall-coverage-1:**
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — catch clause static verifier whitelist enforcement (PC1-S10-F04)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — risk map immutability (frozen/ReadonlyMap) (PC1-S10-F06)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — null/undefined toolName defaults to deny (PC1-S10-F05)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — unknown tool defaults to R5 via ?? 5 (PC1-S10-F03)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — catch clause audit does not throw (PC1-S10-F09)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — phantom tool interception in advisory mode (PC1-S06-F07)
- [ ] claws-sdk/tests/emit/post-emit-verification.integration.test.ts — catch clause AST whitelist validation (PC1-S10-F04)

**From spec-constraint-validation scenarios (SCV-S01 through SCV-S15):**
- [ ] Same-filesystem staging requirement: staging dir on same volume for atomic rename (SCV-S01-F01)
- [ ] Staging directory crash recovery: detect orphaned staging dirs on next build (SCV-S01-F02)
- [ ] Variable artifact count: 3 or 4 artifacts depending on lobster.yaml presence (SCV-S01-F03)
- [ ] Rollback diagnostic detail: enumerate succeeded/failed artifacts in error message (SCV-S01-F04)
- [ ] Last-known-good preservation: failed EMIT must not delete previous artifacts (SCV-S01-F05)
- [ ] Hash optimization vs atomicity: partial-write optimization must remain atomic (SCV-S01-F06)
- [ ] Mixed create/overwrite: backup original exec-approvals.json before move (SCV-S01-F07)
- [ ] Pre-emit permission check: verify write access to ALL target paths before generation (SCV-S01-F08)
- [ ] Staging directory in .claws/ for git invisibility (SCV-S01-F10)
- [ ] SKILL.md directive-to-risk mapping for consistency check (SCV-S02-F01)
- [ ] Field name mapping in consistency check (SCV-S02-F02)
- [ ] Machine-readable classification manifest alongside generated code (SCV-S02-F03)
- [ ] Intentional omission handling for R1-R2 in consistency check (SCV-S02-F04)
- [ ] Built-in tool consistency scope: different rules for declared vs built-in (SCV-S02-F05)
- [ ] Tool name normalization in consistency check (SCV-S02-F06)
- [ ] Consistency failure triggers atomic rollback (SCV-S02-F07)
- [ ] Override propagation consistency validation (SCV-S02-F08)
- [ ] Frozen keyword set in PRESS compression profile (SCV-S08-F01)
- [ ] Directive-level preservation (full sentence, not individual keywords) (SCV-S08-F02)
- [ ] Keyword count validation: compare pre/post compression counts (SCV-S08-F03)
- [ ] Case preservation for safety keywords in PRESS (SCV-S08-F04)
- [ ] Keyword preservation across all compression levels (SCV-S08-F05)
- [ ] No preservation metadata in SKILL.md output (SCV-S08-F07)
- [ ] AST-based post-emit static verification (SCV-S14-F01)
- [ ] Multi-handler verification scope: all handler registrations (SCV-S14-F02)
- [ ] Risk check is conditional expression, not just reference (SCV-S14-F03)
- [ ] Catch clause complexity metrics: statement count, function call restrictions (SCV-S14-F05)
- [ ] Verification result in build output (SCV-S14-F06)
- [ ] Verification rule testing against valid/invalid samples (SCV-S14-F07)
- [ ] Dynamic string reference detection in error strings (SCV-S14-F08)
- [ ] Per-build verification gate: runs every build (SCV-S14-F09)
- [ ] Plugin ordering advisory warning with exact fix instruction (SCV-S05-F01)
- [ ] Post-init ordering instruction in claws init output (SCV-S05-F04)
- [ ] AbortSignal propagation to avoid CPU waste (SCV-S15-F02)
- [ ] Node 18+ fallback: setTimeout + AbortController (SCV-S15-F07)

**New test additions from SCV scenarios:**
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — same-filesystem staging (SCV-S01-F01)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — crash recovery with orphaned staging (SCV-S01-F02)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — variable artifact count (3 vs 4) (SCV-S01-F03)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — last-known-good preservation (SCV-S01-F05)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts — directive-to-risk mapping (SCV-S02-F01)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts — normalization before comparison (SCV-S02-F06)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts — consistency failure triggers rollback (SCV-S02-F07)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — frozen keyword set enforcement (SCV-S08-F01)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — directive-level preservation (SCV-S08-F02)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — keyword count validation (SCV-S08-F03)
- [ ] claws-sdk/tests/emit/post-emit-verification.integration.test.ts — AST-based verification (SCV-S14-F01)
- [ ] claws-sdk/tests/emit/post-emit-verification.integration.test.ts — multi-handler scope (SCV-S14-F02)

**New test additions (updated):**
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts — parallel branch governance injection
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts — multiple R5 tools in same workflow (step naming disambiguation)
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts — trigger step with R5 tool (pre-workflow gate)
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts — classification step injection for R1-R4 tool steps
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts — conditional branch governance injection (emit-S02-F07)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — catch clause minimalism verification (emit-S07-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — pre-computed risk map in generated handler (fail-S04-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — AbortSignal propagation to evaluatePolicy (emit-S06-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — error type distinction in timeout handling (emit-S06-F06)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — async/await error handling (emit-S07-F06)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — R5 deny-on-error with all 5 risk levels (fail-S05-F05)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — configured vs default fail mode (fail-S05-F06)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts — custom approval overrides (emit-S05-F03)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts — built-in tool inclusion (emit-S05-F04)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts — platform field name mapping (emit-S08-F07)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — PRESS safety-critical keyword preservation (emit-S04-F02)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — SKILL.md provenance invisibility (emit-S08-F03)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — size management threshold (emit-S04-F06)
- [ ] claws-sdk/tests/emit/no-forbidden-imports.unit.test.ts — scans TS source not JS (emit-S08-F01)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts — classifications match across all artifacts (emit-S04-F04)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — partial failure rolls back all artifacts (emit-S01-F01)
- [ ] claws-sdk/tests/emit/post-emit-verification.integration.test.ts — static analysis of generated code (emit-S07-F02)

**From pitfall-coverage-2 scenarios (PC2-S01 through PC2-S15):**
- [ ] Catch clause structural verification: AST allowlist (Map.get, nullish coalescing, object literal, stderr.write) (PC2-S01-F02)
- [ ] Atomic staging directory: all artifacts to .claws/staging/ first, atomic swap (PC2-S02-F01, F02, F03)
- [ ] Interrupted swap recovery: staging alongside live = live is authoritative (PC2-S02-F03)
- [ ] Cross-artifact classification validation: post-emit consistency check (PC2-S02-F04, F05)
- [ ] Single authoritative classification source for all emitters (PC2-S02-F06)
- [ ] Pinch post-hoc consistency detection on existing workspaces (PC2-S02-F07)
- [ ] Workflow artifact inclusion in consistency checks (PC2-S02-F09)
- [ ] exec-approvals.json schema version pinning (PC2-S03-F01, F02)
- [ ] PRESS safety keyword allowlist: never/always/must/prohibited/required/blocked (PC2-S05-F01, F02, F03)
- [ ] PRESS numeric threshold preservation (PC2-S05-F07)
- [ ] Plugin loading order advisory CLAWS-W060 (PC2-S05-F04, F06)
- [ ] Node.js version detection + setTimeout polyfill for Node <18 (PC2-S06-F01, F02)
- [ ] TypeScript version targeting via claws.json#emit.tsTarget (PC2-S06-F03, F04)
- [ ] Pre-write TS syntax validation (PC2-S06-F07)
- [ ] Platform-conditional polyfill skip (PC2-S06-F10)
- [ ] Shared handler name registry: kebab + camelCase from canonical (PC2-S08-F01, F02, F03)
- [ ] Handler name edge cases: numeric prefixes, consecutive hyphens, acronyms (PC2-S08-F04)
- [ ] Pinch post-hoc handler name cross-reference (PC2-S08-F05)
- [ ] Exact match enforcement for handler names (PC2-S08-F06)
- [ ] User-defined handler scope boundary in cross-reference (PC2-S08-F07)
- [ ] Incremental build on lobster.yaml addition (PC2-S08-F10)
- [ ] Unconditional deny-on-timeout in generated handler (PC2-S15-F01, F02)
- [ ] ReadonlyMap enforcement in generated code (PC2-S04-F06)
- [ ] Hook timeout configuration threading (PC2-S04-F01, F02)

**New test additions from pitfall-coverage-2:**
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- catch clause AST allowlist (PC2-S01-F02)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts -- interrupted swap recovery (PC2-S02-F03)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts -- workflow artifact inclusion (PC2-S02-F09)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts -- schema version pinning (PC2-S03-F01)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts -- PRESS safety keyword preservation (PC2-S05-F01)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts -- PRESS numeric threshold preservation (PC2-S05-F07)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- Node version polyfill generation (PC2-S06-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- TS version targeting (PC2-S06-F03)
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts -- handler name registry (PC2-S08-F01)
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts -- handler name edge cases (PC2-S08-F04)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- unconditional deny-on-timeout (PC2-S15-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- ReadonlyMap enforcement (PC2-S04-F06)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- hookTimeoutMs threading (PC2-S04-F01)

**From pitfall-final-1 scenarios (PF1-S01 through PF1-S26):**
- [ ] Pre-computed ReadonlyMap at registration time — catch uses riskMap.get(toolName) ?? 5 only (PF1-S10-F02, P-109)
- [ ] Catch clause AST verification whitelist: Map.get, ??, <, >=, return, throw only (PF1-S10-F04, P-109)
- [ ] Risk map immutability: Object.freeze or ReadonlyMap (PF1-S10-F06, P-109)
- [ ] Non-throwing log in catch: fire-and-forget pattern (PF1-S10-F07, P-109)
- [ ] Staging in .claws/staging/ — same filesystem as workspace for atomic move (PF1-S11-F01, P-120)
- [ ] Cross-volume move prohibition: never use %TEMP% or different volume (PF1-S11-F02, P-120)
- [ ] Staging directory creation with mkdir -p, handle EEXIST (PF1-S11-F06, P-120)
- [ ] Orphaned staging recovery protocol: check on startup, validate, complete or clean up (PF1-S12-F01, P-121)
- [ ] Crash marker protocol: .in-progress file in staging dir (PF1-S12-F02, P-121)
- [ ] Staging manifest checksum: manifest.sha256 for completeness validation (PF1-S12-F03, P-121)
- [ ] Crash recovery notification diagnostic (PF1-S12-F06, P-121)
- [ ] Frozen keyword set immune to PRESS synonym replacement (PF1-S13-F01, PF1-S19-F01, P-122/P-128)
- [ ] Directive-level PRESS preservation: full sentence with frozen keyword verbatim (PF1-S13-F02, PF1-S19-F02, P-122/P-128)
- [ ] Keyword count validation gate: pre/post compression count comparison (PF1-S13-F03, PF1-S19-F03, P-122/P-128)
- [ ] Three-source consistency check: SKILL.md + TOOLS.md + exec-approvals.json (PF1-S13-F05, P-122)
- [ ] Frozen keyword case preservation: NEVER != Never != never (PF1-S19-F04, P-128)
- [ ] Multilingual frozen keyword set: JAMAIS, NIE, NUNCA (PF1-S19-F07, P-128)
- [ ] Actionable migration snippet in OBO-WITHOUT-ELICIT errors (PF1-S14-F01, P-123)
- [ ] Severity change explanation in diagnostic text (PF1-S14-F02, P-123)
- [ ] Automated migration command: claws migrate --obo-elicit (PF1-S14-F03, P-123)
- [ ] Compatibility mode: --compat v1 downgrades to warning (PF1-S14-F05, P-123)
- [ ] All-or-nothing staging protocol: no artifact to workspace until all validated (PF1-S24-F01, P-133)
- [ ] Post-staging validation checklist: non-empty SKILL.md, compiled index.ts, valid JSON, compiled workflow.ts (PF1-S24-F03, P-133)
- [ ] Consistency validation in staging before atomic move (PF1-S24-F05, P-133)
- [ ] Cross-artifact consistency validation: compare risk levels across all artifacts (PF1-S25-F01, P-134)
- [ ] IR as single source of truth for all artifact risk levels (PF1-S25-F02, P-134)
- [ ] Directive mapping generated from IR, not separate config (PF1-S25-F03, P-134)
- [ ] Incremental emit invalidation when any risk level changes in IR (PF1-S25-F05, P-134)
- [ ] exec-approvals.json schema validation against pinned OC platform schema (PF1-S26-F01, P-135)
- [ ] Platform schema version pinning in claws.json (PF1-S26-F03, P-135)
- [ ] Round-trip schema verification: read back from staging and validate (PF1-S26-F05, P-135)
- [ ] Plugin ordering advisory warning at EMIT time (PF1-S16-F01, P-125)
- [ ] Post-init ordering instruction in claws init output (PF1-S16-F05, P-125)

**New test additions from pitfall-final-1:**
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — catch clause AST whitelist enforcement (PF1-S10-F04)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — risk map immutability (PF1-S10-F06)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts — non-throwing catch audit (PF1-S10-F07)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — same-volume staging (PF1-S11-F01)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — orphaned staging recovery (PF1-S12-F01)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — crash marker protocol (PF1-S12-F02)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — staging manifest checksum (PF1-S12-F03)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts — all-or-nothing staging (PF1-S24-F01)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — frozen keyword set enforcement (PF1-S13-F01)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — directive-level preservation (PF1-S13-F02)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — keyword count validation (PF1-S13-F03)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — case preservation (PF1-S19-F04)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts — multilingual keywords (PF1-S19-F07)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts — three-source consistency (PF1-S13-F05)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts — risk mismatch detection (PF1-S25-F01)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts — schema validation against OC spec (PF1-S26-F01)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts — round-trip verification (PF1-S26-F05)

**From pitfall-final-2 scenarios (PF2-S01 through PF2-S26):**
- [ ] Atomic rules.json write via .tmp+rename to prevent race (PF2-S01-F07)
- [ ] Staging protocol: all artifacts to .claws/staging/, atomic swap, rollback on failure (PF2-S02-F01, F02, F03)
- [ ] Binary success/failure build reporting -- no partial success (PF2-S02-F04)
- [ ] Staging cleanup on failure to prevent manual extraction (PF2-S02-F05)
- [ ] Artifact dependency graph validation (PF2-S02-F06)
- [ ] Template error diagnostics with specific binding (PF2-S02-F07)
- [ ] Cross-artifact classification consistency validator (PF2-S03-F01, F02, F03)
- [ ] Full artifact regeneration on classification change (PF2-S03-F03)
- [ ] Mismatch staging rollback diagnostic format (PF2-S03-F05)
- [ ] exec-approvals field name correctness from pinned schema (PF2-S04-F01, F02)
- [ ] Integration verification that blocked tools actually blocked (PF2-S04-F04)
- [ ] Template field names from schema constants, not hardcoded (PF2-S04-F05)
- [ ] hookTimeoutMs injection not hardcoded in template (PF2-S05-F01)
- [ ] Post-emit timeout value verification (PF2-S05-F02)
- [ ] hookTimeoutMs documented default (100ms) (PF2-S05-F03)
- [ ] PRESS safety keyword allowlist: configurable, context-aware (PF2-S07-F01, F02, F03)
- [ ] Post-compression safety keyword audit: hard error on lost keyword (PF2-S07-F04)
- [ ] Negation preservation in PRESS compression (PF2-S07-F05)
- [ ] Safety precedence over compression ratio (PF2-S07-F06)
- [ ] Domain-specific safety terms via claws.json press.safetyKeywords (PF2-S07-F07)
- [ ] Plugin ordering analysis in pinch: CLAWS-W060 (PF2-S08-F02)
- [ ] Node 16 AbortSignal.timeout polyfill: inline, no dependency (PF2-S09-F01, F02)
- [ ] TS syntax compatibility matrix (PF2-S09-F03, F04, F05)
- [ ] Node version auto-detection cascade (PF2-S09-F06)
- [ ] Fleet version matrix in claws fleet scan (PF2-S09-F08)
- [ ] Handler name registry: canonical form, bidirectional resolution (PF2-S12-F01, F02, F03, F04)
- [ ] Case-sensitive handler resolution assumption (PF2-S12-F05)
- [ ] Handler name collision detection (PF2-S12-F06)
- [ ] Multi-plugin handler registry (PF2-S12-F07)
- [ ] Redaction routing in generated handler per-channel (PF2-S16-F05)
- [ ] Output path redaction coverage verification (PF2-S16-F07)
- [ ] Unconditional deny-on-timeout generation (PF2-S23-F02)
- [ ] approveOnTimeout true = CLAWS-E042 build failure (PF2-S23-F03)
- [ ] Post-emit timeout handler AST verification (PF2-S23-F07)
- [ ] Platform-version-independent timeout override (PF2-S23-F06)

**New test additions from pitfall-final-2:**
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- hookTimeoutMs injection not hardcoded (PF2-S05-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- timeout value post-emit verification (PF2-S05-F02)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- Node 16 polyfill generation (PF2-S09-F01)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- TS 4.7 satisfies replacement (PF2-S09-F05)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- unconditional deny-on-timeout (PF2-S23-F02)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- approveOnTimeout true rejection (PF2-S23-F03)
- [ ] claws-sdk/tests/emit/emit-plugin.unit.test.ts -- per-channel redaction routing (PF2-S16-F05)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts -- safety keyword allowlist preservation (PF2-S07-F01)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts -- negation preservation (PF2-S07-F05)
- [ ] claws-sdk/tests/emit/emit-skill.unit.test.ts -- context-aware keyword detection (PF2-S07-F03)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts -- field name from schema constants (PF2-S04-F05)
- [ ] claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts -- integration enforcement verification (PF2-S04-F04)
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts -- handler name registry bidirectional (PF2-S12-F01)
- [ ] claws-sdk/tests/emit/emit-workflow.unit.test.ts -- case-sensitive resolution assumption (PF2-S12-F05)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts -- classification mismatch detection (PF2-S03)
- [ ] claws-sdk/tests/emit/cross-artifact-consistency.integration.test.ts -- full regeneration on change (PF2-S03-F03)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts -- staging cleanup on failure (PF2-S02-F05)
- [ ] claws-sdk/tests/emit/atomic-emit.integration.test.ts -- rules.json atomic write (PF2-S01-F07)

## Scenario-Driven Additions

### From a2a-governance scenarios
- **Findings applied**: Delegation ceiling enforcement handler generation, identity level check emission, per-tool delegation ceiling (not per-risk-level) in generated code
- **Design areas**: A2A firewall template expansion for delegation ceiling per-tool semantics, identity level verification in generated plugin handlers
- **New tests**: Delegation ceiling enforcement handler generation, identity level check in emitted plugin, per-tool ceiling resolution in a2a-firewall template

### From injection-defense scenarios
- **Findings applied**: Boundary marker generation with nonces (replacing fixed markers), DATA-layer sub-boundaries per tool in generated output
- **Design areas**: Nonce-based boundary marker emission in context isolation templates, per-tool sub-boundary generation within DATA layer, Guardrail Sandwich distributed layer firing across chain steps
- **New tests**: Nonce-based marker generation in emitted code, DATA sub-boundary per-tool isolation, fail-closed marker injection on malformed UTF-8

### From obo-elicitation scenarios
- **Findings applied**: Deny-on-timeout unconditional generation in EMIT phase, standing approval handler emission
- **Design areas**: Unconditional deny-on-timeout in before-tool-call template regardless of platform default, standing approval handler templates for compile-time validated pre-authorizations
- **New tests**: Deny-on-timeout unconditional in generated handler, standing approval handler emission from compiled config

### From lossless-roundtrip scenarios
- **Findings applied**: Write-allow-list enforcement mechanism, reserved directory name collision check, line ending policy for generated files, deterministic serialization (sorted-key JSON)
- **Design areas**: EMIT write-allow-list restricting output to governance directories only, generated file CRLF/LF policy (match workspace or force LF), stable code generation ordering for deterministic index.ts, hash-skip optimization dependent on deterministic serialization
- **New tests**: Write-allow-list enforcement rejects paths outside governance directories, generated file line ending consistency, sorted-key JSON deterministic output, reserved directory name collision detection

### From platform-detection scenarios
- **Findings applied**: Per-platform emission for 7 platforms, delimiter-based section management for CLAUDE.md/.cursorrules injection, settings.json merge strategy with governance-first conflict resolution
- **Design areas**: Multi-language code generation architecture (TypeScript + Python + JSON + YAML), CLAUDE.md dual-surface emission with delimiter safety, settings.json merge strategy preserving user tool restrictions, Bedrock guardrail API version targeting, LangGraph HITL integration, CrewAI guard config generation
- **New tests**: Per-platform artifact emission (7 platforms), CLAUDE.md delimiter-based section injection, settings.json merge preserves user restrictions, Bedrock API version targeting, LangGraph Python guard emission, CrewAI hierarchical delegation cycle detection

## Praetor Integration

- **Loss-Aware Routing**: EMIT uses Spec 108 loss matrix + path enumerator. Governance enforcement maps to loss scores.
- **Package Output**: Published artifacts through artifact slicer, not custom pipeline.
- **Context Emission**: Fleet broadcast creates context collections with governance as protected layer.

## Out of Scope

- GovernanceIR type definitions (that's claws-governance-ir plan)
- Parsing OC workspace files (that's claws-parse plan)
- Governance rule evaluation (that's claws-rules plan — GovAnalysis must exist first)
- Phase 4 OPTIMIZE: dead-code elimination, rule merging (Phase 2+)
- CLI `claws build` command (that's claws-cli-foundation plan)
- Cross-compile targets other than OpenClaw (cursor, claude, bedrock — Phase 2+)
- PRESS advanced compression profiles (Phase 2+ when claws-base-cli extracts)
- Sidecar (L5) emission (Phase 3, enterprise)
- Compliance artifact emission: SOC2, HIPAA, EU AI Act (Phase 3, claws-sdk/compliance/)
- Maker workflow / emit-package.ts (CL-05/CL-06 scope, Phase 2+)

## Notes

- **This plan does NOT write the emit framework** — compiler-sdk's emit infrastructure (platform registry, emitter base classes, OperationIR TS emitter) already exists. This plan adds 4 new governance-specific emitters that plug into that framework.
- Generated plugin follows the OpenClawPluginDefinition interface — same pattern as any OC developer plugin
- The before_tool_call handler template includes the handler-level try/catch for R5 deny-on-error (CL-03 CB-01)
- Templates use string interpolation, not a template engine — keeps dependencies minimal
- The OC adapter layer is the translation boundary: everything before it is GovernanceIR; everything after it is OC-native
- GovernanceHost is an INTERFACE defined here, implemented by the generated plugin code — it is the contract, not the implementation
- SKILL.md emission reuses PRESS compression modules from compiler-sdk (5 of 7 PRESS modules are reusable per CL-04 Section 10)
- Workflow inversion preserves original step IDs and adds `claws-` prefixed governance steps
- Phase 1 SKILL.md uses basic PRESS profile; full pinch compression profiles are Phase 2+
- DataFrame materialization uses compiler-sdk DataFrame patterns — workspace context is materialized at compile time, embedded as `const` objects
- Depends on claws-governance-ir, claws-parse, and claws-rules — the GovernanceIR with GovAnalysis must be complete before emission
- **`llm_output` hook is observe-only.** G-OUTPUT rules that need to block output must use the `before_prompt_build` hook to inject output validation instructions, not `llm_output` (which is observe-only per OC catalog). The generated plugin uses `llm_output` for audit recording only; enforcement happens through prompt injection in the next turn.
- **AbortSignal.timeout(hookTimeoutMs)** must be included in `before-tool-call.ts.tmpl`. Without it, the 50ms budget is aspirational, not enforced. The timeout-on-fail applies the risk-level fail-mode (R5=deny, R1-R2=allow).
- **DENY cannot be overridden by subsequent plugins.** A `governance-deny-priority.integration.test.ts` test must verify that a DENY decision from the governance plugin cannot be overridden by a subsequent plugin in the OC chain.
