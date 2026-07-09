# Cloud Agent PR8: Hosted Request Audit Replay

PR: https://github.com/giodl_microsoft/m/pull/52
Branch: `user/giodl/cloud-agent-pr8-audit-replay-proof`
Base: PR7

## Goal

Add a deterministic audit trail and replay proof model for hosted
cloud-to-Desktop capability requests.

## Code Surfaces

- Add `common/cloud-desktop-capability-audit.ts`.
- Extend approval contract where audit status/result needs to reference
  approval outcomes.

## Behavioral Contract

Audit records must capture request/session/task/user/tenant/agent/member/node
identity, policy version, audit correlation id, redacted input digest, terminal
status, decision, and denial reason. Replay must validate the trail and fail on
corruption or mismatched identities.

## Acceptance Tests

Cover approved trails, denied trails, redaction/digest behavior, replay success,
and replay failure for corrupted/mismatched proof.

## Non-Goals

No durable storage, policy service call, Desktop executor, or UI.
