---
slug: claws-cli-foundation
preset: "claws"
plan: "3 headlines: claws pinch runs from terminal with colored pass/fail, claws build openclaw emits a plugin, claws compile produces serialized GovernanceIR"
area: claws
status: Draft
phase: ptah
atoms: [atom:pinch, atom:claws-init, atom:progressive-disclosure, atom:claws-json, atom:error-contract]
specs: [CL-01, CL-04, CL-03]
---

# claws-cli-foundation — CLI Binary + Core Commands

## Headlines

1. **H1: `claws pinch` runs from terminal with colored pass/fail output** — The `claws` binary is a Commander.js CLI with 3 core commands for Phase 1: `compile`, `pinch`, and `build`. `claws pinch` runs the full compile+analyze pipeline and renders results with colored output (green=PASS, red=FAIL high, yellow=FAIL medium) following the error contract (WHAT + HOW + WHERE). Each violation shows rule ID, severity, file:line, explanation, and remediation hint. Summary line shows total violations, severity breakdown, and elapsed time.
   - Validation: `claws pinch` on a fixture workspace with 2 violations prints colored output with rule IDs and file:line locations
   - Validation: `claws pinch --json` outputs machine-readable JSON array of violations
   - Validation: `claws pinch` exits with code 0 on clean workspace, code 1 on violations

2. **H2: `claws build openclaw` emits a working plugin to disk** — `claws build openclaw` runs the full pipeline (parse → extract → analyze → emit) and writes all 4 artifacts to the workspace: `skills/claws-governance/SKILL.md`, `plugins/claws-governance/index.ts`, `exec-approvals.json`, and `lobster.compiled.yaml`. Progress is shown with a spinner. Build time is printed. Errors abort with the error contract format.
   - Validation: `claws build openclaw` on a fixture workspace creates 4 files at expected paths
   - Validation: `claws build` with no target auto-detects the platform from workspace marker files
   - Validation: Build failure (e.g., R5 fail-open violation) prints WHAT happened, HOW to fix it, and WHERE in the docs

3. **H3: `claws compile` produces serialized GovernanceIR to disk** — `claws compile` runs phases 1-3 (parse, extract, analyze) and writes the GovernanceIR to `.claws/compiled/governance-ir.json`. This is the intermediate artifact that `claws build`, `claws pinch`, and future commands (`claws inspect`, `claws diff`) consume. Subsequent `claws build` reads the cached IR instead of recompiling if the workspace files have not changed (hash-based cache check).
   - Validation: `claws compile` produces `.claws/compiled/governance-ir.json` with valid JSON
   - Validation: Second `claws compile` with unchanged files skips recompilation (prints "up to date")
   - Validation: `claws compile --force` recompiles even if cache is valid

## Summary

This plan wires the SDK pipeline to a real terminal binary. The claws-cli package gets Commander.js setup with 3 core commands (compile, pinch, build), inline output formatting (Phase 1 has no claws-base-cli), platform auto-detection, and the error contract (WHAT + HOW + WHERE). This is the minimum CLI surface that makes `claws` usable from a terminal for Phase 1. The remaining 37 commands ship in Phase 2+ when claws-base-cli provides proper output infrastructure.

## Coverage Contract

### Specs
- [ ] CL-01 — 3 core commands (compile, pinch, build), progressive disclosure, bare `claws` invocation, --json flag, exit codes
- [ ] CL-04 — Full pipeline wiring: parse → extract → analyze → emit, GovernanceIR serialization
- [ ] CL-03 — Platform detection (workspace marker files), CLAWS_BYPASS=1 handling

### Concept Guides
- [ ] docs/claws/cli/getting-started.md — NEW: first-use walkthrough (init → build → pinch)
- [ ] docs/claws/cli/error-contract.md — NEW: WHAT + HOW + WHERE error format

### Scenario Coverage
- [ ] cli/pinch-clean-workspace — claws pinch on workspace with no violations
- [ ] cli/pinch-with-violations — claws pinch on workspace with 3 violations (high, medium, low)
- [ ] cli/pinch-json-output — claws pinch --json produces valid JSON
- [ ] cli/build-openclaw — claws build openclaw writes 4 artifacts
- [ ] cli/build-auto-detect — claws build auto-detects platform from SOUL.md
- [ ] cli/compile-cache-hit — second compile skips work when files unchanged
- [ ] cli/compile-force — claws compile --force recompiles
- [ ] cli/bare-invocation — claws with no args shows workspace-aware status
- [ ] cli/bypass-active — CLAWS_BYPASS=1 skips governance, prints warning

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 12 | Output formatting (4), color logic (2), error contract (2), platform detection (2), cache check (2) |
| L1 integration | 5 | Commander.js command registration, flag parsing, pipeline wiring |
| L2 e2e | 4 | Full `claws compile`, `claws pinch`, `claws build`, bare `claws` on fixture workspaces |
| L3 acceptance | 2 | End-to-end `claws pinch` and `claws build openclaw` on realistic workspace |

## Scope

