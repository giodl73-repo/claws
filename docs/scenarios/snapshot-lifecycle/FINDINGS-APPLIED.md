# Findings Applied: snapshot-lifecycle

**Date**: 2026-04-11
**Scenarios processed**: 6
**Total findings**: 60
**Major/warning applied**: 48
**Note severity skipped**: 12

---

## Summary of Changes

### Specs Edited

#### CL-05 Developer Experience
- **38 new constraints** added covering: snap save must capture source files not just compiled IR, snap restore lossless carve-out or staging-area workflow, snap storage location definition and git inclusion policy, claws version metadata in snapshot, dirty working tree protection on snap restore, explicit file list definition for policies in snapshot scope, file metadata capture policy (content-only vs full), snap diff semantic governance diff engine (not JSON diff), snap diff delta-oriented output format, snap diff cross-version IR schema normalization, snap diff output format options (text/json/sarif), snap diff directional labeling (from/to), snap diff error handling for missing snapshots, snap diff single-argument form (snapshot vs current workspace), snap diff risk-impact categorization of changes, snap promote fleet baseline storage backend definition, snap promote authentication and authorization requirement, snap promote mandatory check validation before promotion, snap promote invalidate cached drift results on baseline change, snap promote per-environment or grouped baselines, snap promote baseline version history and rollback, snap promote confirmation prompt and --dry-run mode, snap save governance-neutral (save always succeeds) vs snap promote governance-gated (requires check-clean), snap save --check informational semantics (shows violations but saves), governance summary in snapshot metadata (violation count / warning count), snap restore emit governance summary of restored state, dead man switch abort if pre-upgrade state has critical violations, document that rule evolution affects post-restore check results, snap restore re-run check after restore vs trust saved IR, file content and IR must be coherent pair in snapshot, storage limits and auto-pruning policy definition, protected snapshot categories (fleet baseline / active dead man switch / user-pinned), snap save auto-prune semantics and --no-prune override, pruning order policy (FIFO vs LRU vs time-bucketed), fleet-level minimum retention override, snap promote + pruning ordering (establish new before pruning old), snap list pruning-relevant metadata and next-prune indicator, snap save mandatory SHA-256 integrity hash per file, snap manifest sign with HMAC-SHA256 not just hash, dead man switch secondary fallback if snap restore fails, snap restore integrity failure error message contract, integrity check mandatory for restore and optional for read-only, snap promote end-to-end integrity verification across transport, snap save read-after-write verification, snap verify subcommand for non-destructive integrity check
- **Snapshot Save/Restore section** expanded with: source file capture (all 9 workspace files), lossless carve-out, storage location, claws version metadata, dirty tree protection, explicit file list, content-only policy, governance-neutral semantics, --check informational, governance summary, coherent file+IR pairs
- **Snapshot Diff section** added: semantic governance diff engine, delta-oriented output, cross-version normalization, format options, directional labeling, single-argument form, risk-impact categorization, missing snapshot error handling
- **Snapshot Promote section** added: storage backend, auth requirement, check validation gate, drift cache invalidation, per-environment baselines, version history, confirmation prompt, --dry-run mode
- **Snapshot Storage Management section** added: storage limits, protected categories, auto-prune semantics, pruning order policy, fleet-level retention, promote-then-prune ordering, list metadata
- **Snapshot Integrity section** added: SHA-256 per-file hashing, HMAC-SHA256 manifest signing, secondary fallback for dead man switch, error message contract, mandatory restore verification, end-to-end transport verification, read-after-write verification, snap verify subcommand

#### CL-04 Compilation Pipeline
- **1 new constraint**: deterministic IR serialization for hash comparison (canonical, no timestamps or random IDs)

#### CL-05 Developer Experience -- Dead Man Switch
- **3 new constraints** added covering: abort if pre-upgrade state has critical violations, secondary fallback if snap restore fails (git stash or redundant copy), document rule evolution impact on post-restore check

### PITFALLS.md
- **11 new pitfalls** (P-186 through P-196)

