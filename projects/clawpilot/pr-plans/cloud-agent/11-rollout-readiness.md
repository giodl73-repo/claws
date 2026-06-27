# Cloud Agent PR11: Rollout Readiness Contract

PR: https://github.com/giodl_microsoft/m/pull/55  
Branch: `user/giodl/cloud-agent-pr11-rollout-readiness`  
Base: PR10

## Goal

Add a readiness/kill-switch model that decides whether hosted cloud-agent paths
may run, shadow, degrade, or stop.

## Code Surfaces

- Add `common/cloud-agent-rollout-readiness.ts`.
- Add tests in `common/cloud-agent-rollout-readiness.test.ts`.

## Behavioral Contract

Readiness must consider hosted roster freshness, Desktop node presence,
approval availability, policy readiness, audit health, degraded mode, shadow
mode, and scoped kill switches. Decisions must include stable reason codes.

## Acceptance Tests

Cover hosted/runtime/capability kill switches, stale roster, missing approval,
policy/audit not-ready, degraded/shadow paths, and ready state.

## Non-Goals

No flag service integration, no UI, no transport, and no execution.
