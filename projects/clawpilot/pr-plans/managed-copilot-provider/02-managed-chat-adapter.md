# Managed Provider 2: Managed Chat Adapter

Base: managed-provider step 1
Planned head: managed-provider stack step 2

## Objective

Add a source-harness managed-provider adapter that can send a chat turn through
the managed-provider contract and normalize stream, final, error, abort, and
cancel events into Scout's existing session event vocabulary.

## Code Surfaces

- Add a managed-provider adapter interface under the backend/provider boundary.
- Add a test harness implementation that accepts injected stream fixtures and
  failure modes.
- Normalize managed-provider deltas, final messages, usage metadata, refusal or
  policy failures, provider errors, aborts, and cancellations.
- Keep the adapter separate from the existing GitHub Copilot SDK backend.
- Ensure provider credentials remain behind Scout Cloud/Lobster abstractions;
  Desktop sees only redacted provider metadata and event frames.

## Acceptance Criteria

- A managed-provider chat turn can complete without invoking the Copilot SDK
  path.
- Stream and final events match the shape `SessionManager` already consumes.
- Abort and cancel paths produce stable terminal states.
- Provider failures are explicit and do not mutate Desktop-provider sessions.
- The adapter is injectable and source-harness-only until a real managed
  service endpoint is approved.

## Expected Validation

- Adapter tests for delta, final, usage, provider rejection, transport error,
  abort, cancel, and malformed event handling.
- Session event normalization tests.
- Typecheck, focused lint/format, and `git diff --check`.

## Non-goals

- No live CAPI, Substrate, or M365 Copilot request in this step.
- No renderer UI change.
- No default route change.
