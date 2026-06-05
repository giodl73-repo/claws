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
| `admin/` | Lobster admin spaces, managed policy baselines, Partner Center, and tenant/global admin settings. |
| `context-budget/` | Context-budget audit, runtime evidence, recommendations, and integrations. |
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
| Lobster | `lobster/SESSION.md` |
| Admin | `admin/SESSION.md` |
| Context budget | `context-budget/SESSION.md` |
| oc-path | `oc-path/SESSION.md` |
| ClawPilot | `clawpilot/SESSION.md` |
| Bugs | `bugs/SESSION.md` |
| PR watcher | `prs/SESSION.md` |

Use `session-context-template.md` when adding a new area.
