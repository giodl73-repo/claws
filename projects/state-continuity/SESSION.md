# Runtime State Continuity Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked RFC, state audit, and synchronization hypothesis.
4. Read the Snapshot project and ProxyPipe lifecycle evidence.
5. Check the RFC, Lobster audit, OpenClaw, and Snapshot worktree state.

## Baseline

- Area: Runtime State Continuity
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`
- RFC worktree: `C:\src\openclaw-rfcs-state-continuity`
- Lobster audit worktree: `C:\src\lobster-layering-audit`
- Current RFC branch: `user/giodl/rfc-state-continuity`
- Main tracking file: `README.md`
- Skill to use: `project-session`; use Snapshot/OpenClaw testing skills when proof work starts

## Current Session

- Last updated: 2026-07-10
- Last agent: Codex
- Current focus: Build the source-backed state component, path, writer, consistency, and restore-order inventory before choosing a generation model.
- Active branch / PR: [fork RFC PR 3](https://github.com/giodl73-repo/rfcs/pull/3), head `b335298`
- Known dirty state: none in the RFC worktree; `.artifacts/` is unrelated in `claws-hapi`
- Blocking question: Can OpenClaw prove one global mutation generation, or must V1 use component watermarks?

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-state-continuity status --short --branch`
- Run: `git -C C:\src\lobster-layering-audit status --short --branch`
- Review: `../layering-contracts/state-continuity.md`
- Review: `../layering-contracts/synchronization-model.md`
- Inventory: workspace, OpenClaw home, sessions, transcripts, SQLite stores, plugin state, pairing/approvals, credentials, caches, and generated config
- Trace: current Lobster checkpoint_unmount, shutdown_ready, publication, and restore sequence
- Update: this file and the deletion ledger after each evidence slice

## Guardrails

- Do not infer consistency from filesystem quietness or an old snapshot.
- Do not assume a global generation until every required writer participates.
- Keep local materialization distinct from durable host publication.
- Do not let `/synced` alias readiness or safe-to-destroy.
- Do not open an upstream RFC or implementation PR until explicitly requested after architecture review.

## Open Threads

- Produce the complete component descriptor table and writer coverage report.
- Map Snapshot RFC 20 artifact manifests to source watermarks.
- Prove exact semantics of Lobster `shutdown_ready`.
- Define publication receipt authentication and replay behavior with Duplex Transport.
- Design restore compatibility, migration, rollback, and clean-start exception rules.
- Quantify removable Lobster persistence and lifecycle code.
