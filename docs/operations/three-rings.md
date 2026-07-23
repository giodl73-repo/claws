# Three Rings of Continuous Governance

<!-- atom:three-rings (C40) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

Your upgrade script exists because there is no inner ring.

claws replaces that script with three concentric rings of governance that run
at different cadences, catch different problems, and cover different scopes.

## The rings

```
+-----------------------------------------------------------+
|                OUTER — FLEET (weekly)                       |
|  drift . pinch --fleet . broadcast . comply --fleet        |
|  +-----------------------------------------------------+  |
|  |          MIDDLE — UPGRADE (monthly)                  |  |
|  |  doctor --post-upgrade . snap save/restore . diff    |  |
|  |  +-----------------------------------------------+  |  |
|  |  |       INNER — LIVE (every save)                |  |  |
|  |  |  watch . pinch --staged . build (auto-pinch)   |  |  |
|  |  +-----------------------------------------------+  |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

| Ring   | Trigger                | Latency | Catches       |
| ------ | ---------------------- | ------- | ------------- |
| Inner  | File save, git commit  | <1s     | 70% of issues |
| Middle | Platform/claws upgrade | <15s    | 20% of issues |
| Outer  | Weekly cron, on-demand | <120s   | 10% of issues |

## Inner ring: catch it on save

`claws watch` recompiles and runs `pinch` on every file change. The
pre-commit hook (`claws pinch --staged`) is its backstop.

```
$ claws watch
  09:14:02  SOUL.md changed
            ✓ Built (847 tokens)  ✓ Pinched (0 violations)
  09:17:31  TOOLS.md changed
            ✗ G-CLASS  tool "send-email" is R5 but workspace is T2
              Fix: raise trust tier to T3, or remove the tool
```

Before claws, you find this after the next upgrade breaks it. With the
inner ring, you find it in under a second.

## Middle ring: survive the upgrade

`claws doctor --post-upgrade` runs after you upgrade OC or claws. It checks
version gaps, config migrations, and skill compatibility.

```
$ claws doctor --post-upgrade
  Version gap: openclaw 3.14 → 4.0 (major)
  ✓ Config migration: claws.json v2 → v2 (no change needed)
  ✗ Skill compat: web-search uses deprecated tool API
    Fix: run 'claws pinch --fix' to update skill binding
  ✓ Audit chain: 1,247 events, chain intact
```

If something is too broken, `claws snap restore pre-upgrade` rolls back.

## Outer ring: catch the drift

`claws drift` detects when workspaces diverge from fleet policy — someone
edited claws.json, someone skipped an upgrade, someone deleted a policy file.

```
$ claws drift
  2 drifted:
    dev-analytics    claws.json modified (trustTier: 3 → 1)
    staging-hr       policies/soc2-baseline.yaml deleted
  45 clean.
  Run 'claws pinch --fleet --fix' to remediate.
```

Before claws, this was a 45-minute Monday morning review that missed half
the problems. With the outer ring, it runs on a cron and catches everything.

## The 70/20/10 split

The inner ring catches 70% because most problems are introduced during
editing — wrong risk tier, missing frontmatter, tool classification errors.
The middle ring catches 20% because upgrades introduce breaking changes.
The outer ring catches 10% because drift is rare when the other rings work.

If you spend most time in the outer ring, your inner ring is broken. Fix
`claws watch` first.

## Before and after

**Before**: SSH to workspace, run smoke tests, check config, diff baseline,
re-apply 8 patches, check deprecations, update incident file, repeat for
47 workspaces, hope nothing drifted since step 1.

**After**:

```bash
claws watch                           # inner — every save, automatic
claws doctor --post-upgrade --fix     # middle — monthly, after upgrade
claws drift                           # outer — weekly cron
```

Three commands. Zero scripts. The model composes from existing commands —
only two new flags (`--post-upgrade` on doctor, `--pre-upgrade` on snap save).

## Scenario-Driven Additions

### From three-rings scenarios (50 findings applied)

- IR file concurrency model: atomic write or file-level locking prevents TOCTOU races where outer ring reads a partially-written GovernanceIR file (P-167)
- Cross-ring cache invalidation protocol: when middle ring modifies workspace state, inner ring cache is explicitly invalidated
- Inner ring paused during middle-ring operations to prevent false violations against intermediate state during doctor --fix (P-168)
- Inter-ring escalation protocol: structured diagnostic suggestions flow from inner to middle to outer, with human-initiated-only constraint for ring transitions
- Permission boundaries across ring escalation: inner ring diagnostics scope limited to governance rules, not infrastructure
- Escalation UX deduplication: cross-ring diagnostics that appear in multiple rings are shown once with ring attribution
- Rings are semi-independent with ordering constraints, not fully independent -- inner must pause for middle, outer skips active-middle workspaces during fleet scan
- Single-instance watcher enforcement via PID file prevents orphaned processes on Windows (P-169)
- Tool-skill dependency graph in cached IR enables SKILL-TOOL-GHOST detection without full recompile

## Further reading

- [Upgrade Lifecycle](upgrade-lifecycle.md) — the full snap/upgrade/doctor/verify cycle
- [Fleet Drift](fleet-drift.md) — how drift detection works (hash-based)
- [Fleet Broadcast](fleet-broadcast.md) — pushing policies to all workspaces
