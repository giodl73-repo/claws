# Lobster reverse-carrier connection-owner review (2026-07-28)

## Thesis

Lobster can adopt OpenClaw O14 without adding a Gateway role, sidecar, service,
or port: its existing external `lobster-host` plugin owns one exact WebSocket
upgrade route, authenticates the carrier peer, admits PR54's standalone session
declaration through the O14 registry, and drains the exact incarnation on
disconnect.

Deletion target: remove the existing Rust client's dependency on the rejected
Gateway `role: "host-provider"`, `connect.challenge`, and
`host.provider.frame` protocol surface.

## Current-source audit

- Lobster fork PR 29 already packages an inactive external `lobster-host`
  plugin and validates its immutable contribution inventory.
- Lobster fork PR 54 serializes the O12-compatible
  `reverse-provider-session/v1` declaration and pins the shared fixture.
- The Rust carrier client still connects as a native Gateway
  `role: "host-provider"`; that handshake predates and conflicts with O14.
- OpenClaw fork PR 182 exposes the bounded frame validator, session registry,
  and operation registry through
  `openclaw/plugin-sdk/reverse-provider-dispatch`. It intentionally leaves
  credential verification, the accepted socket, scheduling, and cleanup to the
  plugin.

## Bounded adopter

1. Register one exact `auth: "plugin"` HTTP route with `handleUpgrade` from the
   existing external plugin.
2. Use a plugin-owned challenge and proof-of-possession handshake. The verifier
   is required and fail-closed; Gateway bearer/password auth is not treated as
   carrier identity evidence.
3. Feed only verified peer evidence plus PR54's declaration into O14 admission.
4. Bind every carrier frame to the admitted session and O14 operation registry.
5. On close, drain operations and detach the exact connection/incarnation.
6. Reconnect creates a fresh incarnation and never replays prior operations.
7. Keep the deployment inactive: no new runtime start path or default enablement
   is introduced in this slice.

## Role review

- **Lobster container engineer:** reuse the in-process external plugin; do not
  add a process, sidecar, port, or health dependency. Reconnect remains bounded
  and caller-owned.
- **Gateway engineer:** route matching and upgrade admission are the only
  Gateway participation. Accepted-socket work is asynchronous and plugin-owned;
  no generic Gateway message bus or native role is added.
- **CISO:** peer verification is an explicit required port, admission fails
  closed, authority is compared before session creation, and stale disconnects
  cannot detach a newer incarnation.
- **Lorant reviewer:** test malformed/expired/stale/duplicate admission,
  operation ownership, saturation, disconnect drain, and no-replay reconnect;
  keep O14 as the single source of truth rather than copying its validators.

## Promotion boundary

This remains a Lobster fork-only draft stacked on PR 54 and an OpenClaw O14
consumer. It does not authorize an upstream OpenClaw issue or PR. Promotion is
appropriate only after the paired exact-head proof passes and the stack's
required checks are attached and green.

## Outcome

- Published fork draft [Lobster PR 55](https://microsoft.ghe.com/giodl/lobster/pull/55)
  at `f01fa7d8ab43`, stacked on PR 54.
- The Rust client now speaks the plugin-owned connection envelope and rejects
  operation opens from any incarnation other than the admitted one.
- The O14 adopter is a separate `./connection-owner` package export. The
  existing startup entry remains manifest-only, so today's pinned runtime does
  not eagerly import an unavailable O14 SDK subpath.
- `ws` is self-contained in the ESM bundle with a `createRequire` bridge; no
  per-plugin install or bare runtime `ws` import is required.
- Proof: 20 Rust tests, strict Clippy, rustfmt, 11 plugin tests, exact O14 public
  type compatibility, diff hygiene, and clean final full-access autoreview.
- Fork state: draft, mergeable, no comments/reviews, no attached checks. No ADO
  run, runtime activation, upstream OpenClaw issue, or upstream OpenClaw PR.
