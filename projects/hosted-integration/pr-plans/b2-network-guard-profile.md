# B2: Versioned Network Guard Profile

## Outcome

Export the fixed one-hop DNS, SSRF, proxy, TLS, and private-route contract used
by every dispatcher.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B1

## Change

- Define a versioned, fixed-shape guard profile.
- Preserve DNS pinning, address-class checks, origin rules, proxy, and TLS.
- Represent managed private routes as explicit origins and CIDRs.
- Publish language-neutral rebinding and address-class fixtures.

## Non-Goals

- No global private-network bypass.
- No host-specific policy language in the portable profile.

## Proof And Exit

- Local dispatch uses the profile with no decision regressions.
- TypeScript fixtures cover public, private, mixed-address, rebinding,
  redirect-origin, proxy, and TLS cases.
- The fixture format is consumable by the Lobster Rust implementation.

## Completed Slice

- Branch: `user/giodl/hosted-integration-b2-network-guard`
- Commit: `39b095862d67c373098de5b0e8de6c7fd56761ab`
- Fork draft PR:
  [giodl73-repo/openclaw#35](https://github.com/giodl73-repo/openclaw/pull/35)
- Base: `user/giodl/hosted-integration-b1-local-dispatcher`
- Profile: fixed `network-guard/v1` target, route/resolution ownership, TLS,
  address policy, private CIDRs, special ranges, and rebinding semantics.
- Rebinding proof is explicit: `local-pinned`,
  `connection-owner-required`, or `not-enforced`.
- Proof: focused format/lint, `pnpm tsgo:core`, and 176 focused tests.
- Final review: `codex review --uncommitted` returned no accepted/actionable
  findings after the enforcement-ownership model replaced the ambiguous
  `rejectDnsRebinding` boolean.
