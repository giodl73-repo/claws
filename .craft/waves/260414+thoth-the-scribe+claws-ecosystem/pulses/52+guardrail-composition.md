---
pulse: 52
slug: guardrail-composition
plan: claws-aether-integration
depends_on: [49, 50]
governing_roles: [craft:architect, claws:founder]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && vitest run tests/governance/"
    - "cd claws-test && vitest run"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
    - "cd claws-test && tsc --noEmit"
checkpoint: 5
checkpoint_gate: true
---

# Pulse 52: GuardrailProvider Composition + CP-5 Gate

## Objective

Extend the GuardrailProvider spec (Pulse 49) with `requiresExternalApproval` field
that bridges claws risk classification with host-level approval UX. Document the
layered composition model. CP-5 gate pulse.

## Review Amendments (R1)

- **CM3**: Document precedence: fleet policy override wins at host level. If fleet says R3 auto-approve, provider MUST NOT set `requiresExternalApproval: true` for R3 tools. Provider reads fleet policy.
- **CM4**: All type names and docs are vendor-neutral — works with ANY host, not just Aether
- **GW F-09**: Document fail-mode when provider throws: per risk level (R5 → fail-closed, R2 → fail-open, R3-R4 configurable)
- **CISO M3**: Add risk-change audit entry: when a tool's risk classification changes between compilations, emit audit event with old/new risk + policy delta
- **CISO W2**: Validator enforces R3+ must set `requiresExternalApproval: true` unless fleet override explicitly permits false

## Deliverables

- [ ] `claws-sdk/src/governance/guardrail-types.ts` — EDIT: add `requiresExternalApproval?: boolean` to AuthorizationDecision. Default false. Document: R3+ MUST be true unless fleet override permits false.
- [ ] `claws-sdk/src/governance/fleet-precedence.ts` — NEW: `resolveApprovalGate(riskLevel, fleetOverrides)`: determines final `requiresExternalApproval` value. Fleet override wins over provider default. R5 always true regardless.
- [ ] `claws-sdk/src/governance/risk-change-audit.ts` — NEW: `emitRiskChangeEvent(oldIR, newIR)`: compares tool risk classifications, emits audit event for any changes with old/new risk + policy delta.
- [ ] `claws-test/src/governance/index.ts` — EDIT: update GovernanceValidator to check `requiresExternalApproval` consistency with risk classification + fleet policy
- [ ] `docs/claws/ecosystem/guardrail-composition.md` — NEW: provider + host gate layering model, precedence rules, fail-mode per risk level
- [ ] `docs/claws/integration/aether-bridge.md` — NEW: how claws artifacts flow to Aether (vendor-neutral, Aether as reference consumer)
- [ ] `docs/claws/integration/blob-integrity.md` — NEW: signature verification on rehydration
- [ ] `claws-sdk/tests/governance/guardrail-composition.unit.test.ts` — 4 L0: allow+external=true, allow+external=false, deny (N/A), review (implicit true)
- [ ] `claws-sdk/tests/governance/fleet-precedence.unit.test.ts` — 2 L0: fleet override R3→false overrides provider, R5 always true ignores fleet
- [ ] `claws-sdk/tests/governance/guardrail-composition.integration.test.ts` — 2 L1: full provider→host gate composition with host-policy-sim, risk-change audit emission
- [ ] `claws-sdk/tests/e2e/aether-integration.e2e.test.ts` — 2 L2: compile→emit→policy→provider→host gate end-to-end, HOST disabled fallback
- [ ] `claws-sdk/tests/aether/guardrail-composition.accept.test.ts` — L3: SDK acceptance — consumer creates GuardrailProvider with requiresExternalApproval, verifies fleet precedence resolution, R5 non-negotiable gate, and risk-change audit event emission
- [ ] `claws-cli/tests/aether/guardrail-composition.accept.test.ts` — L3: CLI acceptance — runs `claws compile` + `claws emit` pipeline, verifies guardrail composition output with fleet overrides applied and host-approval-policies.json consistent with provider decisions
- [ ] `claws-sdk/tests/aether/guardrail-cp5-gate.accept.test.ts` — L3: CP-5 gate acceptance — full Aether integration stack: compile→emit→policy→provider→host gate→blob verify round-trip across all CP-5 pulses (50-52)

## CP-5 Gate Verification

```bash
cd claws-sdk && vitest run
cd claws-cli && vitest run
cd claws-test && vitest run
cd claws-sdk && tsc --noEmit
cd claws-cli && tsc --noEmit
cd claws-test && tsc --noEmit
npm run build
```

## Key Constraints

- `requiresExternalApproval` is OPTIONAL — providers that don't set it default to false
- `deny` decisions never reach the host gate — tool is blocked at provider level
- `review` decisions implicitly set `requiresExternalApproval: true`
- Fleet policy override WINS over provider default for R3-R4 (documented precedence)
- R5 → `requiresExternalApproval: true` ALWAYS, regardless of fleet policy or provider
- Provider throw fail-mode: R5 → fail-closed, R2 → fail-open, R3-R4 → configurable (documented in spec)
- Risk classification changes between compilations produce audit events
- All naming and docs are vendor-neutral — works with ANY host
- No Aether repo changes in this pulse — spec + validation + docs only
