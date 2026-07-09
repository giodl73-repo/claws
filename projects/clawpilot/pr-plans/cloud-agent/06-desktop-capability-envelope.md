# Cloud Agent PR6: Cloud-to-Desktop Capability Envelope

PR: https://github.com/giodl_microsoft/m/pull/50
Branch: `user/giodl/cloud-agent-pr6-desktop-capability-envelope`
Base: PR5

## Goal

Define the envelope for a hosted cloud runtime to request a Desktop-local
capability without trusting cloud-supplied Desktop identity fields.

## Code Surfaces

- Add `common/cloud-desktop-capability-request.ts`.
- Add tests in `common/cloud-desktop-capability-request.test.ts`.

## Behavioral Contract

Cloud requests carry hosted runtime/provider/agent/member identity, capability,
risk, data movement, reason, input, TTL, and audit correlation. Desktop maps
them into trusted local requests using local user/tenant/session/node/policy
context. Invalid runtime, missing agent id, TTL errors, and session mismatch
fail validation.

## Acceptance Tests

Cover hosted-to-Desktop mapping, trusted local context preservation, TTL/session
validation, risk/data movement classification, and fail-closed invalid inputs.

## Non-Goals

No approval UI, executor, bridge, policy API integration, or audit persistence.
