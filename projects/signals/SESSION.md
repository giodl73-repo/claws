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

- Last updated: 2026-07-21.
- Last agent: Copilot.
- Current focus: Adoption PR 4 preserves an existing authoritative agent
  `runId` through routed outbound message hooks without adding tracing fields
  or a new correlation carrier.
- Active branch / PR: fork draft
  [giodl73-repo/openclaw#148](https://github.com/giodl73-repo/openclaw/pull/148),
  head `user/giodl/signals-outbound-run-correlation` at `2347e079e43`, stacked
  on fork draft
  [#147](https://github.com/giodl73-repo/openclaw/pull/147) at
  `cc0697c609a`, which is stacked on fork draft
  [#146](https://github.com/giodl73-repo/openclaw/pull/146) at
  `728998a348d`, which is stacked on fork draft
  [#145](https://github.com/giodl73-repo/openclaw/pull/145) at
  `381c85fea31cb3d79ea08bce99e948939b49de53`. Local RFC branch
  `user/giodl/rfc-0025-signals` remains unpushed.
- Contributor PR:
  [openclaw/openclaw#111065](https://github.com/openclaw/openclaw/pull/111065)
  is logging-only again at `917815b6049364b51497dbb7a4c519eccef42c71`.
- Implementation worktree: `C:\src\openclaw-signals-telegram-v1`; branch
  `user/giodl/signals-outbound-run-correlation`, stacked on fork PR #147. The
  contributor-review and temporary WSL proof worktrees were removed.
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

## Resume Checklist

- Run: work through fork drafts #145 and #146 and the local RFC package before any
  upstream publication; do not repair the unrelated Axios advisory here.
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

- Adoption PR 4 evidence:
  `projects/signals/slice-4-outbound-run-correlation.md`.
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
