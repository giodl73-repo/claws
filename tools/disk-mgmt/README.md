# Disk Management Tools

Reclaim laptop disk space safely across claws-managed checkouts and other local
projects. Default mode is always dry-run.

## Purpose

- Inventory free space and large roots
- Inventory managed git repos/worktrees (claws family first, then others)
- **Laptop-aware virtual worktree allocator** (only active PR/project slots)
- Identify removable worktrees for merged/closed PRs
- Prune stale local branches that are already pushed
- Apply common reclaim techniques (`git gc`, package caches, retired trees)

## Laptop budgets

See `projects/disk-mgmt/BUDGET.md` and `tools/disk-mgmt/profiles.json`.

| Profile | Slots | Claws checkout cap | Keep free |
| ------- | ----- | ------------------ | --------- |
| `light` (1–2 projects + merge) | 3 | ~30 GB | ≥40 GB |
| `heavy` (4–5 projects + merge) | 6 | ~50 GB | ≥50 GB |

```powershell
.\tools\disk-mgmt\laptop.ps1
.\tools\disk-mgmt\laptop.ps1 -Action set -Profile light
.\tools\disk-mgmt\worktree-status.ps1
.\tools\disk-mgmt\worktree-allocate.ps1 -Project doctor -Branch user/giodl/x -Name openclaw-doctor-x
.\tools\disk-mgmt\worktree-release.ps1 -Name openclaw-doctor-x -Apply
.\tools\disk-mgmt\worktree-enforce.ps1          # dry-run unallocated removal
.\tools\disk-mgmt\worktree-enforce.ps1 -Apply
```

## Run

From `claws-hapi` root:

```powershell
# Full inventory (sizes + repos)
.\tools\disk-mgmt\inventory.ps1

# Repo/worktree inventory only
.\tools\disk-mgmt\repos.ps1

# Merged/closed PR worktree candidates (dry-run)
.\tools\disk-mgmt\prune-merged.ps1

# Only MERGED/CLOSED PR worktrees (recommended)
.\tools\disk-mgmt\prune-merged.ps1 -OnlyPrTerminal

# Apply removals after review
.\tools\disk-mgmt\prune-merged.ps1 -OnlyPrTerminal -Apply

# Stale local branches that are pushed (dry-run)
.\tools\disk-mgmt\prune-branches.ps1

# Apply branch deletes
.\tools\disk-mgmt\prune-branches.ps1 -Apply

# Cache / technique reclaim candidates (dry-run)
.\tools\disk-mgmt\reclaim.ps1

# Apply safe cache cleans
.\tools\disk-mgmt\reclaim.ps1 -Apply
```

## Stop

These scripts are one-shot. Press Ctrl+C if a long inventory is running.

## Validation

```powershell
.\tools\disk-mgmt\inventory.ps1 -SkipSizes
.\tools\disk-mgmt\repos.ps1 -Family claws -Limit 20
Test-Path .\tools\disk-mgmt\README.md
```

## Safety

- Default is dry-run. Nothing is deleted without `-Apply`.
- Dirty worktrees and unpushed commits are skipped unless `-ForceDirty`.
- Base branches (`main`/`master`) are never deleted.
- Prefer reviewing `projects/disk-mgmt/last-inventory.md` before apply.
- Primary claws roots default to `C:\src` and `C:\tmp`; override with `-Roots`.

## Outputs

Local ignored/session notes may be written under:

- `projects/disk-mgmt/last-inventory.md`
- `projects/disk-mgmt/last-prune-merged.md`
- `projects/disk-mgmt/last-prune-branches.md`
- `projects/disk-mgmt/last-reclaim.md`

## Source of truth

- Operating notes: `projects/disk-mgmt/`
- Agent skill: `.agents/skills/disk-mgmt/SKILL.md`
- Related: `tools/worktrees/audit-worktrees.ps1`
