# Lobster/OpenClaw Layering Contracts Session Context

## Agent Start

1. Read this file.
2. Read `projects/layering-contracts/README.md`.
3. Read `projects/layering-contracts/charter.md`.
4. Read `projects/layering-contracts/compatibility-boundary.md`.
5. Read `projects/layering-contracts/contract-portfolio.md`.
6. Read `projects/layering-contracts/four-corners.md`.
7. Read the relevant area note; begin with `state-continuity.md`.
8. Read `projects/layering-contracts/synchronization-model.md` as a hypothesis.
9. Read `projects/layering-contracts/inventory/README.md`.
10. Read the linked historical audit notes under `projects/hosting-profiles/`.
11. Check the Lobster and OpenClaw worktree state before auditing code.

## Baseline

- Area: Lobster/OpenClaw Layering Contracts
- Primary repos: `microsoft.ghe.com/bic/lobster`, `openclaw/openclaw`
- Local worktrees: `C:\src\lobster-layering-audit` at current Lobster main
- Current branch: `user/giodl/layering-contract-audit`, tracking `origin/main`
- Main tracking file: `projects/layering-contracts/contract-portfolio.md`
- Skill to use: `project-session`

## Current Session

- Last updated: 2026-07-10
- Last agent: Codex
- Current focus: Four-corner framing is complete. Runtime Activation folds into
  readiness; Evidence/Compatibility uses capabilities, conformance, identity,
  and events; State/Continuity has the only new `/synced` hypothesis. Boot and
  Boot/config pass 1, managed-env pass 2, effective-config writer pass 3, and
  host/operator authority fit assessment are complete at Lobster `0a9514c1ce`.
  Resume with leaf classification/prototype or trusted identity/proxy-pipe.
- Active branch / PR: none for the umbrella effort
- Known dirty state: `.artifacts/` is an unrelated untracked workspace item
- Blocking question: none

## Resume Checklist

- Run: `git status --short --branch`
- Discover: current Lobster and OpenClaw worktrees and branches
- Audit first: state paths, writers, durability, consistency, and restore order
- Audit now: complete env registry or trace trusted identity/proxy-pipe
- Inventory later: proxy-pipe/lifecycle, state paths, and telemetry dependencies
- Update: `contract-portfolio.md` and this session after each audit slice

## Guardrails

- Keep implementation in the owning Lobster or OpenClaw worktree.
- Require every Lobster coupling to map to the compatibility boundary and a
  target disposition under the charter.
- Keep Hosting Profiles focused on RFC 33 and its implementation stack.
- Keep at most two portfolio initiatives active at once.
- Do not create `/converged`; startup-critical activation is readiness evidence,
  while desired/effective drift remains status and reconciliation evidence.
- Do not create `/compatible`; compatibility is host admission over artifact
  capabilities, conformance evidence, and host requirements.
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
- Test the sparse host-authority model before proposing a general overlay
  framework: same OpenClaw schema, host owns declared fields, operator owns the
  rest, conflicts fail validation.
- Start the State and Continuity repo audit without changing or filing RFCs.
- Verify the eight projection/reset candidates in
  `inventory/boot-config-2026-07-10.md` before treating any as a bug. Candidate
  resolution is recorded in `inventory/env-matrix-2026-07-10.md`; two keys have
  no source consumer and one conditional repo filename is process-sticky.
