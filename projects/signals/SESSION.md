# Signals Session Context

## Agent Start

1. Read this file.
2. Read `projects/signals/README.md`.
3. Read the related Localization, Doctor, Policy, Catalog, Context Budget, and
   Hosting Profiles project notes before proposing shared contracts.
4. Check live OpenClaw repo state before auditing or implementing.

## Baseline

- Area: Signals.
- Primary repo: `openclaw/openclaw`.
- Local worktree: select an isolated `C:\src\openclaw-*` worktree before source
  audit or implementation.
- RFC worktree: `C:\src\openclaw-rfcs-signals`.
- Current RFC branch: `user/giodl/rfc-0025-signals`.
- Main tracking file: `projects/signals/README.md`.
- Skill to use: `faces-development-loop`; use `project-session` when resuming.

## Current Session

- Last updated: 2026-07-28.
- Last agent: Codex.
- Current focus: RFC 0025 now defines the full ownership chain for operational
  facts: the semantic owner owns fact meaning and owner-native lifetime;
  diagnostics/hooks/renderers/exporters own projection delivery and retention;
  and any alerting, admission, retry, repair, quota, or enforcement remains
  owned by the acting consumer. RFC 0018 remains the canonical current-state
  readiness owner. Signals remains a conformance and projection discipline,
  not an event bus, evaluator, retention service, audit chain, or policy engine.
