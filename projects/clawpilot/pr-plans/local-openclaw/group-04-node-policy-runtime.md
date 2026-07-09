# Local OpenClaw Group 4: Node-Mode Policy, Evals, and Runtime Entry Point

PR: [giodl_microsoft/m#75](https://github.com/giodl_microsoft/m/pull/75)
Branch: `user/giodl/local-openclaw-group4-node-policy-runtime`
Base: `user/giodl/local-openclaw-group3-dogfood-sidecar`
Replaces: #41, #42

## Objective

Add the Desktop node-mode policy/eval framework and runtime request entry point
so Local OpenClaw can ask Desktop for governed local capabilities while
production handlers still fail closed.

## Code Surfaces

- Add capability contract, approval routing, audit attribution, policy gates,
  and no-bypass eval harness.
- Add runtime request entry point that accepts Local OpenClaw requests through
  Desktop node mode.
- Preserve placeholder handler behavior for concrete local actions until later
  groups.
- Add tests for invalid runtime/session binding and fail-closed behavior.

## Acceptance Criteria

- Local OpenClaw never receives ambient filesystem, shell, browser, clipboard,
  app, token, or M365 access.
- Policy, approval, audit, runtime identity, and session binding are validated
  before any handler can run.
- Unsupported capabilities fail closed.
- The runtime entry point is reviewable before real local tools are added.

## Expected Validation

- Focused node capability, policy, approval routing, audit attribution, eval,
  and runtime entrypoint tests.
- `pnpm exec tsc --noEmit`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.
