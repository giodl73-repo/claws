# B3: Credential-Slot Resolver

## Outcome

Add an origin-scoped header credential contract that separates secret
materialization from provider adaptation and dispatch.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B1

## Change

- Define slot ID, header placement, allowed origins, and required posture.
- Add the local resolver binding and owner selection shape.
- Reject missing, ambiguous, or incompatible resolvers before send.
- Expose configuration readiness without acquiring a live request token.

## Non-Goals

- No arbitrary host header mutation.
- No secret values in config, status, logs, or fixtures.

## Proof And Exit

- Same-origin injection succeeds.
- Cross-origin, wrong-header, missing-slot, and expired-value cases fail closed.
- Redaction tests prove protected values never enter diagnostics.

## Completed Slice

- Branch: `user/giodl/hosted-integration-b3-credential-slot`
- Commit: `c4340d9053a3c2230edfd5b59a1724c0b51467ca`
- Fork draft PR:
  [giodl73-repo/openclaw#38](https://github.com/giodl73-repo/openclaw/pull/38)
- Base: `user/giodl/hosted-integration-b2-network-guard`
- Contract: fixed `credential-slot/v1` and
  `credential-slot-resolver/v1` metadata for one exact-origin header.
- Preparation rejects missing, duplicate, ambiguous, or incompatible resolver
  bindings without acquiring a live credential.
- Per-request application validates every slot reference before acquisition,
  never overwrites an existing protected header, and rejects unavailable or
  expired values before provider send.
- Static readiness exposes IDs, versions, placement, header, origins, and
  required posture without secret values or resolver calls.
- Proof: focused format/lint, `pnpm tsgo:core`, and 109 focused tests.
- Final review: `codex review --uncommitted` returned no accepted/actionable
  findings.
