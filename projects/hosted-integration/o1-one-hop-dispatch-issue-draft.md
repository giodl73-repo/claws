# Issue draft: isolate one guarded-fetch network hop

## Suggested title

Refactor guarded fetch to isolate one manual-redirect network hop

## Problem

`fetchWithSsrFGuard` currently owns both the security control loop and the
physical fetch call for each redirect hop. The same function decides SSRF
policy, DNS pinning, proxy routing, timeout and redirect behavior, then selects
and invokes the concrete fetch implementation inline.

That coupling makes the transport boundary difficult to test or evolve without
also editing the security-sensitive redirect loop. It also leaves no narrow
type that guarantees a lower-level exchange cannot follow redirects on its own.

## Proposed scope

- Add an internal one-hop request type whose `redirect` mode is fixed to
  `"manual"`.
- Move the existing local fetch invocation behind a small internal dispatcher.
- Preserve the current choice between an explicit caller fetch and OpenClaw's
  dispatcher-aware runtime fetch.
- Preserve response identity, transport errors, abort signals, prepared Undici
  dispatchers, capture, timeout, redirect, SSRF and release behavior.

## Acceptance criteria

- Existing guarded-fetch SSRF and redirect tests remain green.
- The one-hop boundary returns the original `Response` and propagates the
  original transport error.
- Redirect following and all network-policy decisions remain owned by
  `fetchWithSsrFGuard`.
- No configuration, plugin API or externally supported contract is added.

## Non-goals

- Remote or hosted dispatch
- A serialized or versioned network-guard profile
- Credential handling
- Provider selection or traffic policy
- New proxy, DNS, TLS or private-network authority
