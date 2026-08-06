---
pulse: 9
slug: e2e-init-loop
plan: claws-e2e-infrastructure
depends_on: [7, 8]
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
checkpoint: 1
checkpoint_gate: true
---

# Pulse 09: E2E Init Loop (CP-1 Gate)

## Objective

Create the capstone end-to-end test that verifies the full zero-to-enforcement pipeline: starting from a raw OC workspace with no claws configuration, running claws init to scaffold the config, then running check and build to produce violations and enforcement artifacts, and finally loading those artifacts into GatewaySim to verify live enforcement.

This is the checkpoint gate for CP-1 (Foundation). It proves that the entire claws pipeline works from first touch (init) through governance enforcement. An L3 acceptance test provides the formal acceptance contract.

## Deliverables

- [ ] `claws-sdk/tests/e2e/init-to-enforcement.e2e.test.ts` — L2 e2e test with the following sequences:

  **Full workspace variant:**
  1. Copy reference workspace to temp dir (without claws.json and .claws/ directory)
  2. **Manually create** claws.json (T2 defaults) + .claws/ sidecar directory — **no `claws init` command** (init is a CP-2 deliverable, Pulses 10-11; the real init command is tested in CP-2 Pulse 18)
  3. Run claws check → reports violations with WHAT/HOW/WHERE
  4. Run claws build → generates enforcement artifacts (index.ts, manifest.json)
  5. Load generated artifacts into GatewaySim
  6. Fire send-email (R5) tool call → BLOCKED
  7. Verify full pipeline from manual configuration to live enforcement

  **Minimal workspace variant (R1 review SA-M03):** 8. Create temp dir with only SOUL.md + TOOLS.md (minimum viable OC workspace) 9. Manually create claws.json (T2 defaults) + .claws/ sidecar directory 10. Run claws check → reports violations (fewer than full workspace) 11. Run claws build → generates enforcement artifacts 12. Load generated artifacts into GatewaySim 13. Fire a tool call → verify enforcement works with minimal input 14. This exercises the platform detection fallback and validates that claws works without all 9 OC files

- [ ] `claws-sdk/tests/accept/e2e/init-to-enforcement.accept.test.ts` — L3 acceptance test:
  1. Same sequence as L2 full workspace variant but with formal acceptance assertions
  2. Verify claws.json matches expected schema after manual setup
  3. Verify .claws/ sidecar has expected directory structure
  4. Verify violation count and severity distribution match expectations
  5. Verify all generated artifacts are present and well-formed
  6. Verify GatewaySim enforcement matches expected behavior for all 5 risk tiers

## Acceptance Criteria

- [ ] Manual claws.json + .claws/ setup produces valid configuration in a bare OC workspace (no dependency on `claws init` which is CP-2)
- [ ] claws check on the configured workspace finds and reports violations
- [ ] claws build on the configured workspace generates all expected artifacts
- [ ] Generated index.ts loads into GatewaySim and enforces R5 tool blocking
- [ ] Full pipeline (manual config → check → build → enforce) completes without manual intervention
- [ ] Minimal workspace variant (SOUL.md + TOOLS.md only) completes the full pipeline successfully (R1 review SA-M03)
- [ ] L3 acceptance test passes with formal acceptance assertions
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/gateway-eng.md` — gateway enforcement, audit chain, full pipeline semantics
- `.craft/roles/claws/skill-author.md` — init experience, config defaults, first-run UX

## Dependencies

- Pulse 07 (e2e-compile-loop) — compile pipeline must work end-to-end
- Pulse 08 (e2e-check-loop) — check pipeline must work end-to-end

## Test Gates

- [ ] L2 e2e: 1 test — full init-to-enforcement pipeline
- [ ] L3 accept: 1 test — formal acceptance contract for CP-1 gate
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
