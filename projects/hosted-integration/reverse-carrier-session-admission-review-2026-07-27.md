# Reverse-carrier session admission FACES review — 2026-07-27

## Frame

Thesis: the next independently reviewable reverse-carrier slice is a pure
caller-verified session admission authority, paired with Lobster's serializer
for the same declaration.

Deletion target: remove Gateway protocol schema, role, token issuance, socket,
reconnect, queue, operation-registry, activation, readiness, Status, and Doctor
concerns from this slice. Authentication remains owned by the future connection
caller.

## Audit

- The older OpenClaw C2 branch at `e8ab72556c4` mixed admission with 39 files
  and 2,408 lines of Gateway protocol, token, socket, operation, bundle, Status,
  and Doctor work. It was rejected as a source for cherry-picking.
- `src/gateway/host-provider-admission.ts` provided the useful internal
  analogue: exact role, client, scope, token, current-bundle, and owner checks.
  `src/gateway/host-provider-registry.ts` was intentionally not reused because
  it also owns sockets, queues, operations, revocation, and reconnection state.
- Lobster already had the five authoritative declaration fields in
  `HostProviderDeclaration`; adding another authority model or changing its
  inactive handshake would duplicate ownership.

## Compare

- Internal comparison favored caller-owned authentication plus a small
  process-local ownership registry over a new Gateway role or transport path.
- The external carrier comparison from
  `reverse-carrier-contract-review-2026-07-26.md` remains applicable: RFC 6455,
  RFC 9113, and gRPC supply transport and flow-control analogues, but none
  justify mixing credential issuance or a generic host bus into this contract.
- The adaptation is narrower than the old C2 design: a verified-peer evidence
  object, an exact expected authority, immutable admitted sessions, bounded
  strings, expiry, duplicate ownership rejection, and incarnation-safe detach.

## Evaluate

- Security: exact binding/interface/carrier/owner/bundle/audience matching;
  expired proofs fail closed; credentials and secret parsing stay outside.
- Runtime: no network, Gateway, dispatch, retry, or activation behavior exists.
- Operator: no new config, Status, Doctor, readiness, or repair surface exists.
- Ecosystem: fixed V1 declaration and language-neutral fixture can be consumed
  independently by a plugin or later promoted into OpenClaw ownership.
- Simplicity: Lobster projects its existing declaration rather than introducing
  a second authority source.

Review found and fixed one lifecycle edge: incarnation IDs now combine opaque
entropy with a constant-memory monotonic suffix, so repeated injected entropy
cannot let a late close detach a later session and no unbounded historical-ID
set is retained.

## Slice and evidence

OpenClaw fork draft PR 180, commit `b1630e5f3192777486dbf4a52fac321e647108e8`,
is stacked on reverse-carrier contract PR 179. Its 17 focused tests, Oxlint,
Oxfmt, and diff checks pass. Repository-wide TypeScript reached unrelated
baseline declaration errors in LINE and policy test helpers.

Lobster fork draft PR 54, commit `40e7137ca8782f486a7c7a55a8fbb436f1100bd0`,
is stacked on conformance PR 53. Its 19 package tests and strict Clippy pass.
Package-wide rustfmt exposes unrelated base drift in `client.rs` and
`package.rs`; those changes are excluded.

Both repositories pin the same fixture SHA-256:
`a361f7dfce21237eb937ce3a30ce44fe4aef5d230bcf16d7e15ba27576d5c367`.

## Outcome

The pair is suitable as fork-only drafts. It is not authorization to file an
OpenClaw issue or upstream PR, and it is not evidence for a live carrier. The
next carrier slice should stay separate and may choose the connection owner
that supplies the verified-peer evidence to this registry.
