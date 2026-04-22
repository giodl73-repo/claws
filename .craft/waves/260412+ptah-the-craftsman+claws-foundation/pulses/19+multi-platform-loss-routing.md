---
pulse: 19
slug: multi-platform-loss-routing
plan: claws-emit
depends_on: [16, 8]
governing_roles: [claws:platform-eng, craft:architect, craft:dragon]
scenario_codes: [emit-S01-*, emit-S07-*, emit-S08-*]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/emit/emit-multi-platform.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/emit/loss-routing.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: true
---

# Pulse 19: Multi-Platform Emission + Loss-Aware Routing

## Objective

Implement 7-platform emission through the Spec 108 loss matrix. The path enumerator finds the optimal emission route for each governance feature across platforms (OC, Cursor, Windsurf, VS Code, JetBrains, Zed, generic). `--strict-loss` blocks advisory-only emission for R5 tools — if a platform cannot enforce R5 at L2+, the emitter refuses to emit for that platform rather than downgrade to advisory. Loss-aware routing selects the emission path that minimizes governance fidelity loss while maximizing platform coverage.

## Deliverables

- [ ] `claws-sdk/src/emit/platform-router.ts` — Loss-aware routing engine: enumerate emission paths per platform, score fidelity loss via Spec 108 matrix, select optimal route. --strict-loss mode blocks R5 advisory downgrade.
- [ ] `claws-sdk/src/emit/platforms/` — Platform-specific emitter adapters for all 7 targets (OC is full fidelity, others degrade gracefully per loss matrix)
- [ ] `claws-sdk/src/emit/loss-matrix.ts` — Spec 108 loss matrix encoded as data: governance feature x platform -> loss score + available enforcement layers
- [ ] `claws-sdk/tests/emit/emit-multi-platform.unit.test.ts` — multi-platform output generation, per-platform adapter correctness
- [ ] `claws-sdk/tests/emit/loss-routing.unit.test.ts` — path enumeration, optimal route selection, --strict-loss blocking, fidelity scoring
- [ ] `claws-sdk/tests/emit/emit-multi-platform.integration.test.ts` — full multi-platform emit on SOC2 fixture

## TDD Tests

### L0 Unit (8)

- OC platform emits all 4 artifact types (full fidelity) -> `tests/emit/emit-multi-platform.unit.test.ts`
- Generic platform emits SKILL.md only (L1 advisory) -> `tests/emit/emit-multi-platform.unit.test.ts`
- Loss matrix scores OC as zero loss for all governance features -> `tests/emit/loss-routing.unit.test.ts`
- Path enumerator returns optimal route minimizing total loss -> `tests/emit/loss-routing.unit.test.ts`
- --strict-loss blocks advisory emission for R5 tools -> `tests/emit/loss-routing.unit.test.ts`
- --strict-loss allows advisory emission for R1-R2 tools -> `tests/emit/loss-routing.unit.test.ts`
- Platform adapter produces valid output for Cursor target -> `tests/emit/emit-multi-platform.unit.test.ts`
- Import scanning on TS source, not compiled JS -> `tests/emit/emit-multi-platform.unit.test.ts`

### L1 Integration (3)

- Full multi-platform emit on SOC2 fixture produces per-platform directories -> `tests/emit/emit-multi-platform.integration.test.ts`
- Post-emit static verification pass on all platform outputs -> `tests/emit/emit-multi-platform.integration.test.ts`
- Atomic artifact emission: staging directory + atomic rename -> `tests/emit/emit-multi-platform.integration.test.ts`

### L2 E2E (1)

- Complete multi-platform emission on SOC2 fixture, all outputs type-check and validate -> `tests/emit/emit-multi-platform.e2e.test.ts`

## Scenario Findings Addressed

- emit-S01-F01: Atomic artifact emission (staging directory + atomic rename, P-071)
- emit-S07-F01: Catch clause minimalism in generated handler (P-070)
- emit-S07-F02: Post-emit static verification pass
- emit-S07-F06: Async error handling with proper await
- emit-S08-F01: Import scanning on TS source, not compiled JS
- emit-S08-F02: Error string internal reference audit
- emit-S08-F04: Generated code comment policy
- emit-S08-F06: Transitive dependency audit
- fail-S02-F01: Secondary audit via process.stderr for fail-open events
- fail-S02-F05, fail-S03-F05: Fail-open code generation correctness per risk level
- fail-S03-F02: R3-R4 default fail mode is fail-closed
- fail-S06-F02: Platform-specific timeout for non-Node targets
- fail-S01-F02: Error code registry (E0xx type, E1xx parse, E2xx rule, E3xx emit)
- fail-S01-F04: Developer-friendly error messages with WHY context
- fail-S01-F07: Per-tool error granularity (OC-POLICY-E001 per-tool)
- fail-S03-F06: Risk-level branching in handler generation
- CP-S03-F07: Conditional artifact count (3 when lobster.yaml absent)

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/emit/emit-multi-platform.unit.test.ts
cd claws-sdk && npx vitest run tests/emit/loss-routing.unit.test.ts
cd claws-sdk && npx vitest run tests/emit/emit-multi-platform.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Checkpoint Gate

This is the CP-3 gate pulse. All CP-3 exit criteria must be met:
- [ ] All 29 governance rules apply to CapabilityManifest
- [ ] R5 tools flagged as OBO with elicitation gate
- [ ] Gateway plugin type-checks against OC plugin types
- [ ] Zero @craftworks/ or @claws/ in generated output
- [ ] Workflow inversion injects governance steps around R5 operations
- [ ] Loss-aware routing selects optimal platform emission path

## Key Constraints

- --strict-loss for R5 is non-negotiable: refuse to emit rather than downgrade to advisory
- Loss matrix from Spec 108 is the authoritative source for fidelity scores
- Atomic artifact emission via staging directory + atomic rename (no partial writes)
- Platform-specific timeout implementations for non-Node targets
- Error code registry: E0xx type-level, E1xx parse, E2xx rule, E3xx emit
- Post-emit static verification pass validates all generated outputs

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — multi-platform emission, loss matrix, platform adapters
- `.craft/roles/craft/architect.md` — system architecture, cross-platform consistency, emit pipeline
- `.craft/roles/craft/dragon.md` — security review, --strict-loss enforcement, R5 non-negotiability

## Review Amendments (R1)

### C03: Loss Matrix Uses Shared Module
- [ ] Import loss matrix types from `claws-sdk/src/types/loss-matrix.ts` (shared with detect)
- [ ] No local loss matrix definition in emit/ — single source of truth

### Platform-Eng: --strict-loss Reporting
- [ ] --strict-loss error output MUST include: which platforms blocked, which R5 tools, which governance capabilities missing
- [ ] Not just "blocked" — actionable output showing what to fix

### CISO: R5 Default Strict
- [ ] R5 tools default to --strict-loss behavior (non-configurable per CL-02)
- [ ] `--allow-advisory-r5` explicit opt-in required to emit R5 governance to advisory platforms

### C10: Getting-Started Doc (CP-3 Gate)
- [ ] Write `docs/claws/getting-started/rules-reference.md` — 1-2 pages: 29 rules, severity levels, how to read pinch output
