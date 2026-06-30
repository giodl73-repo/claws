# Managed Provider 1: Contract and Readiness

Base: `user/giodl/cloud-agent-group6-execution-transport` (#3953)
Planned head: managed-provider stack step 1

## Objective

Represent Microsoft 365 Copilot or internal managed model capacity as a
first-class runtime provider candidate without changing default routing or the
current Desktop Copilot SDK path.

## Code Surfaces

- Extend the runtime/provider kind vocabulary with a managed provider kind such
  as `managed-copilot` or `managed-model`.
- Add provider readiness metadata: eligibility, capacity state, quota state,
  tenant policy state, entitlement status, model catalog summary, and degraded
  reason.
- Add redacted entitlement proof and provider-source fields suitable for audit
  and UI display.
- Project managed provider readiness into the existing #3953 routing candidate
  model.
- Keep defaults fail-closed: absent managed-provider config means unavailable,
  not implicitly routed.

## Acceptance Criteria

- The current Desktop provider remains the baseline candidate for unbound
  sessions.
- Managed-provider availability is explicit and typed.
- Missing entitlement, missing model catalog, quota exhaustion, policy denial,
  and provider-health failures are distinguishable degraded states.
- No provider credential, CAPI/Substrate secret, Graph token, or M365 token can
  be represented in Desktop-visible readiness payloads.

## Expected Validation

- Unit tests for managed-provider readiness parsing, sanitization, and invalid
  metadata rejection.
- Runtime routing tests proving unavailable managed capacity is not selected.
- IPC/conformance tests for any capability snapshot changes.
- `pnpm run typecheck`, focused `oxlint`, focused `oxfmt --check`, and
  `git diff --check`.

## Non-goals

- No live managed service call.
- No default-provider flip.
- No Desktop-local provider secret storage.
- No #3955 local capability execution yet.
