---
pulse: 20
slug: cli-commander-compile
plan: claws-cli-foundation
depends_on: [16, 19]
governing_roles: [craft:navigator, claws:new-hire]
scenario_codes: [cli/bare-invocation, cli/compile-cache-hit, cli/compile-force]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && npx vitest run tests/commands/compile.unit.test.ts"
    - "cd claws-cli && npx vitest run tests/cli.unit.test.ts"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 20: Commander.js Setup + `claws compile`

## Objective

Set up the Commander.js program in claws-cli with 3 command registrations (compile, check, build) and global flags (--json, --no-color, --verbose, --force). Implement the `claws compile` command which runs the parse+extract+analyze pipeline and writes the GovernanceIR to `.claws/compiled/governance-ir.json`. Bare `claws` invocation (no args) shows workspace-aware status with next steps.

## Deliverables

- [ ] `claws-cli/src/cli.ts` -- NEW: Commander.js program with 3 command registrations + global flags (--json, --no-color, --verbose, --force)
- [ ] `claws-cli/src/index.ts` -- EDIT: wire cli.ts, handle uncaught errors with error contract format
- [ ] `claws-cli/bin/claws.js` -- EDIT: shebang entry imports index.ts
- [ ] `claws-cli/src/commands/compile.ts` -- NEW: `claws compile` command, calls SDK parse+extract+analyze, writes .claws/compiled/governance-ir.json
- [ ] `claws-cli/src/hooks/pre-command.ts` -- NEW: load claws.json, check CLAWS_BYPASS=1, detect workspace
- [ ] `claws-cli/src/hooks/post-command.ts` -- NEW: timing, cleanup
- [ ] `claws-cli/tests/cli.unit.test.ts` -- NEW: Commander.js program setup, command registration, global flag parsing
- [ ] `claws-cli/tests/commands/compile.unit.test.ts` -- NEW: compile command pipeline wiring, IR output, cache check
- [ ] `claws-cli/tests/commands/compile.integration.test.ts` -- NEW: compile command with fixture workspace
- [ ] `claws-cli/tests/commands/compile.e2e.test.ts` -- NEW: full `claws compile` on fixture workspace

## TDD Tests

### L0 Unit (5)

- Commander.js program registers 3 commands (compile, check, build) with correct names -> `claws-cli/tests/cli.unit.test.ts`
- Global flags (--json, --no-color, --verbose, --force) are parsed and propagated to command context -> `claws-cli/tests/cli.unit.test.ts`
- `claws compile` calls SDK parse+extract+analyze in sequence and writes governance-ir.json -> `claws-cli/tests/commands/compile.unit.test.ts`
- Bare `claws` invocation detects workspace (claws.json present) and shows status -> `claws-cli/tests/cli.unit.test.ts`
- CLAWS_BYPASS=1 environment variable short-circuits all governance evaluation with warning -> `claws-cli/tests/commands/compile.unit.test.ts`

### L1 Integration (2)

- `claws compile` on fixture workspace produces valid governance-ir.json at expected path -> `claws-cli/tests/commands/compile.integration.test.ts`
- Pre-command hook loads claws.json and propagates platform context to compile command -> `claws-cli/tests/commands/compile.integration.test.ts`

### L2 E2E (1)

- Full `claws compile` on fixture workspace writes .claws/compiled/governance-ir.json with valid GovernanceIR -> `claws-cli/tests/commands/compile.e2e.test.ts`

## Key Constraints

- claws-cli is a THIN adapter: parse args, call SDK functions, render results. No business logic in the CLI.
- Commander.js is the argument parser (same pattern as craft-cli)
- Exit codes: 0=success, 1=violations, 2=error/crash
- --json flag switches all output to JSON mode (prepare for format-json.ts in pulse 21)
- CLAWS_BYPASS=1 is checked in pre-command hook, short-circuits governance, prints warning
- Depends on claws-governance-ir (pulse 03-05), claws-parse (pulse 09-12), claws-rules (pulse 16-19) from prior checkpoints

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/navigator.md` -- CLI command flow, pipeline threading, progress reporting
- `.craft/roles/claws/new-hire.md` -- first-run experience, discoverability, progressive disclosure

## Dependencies

- Pulse 16 (claws-rules) -- analyze pipeline functions called by compile
- Pulse 19 (claws-emit checkpoint) -- full pipeline available from SDK

## Verification Gate

```bash
cd claws-cli && npx vitest run tests/commands/compile.unit.test.ts
cd claws-cli && npx vitest run tests/cli.unit.test.ts
cd claws-cli && npx tsc --noEmit
npm run build
```

## Review Amendments (R1)

### C01: claws init Command
- [ ] Add `claws init` command: auto-detect platform, create minimal claws.json, create .claws/ sidecar
- [ ] `claws init --template soc2` scaffolds with SOC2 policy template
- [ ] Bare `claws` invocation with no config suggests running `claws init`
- [ ] Output: "Detected: OpenClaw. Created claws.json + .claws/. Run `claws check` to check governance."

### C05: CLAWS_BYPASS Audit
- [ ] CLAWS_BYPASS=1 MUST write audit event (AuditEvent with eventType: "BYPASS_ACTIVATED") to .claws/audit/chain.jsonl
- [ ] Warning message: "Governance checks skipped" (neutral, not scolding)
- [ ] Support granular suppression via claws.json `suppress` array (rule IDs to skip)
- [ ] Binary bypass (CLAWS_BYPASS=1) remains as nuclear option

### C09: Error Contract for All Commands
- [ ] All 4 commands (init, compile, check, build) wire through shared `output/errors.ts`
- [ ] Error contract: WHAT happened + HOW to fix + WHERE in docs
- [ ] Not just check — compile errors and build errors follow same format
