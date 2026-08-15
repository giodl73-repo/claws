# OpenClaw Board Model Project

Use this area for a framework-neutral client model over OpenClaw's existing
session dashboard and widget domain.

OpenClaw already owns board identity, tabs, widgets, layout, persistence,
grants, view tickets, data bindings, actions, focus, docking, and agent tools.
The missing capability is a reusable client projection outside Control UI.

## Active Notes

| Area | File |
| ---- | ---- |
| Current session | `SESSION.md` |
| Source audit | `source-audit.md` |
| First evidence slice | `slice-1-board-model.md` |

## Active Work

| Repo | Branch | Status | Purpose |
| ---- | ------ | ------ | ------- |
| `openclaw/openclaw` fork | `user/giodl/board-model-proof` at `9663cc7edc` | Worktree ready | Extract the existing Gateway board provider into a framework-neutral client model and keep Control UI as the reference adopter. |
| `bic/LobsterClaw` | `release/2026.6.33` | Version gap | The pinned generation predates the board protocol. Do not claim hosted dashboard support or backport the full dashboard stack without an admission decision. |

## First Slice

Extract one selected-session board model with:

- immutable board snapshots and subscriptions;
- `board.get` refresh after `board.changed`;
- reconnect and retired-client fencing;
- typed tab/layout/widget commands;
- preservation of current revision-bound view tickets; and
- Control UI adoption without visual changes.

Lobster native rendering is a later adopter slice. The first deletion target is
Control UI's UI-local Gateway board provider, not OpenClaw board semantics.

## LobsterClaw Admission

The board domain arrived after the pinned 2026.6.33 generation as a coordinated
series beginning with OpenClaw PRs #110960 and #111218. Prefer qualifying a
newer OpenClaw release that already contains the complete board stack. A 6.33
backport requires an explicit product urgency decision and complete dependency,
security, persistence, and sandbox proof.

## Related Areas

- `projects/control-model/README.md`
- `projects/control-ui/README.md`
- `projects/lobsterclaw/README.md`

