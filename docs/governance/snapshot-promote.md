# Snapshot Promote

<!-- atom:snapshot-promote -->

## Overview

`claws snap promote` elevates a workspace snapshot to a fleet baseline -- the reference point against which all fleet workspaces are measured for drift. Unlike `snap save` (which is governance-neutral), promote is governance-gated: the snapshot must pass a full `claws pinch` with zero errors before it can become a fleet baseline. This ensures the fleet's reference governance state is always valid.

---

## Storage Backend

Fleet baselines are stored in the fleet manifest, separate from workspace-local snapshots. The storage backend must support:

| Requirement | Rationale |
|-------------|-----------|
| Cross-workspace access | All fleet workspaces read the baseline for drift comparison |
| Version history | Rollback to previous baselines if a promotion causes issues |
| Integrity verification | Baselines are signed and verified on read |
| Concurrent read safety | Multiple drift scans read the baseline simultaneously |

The specific backend (shared filesystem, object storage, git repository) is a deployment decision. claws abstracts this behind a storage interface. *(Source: snapshot-lifecycle S03-F01)*

---

## Authentication and Authorization

Promoting a snapshot to fleet baseline is a privileged operation. It requires:

1. **Authentication**: Operator identity verified (not anonymous)
2. **Authorization**: Operator has fleet-admin or baseline-manager role
3. **Audit**: Promotion event recorded with operator identity and reason

Unauthorized promotion attempts are blocked and logged. In environments without auth infrastructure, promote requires `--i-am-authorized` flag as an explicit acknowledgment. *(Source: snapshot-lifecycle S03-F03)*

---

## Pinch Validation Gate

Before promotion proceeds, the snapshot undergoes a full `claws pinch` validation:

```
$ claws snap promote pre-release --env production
Validating snapshot "pre-release"...
  Running pinch validation: 0 errors, 1 warning
  Governance state: CLEAN
Promoting to fleet baseline for environment "production"...
  Previous baseline: v1.3.0 (2026-04-08)
  New baseline: v1.4.0 (2026-04-11)
Baseline promoted successfully.
```

If pinch finds errors, promotion is blocked:

```
$ claws snap promote broken-state --env production
Validating snapshot "broken-state"...
  Running pinch validation: 3 errors, 2 warnings
  Governance state: FAILING
Error: Cannot promote snapshot with governance errors.
  Fix violations and re-save, or use a clean snapshot.
```

*(Source: snapshot-lifecycle S03-F04, P-189)*

---

## Drift Invalidation

When a new baseline is promoted, all cached drift results across the fleet are invalidated. Drift reports generated against the previous baseline are stale and must be regenerated. This prevents the scenario where workspaces appear "compliant" against an old baseline while drifting from the new one.

The invalidation is communicated via the fleet manifest version bump. Drift tools check the baseline version before reporting and re-scan if stale. *(Source: snapshot-lifecycle S03-F05, P-190)*

---

## Per-Environment Baselines

Fleets can maintain separate baselines per environment:

| Environment | Baseline | Purpose |
|-------------|----------|---------|
| `production` | Strictest policy | Production workspaces |
| `staging` | Production-equivalent | Pre-production validation |
| `development` | Relaxed policy | Developer experimentation |

Each environment has independent promotion, versioning, and drift tracking. Promoting to production does not affect the development baseline. *(Source: snapshot-lifecycle S03-F06)*

---

## Version History and Rollback

Fleet baselines maintain a version history:

- Each promotion creates a new version (append-only)
- Previous versions are retained per the fleet retention policy
- `claws snap promote --rollback` restores the previous baseline version

Rollback is itself a privileged operation requiring the same auth as promotion. *(Source: snapshot-lifecycle S03-F07)*

---

## Confirmation Prompt and Dry Run

Promotion requires explicit confirmation:

```
$ claws snap promote pre-release --env production
This will replace the production fleet baseline.
  Current: v1.3.0 (2026-04-08)
  New: pre-release (2026-04-11)
  Affected workspaces: 23
Proceed? [y/N]
```

`--dry-run` shows what would happen without making changes. `--yes` skips the confirmation for CI/CD pipelines. *(Source: snapshot-lifecycle S03-F08)*

---

## Related Concepts

- [Snapshot Save](snapshot-save.md) -- creates the snapshots eligible for promotion
- [Snapshot Storage](snapshot-storage.md) -- retention policy for baselines
- [Fleet Drift](fleet-drift.md) -- drift is measured against promoted baselines
