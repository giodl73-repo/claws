# Lobster/OpenClaw Layering Contracts Session Context

## Agent Start

1. Read this file.
2. Read `projects/layering-contracts/README.md`.
3. Read `projects/layering-contracts/charter.md`.
4. Read `projects/layering-contracts/compatibility-boundary.md`.
5. Read `projects/layering-contracts/contract-portfolio.md`.
6. Read `projects/layering-contracts/next-evidence-plan.md`.
7. Read `projects/layering-contracts/four-corners.md`.
8. Read `projects/layering-contracts/duplex-transport.md` for the current
   candidate project and design gate.
9. Read the relevant area note; begin with `state-continuity.md`.
10. Read `projects/layering-contracts/synchronization-model.md` as a hypothesis.
11. Read `projects/layering-contracts/inventory/README.md`.
12. Read the linked historical audit notes under `projects/hosting-profiles/`.
13. Check the Lobster and OpenClaw worktree state before auditing code.

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
  Managed Configuration is approved; trusted identity/proxy-pipe pass 4 and
  ProxyPipe frame ownership pass 5 are complete at Lobster `0a9514c1ce`. Resume
  with the approved ordered evidence plan. Current conceptual discussion is
  originally captured in `host-bridge-hypothesis.md`; that composition note is
  now superseded by the named `duplex-transport.md` candidate project. Gateway,
  Channels, AgentHarness, and plugins retain their semantics.
  Gateway coverage pass 6 further narrowed the candidate: public
  `OpenClawTransport` and Gateway already cover transport-neutral RPC/events,
  approvals, pairing, health, restart, and suspend. Residual evidence work is
  host services and durable lifecycle composition. Pass 7 found two existing
  Lobster Gateway paths: a runtime Plex WebSocket proxy and a purpose-built
  in-container Rust client. Prefer a dedicated least-privilege runtime host
  operator connection over the existing Plex Gateway route; use a canonical
  Gateway subprotocol over ProxyPipe only if authentication blocks that path.
  `node.invoke` design gate pass 8 is complete: share/extract its unary peer
  invocation machinery, but add a sibling host-provider identity and permission
  model rather than representing hosts as nodes. Streaming and explicit remote
  cancellation remain later gaps. Hosted peer identity pass 9 selected a
  distinct `host-provider` role with short-lived capability-bound,
  proof-of-possession admission and explicit runtime-generation fencing; no
  operator scopes or node pairing. Execution resumes by auditing existing
  secret-provider/broker seams and selecting the first portable unary provider,
  then lifecycle `checkpoint_unmount`/`shutdown_ready`. Do not file RFCs yet.
- Active branch / PR: none for the umbrella effort
- Known dirty state: `.artifacts/` is an unrelated untracked workspace item
- Blocking question: none

## Resume Checklist

- Run: `git status --short --branch`
- Discover: current Lobster and OpenClaw worktrees and branches
- Audit first: state paths, writers, durability, consistency, and restore order
- Audit now: lifecycle checkpoint/shutdown guarantees and state durability
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
- Keep Managed Configuration V1 to one managed document, one operator document,
  exact authority, and a small closed set of built-in bounded comparators.
- Start the State and Continuity repo audit without changing or filing RFCs.
- Complete the Managed Configuration delivery proof in
  `managed-configuration-deliverable.md` before external promotion.
- Follow `next-evidence-plan.md`; preserve ProxyPipe and Duplex Transport as
  evidence investigations rather than assumed new RFCs.
- Test the Duplex Transport project by proving what remains after mapping
  ProxyPipe to existing Gateway, Channel, AgentHarness, lifecycle, and plugin
  contracts; do not upstream the ProxyPipe wire schema.
- Use `inventory/gateway-proxypipe-coverage-2026-07-10.md` as the current
  Gateway coverage baseline; do not propose a second RPC/event transport or a
  generic approval protocol.
- Use `inventory/proxypipe-openclaw-transport-fit-2026-07-10.md` for the current
  migration decision: try a runtime host-operator Gateway connection before a
  ProxyPipe-backed Gateway relay.
- Use `duplex-transport.md` as the project definition. Audit `node.invoke`
  before sketching or filing an upstream transport/provider interface. Pass 8
  completed that gate and selected sibling host-provider invocation over shared
  machinery.
- Use `inventory/node-invoke-duplex-fit-2026-07-10.md` as the peer invocation
  baseline; do not make host providers use node pairing or node identity.
- Use `inventory/hosted-peer-identity-2026-07-10.md` as the identity baseline;
  keep host-provider permissions separate from operator scopes and bind every
  provider session/invocation to the active hosted generation.
- Verify the eight projection/reset candidates in
  `inventory/boot-config-2026-07-10.md` before treating any as a bug. Candidate
  resolution is recorded in `inventory/env-matrix-2026-07-10.md`; two keys have
  no source consumer and one conditional repo filename is process-sticky.
