---
pulse: 3
slug: base-cli-formatters
plan: claws-base-cli
depends_on: [1, 2]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
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

# Pulse 03: Base CLI Formatters

## Objective

Create the output formatter suite for the claws CLI. These formatters transform violation objects into structured output for different consumers: SARIF 2.1.0 for CI/CD integration, JSON for programmatic consumption, CSV for fleet-scale reporting, and a human-readable terminal format with colored severity indicators.

Each formatter implements a common interface and is selected via the `--format` flag. The formatter registry maps format names to implementations and provides a default (terminal) when no flag is specified.

## Deliverables

- [ ] `claws-cli/src/format/sarif.ts` — SARIF 2.1.0 formatter: ruleId→rule mapping, level mapping (error/warning/note), location with file+line+column, tool.driver metadata. Uses `toSarifUri()` for all path fields.
- [ ] `claws-cli/src/format/sarif-uri.ts` — `toSarifUri(absolutePath, workspaceRoot)` normalizer: converts OS-native paths to workspace-relative POSIX URIs (forward slashes only). On Windows, replaces backslashes and strips drive letter prefix for relative URIs. (R1 review PE-M01)
- [ ] `claws-cli/src/format/json.ts` — JSON formatter with what/fix/docsUrl fields per violation
- [ ] `claws-cli/src/format/csv.ts` — CSV formatter for fleet reports (one row per violation: file, line, severity, ruleId, message)
- [ ] `claws-cli/src/format/default.ts` — Human-readable terminal formatter with colored severity (CRITICAL=bright-red, HIGH=red, MEDIUM=yellow, LOW=dim)
- [ ] `claws-cli/src/format/index.ts` — Formatter registry: `getFormatter(name)`, format selection by `--format` flag, default to terminal
- [ ] `claws-cli/tests/format/sarif-uri.unit.test.ts` — L0: 2 tests (toSarifUri converts Windows backslash paths to forward-slash URIs, toSarifUri produces workspace-relative paths)
- [ ] `claws-cli/tests/format/sarif.unit.test.ts` — L0: 2 tests (SARIF structure correct for fixture violations, level mapping matches severity). **Must assert no `uri` field in SARIF output contains a backslash** (R1 review PE-M01).
- [ ] `claws-cli/tests/format/json.unit.test.ts` — L0: 2 tests (JSON output has what/fix/docsUrl, array structure correct)
- [ ] `claws-cli/tests/format/csv.unit.test.ts` — L0: 2 tests (CSV header row, data rows match violations)
- [ ] `claws-cli/tests/format/default.unit.test.ts` — L0: 2 tests (terminal output includes severity prefix, color codes present when enabled)
- [ ] `claws-cli/tests/format/sarif-schema.integration.test.ts` — L1: 2 tests (SARIF output validates against official SARIF 2.1.0 JSON schema)

## Acceptance Criteria

- [ ] SARIF formatter produces valid SARIF 2.1.0 output with correct tool, rules, and results sections
- [ ] JSON formatter includes what, fix, and docsUrl for every violation
- [ ] CSV formatter produces valid CSV with header row and one data row per violation
- [ ] Terminal formatter shows colored severity indicators and human-readable messages
- [ ] `getFormatter('sarif' | 'json' | 'csv' | 'default')` returns the correct formatter
- [ ] Unknown format name throws a descriptive error
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — CLI output patterns, formatter registry conventions
- `.craft/roles/claws/platform-eng.md` — SARIF integration requirements, fleet reporting format

## Dependencies

- Pulse 01 (reference-workspace) — fixture violations used in formatter tests
- Pulse 02 (gateway-simulator) — audit entry types used in formatter input contracts

## Test Gates

- [ ] L0 unit: 8 tests — each formatter (sarif, json, csv, default) produces correct output for fixture violations (2 tests each)
- [ ] L1 integration: 2 tests — SARIF validates against official SARIF 2.1.0 JSON schema
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
