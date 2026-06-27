# Cloud Agent PR1: Cloud Tether Status Contract

PR: https://github.com/giodl_microsoft/m/pull/45  
Branch: `user/giodl/cloud-agent-pr1-tether-status`  
Base: `user/giodl/scout-cloud-brain-architecture`

## Goal

Add a disabled-by-default cloud tether status contract to backend capabilities
so Desktop can report whether cloud-agent support exists without changing
runtime behavior.

## Code Surfaces

- Extend `common/ipc-contract.ts` with `CloudTetherStatus`.
- Update Copilot and Gateway backend capability snapshots.
- Update backend IPC and renderer fixtures that consume capabilities.

## Behavioral Contract

Both current backends report local-only/no-cloud tether by default. The shape
must leave room for future connected/degraded states but not claim any hosted
agent availability.

## Acceptance Tests

Cover IPC contract shape, backend conformance, backend IPC serialization, and
existing renderer fixture expectations.

## Non-Goals

No hosted roster, routing, session binding, cloud service calls, or UI behavior.
