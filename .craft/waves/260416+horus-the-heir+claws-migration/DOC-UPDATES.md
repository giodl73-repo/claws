# Horus wave — DOC-UPDATES completion checklist

Per `feedback_doc_sync_complete` memory: this is a completion checklist,
not a deferral list. Every row MUST be checked at pulse 76 exit.

## Craftworks index surfaces

- [x] `.craft/PLANS.md` — 7 Horus plans updated to final status (pulse 76)
  - [x] clawc-pre-extraction-packaging: Implemented (was Implemented, unchanged)
  - [x] clawc-repo-migration: Active → Implemented
  - [x] clawc-repo-ops: Draft → Implemented (pulses 73.7 + 73.8 + 75)
  - [x] clawc-bic-operations: Draft → Implemented
  - [x] claws-e2e-sim-harness: Draft → Implemented (CP-5)
  - [x] claws-sim-approval-flows: Draft → Implemented (CP-6)
  - [x] claws-sim-host-presets: Draft → Superseded (moved to Wepwawet)
  - [x] clawc-spec-reboot: Draft → Implemented (pulses 74.5 + 74.6)
- [x] `.craft/WAVES.md` — Horus row updated: stage setup → close (CP-8); plan
  list reflects Wepwawet move
- [x] `design/clawc/SPECS.md` — 8 spec rows carry Retirement/Successor
  traceability; CL-15 + CL-16 added as new v1.0 rows
- [x] `design/clawc/ATOMS.md` — 14 displaced atoms Spec column updated
  to per-package paths (pulse 74.6)

## bic/claws index surfaces

- [x] `docs/README.md` — package directory map seeded (pulses 74.5 + 74.6)
  listing all 14 package/domain dirs with 2-letter codes + upstream targets
- [x] `docs/specs/README.md` — updated for Horus wave close: 16 specs, 8
  retired with successor pointers, CL-15 + CL-16 added
- [x] Per-package `docs/{package}/README.md` — 14 files seeded with
  content indices linking specs, guides, pitfalls, scenarios
- [x] Per-package `docs/{package}/ATOMS.md` — 14 files, 94 total atoms
  across packages + domains
- [x] Per-package `docs/{package}/CHANGELOG.md` — 14 v0.1 Horus wave entries
- [x] 8 CL-NN specs carry `Status: Retired` headers with successor pointers
  (pulse 74.5)

## Sync tooling

- [x] `/c/src/craftworks/scripts/doc-sync/verify-indexes.ts` — PLANS.md +
  WAVES.md drift detection
- [x] `/c/src/craftworks/scripts/doc-sync/verify-indexes.integration.test.ts` —
  5 L1 tests green
- [x] `/c/src/claws/tools/doc-sync/verify-indexes.ts` — docs/specs/README.md
  + docs/README.md drift detection
- [x] `/c/src/claws/tools/doc-sync/verify-indexes.integration.test.ts` —
  6 L1 tests green

## Validation

- [x] `tsx devtools/repo-ops/src/check.ts --docs-dir docs/` — zero BLOCK
  findings in the 14 new package/domain dirs (pre-existing BLOCKs in
  older `docs/concepts/fleet-*`, `docs/traces/`, etc. are out of scope
  for the Horus close)
- [x] `tsx tools/atoms-oracle/bidirectional-sweep.ts --docs-dir docs/` —
  94 atoms, 0 orphans across all 4 invariants (pulse 75)
- [x] `tsx tools/doc-sync/verify-indexes.ts --docs-dir docs/` — 0 drift
  findings
- [x] `tsx scripts/doc-sync/verify-indexes.ts` on craftworks-side — runs
  against current index state

## Evidence sidecars

- [x] `.audit/migrations/horus/close/guide-rewrite-evidence.json` (pulse 74)
- [x] `.audit/migrations/horus/close/doctor-check-docs-output.txt` (pulse 74)
- [x] `.audit/migrations/horus/close/atoms-oracle-sweep-evidence.json` (pulse 75)
- [x] `.audit/migrations/horus/close/panels/cp-8/architect-decision.md` (pulse 75)
- [x] `.audit/migrations/horus/close/index-reconciliation-evidence.json` (pulse 76)
- [x] `.audit/migrations/horus/close/spec-merge-evidence.json` (pulse 73)

## Wepwawet handoff

- [x] `claws-sim-host-presets` plan reassigned to Wepwawet via
  `.craft/waves/260416+horus-the-heir+clawc-migration/REPLAN.md` amendment
- [x] `260418+wepwawet-the-opener+openclaw-upstream-extraction/wave.yaml`
  lists `claws-sim-host-presets` as CP-1 opener

## Sign-off

All rows checked. No deferrals. Horus wave is doc-sync complete.

Signed: 2026-04-22 pulse 76 exit.
