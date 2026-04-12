# Snapshot Save

<!-- atom:snapshot-save -->

## Overview

`claws snap save` captures the current state of all governance-relevant workspace files into a named snapshot. Snapshots serve as restore points for the dead man's switch, baselines for fleet drift comparison, and audit evidence of governance state at a point in time. Save is governance-neutral -- it always succeeds regardless of current violation state.

---

## Source File Capture

Snapshots capture **source files**, not just compiled GovernanceIR. The full snapshot includes all 9 workspace files that define governance:

1. `claws.json` -- governance configuration
2. `AGENTS.md` -- agent declarations and trust
3. `SKILLS.md` -- skill registry
4. Policy YAML files (up to 6 depending on workspace)

Both the source files and their compiled GovernanceIR are stored as a coherent pair. Restoring a snapshot without source files would leave IR inconsistent with actual workspace state. *(Source: snapshot-lifecycle S01-F01, P-186)*

---

## Governance-Neutral Semantics

Save always succeeds. A workspace with 47 critical violations can still save a snapshot. This is by design -- the dead man's switch needs to capture pre-upgrade state regardless of health, and developers need restore points even when governance is broken.

The distinction from `snap promote` is critical:

| Command | Governance gate? | Purpose |
|---------|-----------------|---------|
| `snap save` | No | Capture current state unconditionally |
| `snap promote` | Yes (pinch-clean required) | Elevate snapshot to fleet baseline |

*(Source: snapshot-lifecycle S01-F03)*

---

## --pinch Informational Flag

`claws snap save --pinch` runs a governance check at save time and includes the results in snapshot metadata. Critically, `--pinch` is **informational only** -- violations are displayed but do not prevent the save:

```
$ claws snap save --pinch pre-upgrade
Saving snapshot "pre-upgrade"...
  Governance check: 2 warnings, 0 errors
  Violations included in snapshot metadata
Snapshot saved: .claws/snapshots/pre-upgrade/
```

This gives operators visibility into governance health at save time without blocking the safety mechanism. *(Source: snapshot-lifecycle S01-F04)*

---

## Version Metadata

Each snapshot records the claws version that created it:

| Metadata | Purpose |
|----------|---------|
| `clawsVersion` | The compiler version at save time |
| `schemaVersion` | GovernanceIR schema version |
| `timestamp` | ISO 8601 creation time |
| `workspace` | Workspace identifier |

Version metadata enables cross-version restore compatibility checks. Restoring a snapshot from claws 1.2 into claws 2.0 may require IR schema migration. *(Source: snapshot-lifecycle S01-F02)*

---

## Dirty Tree Protection

`claws snap save` checks for uncommitted governance file modifications that are not yet on disk in their final state. If the working tree has unsaved editor buffers that differ from the filesystem state, the snapshot captures the filesystem state (not the buffer). This is documented clearly so operators understand that snapshots reflect saved-to-disk state.

On restore, dirty tree protection warns if current workspace files have been modified since the snapshot, preventing accidental overwrite of in-progress work. *(Source: snapshot-lifecycle S01-F05)*

---

## Overwrite Protection

Named snapshots cannot be silently overwritten:

```
$ claws snap save pre-upgrade
Error: Snapshot "pre-upgrade" already exists.
  Use --force to overwrite, or choose a different name.
```

The `--force` flag is required for intentional overwrites. This prevents the dead man's switch from accidentally overwriting a critical restore point. Auto-generated snapshot names (timestamps) do not conflict. *(Source: snapshot-lifecycle S01-F07)*

---

## Storage Location

Snapshots are stored in `.claws/snapshots/{name}/` within the workspace. This directory is excluded from governance file scanning (snapshots are inert data, not active configuration). Whether snapshots are committed to git is a workspace-level policy decision. *(Source: snapshot-lifecycle S01-F06)*

---

## Related Concepts

- [Snapshot Restore](snapshot-restore.md) -- restoring from a saved snapshot
- [Snapshot Integrity](snapshot-integrity.md) -- how snapshots are hashed and signed
- [Snapshot Storage](snapshot-storage.md) -- retention, pruning, and limits
