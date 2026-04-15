---
slug: claws-snap-restore
preset: "claws"
plan: "2 headlines: snap save/restore round-trips governance state with SHA-256 integrity, snap diff shows semantic governance changes"
area: claws
status: Closed
phase: anubis
atoms: [atom:snap, atom:snap-restore]
specs: [CL-01, CL-05]
---

# claws-snap-restore -- Snapshot System

## Headlines

1. **H1: `claws snap save v1 && [break something] && claws snap restore v1` restores governance state** -- `claws snap save <name>` captures the full governance state: claws.json, .claws/policies/*.yaml, .claws/cache/compile/ (compiled IR), .claws/cache/boost/ (optimization cache), and a manifest file with SHA-256 hashes of every captured file. Snapshots are stored in `.claws/cache/snapshots/<name>/` with a `manifest.json` that records the snapshot timestamp, claws version, platform, file count, and per-file content hashes. `claws snap restore <name>` verifies manifest integrity (SHA-256 hashes match), then restores all captured files to their snapshotted state. If any hash fails verification, restore aborts with a corruption diagnostic.
   - Validation: `snap save v1 -> modify claws.json -> snap restore v1` produces byte-identical claws.json to original
   - Validation: Manifest contains SHA-256 hash for every file; tampering with a snapshot file causes restore to abort with "integrity check failed"
   - Validation: `snap save` on a workspace with 12 governance files produces a manifest listing all 12 with correct hashes
   - Validation: `snap save pre-upgrade --pinch` runs governance check before saving -- aborts save if pinch finds critical violations

2. **H2: `claws snap diff v1 v2` shows semantic governance changes between snapshots** -- Snapshot diff compares two named snapshots and produces a semantic change report: rules added/removed/modified, tools reclassified (with risk level delta), policies changed, trust tier shifted, new violations introduced. The diff output is human-readable in default mode and machine-readable in `--json` mode. This is a governance-aware diff, not a file-level diff -- it understands that moving a tool from R2 to R4 is a material governance change worth highlighting.
   - Validation: Snapshot v1 has tool at R2, snapshot v2 has same tool at R4 -- diff reports "tool X risk escalated R2->R4"
   - Validation: Snapshot v1 has 0 violations, v2 has 2 violations -- diff reports "2 new violations introduced"
   - Validation: `snap diff v1 v2 --json` produces JSON with `{ added: [], removed: [], modified: [], riskChanges: [], newViolations: [] }`

3. **H3: `claws snap promote <name>` makes a workspace snapshot available to the fleet** -- `snap promote` copies a verified workspace snapshot to the fleet registry location (configured in `claws.json#fleet.registryUrl`). The promoted snapshot includes the manifest, all governance files, and a signed provenance record (SHA-256 of the full snapshot bundle). Fleet workspaces can then pull this snapshot via `claws snap restore <name> --fleet`. Promote requires a passing pinch check -- you cannot promote a snapshot with governance violations.
   - Validation: `snap promote v1` on a snapshot with 0 violations copies to fleet registry with provenance
   - Validation: `snap promote v1` on a snapshot with violations fails: "Cannot promote snapshot with governance violations"
   - Validation: Promoted snapshot provenance includes claws version, workspace name, timestamp, and bundle hash

## Summary

The snapshot system provides versioned governance state management with integrity guarantees. Snapshots are the safety net for the upgrade lifecycle (the dead man's switch pattern: snap -> upgrade -> doctor -> pinch || snap restore). They also enable fleet-wide governance state management via promote/restore. The system reuses compiler-sdk's cache infrastructure patterns (cache-snapshot.ts, cache-manifest.ts) for storage layout and content hashing, and agent-sdk's hashing utilities for SHA-256 integrity verification. Snapshot diff is governance-aware: it compiles both snapshots to GovernanceIR and compares analysis results, not raw file bytes.

## Coverage Contract

### Specs
- [ ] CL-01 -- snap save/restore/diff/promote commands, --fleet flag, --pinch flag
- [ ] CL-05 -- Upgrade lifecycle (snap save pre-upgrade pattern), dead man's switch

### Concept Guides
- [ ] docs/claws/operations/snapshots.md -- NEW: snapshot lifecycle, integrity, promote, fleet restore
- [ ] docs/claws/operations/upgrade-lifecycle.md -- UPDATE: reference snapshot save/restore in dead man's switch

### Scenario Coverage
- [ ] snap/save-restore-round-trip -- save, modify, restore, verify byte-identical
- [ ] snap/manifest-integrity -- tamper with snapshot file, restore detects corruption
- [ ] snap/save-with-pinch -- --pinch flag runs governance check before save
- [ ] snap/save-with-pinch-violation -- --pinch finds critical, save aborts
- [ ] snap/diff-risk-escalation -- tool R2->R4 between snapshots
- [ ] snap/diff-new-violations -- 0 violations -> 2 violations between snapshots
- [ ] snap/diff-json-output -- --json produces structured change report
- [ ] snap/promote-clean -- promote snapshot with 0 violations to fleet registry
- [ ] snap/promote-violation-blocked -- promote with violations rejected
- [ ] snap/fleet-save-restore -- --fleet flag saves/restores across all discovered workspaces
- [ ] snap/overwrite-existing -- save to existing snapshot name prompts for overwrite confirmation

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 15 | Manifest construction (3), hash verification (3), diff engine (4), promote validation (2), fleet scope (3) |
| L1 integration | 6 | Full save/restore cycle, diff pipeline with IR compilation, promote with registry write |
| L2 e2e | 3 | save -> modify -> restore on fixture workspace, diff between 2 fixture snapshots, promote -> fleet restore |
| L3 acceptance | 1 | Dead man's switch pattern: snap save -> break -> snap restore |

## Scope

- `claws-sdk/src/cache/snapshot.ts` (NEW) -- Snapshot orchestrator: save(), restore(), list(), delete(). Reuses storage patterns from compiler-sdk/src/astro/compiler/cache-snapshot.ts
- `claws-sdk/src/cache/snapshot-manifest.ts` (NEW) -- Manifest type: name, timestamp, clawsVersion, platform, files[]{path, sha256, size}. Reuses manifest pattern from compiler-sdk/src/astro/optimizer/press/cache-manifest.ts
- `claws-sdk/src/cache/snapshot-diff.ts` (NEW) -- Governance-aware diff: compile both snapshots to GovernanceIR, compare rules/tools/violations/trust
- `claws-sdk/src/cache/snapshot-promote.ts` (NEW) -- Promote: verify pinch, copy to fleet registry, generate provenance record
- `claws-sdk/src/cache/snapshot-integrity.ts` (NEW) -- SHA-256 verification: hash all files in snapshot, compare against manifest. Imports from agent-sdk/src/hashing/
- `claws-sdk/src/cache/snapshot-fleet.ts` (NEW) -- Fleet snapshot operations: save --fleet (iterate discovered workspaces), restore --fleet, fleet registry read/write
- `claws-sdk/src/cache/types.ts` (NEW) -- Snapshot, SnapshotManifest, SnapshotDiff, PromoteResult, FleetSnapshotConfig types
- `claws-cli/src/commands/snap.ts` (EDIT) -- snap save/restore/diff/promote commands with --fleet, --pinch, --json flags

## Deliverables

### Specs & Design
- [ ] CL-01 amendment -- snap commands finalized with flag inventory
- [ ] CL-05 amendment -- upgrade lifecycle pattern finalized with snapshot integration

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/cache/snapshot.ts -- save(): capture files + compute hashes + write manifest; restore(): verify + overwrite; list(): enumerate snapshots; delete(): remove snapshot dir
- [ ] claws-sdk/src/cache/snapshot-manifest.ts -- createManifest(), readManifest(), SnapshotManifest type
- [ ] claws-sdk/src/cache/snapshot-diff.ts -- diffSnapshots(a, b): compile both to GovernanceIR, return SnapshotDiff with semantic changes
- [ ] claws-sdk/src/cache/snapshot-promote.ts -- promote(): verify pinch, generate provenance, copy to registry
- [ ] claws-sdk/src/cache/snapshot-integrity.ts -- verifyManifest(): hash all files, compare, return pass/fail per file
- [ ] claws-sdk/src/cache/snapshot-fleet.ts -- fleetSave(), fleetRestore(): iterate workspaces from discovery
- [ ] claws-sdk/src/cache/types.ts -- all snapshot types
- [ ] claws-sdk/tests/cache/snapshot.unit.test.ts -- save, restore, list, delete, overwrite prompt
- [ ] claws-sdk/tests/cache/snapshot-manifest.unit.test.ts -- manifest construction, hash computation
- [ ] claws-sdk/tests/cache/snapshot-integrity.unit.test.ts -- hash verification, tamper detection
- [ ] claws-sdk/tests/cache/snapshot-diff.unit.test.ts -- risk changes, violation delta, policy changes
- [ ] claws-sdk/tests/cache/snapshot-promote.unit.test.ts -- promote with/without violations
- [ ] claws-sdk/tests/cache/snapshot.integration.test.ts -- full save/modify/restore cycle on temp directory
- [ ] claws-sdk/tests/cache/snapshot-diff.integration.test.ts -- diff between two compiled fixture snapshots
- [ ] claws-sdk/tests/fixtures/snapshot-v1/ (NEW) -- pre-built snapshot fixture with manifest
- [ ] claws-sdk/tests/fixtures/snapshot-v2/ (NEW) -- modified snapshot fixture with risk changes

### CLI Wiring
- [ ] claws-cli/src/commands/snap.ts -- `claws snap save <name>`, `snap restore <name>`, `snap diff <a> <b>`, `snap promote <name>`
- [ ] claws-cli/src/commands/snap.ts -- flags: --fleet, --pinch, --json, --confirm (for overwrite)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Watch mode (claws-three-rings plan -- uses snapshots indirectly through the dead man's switch)
- Fleet discovery and broadcast (claws-fleet-ops plan -- fleet snapshots use discovery from there)
- Compliance artifact snapshots (Phase 3 -- compliance/ directory not captured in Phase 2 snapshots)
- Snapshot compression / deduplication (future optimization -- Phase 2 stores full copies)
- Snapshot encryption (future -- Phase 2 snapshots are plaintext, not suitable for secrets)
- Sidecar snapshot export (Phase 3 enterprise)

## Notes

- Snapshot storage pattern reuses compiler-sdk/src/astro/compiler/cache-snapshot.ts layout (directory per snapshot, manifest.json)
- Manifest pattern reuses compiler-sdk/src/astro/optimizer/press/cache-manifest.ts (file list with content hashes)
- SHA-256 hashing imports from agent-sdk/src/hashing/ -- does NOT reimplement crypto
- Governance-aware diff compiles both snapshots to GovernanceIR using parse() + analyze() from claws-parse and claws-rules -- it is a semantic diff, not a file diff
- Fleet snapshots use agent-sdk/src/discovery/ for workspace enumeration -- does NOT reimplement discovery
- The --pinch flag on snap save is a pre-save gate: if pinch finds critical violations, save aborts (fail-fast)
- Promote requires passing pinch -- you cannot push a broken governance state to the fleet
- Depends on claws-governance-ir (GovernanceIR for diff), claws-parse + claws-rules (compile snapshots for semantic diff)

## Scenario-Driven Additions

### From snapshot-lifecycle scenarios
- **36 findings** applied: snap save must capture source files not just compiled IR, snap restore lossless carve-out or staging-area workflow, snap storage location and git inclusion policy, claws version metadata in snapshot, dirty working tree protection on snap restore, explicit file list for policies, snap diff semantic governance diff engine (not JSON diff), snap diff delta-oriented output format, snap diff cross-version IR schema normalization, snap diff directional labeling (from/to), snap diff single-argument form (snapshot vs current workspace), snap diff risk-impact categorization, snap promote fleet baseline storage backend, snap promote auth and pinch validation gate, snap promote drift cache invalidation, snap promote per-environment baselines, snap promote version history and rollback, snap promote --dry-run mode, snap save governance-neutral semantics (save always succeeds), snap save --pinch informational (shows violations but saves), governance summary in snapshot metadata, snap restore emit governance summary, dead man switch abort on critical violations, storage limits and auto-pruning policy, protected snapshot categories (fleet baseline / active dead man switch / user-pinned), pruning order policy (FIFO vs LRU vs time-bucketed), promote-then-prune ordering, SHA-256 integrity per file, HMAC-SHA256 manifest signing, dead man switch secondary fallback, integrity check mandatory for restore, end-to-end integrity across transport, read-after-write verification, snap verify subcommand
- **14 new tests**:
  - [ ] Snap save captures source files (all 9 workspace files) not just compiled IR
  - [ ] Snap restore lossless carve-out (staging-area workflow)
  - [ ] Dirty working tree protection on snap restore
  - [ ] Snap diff semantic governance diff engine (rule/tool/trust changes)
  - [ ] Snap diff cross-version IR schema normalization
  - [ ] Snap diff single-argument form (snapshot vs current workspace)
  - [ ] Snap promote auth and pinch validation gate
  - [ ] Snap promote drift cache invalidation on baseline change
  - [ ] Snap save governance-neutral semantics (save succeeds despite violations)
  - [ ] Auto-pruning protected categories (fleet baseline, dead man switch, pinned)
  - [ ] Promote-then-prune ordering (new baseline before old pruned)
  - [ ] HMAC-SHA256 manifest signing and verification
  - [ ] Dead man switch secondary fallback on restore failure
  - [ ] Read-after-write integrity verification

### From three-rings scenarios
- **6 findings** applied: snap save --pinch abort-on-violation semantics, snap save must capture all 9 workspace files, snap restore platform vs workspace version mismatch, snap save overwrite protection for named snapshots
- **3 new tests**:
  - [ ] Snap save --pinch abort on critical violations
  - [ ] Snap save captures all 9 workspace files (not subset)
  - [ ] Snap save overwrite protection for existing named snapshots

### From fleet-operations scenarios
- **8 findings** applied: promote baseline invalidation, per-environment baselines, end-to-end integrity across transport
- **3 new tests**:
  - [ ] Fleet promote baseline invalidation notification
  - [ ] Per-environment baseline grouping
  - [ ] End-to-end integrity verification across fleet transport
