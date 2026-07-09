# Cloud Agent Group 4: Protocol Transcript and Hosted Runtime

PR: [giodl_microsoft/m#69](https://github.com/giodl_microsoft/m/pull/69)
Branch: `user/giodl/cloud-agent-group4-hosted-runtime`
Base: `user/giodl/cloud-agent-group3-device-readiness-evals`
Replaces: #59, #60, #61

## Objective

Turn the contract proof into a source-harness hosted runtime path: protocol
transcripts, hosted dispatch through `SessionManager`, and app composition for a
deterministic hosted adapter.

## Code Surfaces

- Add a protocol transcript builder that composes routing, session binding,
  hosted chat, Desktop capability requests, approvals, audit replay, policy,
  device routing, rollout readiness, and degraded outcomes.
- Add `createRuntimeSessionDispatcher` for routing send, event subscription,
  abort, and cancel by persisted `SessionRuntimeBinding`.
- Add optional `SessionManager` hosted adapter injection.
- Add source-harness hosted OpenClaw composition behind
  `M_HOSTED_OPENCLAW_SOURCE_HARNESS=1`.
- Add deterministic source-harness hosted chat transport and proof that a
  hosted-bound session completes through real `SessionManager` event plumbing.

## Acceptance Criteria

- Hosted-bound sessions route to the hosted adapter when configured and fail
  closed when no hosted adapter exists.
- Non-hosted sessions continue through the existing primary backend.
- Source-harness composition is opt-in only; default production behavior is
  unchanged.
- No live hosted allocator, production hosted transport, Desktop capability
  gateway, or local tool execution is added.

## Expected Validation

- Focused protocol transcript Vitest coverage.
- Hosted adapter, dispatcher, composition, and hosted `SessionManager` tests.
- Full `electron/sessions.test.ts` where the SessionManager seam is touched.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `pnpm exec tsc --noEmit`.
- `git diff --check`.
