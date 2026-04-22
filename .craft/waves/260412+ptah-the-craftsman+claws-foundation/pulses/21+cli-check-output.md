---
pulse: 21
slug: cli-check-output
plan: claws-cli-foundation
depends_on: [20]
governing_roles: [craft:navigator, claws:new-hire, claws:power-user]
scenario_codes: [cli/check-clean-workspace, cli/check-with-violations, cli/check-json-output]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && npx vitest run tests/commands/check.unit.test.ts"
    - "cd claws-cli && npx vitest run tests/output/format-default.unit.test.ts"
    - "cd claws-cli && npx vitest run tests/output/color.unit.test.ts"
    - "cd claws-cli && npx vitest run tests/output/errors.unit.test.ts"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 21: `claws check` Colored Output + Error Contract

## Objective

Implement the `claws check` command which runs the full compile+analyze pipeline and renders colored terminal output. Green PASS for clean skills, red FAIL for high-severity violations, yellow WARN for medium. Each violation shows rule ID, severity, file:line, explanation, and remediation hint following the error contract (WHAT happened + HOW to fix + WHERE in docs). `--json` flag outputs machine-readable JSON array. Exit code 0 for clean workspace, 1 for violations.

## Deliverables

- [ ] `claws-cli/src/commands/check.ts` -- NEW: `claws check` command, compile + analyze + render violations
- [ ] `claws-cli/src/output/format-default.ts` -- NEW: human-readable colored output (pass/fail, violation details, summary line)
- [ ] `claws-cli/src/output/format-json.ts` -- NEW: JSON output mode for --json flag
- [ ] `claws-cli/src/output/color.ts` -- NEW: risk-level coloring (green=pass, red=high, yellow=medium, dim=low), NO_COLOR support
- [ ] `claws-cli/src/output/errors.ts` -- NEW: WHAT + HOW + WHERE error contract renderer
- [ ] `claws-cli/tests/commands/check.unit.test.ts` -- NEW: check command violation rendering, exit codes, --json flag
- [ ] `claws-cli/tests/output/format-default.unit.test.ts` -- NEW: colored output formatting
- [ ] `claws-cli/tests/output/color.unit.test.ts` -- NEW: NO_COLOR handling, risk-level color mapping
- [ ] `claws-cli/tests/output/errors.unit.test.ts` -- NEW: error contract formatting (WHAT + HOW + WHERE)
- [ ] `claws-cli/tests/commands/check.integration.test.ts` -- NEW: check on fixture workspace with violations
- [ ] `claws-cli/tests/commands/check.e2e.test.ts` -- NEW: full `claws check` on fixture workspace

## TDD Tests

### L0 Unit (5)

- `claws check` on clean workspace renders green PASS with summary line -> `claws-cli/tests/commands/check.unit.test.ts`
- `claws check` on workspace with violations renders red FAIL with rule ID, severity, file:line -> `claws-cli/tests/commands/check.unit.test.ts`
- Error contract renderer produces WHAT + HOW + WHERE sections for each violation -> `claws-cli/tests/output/errors.unit.test.ts`
- NO_COLOR environment variable disables all color output -> `claws-cli/tests/output/color.unit.test.ts`
- `claws check --json` outputs valid JSON array of violation objects -> `claws-cli/tests/commands/check.unit.test.ts`

### L1 Integration (2)

- `claws check` on fixture workspace with 3 violations (high, medium, low) renders correct colors and exit code 1 -> `claws-cli/tests/commands/check.integration.test.ts`
- `claws check --json` on fixture workspace produces parseable JSON with rule IDs matching default output -> `claws-cli/tests/commands/check.integration.test.ts`

### L2 E2E (1)

- Full `claws check` on fixture workspace renders colored output with violation count, severity breakdown, and elapsed time -> `claws-cli/tests/commands/check.e2e.test.ts`

## Key Constraints

- Output formatting is inline in claws-cli for Phase 1 (moves to claws-base-cli in Phase 2 per ARCHITECTURE.md M-01)
- Error contract: every error shows WHAT happened, HOW to fix it, and WHERE in docs to learn more
- Color mapping: green=PASS, red=FAIL high severity, yellow=FAIL medium severity, dim=FAIL low severity
- Respects NO_COLOR env var and --no-color flag (per https://no-color.org/)
- Summary line format: "N violations (H high, M medium, L low) in Xs"
- Exit codes: 0=clean (no violations), 1=violations found
- --json flag produces array of objects with: rule, severity, file, line, message, remediation
- claws-cli is a thin adapter: rendering logic is isolated in output/ modules, business logic stays in SDK

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/navigator.md` -- CLI command flow, output rendering patterns
- `.craft/roles/claws/new-hire.md` -- error message clarity, first-time user experience
- `.craft/roles/claws/power-user.md` -- --json flag, advanced filtering, workflow integration

## Dependencies

- Pulse 20 (cli-commander-compile) -- Commander.js program + compile command

## Verification Gate

```bash
cd claws-cli && npx vitest run tests/commands/check.unit.test.ts
cd claws-cli && npx vitest run tests/output/format-default.unit.test.ts
cd claws-cli && npx vitest run tests/output/color.unit.test.ts
cd claws-cli && npx vitest run tests/output/errors.unit.test.ts
cd claws-cli && npx tsc --noEmit
npm run build
```
