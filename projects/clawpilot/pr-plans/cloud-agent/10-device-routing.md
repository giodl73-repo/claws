# Cloud Agent PR10: Device Presence Routing Contract

PR: https://github.com/giodl_microsoft/m/pull/54  
Branch: `user/giodl/cloud-agent-pr10-device-routing-contract`  
Base: PR9

## Goal

Select the correct Desktop node for a hosted capability request based on device
presence, capability support, policy readiness, and freshness.

## Code Surfaces

- Add `common/cloud-desktop-device-routing.ts`.
- Add tests in `common/cloud-desktop-device-routing.test.ts`.

## Behavioral Contract

Routing must choose the current capable Desktop node when fresh and policy
eligible. It must reject stale presence, wrong user/session/node, missing
capability, and unavailable approval path with structured reasons.

## Acceptance Tests

Cover current-device success, stale presence, unavailable device, multi-device
selection, capability mismatch, and fail-closed routing reasons.

## Non-Goals

No live device presence service, UI, Gateway bridge, or execution.
