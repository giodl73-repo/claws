# Cloud Agent PR2: Hosted OpenClaw Agent Roster Contract

PR: https://github.com/giodl_microsoft/m/pull/46
Branch: `user/giodl/cloud-agent-pr2-hosted-roster`
Base: PR1

## Goal

Define the hosted OpenClaw agent roster contract as a first-class capability
surface, with an explicit empty roster as the safe default.

## Code Surfaces

- Extend `common/ipc-contract.ts` with hosted agent descriptors and roster.
- Update Copilot/Gateway capability implementations.
- Update backend IPC/conformance and renderer fixtures.

## Behavioral Contract

Roster entries must distinguish agent id, optional member id, provider,
region, capability tier, health, policy eligibility, and capacity. An empty
roster is valid and means Desktop is cloud-tethered with zero hosted agents.

## Acceptance Tests

Assert default empty roster for Copilot/Gateway and schema/fixture stability.

## Non-Goals

No cloud roster fetch, hosted allocation, runtime routing, UI picker, or
session binding.
