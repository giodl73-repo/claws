# Disk Management Project

Use this area for laptop disk reclaim across claws-managed checkouts and other
local projects. Primary pressure source is usually OpenClaw/Lobster/claws
worktrees under `C:\src`, but the tools also inventory craft, maxim, and other
families.

## Active Notes

| Area                                | File                                               |
| ----------------------------------- | -------------------------------------------------- |
| Session handoff                     | `SESSION.md`                                       |
| Laptop GB + slot budgets            | `BUDGET.md`                                        |
| Last inventory                      | `last-inventory.md`                                |
| Last repo inventory                 | `last-repos.md`                                    |
| Last worktree status                | `last-worktree-status.md`                          |
| Last worktree enforce               | `last-worktree-enforce.md`                         |
| Last merged-PR prune                | `last-prune-merged.md`                             |
| Last branch prune                   | `last-prune-branches.md`                           |
| Last reclaim run                    | `last-reclaim.md`                                  |
| Local profile/registry (gitignored) | `local/laptop.json`, `local/active-worktrees.json` |
| Tool docs                           | `../../tools/disk-mgmt/README.md`                  |
| Related worktree audit              | `../prs/worktrees.md`                              |

## Goals

1. Keep free space healthy on every laptop (target: **>50 GB free** on system drive).
2. Inventory managed repos with claws as family #1.
3. Remove local worktrees for **merged** or **closed** PRs.
4. Delete **stale local branches** only when already pushed.
5. Apply safe reclaim techniques (package caches, git gc, retired trees).

## Standard Loop

```powershell
# 0) Laptop profile + budget (light=1-2 projects, heavy=4-5)
.\tools\disk-mgmt\laptop.ps1
.\tools\disk-mgmt\laptop.ps1 -Action set -Profile light

# 1) Allocator status (active slots vs unallocated sprawl)
.\tools\disk-mgmt\worktree-status.ps1

# 2) When starting project/PR work — allocate a slot
.\tools\disk-mgmt\worktree-allocate.ps1 -Project doctor -Branch user/giodl/x -Name openclaw-doctor-x

# 3) Enforce: remove unallocated claws feature checkouts (dry-run then apply)
.\tools\disk-mgmt\worktree-enforce.ps1
.\tools\disk-mgmt\worktree-enforce.ps1 -Apply

# 4) When done / merged — release slot
.\tools\disk-mgmt\worktree-release.ps1 -Name openclaw-doctor-x -Apply

# 5) Caches / temp / retired trees
.\tools\disk-mgmt\reclaim.ps1 -Apply -TempMaxAgeDays 1

# 6) Confirm free space vs profile target
.\tools\disk-mgmt\inventory.ps1 -SkipSizes
```

## High-value reclaim targets (typical laptop)

| Target          | Notes                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| `%TEMP%`        | Often largest quick win; use `-TempMaxAgeDays 1` when critical                    |
| Docker data     | Manual: `docker system prune -af --volumes` after confirming no needed containers |
| claws worktrees | `prune-merged.ps1 -OnlyPrTerminal` then broader stale-pushed review               |
| Package caches  | pnpm/npm/yarn via `reclaim.ps1`                                                   |
| Profile caches  | `.codex`, `.copilot`, `.rustup`, `%LOCALAPPDATA%\Packages` — review before delete |

## Safety Rules

- Dry-run by default; require `-Apply` to mutate.
- Never delete `main`/`master`.
- Skip dirty worktrees unless `-ForceDirty`.
- Prefer PR state from `gh` (`MERGED`/`CLOSED`) before removing feature checkouts.
- Stale branch delete requires evidence the branch is pushed.
- Review report markdown under this folder before apply on a new machine.

## Families

| Family  | Match signals                                                                          |
| ------- | -------------------------------------------------------------------------------------- |
| `claws` | openclaw, lobster, claws, clawpilot, resonance, *crawl, clawhub, promoteclaw, typeclaw |
| `craft` | craftworks, craft-*                                                                    |
| `maxim` | MAXIM-agent*                                                                           |
| `other` | everything else under configured roots                                                 |

Override roots with `-Roots C:\src,D:\work` on non-default laptops.

## Related Areas

- `projects/prs/README.md` — PR queue / worktree audit notes
- `tools/worktrees/README.md` — worktree setup + conservative audit
- `.agents/skills/disk-mgmt/SKILL.md` — agent workflow
