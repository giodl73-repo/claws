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

- Last updated: 2026-08-17.
- Last agent: GitHub Copilot CLI.
- Current focus: secure explicit publication ownership while keeping
  implementation and future proposal work fork-only. CU1-CU3 remain complete
  in OC4, OC5 now owns
  the shared catalog, history/live/reconnect, authorization, run, tool,
  question, artifact, and retained-bounds fixture corpus, and CU4
  proves selected ordinary sends plus connected exact-run aborts through the
  same Control Model used by Lobster. CU5 now proves exact selected-session
  question commands and safe Canvas/MCP artifact adoption. CU6 observation and
  exact incumbent-path deletion remain. Publication still requires owner review,
  a released Gateway Client model surface, Lobster CI/rollout, live
  hosted-Gateway proof, and shareable UX evidence. RFC head `ec85014093e`
  publishes the ownership/support nomination packet, final review closeout,
  and owner acceptance record; OC6 remains blocked until
  each accountable team accepts or replaces its DRI/deputy and records its
  support window, response path, and rollback authority. Board and Config
  remain separate owner-first models; settings writes still require Managed
  Configuration. Lobster L0 now consumes the immutable LobsterClaw 6.33
  Candidate instead of copied source or Docker-time patch replay. LM1-LM5 are
  restacked and published; LM6 is app-only and gated on three history fixes
  entering the Candidate generation.
- Filing-readiness review result: no architectural contradiction remains that
  should block filing. Required v1 conformance no longer includes session
  administration; the generic Gateway binding is construction-only; Config
  candidates are named CFG1/CFG2; and OC6 now requires clean browser and Node
  install/import proof from the packed release artifact. Support-owner
  acceptance and live hosted-product evidence remain publication or shipment
  gates rather than RFC filing blockers. Finite thresholds, shared
  conformance, compatibility canaries, lifecycle performance, and the security
  review are now complete in fork-only evidence.
- Whole-series review result: independent GPT-5.6 Terra, Claude Opus 5, and
  Gemini 3.1 Pro Preview reviews covered OC1-OC5 and CU4-CU5, followed by a
  clean Codex branch review against
  `42a4d0a9b8b3da55123217b8aa1ac495238d4ffd`. Accepted lifecycle, shared
  observer ownership, canonical-session alias, metadata graph, history
  coalescing, large-roster, model-promotion, route-agent, and question-state
  defects were fixed on the owning branches. Final proof passed 59 Gateway
  lifecycle/model tests, 61 integrated Control UI tests, 6 prompt tests,
  packed-package acceptance, type-aware lint, and Control UI TSGo. The core
  and UI heads are published only in `giodl73-repo/openclaw`; both corresponding
  upstream branch refs are absent.
- Owner acceptance packet result: RFC head `ec85014093e` records the final
  OC1-OC5 and CU4-CU5 review in the normative RFC and companion plans, and adds
  `rfcs/0029/owner-acceptance-record.md`. The record requires explicit
  per-surface decisions plus the release vehicle, compatibility window,
  blocking gates, response paths, rollback authority, and observation window.
  It remains a template rather than an assignment or implied consent.
  The fork PR update is
  https://github.com/giodl73-repo/rfcs/pull/8#issuecomment-5310783624.
