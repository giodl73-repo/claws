## Summary

Give external plugins one bounded, generation-fenced way to own a reverse
provider connection without adding a second Gateway server or making Gateway
core own the plugin's transport lifecycle.

## Problem to solve

An external plugin can register an authenticated WebSocket upgrade route, but
OpenClaw does not currently provide a reusable contract for binding that
accepted connection to one immutable provider authority and one bounded set of
in-flight operations.

Without that seam, each plugin must invent its own frame validation, session
identity, reconnect fencing, operation limits, and stale-result handling. The
other alternative is to add a generic host-provider endpoint to Gateway core,
which would make core own listener, credential, and reconnect behavior that
belongs to the plugin and its deployment owner.

The missing capability is narrower: reusable process-local ownership contracts
for a connection that the plugin has already authenticated and accepted.

## Proposed solution

- Add one closed, versioned reverse-provider frame contract with strict payload,
  sequencing, deadline, credit, cancellation, and terminal-result bounds.
- Admit only caller-verified peer evidence that exactly matches the binding,
  interface, carrier, owner generation, host-bundle generation, audience, peer
  key, and proof expiry.
- Give every admitted connection a unique process-local incarnation and reject
  late frames from replaced or expired sessions.
- Scope operation ownership to the exact current incarnation, cap total active
  operations, validate the full protocol state in constant memory, release
  only valid terminal operations, and drain only the disconnected incarnation.
- Derive one opaque owner generation from the effective configuration,
  traffic-policy generation, effective host-bundle generation, audience, and
  peer-key fingerprint.
- Expose the contracts through one narrow Plugin SDK subpath. The plugin remains
  responsible for the upgrade route, credential verification, accepted socket,
  serialized sends, and disconnect cleanup.

Acceptance criteria:

- Unknown fields, unsupported URL schemes, stale generations, expired proof,
  duplicate ownership, over-capacity operations, premature terminal frames,
  invalid credit/sequence transitions, and late frames fail closed.
- Reconnect creates a new incarnation but does not create a new semantic owner
  generation or replay old operations.
- Host-bundle identity comes from the effective loader-owned registry snapshot,
  not plugin-supplied runtime state.
- The normal Gateway and plugin startup paths remain unchanged unless a plugin
  explicitly registers and activates a route.
- No core listener, Gateway role, token issuer, socket manager, reconnect loop,
  provider implementation, configuration surface, Status surface, or Doctor
  surface is added.

## Alternatives considered

- Add a generic Gateway host-provider endpoint. This centralizes product-owned
  admission and reconnect behavior and creates a second service surface in
  core.
- Reuse node or operator connections. Their pairing, scopes, and trust
  lifecycles grant the wrong authority to a provider peer.
- Let every plugin define the full protocol. That preserves local ownership but
  duplicates the safety-critical bounds and makes cross-language conformance
  difficult.
- Treat every reconnect as a new owner generation. That confuses transport
  incarnation with semantic configuration and permits avoidable stale-work
  races.

## Impact

Ordinary OpenClaw installations and plugins are unaffected. A plugin that owns
an external provider connection can reuse one strict set of contracts while
retaining its own transport, credential, deployment, and provider semantics.

The change is additive but introduces a public Plugin SDK contract. Its V1
wire bounds and generation identity should therefore receive explicit Gateway
and plugin-owner review. In particular, @steipete should confirm that this
narrow public subpath and plugin-owned transport boundary are the intended
long-term shape before merge.

## Evidence/examples

A prepared fork implementation verifies all 147 public Plugin SDK subpaths and
passes 76 focused OpenClaw tests. A separate external Lobster plugin proof uses
a real loopback HTTP upgrade, short-lived HMAC credential, Ed25519
proof-of-possession, and the exact effective bundle generation; all 23 plugin
tests and 26 Rust adapter tests pass. Disabled startup does not read authority
or register the route.

## Do you plan to open a PR for this?

Yes. A reviewed fork implementation is ready to replay onto current `main`
after its manifest-first host-bundle prerequisite is accepted. No issue or PR
should be filed until that prerequisite and the public SDK boundary are ready
for maintainer review.

