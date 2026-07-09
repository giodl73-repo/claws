# Managed Provider 3: Routing and Fallback

Base: managed-provider step 2
Planned head: managed-provider stack step 3

## Objective

Wire managed-provider eligibility into #3953 routing and session binding while
proving the current Desktop provider remains 100% preserved for unbound,
current-provider, blocked, or degraded cases.

## Code Surfaces

- Add managed-provider candidates to runtime routing inputs.
- Add managed-provider session binding helpers or extend existing runtime
  binding helpers with the new provider kind.
- Route explicit managed-provider sessions to the managed adapter.
- Preserve current Desktop provider routing for `undefined`, `desktop-local`,
  `copilot-sdk`, and current-provider bindings.
- Add fallback/degraded behavior for managed-provider unavailable, quota
  blocked, policy denied, or entitlement missing states.

## Acceptance Criteria

- Existing Desktop-provider sessions do not route through the managed adapter.
- Explicit managed-provider sessions route only when eligibility passes.
- Blocked managed-provider requests fall back only when policy allows fallback;
  otherwise they produce explicit degraded/unavailable state.
- Session metadata records provider choice, provider source, and fallback reason
  without exposing secrets.

## Expected Validation

- Runtime routing tests for explicit managed-provider selection, fallback, and
  degraded states.
- `SessionManager` tests proving unbound/current-provider sessions stay on the
  primary Desktop backend.
- Tests proving managed-provider bound sessions use the injected managed
  adapter.
- Typecheck, focused lint/format, and `git diff --check`.

## Non-goals

- No default-provider migration.
- No local Desktop capability execution.
- No live provider endpoint.
