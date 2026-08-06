---
pulse: 19
slug: snap-save-restore
plan: claws-snap-restore
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 19: Snapshot Save + Restore

## Objective

Implement the core snapshot save and restore pipeline for claws workspaces. A snapshot captures the complete governance state — claws.json, policies, compiled governance IR, and cache manifest — into a named directory under `.claws/snapshots/` with SHA-256 per-file integrity hashes. Restore verifies the manifest before writing, aborting on any tamper detection.

This is the foundation for all downstream snapshot operations (diff, promote) and fleet-level governance distribution. The integrity guarantee is non-negotiable: if a single byte differs from the recorded hash, restore must refuse to proceed and report exactly which files failed verification.

## Deliverables

- [ ] `claws-sdk/src/snapshot/manifest.ts` — SnapshotManifest type: files[] with relative paths, SHA-256 hashes per file, timestamp (ISO 8601), clawsVersion, workspaceHash (composite hash of all file hashes), schemaVersion: number (starting at 1) for forward compatibility
- [ ] `claws-sdk/src/snapshot/integrity.ts` — SHA-256 hash computation for files, manifest-level verification (recompute all hashes, compare), tamper detection reporting with per-file pass/fail
- [ ] `claws-sdk/src/snapshot/storage.ts` — Snapshot storage under `.claws/snapshots/{name}/` with manifest.json + copied files; list snapshots, delete snapshot, check existence
- [ ] `claws-sdk/src/snapshot/save.ts` — Capture claws.json + `.claws/policies/**` + `.claws/compiled/governance-ir.json` + cache manifest into snapshot directory; include compiled GovernanceIR in snapshot (avoids recompilation on diff); compute and store SHA-256 per-file hashes in manifest.json
- [ ] `claws-sdk/src/snapshot/restore.ts` — Read manifest.json, recompute SHA-256 for every file in snapshot, abort with TamperError on mismatch, restore files byte-identical to original locations
- [ ] `claws-cli/src/commands/snap.ts` — CLI commands: `claws snap save [name]`, `claws snap restore [name]`, `claws snap list`, `claws snap delete [name]`
- [ ] `claws-sdk/tests/snapshot/save-restore.unit.test.ts` — L0 unit tests (8 tests)
- [ ] `claws-sdk/tests/snapshot/save-restore.integration.test.ts` — L1 integration tests (3 tests)
- [ ] `claws-sdk/tests/snapshot/save-restore.e2e.test.ts` — L2 e2e: save on reference workspace → tamper one file → restore fails with TamperError → restore clean snapshot succeeds byte-identical
- [ ] `claws-sdk/tests/accept/e2e/snap-save-restore.accept.test.ts` — L3 acceptance: snapshot integrity contract — save captures all governance files, manifest hashes are correct, restore is byte-identical, tamper detection fires on single modified byte

## Acceptance Criteria

- [ ] `claws snap save mysnap` captures all governance files into `.claws/snapshots/mysnap/` with valid manifest.json
- [ ] manifest.json contains SHA-256 hash for every file, ISO 8601 timestamp, clawsVersion, and schemaVersion field for forward compatibility
- [ ] `claws snap restore mysnap` restores files byte-identical to originals
- [ ] Restore aborts with TamperError if any file hash mismatches, reporting which files are tampered
- [ ] `claws snap list` shows all snapshots with timestamps
- [ ] `claws snap delete mysnap` removes snapshot directory
- [ ] Idempotent save: saving same name twice overwrites cleanly without residual files
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — workspace layout, .claws/ directory conventions

## Dependencies

None — this is the first pulse in CP-3, depends on CP-2 completion.

## Test Gates

- [ ] L0 unit (8 tests): save creates manifest with correct hashes, restore verifies integrity, tamper detected on modified file, tamper detected on missing file, list returns snapshots sorted by timestamp, delete removes snapshot, idempotent save overwrites cleanly, workspaceHash is composite of all file hashes
- [ ] L1 integration (3 tests): save+restore round-trip produces byte-identical files on reference workspace, tamper detection fires on single modified file in snapshot, save captures all expected governance files from reference workspace
- [ ] L2 e2e (1 test): save on reference workspace → tamper one file → restore fails with TamperError → restore clean snapshot succeeds byte-identical
- [ ] L3 acceptance (1 test): snapshot integrity contract — save captures all governance files, manifest hashes correct, restore byte-identical, tamper detection on single modified byte
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