- OC5 result: fork-local draft
  [OpenClaw PR #241](https://github.com/giodl73-repo/openclaw/pull/241) at
  `bb6da3c58d` is stacked on OC4. It centralizes finite defaults, shares the
  existing conversation harness, promotes catalog/history/live/reconnect and
  approval authorization fixtures, and proves packed Gateway Protocol and
  Gateway Client Node/declaration/browser consumption.
- OC5 fixture continuation: fork-local test-only draft
  [OpenClaw PR #244](https://github.com/giodl73-repo/openclaw/pull/244) at
  `0b55290e90` is stacked on PR #241. It adds reusable run, tool, question,
  artifact, and retained-bounds cases, including exact non-active abort
  targeting, executable artifact metadata stripping, selected-only
  materialization, and progress-update limits. Focused proof is 10 tests,
  type-aware lint/format, and a clean Codex review. Production LOC delta is
  zero.
- OC5 performance continuation: fork-local test-only draft
  [OpenClaw PR #245](https://github.com/giodl73-repo/openclaw/pull/245) at
  `df12d64d3c` is stacked on PR #244. It adds an asserted artifact-heavy
  projection benchmark for p95 latency, retained heap growth/slope, and exact
  finite snapshot bounds. Blacksmith Testbox
  `tbx_01m05mrxhzajxpdqb6ggdzx4y1` passed 24,000 measured events at 2,211.45 ms
  p95 per 4,000 events, 52,272 bytes retained growth, and 8,482.51 bytes/batch
  retained slope.
- OC5 compatibility continuation: fork-local test-only draft
  [OpenClaw PR #246](https://github.com/giodl73-repo/openclaw/pull/246) at
  `409459025c` is stacked on PR #245. It adds an asserted wire matrix for the
  candidate protocol, published predecessor `2026.7.2-beta.7`, and current
  OpenClaw main. Blacksmith Testbox `tbx_01m05spdcyy97ht168pfy3tqv1` passed
  against `main@63401b730b`; baseline model requests/events remain compatible,
  while predecessor run-fenced send is explicitly unsupported.
- OC5 lifecycle-performance continuation: fork-local test-only draft
  [OpenClaw PR #247](https://github.com/giodl73-repo/openclaw/pull/247) at
  `57a7859574e` is stacked on PR #246. It asserts initial projection, selected
  deferred-view materialization, bounded inactive-conversation eviction, and
  authoritative reconnect/resync latency with exact lifecycle invariants.
  Blacksmith Testbox `tbx_01m05veqewr76wd05191gt6sb8` passed at 14.32 ms,
  0.58 ms, 26.23 ms, and 8.07 ms p95 respectively.
- OC5 security continuation: fork-local draft
  [OpenClaw PR #248](https://github.com/giodl73-repo/openclaw/pull/248) at
  `a158436f085` is stacked on PR #247. The full-stack review found one
  medium-severity authority-boundary flaw: materialized deferred-view payloads
  survived disconnect or connection-epoch replacement. The remediation clears
  them on both transitions and requires fresh server materialization under the
  new epoch. Post-fix security and Codex reviews were clean. Blacksmith Testbox
  `tbx_01m05yh2krdyggq814g2jzyxf6` passed 55 Gateway Client tests and 46
  Control UI Gateway-store tests. Named owner nominations are published;
  explicit team acceptance remains open.
- Ownership nomination result: RFC commit `574a8e027b` adds
  `rfcs/0029/ownership-and-support-plan.md`, refreshes the top-level evidence
  through OC5 PRs #244-#248 and CU5, and records existing team boundaries plus
  proposed DRIs and deputies without claiming consent. The package, protocol,
  and Control UI surfaces nominate `@openclaw/maintainer`; security nominates
  `@openclaw/openclaw-secops`; release nominates
  `@openclaw/openclaw-release-managers`; RFC acceptance nominates
  `@openclaw/openclaw-rfc-approvers`. The fork PR comment is
  https://github.com/giodl73-repo/rfcs/pull/8#issuecomment-5309167974. The PR
  body now reflects all completed evidence and an explicit owner-review request
  was sent to the primary/deputy and Control UI reviewer nominees:
  https://github.com/giodl73-repo/rfcs/pull/8#issuecomment-5309195371.
- CU4 result: fork-local draft
  [OpenClaw PR #242](https://github.com/giodl73-repo/openclaw/pull/242) at
  `07afbfde81` is stacked on OC5. Selected ordinary sends and connected
  exact-run aborts now use the existing `ControlModelConversation` handle.
  Session identity, attachments, reply/fencing inputs, retry metadata, and
  active-leaf recovery details are preserved. Reconnect-resume, steer/inject,
  background/non-selected, replay, realtime, skill-workshop, and session-wide
  abort paths remain raw. Focused proof is 70 tests, production UI typecheck,
  targeted lint/format, and clean autoreview.
- CU5 result: fork-local draft
  [OpenClaw PR #243](https://github.com/giodl73-repo/openclaw/pull/243) at
  `0a8ad4188a6` is stacked on CU4. Exact pending selected-session question
  answer/cancel commands use the cached conversation route and authoritative
  agent identity while preserving prompt state, expiry deadlines, publication,
  and raw fallback. Validated ready artifacts feed only the existing sandboxed
  Canvas and MCP App adapters; canonical-first source matching and
  occurrence-aware dedupe handle persisted/live overlap and reused tool IDs.
  Global/operator approval queues remain raw. Focused proof is 245 tests,
  production UI typecheck, targeted lint/format, and clean final review.
- Active branch / PR: fork branch
  `giodl73-repo/rfcs:user/giodl/rfc-0029-control-model` at `ec85014093e` in
  [fork-local PR #8](https://github.com/giodl73-repo/rfcs/pull/8); no
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
  OpenClaw OC5 is
  [fork-local draft PR #241](https://github.com/giodl73-repo/openclaw/pull/241)
  at `bb6da3c58d` from `user/giodl/control-model-oc5`, stacked on OC4.
  OpenClaw OC5 fixture continuation is
  [fork-local draft PR #244](https://github.com/giodl73-repo/openclaw/pull/244)
  at `0b55290e90` from `user/giodl/control-model-oc5-fixtures`, stacked on OC5.
  OpenClaw OC5 performance continuation is
  [fork-local draft PR #245](https://github.com/giodl73-repo/openclaw/pull/245)
  at `df12d64d3c` from `user/giodl/control-model-oc5-performance`, stacked on
  PR #244.
  OpenClaw OC5 compatibility continuation is
  [fork-local draft PR #246](https://github.com/giodl73-repo/openclaw/pull/246)
  at `409459025c` from `user/giodl/control-model-oc5-compatibility`, stacked on
  PR #245.
  OpenClaw OC5 lifecycle-performance continuation is
  [fork-local draft PR #247](https://github.com/giodl73-repo/openclaw/pull/247)
  at `57a7859574e` from
  `user/giodl/control-model-oc5-lifecycle-performance`, stacked on PR #246.
  OpenClaw OC5 security continuation is
  [fork-local draft PR #248](https://github.com/giodl73-repo/openclaw/pull/248)
  at `a158436f085` from `user/giodl/control-model-oc5-security`, stacked on
  PR #247.
  OpenClaw CU4 is
  [fork-local draft PR #242](https://github.com/giodl73-repo/openclaw/pull/242)
  at `07afbfde81` from `user/giodl/control-model-cu4`, stacked on OC5.
  OpenClaw CU5 is
  [fork-local draft PR #243](https://github.com/giodl73-repo/openclaw/pull/243)
  at `0a8ad4188a6` from `user/giodl/control-model-cu5`, stacked on CU4.
  M design issue
  [gim-home/m#5675](https://github.com/gim-home/m/issues/5675) remains open.
  Lobster L0 is
  [draft PR #8165](https://microsoft.ghe.com/bic/lobster/pull/8165) at
  `bf8b9b2785` from `giodl:user/giodl/control-model-carry`. Lobster LM1 is
  [fork-local draft PR #63](https://microsoft.ghe.com/giodl/lobster/pull/63)
  at `f008fa7bc6` from `user/giodl/control-model-lm1`, stacked on the L0 branch.
  Lobster LM2 is
  [fork-local draft PR #64](https://microsoft.ghe.com/giodl/lobster/pull/64)
  at `73f4cf6e9f` from `user/giodl/control-model-lm2`, stacked on LM1.
  Lobster LM3 is
  [fork-local draft PR #65](https://microsoft.ghe.com/giodl/lobster/pull/65)
  at `7fdf1f227c` from `user/giodl/control-model-lm3`, stacked on LM2.
  Lobster LM4 is
  [fork-local draft PR #66](https://microsoft.ghe.com/giodl/lobster/pull/66)
  at `9c27693088` from `user/giodl/control-model-lm4`, stacked on LM3.
  Lobster LM5 is
  [fork-local draft PR #67](https://microsoft.ghe.com/giodl/lobster/pull/67)
  at `c45e3a714e` from `user/giodl/control-model-lm5`, stacked on LM4.
  Lobster LM6 is
  [fork-local draft PR #68](https://microsoft.ghe.com/giodl/lobster/pull/68)
  at `c1d4d3ecf2` from `user/giodl/control-model-lm6`, stacked on LM5.
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
- Lobster L0 result: PR #8165 now resolves the three Gateway Client model
  subpaths from #8363's immutable OpenClaw 6.33 LobsterClaw Candidate through
  `@lobster/source`. The old copied package and patch 0036 replay are absent by
  reconstruction. The 11-project lock passes Lobster supply-chain policy and
  offline structural validation. Full local install remains gated on the
  Lobster feed admitting `typebox@1.1.39` and `ipaddr.js@2.4.0`.
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
  subscription setup or sign-out. The restacked PR is now app-only. Against
  Candidate `924ba24c1b37`, 214 provider/session-view assertions pass and the
  three new history assertions fail as expected because the generation lacks
  malformed-history rejection, authoritative-history pending inference, and
  authoritative provisional-state fixes preserved in old commit
  `0bf31b9f579296c814334745da64dbec516ee372`.
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
  `af708f0` and is clean at `e6abbaa`. The OC5 lifecycle worktree
  `/root/src/openclaw-control-model-oc5-fixtures` is clean at `a158436f085`.
  The CU5 worktree `/root/src/openclaw-control-model-cu5` is clean at
  `0a8ad4188a6`. The integrated review worktree
  `/root/src/openclaw-control-model-integrated-review` is clean at
  `cf18df1671d`.
  Lobster LM1 worktree `C:\src\lobster-control-model-lm1` is clean at
  `f008fa7bc6`; LM2 worktree `C:\src\lobster-control-model-lm2` is clean at
  `73f4cf6e9f`; LM3 worktree `C:\src\lobster-control-model-lm3` is clean at
  `7fdf1f227c`; LM4 worktree `C:\src\lobster-control-model-lm4` is clean at
  `9c27693088`; LM5 worktree `C:\src\lobster-control-model-lm5` is clean at
  `c45e3a714e`; LM6 worktree `C:\src\lobster-control-model-lm6` is clean at
  `c1d4d3ecf2`. Board LB1 worktree `C:\src\lobster-board-model-lb1` is clean at
  `f988457486` with its dependency junction removed. `claws-hapi` remains
  heavily dirty with unrelated pre-existing changes.
- Lobster-first delivery moved from the private-fork PR #8165 to same-repository
  PR #9248 so required ADO contexts can authenticate checkout. Rebased head
  `d8acc9034d` is based on current `main` and remains explicitly pinned to
  OpenClaw `v2026.6.33` / `7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e`.
  Current main owns `0044-media-failure-receipt.patch`; Control Model artifact
  projection moved to `0045`. The stack has 44 actual patches. Gateway Client
  tests (55), typecheck, build, format, the full patch/parity gate, and Codex
  branch review pass.
- PR #9248 exact-head native validation is green: PullRequest build `177118907`
  and Build Validation `177124659`. The PR is mergeable but blocked on renewed
  `dspektor` approval. After approval, complete exact-head POP, merge, close
  superseded #8165, and record the merge commit. RFC intake remains frozen.

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-control-model status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc1 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc2 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc3 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc4 status --short --branch`.
- Run in WSL: `git -C /root/src/openclaw-control-model-oc5-fixtures status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-carry status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm1 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm2 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm3 status --short --branch`.
- Run: `git -C C:\src\lobster-control-model-lm4 status --short --branch`.
- Verify: fork PRs #8, #230, #231, #232, and #238 remain open and no upstream
  implementation PR remains open.
- Verify: Lobster PR #9248 remains at `d8acc9034d`; required contexts
  `GitOps/GitHubPop`, `Lobster-Runtime-PullRequest`, and
  `Lobster-Runtime-Build-Validation` are visible and green before readiness.
  Current state: PullRequest `177118907` and Build Validation `177124659` are
  green; the PR is mergeable and awaits renewed `dspektor` approval. Wait for
  approval before proving presence. After merge, close #8165 as superseded.
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

- Incorporate RFC/OC1/OC2/OC3/OC4/OC5/CU4/CU5 feedback before promoting any
  surface upstream.
- Assign named package, protocol, Control UI, security, and release owners as
  the final OC5 publication-readiness gate.
- Plan CU6 only as post-publication observation and exact incumbent-path
  deletion with rollback proof; do not broaden it into new model behavior.
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
