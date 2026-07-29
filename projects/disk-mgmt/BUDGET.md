# Laptop Worktree Budget

Virtual worktree allocator: only **actively worked PRs/projects** keep a local
checkout slot. Everything else is unallocated and eligible for removal.

## Reasonable GB targets

| Profile | When to use | Active slots | Per worktree | Active set | Bases floor | Claws checkout cap | Keep free |
| ------- | ----------- | ------------ | ------------ | ---------- | ----------- | ------------------ | --------- |
| **light** | This laptop: 1–2 OpenClaw/Lobster projects + merging | 2 project + 1 merge = **3** | ~3 GB | **12 GB** | ~15 GB | **30 GB** | **≥40 GB** (warn &lt;25, critical &lt;15) |
| **heavy** | Other laptop: 4–5 concurrent stacks + merging | 5 project + 1 merge = **6** | ~3 GB | **24 GB** | ~20 GB | **50 GB** | **≥50 GB** (warn &lt;30, critical &lt;20) |

### Why these numbers

- A hydrated OpenClaw/Lobster feature worktree is typically ~1–3 GB (git objects
  shared when using real `git worktree`; full clones cost more).
- Budget **~3 GB/slot** so installs and build artifacts do not immediately blow
  the plan.
- **Bases** (protected, always kept): only `claws-hapi`, `lobster`,
  `openclaw`/`srcopenclaw`. Everything else (clawpilot, clawhub, RFCs, feature
  clones) must be **allocated** while active or it is enforce-removable.
- **Free space** targets leave room for OS, Docker optional, browsers, and temp
  spikes. Critical threshold blocks new allocates.

Source of truth for numbers: `tools/disk-mgmt/profiles.json`.

## Allocator model

```text
protected bases     -> always keep
active registry     -> only PRs/projects you are working now (slot budget)
unallocated claws   -> remove on enforce (unless dirty)
```

Local state (gitignored per machine):

- `projects/disk-mgmt/local/laptop.json` — profile selection (`light`/`heavy`)
- `projects/disk-mgmt/local/active-worktrees.json` — allocated slots

## Commands

```powershell
# Show / set laptop profile
.\tools\disk-mgmt\laptop.ps1
.\tools\disk-mgmt\laptop.ps1 -Action set -Profile light
.\tools\disk-mgmt\laptop.ps1 -Action set -Profile heavy

# Status vs budget (classifies every claws checkout)
.\tools\disk-mgmt\worktree-status.ps1

# Allocate when starting project/PR work
.\tools\disk-mgmt\worktree-allocate.ps1 `
  -Project doctor `
  -Branch user/giodl/doctor-fix `
  -Name openclaw-doctor-fix `
  -Pr 12345

# Register an existing checkout into the active budget
.\tools\disk-mgmt\worktree-allocate.ps1 `
  -Project feeds `
  -Branch user/giodl/feeds-x `
  -Path C:\src\openclaw-feeds-x `
  -RegisterOnly

# Release when PR merged or you stop work
.\tools\disk-mgmt\worktree-release.ps1 -Name openclaw-doctor-fix -Apply

# Remove all unallocated claws feature checkouts (dry-run then apply)
.\tools\disk-mgmt\worktree-enforce.ps1
.\tools\disk-mgmt\worktree-enforce.ps1 -Apply
```

## Project session rule

When starting work in a `projects/<area>` session:

1. `worktree-allocate.ps1 -Project <area> -Branch ...` (or `-RegisterOnly`)
2. Do the work in that path only
3. On merge/stop: `worktree-release.ps1 -Apply`
4. Periodically: `worktree-enforce.ps1` so unallocated sprawl dies

Merge lane: use `-Kind merge` for short-lived land/restack checkouts. Light
profile allows **1** merge slot; heavy allows **1** as well (raise in
`profiles.json` if needed).
