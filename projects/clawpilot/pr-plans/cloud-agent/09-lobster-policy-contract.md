# Cloud Agent PR9: Lobster Policy Contract

PR: https://github.com/giodl_microsoft/m/pull/53  
Branch: `user/giodl/cloud-agent-pr9-lobster-policy-contract`  
Base: PR8

## Goal

Model the Lobster policy decision contract used to approve/deny hosted
Desktop capability requests before user approval/execution.

## Code Surfaces

- Add `common/cloud-desktop-capability-policy.ts`.
- Integrate with audit inputs/outputs where policy decision metadata is needed.

## Behavioral Contract

Policy evaluation returns allow, deny, or unavailable/not-ready decisions with
policy version/source and denial reason. Risk/data movement/capability/request
identity must be part of the policy input. Policy unavailable must fail closed
unless an explicit shadow/degraded path is selected by later readiness logic.

## Acceptance Tests

Cover allowed policy, denied policy, unavailable policy, stale/missing policy
version, and audit trail policy fields.

## Non-Goals

No actual Lobster API client, no UI, no Desktop execution, and no persistence.
