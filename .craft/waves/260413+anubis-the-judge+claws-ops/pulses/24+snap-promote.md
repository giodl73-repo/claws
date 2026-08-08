---
pulse: 24
slug: snap-promote
plan: claws-snap-restore
depends_on: [21]
governing_roles: [claws:ciso, craft:architect]
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

# Pulse 24: Snapshot Promote

## Objective

Implement snapshot promotion — the process of elevating a local workspace snapshot to fleet-level distribution status. Promotion requires passing the pinch gate (all governance checks pass), attaching provenance metadata (version, signer, bundle hash), and copying the snapshot into a fleet-scoped registry where it can be discovered and applied to other workspaces.

Promotion is the trust boundary between local experimentation and fleet-wide distribution. A promoted snapshot carries cryptographic provenance that attests to its governance validity at the time of promotion, making it safe for fleet-wide deployment via broadcast or restore.

## Deliverables

- [ ] `claws-sdk/src/snapshot/promote.ts` — Promotion pipeline: verify pinch passes on snapshot (all governance checks clean), attach provenance, copy to fleet registry; abort with PromotionError if pinch fails, reporting which checks failed
- [ ] `claws-sdk/src/snapshot/provenance.ts` — PromoteProvenance type: clawsVersion (semver), workspaceHash (SHA-256), timestamp (ISO 8601), signer (string identifier), bundleHash (SHA-256 of entire snapshot directory); provenance is stored as provenance.json alongside the promoted snapshot
- [ ] `claws-sdk/src/snapshot/fleet-registry.ts` — Fleet-scoped snapshot storage: store promoted snapshots in `.claws/fleet-registry/{name}/` with manifest.json + provenance.json + files; discover promoted snapshots, list versions sorted by timestamp, verify provenance chain integrity
- [ ] `claws-cli/src/commands/snap.ts` — Add `claws snap promote [name] [--fleet dir]` subcommand to existing snap command
- [ ] `claws-sdk/tests/snapshot/promote.unit.test.ts` — L0 unit tests (4 tests)
- [ ] `claws-sdk/tests/snapshot/promote.integration.test.ts` — L1 integration tests (2 tests)
- [ ] `claws-sdk/tests/snapshot/promote.e2e.test.ts` — L2 e2e: save snapshot on clean workspace → promote to fleet registry → verify provenance.json (clawsVersion, bundleHash, signer, timestamp), verify registry directory structure, verify bundleHash matches actual content

## Acceptance Criteria

- [ ] `claws snap promote mysnap --fleet ./workspaces` copies snapshot to fleet registry with provenance
- [ ] Promotion is blocked if pinch gate fails, with clear report of failing checks
- [ ] provenance.json contains clawsVersion, workspaceHash, timestamp, signer, and bundleHash
- [ ] Fleet registry lists promoted snapshots sorted by timestamp
- [ ] Provenance chain integrity can be verified (bundleHash matches actual content)
- [ ] Promoting to a name that already exists in registry creates a new version, not overwrite
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/ciso.md` — promotion trust boundary, provenance requirements, fleet registry governance
- `.craft/roles/craft/architect.md` — SDK architecture, registry storage patterns

## Dependencies

Pulse 21 (snap-diff) — requires snapshot diff infrastructure; also transitively depends on Pulse 19 (save/restore and manifest).

## Test Gates

- [ ] L0 unit (4 tests): pinch gate enforced (promotion blocked on failing checks), provenance.json contains all required fields, fleet registry write creates correct directory structure, version listing returns snapshots sorted by timestamp
- [ ] L1 integration (2 tests): promote snapshot from reference workspace end-to-end with provenance chain verification, promotion blocked when governance checks fail with clear error report
- [ ] L2 e2e (1 test): save snapshot → promote to fleet registry → verify provenance.json fields, registry structure, bundleHash matches content
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
