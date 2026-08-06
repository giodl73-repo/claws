## Summary

Isolate each physical HTTP exchange performed by guarded fetch behind a narrow,
internal one-hop dispatcher whose redirect mode is fixed to `"manual"`.

## Problem to solve

`fetchWithSsrFGuard` currently owns both the security control loop and the
physical fetch call for each redirect hop. The same function decides SSRF
policy, DNS pinning, proxy routing, timeout, and redirect behavior, then selects
and invokes the concrete fetch implementation inline.

That coupling makes the transport boundary difficult to test or evolve without
also editing the security-sensitive redirect loop. It also leaves no narrow
type that guarantees a lower-level exchange cannot follow redirects on its
own.

## Proposed solution

- Add an internal one-hop request type whose `redirect` mode is fixed to
  `"manual"`.
- Move the existing local fetch invocation behind a small internal dispatcher.
- Preserve the current choice between an explicit caller fetch and OpenClaw's
  dispatcher-aware runtime fetch.
- Keep redirect following and every network-policy decision in
  `fetchWithSsrFGuard`.

Acceptance criteria:

- Existing guarded-fetch SSRF and redirect tests remain green.
- The one-hop boundary returns the original `Response` and propagates the
  original transport error.
- No configuration, plugin API, or externally supported contract is added.

## Alternatives considered

The earlier prototype also introduced a serialized network-guard profile. That
is intentionally excluded: a portable policy contract should wait for an
approved second connection owner. Leaving the inline call unchanged avoids a
small refactor now, but keeps transport selection coupled to the security loop.

## Impact

This is an internal, behavior-preserving refactor. Users and operators should
see no change to direct, proxy, pinned-DNS, redirect, timeout, capture, or error
behavior. The benefit is a smaller review and test boundary for future network
transport work without weakening guarded fetch's ownership of policy.

## Evidence/examples

A prepared patch passes 101 focused guarded-fetch tests, the core typecheck,
type-aware lint, formatting, and a real loopback redirect proof. The proof
observes exactly `/start` followed by `/finish`, with a final HTTP 200 response.

## Do you plan to open a PR for this?

Yes. A narrow, behavior-preserving implementation is ready and will be linked
to this issue.
