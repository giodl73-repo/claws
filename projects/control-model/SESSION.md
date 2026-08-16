# OpenClaw Control Model Session Context

## Agent Start

1. Read this file.
2. Read `projects/control-model/README.md`.
3. Read `projects/control-model/architecture.md` and the fork RFC named below.
4. Refresh the linked `gim-home/m` issues before changing the M/Lobster plan.
5. Check the RFC worktree and fork branch before editing or sharing it.

## Baseline

- Area: OpenClaw Control Model.
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`, and
  `gim-home/m`.
- RFC worktree: `C:\src\openclaw-rfcs-control-model`.
- Current branch: `user/giodl/rfc-0029-control-model`.
- Main tracking file: `projects/control-model/architecture.md`.
- Skills to use: `project-session`, `faces-development-loop`,
  `openclaw-docs`, `clawpilot-issue-loop`, and `lobster-pr-ops` when
  implementation PRs begin.

## Current Session

- Last updated: 2026-08-15.
- Last agent: GitHub Copilot CLI.
- Current focus: prepare RFC 0029 for filing while keeping all implementation
  and future proposal work fork-only. The RFC now narrows acceptance to Control
  Model v1, records completed chat/settings/dashboard evidence, and proposes
  OC5 shared conformance, OC6 publication, OC7 cleanup, plus separate
  BM2/CM1/CM2 adjacent gates. The later product gates remain OpenClaw ownership
  and compatibility review, a released Gateway Client model surface, Lobster
  CI and rollout, live hosted-Gateway proof, and shareable UX evidence. Existing
  dashboards and settings are hosted first; native board and configuration
  projections remain separate owner-first surfaces. Those follow-ups now have
  clean fork-only evidence: Board Model extraction `c0111f9a8d` and Lobster
  Config LC1 through `6d4513379e`, including real Electron visual proof. Release
  ancestry shows no stable board-capable tag; `v2026.8.1-beta.2` is the first
  fully compatible tag and passes the extraction proof. Lobster Board LB1 now
  completes the fork-only second-host proof in React without admitting that
  beta or changing the 2026.6.33 support statement. Settings writes still
  require Managed Configuration.
- Active branch / PR: fork branch
  `giodl73-repo/rfcs:user/giodl/rfc-0029-control-model` at `a3e8945` in
  [fork-local draft PR #8](https://github.com/giodl73-repo/rfcs/pull/8); no
  upstream RFC PR. OpenClaw OC1 is
  [fork-local draft PR #230](https://github.com/giodl73-repo/openclaw/pull/230)
  at `68d3165bab` from `user/giodl/control-model-oc1`; upstream draft PR
  `openclaw/openclaw#122283` is closed. OpenClaw OC2 is
  [fork-local draft PR #231](https://github.com/giodl73-repo/openclaw/pull/231)
  at `8654e0f7d1` from `user/giodl/control-model-oc2`, stacked on OC1.
  OpenClaw OC3 is
  [fork-local draft PR #232](https://github.com/giodl73-repo/openclaw/pull/232)
  at `fc07cc0630` from `user/giodl/control-model-oc3`, stacked on OC2.
  OpenClaw OC4 is
  [fork-local draft PR #238](https://github.com/giodl73-repo/openclaw/pull/238)
  at `72206b801f` from `user/giodl/control-model-oc4`, stacked on OC3.
  M design issue
  [gim-home/m#5675](https://github.com/gim-home/m/issues/5675) remains open.
  Lobster L0 is
  [draft PR #8165](https://microsoft.ghe.com/bic/lobster/pull/8165) at
  `80fe70b13f` from `giodl:user/giodl/control-model-carry`. Lobster LM1 is
  [fork-local draft PR #63](https://microsoft.ghe.com/giodl/lobster/pull/63)
  at `b7686177d0` from `user/giodl/control-model-lm1`, stacked on the L0 branch.
  Lobster LM2 is
  [fork-local draft PR #64](https://microsoft.ghe.com/giodl/lobster/pull/64)
  at `24641f575e` from `user/giodl/control-model-lm2`, stacked on LM1.
  Lobster LM3 is
  [fork-local draft PR #65](https://microsoft.ghe.com/giodl/lobster/pull/65)
  at `0e60930621` from `user/giodl/control-model-lm3`, stacked on LM2.
  Lobster LM4 is
  [fork-local draft PR #66](https://microsoft.ghe.com/giodl/lobster/pull/66)
  at `8d16952671` from `user/giodl/control-model-lm4`, stacked on LM3.
  Lobster LM5 is
  [fork-local draft PR #67](https://microsoft.ghe.com/giodl/lobster/pull/67)
  at `a7f73e5b08` from `user/giodl/control-model-lm5`, stacked on LM4.
  Lobster LM6 is
  [fork-local draft PR #68](https://microsoft.ghe.com/giodl/lobster/pull/68)
  at `0bf31b9f57` from `user/giodl/control-model-lm6`, stacked on LM5.
  Lobster Config LC1 is
  [fork-local draft PR #69](https://microsoft.ghe.com/giodl/lobster/pull/69)
  at `6d4513379e`, stacked on LM6. Lobster Board LB1 is
  [fork-local draft PR #70](https://microsoft.ghe.com/giodl/lobster/pull/70)
  at `f988457486`, stacked on Config LC1.
- Review result: OpenClaw enumerates all authorized applicable view
  descriptors, but materializes only the client-selected deferred payload.
  Discovery is policy-filtered, renderer advertisement is private by default,
  and a compatible user selection remains stable across reconnects and
  artifact revisions.
- Messaging result: RFC PR #8, OC1, OC4, and M issue #5675 now include
  consistent Mermaid diagrams for the Gateway Client model boundary, lazy
  Control UI adoption, and Lobster `SessionView` flow. RFC PR #8 now links
  OC1-OC4 plus Lobster L0/LM1-LM6. M issue #5675 now records the completed
  adopter evidence, the LM6 stop decision, dashboard/settings boundary
  corrections, and the publication/productization next steps.
- Lobster L0 result: a private workspace package exposes the three proposed
  Gateway Client model subpaths, while patch 0036 safely preserves canonical
  bounded UI artifacts through the pinned Gateway history projection. Proof is
  52 model tests, typecheck, type-aware lint, package/protocol builds, the
  artifact regression, sequential application of all 35 patches to the pinned
  OpenClaw SHA, and a clean final Codex autoreview.
- Lobster LM1 result: `GatewaySessionBackend` owns the Control Model transport
  binding and publishes canonical visual projections separately from raw events.
  `SessionViewBuilder` remains the sole renderer projection owner; history seeds
  without replay, live assistant commits deduplicate across reconnect, streaming
  snapshots retain the 80 ms throttle, and raw token usage plus actionable
  connection/auth errors survive canonical takeover. Proof is desktop typecheck,
  type-aware lint, formatting, and 376 focused Electron tests. The final stack
  review additionally fixed raw assistant-stream fallback during empty canonical
  projections and allowed synthetic idle to quiesce canonical views.
- Lobster LM2 result: canonical artifacts project through `SessionView` into an
  exact `clawpilot://widgets/table` version-1 registry. The native renderer
  accepts 1-12 unique columns, at most 100 rows, and primitive cells only;
  invalid, unknown, deferred, failed, or expired offers remain inert and visibly
  fall back. Dual canonical/raw IDs plus a durable normalized message position
  preserve artifact-only and reopened history. Content fingerprints prevent
  stale reuse across adapter recreation, while metadata caching avoids deep
  hashing on token updates. Proof is both typechecks, clean type-aware lint and
  formatting, 76 focused Electron tests, 85 focused UX tests, 35 affected
  broader unit tests, and three real-Chromium browser fixtures. The final
  high-confidence diff review reported no remaining findings; the final Codex
  helper rerun could not authenticate. A later agent review found and fixed
  numeric epoch timestamps that became invalid renderer dates while preserving
  synthesized message identity; the post-fix review was clean. A final
  Gateway-mode fixture now sends a production-shaped artifact through the real
  model, adapter, IPC, reconciliation, and React registry. Its Electron E2E
  renders the six expected table cells, preserves the assistant message after
  the final run transition, and proves no structured fallback was used. The
  final stack review also preserved top-level history IDs and associated
  tool-only artifacts with their owning run message, including incremental
  cache invalidation when the message arrives later.
- Lobster LM3 result: the exact native table registry owns one `refresh`
  affordance; no tool-authored action descriptor or generic action catalog was
  added. Renderer-to-main IPC carries the session, artifact id, revision, and
  exact action. `GatewaySessionBackend` verifies the canonical Control Model
  artifact is current, ready, and an inline `clawpilot://widgets/table` v1 view
  before dispatching a fixed host instruction through
  `ControlModelConversation.send`. Stale revisions are rejected before
  dispatch, server failures are visible in the table, and a connection-epoch
  change cannot claim success. The Gateway-mode Electron proof clicks Refresh
  and observes artifact revision 2 with `Gateway: Verified`. A review-found
  power-state collision was fixed with an independent per-invocation sleep hold;
  the final agent review reported no actionable findings.
- Lobster LM4 result: ordinary Gateway sends no longer call raw
  `client.request("chat.send")`. The backend preserves attachment validation and
  encoding, inline additional-context ordering, Stop-during-preprocessing,
  superseding generations, exec-approval tracking, and raw operational events,
  then dispatches the assembled message through
  `ControlModelConversation.send` and binds its returned run ID into the
  existing turn tracker. Backend-level conversation leases prevent a
  `SessionView` unsubscribe from disposing an in-flight send or action. Proof is
  desktop typecheck, type-aware lint, production build, all 220 focused Gateway
  tests, reconnect and view-unsubscribe regressions, and the real Electron
  Gateway table/refresh E2E. The final stack review also invalidated retained
  conversation leases and attachment preprocessing across sign-out so work
  from one identity cannot dispatch or remain visible under the next identity.
- Lobster LM5 result: active foreground aborts now acquire a shared Control
  Model conversation lease and call `conversation.abort` with the exact run ID
  owned by Lobster's turn tracker. Lobster still synchronously cancels
  attachment preprocessing, retires the logical turn, emits idle, and swallows
  server failure as before. When no foreground run is owned, Lobster retains
  the raw `{ sessionKey }` abort-all recovery request because Control Model
  abort is intentionally run-scoped. Proof is desktop typecheck, type-aware
  lint, 216 focused Gateway tests, and clean independent and Codex reviews.
- Lobster LM6 result: selected-session hydration no longer performs a separate
  raw `chat.history` normalization pass. The backend explicitly refreshes a
  leased Control Model conversation, projects committed canonical messages,
  preserves the 1,000-message limit, treats authoritative legacy and
  idempotency-only rows as non-optimistic, and rejects malformed responses
  instead of silently presenting an empty transcript. Automatic history loading
  is disabled in this host so refresh ownership is explicit and cannot hang on
  subscription setup or sign-out. Proof is 35 focused Control Model tests, 226
  focused desktop tests, both package and desktop typechecks/lints, and clean
  independent and Codex reviews.
- Lobster series decision: stop at LM6. Runtime-owner, Lobster-host, and
  skeptical-maintainer reviews all classified cross-client user-message
  correlation as a separate identity/retry contract expansion rather than a
  narrow parity/deletion slice. A future proposal must align
  `clientMessageId`, Control Model idempotency, retry/reconnect behavior,
  non-renderer callers, canonical user identity, and renderer deduplication.
- Final Lobster stack review: fresh agent review covered PRs #63-#67 at their
  current heads. Accepted findings were fixed in LM1, LM2, and LM4; the stack
  was restacked and passed desktop typecheck, type-aware lint, and 319 focused
  tests. LM3's generic prompt-targeting and run-duration sleep-hold suggestions
  were rejected because V1 intentionally proves a conversation-level host
  action, not a structured artifact-target command or action-run lifecycle.
  LM1's remote-user-message suggestion was deferred because Lobster currently
  owns optimistic user bubbles and lacks a stable correlation identifier for
  safe cross-client deduplication.
- Artifact placement: one stable artifact may render inline, expanded, or in a
  dedicated surface. Later turns may publish higher revisions. V1 persistence
  is session-scoped rather than a permanent document store.
- OC1 result: optional `@openclaw/gateway-client/model` infrastructure
  implements immutable bounded session snapshots, epoch-safe canonical refresh,
  typed errors, and subscriber isolation. Its host binding explicitly owns
  `sessions.subscribe`, while Control Model and Control UI share
  `model/session-event-refresh`. Conversation and artifact behavior remain
  excluded.
- OC2 result: stable lazy conversation handles reuse Gateway Client history/live
  reconciliation and targeted subscription ownership, project bounded messages,
  runs, tools, approvals, and questions, and expose typed epoch-safe commands.
  The review pass fixed reconnect retirement/restoration, retained projection
  bounds, global agent scoping, authoritative interaction removal, abort races,
  inactive-only retention, and older-history stability. Focused proof is 34
  tests plus a Gateway Client ESM/declaration build.
- OC3 result: a bounded Gateway-protocol artifact contract preserves sanitized
  canonical artifacts through history, adapts existing MCP App/Canvas metadata
  into inert fallbacks, reconciles revisions across live state and reconnect,
  and materializes only one exact client-selected deferred view through an
  optional trusted host binding. Renderer registration and selection remain
  outside the model. Three-model review hardening now treats provenance as
  authoritative context rather than artifact content, invalidates stale
  in-flight materialization, prevents identity-less association, and bounds
  newest-first history collection. Focused proof is 42 Control Model tests,
  nine Gateway/Canvas tests, and a neutral ESM/declaration build.
- OC4 result: Control UI now consumes the lightweight canonical catalog for
  active rosters and the lazy conversation model for selected-chat history and
  subscriptions. Archived/all rosters remain Gateway-backed, including
  event-driven refresh. Lazy-load failures fall back and remain retryable.
  Proof is 141 focused tests, type-aware lint, production type-check, neutral
  Gateway Client build, and an 11-request/329,293-byte startup gzip build against the
  329,309-byte limit. Final Codex review reported no actionable findings.
- Known dirty state: `claws-hapi` contains unrelated pre-existing project-note
  changes. The canonical WSL worktree
  `/root/src/openclaw-control-model-oc4` is clean at `72206b801f`; OC1-OC3 are
  also clean at their rewritten stacked heads. Backup refs preserve all four
  pre-restack heads. The
  dedicated RFC worktree started clean from `openclaw/rfcs` `origin/main` at
  `af708f0`. Lobster LM1 worktree `C:\src\lobster-control-model-lm1` is clean at
  `b7686177d0`; LM2 worktree `C:\src\lobster-control-model-lm2` is clean at
  `24641f575e`; LM3 worktree `C:\src\lobster-control-model-lm3` is clean at
  `0e60930621`; LM4 worktree `C:\src\lobster-control-model-lm4` is clean at
  `8d16952671`; LM5 worktree `C:\src\lobster-control-model-lm5` is clean at
  `a7f73e5b08`; LM6 worktree `C:\src\lobster-control-model-lm6` is clean at
  `0bf31b9f57`. Board LB1 worktree `C:\src\lobster-board-model-lb1` is clean at
  `f988457486` with its dependency junction removed. `claws-hapi` remains
  heavily dirty with unrelated pre-existing changes.
- Blocking question: L0 still lacks Proof of Presence and the required Lobster
  runtime contexts. RFC intake is frozen, so the design remains fork-only until
  explicit authorization to submit upstream. Native dashboards must either
  wait for a stable board-capable release or receive an explicit beta-admission
  decision.

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-control-model status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc1 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc2 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc3 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc4 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-carry status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm1 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm2 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm3 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm4 status --short --branch`.
- Verify: fork PRs #8, #230, #231, #232, and #238 remain open and no upstream
  implementation PR remains open.
- Verify: Lobster PR #8165 remains at `80fe70b13f`; required contexts
  `GitOps/GitHubPop`, `Lobster-Runtime-PullRequest`, and
  `Lobster-Runtime-Build-Validation` are visible and green before readiness.
  Current state: GitHubPop fails Proof of Presence and both runtime contexts are
  absent; do not manually queue ADO without an explicit request.
- Verify: fork-local Lobster PR #63 remains stacked on
  `user/giodl/control-model-carry` at `b7686177d0`.
- Verify: fork-local Lobster PR #64 remains stacked on
  `user/giodl/control-model-lm1` at `24641f575e`.
- Verify: fork-local Lobster PR #65 remains stacked on
  `user/giodl/control-model-lm2` at `0e60930621`.
- Verify: fork-local Lobster PR #66 remains stacked on
  `user/giodl/control-model-lm3` at `8d16952671`.
- Review: `review-packet.md`, the role findings, and any comments on the M
  design issue.
- Update: this file and add a checkpoint after canonical decisions change.

## Guardrails

- Keep implementation work in OpenClaw, Lobster, or M worktrees, not
  `claws-hapi`.
- Do not open an upstream RFC issue or PR while intake is frozen.
- Do not create a second M view-model vocabulary; adapt into `SessionView`.
- Keep native component trust and action authority host-owned and allowlisted.
- Preserve MCP Apps as the sandboxed third-party fallback.
- Update this file at the end of a meaningful session.

## Open Threads

- Incorporate RFC/OC1/OC2/OC3/OC4 feedback before promoting any surface
  upstream.
- Assign owners and gates for optional Gateway Client model publication,
  compatibility, conformance, security, and release support.
- Replace Lobster's source carry with a released dependency, resolve required
  CI, and run the live hosted-Gateway rollout/rollback proof.
- Produce safe telemetry, Fluent/a11y/localization quality, and shareable
  screenshots or recordings for team review.
- If cross-client user-message delivery becomes a product requirement, define
  it as a separate contract slice with retry and non-renderer proof; do not add
  it to the LM1-LM6 stack.
- Decide whether JSON Render is an adopter choice or a future OpenClaw-owned
  artifact dialect; V1 keeps it out of the core contract.
- Confirm the OpenClaw view-offer discovery carrier and deferred
  materialization command shape; OpenClaw owns authorized applicable
  descriptors, while each client selects and maps one into its local view
  model.
- Use hosted OpenClaw dashboards/settings as the immediate path. Evaluate a
  native board projection and a Managed Configuration-backed Config Model as
  separate projects rather than additions to conversation snapshots.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`.