- Active branch / PR: fork draft
  [giodl73-repo/openclaw#150](https://github.com/giodl73-repo/openclaw/pull/150),
  head `user/giodl/signals-runtime-llm-usage` at `06ed6cb65ba`, stacked on fork
  draft [#149](https://github.com/giodl73-repo/openclaw/pull/149) at
  `a614815a4ce`, which is stacked on fork draft
  [#148](https://github.com/giodl73-repo/openclaw/pull/148) at
  `d6978e25f6c`, which is stacked on fork draft
  [#147](https://github.com/giodl73-repo/openclaw/pull/147) at
  `aa2b1420ba8`, which is stacked on fork draft
  [#146](https://github.com/giodl73-repo/openclaw/pull/146) at
  `0ac31a744a5`, which is stacked on fork draft
  [#145](https://github.com/giodl73-repo/openclaw/pull/145) at
  `381c85fea31cb3d79ea08bce99e948939b49de53`. Local RFC branch
  `user/giodl/rfc-0025-signals` remains intentionally unpushed at `87d6df8`,
  three commits ahead of `origin/main` after rebasing over the workflow-only
  RFC main change.
- Contributor PR:
  [openclaw/openclaw#111065](https://github.com/openclaw/openclaw/pull/111065)
  is logging-only again at `917815b6049364b51497dbb7a4c519eccef42c71`.
- Implementation worktree: `C:\src\openclaw-signals-telegram-v1`; branch
  `user/giodl/signals-runtime-llm-usage`, stacked on fork PR #149.
  The contributor-review and temporary WSL proof worktrees were removed.
- Known dirty state: `C:\src\claws-hapi` contains unrelated active project
  changes; do not overwrite or reorganize them.
- RFC decision: implemented the active plain-text Telegram preview send that
  stops after a missing finite `message_id` as existing
  `message.delivery.error` semantics without a new event type, field, delivery
  kind, config, hook, or runtime framework. Runtime and diagnostics owner
  adoption remains pending.
- Lifecycle audit: current delivery exporters treat completed/error events as
  self-contained attempts rather than pairing them to `message.delivery.started`.
  A later fallback/final success is a separate attempt.
- Correlation/trust audit: Telegram dispatch already has `SessionKey`, and the
  plugin SDK exports `emitTrustedDiagnosticEvent`; bundled Codex instrumentation
  provides first-party extension precedent for that trusted path. Fork PR #145
  uses that path and excludes chat/thread/message identifiers, raw response,
  exception text, and tokens from the public diagnostic payload.
- PR 1 focused proof: 106 tests passed across the two affected Telegram files,
  including active missing-id classification, exactly-once trusted projection,
  finite duration, session correlation, public-payload privacy, and a
  superseded-generation race fixture.
- PR 2 owner boundary: Codex app-server completion owns structured shell and
  file-change results; the later native `PostToolUse` relay supplies original
  tool identity, arguments, cwd, and channel context by tool-call ID. MCP
  remains relay-owned, middleware remains observe-only for native results, and
  run abort suppresses stale deferred observations.
- PR 2 focused proof: 140 tests passed across native relay, Codex projector,
  tool-result middleware, and Plugin SDK API baseline coverage. Fixtures cover
  success, nonzero exit, output, original arguments, channel context,
  exactly-once dispatch, MCP/file-change ownership, completion-before-hook
  ordering, in-place middleware mutation, and cancellation.
- PR 2 review correction: seven focused projector tests pass after failed
  structured items were changed to skip the success-only `PostToolUse` wait.
- PR 5 owner boundary: the registry already persists exactly-once
  `subagent_ended` emission and owns terminal outcome, reason, run, target, and
  timestamp. Diagnostics-otel now consumes that hook only while its service is
  active and projects bounded outcome, reason, and target kind.
- PR 5 privacy boundary: terminal spans remain roots because the hook carries
  no authoritative trace context. Run IDs, session keys, account IDs, task
  text, and raw errors remain outside span attributes and metric labels.
- PR 5 focused proof: 113 diagnostics-otel tests, 13 plugin boundary tests, 16
  registry completion test executions, unchanged Plugin SDK API baseline, and
  a clean final Codex review. The dedicated runtime-API guard could not collect
  locally after the dependency feed rejected unauthenticated
  `@earendil-works/pi-tui`, leaving `@openclaw/fs-safe/config` unlinked.
- PR 6 decision: active upstream PR
  [openclaw/openclaw#91603](https://github.com/openclaw/openclaw/pull/91603)
  already owns the proposed ACP mapping. The remaining resolved-versus-rejected
  compatibility behavior, error code, and unrelated reconnect change require
  ACP owner/product direction, so no competing fork PR was created.
- PR 7 owner boundary: `api.runtime.llm.complete` owns the successful trusted
  plugin/context-engine completion plus normalized usage and explicit or
  estimated cost. These calls bypass the normal reply, cron, ingress, and
  worker usage projections.
- PR 7 projection: one existing `model.usage` event is emitted after successful
  nonempty accounting with authoritative agent, provider, model, optional
  session key, token buckets, cost, and duration. Disabled diagnostics, empty
  usage, and failed completions emit nothing; caller, purpose, channel, run,
  prompt, and response data remain excluded.
- PR 7 focused proof: 25 runtime LLM tests, changed-file format/lint checks, and
  a clean `codex review --uncommitted`; usage now includes the standard derived
  prompt-token bucket.
- PR 7 owner handoff: the exact gap is open issue #98968; broad issue #13219
  asks for a separate usage-log product surface. Open PR #107937 already owns
  the upstream implementation path. Fork #150 is not promotion-ready unchanged
  because its plugin-completion `durationMs` is consumed as
  `openclaw.run.duration_ms`. Owner choice is now minimal accounting without
  duration/plugin schema changes versus attributed accounting through a
  corrected #107937 with live exporter proof.
- PR 8 decision: issue
  [openclaw/openclaw#90674](https://github.com/openclaw/openclaw/issues/90674)
  remains a real per-turn provenance gap, but merged PR #85882 already prevents
  aggregate confident-zero reporting and closed PR #90825 already attempted a
  runtime warning. All-zero pricing cannot distinguish unavailable from
  intentionally free/local models. Extending `Usage.cost.totalOrigin` would
  change persisted session, replay, worker-protocol, and downstream contracts,
  so no competing fork PR was created without model-pricing owner direction.
- PR 9 decision: maintainer-authored issue
  [openclaw/openclaw#93070](https://github.com/openclaw/openclaw/issues/93070)
  is assigned to `@bek91` and explicitly blocked on maintainer/product review.
  Existing `telemetry.exporter` events are ephemeral; a complete operator
  surface requires exporter-owned retained state plus a new carrier into
  Gateway Health/Status. A static Doctor-only warning would be partial and
  duplicative, so no fork PR was created.
- PR 10 decision: issue
  [openclaw/openclaw#102018](https://github.com/openclaw/openclaw/issues/102018)
  reports trajectory `session.ended`, not the existing diagnostic
  `run.completed` projection. `run.completed` already sets OTel error status
  correctly; trajectory session termination has no diagnostics event or OTel
  handler. A new session-terminal contract would overlap end-reason issue
  #102019 and risk duplicate lifecycle artifacts, so no fork PR was created.
- Stack consolidation: all six fork PRs remain exact one-commit slices and no
  later slice edits an earlier slice's files. #146-#150 patches applied
  independently to main at `8f31892b550`, but that is point-in-time structural
  proof, not standalone CI proof; #145 must be recreated on its accepted
  Telegram owner base. The corrected #146 and #148 commits now own generated
  Plugin SDK hashes at their stacked boundaries. Fresh promotion branches must
  still regenerate those records from their selected owner base.
- Stack review fixes: #146 skips the unavailable native `PostToolUse` wait for
  failed structured items, #148 strips transient `runId` before durable queue
  persistence, and #150 includes derived prompt-token usage. The generated SDK
  manifest was regenerated at the owning commits, including correction of the
  stale cumulative `infra-runtime` hash. Final Codex review is clean.
- Live fork closeout: all six PRs are open drafts with the exact rewritten
  one-commit parent chain, seven successful checks per head, no review feedback,
  and only fork-inapplicable `auto-response`/`label` failures. Updated #146,
  #148, and #150 bodies were published from Markdown files and match live. The
  verified rewrite recovery stash and temporary state artifact were removed.
- Prior exact-head CI for the preserved Signals commit completed with 71
  passing checks and none pending.
  `security-fast` failed on the unrelated repository-wide `axios` production
  advisory `GHSA-gcfj-64vw-6mp9`; the aggregate `openclaw/ci-gate` failed only
  because of that job.
- ClawSweeper: exact-head review found no patch defect, rated proof A and patch
  B, and recommended accepting the bounded diagnostic. Its scope concern was
  resolved operationally by moving that diagnostic into fork-only draft #145
  and restoring contributor PR #111065 to logging-only.
- Codex review: `codex review --base
fork/user/giodl/base-telegram-draft-visible-failures` completed cleanly on
  fork draft #145 with no accepted or rejected findings.
- PR 2 Codex review: four `codex review --uncommitted` passes drove fixes for
  tool-name/argument/context compatibility, real Codex completion-before-hook
  ordering, in-place middleware mutation, and abort lifecycle. The final pass
  completed with no actionable defects.
- Localization reciprocal review: Signals conformance is now revision-bound.
  Project tracking adds `stale`; public/persisted/plugin-facing changes require
  mixed-version proof; lossy consumers are disclosed as projection constraints;
  and specialist review is required for security, authorization, privacy,
  destructive-action, audit, and usage/cost meaning. Enforcement remains
  owner-local with no manifest, scanner, or release matrix.
- Ownership/lifetime review: RFC 0025 and all three normative contract surfaces
  now require owner-native fact identity and lifetime, projection delivery and
  retention ownership, and explicit action authority. Terminal attempts,
  current subject revisions, policy evaluations, findings, and usage intervals
  retain their native renewal rules. Projection replay cannot renew owner
  state, retained telemetry does not become current or audit-grade by itself,
  and correlation identity is not authorization. The implementation plan and
  Telegram conformance record use the same model.
- Validation: `git diff --check` passed before commit. Final
  `codex review --uncommitted` found no discrete inconsistency or regression.
  Two auxiliary review reads logged the known missing Windows sandbox helper,
  but the review completed successfully. No runtime code or fork evidence PR
  was changed.

## Resume Checklist

- Run: use `projects/signals/owner-handoff-runtime-llm-usage-2026-07-21.md` for
  the active owner decision; do not open a duplicate upstream PR.
- Promote: recreate only the selected slice from then-current main or its owner
  branch, regenerate artifacts, and rerun focused proof before publication.
- Verify: preserve the exact owner/projection fixtures if maintainer feedback
  changes the diagnostic contract.
- Review: seek Telegram and diagnostics owner adoption of the bounded event
  semantics and trusted bundled-extension path.
- Update: bind the RFC conformance record to the exact implementation and
  fixture revisions only when that evidence is stable.

## Guardrails

- Keep implementation work in the owning OpenClaw worktree, not `claws-hapi`.
- Preserve semantic ownership; Signals supplies conventions and adapters only.
- Do not create a universal event bus, mandatory envelope, telemetry backend,
  or parallel findings framework.
- Keep localization rendering separate from locale-neutral signal identity.
- Require redaction and compatibility treatment before exporting new fields.
- Reuse existing terms by role: events, results, outcomes, statuses, reasons,
  findings, decisions, usage, trace context, metadata, and private data.
- Treat `signal` as an initiative term because telemetry already uses
  `signal` specifically for traces, metrics, and logs.
- Keep owner, projection, and conformance specs separate; do not add a runtime
  schema, resource-economics schema, or public plugin API without slice
  evidence.
- Update this file at the end of a meaningful session.
- Do not overwrite active user changes or unrelated worktree state.

## Open Threads

- Fork stack consolidation and promotion map:
  `projects/signals/stack-consolidation-2026-07-21.md`.
- Keep #145-#150 as fork evidence snapshots. Do not combine them into one
  upstream PR or infer implementation dependencies from their chronological
  bases.
- Adoption PR 4 evidence:
  `projects/signals/slice-4-outbound-run-correlation.md`.
- Adoption PR 5 evidence:
  `projects/signals/slice-5-subagent-terminal-telemetry.md`.
- Adoption PR 6 is owner/product-decision blocked by active upstream PR #91603;
  do not create a duplicate fork implementation.
- Adoption PR 7 evidence:
  `projects/signals/slice-7-runtime-llm-usage.md`.
- Adoption PR 8 owner-decision audit:
  `projects/signals/slice-8-unknown-pricing-deferred.md`.
- Do not implement PR 8 until model-pricing and persisted-usage owners define
  provenance for provider-billed, catalog-estimated, explicitly free, and
  unavailable cost plus compatibility/replay behavior.
- Adoption PR 9 owner-decision audit:
  `projects/signals/slice-9-exporter-health-deferred.md`.
- Do not implement PR 9 until diagnostics and Gateway Health owners define the
  retained per-signal lifecycle state, expiry/recovery semantics, and
  plugin-to-health snapshot carrier.
- Adoption PR 10 owner-decision audit:
  `projects/signals/slice-10-session-export-conformance-deferred.md`.
- Do not implement PR 10 until session lifecycle, trajectory, and diagnostics
  owners define whether `session.ended` is a public diagnostic contract, how it
  relates to `run.completed`, and one end-reason taxonomy with issue #102019.
- Keep #150 limited to owner-local `model.usage` projection after successful
  runtime LLM completion. Do not add a ledger, fields, hook, pricing state, or
  resource-governance policy.
- Keep #149 limited to diagnostics-otel projection of the existing owner hook.
  Do not add another diagnostic event, duplicate `run.completed`, export
  owner identifiers, or infer parent trace context.
- Keep #148 limited to outbound correlation. Inbound message identity, span
  aliases, and subagent requester-run hierarchy remain separate owner decisions.
- Foundation comparison:
  `projects/signals/foundation-comparison-2026-07-21.md`.
- Keep Foundation PR 3 documentation-only. Do not add a runtime envelope,
  shared result enum, registry, package, helper, or central conformance suite.
- Confirm owner approval for attempt-level delivery semantics, `sessionKey`
  propagation, and trusted bundled-extension emission.
- Promote the revision-bound Telegram conformance record from implemented
  candidate to adopted only after owner review stabilizes.
- Seek agent-runtime and Plugin SDK owner review of fork PR #146's canonical
  app-server result boundary and native-relay correlation seam.
- Define only the owner fields required by the accepted slice.
- Decide how resource usage and cost dimensions attach without becoming policy.
- Define conformance fixtures that validate meaning independently of rendering.
- Identify code or adapters the first slice can delete or simplify.
