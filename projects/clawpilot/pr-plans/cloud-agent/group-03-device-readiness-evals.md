# Cloud Agent Group 3: Device Routing, Readiness, and Evals

PR: [giodl_microsoft/m#68](https://github.com/giodl_microsoft/m/pull/68)
Branch: `user/giodl/cloud-agent-group3-device-readiness-evals`
Base: `user/giodl/cloud-agent-group2-approval-policy-contracts`
Replaces: #54, #55, #56

## Objective

Add operational decision proof for hosted local-work requests: device presence,
multi-device routing, rollout readiness, kill switches, operator gates, and
degraded-mode evals.

## Code Surfaces

- Add device presence and local-capability routing contracts.
- Model eligible, unavailable, stale, policy-blocked, and alternate-device
  routing outcomes.
- Add rollout readiness and kill-switch gates for hosted OpenClaw, operator
  mode, device routing, and local capability classes.
- Add eval scenarios that compose prior contracts into approved, denied,
  degraded, unavailable, and fail-closed outcomes.

## Acceptance Criteria

- Cloud can reason about Desktop capability availability without assuming the
  first Desktop process is reachable.
- Operator/local-capability paths are blocked when rollout readiness, policy,
  kill switch, or device presence is not valid.
- Evals prove no-bypass behavior before production hosted runtime or execution
  wiring exists.
- No production service call, GUI behavior, or concrete local executor is added.

## Expected Validation

- Focused Vitest coverage for device routing, rollout readiness, and degraded
  eval scenarios.
- Focused type-aware `oxlint`.
- `pnpm exec tsc --noEmit`.
- `git diff --check`.
