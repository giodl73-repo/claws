---
pulse: 21
slug: snap-diff
plan: claws-snap-restore
depends_on: [19]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
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

# Pulse 21: Snapshot Diff

## Objective

Implement governance-aware semantic diffing between two named snapshots. Unlike file-level diffs, snap diff compiles both snapshots through the analysis pipeline and compares the resulting GovernanceIR: tool risk changes, policy additions/removals, new/resolved violations, and trust tier shifts. The output is a structured SnapshotDiff with categorized changes, rendered to the terminal with color-coded semantics (green for improvements, red for regressions, yellow for neutral changes).

This is the diagnostic tool that lets operators understand what changed in governance posture between two points in time — essential for pre-promote verification and drift investigation.

## Deliverables

- [ ] `claws-sdk/src/snapshot/diff.ts` — Governance-aware semantic diff engine: load both snapshots, load pre-compiled GovernanceIR from snapshots instead of recompiling (no compilation step in diff), compare GovernanceIR results; output SnapshotDiff with categorized changes: tool risk escalations/de-escalations, policy additions/removals, new violations, resolved violations, trust tier shifts
- [ ] `claws-sdk/src/snapshot/diff-renderer.ts` — Terminal renderer for SnapshotDiff: color-coded output (green=improvement/resolved, red=regression/escalation, yellow=neutral change); summary statistics (total changes, regressions, improvements)
- [ ] `claws-cli/src/commands/snap.ts` — Add `claws snap diff [name1] [name2]` subcommand to existing snap command
- [ ] `claws-sdk/tests/snapshot/diff.unit.test.ts` — L0 unit tests (5 tests)
- [ ] `claws-sdk/tests/snapshot/diff.integration.test.ts` — L1 integration tests (2 tests)
- [ ] `claws-sdk/tests/snapshot/diff.e2e.test.ts` — L2 e2e: save snap1 on reference workspace → modify policy (escalate tool risk R3→R5, add violation) → save snap2 → diff → verify categorized output shows escalation as regression and new violation

## Acceptance Criteria

- [ ] `claws snap diff snap1 snap2` produces a categorized governance diff, not a file-level diff
- [ ] Tool risk escalation (e.g., R3 → R5) is detected and reported as a regression
- [ ] Tool risk de-escalation (e.g., R5 → R3) is detected and reported as an improvement
- [ ] New violations appear as regressions, resolved violations as improvements
- [ ] Policy additions and removals are reported with their governance impact
- [ ] Trust tier shifts are prominently displayed
- [ ] Terminal output uses color coding: green for improvements, red for regressions, yellow for changes
- [ ] Diff between identical snapshots produces empty diff with "no changes" message
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — SDK architecture, compilation pipeline conventions
- `.craft/roles/claws/gateway-eng.md` — GovernanceIR structure, risk tier semantics, violation model

## Dependencies

Pulse 19 (snap-save-restore) — requires snapshot save/restore and manifest infrastructure.

## Test Gates

- [ ] L0 unit (5 tests): diff detects tool risk escalation (R3→R5), diff detects new violation as regression, diff detects resolved violation as improvement, diff detects policy addition/removal, diff detects trust tier shift
- [ ] L1 integration (2 tests): diff between two snapshots of reference workspace with known governance changes produces expected categorized output, diff between identical snapshots produces empty diff
- [ ] L2 e2e (1 test): save snap1 → modify policy (escalate R3→R5, add violation) → save snap2 → diff → verify escalation as regression + new violation in categorized output
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
