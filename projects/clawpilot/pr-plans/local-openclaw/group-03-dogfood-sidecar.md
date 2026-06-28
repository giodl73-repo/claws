# Local OpenClaw Group 3: Dogfood UI, Chat Routing, and Sidecar Package Alignment

PR: [giodl_microsoft/m#74](https://github.com/giodl_microsoft/m/pull/74)
Branch: `user/giodl/local-openclaw-group3-dogfood-sidecar`
Base: `user/giodl/local-openclaw-group2-policy-lifecycle`
Replaces: #39, #40

## Objective

Wire the flagged dogfood path through UI diagnostics, chat routing, sidecar
stdio configuration, provider picker action, runbook updates, and Lobster
package metadata alignment.

## Code Surfaces

- Add provider diagnostics UI and hidden Local OpenClaw session binding plumbing.
- Route dogfood chat through the local provider path behind explicit flags.
- Add Scout-managed sidecar stdio wiring and provider picker action.
- Update the runbook and Lobster package metadata alignment docs.

## Acceptance Criteria

- The dogfood path is selectable only through explicit diagnostics/flagged
  surfaces.
- Default user runtime behavior is unchanged.
- Chat routing uses the provider/session binding contracts from prior groups.
- Lobster package metadata is aligned for later package-path proof without
  making Scout own container build or launch policy.

## Expected Validation

- Focused UI, session routing, sidecar stdio, provider picker, and backend tests.
- `pnpm exec tsc --noEmit`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.
