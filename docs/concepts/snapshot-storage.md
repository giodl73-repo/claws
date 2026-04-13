# Snapshot Storage

<!-- atom:snapshot-storage -->

## Overview

Snapshot storage manages retention, pruning, and lifecycle of saved snapshots. Without storage limits and pruning policies, snapshot directories grow unbounded -- especially in CI/CD environments that create snapshots on every run. claws defines storage limits, protected categories that resist pruning, and a deterministic pruning order so operators can predict which snapshots survive.

---

## Storage Limits

Each workspace has a configurable maximum snapshot count and total size:

| Setting | Default | Purpose |
|---------|---------|---------|
| `snap.maxCount` | 20 | Maximum number of snapshots retained |
| `snap.maxSizeMB` | 500 | Maximum total storage in megabytes |

When either limit is exceeded, auto-pruning activates. Limits are configurable in `claws.json`. Fleet templates can set minimum retention floors (workspaces cannot set limits below the fleet minimum). *(Source: snapshot-lifecycle S05-F01)*

---

## Auto-Pruning

When a `snap save` would exceed storage limits, auto-pruning removes the oldest eligible snapshots before writing the new one:

```
$ claws snap save daily-check
Storage limit reached (20/20 snapshots).
  Pruning: "ci-run-20260401" (oldest, unprotected)
  Pruning: "ci-run-20260402" (second oldest, unprotected)
Snapshot "daily-check" saved (18/20 snapshots).
```

Auto-pruning runs synchronously during save. The `--no-prune` flag skips pruning and fails if limits are exceeded, useful when operators want manual control. *(Source: snapshot-lifecycle S05-F02)*

---

## Protected Categories

Certain snapshots are exempt from auto-pruning:

| Category | Protection reason | How tagged |
|----------|------------------|-----------|
| **Fleet baseline** | Active drift comparison target | Promoted via `snap promote` |
| **Active dead man switch** | In-progress upgrade safety net | Created by `claws upgrade` |
| **User-pinned** | Operator explicitly marked as keep | `snap pin <name>` |

Protected snapshots are never pruned automatically. If all snapshots are protected and the limit is reached, `snap save` fails with an error explaining that manual unpinning or limit increase is needed. *(Source: snapshot-lifecycle S05-F03, P-193)*

---

## Pruning Order

When multiple snapshots are eligible for pruning, the order is deterministic:

1. **FIFO** (default): Oldest snapshot pruned first
2. **LRU**: Least recently accessed pruned first (requires access tracking)
3. **Time-bucketed**: Keep at most N per time bucket (e.g., 1 per day, 1 per week)

The pruning policy is configurable via `snap.prunePolicy`. FIFO is the default because it is simplest to reason about and predict. *(Source: snapshot-lifecycle S05-F04)*

---

## Fleet-Level Retention

Fleet templates can enforce minimum retention across all workspaces:

```json
{
  "fleet": {
    "snap": {
      "minRetention": 10,
      "minRetentionDays": 30
    }
  }
}
```

A workspace cannot set retention below the fleet minimum. This ensures fleet baselines and compliance evidence are retained even in workspaces that aggressively prune. *(Source: snapshot-lifecycle S05-F05)*

---

## Promote-Then-Prune Ordering

When `snap promote` triggers a baseline change, the new baseline must be fully established before the old baseline becomes eligible for pruning. This prevents a window where no baseline exists:

1. Promote new baseline (write and verify)
2. Mark old baseline as unprotected (if retention policy allows)
3. Auto-prune may now remove old baseline

Without this ordering, pruning could remove the old baseline before the new one is confirmed, leaving the fleet with no drift comparison target. *(Source: snapshot-lifecycle S05-F06, P-194)*

---

## List Metadata

`claws snap list` displays pruning-relevant metadata:

```
Name              Created              Size    Protected   Next-Prune
pre-upgrade       2026-04-10T14:30:00  12MB    pinned      never
ci-run-20260411   2026-04-11T08:00:00  11MB    no          next
ci-run-20260410   2026-04-10T08:00:00  11MB    no          2nd
fleet-baseline    2026-04-08T10:00:00  12MB    baseline    never
```

The `Next-Prune` column shows the pruning order so operators can predict which snapshots will be removed on the next auto-prune event. *(Source: snapshot-lifecycle S05-F07)*

---

## Related Concepts

- [Snapshot Save](snapshot-save.md) -- triggers auto-pruning when limits are exceeded
- [Snapshot Promote](snapshot-promote.md) -- promotion affects pruning eligibility
- [Snapshot Integrity](snapshot-integrity.md) -- pruned snapshots are gone permanently
