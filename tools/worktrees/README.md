# Worktree Tools

Use these scripts to keep OpenClaw and Lobster worktrees visible, hydrated, and
easy to retire.

## Audit

```powershell
.\tools\worktrees\audit-worktrees.ps1
```

This writes `projects/prs/worktrees.md` and classifies local worktrees as:

- `active-dirty`
- `active-clean`
- `base`
- `stale-review`

The script never deletes worktrees.

## Setup

Create a new worktree and install dependencies:

```powershell
.\tools\worktrees\setup-worktree.ps1 `
  -Repo C:\src\claws-hapi `
  -Path C:\src\openclaw-policy-next `
  -Branch user/giodl/policy-next `
  -Base main `
  -CreateBranch
```

Hydrate an existing worktree:

```powershell
.\tools\worktrees\setup-worktree.ps1 `
  -Path C:\src\openclaw-policy-next `
  -Branch user/giodl/policy-next `
  -ForceInstall
```

The setup script detects `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`,
enables Corepack when available, initializes submodules when present, and runs
the matching install command. Use `-NoInstall` when you only want the worktree.
