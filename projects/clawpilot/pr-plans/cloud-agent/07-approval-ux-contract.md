# Cloud Agent PR7: Hosted Request Approval UX Contract

PR: https://github.com/giodl_microsoft/m/pull/51  
Branch: `user/giodl/cloud-agent-pr7-approval-ux-contract`  
Base: PR6

## Goal

Map hosted Desktop capability requests into a user-facing approval contract that
can reuse existing permission-card patterns.

## Code Surfaces

- Add `common/cloud-desktop-capability-approval.ts`.
- Add tests in `common/cloud-desktop-capability-approval.test.ts`.

## Behavioral Contract

Approval presentation must show capability, reason, risk, data movement,
Desktop node, hosted agent identity, and audit correlation. Resolution values
must represent approve, user deny, policy deny, expiry, and approval-unavailable
states in a structured form.

## Acceptance Tests

Cover presentation text, permission-card mapping, approve/deny/expired paths,
policy denial, and stable user-facing strings.

## Non-Goals

No actual renderer card wiring, no Desktop execution, and no hosted transport.
