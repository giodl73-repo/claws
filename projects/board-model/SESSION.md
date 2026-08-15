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
- Current focus: release admission after completing the fork-only Lobster
  adopter proof. No stable tag contains the coordinated board stack;
  `v2026.8.1-beta.2` is the first fully compatible tag and passes both the
  extraction proof and a mocked-protocol second-host React adoption proof.
- Active branch / PR: fork-only draft
  [giodl73-repo/openclaw#240](https://github.com/giodl73-repo/openclaw/pull/240)
  from `user/giodl/board-model-proof` at `c0111f9a8d`, based on the fork-local
  `user/giodl/board-model-base`. Exact-tag qualification branch
  `user/giodl/board-model-beta2` is published at `2c6bdc41a12`. Lobster adopter
  evidence is fork-local draft
  [giodl/lobster#70](https://microsoft.ghe.com/giodl/lobster/pull/70) from
  `user/giodl/board-model-lb1` at `f988457486`, stacked on Config LC1.
- Known dirty state: proof worktree is clean and one commit ahead of
  `origin/main`. WSL proof worktree `/root/src/openclaw-board-model-beta2` is
  clean at local commit `2c6bdc41a12`; its 55 focused tests and Gateway Client
  build pass. The Windows mirror worktree is also clean at `d907d6341e`.
  Lobster LB1 is clean and pushed; its temporary `node_modules` junction was
  removed. `claws-hapi` contains unrelated pre-existing changes.
- Blocking question: choose whether to wait for a stable board-capable release
  or explicitly admit `v2026.8.1-beta.2`. LB1 is evidence only and does not
  make pinned LobsterClaw 2026.6.33 board-capable.

## Resume Checklist

- Inspect `ui/src/lib/board/gateway-provider.ts` and its tests.
- Inventory UI-only imports and move only framework-neutral behavior.
- Keep `BoardSnapshot` and board RPC schemas in Gateway Protocol.
- Make Control UI consume the extracted model before adding a Lobster adapter.
- Recheck for a stable tag containing the complete board stack before starting
  the Lobster adapter.

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
- Use Lobster PR #70 as the bounded native-adopter evidence; reconstruct it
  against an admitted board-capable release rather than shipping the private
  carry.
- Decide whether beta admission is acceptable or whether native dashboard work
  waits for the next stable OpenClaw release.
