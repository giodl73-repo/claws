Closes #114772

Supersedes #113513 with only the review-supported local extraction; the
proposed versioned network-guard profile is not included.

## What Problem This Solves

`fetchWithSsrFGuard` currently selects and invokes the concrete fetch
implementation inside the same loop that owns SSRF checks, DNS pinning, proxy
routing, redirects, timeout, and release behavior. This change gives that
physical exchange a narrow internal boundary without moving any security or
redirect authority out of guarded fetch.

## Why This Change Was Made

The patch adds an internal `OneHopFetchRequest` whose redirect mode is fixed to
`"manual"` and extracts the existing local invocation into
`createLocalOneHopFetchDispatcher`. The existing choice between a
caller-provided fetch and `fetchWithRuntimeDispatcher` remains unchanged. No
configuration, plugin API, portable guard profile, credentials, or hosted
execution contract is added.

## User Impact

No intended user-visible behavior change. Existing direct, proxy, pinned-DNS,
redirect, timeout, capture, and error paths continue through the same guarded
fetch owner.

## Evidence

- `node scripts/run-vitest.mjs src/infra/net/one-hop-fetch-dispatcher.test.ts src/infra/net/fetch-guard.ssrf.test.ts` — 101 tests passed.
- `pnpm tsgo:core` — passed.
- Type-aware Oxlint on all three changed TypeScript files — 0 warnings and 0
  errors.
- Oxfmt check on all three changed TypeScript files — passed.
- `git diff --check upstream/main...HEAD` — passed.
- `codex review --base upstream/main` — no actionable regression identified.

## Real behavior proof

Behavior or issue addressed:
The production guarded-fetch redirect loop performs each HTTP exchange through
the extracted local one-hop dispatcher while retaining redirect ownership.

Real environment tested:
Ubuntu 24.04 under WSL2, Node.js 24.15.0, source checkout at
`48fab2d723d0a109ae58e7503e9a54a03ee7389e`, rebased onto upstream `main` at
`dd248759ef565438fdcd74ec0dd5f5412bd13bb0`, with a real ephemeral loopback
HTTP server and production `fetchWithSsrFGuard`.

Exact steps or command run after this patch:

1. Start an ephemeral loopback HTTP server that returns `302 /finish` for
   `/start` and `200 ok` for `/finish`.
2. Invoke production `fetchWithSsrFGuard` for `/start`, allowing only private
   network access for this loopback proof.
3. Read the final response and release the guarded-fetch resources.

Evidence after fix:

```text
{"proof":"o1-one-hop-dispatch","status":200,"finalPath":"/finish","paths":["/start","/finish"],"body":"ok"}
```

Observed result after fix:
The real server received exactly the initial and redirected requests, guarded
fetch returned the final HTTP 200 response, and the final body was `ok`.

What was not tested:
No external proxy or remote connection owner was tested because this PR keeps
only the existing local transport and adds no remote dispatch contract.
