# Managed Configuration Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked RFC and original deliverable.
4. Read the config writer and host/operator fit inventories.
5. Check the RFC, Lobster audit, and selected OpenClaw worktree state.

## Baseline

- Area: Managed Configuration
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`
- RFC worktree: `C:\src\openclaw-rfcs-managed-config`
- Lobster audit worktree: `C:\src\lobster-layering-audit`
- Current RFC branch: `user/giodl/rfc-managed-configuration`
- Main tracking file: `README.md`
- Skill to use: `project-session`; use OpenClaw/Lobster PR skills when implementation starts

## Current Session

- Last updated: 2026-07-10
- Last agent: Codex
- Current focus: Produce the source-backed Lobster replacement proof and audit
  current OpenClaw config concepts before proposing implementation placement.
- Active branch / PR: [fork RFC PR 1](https://github.com/giodl73-repo/rfcs/pull/1), head `3068754`
- Known dirty state: none in the RFC worktree; `.artifacts/` is unrelated in `claws-hapi`
- Blocking question: Which existing OpenClaw config loading and mutation APIs are the narrowest implementation home?

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-managed-config status --short --branch`
- Run: `git -C C:\src\lobster-layering-audit status --short --branch`
- Review: `../layering-contracts/managed-configuration-deliverable.md`
- Review: `../layering-contracts/inventory/config-writers-2026-07-10.md`
- Audit: real OpenClaw config loaders, includes, runtime snapshots, schema metadata, validation, and writes
- Produce: baked-leaf classification and representative managed/operator fixtures
- Update: this file and the deletion ledger after each evidence slice

## Guardrails

- Keep implementation in isolated OpenClaw or Lobster worktrees.
- Do not introduce a parallel hosted config schema.
- Keep V1 to one managed document, one operator document, exact authority, and a small closed comparator set.
- Do not depend on the optional Policy plugin for config admission.
- Do not open an upstream RFC or implementation PR until explicitly requested after architecture review.

## Open Threads

- Select the concrete managed-source loading surface.
- Determine the first bounded comparator fields from actual Lobster leaves.
- Prove transactional reload and operator-write generation behavior against current APIs.
- Quantify removable Lobster code, env keys, cleanup, and exact-blob tests.
- Stage a Lobster removal plan tied to a minimum conformant OpenClaw release.
