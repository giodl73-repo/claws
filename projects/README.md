# Projects

This directory is the active operating surface for Gio's OpenClaw and Lobster
work. Use it for project indexes, PR queues, and durable notes that should not
be buried in generated wave directories.

## Layout

| Directory | Use |
| --- | --- |
| `policy/` | Policy conformance, evidence files, RFC addenda, and Lobster policy baselines. |
| `doctor/` | Doctor health findings, structured repairs, and repair-stack PRs. |
| `feeds/` | OpenClaw feed primitives and Lobster Scout feed integration. |
| `ux-state/` | Gated Lobster Feeds, Policy, and Context Budget UX previews, flags, and design-review notes. |
| `admin/` | Lobster admin spaces, managed policy baselines, Partner Center, and tenant/global admin settings. |
| `context-budget/` | Context-budget audit, runtime evidence, recommendations, and integrations. |
| `snapshot/` | SQLite-safe snapshot/restore plugin, backup integration, failover substrate, and RFC coordination. |
| `memory/` | Agent memory strategy, OpenClaw memory assessment, and XAI report coordination. |
| `claws-review-bot/` | `@bic/claws-review-bot` package notes; primary Lobster PR reviewer lane plus separate ClawPilot issue-classifier experiment. |
| `oc-path/` | oc-path, workspace destination specs, and related local worktrees. |
| `clawpilot/` | ClawPilot issue-loop and feedback-to-issue tracking. |
| `bugs/` | Cross-cutting bugfix triage, reproduction notes, fix branches, and proof. |
| `openclaw/` | OpenClaw PR stacks, RFC coordination, maintainer notes, proof commands. |
| `lobster/` | Lobster worktree links, LobsterTank notes, runtime/dashboard notes. |
| `prs/` | Cross-project PR queue views, staleness, proof, and watcher notes. |

Wave directories under `.craft/waves/` remain historical context. Promote useful
wave output into one of these directories when it becomes active work.

## Session Contexts

Each active project area should have a `SESSION.md` file. Start there when a new
agent is assigned to an area, then read the area `README.md`.

| Area | Session |
| --- | --- |
| Policy | `policy/SESSION.md` |
| Doctor | `doctor/SESSION.md` |
| Feeds | `feeds/SESSION.md` |
| UX state | `ux-state/SESSION.md` |
| Lobster | `lobster/SESSION.md` |
| Admin | `admin/SESSION.md` |
| Context budget | `context-budget/SESSION.md` |
| Snapshot | `snapshot/SESSION.md` |
| Memory | `memory/SESSION.md` |
| Claws Review Bot | `claws-review-bot/SESSION.md` |
| oc-path | `oc-path/SESSION.md` |
| ClawPilot | `clawpilot/SESSION.md` |
| Bugs | `bugs/SESSION.md` |
| PR watcher | `prs/SESSION.md` |

Use `session-context-template.md` when adding a new area.
