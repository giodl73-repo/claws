# Findings Applied: fleet-operations

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 32
**Major/warning applied**: 22
**Note severity skipped**: 10

---

## Summary of Changes

### CL-08 Package Architecture

- **Drift detection**: compare resolved versions from lock file (not declared ranges), use package manager CLI for version resolution (not node_modules traversal), distinguish missing (not installed) from mismatched (wrong version)
- **Platform manifest**: define manifest format (JSON schema) with version range syntax, support known-breaking annotations for version pairs, per-workspace manifest version pinning for split-version states
- **Emitter broadcast**: detectPlatforms() must return all platforms (not just primary), broadcast must pin exact versions to prevent dependency cascade, per-workspace rollback on compilation failure
- **Upgrade/rollback**: snapshot package-lock.json before upgrade (restore on failure), dry-run phase before upgrade to surface predictable failures, classify failures as transient vs permanent with auto-retry
- **Rollback strategies**: offer fast (snapshot) and safe (clean install) rollback strategies, detect and escalate rollback failures separately from upgrade failures, persist per-workspace upgrade state for idempotent retry
- **Concurrency**: broadcast must acquire per-workspace lock to prevent concurrent modification, pre-check registry auth before starting broadcast cycle, parallel flag support with progress reporting
- **Reporting**: broadcast report should track CI outcomes distinguishing broadcast-caused vs pre-existing failures, remediation report with per-workspace failure analysis and retry commands, post-upgrade verification pass across all successful workspaces
- **CLI surface**: claws drift --format flag with json|table|csv options, claws drift --redact flag for external report sharing, fleet upgrade exits 0 on partial success by default with --strict for all-or-nothing
- **Audit integrity**: audit chain must be append-only through upgrade and rollback cycles, GovernanceIR schema versioning for mixed-version fleet states, broadcast must include commit/PR strategy

---

## Findings NOT Applied (note severity, skipped per rules)

10 findings with severity "note" were skipped.
