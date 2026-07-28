I have a fork-only evidence slice for the narrower owner-controlled option in
this issue, but after rechecking current `main` I do **not** think its generic
core credential-slot layer should be proposed as a fix PR.

Current main already gives an owner plugin the relevant building blocks:

- a `WebFetchProviderPlugin` owns its credential surface and receives the
  resolved runtime credential through the existing web-provider/SecretRef path
  ([contract](https://github.com/openclaw/openclaw/blob/8a2852bdfa2e99622992cc4ae8c266495377a56f/src/plugins/web-provider-types.ts#L128-L152));
- plugins can use the exported guarded-fetch implementation
  ([SDK export](https://github.com/openclaw/openclaw/blob/8a2852bdfa2e99622992cc4ae8c266495377a56f/src/plugin-sdk/ssrf-runtime.ts#L1-L20));
- guarded fetch strips sensitive headers on cross-origin redirects by default,
  and retaining Authorization requires an explicit hostname allowlist
  ([redirect contract](https://github.com/openclaw/openclaw/blob/8a2852bdfa2e99622992cc4ae8c266495377a56f/src/infra/net/fetch-guard.ts#L75-L88),
  [redirect handling](https://github.com/openclaw/openclaw/blob/8a2852bdfa2e99622992cc4ae8c266495377a56f/src/infra/net/fetch-guard.ts#L676-L693)).

The fork evidence establishes a useful security floor: exact scheme/host/port
matching before secret resolution, no model-visible secret input, redacted
failures, bounded resolution, no cache integration, and a real redirect proof
where the initial request receives Authorization and the cross-origin request
does not. It is evidence, not a requested core patch.

My recommendation is therefore:

1. Keep generic `web_fetch` and `image` anonymous.
2. Prototype authenticated retrieval in the credential-owning plugin, with an
   exact-origin allowlist and private/no caching. Lobster can provide the first
   external-plugin proof.
3. Use a dedicated tool or selected web-fetch provider for the first slice.
4. Extract a core seam only if that real plugin consumer proves the existing
   Plugin SDK cannot preserve one of the required invariants.

Maintainer decision requested: is that plugin-first direction acceptable, and
for the first proof would you prefer a dedicated authenticated-retrieval tool
or a `WebFetchProviderPlugin`? I will not open a fix PR while the current
product/security and `no-new-fix-pr` gates remain in place.
