---
pulse: 16
slug: gateway-plugin-emitter
plan: claws-emit
depends_on: [14, 15]
governing_roles: [claws:gateway-eng, craft:codegen, craft:dragon]
scenario_codes: [emit-S01-*, emit-S03-*, emit-S06-*, fail-S04-*, fail-S05-*, PC1-S10-*]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/emit/emit-plugin.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/emit/no-forbidden-imports.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/adapter/governance-host.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/adapter/hook-registry.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 16: Gateway Plugin TS Emitter (L2+L3)

## Objective

Emit a Gateway plugin `index.ts` with `before_tool_call` + lifecycle hooks for enforcement (L2+L3 layers). Define the GovernanceHost 6-facet interface — the contract between compiled governance and OC runtime. Build the OC adapter layer that translates GovernanceIR concepts into OC-native hook registrations, config formats, and file paths. Generated code must use `@openclaw/*` imports only — zero `@craftworks/` or `@claws/` references (OC developer test). Pre-computed risk map at handler registration for O(1) hook time complexity.

## Deliverables

- [ ] `claws-sdk/src/emit/emit-plugin.ts` — Gateway plugin generation: hook registrations, policy evaluation, fail-mode handlers. Pre-computed risk map. try/catch with fail-mode branching per risk level.
- [ ] `claws-sdk/src/emit/templates/plugin-handler.ts.tmpl` — Main handler template with try/catch fail-mode, minimal catch clause (map lookup with constant default)
- [ ] `claws-sdk/src/emit/templates/before-tool-call.ts.tmpl` — Tool-call hook template with R5 deny-on-error and AbortSignal.timeout(hookTimeoutMs)
- [ ] `claws-sdk/src/emit/templates/a2a-firewall.ts.tmpl` — A2A boundary enforcement template
- [ ] `claws-sdk/src/emit/templates/elicitation-gate.ts.tmpl` — OBO elicitation gate template
- [ ] `claws-sdk/src/adapter/governance-host.ts` — GovernanceHost 6-facet TypeScript interface definition
- [ ] `claws-sdk/src/adapter/hook-registry.ts` — OC hook name mapping: GovernanceIR concepts to OC `api.on()` event names
- [ ] `claws-sdk/src/adapter/oc-data-adapter.ts` — DataFrame inversion: GovernanceIR to OC config/memory formats
- [ ] `claws-sdk/tests/emit/emit-plugin.unit.test.ts` — plugin generation, hook registration, fail-mode, catch clause verifier, risk map immutability
- [ ] `claws-sdk/tests/emit/no-forbidden-imports.unit.test.ts` — grep generated output for @craftworks/ and @claws/
- [ ] `claws-sdk/tests/adapter/governance-host.unit.test.ts` — 6-facet interface contract validation
- [ ] `claws-sdk/tests/adapter/hook-registry.unit.test.ts` — hook name mapping completeness
- [ ] `claws-sdk/tests/fixtures/minimal/expected-output/` — expected generated files for snapshot testing

## TDD Tests

### L0 Unit (8)

- emit-plugin produces valid TypeScript for minimal GovernanceIR -> `tests/emit/emit-plugin.unit.test.ts`
- Generated handler has pre-computed ReadonlyMap risk lookup -> `tests/emit/emit-plugin.unit.test.ts`
- Catch clause uses `riskMap.get(toolName) ?? 5` (fail-closed default) -> `tests/emit/emit-plugin.unit.test.ts`
- Null/undefined toolName defaults to deny before map lookup -> `tests/emit/emit-plugin.unit.test.ts`
- Risk map is Object.freeze or ReadonlyMap (immutable) -> `tests/emit/emit-plugin.unit.test.ts`
- Generated output has zero @craftworks/ or @claws/ imports -> `tests/emit/no-forbidden-imports.unit.test.ts`
- GovernanceHost interface has exactly 6 facets -> `tests/adapter/governance-host.unit.test.ts`
- Hook registry maps all GovernanceIR concepts to OC event names -> `tests/adapter/hook-registry.unit.test.ts`

### L1 Integration (3)

