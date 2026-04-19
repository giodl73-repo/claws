---
pulse: 4
slug: base-cli-error-contract
plan: claws-base-cli
depends_on: [1, 2]
governing_roles: [craft:architect, claws:skill-author]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 04: Base CLI Error Contract

## Objective

Create the diagnostic error contract and color system for the claws CLI. Every error surfaced to the user must include four fields: WHAT (the problem), HOW (remediation steps), WHERE (file + line + column), and docsUrl (link to relevant documentation). This contract ensures that claws never produces opaque errors.

The color system maps risk tiers (R1-R5) and severity levels (CRITICAL/HIGH/MEDIUM/LOW) to terminal colors, with full support for NO_COLOR and FORCE_COLOR environment variables per the NO_COLOR standard.

## Deliverables

- [ ] `claws-cli/src/errors/contract.ts` — DiagnosticError class extending Error with WHAT, HOW, WHERE (file+line+column), and optional docsUrl fields; `toDiagnostic()` method for structured output. **docsUrl is optional** (R1 review SA-M02): when docsUrl is not provided, the diagnostic falls back to an inline `claws help {code}` suggestion that resolves the error code description from the registry. External doc URLs are added incrementally as docs are written.
- [ ] `claws-cli/src/errors/codes.ts` — OC-POLICY-E001..E099 error code registry with human-readable descriptions, categorized by domain (parse, compile, governance, emit, config)
- [ ] `claws-cli/src/color/risk.ts` — Risk tier colors: R1=green, R2=cyan, R3=yellow, R4=red, R5=bright-red
- [ ] `claws-cli/src/color/severity.ts` — Severity colors: CRITICAL=bright-red, HIGH=red, MEDIUM=yellow, LOW=dim
- [ ] `claws-cli/src/color/index.ts` — NO_COLOR + FORCE_COLOR support, `isColorEnabled()` function, color application helpers
- [ ] `claws-cli/tests/errors/contract.unit.test.ts` — L0: 2 tests (DiagnosticError has all 4 fields, toDiagnostic produces correct structure)
- [ ] `claws-cli/tests/errors/codes.unit.test.ts` — L0: 1 test (all error codes in registry have description and category)
- [ ] `claws-cli/tests/color/color.unit.test.ts` — L0: 3 tests (risk tier mapping, severity mapping, NO_COLOR disables all color output)

## Acceptance Criteria

- [ ] DiagnosticError instances always contain WHAT, HOW, WHERE; docsUrl is optional with `claws help {code}` inline fallback when absent
- [ ] Error code registry covers OC-POLICY-E001 through OC-POLICY-E099 range with no gaps in allocated codes
- [ ] R1-R5 risk tiers each map to a distinct terminal color
- [ ] CRITICAL/HIGH/MEDIUM/LOW severities each map to a distinct terminal color
- [ ] Setting `NO_COLOR=1` disables all color output
- [ ] Setting `FORCE_COLOR=1` enables color even when not a TTY
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — error contract patterns, diagnostic output conventions
- `.craft/roles/claws/skill-author.md` — skill-facing error messages, docsUrl conventions

## Dependencies

- Pulse 01 (reference-workspace) — violation examples inform error code categories
- Pulse 02 (gateway-simulator) — audit entry types inform error context fields

## Test Gates

- [ ] L0 unit: 6 tests — error contract fields (2), error code registry completeness (1), color mapping and NO_COLOR support (3)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
