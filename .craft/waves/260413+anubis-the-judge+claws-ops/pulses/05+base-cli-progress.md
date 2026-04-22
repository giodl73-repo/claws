---
pulse: 5
slug: base-cli-progress
plan: claws-base-cli
depends_on: [3, 4]
governing_roles: [craft:navigator, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
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

# Pulse 05: Base CLI Progress UI

## Objective

Create the terminal UI components for the claws CLI: progress bar, spinner, banner, and table renderer. These components provide consistent visual feedback during long-running operations (compile, check, build) and structured data display for results.

All UI components must respect the color system from Pulse 04 (NO_COLOR/FORCE_COLOR), degrade gracefully when not connected to a TTY (no ANSI escape codes), and produce deterministic output for testing.

## Deliverables

- [ ] `claws-cli/src/ui/progress.ts` — Progress bar with percentage display and ETA calculation; `start(total)`, `tick(n)`, `done()` lifecycle; renders `[████░░░░░░] 40% ETA 3s` style output
- [ ] `claws-cli/src/ui/spinner.ts` — Spinner with status text; `start(message)`, `update(message)`, `succeed(message)`, `fail(message)` lifecycle; completes with checkmark or cross
- [ ] `claws-cli/src/ui/banner.ts` — claws banner with version number, rendered on CLI startup; ASCII art or styled text header
- [ ] `claws-cli/src/ui/table.ts` — Table renderer with fixed-width columns, left/right alignment per column, header row, separator row; used for violation summaries and report output
- [ ] `claws-cli/tests/ui/progress.unit.test.ts` — L0: 1 test (progress bar output format matches expected pattern at various percentages)
- [ ] `claws-cli/tests/ui/spinner.unit.test.ts` — L0: 1 test (spinner states: running shows spinner char, succeed shows checkmark, fail shows cross)
- [ ] `claws-cli/tests/ui/banner.unit.test.ts` — L0: 1 test (banner includes version string and "claws" name)
- [ ] `claws-cli/tests/ui/table.unit.test.ts` — L0: 1 test (table alignment: columns align, header separated, rows match fixture data)

## Acceptance Criteria

- [ ] Progress bar shows percentage and ETA, updates in-place on TTY
- [ ] Spinner cycles through animation frames and completes with checkmark/cross
- [ ] Banner displays claws name and version number
- [ ] Table renderer aligns columns correctly with configurable width and alignment
- [ ] All UI components produce no ANSI codes when NO_COLOR=1 or not a TTY
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/navigator.md` — UX patterns, progress feedback conventions
- `.craft/roles/claws/platform-eng.md` — CLI rendering, TTY detection, cross-platform terminal compatibility

## Dependencies

- Pulse 03 (base-cli-formatters) — formatters consume table renderer for structured output
- Pulse 04 (base-cli-error-contract) — color system used by all UI components

## Test Gates

- [ ] L0 unit: 4 tests — progress output format (1), spinner states (1), banner version (1), table alignment (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
