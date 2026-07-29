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

- Last updated: 2026-07-29
- Last agent: Codex
- Current focus: track active project worktrees under the laptop-aware allocator
- Active branch / PR: local tools on claws-hapi
- Known dirty state: disk-mgmt allocator tools/docs; local registry gitignored
- Laptop profile: **heavy** (4–5 projects + 1 merge; claws cap ~50 GB; free target ≥50 GB)
- Other laptop profile: **heavy** (4–5 projects + merge; claws cap ~50 GB; free target ≥50 GB)
- Free space trajectory: ~5 → ~10 → ~23 → ~40 → ~253 → **~249 GB free** on `DESKTOP-INBLCCK`; comfortably above heavy target
- First enforce removed ~40 unallocated claws feature/detached trees; current active registry now **6/6**:
  `feeds` (`C:\src\lobster-feeds-claw-mos-package`, Lobster PR #6169 open),
  `hosting-profiles` (`C:\src\openclaw-hosting-profiles-current`, fork PR #157 open),
  `hosted-integration` (`C:\src\openclaw-reverse-carrier-owner`, fork PR #184 open),
  `state-continuity` (`C:\src\openclaw-rfc0013-restored-admission`, upstream PR #112896 open),
  `control-ui` (`C:\src\lobster-control-ui-surgical`, Lobster PR #6121 open),
  `managed-config` (`C:\src\openclaw-rfcs-managed-config-rfc-only`, clean RFC worktree; no matching live PR found by `gh pr list` on fork).
- Current registry intentionally has **6 project slots / 5 nominal heavy project slots** because Gio named six active project areas beyond protected `claws-hapi`.
- 2026-07-29 project-note regulation pass: checked the named project sessions for `claws`, `feeds`, `hosting-profiles`, `hosted-integration`, `state-continuity`, `control-ui`, and `managed-config` against live PR state. No active named project worktree was terminal/merged. Keep the six registered slots above, and treat the following unregistered worktrees as **valid but over budget** while their project notes/PRs remain open:
  `C:\src\openclaw-claws-application-pr2` (OpenClaw #115962 open draft),
  `C:\src\awesome-claws-private-prototype` (awesome-claws #1 open draft),
  `C:\src\lobster-feeds-builder-name` (Lobster #5947 open draft),
  `C:\src\lobster-control-ui-proof` (Lobster #6088 open draft, currently branch `control-ui-root-cutover`),
  `C:\src\openclaw-control-ui-host-policy-main` (OpenClaw #115408 open draft),
  `C:\src\openclaw-control-ui-server-policy` (OpenClaw #116013 open draft),
  `C:\src\lobster-reverse-carrier-runtime-peer` / `selection` / `owner` (giodl Lobster #60/#61/#62 open drafts),
  `C:\src\openclaw-rfc0013-final-capture` (OpenClaw #112865 open),
  `C:\src\openclaw-rfcs-state-continuity` (deprecated RFC 0021 evidence in project notes),
  and `C:\src\lobster-rfc0013-retained-wake-delivery` (giodl Lobster #51 open draft).
- Cleanup candidates after the regulation pass: `C:\src\claws` is clean but tracks a gone branch and has a parked stash, so do not remove without deciding that stash/branch is obsolete. Stale clean claws-hapi linked worktrees (`claws-hapi-84221`, detached `claws-hapi-84307`, `claws-hapi-galin-dls`, `claws-hapi-signing`, old temp/session-sync paths) remain review/remove candidates. `claws-hapi-83990` has a local commit from this session and must be pushed/restacked before removal.
- Broad `worktree-status`, `prune-merged`, `prune-branches`, and `reclaim` scans timed out on this laptop's large checkout population; orphaned `git status` children from those scans were stopped. Prefer bounded Git worktree-list surveys or script fixes before full apply.
- Allocator rule: only `local/active-worktrees.json` slots stay; protected bases = `claws-hapi`, `lobster`, `openclaw`/`srcopenclaw`

## Resume Checklist

- Run: `.\tools\disk-mgmt\laptop.ps1`
- Before project work: `worktree-allocate.ps1 -Project <area> -Branch ...`
- After merge/stop: `worktree-release.ps1 -Apply`
- Periodic: `worktree-enforce.ps1` then `-Apply`
- Optional: clear remaining dirty/unallocated-extra-base after manual review
- On other laptop: `laptop.ps1 -Action set -Profile heavy` then same loop

## Guardrails

- Keep implementation of product code out of `claws-hapi`; only operator tools/docs here.
- Default dry-run; never bulk-delete dirty trees.
- Do not delete unpushed local-only branches.
- Prefer claws family first, then craft/maxim/other.
- Update this file at the end of a meaningful reclaim session.

## Open Threads

- First full inventory with sizes may be slow on 200+ dirs under `C:\src`.
- Primary OpenClaw checkout appears as `C:\src\srcopenclaw` (not `C:\src\openclaw`) on this machine — confirm per laptop.
- Many `openclaw-*` sibling directories may be full clones rather than linked worktrees; prune-merged should still remove merged/closed ones when clean.
- Consider WSL disk reclaim as a follow-up (`tools/wsl`) once Windows free space is healthy.

## Session Checkpoints

Detailed session handoffs live in `sessions/` when created with the project-session checkpoint script. Keep this file as the concise canonical resume snapshot.
