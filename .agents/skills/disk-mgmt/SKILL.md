---
name: disk-mgmt
description: Reclaim laptop disk space across claws-managed repos and other local projects — inventory free space/checkouts, laptop-aware worktree allocate/release/enforce, prune merged PR worktrees, stale pushed branches, and safe cache reclaim.
---

# Disk Management

Use this skill when the user asks to free disk space, clean worktrees, prune
merged PR checkouts, delete stale local branches, inventory managed repos,
budget laptop disk/worktrees, or allocate/release active PR worktrees.

## Read First

```powershell
Get-Content projects\disk-mgmt\SESSION.md
Get-Content projects\disk-mgmt\BUDGET.md
Get-Content projects\disk-mgmt\README.md
Get-Content tools\disk-mgmt\README.md
```

## Laptop-aware budget

| Profile | Use | Active slots | Claws checkout cap | Keep free |
| ------- | --- | ------------ | ------------------ | --------- |
| `light` | 1-2 OpenClaw/Lobster projects + merge | 2+1=3 | ~30 GB | >=40 GB |
| `heavy` | 4-5 concurrent stacks + merge | 5+1=6 | ~50 GB | >=50 GB |

Numbers: `tools/disk-mgmt/profiles.json`.
Machine local: `projects/disk-mgmt/local/` (gitignored).

Only registry-allocated worktrees are active. Protected bases stay.
Unallocated claws feature checkouts are sprawl -> `worktree-enforce`.

## Default Policy

1. Measure before mutate (free space + laptop profile).
2. Dry-run first; deletes require `-Apply`.
3. Allocate when starting project/PR work; release when done/merged.
4. Never delete protected bases, dirty trees (unless forced), or main/master.
5. Update `projects/disk-mgmt/SESSION.md` after reclaim/enforce with free GB.

## Commands

```powershell
.\tools\disk-mgmt\laptop.ps1
.\tools\disk-mgmt\laptop.ps1 -Action set -Profile light
.\tools\disk-mgmt\laptop.ps1 -Action set -Profile heavy

.\tools\disk-mgmt\worktree-status.ps1
.\tools\disk-mgmt\worktree-allocate.ps1 -Project <area> -Branch <branch> -Name <dir>
.\tools\disk-mgmt\worktree-allocate.ps1 -Project <area> -Branch <branch> -Path <existing> -RegisterOnly
.\tools\disk-mgmt\worktree-release.ps1 -Name <dir> -Apply
.\tools\disk-mgmt\worktree-enforce.ps1
.\tools\disk-mgmt\worktree-enforce.ps1 -Apply

.\tools\disk-mgmt\inventory.ps1 -SkipSizes
.\tools\disk-mgmt\reclaim.ps1 -TempMaxAgeDays 1
```

## Project session integration

When starting work on a project area:

1. Ensure laptop profile (`light` vs `heavy`).
2. `worktree-allocate.ps1 -Project <area> -Branch ...` (or `-RegisterOnly`).
3. Implement only in the allocated path.
4. On merge/stop: `worktree-release.ps1 -Apply`.
5. If sprawl/low disk: `worktree-enforce.ps1` then `-Apply` after confirming actives are registered.

Merge land/restack: `-Kind merge` (1 merge slot per profile).

## Guardrails

- Do not enforce-apply until actives are registered (or user confirms none).
- No Docker/WSL wipe unless explicitly requested.
- No remote branch deletes unless explicitly requested.
- Operator tools/docs only in claws-hapi.
