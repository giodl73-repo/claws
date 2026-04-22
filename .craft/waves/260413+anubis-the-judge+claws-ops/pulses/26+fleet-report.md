---
pulse: 26
slug: fleet-report
plan: claws-fleet-ops
depends_on: [22, 23]
governing_roles: [claws:compliance, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 26: Fleet Report

## Objective

Implement fleet-level compliance reporting — aggregating governance statistics, drift status, broadcast history, and compliance state across all discovered workspaces into a structured report. The compliance matrix cross-references workspaces against governance frameworks (SOC2, ISO 27001, custom policies) showing pass/fail/missing per cell.

Fleet report is the executive visibility layer: it answers "what is the governance posture of our entire fleet right now?" in CSV, JSON, or formatted table output suitable for dashboards, audits, and compliance reviews.

## Deliverables

- [ ] `claws-sdk/src/fleet/report.ts` — Aggregate fleet statistics: total workspaces, governed/ungoverned/misconfigured counts, drift status per workspace, kill status, last broadcast timestamp; returns FleetReport with summary + per-workspace detail
- [ ] `claws-sdk/src/fleet/compliance-matrix.ts` — Workspace × framework compliance table: for each workspace, check which policy frameworks are applied (SOC2, ISO 27001, custom), governance check pass/fail status, trust tier; returns ComplianceMatrix as 2D structure (workspace rows, framework columns)
- [ ] `claws-sdk/src/fleet/report-format.ts` — Three output formats: CSV (for spreadsheet import), JSON (for API consumption), table (for terminal display with aligned columns and ANSI colors)
- [ ] `claws-cli/src/commands/report.ts` — CLI command: `claws report [--fleet dir] [--format csv|json|table]`
- [ ] `claws-sdk/tests/fleet/report.unit.test.ts` — L0 unit tests (4 tests)
- [ ] `claws-sdk/tests/fleet/report.integration.test.ts` — L1 integration tests (2 tests)
- [ ] `claws-sdk/tests/fleet/report.e2e.test.ts` — L2 e2e: scan 3 fixture workspaces → generate report in all 3 formats (csv, json, table) → verify CSV has correct headers + rows, JSON validates against FleetReport schema, all formats contain consistent data

## Acceptance Criteria

- [ ] `claws report --fleet ./workspaces` produces fleet-wide governance summary
- [ ] Report includes governed/ungoverned/misconfigured counts
- [ ] Compliance matrix shows workspace × framework with pass/fail/missing cells
- [ ] `--format csv` produces valid CSV with headers
- [ ] `--format json` produces valid JSON matching FleetReport schema
- [ ] `--format table` produces aligned terminal table with ANSI color coding
- [ ] Default format is table when stdout is TTY, JSON when piped
- [ ] Report includes drift status and kill status per workspace
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/compliance.md` — compliance reporting requirements, framework coverage, audit formats
- `.craft/roles/claws/platform-eng.md` — fleet architecture, aggregation patterns

## Dependencies

Pulse 22 (fleet-drift) — requires drift detection for per-workspace drift status.
Pulse 23 (fleet-broadcast) — requires broadcast history for reporting.

## Test Gates

- [ ] L0 unit (4 tests): compliance matrix computation produces correct workspace × framework grid, CSV format output is valid CSV with correct headers, JSON format output validates against FleetReport schema, table format output has aligned columns
- [ ] L1 integration (2 tests): report on 3 fixture workspaces produces expected compliance matrix with correct classifications, all 3 format outputs (csv/json/table) contain consistent data
- [ ] L2 e2e (1 test): scan 3 fixtures → generate report in csv/json/table → verify CSV headers + rows, JSON validates FleetReport schema, all formats consistent
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
