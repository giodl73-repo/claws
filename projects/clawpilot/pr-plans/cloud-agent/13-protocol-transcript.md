# Cloud Agent PR13: Protocol Transcript Proof

PR: https://github.com/giodl_microsoft/m/pull/59  
Branch: `user/giodl/cloud-agent-pr13-protocol-transcript`  
Base: PR12

## Goal

Build an ordered source-harness transcript that shows the cloud-agent protocol
across routing, session binding, hosted turns, Desktop requests, approval,
policy, audit, device routing, rollout, and degraded behavior.

## Code Surfaces

- Add `common/cloud-agent-protocol-transcript.ts`.
- Add `common/cloud-agent-protocol-transcript.test.ts`.
- Update `docs/architecture/29-scout-cloud-brain-integration.md` with the
  expanded proof-wave diagrams and PR13-PR18 plan.

## Behavioral Contract

Transcript steps must be deterministic, ordered, and tied to the same runtime
binding and request identities. Scenarios include cloud-owned hosted chat,
approved hybrid filesystem read, and denied high-risk operator shell exec.

## Acceptance Tests

Assert ordered step names, selected provider/session binding, approval/policy/
audit/device fields, terminal outcomes, and architecture doc format.

## Non-Goals

No live hosted runtime, no app composition, no GUI workflow, and no Desktop
gateway.
