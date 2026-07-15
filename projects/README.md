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
| `catalog/` | OpenClaw command/tool catalog metadata, generated docs, prompt/audit lenses, and PR/RFC stack notes. |
| `ux-state/` | Gated Lobster Feeds, Policy, and Context Budget UX previews, flags, and design-review notes. |
| `admin/` | Lobster admin spaces, managed policy baselines, Partner Center, and tenant/global admin settings. |
| `config-admin/` | Shared Lobster/OpenClaw admin-config UX framework: settings descriptors, preview-first validation, governed save, and Scout CLI parity. |
| `staffing/` | Staffing analysis across Lobster and ClawPilot; WorkIQ only as a search term. |
| `context-budget/` | Context-budget audit, runtime evidence, recommendations, and integrations. |
| `snapshot/` | SQLite-safe snapshot/restore plugin, backup integration, failover substrate, and RFC coordination. |
| `hosting-profiles/` | Standard OpenClaw hostee profiles, ready checks, status conditions, and container/platform hosting conventions. |
| `layering-contracts/` | Umbrella Lobster/OpenClaw host-runtime contract portfolio, boundary audit, and upstream contract extraction. |
| `managed-config/` | Managed and operator config authority, transactional effective config, conformance, and Lobster config-writer deletion. |
| `hosted-integration/` | Host integration bundles, owner-selected capability bindings, Hosting Profiles, narrow carriers, and ProxyPipe retirement. |
| `state-continuity/` | State inventory, consistency, checkpoint/publication, dirty/synced status, fencing, restore, and persistence deletion. |
| `promoteclaw/` | Lobster OpenClaw version promotion from quarantine-cleared LTS releases, including patch carry-forward/drop validation. |
| `typeclaw/` | OpenClaw TypeScript native / TS7 performance and compatibility evaluation. |
| `memory/` | Agent memory strategy, OpenClaw memory assessment, and XAI report coordination. |
| `mail/` | OpenClaw mail-channel research, mail plugin options, and Exchange/Microsoft Graph integration framing. |
| `claws/` | OpenClaw RFC direction for runnable starter setups across skills, plugins, MCP servers, workspace files, persona files, and automations. |
| `claws-review-bot/` | `@bic/claws-review-bot` package notes; primary Lobster PR reviewer lane plus separate ClawPilot issue-classifier experiment. |
| `oc-path/` | oc-path, workspace destination specs, and related local worktrees. |
| `clawpilot/` | ClawPilot issue-loop and feedback-to-issue tracking. |
| `bugs/` | Cross-cutting bugfix triage, reproduction notes, fix branches, and proof. |
| `openclaw/` | OpenClaw PR stacks, RFC coordination, maintainer notes, proof commands. |
| `lobster/` | Lobster worktree links, LobsterTank notes, runtime/dashboard notes. |
| `pr-loop/` | Active PR-loop operations, dependency restacks, review refreshes, and CI gate handoffs. |
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
| Catalog | `catalog/SESSION.md` |
| UX state | `ux-state/SESSION.md` |
| Lobster | `lobster/SESSION.md` |
| Admin | `admin/SESSION.md` |
| Config admin UX | `config-admin/SESSION.md` |
| Staffing | `staffing/SESSION.md` |
| Context budget | `context-budget/SESSION.md` |
| Snapshot | `snapshot/SESSION.md` |
| OpenClaw hosting profiles | `hosting-profiles/SESSION.md` |
| Lobster/OpenClaw layering contracts | `layering-contracts/SESSION.md` |
| Managed Configuration | `managed-config/SESSION.md` |
| Hosted Integration | `hosted-integration/SESSION.md` |
| Runtime State Continuity | `state-continuity/SESSION.md` |
| PromoteClaw | `promoteclaw/SESSION.md` |
| TypeClaw | `typeclaw/SESSION.md` |
| Memory | `memory/SESSION.md` |
| Mail | `mail/SESSION.md` |
| Claws | `claws/SESSION.md` |
| Claws Review Bot | `claws-review-bot/SESSION.md` |
| oc-path | `oc-path/SESSION.md` |
| ClawPilot | `clawpilot/SESSION.md` |
| Bugs | `bugs/SESSION.md` |
| PR loop | `pr-loop/SESSION.md` |
| PR watcher | `prs/SESSION.md` |

Use `session-context-template.md` when adding a new area.