- Full emit pipeline produces type-checking plugin on minimal GovernanceIR -> `tests/emit/emit-plugin.integration.test.ts`
- Generated plugin follows OpenClawPluginDefinition interface -> `tests/emit/emit-plugin.integration.test.ts`
- Governance DENY priority: cannot be overridden by subsequent plugins -> `tests/emit/governance-deny-priority.integration.test.ts`

### L2 E2E (1)

- Complete emit() on SOC2 fixture GovernanceIR, type-check generated output -> `tests/emit/emit-plugin.e2e.test.ts`

## Scenario Findings Addressed

- emit-S01-F06: OC plugin scaffold completeness (package.json + entry point + hook API)
- emit-S03-F01: Plugin loading order advisory warning (P-076)
- emit-S03-F02: try/catch fail-mode handler in generated code
- emit-S03-F06: TypeScript version targeting (P-082)
- emit-S03-F07: Missing rule table graceful degradation (fail-closed for all tools)
- emit-S06-F01: AbortSignal propagation to evaluatePolicy
- emit-S06-F02: Configurable hook timeout in generated code
- emit-S06-F03: Timeout side effect cleanup
- emit-S06-F04: Node.js version compatibility polyfill (P-077)
- emit-S06-F06: Error type distinction (AbortError vs TypeError in audit)
- fail-S04-F01, fail-S05-F01: Pre-computed risk map in generated handler
- fail-S04-F02: Hardened audit path in catch clause (fire-and-forget)
- fail-S04-F03, emit-S07-F03: Error sanitization (strip stack traces from blockReason)
- fail-S05-F05: All 5 risk levels exhaustive in catch clause
- fail-S05-F06: Configured vs default fail mode precedence
- fail-S06-F07: O(1) hook time complexity (pre-compiled ReadonlyMap, no regex in hot path)
- PC1-S10-F01: Catch clause single point of failure (minimal map lookup)
- PC1-S10-F02: Pre-computed risk map at handler registration
- PC1-S10-F03: Unknown tool defaults to R5 via `?? 5`
- PC1-S10-F04: Post-emit catch clause static verifier
- PC1-S10-F05: Explicit null/undefined toolName handling
- PC1-S10-F06: Risk map immutability (Object.freeze or ReadonlyMap)
- PC1-S10-F09: Catch clause audit logging must not throw

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/emit/emit-plugin.unit.test.ts
cd claws-sdk && npx vitest run tests/emit/no-forbidden-imports.unit.test.ts
cd claws-sdk && npx vitest run tests/adapter/governance-host.unit.test.ts
cd claws-sdk && npx vitest run tests/adapter/hook-registry.unit.test.ts
cd claws-sdk && npx vitest run tests/emit/emit-plugin.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Zero @craftworks/ or @claws/ in generated output — OC developer test is non-negotiable
- Pre-computed ReadonlyMap risk lookup — no regex or dynamic classification in hot path
- Unknown tool defaults to R5 (fail-closed) via `?? 5` — `?? 1` is a security vulnerability
- Catch clause must be minimal: map lookup, constant default, fire-and-forget audit
- AbortSignal.timeout(hookTimeoutMs) on all policy evaluation calls
- Generated TypeScript must follow OpenClawPluginDefinition interface exactly

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — OC integration, plugin conventions, hook API
- `.craft/roles/craft/codegen.md` — code generation patterns, template rendering, output validation
- `.craft/roles/craft/dragon.md` — security review, catch clause hardening, fail-closed enforcement

## Review Amendments (R1)

### C11: Frozen OC Type Snapshot
- [ ] Add frozen OC Gateway type definitions (.d.ts) in test fixtures
- [ ] Structural assignability test: `GovernanceHost extends OCGatewayPluginApi`
- [ ] If OC Gateway updates plugin interface, this test breaks immediately

### Dragon: Injection Guard in Generated Code
- [ ] Add acceptance test: generated plugin output MUST contain system-prompt boundary markers
- [ ] Guardrail Sandwich: governance preamble before AND after user content in assembled context
- [ ] Verify generated catch clause has explicit null toolName guard

### Gateway-Eng: Latency Budget Test
- [ ] Add L1 perf test: 1000 before_tool_call evaluations, p99 < 50ms
- [ ] No dynamic allocation in hot path — ReadonlyMap only
