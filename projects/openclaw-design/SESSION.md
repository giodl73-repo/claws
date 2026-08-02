# OpenClaw Design Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `conceptual-model.md`, then `facility-map.md`.
4. Read the linked source project and RFC before changing a facility spec.
5. Check live repo and RFC state before treating a claim as current.

## Baseline

- Area: OpenClaw system design and facility contracts
- Primary repo: `claws-hapi` for design notes; `openclaw/openclaw` and
  `openclaw/rfcs` for authoritative implementation and RFC text
- Local worktree: `C:\src\claws-hapi`
- Current branch: `main`
- Main tracking file: `projects/openclaw-design/facility-map.md`
- Skill to use: `project-session`; use `faces-development-loop` for substantial
  architecture or RFC development

## Current Session

- Last updated: 2026-08-01
- Last agent: GitHub Copilot CLI
- Current focus: Enterprise needs are validated across all four design layers.
  Credentials/secrets, workspace/filesystem, privacy lifecycle, and resource
  governance are source-audited. Gateway/ACP transport and protocol evolution,
  supply-chain/artifact trust, and nodes/devices/pairing are now
  source-audited. Install/update/release compatibility completes the first
  major owner-domain audit pass. The cross-facility relationship model and
  ranked evidence-slice plan are now defined. The memory corpus lifecycle slice
  authorized external-action slice, and release activation slice are
  source-framed. The experimental evidence header survives all three only as a
  projection/export convention, not a universal runtime object. The progress
  snapshot distinguishes completed notebook design from unstarted executable
  proof. Provider correlation is now source-framed with separate candidate
  attempt and model-call identities. Remote node invocation trust is now
  source-framed around existing pairing/route fences and the unprojected
  internal invocation ID. Session export/deletion is now source-framed as one
  copy-graph slice with separate export-creation and deletion-propagation
  contracts. All six ranked evidence slices are framed; executable proof is
  next.
- Active branch / PR: Local notebook only
- Known dirty state: The wider `claws-hapi` checkout contains unrelated user
  changes; preserve them. This project area is currently untracked as one
  coherent documentation addition.
- Blocking question: None

## Resume Checklist

- Run: `git status --short -- projects/openclaw-design CONTEXT.md WORKSPACE.md projects/README.md`
- Verify: Every facility claim links to source, an RFC, a test, or is clearly
  marked as a hypothesis.
- Review: Object ownership, renewal boundary, failure semantics, and overlap
  with adjacent facilities.
- Update: `facility-map.md`, the relevant `specs/<facility>.md`, and this file.

## Guardrails

- Keep implementation work in the owning repo, not `claws-hapi`.
- Do not turn this area into a second normative RFC tree.
- Prefer owner-shaped facilities over one universal runtime abstraction.
- Keep host, plugin, and OpenClaw core responsibilities distinct.
- Update this file at the end of a meaningful session.
- Do not overwrite active user changes or unrelated worktree state.

## Open Threads

- Build the memory corpus lifecycle fork-only conformance fixture when an
  OpenClaw implementation worktree is authorized for the slice.
- Build the authorized external-action fork-only conformance fixture when an
  OpenClaw implementation worktree is authorized for the slice.
- Build the release activation fork-only conformance fixture from existing
  package-upgrade lanes.
- Build the session export/deletion fixture only after the first two unlike
  slices; keep export and deletion as separate operation types over one copy
  graph.
- Validate partial and unknown evidence outcomes before proposing an RFC.
- Validate the experimental evidence header against memory, authorized action,
  and release activation before proposing a shared evidence contract.
- Reconcile any accepted RFC changes before treating notebook contracts as
  current.
- Revisit readiness authorization and retained-artifact trust after exact
  source and RFC status are verified.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`. Keep this file
as the concise canonical resume snapshot.
