# Cloud Agent PR3: Runtime Routing Decision Model

PR: https://github.com/giodl_microsoft/m/pull/47  
Branch: `user/giodl/cloud-agent-pr3-runtime-routing`  
Base: PR2

## Goal

Add a pure runtime routing decision model for selecting among Desktop-local,
hosted OpenClaw, local OpenClaw, Copilot SDK, and future providers.

## Code Surfaces

- Add `common/runtime-routing.ts`.
- Add `common/runtime-routing.test.ts`.

## Behavioral Contract

Routing must be deterministic and explain selected/deferred outcomes using
health, policy, capacity, requested provider, preferred kinds, degraded routing,
and fallback constraints. Hosted roster entries must project into candidates.

## Acceptance Tests

Cover selected hosted provider, requested-provider matching, policy/health/
capacity failures, preferred kind ordering, fallback, and degraded behavior.

## Non-Goals

No `SessionManager` integration, no session persistence, no hosted transport,
and no UI.
