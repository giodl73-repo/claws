---
pulse: 30
slug: validation-layer
plan: claws-cap-integration
depends_on: [29, 23]
governing_roles: [craft:architect, claws:platform-eng, claws:ciso]
scenario_codes: [cap-integration/S03, cap-integration/S04, cap-integration/S21, cap-integration/S22, cap-integration/S23, cap-integration/S24, cap-integration/S27, S32]
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 6
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 30: Write-Time Validation Layer

## Objective

Build the write-time validation pipeline that enforces R5/fleet/governance rules on every edit path. All write paths (chunk PATCH, Loop sync, trust escalation, onboard) route through this single validation pipeline BEFORE writing. The pipeline validates against compiled GovernanceIR and fails closed: if validation rejects, nothing is written.

Risk classification is read from GovernanceIR, not re-derived. Single source: the compile pipeline.

Key enforcement points:
- **R5 enforcement**: Tools classified as R5 (highest risk) cannot be toggled via any write path. R5 lock is absolute and non-negotiable.
- **Fleet lock check**: Fail-closed on missing fleet policy (P-272). If the fleet policy file is absent or unparseable, all edits are denied. No silent fallback to permissive.
- **Governance validation via GovernanceIR**: Each edit is checked against the compiled GovernanceIR for governance violations before writing.
- **Deny rule detection via GovernanceIR registry (P-276)**: Deny rules from GovernanceIR are surfaced with typed error codes, not generic failures.
- **Deny rule provenance tagging (P-277)**: Each deny includes provenance — which policy, which rule, which governance source triggered the denial.

The PatchError union covers 8 error codes: `R5_LOCKED`, `FLEET_LOCKED`, `GOVERNANCE_DENIED`, `VALIDATION_FAILED`, `FILE_NOT_EDITABLE`, `COMPILATION_FAILED`, `ROLLBACK_FAILED`, `UNKNOWN_ERROR`. Each error carries structured context (lock source, rule ID, provenance chain).

## Deliverables

- [ ] `claws-sdk/src/workspace-edit/validation.ts` — ValidationPipeline class: ordered pipeline of validators (R5 → fleet → governance → schema). Methods: `validate(op: EditOperation): Promise<ValidationResult>`, `addValidator(v: Validator): void`. Each validator returns pass/fail with typed PatchError on failure. Pipeline short-circuits on first failure.
- [ ] `claws-sdk/src/workspace-edit/errors.ts` — PatchError union type with 8 error codes (`R5_LOCKED`, `FLEET_LOCKED`, `GOVERNANCE_DENIED`, `VALIDATION_FAILED`, `FILE_NOT_EDITABLE`, `COMPILATION_FAILED`, `ROLLBACK_FAILED`, `UNKNOWN_ERROR`). Each variant carries structured context: lock source, rule ID, policy file path, provenance chain. `isPatchError()` type guard.
- [ ] `claws-sdk/src/workspace-edit/validators/r5-validator.ts` — R5 lock validator: checks tool risk classification from GovernanceIR, rejects any edit to R5 tools with `R5_LOCKED` error
- [ ] `claws-sdk/src/workspace-edit/validators/fleet-validator.ts` — Fleet lock validator: checks fleet policy presence and parseability, fail-closed (P-272) — missing or corrupt policy file denies all edits with `FLEET_LOCKED` error
- [ ] `claws-sdk/src/workspace-edit/validators/governance-validator.ts` — Governance validator: checks edit against GovernanceIR deny rules (P-276), tags each denial with provenance (P-277) — policy source, rule ID, governance file path
- [ ] `claws-sdk/tests/workspace-edit/validation.unit.test.ts` — L0: R5 tool toggle rejected with R5_LOCKED (1), fleet lock missing policy fails closed (1), fleet lock corrupt policy fails closed (1), governance deny rule blocks edit with provenance (1), pipeline short-circuits on first failure (1), valid edit passes all validators (1), FILE_NOT_EDITABLE for non-allowlisted file (1), PatchError carries structured context (1), isPatchError type guard works (1), deny rule provenance includes policy path (1)
- [ ] `claws-sdk/tests/workspace-edit/validation.integration.test.ts` — L1: full pipeline R5 → fleet → governance on valid edit (1), R5 tool in fleet-locked workspace double-denied (1), governance deny with provenance chain traversal (1), fleet policy hot-reload after initial fail-closed (1), validation pipeline with real GovernanceIR fixture (1), concurrent validations do not interfere (1)
- [ ] `claws-sdk/tests/workspace-edit/validation.e2e.test.ts` — L2: edit → validate → write → compile cycle on reference workspace (1), validation failure → no file written → no compile triggered (1)
- [ ] `claws-sdk/tests/workspace-edit/validation.accept.test.ts` — L3: S03 acceptance — R5 tool cannot be toggled via any write path (1), S04 acceptance — fleet lock denies edit when policy missing (1), S21 acceptance — governance deny rule blocks edit with correct provenance (1)
- [ ] `claws-sdk/tests/fixtures/workspace-edit/fleet-missing/` — fixture workspace with no fleet policy file
- [ ] `claws-sdk/tests/fixtures/workspace-edit/fleet-corrupt/` — fixture workspace with unparseable fleet policy
- [ ] `claws-sdk/tests/fixtures/workspace-edit/governance-deny/` — fixture workspace with GovernanceIR containing deny rules
- [ ] `claws-sdk/src/workspace-edit/error-messages.ts` — human-readable message template for each PatchError code. Co-designed with the error codes, not added later.
- [ ] Deny rule removal validator — checks if an edit removes deny rule text from SOUL.md. Compiler-injected deny rules: BLOCKED. User-authored deny rules: WARNING (allowed with governance warning).

