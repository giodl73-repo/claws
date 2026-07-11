# Runtime Boundary

## Question

How does a host authenticate, connect to, supervise, and route traffic to a live
OpenClaw runtime using stable, portable behavior?

## Scope

- Trusted-proxy identity, headers, origins, and direct-access behavior.
- Brokered provider access, proxy-pipe, and no-secrets runtime posture.
- Start, readiness, liveness, drain, stop, reload, retry, and exit reasons.
- Stable transport and lifecycle failures.
- Hosting profiles as named, release-tested compositions of runtime conditions.

## Ownership

OpenClaw owns the host-facing runtime behavior and conformance. Lobster owns IdP
integration, tenant routing, proxy implementation, credentials, model
entitlements, worker pools, and deployment policy.

## Current Initiative

Readiness Conditions and Standard Hosting Profiles is the first focused slice:

- RFC: https://github.com/openclaw/rfcs/pull/33
- Draft implementation: https://github.com/openclaw/openclaw/pull/104018

It answers whether the runtime may receive work. It does not define all trusted
identity, proxy-pipe, or lifecycle-control semantics in this area.

## Audit Questions

- Which trusted headers and caller identities does OpenClaw actually consume?
- What prevents direct callers from bypassing the trusted host?
- Which proxy-pipe states and failures are stable enough for host automation?
- What are the retry, keepalive, drain, and warm-container reuse state machines?
- Which remaining Lobster checks became redundant after RFC 33?

## Current Evidence

`inventory/trust-proxy-pipe-2026-07-10.md` traces the current trusted identity
and brokered-egress boundary. Trusted-proxy behavior is a portable OpenClaw
Gateway contract selected through Managed Configuration. ProxyPipe remains a
Lobster transport that should contribute typed readiness/evidence without
placing Plex or Lobster protocol concepts in OpenClaw core.
