# PR draft: exact-origin credential slots

> Decision-blocked: do not file while openclaw/openclaw#104849 carries the
> `clawsweeper:no-new-fix-pr` product/security gate. Recompose this with the
> approved plugin/provider owner if maintainers require an in-tree consumer.

## Suggested title

feat(net): add owner-prepared exact-origin credential slots

## What Problem This Solves

A trusted provider or plugin owner may need to resolve a credential immediately
before guarded egress without exposing the credential to a model, generic URL
tool, bundle declaration, status payload, readiness probe, or redirect target.
OpenClaw has no narrow internal contract for that placement today.

## Why This Change Was Made

- Prepare fixed `credential-slot/v1` definitions and resolver bindings before
  dispatch.
- Bind each slot to one header and an explicit set of exact HTTP origins.
- Validate duplicate ownership, compatibility, references, origins and
  protected-header conflicts before resolving any credential.
- Resolve only on the selected initial guarded-fetch hop and remove slot
  references before every redirect, including same-origin redirects.
- Preserve caller cancellation and guarded-fetch deadlines when a resolver
  ignores its signal.
- Return redacted typed failures for unavailable, expired or invalid values.
- Keep readiness non-secret and resolver-free.

This branch is based on the local-only O1 dispatcher. It does not restore or
depend on the deferred `network-guard/v1` profile.

## User Impact

No existing fetch behavior changes. The new path is internal and has no
configuration, Plugin SDK registration, model-facing surface, cache behavior,
or production caller until an owner is approved.

## Evidence

- `node scripts/run-vitest.mjs src/infra/net/credential-slot.test.ts src/infra/net/one-hop-fetch-dispatcher.test.ts src/infra/net/fetch-guard.ssrf.test.ts` — 116 tests passed.
- `pnpm tsgo:core` — passed.
- Type-aware Oxlint on all four changed TypeScript files — 0 warnings and 0
  errors.
- Oxfmt and `git diff --check` — passed.
- `codex review --base user/giodl/o1-one-hop-dispatch-current-main` — no
  actionable correctness issues.
- `pnpm tsgo:core:test` was queued behind another worktree's shared heavy-check
  lock and did not start within the bounded validation window.

## Real behavior proof

Behavior or issue addressed:
An owner-prepared credential is resolved lazily for one exact initial origin,
is not exposed through readiness, and does not follow a redirect.

Real environment tested:
Ubuntu 24.04 under WSL2, Node.js 24.15.0, source checkout at
`d15ab96cbf4d26627ee74a91bb3c50070d7bd892`, production credential-slot and
guarded-fetch implementations, and a real ephemeral loopback HTTP server. No
network mocks were used for the redirect lane.

Exact steps or command run after this patch:

1. Prepare one required `Authorization` slot for the ephemeral server's exact
   origin and confirm readiness does not invoke its resolver.
2. Request `/start`; the server returns `302 /finish` and then `200 ok`.
3. Record the header received on both real HTTP requests.
4. Apply the same slot to a denied origin and record the typed failure and
   resolver count.

Evidence after fix:

```text
{"proof":"o2-credential-slot","lane":"readiness","slots":1,"resolverCalls":0}
{"proof":"o2-credential-slot","lane":"redirect","status":200,"body":"ok","resolverCalls":1,"initialCredential":true,"redirectCredential":null,"paths":["/start","/finish"]}
{"proof":"o2-credential-slot","lane":"origin-denied","deniedCode":"origin-denied","resolverCalls":0}
```

Observed result after fix:
Readiness exposed only one non-secret slot record, the resolver ran once for the
permitted initial request, the redirected request carried no credential, and a
denied origin failed before resolver invocation.

What was not tested:
No production secret backend, external provider/plugin consumer, TLS endpoint,
generic model-facing fetch tool, private response cache, or hosted service was
tested. Those surfaces are deliberately absent and the owner decision remains
open.
