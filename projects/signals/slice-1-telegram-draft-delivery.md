# Signals Slice 1: Telegram Draft Delivery Failure

Status: implemented in fork-only draft PR `giodl73-repo/openclaw#145`;
touched-surface proof is clean and owner adoption remains pending.

## Implementation Record

- Fork draft:
  [giodl73-repo/openclaw#145](https://github.com/giodl73-repo/openclaw/pull/145)
- Implementation head: `381c85fea31cb3d79ea08bce99e948939b49de53`
- Head branch: `user/giodl/signals-telegram-draft-diagnostics`
- Fork-only base: `user/giodl/base-telegram-draft-visible-failures`, mirroring
  the logging-only contributor PR before the Signals commit
- Worktree: `C:\src\openclaw-signals-telegram-v1`
- Focused proof: 106 tests passed across `draft-stream.test.ts` and
  `bot-message-dispatch.draft-failures-progress.test.ts`.
- The same exact implementation head previously completed upstream CI with 71
  passing checks and no pending checks. `security-fast` failed only on the
  unrelated repository dependency audit for `axios` advisory
  `GHSA-gcfj-64vw-6mp9`.
- ClawSweeper found no concrete patch defect. It classified the remaining
  question as a maintainer decision: accept the recommended bounded diagnostic
  contract or reduce the PR to logging only.
- Formal Codex branch review against the fork-only stacked base completed with
  no actionable findings.
- Contributor PR #111065 was reduced back to logging-only at
  `917815b6049364b51497dbb7a4c519eccef42c71`; its body no longer carries
  Signals framing or diagnostic claims.
- Adoption posture: keep the RFC conformance record revision-bound and
  non-adopted until Telegram and diagnostics owners accept the exact
  implementation head and focused fixtures.

## Why This Slice

[OpenClaw issue #111064](https://github.com/openclaw/openclaw/issues/111064)
reports a production-visible failure:

- Telegram `progress` mode can stop updating and deliver no answer;
- meaningful preview failure states exist inside the draft stream;
- `bot-message-dispatch-draft.ts` maps the warning channel to `logVerbose`; and
- default logs, telemetry, and operator status therefore receive no terminal
  signal.

OpenClaw already has `message.delivery.error` and OTel/Prometheus projections,
so the slice can prove Signals without adding a dispatcher or exporter.

## Representative Fixture

A Telegram draft stream receives no message id from `sendMessage` and stops the
only visible progress delivery lane.

## Narrow Seam

Keep the change internal to the Telegram extension:

1. preserve a typed draft failure reason before formatting warning text;
2. project that result into the existing diagnostic event surface;
3. render an appropriate default operator warning; and
4. leave successful draft behavior unchanged.

An internal typed callback is preferable to parsing the warning string. Do not
add a public plugin SDK hook or config key for this slice.

## Accepted Result

- successful preview start/update/complete behavior remains unchanged;
- no error event is emitted;
- no extra warning appears; and
- the hot path performs no exporter or localization work.

## Structured Failure

For the missing-message-id fixture, emit one bounded owner result containing:

- existing event type: `message.delivery.error`;
- channel: `telegram`;
- an existing delivery kind or the smallest owner-approved bounded extension;
- stable error category for the specific terminal reason;
- required finite duration from the attempted preview send to terminal
  classification; and
- the existing dispatch `sessionKey` when present; and
- OpenClaw-created active trace context preserved through the plugin SDK
  `emitTrustedDiagnosticEvent` path.

Do not include chat id, message content, bot token, raw Telegram response,
filesystem path, or raw exception text in the public diagnostic event.

This event describes one failed preview delivery attempt, not the Telegram turn
outcome. Existing delivery consumers export terminal records independently
rather than joining them to `message.delivery.started`. A later fallback or
final send is a separate delivery attempt and may succeed without contradicting
the failed preview attempt.

## Human Projection

Default operator output should explain that Telegram preview delivery stopped
and identify the next diagnostic action. Localization may later render that
owner result, but the first slice must not require the localization stack to
land.

## Observable Proof

Focused tests and exact-head gates should prove:

1. the active-generation missing-message-id branch emits exactly one existing
   diagnostic event when it marks the stream stopped;
2. the event carries a stable bounded category and no sensitive content;
3. the event includes the existing dispatch `sessionKey` when present;
4. trusted ancestry comes from OpenClaw-owned active context, not Telegram
   input;
5. default logging receives an actionable warning;
6. verbose logging does not become the only failure surface;
7. successful preview emits no failure event;
8. a later fallback/final success is a separate attempt; and
9. existing OTel/Prometheus recorders accept the event without new exporter
   configuration.

Implemented focused fixtures currently prove items 1-4 and 6-7 directly,
including exactly-once active reporting, no superseded-generation report,
trusted projection metadata, stable category, finite duration, session
correlation, and omission of `chatId` from the public event. Existing warning
fixtures preserve item 5. Exporter compatibility remains an exact-head
conformance claim rather than a new exporter-specific implementation.

## Deletion Mapping

Delete the `warn: logVerbose` semantic collapse for the adopted failure path.
The draft owner should provide structured meaning once; log and telemetry
projections consume it.

## Disproof Gate

Reject this slice if:

- the failure is already emitted elsewhere with equivalent stable identity;
- using `message.delivery.error` would misrepresent preview semantics;
- a public SDK or universal delivery schema is required; or
- the change cannot avoid duplicate warnings and events.

If rejected, retain the issue evidence and select another owner path rather
than broadening Signals.
