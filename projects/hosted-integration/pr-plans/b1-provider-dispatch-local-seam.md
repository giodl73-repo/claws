# B1: Provider-Request Local Dispatcher Seam

## Outcome

Extract one local `provider-request-dispatcher/v1` call at the existing
redirect-disabled exchange without changing behavior.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: A1 contract direction

## Change

- Introduce the typed one-hop request, response, and dispatch-failure shape.
- Keep the guarded-fetch redirect loop and header rewriting above the seam.
- Make the direct local network implementation the default binding.
- Preserve HTTP statuses as responses rather than dispatcher failures.

## Non-Goals

- No hosted carrier, credential resolver, or provider adaptation.
- No semantic retry or response interpretation inside the dispatcher.

## Proof And Exit

- Existing guarded-fetch suites pass unchanged.
- Local conformance covers success, HTTP status, timeout, cancellation, and
  failed-before-send.
- No configuration change is required for current installations.

## Implementation Status

- Draft fork PR: https://github.com/giodl73-repo/openclaw/pull/34
- Branch: `user/giodl/hosted-integration-b1-local-dispatcher`
- Base: `user/giodl/hosting-profile-release-conformance` at `cd643a42f7e`
- Commit: `9b8858bdf51`
- Proof: `pnpm tsgo:core`; 93 focused tests; clean final Codex autoreview.

B1 remains local-only. The reviewed implementation does not expose arbitrary
dispatcher injection because an implementation that ignored the pinned Undici
dispatcher could re-resolve DNS after validation. Replaceable/hosted selection
must wait for B2's enforceable portable network-guard contract.
