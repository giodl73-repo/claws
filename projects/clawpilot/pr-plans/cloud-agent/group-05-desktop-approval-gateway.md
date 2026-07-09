# Cloud Agent Group 5: Desktop Approval Gateway

PR: [giodl_microsoft/m#70](https://github.com/giodl_microsoft/m/pull/70)
Branch: `user/giodl/cloud-agent-group5-desktop-approval-gateway`
Base: `user/giodl/cloud-agent-group4-hosted-runtime`
Replaces: #62, #63

## Objective

Connect hosted cloud-to-Desktop capability requests to the real Desktop
approval card path and validate cloud envelopes before the user is prompted.

## Code Surfaces

- Add hosted Desktop approval UI helper that maps a trusted
  `DesktopLocalCapabilityRequest` into the existing `ApprovalBroker` and
  `PermissionCardManager` external-action card path.
- Return typed hosted approval results for approved, user-denied, expired, and
  approval-unavailable outcomes.
- Reject late Allow clicks after `request.expiresAt`.
- Add hosted capability intake that maps `CloudDesktopCapabilityRequest` with
  trusted Desktop context, rejects invalid envelopes before prompting, and
  routes valid requests into the approval UI seam.
- Race intake approval against the remaining hosted request TTL and resolve
  stale cards terminally.

## Acceptance Criteria

- Invalid cloud envelopes never create a Desktop prompt.
- Valid requests use trusted local session/user/tenant/node/policy context, not
  untrusted cloud identity fields.
- Approval UI unavailability fails closed.
- Stale hosted requests return `expired` and cannot be approved after TTL.
- No production hosted service transport, Desktop executor, live cloud allocator,
  GUI entry point, or Lobster policy API wiring is added.

## Expected Validation

- Focused Vitest coverage for approval card mapping, denial, expiry,
  approval-unavailable, intake validation, TTL race, and stale-card resolution.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `pnpm exec tsc --noEmit`.
- `git diff --check`.
