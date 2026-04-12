# Fleet Broadcast

<!-- atom:fleet-broadcast (C60) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

You have 47 agent workspaces. You updated the SOC 2 baseline policy.
Now every workspace needs the new policy. That is what `claws broadcast` does.

## What broadcast does

Broadcast pushes **policy files** to all discovered workspaces. It does not
recompile — each workspace must `claws build` after receiving new policies.
Broadcast is declarative: "here are the new rules."

```
$ claws broadcast --confirm
  Source: .claws/policies/ (3 files, 2.1 KB)
  Target: 47 workspaces (from last 'claws scan')

  ████████████████████████████████████████████████  47/47

  ✓ 44 updated    ✓ 3 already current (skipped)    ✗ 0 failed
  Run 'claws pinch --fleet' to verify.
```

## The --confirm gate

`broadcast` is destructive — it overwrites policy files in 47 workspaces.
Without `--confirm`, it runs in dry-run mode:

```
$ claws broadcast
  DRY RUN — no changes written (add --confirm to execute)
  Would push 2 files to 47 workspaces (94 writes).
```

Always preview first. Then `--confirm`.

## Partial failure recovery

Broadcast does not stop on first failure. If 3 of 47 fail, the other 44
succeed:

```
$ claws broadcast --confirm
  ✓ 44 updated
  ✗  3 failed:
    dev-sandbox-1    Permission denied (.claws/policies/ read-only)
    dev-sandbox-2    Connection timeout (SSH)
    qa-isolated      claws.json not found (not initialized)

  Fix the 3 failures and re-run. Already-updated workspaces are skipped.
```

Re-running is safe. Workspaces that already received the update are skipped
via hash comparison.

## Retry logic

Broadcast retries transient failures automatically:

| Failure type | Retries | Backoff |
|--------------|---------|---------|
| Network timeout | 3 | Exponential (1s, 2s, 4s) |
| Permission denied | 0 | Not transient |
| Not initialized | 0 | Needs `claws init` first |
| Disk full | 0 | Not transient |

After retries exhaust, the workspace is marked failed and broadcast continues.

## Broadcast vs push

| | `claws broadcast` | `claws push` |
|---|---|---|
| **Sends** | Policy YAML files | Compiled artifacts |
| **Requires rebuild** | Yes | No |
| **Use when** | Policy changed | Deploy known-good build |

## Typical workflow

```bash
# 1. Edit policies locally
vim .claws/policies/soc2-baseline.yaml

# 2. Test locally
claws pinch

# 3. Preview
claws broadcast

# 4. Execute
claws broadcast --confirm

# 5. Verify
claws pinch --fleet
```

## Audit trail

Every broadcast creates an audit event in every affected workspace, recording
who pushed what files and when. `claws audit history` shows all broadcasts
across the fleet timeline.

## Scenario-Driven Additions

### From fleet-operations scenarios (89 findings applied)
- Broadcast partial failure semantics: exit code 0 for full success, exit code 2 for partial success (some workspaces failed), exit code 1 for total failure
- Retry mechanism with idempotency via manifest state machine: re-running broadcast skips already-updated workspaces via hash comparison
- Broadcast manifest schema and storage location defined: manifest tracks per-workspace status, version, timestamp, and failure reason
- Version tracking in fleet manifest: each broadcast records the policy version pushed, enabling drift detection against specific broadcasts
- Merge semantics: fleet override vs local merge clearly defined; fleet policy raises but never lowers local governance floor
- Automatic pre-broadcast snapshot for rollback: every workspace receives a snapshot before policy overwrite
- Concurrent broadcast prevention via fleet lock: two simultaneous broadcasts are blocked to prevent interleaved policies across workspaces (P-176)
- Per-workspace broadcast timeout configuration for large or slow-network fleets
- --reason required for broadcast: audit trail records who pushed what policies and why
- Pre-broadcast policy validation gate and per-workspace trust tier compatibility check

## Further reading

- [Fleet Drift](fleet-drift.md) — detecting divergence after broadcast
- [Three Rings](three-rings.md) — broadcast is part of the outer ring
- [Upgrade Lifecycle](upgrade-lifecycle.md) — broadcast after fleet upgrade
