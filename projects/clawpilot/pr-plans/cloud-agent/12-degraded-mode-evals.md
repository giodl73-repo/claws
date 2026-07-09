# Cloud Agent PR12: Degraded-Mode Evals

PR: https://github.com/giodl_microsoft/m/pull/56
Branch: `user/giodl/cloud-agent-pr12-evals-degraded-mode`
Base: PR11

## Goal

Compose the previous cloud-agent contracts into scenario evals that prove
expected behavior under happy, degraded, and fail-closed conditions.

## Code Surfaces

- Add `common/cloud-agent-evals.ts`.
- Add `common/cloud-agent-evals.test.ts`.

## Behavioral Contract

Eval scenarios must exercise routing, capability envelope, policy, approval,
audit replay, device routing, rollout readiness, and degraded-mode decisions
together. Outputs should be deterministic evidence objects, not live service
calls.

## Acceptance Tests

Cover happy path, policy unavailable, stale device presence, approval
unavailable, invalid audit proof, capability kill switch, and shadow-stage
evidence collection.

## Non-Goals

No live cloud service, hosted dispatch, Desktop execution bridge, local
handlers, persistence, or UI.