| ID | Category | Severity | Source | Description | Detection Ring |
|----|----------|----------|--------|-------------|----------------|
| P-186 | Snapshot | High | S01-F01 | snap save captures GovernanceIR but not source files -- restore leaves IR inconsistent with actual workspace files | Middle |
| P-187 | Snapshot | High | S01-F02 | snap restore overwrites workspace files without lossless carve-out -- violates claws add-only architecture | Middle |
| P-188 | Snapshot | High | S02-F03 | Cross-version snap diff produces spurious changes from IR schema evolution, not governance changes | Middle |
| P-189 | Snapshot | Critical | S03-F02 | Malicious or mistaken snap promote lowers fleet baseline trust tier -- all workspaces pass drift with weaker governance | Outer |
| P-190 | Snapshot | High | S03-F04 | Baseline change via promote invalidates all drift reports without notification -- stale compliance status persists | Outer |
| P-191 | Snapshot | High | S04-F05 | Dead man switch proceeds with critical violations in pre-upgrade state -- restore brings back broken governance | Middle |
| P-192 | Snapshot | High | S04-F09 | Restored violation line numbers reference wrong file locations when files were modified between save and restore | Middle |
| P-193 | Snapshot | Critical | S05-F02 | Auto-pruning deletes fleet baseline snapshot -- drift detection broken for all fleet workspaces | Middle |
| P-194 | Snapshot | High | S05-F07 | snap promote triggers pruning that deletes previous baseline before new one is established -- window with no baseline | Middle |
| P-195 | Snapshot | Critical | S06-F01 | No integrity verification on snapshots -- corrupted snapshot silently restored puts workspace in unknown governance state | Middle |
| P-196 | Snapshot | High | S06-F03 | Dead man switch fails completely if snapshot is corrupt -- upgrade failed AND restore failed, no secondary fallback | Middle |

### Plans Edited
- **claws-snapshot-lifecycle**: 36 findings, 14 new tests covering save source file capture, restore lossless carve-out, diff semantic engine, promote auth + validation, auto-pruning protected categories, and integrity verification
- **claws-fleet-management**: 8 findings, 3 new tests covering promote baseline invalidation, per-environment baselines, and end-to-end integrity across transport
- **claws-three-ring-governance**: 6 findings, 2 new tests covering dead man switch abort on critical violations and secondary fallback

### Guides Edited
- **docs/claws/governance/snapshot-save.md**: source file capture, governance-neutral semantics, --check informational, version metadata, dirty tree protection, overwrite protection
- **docs/claws/governance/snapshot-restore.md**: lossless carve-out, governance summary emission, integrity verification, error message contract, re-run check recommendation
- **docs/claws/governance/snapshot-diff.md**: semantic governance diff, delta output, cross-version normalization, format options, risk-impact categorization
- **docs/claws/governance/snapshot-promote.md**: storage backend, authentication, check validation, drift invalidation, per-environment baselines, version history, confirmation prompt
- **docs/claws/governance/snapshot-storage.md**: storage limits, auto-pruning, protected categories, pruning order, fleet-level retention, list metadata
- **docs/claws/governance/snapshot-integrity.md**: SHA-256 hashing, HMAC-SHA256 signing, corruption vs tamper detection, read-after-write, snap verify subcommand

---

## Findings NOT Applied (note severity, skipped per rules)

12 findings with severity "note" were skipped:
- S01-F08 (snap list subcommand for discoverability)
- S01-F10 (snap value proposition vs git stash/checkout documentation)
- S02-F09 (summary verdict for middle-ring validation use case)
- S02-F10 (summary vs verbose output modes)
- S03-F09 (policy baseline vs configuration baseline distinction)
- S03-F10 (promote/drift/broadcast lifecycle diagram)
- S04-F08 (debugging/test-harness workflow for violation snapshots)
- S04-F10 (audit timeline use case for snapshot metadata)
- S05-F08 (fixed vs unique snapshot naming conventions and pruning impact)
- S05-F10 (content-addressable deduplication as future optimization)
- S06-F09 (corruption detection hash vs tamper detection sign distinction)
- S06-F10 (hash algorithm recorded in manifest for forward migration)