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
| `openclaw/openclaw` fork | [`user/giodl/board-model-proof` PR #240](https://github.com/giodl73-repo/openclaw/pull/240) at `c0111f9a8d` | Fork-only draft; review clean | Extracted the existing Gateway board provider into `@openclaw/gateway-client/model/board` and kept Control UI as the reference adopter. |
| `bic/LobsterClaw` | `release/2026.6.33` | Version gap | The pinned generation predates the board protocol. Do not claim hosted dashboard support or backport the full dashboard stack without an admission decision. |
| `openclaw/openclaw` beta | [`user/giodl/board-model-beta2`](https://github.com/giodl73-repo/openclaw/tree/user/giodl/board-model-beta2) at `2c6bdc41a12`, based on `v2026.8.1-beta.2` | First compatible tag; fork branch proof clean | The extraction cherry-picks without conflict; 55 focused tests and the Gateway Client ESM/declaration build pass. No stable tag currently contains the coordinated board stack. |
| `bic/lobster` fork | [`user/giodl/board-model-lb1` PR #70](https://microsoft.ghe.com/giodl/lobster/pull/70) at `f988457486` | Fork-only second-host proof; review clean | Native React/Fluent Dashboard reads one selected-session board through a main-process safe projection, renders one allowlisted status widget, and keeps unsupported widgets inert. Uses mocked beta protocol; not release admission. |

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
newer OpenClaw release that already contains the complete board stack.
`v2026.8.1-beta.2` is the first tag containing the implementation plus later
ownership and UI hardening, but it is a beta rather than a stable release. A
6.33 backport requires an explicit product urgency decision and complete
dependency, security, persistence, and sandbox proof.

## Related Areas

- `projects/control-model/README.md`
- `projects/control-ui/README.md`
- `projects/lobsterclaw/README.md`