## Acceptance Criteria

- [ ] R5 tools cannot be toggled via any write path — R5_LOCKED error returned (S03)
- [ ] Missing fleet policy fails closed — all edits denied with FLEET_LOCKED (S04, P-272)
- [ ] Corrupt fleet policy fails closed — all edits denied with FLEET_LOCKED
- [ ] Governance deny rules detected via GovernanceIR registry (P-276) — GOVERNANCE_DENIED with rule ID
- [ ] Deny rule provenance tagging (P-277) — each denial includes policy source, rule ID, governance file path
- [ ] PatchError union has all 8 error codes with structured context
- [ ] Pipeline short-circuits on first failure — no unnecessary validators run
- [ ] Validation failure means nothing is written to disk
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — pipeline design, error type conventions, fail-closed patterns
- `.craft/roles/claws/platform-eng.md` — SDK validation patterns, GovernanceIR integration
- `.craft/roles/claws/ciso.md` — R5 enforcement, fleet lock security, governance deny rules

## Dependencies

- Pulse 29 (workspace-edit) — EditOperation types, EDITABLE_FILES allowlist, StructuredEditor
- Pulse 23 (chunk-assembler) — GovernanceIR access patterns, governance rule resolution

## Test Gates

- [ ] L0 unit (10 tests): R5 toggle rejected (1), fleet missing fails closed (1), fleet corrupt fails closed (1), governance deny blocks with provenance (1), pipeline short-circuits (1), valid edit passes (1), non-allowlisted FILE_NOT_EDITABLE (1), PatchError structured context (1), isPatchError guard (1), deny provenance includes policy path (1)
- [ ] L1 integration (6 tests): full pipeline on valid edit (1), R5 + fleet double-deny (1), governance provenance chain (1), fleet hot-reload (1), real GovernanceIR fixture (1), concurrent validations (1)
- [ ] L2 e2e (2 tests): edit → validate → write → compile cycle (1), validation failure → no write (1)
- [ ] L3 accept (3 tests): S03 R5 lock acceptance (1), S04 fleet lock acceptance (1), S21 governance deny acceptance (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
