# D5d: Lobster Agentic-User Resolver

## Outcome

Implement the trusted agentic-user bearer resolver for Graph-hosted dispatch.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: D5c and D2b

## Change

- Add `lobster/graph-token` to the immutable host package and compile the exact
  four-origin `m365mail-graph` enterprise route.
- Derive tenant, owner, assertion, and mailbox from trusted runtime state; the
  reverse request carries no identity-selection authority.
- Accept the trusted mailbox only when it exactly matches the resolved
  `AgentIdentityConfig.agent_user_id` or case-insensitively matches
  `agent_user_upn`.
- Materialize only the Graph bearer under the fixed
  `https://graph.microsoft.com` audience and a live enable/revocation gate.
- Authenticate inbound m365mail delivery with the existing Gateway bearer while
  leaving msteams webhook requests unchanged.
- Add redacted readiness, rollback, route-drift, subject-binding, fixture, and
  request-header evidence.

## Sequencing Boundary

Lobster remains pinned to OpenClaw `v2026.5.28`; D5c is based on the later
`2026.6.11` stack. The existing Docker patch set and vendored m365mail overlay
cannot be removed or replaced safely in this PR.

This slice therefore prepares and proves the adopter boundary but does not:

- call the D5c hosted-binding selector from production Graph execution;
- delete `src/openclaw_container/m365mail-extension`;
- remove the existing transparent Graph injection path; or
- claim production hosted Graph authority.

Those deletions require an admitted OpenClaw artifact containing D5c plus
rollout evidence that the old path is unused.

## Proof And Exit

- Missing or stale identity fails closed.
- Mailbox/object-ID or UPN mismatch fails closed before token acquisition.
- Policy origin, dispatcher binding, or generation drift fails closed.
- Audit correlation survives request completion and failure.
- No Graph semantics enter the resolver or dispatcher.
- The Graph canary can grant and revoke one host-provider authority in
  validation while production selection remains promotion-gated.
