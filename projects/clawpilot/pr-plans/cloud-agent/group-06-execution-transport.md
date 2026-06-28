# Cloud Agent Group 6: Desktop Execution, Audit, and Transport

PR: [giodl_microsoft/m#71](https://github.com/giodl_microsoft/m/pull/71)
Branch: `user/giodl/cloud-agent-group6-execution-transport`
Base: `user/giodl/cloud-agent-group5-desktop-approval-gateway`
Replaces: #64, #65

## Objective

Complete the source-level cloud-to-Desktop capability path with approval-gated
execution, replayable audit proof, request/result transport frames, executor
output projection, and validated session routing.

## Code Surfaces

- Add hosted Desktop capability execution handoff that validates/maps the cloud
  request, routes through the approval seam, and calls an injected Desktop
  executor only after approved.
- Recheck and race hosted request TTL before execution/no-response waits.
- Show canonical execution target and input digest in approval details so the
  displayed approval is bound to executed input.
- Return skipped results for denied, invalid, approval-unavailable, expired, and
  rejected requests.
- Preserve audit trail and replay proof for approved and denied paths.
- Add hosted capability transport frame types for `desktop-capability.request`
  and `desktop-capability.result`.
- Resolve trusted Desktop context locally before executing.
- Project execution output into result frames and route frames by validated
  request session, not untrusted wrapper session.

## Acceptance Criteria

- Executor is never called for denied, invalid, approval-unavailable, expired,
  or stale requests.
- Executor failures after approval are reported without losing audit proof.
- Approved execution results include stable output in result frames.
- Result frames cannot be misrouted by an untrusted outer wrapper session.
- Normal hosted chat events are unchanged.
- No concrete filesystem/shell executor, production hosted service, GUI
  workflow, live cloud allocator, or Lobster policy API wiring is added.

## Expected Validation

- Focused Vitest coverage for approved execution, denial, invalid request,
  approval-unavailable, expiry/no-response, executor failure, output projection,
  and validated-session routing.
- Related hosted/cloud/audit Vitest suite.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `pnpm exec tsc --noEmit`.
- `git diff --check`.
- Codex review clean on the top transport commit.
