# Disk Management Session

## Agent Start

1. Read this file.
2. Read `projects/disk-mgmt/README.md`.
3. Read `tools/disk-mgmt/README.md`.
4. Check live free space before acting.

## Baseline

- Area: disk-mgmt
- Primary repo: `claws-hapi` (tools + notes only)
- Local worktree: `C:\src\claws-hapi`
- Current branch: `main` (unless noted)
- Main tracking file: `projects/disk-mgmt/README.md`
- Skill to use: `disk-mgmt`

## Current Session

- Last updated: 2026-08-04
- Last agent: Codex
- Current focus: laptop reclaim + OneDrive Files On-Demand; claws allocator remains in place
- Active branch / PR: local tools on claws-hapi
- Known dirty state: docs updates (`SESSION.md`, `C-DRIVE-MAP.md`); local registry gitignored
- Laptop profile: **light** (1–2 projects + 1 merge; claws cap ~30 GB; free target ≥40 GB)
- Other laptop profile: **heavy** (4–5 projects + merge; claws cap ~50 GB; free target ≥50 GB)
- Free space: **~45.3 GB free** after the 2026-08-04 reclaim (was critical 6.2 GB)
- Reclaim done this wave:
  - Unallocated claws worktrees enforced; temp/caches pruned
  - iCloud photo libs removed
  - Personal OneDrive was historically unlinked and its local tree deleted; on
    2026-08-04 it was reconnected with Files On-Demand. The private BERTICA
    review package is verified cloud-only/unpinned (`O U`); do not bulk-hydrate.
  - Extra census at `OneDrive - Microsoft\census` removed
  - Business OD cold bulk removed: census data, Kartye, camera roll, Videos/Pictures, old photo folders, `collx.xlsx`
- Business OD now ~**18 GB** (mostly `Documents` ~17 GB) — keep business account
- Still large optional: WSL ~179 GB, `C:\src\apportionment` ~105 GB, Docker ~10 GB
- 2026-08-04 safe reclaim: package caches, user temp older than one day, and
  managed Git compaction raised free space from 6.2 GB to 28.2 GB.
- 2026-08-04 worktree enforcement removed seven clean, unallocated checkouts
  after dry-run review while preserving all three registered active slots,
  dirty/review checkouts, and protected bases; free space reached 45.3 GB.

## Resume Checklist

- Run: `.\tools\disk-mgmt\laptop.ps1`
- Before project work: `worktree-allocate.ps1 -Project <area> -Branch ...`
- After merge/stop: `worktree-release.ps1 -Apply`
- Periodic: `worktree-enforce.ps1` then `-Apply`
- Optional next: WSL unused distro export/unregister; Docker prune; review `Documents` on business OD; apportionment if not needed here
- On other laptop: `laptop.ps1 -Action set -Profile heavy` then same loop

## Guardrails

- Keep implementation of product code out of `claws-hapi`; only operator tools/docs here.
- Default dry-run; never bulk-delete dirty trees.
- Do not delete unpushed local-only branches.
- Never delete linked OneDrive paths without unlink/On-Demand plan (cloud wipe risk).
- Prefer claws family first, then craft/maxim/other.
- Update this file at the end of a meaningful reclaim session.

## Open Threads

- First full inventory with sizes may be slow on 200+ dirs under `C:\src`.
- Primary OpenClaw checkout appears as `C:\src\srcopenclaw` (not `C:\src\openclaw`) on this machine — confirm per laptop.
- Many `openclaw-*` sibling directories may be full clones rather than linked worktrees; prune-merged should still remove merged/closed ones when clean.
- WSL large stopped distro (~140 GB class) is the next biggest win if unused.
- Business OD deletes may sync to cloud — confirm cloud retention on another PC if anything was still needed online.

## Session Checkpoints

Detailed session handoffs live in `sessions/` when created with the project-session checkpoint script. Keep this file as the concise canonical resume snapshot.
