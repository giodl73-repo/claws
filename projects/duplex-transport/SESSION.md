# Duplex Transport Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked RFC and `../layering-contracts/duplex-transport.md`.
4. Read the OpenClawTransport, `node.invoke`, hosted identity, and ProxyPipe inventories.
5. Check the RFC, Lobster audit, and selected OpenClaw worktree state.

## Baseline

- Area: Duplex Transport and Host Providers
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`
- RFC worktree: `C:\src\openclaw-rfcs-duplex-transport`
- Lobster audit worktree: `C:\src\lobster-layering-audit`
- Current RFC branch: `user/giodl/rfc-duplex-transport`
- Main tracking file: `README.md`
- Skill to use: `project-session`; use OpenClaw debugging/testing and PR-loop skills when implementation starts

## Current Session

- Last updated: 2026-07-10
- Last agent: Codex
- Current focus: Audit secret/provider seams and choose the first portable unary provider for the foundation proof.
- Active branch / PR: [fork RFC PR 2](https://github.com/giodl73-repo/rfcs/pull/2), head `ade8ddc`
- Known dirty state: none in the RFC worktree; `.artifacts/` is unrelated in `claws-hapi`
- Blocking question: Which existing OpenClaw provider seam provides the smallest credible runtime-to-host proof?

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-duplex-transport status --short --branch`
- Run: `git -C C:\src\lobster-layering-audit status --short --branch`
- Review: the four linked transport/identity/frame inventory notes
- Audit: OpenClaw secret providers, broker APIs, `NodeRegistry.invoke`, transport SDK, and Gateway role admission
- Select: one unary provider and one Rust conformance adapter path
- Update: this file and the deletion ledger after each evidence slice

## Guardrails

- Extend `OpenClawTransport`/Gateway peer machinery; do not add a second RPC transport.
- Preserve `node.invoke` wire behavior and keep hosts distinct from nodes.
- Do not tunnel ProxyPipe envelopes through `host.invoke`.
- Keep Channels, approvals, AgentHarness, lifecycle, and continuity with their existing owners.
- Do not open an upstream RFC or implementation PR until explicitly requested after architecture review.

## Open Threads

- `proxypipe-decomposition.md` now records the seven semantic families and the
  duplicated connection/correlation/retry/identity/generation mechanics. Treat
  only bounded host-service invocation as the new Duplex primitive.
- Select the first provider and exact method schema.
- Prove host-provider credential and generation binding against current Gateway auth.
- Define extraction boundaries for shared unary peer invocation.
- Quantify removable ProxyPipe frames and Rust/TypeScript code.
- Design mixed-version migration with an explicit fallback expiry.
