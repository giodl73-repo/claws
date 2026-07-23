# Upgrade Lifecycle

<!-- atom:upgrade-lifecycle (C83) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

Every OC operator has a script. It runs before and after every upgrade.
It re-applies patches, checks config, runs smoke tests, and prays.
claws replaces the script with a 4-step lifecycle and a dead man's switch.

## The cycle

```
snap save  →  upgrade  →  doctor  →  verify
    ↑                                   |
    +--------  restore (if failed)  ----+
```

## Today's 10-step script

You know this script. You wrote it after the third upgrade that broke
production.

```bash
# 1. Back up config files manually
cp -r .claws/ ~/.claws-backup-$(date +%Y%m%d)
# 2. Record current state
claws pinch --json > /tmp/pinch-before.json
# 3. Upgrade
npm install -g openclaw@latest
# 4. Check config schema changes
diff claws.json ~/.claws-json-backup-*
# 5-6. Re-apply patches and check deprecations
patch -p1 < patches/fix-tool-classification.patch  # ...8 more
# 7-8. Run smoke tests, verify audit chain
claws build && claws pinch && claws audit verify
# 9. Update incident file
echo "$(date): Upgraded" >> INCIDENTS.md
# 10. Repeat for other workspaces
for ws in /agents/*/; do cd "$ws" && ./upgrade-oc.sh; done
```

Ten steps, 35 lines, and a weekend when it goes wrong.

## The 3-command replacement

```bash
claws snap save pre-upgrade --pinch
npm install -g openclaw@latest
claws doctor --post-upgrade --fix
```

### Step 1: Snap

```
$ claws snap save pre-upgrade --pinch
  ✓ Governance state saved (claws.json, policies, audit, cache)
  ✓ Pinch passed (0 violations at save time)
  ✓ Signed manifest written
  Restore with: claws snap restore pre-upgrade
```

The `--pinch` flag validates governance before saving. If pinch fails, the
snapshot is not created — you do not snapshot a broken state.

### Step 2: Upgrade

```bash
npm install -g openclaw@latest
```

Unchanged. claws does not wrap your package manager.

### Step 3: Doctor

```
$ claws doctor --post-upgrade --fix
  Version gap: openclaw 3.14 → 4.0 (major)
  ✓ Config migration: claws.json v2 → v2 (no change)
  ✗ Skill compat: web-search deprecated API → FIXED
  ✗ Hook registration: before_tool_call missing → FIXED
  ✓ Audit chain: 1,247 events, chain intact
  2 issues found, 2 auto-fixed.
```

## The dead man's switch

The one-liner that replaces the entire script:

```bash
claws snap save pre-upgrade --pinch && \
  npm install -g openclaw@latest && \
  claws doctor --post-upgrade --fix && \
  claws pinch || \
  claws snap restore pre-upgrade
```

If any step fails, `snap restore` fires automatically. The `&&` chain
ensures each step succeeds before the next runs. The `||` catches any
failure and rolls back.

What your 10-step script did not cover: atomic rollback (your `cp -r` was
not atomic), signed manifests, auto-fix, and audit chain verification
with restore.

## Fleet upgrades

Same dead man's switch, fleet-scoped:

```bash
claws snap save pre-upgrade --fleet --pinch && \
  # ... fleet upgrade tool ... && \
  claws doctor --post-upgrade --fleet --fix && \
  claws pinch --fleet || \
  claws snap restore pre-upgrade --fleet
```

If 3 of 47 fail, only those 3 restore. The other 44 continue.

## Snapshot storage

Snapshots live in `.claws/cache/snapshots/`. Backups from `claws init` and
`claws uninstall` live in `~/.claws-backups/`. Deleting `.claws/` does not
destroy your backup.

## Scenario-Driven Additions

### From snapshot-lifecycle scenarios (48 findings applied)

- Dead man switch secondary fallback: if snap restore fails (corrupted snapshot, integrity check failure), a secondary recovery path (git stash or redundant copy) prevents total loss
- Dead man switch abort on critical violations: if the pre-upgrade state has critical governance violations, the switch refuses to proceed -- restoring a broken state is worse than failing the upgrade
- Snap save captures source files (all 9 workspace files) not just compiled IR, ensuring restore produces a coherent workspace
- Snap restore lossless carve-out: restore uses a staging-area workflow to avoid violating the add-only architecture
- Governance-neutral save vs governance-gated promote: snap save always succeeds (records violations but saves), snap promote requires pinch-clean
- Snapshot integrity verification: SHA-256 per-file hashing with HMAC-SHA256 manifest signing; mandatory verification on restore, optional on read-only operations
- Snap verify subcommand for non-destructive integrity check without restoring
- Storage limits and auto-pruning with protected categories: fleet baselines, active dead man switch snapshots, and user-pinned snapshots are never auto-pruned

## Further reading

- [Three Rings](three-rings.md) — upgrade-lifecycle is the middle ring
- [Fleet Broadcast](fleet-broadcast.md) — push policies after fleet upgrade
- [Kill Switch](kill-switch.md) — emergency stop when an upgrade goes wrong
