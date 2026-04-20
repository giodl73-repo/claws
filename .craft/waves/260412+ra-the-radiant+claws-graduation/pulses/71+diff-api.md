---
pulse: 71
slug: diff-api
plan: claws-cap-integration
depends_on: [66, 70]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 71: Diff API

## Objective

`GET /api/diff?from={v}&to={v}` — compares two governance states and returns a
structured diff with oc:// paths for every change. Supports version numbers,
dates, snapshot names, and `current` as special value.

Use cases: "what changed in the last upgrade?", "when did send-email become R5?",
"show me the diff between pre-upgrade snapshot and now", "audit correlation — what
governance state produced this audit event?"

Business logic in claws-sdk (GovernanceIR differ). Route in claws-serve.

## Deliverables

- [ ] `claws-sdk/src/workspace/governance-diff.ts` — GovernanceDiff. Accepts two GovernanceIR instances, produces a structured diff: added/modified/removed items with oc:// paths, before/after values, changedAt version, changedBy source.
- [ ] `claws-sdk/src/workspace/diff-types.ts` — DiffResult, DiffEntry (path, type, field, before, after, changedAt, changedBy), DiffSummary (added, modified, removed counts).
- [ ] `claws-serve/src/routes/diff.ts` — GET /api/diff route. Resolves from/to via version-resolver (pulse 70), computes diff, returns structured JSON.
- [ ] `claws-sdk/tests/workspace/governance-diff.unit.test.ts` — L0: 6 tests (no changes, tool added, tool removed, risk changed, multiple changes, deny rule added/removed).
- [ ] `claws-serve/tests/routes/diff.integration.test.ts` — L1: 4 tests (diff between versions, diff with snapshot, diff with date, diff from=v1&to=current).
- [ ] `claws-serve/tests/e2e/diff.e2e.test.ts` — L2: 2 tests (PATCH twice → diff shows both changes, diff between snapshot and current after upgrade).
- [ ] L3 acceptance: "When did send-email become R5?" — create workspace with R3 tool, PATCH to add OBO capability → recompile detects R5 → diff shows risk change with oc:// path + version.

## Acceptance Criteria

- [ ] GET /api/diff?from=v38&to=v43 returns changes between those versions
- [ ] Each change entry includes oc:// path, before/after values, changedAt version
- [ ] Changes include changedBy source (PATCH endpoint, recompilation, external edit)
- [ ] from=snap:pre-upgrade&to=current works
- [ ] from=current&to=current returns empty diff
- [ ] Missing version in from/to returns 404 with available range
- [ ] Summary includes add/modify/remove counts

## Test Gates

- [ ] L0 unit (6 tests): GovernanceIR differ with various change types
- [ ] L1 integration (4 tests): version resolution + diff computation
- [ ] L2 e2e (2 tests): full PATCH → version → diff round-trip
- [ ] L3 accept (1 test): risk drift detection end-to-end
