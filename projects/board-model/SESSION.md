# OpenClaw Board Model Session Context

## Agent Start

1. Read this file.
2. Read `README.md`, `source-audit.md`, and `slice-1-board-model.md`.
3. Check the OpenClaw proof worktree and current LobsterClaw release.
4. Recheck the upstream board feature ancestry before any backport decision.

## Baseline

- Area: OpenClaw Board Model.
- Owner repo: `openclaw/openclaw`.
- Proof worktree: `C:\src\openclaw-board-model-proof`.
- Branch: `user/giodl/board-model-proof` at `c0111f9a8d`.
- Delivery consumer: Lobster through a future LobsterClaw generation.

## Current Session

- Last updated: 2026-08-15.
- Last agent: GitHub Copilot CLI.
- Current focus: first Gateway Client Board Model evidence slice completed,
  committed, and reviewed clean; next step is a second-host adapter.
- Active branch / PR: local fork-only branch; no PR.
- Known dirty state: proof worktree is clean and one commit ahead of
  `origin/main`. `claws-hapi` contains unrelated pre-existing changes.
- Blocking question: LobsterClaw 2026.6.33 predates the board protocol. Choose
  a newer generation or explicitly approve a large coordinated backport before
  Lobster dashboard shipment claims.

## Resume Checklist

- Inspect `ui/src/lib/board/gateway-provider.ts` and its tests.
- Inventory UI-only imports and move only framework-neutral behavior.
- Keep `BoardSnapshot` and board RPC schemas in Gateway Protocol.
- Make Control UI consume the extracted model before adding a Lobster adapter.
- Measure the first qualifying OpenClaw release that contains the complete
  board stack.

## Guardrails

- OpenClaw remains authoritative for board persistence, grants, tickets,
  sandboxing, data bindings, actions, and agent tools.
- Do not recreate dashboards from conversation artifacts.
- Do not backport a partial board stack into an immutable LobsterClaw
  generation.
- Keep native renderer registration and product presentation host-owned.

## Open Threads

- Treat `@openclaw/gateway-client/model/board` as the selected proof subpath.
- Separate public board state from short-lived sandbox/view-ticket material.
- Define the Lobster native adapter only after Control UI adopts the shared
  model.
