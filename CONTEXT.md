# Claws Hapi Context

This repo is Gio's operating notebook for OpenClaw and Lobster work. It should
not be used as the implementation prototype repo for OpenClaw or Lobster code.
Use it to track active PR stacks, local worktrees, durable notes, and operator
tools.

## Start Here

| Need | File |
| --- | --- |
| Workspace map | `WORKSPACE.md` |
| Active project areas | `projects/README.md` |
| Policy work | `projects/policy/README.md` |
| Doctor work | `projects/doctor/README.md` |
| Feeds work | `projects/feeds/README.md` |
| Admin work | `projects/admin/README.md` |
| Context-budget work | `projects/context-budget/README.md` |
| oc-path work | `projects/oc-path/README.md` |
| ClawPilot issue loop | `projects/clawpilot/README.md` |
| Bugfix work | `projects/bugs/README.md` |
| PR queues and Gitcrawl | `projects/prs/README.md`, `projects/prs/gitcrawl.md` |
| WSL operation | `projects/wsl/README.md`, `tools/wsl/README.md` |
| Local tools | `tools/README.md` |
| Worktree setup and audit | `tools/worktrees/README.md` |

## Starting A Project Session

When starting an agent for a project area, read that area's `SESSION.md` first,
then the area `README.md`. The session file is the live handoff: current focus,
active branch/PR, known dirty state, resume checks, and guardrails.

Common session files:

- `projects/policy/SESSION.md`
- `projects/doctor/SESSION.md`
- `projects/feeds/SESSION.md`
- `projects/admin/SESSION.md`
- `projects/context-budget/SESSION.md`
- `projects/oc-path/SESSION.md`
- `projects/clawpilot/SESSION.md`
- `projects/bugs/SESSION.md`
- `projects/prs/SESSION.md`

## Current Rules

- Put active operating notes under `projects/`, not `.craft/waves/`.
- Treat `.craft/waves/` as archive/source material unless a named artifact is
  intentionally promoted.
- Implement OpenClaw work in OpenClaw worktrees, Lobster work in Lobster
  worktrees, and RFC text in RFC worktrees.
- Do not prototype new package/code surfaces in `claws-hapi` unless the work is
  specifically for this repo's own tools or documentation.
- Keep generated local snapshots, scratch files, package outputs, and transient
  audit outputs ignored.
- Update the relevant `projects/<area>/SESSION.md` at the end of meaningful
  work so the next agent can resume from the project context.

## Worktree Hygiene

Use the local tools before creating or cleaning worktrees:

```powershell
.\tools\worktrees\setup-worktree.ps1 -Path C:\src\openclaw-example -Branch user/giodl/example -CreateBranch
.\tools\worktrees\audit-worktrees.ps1
```

The audit writes a local ignored snapshot at `projects/prs/worktrees.md`.

## WSL Hygiene

Use wrappers instead of nested PowerShell/Bash quoting:

```powershell
.\tools\wsl\wsl-run.ps1 -Repo openclaw-context-budget -Command 'git status --short --branch'
.\tools\wsl\wsl-script.ps1 -Repo openclaw-context-budget -Script @'
git status --short --branch
rg -n "contextBudget" src | head -40
'@
```

WSL active index: `/root/src/_hapi`.

## Skills

Repo-local skills:

- `.agents/skills/`: broad OpenClaw, Lobster, archive, testing, release, and
  review workflows.
- `.codex/skills/openclaw-pr-loop/`: active OpenClaw PR loop workflow.

Personal skills:

- `C:\Users\giodl\.codex\skills\codex-review`
- `C:\Users\giodl\.codex\skills\copilot-model-proxies`
- `C:\Users\giodl\.codex\skills\windows-coreutils`
- `C:\Users\giodl\.codex\skills\.system\*`

Use the named skill when the task matches it. Prefer local project context in
this file and `WORKSPACE.md` before searching old wave artifacts.

## Active Areas

- Policy: policy conformance, named evidence files, RFC addenda, Lobster managed
  policy baselines.
- Doctor: health findings, structured repair output, dry-run repair preview
  stacks.
- Feeds: OpenClaw feed primitives and Lobster Scout feed integration.
- Admin: Lobster admin spaces, managed policy baselines, Partner Center, and
  tenant/global admin settings.
- Context budget: audit, runtime evidence, recommendations, and management
  integrations.
- oc-path: destination specs, workspace path behavior, and follow-up branches.
- ClawPilot: feedback-to-issue tracking in `gim-home/m` using the
  `clawpilot-issue-loop` skill.
- Bugs: cross-cutting bugfix triage, reproduction, fix branches, and proof.
- PR watcher: staleness, proof freshness, CI/review comments, ClawSweeper, and
  branch hygiene across active PRs.

## External Worktrees

Typical locations:

- `C:\src\openclaw-*`
- `C:\tmp\openclaw-*`
- `C:\src\lobster*`
- `/root/src/*` in WSL

Run `.\tools\worktrees\audit-worktrees.ps1` for current local state.
