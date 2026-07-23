# Snapshot Restore

Rollback to a named governance state snapshot.

## Overview

`claws snap restore` rolls back the governance configuration to a previously saved snapshot. Unlike workspace-level snapshot rollback (which restores all artifacts), governance snapshot restore only affects governance artifacts in `.claws/`. The workspace's skills, roles, and tasks are untouched.

## Usage

```bash
claws snap save pre-policy-change     # Save current state
claws snap list                        # List available snapshots
claws snap restore pre-policy-change   # Restore saved state
```

## What Gets Restored

| Artifact                    | Restored                               |
| --------------------------- | -------------------------------------- |
| claws.json                  | Yes                                    |
| .claws/policies/            | Yes                                    |
| .claws/compiled/            | Yes (recompiled from restored sources) |
| .craft/ workspace artifacts | **No**                                 |

## Restore Process

1. Verify snapshot exists and passes integrity check
2. Replace claws.json with snapshot version
3. Replace .claws/policies/ with snapshot versions
4. Run `claws build` to recompile GovernanceIR
5. Emit CGR entry recording the restore event

## Related

- [Snapshot Rollback](../../works/concepts/advanced/snapshot-rollback.md) -- workspace-level rollback
- [Snapshot Save](snapshot-save.md) -- saving governance snapshots
- `design/claws/ATOMS.md` -- C84 `atom:snap-restore`
