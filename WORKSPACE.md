# Claws Hapi Workspace

This checkout is the local operating notebook for OpenClaw and Lobster work. It
is not only a source package checkout; it also tracks PR queues, project notes,
local tools, and wave research.

For agent and harness entry points, start with `CONTEXT.md`.

## Active Map

| Area | Home | Purpose |
| --- | --- | --- |
| OpenClaw PR work | `projects/openclaw/` | Current OpenClaw branches, PR notes, review loops, proof, and RFC tracking. |
| Lobster work | `projects/lobster/` | Lobster worktrees, dashboard links, PR notes, and local runtime notes. |
| Policy | `projects/policy/` | Active policy conformance, evidence, RFC, and Lobster baseline work. |
| Doctor | `projects/doctor/` | Active doctor health and structured-repair PR stacks. |
| Feeds | `projects/feeds/` | OpenClaw feed support and Lobster Scout feed PR stacks. |
| UX state | `projects/ux-state/` | Gated Lobster Feeds, Policy, and Context Budget UX previews, flags, and design-review notes. |
| Admin | `projects/admin/` | Lobster admin spaces, managed policy baselines, and Partner Center notes. |
| Context budget | `projects/context-budget/` | Context-budget PR plan, branches, and proof notes. |
| Snapshot | `projects/snapshot/` | SQLite-safe snapshot/restore plugin, backup integration, failover substrate, and RFC coordination. |
| Memory | `projects/memory/` | Agent memory strategy, OpenClaw assessment, and XAI report notes. |
| oc-path | `projects/oc-path/` | oc-path worktrees, specs, and follow-up PRs. |
| ClawPilot | `projects/clawpilot/` | ClawPilot feedback-to-issue tracking and issue-loop notes. |
| Bugs | `projects/bugs/` | Cross-cutting bugfix triage, reproduction notes, and fix proof. |
| Local tools | `tools/` | Repo-local operator tools and launch notes. |
| WSL tools | `tools/wsl/` and `projects/wsl/` | Stable wrappers and WSL worktree index for OpenClaw/Lobster work under `/root/src`. |
| PR queues | `projects/prs/` | Cross-project PR tracking, staleness, proof, and watcher notes. |
| Archived waves | `.craft/waves/` | Historical research, panels, proposals, and generated wave artifacts. Do not use this as the active task surface. |

## Current External Worktrees

| Project | Path | Notes |
| --- | --- | --- |
| OpenClaw | `C:\src\openclaw` and PR-specific `C:\src\openclaw-*` worktrees | Use for upstream OpenClaw implementation and PR stacks. |
| Lobster | `C:\src\lobster` | Main Lobster checkout. |
| LobsterTank | `C:\src\lobster-lobstertank` | Dashboard worktree; current dashboard code is in `tools/lobstertank/`. |
| RFCs | `C:\src\openclaw-rfcs` or the active RFC worktree when present | Use for RFC text and discussion follow-up. |
| WSL active index | `/root/src/_hapi` | Symlinks to active WSL OpenClaw/RFC worktrees. |

## Rules

- Put active operating notes under `projects/`, not inside `.craft/waves/`.
- Treat `.craft/waves/` as archive/source material unless intentionally promoting an artifact.
- Put runnable local helper tools under `tools/<name>/` with a README and a stop command.
- Keep PR proof and review-loop notes close to the project they belong to.
- Before moving old wave artifacts, add an index first and move only obvious, named artifacts.
