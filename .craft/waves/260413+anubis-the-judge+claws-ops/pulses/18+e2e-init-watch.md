---
pulse: 18
slug: e2e-init-watch
plan: claws-three-rings
depends_on: [14, 16, 17]
governing_roles: [claws:gateway-eng, claws:skill-author]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: true
---

# Pulse 18: E2E Init + Watch Loop

## Objective

Write the CP-2 gate e2e test that exercises the full init → watch → doctor → build → enforce loop. This test is the integration proof that all CP-2 deliverables (init orchestrator, templates, uninstall, watch core, watch recompile, doctor checks, doctor migrate, and amend pipeline) work together as a coherent system.

The e2e test starts from scratch: initializes a workspace with the SOC2 template, starts the watch loop, edits TOOLS.md to add a high-risk tool, verifies the watcher detects the violation, runs doctor to confirm workspace health, builds artifacts, and loads them into gateway-sim to verify enforcement. The L3 acceptance test wraps the same scenario in the acceptance harness format.

## Deliverables

- [ ] `claws-sdk/tests/e2e/init-watch-loop.e2e.test.ts` — L2 e2e test exercising the full loop:
  1. `claws init --template soc2` on reference workspace
  2. Start `claws watch` in background
  3. Edit TOOLS.md: add shell-exec R5 tool
  4. Verify watch reports G-CLASS violation within 1s
  5. `claws doctor` → reports no issues (clean workspace state)
  6. `claws build` → artifacts reflect new tool (blocked by SOC2 tool_blocklist)
  7. Load into gateway-sim → shell-exec BLOCKED
- [ ] `claws-sdk/tests/accept/e2e/init-watch-enforce.accept.test.ts` — L3 acceptance test wrapping the same scenario in acceptance harness format

## Acceptance Criteria

- [ ] E2e test runs end-to-end without manual intervention
- [ ] Init with SOC2 template produces valid workspace with policies
- [ ] Watch detects TOOLS.md edit and reports G-CLASS violation within 1s
- [ ] Doctor reports no infrastructure issues on the initialized workspace
- [ ] Build produces artifacts that reflect the SOC2 tool_blocklist enforcement
- [ ] Gateway-sim correctly blocks shell-exec tool based on compiled artifacts
- [ ] Acceptance test produces structured pass/fail output compatible with harness
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — e2e test patterns, gateway-sim usage, enforcement verification
- `.craft/roles/claws/skill-author.md` — SOC2 template expectations, tool governance semantics

## Dependencies

- Pulse 14: watch recompile (auto-analyze + auto-recompile in watch loop)
- Pulse 16: doctor migrate (doctor --post-upgrade integration)
- Pulse 17: amend pipeline (amendment validation against GovernanceIR)

## Test Gates

- [ ] L2 e2e: 1 test — full init → watch → edit → violation → doctor → build → gateway-sim enforce loop
- [ ] L3 acceptance: 1 test — same scenario in acceptance harness format with structured pass/fail output
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
