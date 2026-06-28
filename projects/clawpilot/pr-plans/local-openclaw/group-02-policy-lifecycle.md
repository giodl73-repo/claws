# Local OpenClaw Group 2: Policy, Session, Lifecycle, and Transport

PR: [giodl_microsoft/m#73](https://github.com/giodl_microsoft/m/pull/73)
Branch: `user/giodl/local-openclaw-group2-policy-lifecycle`
Base: `user/giodl/local-openclaw-group1-foundation-runtime`
Replaces: #37, #38

## Objective

Add the policy/session foundation and dogfood lifecycle/transport layer that
lets a Local OpenClaw runtime exist under explicit provider eligibility and
session binding, without enabling user-visible local tools.

## Code Surfaces

- Add Desktop node capability bridge contracts and provider policy gates.
- Add session runtime binding helpers that keep provider/runtime/agent/node
  identity distinct from the backend name.
- Add local lifecycle composition and runtime compatibility checks.
- Add stdio transport contracts for the flagged dogfood runtime path.

## Acceptance Criteria

- Provider eligibility is explicit and fail-closed when policy, runtime health,
  audit, or containment requirements are not met.
- Session binding is a typed contract, not hidden branching.
- Dogfood lifecycle and transport paths are feature-gated and do not change
  default runtime behavior.
- No concrete filesystem, shell, browser, clipboard, app, token, or M365 handler
  exists in this group.

## Expected Validation

- Focused policy, session binding, lifecycle, transport, IPC, and conformance
  tests.
- `pnpm exec tsc --noEmit`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.
