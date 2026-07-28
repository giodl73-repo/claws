# O2 decision note: exact-origin credential slots

## Existing upstream issue

[openclaw/openclaw#104849](https://github.com/openclaw/openclaw/issues/104849)
already describes the motivating authenticated-fetch problem. Do not file a
duplicate issue.

The issue is currently marked `clawsweeper:no-new-fix-pr`,
`clawsweeper:needs-maintainer-review`, `clawsweeper:needs-product-decision`, and
`clawsweeper:needs-security-review`. Its review recommends a narrow
provider/plugin-owned service rather than granting credentials to the generic
model-facing `web_fetch` or image tools.

## Current-main owner decision

Current `main` at `8a2852bdfa2e99622992cc4ae8c266495377a56f`
already exposes the narrower plugin-owned route:

- `WebFetchProviderPlugin` owns credential discovery and receives the resolved
  runtime credential through existing SecretRef preparation.
- `openclaw/plugin-sdk/ssrf-runtime` exports `fetchWithSsrFGuard` to plugins.
- guarded fetch strips sensitive headers on cross-origin redirects by default;
  Authorization retention requires an explicit hostname allowlist.

The fork credential-slot slice is 875 added/changed lines across four core
network files. It remains useful evidence for exact-origin validation,
redaction, bounded resolution, and redirect behavior, but it is no longer the
recommended landing shape.

Recommendation: keep generic `web_fetch` and `image` anonymous. Validate the
first authenticated retrieval path in an owner plugin (Lobster initially),
using a dedicated tool or web-fetch provider that owns its credential and
exact origins. Extract a generic core seam only if that real consumer proves
the existing Plugin SDK insufficient.

## Proposed maintainer-scoping comment

Posted on 2026-07-27:
https://github.com/openclaw/openclaw/issues/104849#issuecomment-5098490057

I have a fork-only evidence slice for the narrower owner-controlled option
recommended in this issue. It does not add credentials to `web_fetch`, image
tools, configuration, caches, model-visible inputs, or the Plugin SDK, and it
is not proposed as a core PR.

The slice prepares an exact-origin header slot and resolver together, validates
all references before resolving a value, applies the credential only to the
initial guarded-fetch hop, and removes the slot reference before every
redirect. Readiness returns non-secret metadata without invoking the resolver.

Current main appears to support a plugin-first experiment without a new core
credential contract. Before proposing any fix PR, I need maintainer direction
on two points:

1. Should the first proof be a dedicated plugin tool or a selected
   `WebFetchProviderPlugin`?
2. Is a Lobster-owned exact-origin prototype the right evidence consumer before
   considering any generic core extraction?

The fork proof chooses the most restrictive posture: no generic tool access, no
cache integration, and initial-hop-only placement. I will not open a core fix
PR while the issue's product and security gate remains unresolved.

## Evidence available for that decision

- Current-main fork branch:
  `user/giodl/o2-exact-origin-credential-slots-current-main` at
  `d15ab96cbf4d26627ee74a91bb3c50070d7bd892`
- Exact origin and caller-header conflicts fail before resolver invocation.
- Resolver timeout and caller cancellation remain bounded by guarded fetch.
- Invalid or expired values produce typed redacted failures.
- A real loopback redirect proof shows the credential on `/start` and absent
  from `/finish`.
