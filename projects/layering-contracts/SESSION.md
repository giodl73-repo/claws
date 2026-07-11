# Lobster/OpenClaw Layering Contracts Session Context

## Agent Start

1. Read this file.
2. Read `projects/layering-contracts/README.md`.
3. Read `projects/layering-contracts/contract-portfolio.md`.
4. Read the relevant area note; begin with `state-continuity.md`.
5. Read `projects/layering-contracts/synchronization-model.md` as a hypothesis.
6. Read `projects/layering-contracts/inventory/README.md`.
7. Read the linked historical audit notes under `projects/hosting-profiles/`.
8. Check the Lobster and OpenClaw worktree state before auditing code.

## Baseline

- Area: Lobster/OpenClaw Layering Contracts
- Primary repos: `microsoft.ghe.com/bic/lobster`, `openclaw/openclaw`
- Local worktrees: discover and verify before use
- Current branch: analysis only
- Main tracking file: `projects/layering-contracts/contract-portfolio.md`
- Skill to use: `project-session`

## Current Session

- Last updated: 2026-07-10
- Last agent: Codex
- Current focus: Four-corner framing. Runtime Activation is folded into
  readiness conditions; State/Continuity has a `/synced` hypothesis grounded in
  Snapshot RFC 20. Resume by examining Evidence and Compatibility.
- Active branch / PR: none for the umbrella effort
- Known dirty state: `.artifacts/` is an unrelated untracked workspace item
- Blocking question: none

## Resume Checklist

- Run: `git status --short --branch`
- Discover: current Lobster and OpenClaw worktrees and branches
- Audit first: state paths, writers, durability, consistency, and restore order
- Inventory later: env/config, proxy-pipe/lifecycle, and telemetry dependencies
- Update: `contract-portfolio.md` and this session after each audit slice

## Guardrails

- Keep implementation in the owning Lobster or OpenClaw worktree.
- Keep Hosting Profiles focused on RFC 33 and its implementation stack.
- Keep at most two portfolio initiatives active at once.
- Do not create `/converged`; startup-critical activation is readiness evidence,
  while desired/effective drift remains status and reconciliation evidence.
- Find existing OpenClaw concepts before proposing a new schema or subsystem.
- Do not combine unrelated contracts into a single hosted envelope.
- Do not depend on the optional policy plugin for runtime correctness.
- Preserve OCC control-plane and AgentHarness data-plane ownership boundaries.

## Open Threads

- Establish the current Lobster worktree and source revision for the audit.
- Build the first complete state-path durability table.
- Determine whether runtime generations, component watermarks, and `/synced`
  accurately describe current behavior or require a different abstraction.
- Map Snapshot RFC 20 to local materialization and Lobster to durable publication
  without expanding the Snapshot RFC prematurely.
- Decide whether state portability or trusted hosted identity is the next
  upstream contract after evidence review.
- Keep Activation and Evidence/Compatibility as inventories until a narrow
  independently useful upstream primitive is proven.
- Examine the Evidence and Compatibility corner at the same conceptual depth
  before returning to repo-level audits or changing live RFCs.
