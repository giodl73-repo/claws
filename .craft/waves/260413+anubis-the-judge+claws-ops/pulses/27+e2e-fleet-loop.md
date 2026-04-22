---
pulse: 27
slug: e2e-fleet-loop
plan: claws-fleet-ops
depends_on: [24, 25, 26]
governing_roles: [claws:gateway-eng, claws:ciso]
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
checkpoint: 3
checkpoint_gate: true
---

# Pulse 27: E2E Fleet Operations Loop

## Objective

Write the end-to-end integration test that exercises the full fleet operations lifecycle in sequence: scan, broadcast, drift detection, snapshot, kill, and audit verification. This is the checkpoint gate for CP-3 — it proves that all snapshot and fleet primitives compose correctly into a coherent operational workflow.

The e2e test creates temporary workspace directories from fixtures, runs the full fleet command sequence, and verifies that each operation produces the expected state transitions and audit records. The L3 acceptance test validates the same lifecycle against the acceptance harness contract.

## Deliverables

- [ ] `claws-sdk/tests/e2e/fleet-operations.e2e.test.ts` — L2 e2e test exercising the full fleet lifecycle:
  1. Create 3 temp workspace dirs from fixtures (governed, ungoverned, misconfigured)
  2. `claws scan` → discovers all 3, classifies correctly (GOVERNED, UNGOVERNED, MISCONFIGURED)
  3. `claws broadcast soc2.yaml` → pushes policy to governed workspaces only, skips ungoverned/misconfigured
  4. Modify one governed workspace (lower trust tier manually) → introduce drift
  5. `claws drift` → detects drift on modified workspace, classifies as CRITICAL
  6. `claws snap save` → snapshot all governed workspaces, verify manifests have correct hashes
  7. `claws kill --fleet` → sentinel file in all governed workspaces, audit recorded
  8. Verify audit chains across all workspaces: BROADCAST, DRIFT_DETECTED, SNAPSHOT_SAVED, KILL_ACTIVATED events present with correct timestamps and metadata
- [ ] `claws-sdk/tests/accept/e2e/fleet-lifecycle.accept.test.ts` — L3 acceptance test validating fleet lifecycle against acceptance harness contract: workspace discovery accuracy, broadcast atomicity, drift detection sensitivity, kill switch reliability, audit chain completeness

## Acceptance Criteria

- [ ] E2e test creates 3 temp workspaces and cleans up after itself
- [ ] Scan discovers exactly 3 workspaces with correct classifications
- [ ] Broadcast pushes policy only to GOVERNED workspaces
- [ ] Drift detection identifies the modified workspace as CRITICAL
- [ ] Snapshot creates valid manifests with SHA-256 hashes for all governed workspaces
- [ ] Kill switch writes sentinel files to all governed workspaces
- [ ] Audit chain in each governed workspace contains all expected events in chronological order
- [ ] No test relies on external state — fully self-contained with fixture data
- [ ] L3 acceptance test validates against harness contract
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — gateway integration, e2e test patterns, audit chain verification
- `.craft/roles/claws/ciso.md` — fleet governance lifecycle, compliance verification, kill switch audit

## Dependencies

Pulse 24 (snap-promote) — requires snapshot promotion for fleet registry testing.
Pulse 25 (fleet-kill) — requires kill switch for fleet-wide kill testing.
Pulse 26 (fleet-report) — requires fleet reporting for end-state verification.

## Test Gates

- [ ] L2 e2e (1 test): full fleet lifecycle — scan → broadcast → drift → snapshot → kill → audit verification across 3 temp workspaces
- [ ] L3 acceptance (1 test): fleet lifecycle validated against acceptance harness contract
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
