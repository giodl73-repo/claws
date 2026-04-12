# Snapshot Restore

<!-- atom:snapshot-restore -->

## Overview

`claws snap restore` replaces the current workspace governance files with those from a named snapshot. Restore is the recovery half of the dead man's switch and the undo mechanism for failed upgrades or accidental policy changes. It must be lossless (or explicitly staged), verify integrity before overwriting, and emit a governance summary so the operator knows the state they are restoring to.

---

## Lossless Carve-Out

claws's core architecture is add-only -- it never modifies original OC workspace files. Snapshot restore is the one explicit **carve-out** from this guarantee. Restore overwrites governance files by design (that is its purpose). To make this safe:

1. Restore targets only the 9 governance files, never non-governance workspace content
2. A pre-restore backup of current state is automatically created (a shadow snapshot)
3. The operator must confirm the restore operation (or pass `--yes`)

Alternatively, restore can operate in **staging-area mode** where restored files are placed in a staging directory for manual review before applying. This preserves lossless semantics at the cost of an extra step. *(Source: snapshot-lifecycle S01-F02, P-187)*

---

## Governance Summary Emission

After restore completes, claws automatically runs a governance check and emits a summary:

```
Restored from snapshot "pre-upgrade" (2026-04-10T14:30:00Z)
  claws version at save: 1.4.2
  Governance state: 2 warnings, 0 errors
  Trust tier: T2
  Recommendation: run "claws pinch" to validate with current rules
```

The summary includes the violation count and warning count from the snapshot metadata, plus a recommendation to re-run `claws pinch`. This is important because governance rules may have evolved between save and restore -- violations that existed at save time may have been reclassified. *(Source: snapshot-lifecycle S01-F08, S04-F06)*

---

## Integrity Verification

Before overwriting any files, restore performs mandatory integrity verification:

1. Verify SHA-256 hash of each file against the snapshot manifest
2. Verify HMAC-SHA256 signature of the manifest itself
3. If any verification fails, abort restore with a clear error

Restore never proceeds with a corrupt or tampered snapshot. This is non-negotiable. *(Source: snapshot-lifecycle S06-F04)*

---

## Error Message Contract

When integrity verification fails, the error message follows a defined contract:

```
Error: Snapshot integrity verification failed.
  File: claws.json
  Expected hash: a1b2c3d4...
  Actual hash:   e5f6g7h8...
  Cause: File content does not match snapshot manifest.
  Action: Snapshot may be corrupted. Do not restore.
          Use "claws snap verify pre-upgrade" to diagnose.
```

The error must include: which file failed, expected vs actual hash, a human-readable cause, and a suggested next action. Generic "integrity check failed" messages are insufficient for operator diagnosis. *(Source: snapshot-lifecycle S06-F05)*

---

## Re-Run Pinch Recommendation

Restored governance state was valid at save time but may not be valid under current rules. The restore output always recommends running `claws pinch` after restore to validate against the current rule set. This is a recommendation, not an automatic action -- the operator may want to inspect restored files before running a full check.

If the snapshot was created with `--pinch`, the stored violation data is displayed alongside the recommendation for comparison. *(Source: snapshot-lifecycle S04-F06)*

---

## Version Mismatch Handling

When the restoring claws version differs from the saving version:

| Scenario | Behavior |
|----------|----------|
| Same major version | Restore proceeds normally |
| Different major version | Warning emitted, IR may need migration |
| Schema version mismatch | IR files are restored but marked stale -- recompilation recommended |

The source files (claws.json, AGENTS.md, etc.) are version-independent and always restore cleanly. Only compiled IR may need regeneration. *(Source: three-rings S02-F06)*

---

## Dead Man's Switch Integration

The dead man's switch (`claws upgrade`) calls `snap save` before upgrading and `snap restore` if the upgrade fails. If restore itself fails (corrupt snapshot, disk full), the dead man's switch activates a **secondary fallback**: a redundant copy or git-based recovery. This prevents the catastrophic scenario where both the upgrade and the restore fail, leaving the workspace in an unknown state. *(Source: snapshot-lifecycle S04-F09, P-196)*

---

## Related Concepts

- [Snapshot Save](snapshot-save.md) -- creating the snapshots that restore reads
- [Snapshot Integrity](snapshot-integrity.md) -- the verification mechanism
- [Middle Ring](middle-ring.md) -- restore is a middle ring operation