- `claws-cli/src/cli.ts` (NEW) — Commander.js program setup, 3 command registrations, global flags (--json, --no-color, --verbose, --force)
- `claws-cli/src/index.ts` (EDIT) — Entry point wires cli.ts, handles uncaught errors
- `claws-cli/bin/claws.js` (EDIT) — Shebang entry, imports index.ts
- `claws-cli/src/commands/build.ts` (NEW) — `claws compile`, `claws build [target]` commands: pipeline orchestration, artifact writing
- `claws-cli/src/commands/pinch.ts` (NEW) — `claws pinch` command: compile + analyze + render violations
- `claws-cli/src/hooks/pre-command.ts` (NEW) — Load claws.json, detect platform, check CLAWS_BYPASS=1
- `claws-cli/src/hooks/post-command.ts` (NEW) — Cleanup, timing
- `claws-cli/src/output/format-default.ts` (NEW) — Human-readable terminal output (colored pass/fail, violation details, summary)
- `claws-cli/src/output/format-json.ts` (NEW) — JSON output mode for --json flag
- `claws-cli/src/output/color.ts` (NEW) — Risk-level coloring (green=pass, red=high, yellow=medium, dim=low), NO_COLOR support
- `claws-cli/src/output/errors.ts` (NEW) — Error contract renderer (WHAT + HOW + WHERE)
- `claws-cli/src/core/platform-detect.ts` (NEW) — Auto-detect platform from workspace marker files (SOUL.md, .cursorrules, CLAUDE.md)
- `claws-cli/src/core/cache.ts` (NEW) — Hash-based cache check for GovernanceIR recompilation

## Deliverables

### Specs & Design
- [ ] CL-01 amendment — Phase 1 command surface finalized (compile, pinch, build only)

### CLI Commands (claws-cli)
- [ ] claws-cli/src/cli.ts — Commander.js program with 3 commands + global flags
- [ ] claws-cli/src/commands/build.ts — compile + build commands, pipeline orchestration
- [ ] claws-cli/src/commands/pinch.ts — pinch command, violation rendering
- [ ] claws-cli/src/hooks/pre-command.ts — config loading, platform detection, bypass check
- [ ] claws-cli/src/hooks/post-command.ts — cleanup, timing

### Output Formatting (inline, Phase 1 — moves to claws-base-cli in Phase 2)
- [ ] claws-cli/src/output/format-default.ts — human-readable colored output
- [ ] claws-cli/src/output/format-json.ts — JSON output mode
- [ ] claws-cli/src/output/color.ts — risk-level coloring with NO_COLOR support
- [ ] claws-cli/src/output/errors.ts — WHAT + HOW + WHERE error contract

### Core Utilities (inline, Phase 1)
- [ ] claws-cli/src/core/platform-detect.ts — workspace marker file detection
- [ ] claws-cli/src/core/cache.ts — hash-based GovernanceIR cache

### Tests
- [ ] claws-cli/tests/commands/pinch.unit.test.ts — violation rendering, exit codes
- [ ] claws-cli/tests/commands/build.unit.test.ts — artifact path generation, pipeline wiring
- [ ] claws-cli/tests/output/format-default.unit.test.ts — colored output formatting
- [ ] claws-cli/tests/output/format-json.unit.test.ts — JSON schema compliance
- [ ] claws-cli/tests/output/color.unit.test.ts — NO_COLOR handling, risk-level mapping
- [ ] claws-cli/tests/output/errors.unit.test.ts — error contract formatting
- [ ] claws-cli/tests/core/platform-detect.unit.test.ts — marker file detection
- [ ] claws-cli/tests/core/cache.unit.test.ts — hash comparison, force flag
- [ ] claws-cli/tests/commands/pinch.e2e.test.ts — full pinch on fixture workspace
- [ ] claws-cli/tests/commands/build.e2e.test.ts — full build on fixture workspace
- [ ] claws-cli/tests/fixtures/ (NEW) — OC workspace fixtures for CLI testing

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## Out of Scope

- GovernanceIR types (that's claws-governance-ir plan)
- Parsing logic (that's claws-parse plan)
- Rule engine (that's claws-rules plan)
- Emit logic (that's claws-emit plan — CLI calls SDK emit functions)
- claws-base-cli package (Phase 2 extraction of inline output modules)
- `claws init` command (Phase 2 — requires template system)
- `claws inspect`, `claws diff`, `claws doctor`, `claws amend` commands (Phase 2+)
- `claws pinch --fix`, `claws pinch --watch`, `claws pinch --staged` (Phase 2+)
- Fleet commands: scan, broadcast, drift, report, push, kill (Phase 2+)
- Comply/audit/snap/protect/live/maker commands (Phase 2-3)
- SARIF output format (Phase 2 when claws-base-cli ships)
- Progress bar for fleet operations (Phase 2+)
- TUI / interactive mode (not planned for claws v1)

## Notes

- claws-cli is a THIN adapter: it parses arguments, calls claws-sdk functions, and renders results. No business logic.
- Phase 1 inlines output formatting directly in claws-cli per ARCHITECTURE.md M-01. These modules (format-default.ts, format-json.ts, color.ts, errors.ts) move to claws-base-cli in Phase 2.
- Commander.js is the argument parser (same as craft-cli). Version, help, and error handling are built in.
- The `claws` bare invocation is workspace-aware: it checks for claws.json and shows next steps (CL-01 design).
- CLAWS_BYPASS=1 is checked in pre-command hook and short-circuits all governance evaluation.
- Exit codes: 0=success/clean, 1=violations found, 2=error/crash.
- `--json` flag works on all commands — it switches output from format-default.ts to format-json.ts.
- Depends on all 4 prior plans: claws-governance-ir (types), claws-parse (parse), claws-rules (analyze), claws-emit (emit)
