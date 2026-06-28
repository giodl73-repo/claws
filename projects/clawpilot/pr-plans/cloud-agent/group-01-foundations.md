# Cloud Agent Group 1: Foundations and Capability Contracts

PR: [giodl_microsoft/m#66](https://github.com/giodl_microsoft/m/pull/66)
Branch: `user/giodl/cloud-agent-group1-foundations`
Base: `user/giodl/scout-cloud-brain-architecture`
Replaces: #45, #46, #47, #48, #49, #50

## Objective

Create the hosted/cloud-agent foundation in one review unit: cloud tether
status, hosted agent roster, runtime routing, session binding, hosted chat
adapter contracts, and the cloud-to-Desktop capability envelope.

## Code Surfaces

- Extend backend capability snapshots with typed cloud tether status and safe
  disabled/local-only defaults.
- Add hosted OpenClaw roster descriptors with distinct `agentId`,
  `agentMemberId`, provider, region, capability tier, health, policy
  eligibility, and capacity state.
- Add the pure runtime routing model and candidate projection for Desktop-local,
  hosted OpenClaw, local OpenClaw, Copilot SDK, and future providers.
- Add `SessionMetadata.runtimeBinding` helpers for cloud-owned, hybrid,
  operator, and explicitly local sessions.
- Add hosted OpenClaw chat adapter contracts and event normalization into the
  existing backend event vocabulary.
- Add `CloudDesktopCapabilityRequest`, trusted Desktop context mapping,
  validation, TTL bounds, and supported capability/risk/data-movement contracts.

## Acceptance Criteria

- `0` hosted agents is represented as a first-class state, not an error.
- Runtime choice is represented as typed routing data, not hidden backend
  branching.
- Session binding keeps `userId`, `agentId`, `agentMemberId`, and
  `nodeEndpointId` separate.
- Hosted agents can request local work only through a typed Desktop capability
  envelope, never ambient local access.
- All helpers are pure or contract-level; no production hosted service call,
  allocator, UI behavior, or local tool execution is introduced.

## Expected Validation

- Focused Vitest coverage for IPC/conformance, hosted roster, runtime routing,
  session binding, hosted adapter, and capability envelope helpers.
- Focused type-aware `oxlint`.
- `pnpm exec tsc --noEmit`.
- `git diff --check`.
