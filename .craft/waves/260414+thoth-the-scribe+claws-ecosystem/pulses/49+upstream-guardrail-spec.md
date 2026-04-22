---
pulse: 49
slug: upstream-guardrail-spec
plan: claws-upstream-contrib
depends_on: [43, 44, 45, 46, 47, 48]
governing_roles: [claws:founder, craft:architect, claws:ciso]
scenario_codes: [pitfall-thoth-2/P-230, pitfall-thoth-2/P-231, pitfall-thoth-2/P-232, pitfall-thoth-2/P-242, pitfall-thoth-2/P-243, pitfall-thoth-2/P-244, pitfall-thoth-2/P-245, pitfall-thoth-2/P-246, pitfall-thoth-2/P-247, pitfall-thoth-2/P-248, pitfall-thoth-2/P-249]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd spec && npx vitest run"
  typecheck:
    - "cd spec && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: true
---

# Pulse 49: GuardrailProvider Specification (CP-5 Gate)

## Objective
**Execution context**: This pulse executes within the `craftworks/openclaw-governance` standalone monorepo (https://github.com/gim-home/openclaw-governance), NOT the claws repo. The test_scope paths (packages/...) are relative to that repo root. During wave execution, the openclaw-governance repo must be cloned and set up before these pulses can run.

CP-5 gate pulse. GuardrailProvider specification plus ShellExecProvider reference implementation.

The GuardrailProvider interface defines three methods: `preAuthorize(toolCall)` returning an `AuthorizationDecision` (allow/deny/review/modify), `postAudit(toolCall, result)` for audit recording, and `getCapabilities()` for metadata. The ProviderRegistry chains multiple providers with deny > review > modify > allow priority, implementing a chain-of-responsibility pattern.

The ShellExecProvider is the reference implementation, wrapping `exec-approvals.json` to demonstrate the interface in a real scenario.

This pulse also validates that all 5 `@openclaw/*` packages compile standalone with zero `@craftworks/*` imports, serving as the final quality gate for Checkpoint 5.

Also validates pitfall-thoth-2 P-242 through P-249 (ecosystem pitfalls: platform detection edge cases, lossless roundtrip, skill lifecycle failures).

## Deliverables
- [ ] `spec/guardrail-provider.ts` — GuardrailProvider interface, AuthorizationDecision type, ProviderRegistry with chain-of-responsibility. Log WARNING when empty ProviderRegistry receives a preAuthorize call, alerting operators to missing configuration
- [ ] `spec/shell-exec-provider.ts` — reference ShellExecProvider wrapping exec-approvals.json
- [ ] `spec/README.md` — spec PR body with rationale, sequence diagrams, migration path
- [ ] `spec/tests/guardrail-provider.unit.test.ts` — L0: preAuthorize returns correct decision (1), postAudit records entry (1), getCapabilities returns metadata (1)
- [ ] `spec/tests/provider-registry.unit.test.ts` — L0: deny > review > modify > allow priority (1), 3 providers chained correctly (1), empty registry allows all (1)
- [ ] `spec/tests/shell-exec-provider.integration.test.ts` — L1: ShellExecProvider wraps exec-approvals.json (1), 10 scenarios pass (1)
- [ ] `spec/tests/zero-imports.integration.test.ts` — L1: grep -r '@craftworks' returns zero matches across all 5 packages (1)
- [ ] `spec/tests/guardrail-provider.e2e.test.ts` — L2: GuardrailProvider with mock OC Gateway (1)
- [ ] L3 acceptance: GuardrailProvider compiles with OC Gateway type definitions (documented)

## Acceptance Criteria
- [ ] GuardrailProvider interface defines preAuthorize, postAudit, and getCapabilities methods
- [ ] AuthorizationDecision supports allow, deny, review, and modify outcomes
- [ ] ProviderRegistry chains providers with deny > review > modify > allow priority
- [ ] Empty ProviderRegistry defaults to allow-all behavior
- [ ] ShellExecProvider correctly wraps exec-approvals.json
- [ ] All 5 @openclaw/* packages have zero @craftworks/* imports
- [ ] All 5 @openclaw/* packages compile standalone with `npx tsc --noEmit`
- [ ] All 5 @openclaw/* packages compile standalone with zero @craftworks/* imports (verified by grep)

## Governing Roles
Load these role files before starting:
- `.craft/roles/claws/founder.md` — OpenClaw upstream contribution standards
- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/ciso.md` — security and compliance review

## Dependencies
- Pulse 46 (upstream-audit-chain) — audit-chain package must compile standalone
- Pulse 47 (upstream-budget-identity) — budget-meter and identity-bridge must compile standalone
- Pulse 48 (upstream-siem-scanner) — siem-emitter and secret-scanner must compile standalone

## Test Gates
- [ ] L0 unit (6 tests): preAuthorize returns correct decision, postAudit records entry, getCapabilities returns metadata, deny > review > modify > allow priority, 3 providers chained correctly, empty registry allows all
- [ ] L1 integration (3 tests): ShellExecProvider wraps exec-approvals.json + 10 scenarios, zero @craftworks/* imports across all 5 packages
- [ ] L2 e2e (1 test): GuardrailProvider with mock OC Gateway
- [ ] L3 acceptance (1 test, documented): GuardrailProvider compiles with OC Gateway type definitions
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
