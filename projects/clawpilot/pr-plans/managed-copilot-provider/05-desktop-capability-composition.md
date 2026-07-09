# Managed Provider 5: Desktop Capability Composition

Base: managed-provider step 4 plus #3955 capability platform when available
Planned head: managed-provider stack step 5

## Objective

Prove managed-provider turns can request provider-neutral Desktop capabilities
through #3955 without gaining ambient local access or receiving raw M365/Graph
tokens.

## Code Surfaces

- Map managed-provider identity, session binding, and attestation metadata into
  #3955 Desktop capability request envelopes.
- Gate managed-provider capability requests through tenant policy, Desktop
  readiness, approval routing, TTL validation, executor dispatch, and audit.
- Exercise representative low-risk capability requests such as browser open,
  clipboard write, filesystem read, or M365 draft creation depending on #3955
  availability.
- Ensure raw token request capabilities are denied and audited.
- Return bounded, redacted capability results to the managed-provider turn.

## Acceptance Criteria

- Managed providers use the same Desktop capability gate as hosted OpenClaw,
  Local OpenClaw, and the current Desktop path.
- Policy denial, stale request, missing approval, unsupported capability, and
  executor failure all fail closed.
- M365-sensitive flows are draft-first and token-redacted.
- Capability audit records identify the managed provider and session without
  exposing provider secrets or raw M365 tokens.

## Expected Validation

- Capability bridge tests for managed-provider request validation.
- Approval/audit/eval tests covering allowed, denied, stale, and unsupported
  requests.
- Token-isolation tests proving raw M365/Graph tokens cannot pass through.
- Typecheck, focused lint/format, and `git diff --check`.

## Non-goals

- No new broad local capability family beyond #3955.
- No background browser or clipboard polling.
- No direct Graph token handoff to the managed provider.
