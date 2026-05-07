The instructions say "Output the verdict comment body only" — no posting needed. Outputting the verdict directly:

<!-- claws-lobster-architect:initial -->

## Architect Review — PR #634 @ `7e6e0d541`

## Sources of truth (R0)

**PR claim digest**: 5 claims (C1 wires lobster_web MSAL plumbing into a working sign-in flow; C2 runtime substitutes `__LOBSTER_MSAL_*__` placeholders into `index.html` at request time from env vars; C3 `/auth/callback` serves an HTML bouncer that runs `window.location.replace('/web/' + search + hash)` so MSAL `handleRedirectPromise()` consumes the fragment; C4 TopNav gains `<SignInWidget/>`; C5 wired via `CustomizedTokens` per ClusterCategory in `ApplicationParameters.json`).
**Specs read**: `docs/authentication-redirect-uris.md` §"Redirect-URI path" (updated in this PR — contract-class for the AAD app-reg list); `src/lobster_web/src/services/msalAuth.ts:106` (inline contract — `redirectUri` default-fallback expression); `src/lobster_web/src/services/runtimeConfig.ts:21-26` (`LobsterMsalConfig` shape); `src/lobster_web/index.html:99-115` (pre-bundle MSAL config stash); `src/lobster_runtime/src/routes/mod.rs:23-44` (route-dispatch trade-off comment).
**Spec gaps**: no `CLAUDE.md` in any ancestor of `src/lobster_runtime/` or `src/lobster_web/` — fell back to inline `///` doc comments + the doc updated in this PR. No top-level contract spec pins the bundle↔server redirect-URI agreement; the doc-list and the bouncer route are the de-facto contract.
**Drift hypotheses**: (1) C1 vs `msalAuth.ts:106` — bundle defaults `redirectUri` to `window.location.origin`; doc-list and bouncer route assume `/auth/callback`. (2) CSP header set on `/auth/callback` response but no test asserts it.

## Findings

### F1 — [Major | block | drift:code-code] — Status: open
**Watches invoked**: W6, W9, W10.
**Recommendation**: block — sign-in cannot complete against the redirect-URI list this PR documents.
**Invariant**: bundle MSAL `auth.redirectUri` must match the AAD app-registration redirect-URI list exactly (W6 surface — "MSAL `auth.redirectUri` configuration ... bundle vs doc-list drift is a W6 finding"). The doc updated in this PR (`docs/authentication-redirect-uris.md`) registers `/auth/callback` as the canonical redirect URI per environment; the runtime registers a `/auth/callback` bouncer to receive the AAD response. The bundle never sets `redirectUri` to that path.
**Where**:
- `src/lobster_web/src/services/msalAuth.ts:106` — `redirectUri: config.redirectUri ?? (typeof window !== 'undefined' ? window.location.origin : '')`. `config.redirectUri` is `MsalAuthConfig.redirectUri` (optional); never populated at call sites.
- `src/lobster_web/src/index.tsx:60-65` — `initMsalAuth(msalConfig, ...)` is called with `msalConfig = readRuntimeConfig().msal` typed as `LobsterMsalConfig`.
- `src/lobster_web/src/services/runtimeConfig.ts:21-26` — `LobsterMsalConfig` carries only `clientId`, `authority`, optional `scopes`, optional `loginMethod`. No `redirectUri` field; the runtime-config path cannot inject the path even if the deploy template wanted to.
- `src/lobster_web/index.html:106-115` — pre-bundle stash sets `cfg.msal = { clientId, authority }`. No `redirectUri`.
- `docs/authentication-redirect-uris.md:22` (post-merge) — "`/auth/callback` — confirmed." The PR body's `Out of scope` block names "Submit `/auth/callback` redirect URIs to AAD-FirstPartyApps" as a follow-up, so the AAD-side list will be exactly `/auth/callback`.
- `src/lobster_runtime/src/routes/mod.rs:51` — `route("/auth/callback", get(web::auth_callback))` registers the bouncer, whose sole purpose is fragment carry-over from AAD's redirect to `/web/`.

**Counter-search**:
- `gh search/code 'redirectUri repo:bic/lobster'` — only hit is `src/lobster_web/src/services/msalAuth.ts`. No override site.
- `gh search/code 'auth/callback repo:bic/lobster'` — only hits are `docs/authentication-redirect-uris.md` and `src/lobster_runtime/src/routes/{mod.rs,web.rs}`. Zero references in `src/lobster_web/`. The bundle has no knowledge of the path.
- Considered: maybe the AAD app reg currently has `https://lobster.<host>/` registered too, so `loginRedirect()` succeeds and lands at `/`. That still bypasses the `/auth/callback` bouncer entirely (its sole purpose — fragment carry-over to `/web/` — never executes), and the AAD response fragment lands at `/` which serves `health::root`, not the bundle. The bundle's `handleRedirectPromise()` runs only when the bundle loads, and the bundle loads only at `/web/`. Either branch: feature broken.
- The PR body's smoke-test (`docker run -e LOBSTER_MSAL_CLIENT_ID=...`) verifies only `GET /web/`, `GET /auth/callback`, `GET /web/static/...` — server-side endpoint checks. No interactive sign-in roundtrip is documented.
- Loop hazard noted in `drift.md`: this shape is the W6 dogfood example. Re-derived from the actual diff at SHA `7e6e0d541`; not copied verbatim.

**Suggested fix**: bot does not pick which side. Two options:
- Option A — wire the bundle to use `/auth/callback`. Either widen `LobsterMsalConfig` with a `redirectUri` field and stash it via `cfg.msal = { clientId, authority, redirectUri: '/auth/callback' }` in `index.html`, or change the default in `msalAuth.ts:106` from `window.location.origin` to `'/auth/callback'` (path is invariant across environments). Add a unit test pinning the constructed `PublicClientApplication` carries `auth.redirectUri === '/auth/callback'` so a future regression fails the build instead of silently producing `AADSTS50011`.
- Option B — retract `/auth/callback` from the doc-list and remove the runtime route; document `redirectUri = window.location.origin` and have AAD redirect there directly. This forfeits the doc's stated rationale ("AAD app registration's redirect-URI list maps cleanly to one canonical URL per environment, independent of where the SPA's hash router happens to point").
- Pick A (preserves the bouncer pattern and the doc) or B (simplifies). The bot does not pick.

### F2 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W6 (security-control test fidelity).
**Recommendation**: fix-or-acknowledge — extend the existing test, or accept a tracking issue with acceptance criteria.
**Invariant**: the `/auth/callback` response sets `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'` as a hardening control on a credential-handling endpoint (added per security review per author note 2026-05-06T22:16:22Z). The control is not pinned by any test; a future refactor could remove the header without test failure.
**Where**: `src/lobster_runtime/src/routes/web.rs:130-133` sets the header tuple; `src/lobster_runtime/src/routes/mod.rs::auth_callback_returns_html_bouncer` asserts only the body's redirect script — does not read `resp.headers()`.
**Counter-search**: searched the test in `routes/mod.rs` and `tests/integration_test.rs` for `CONTENT_SECURITY_POLICY` / `content-security` / `csp` — none present. The CSP header is unique to this code path; no other test covers it indirectly.
**Suggested fix**: extend `auth_callback_returns_html_bouncer` with `assert_eq!(resp.headers().get(header::CONTENT_SECURITY_POLICY).map(|v| v.to_str().unwrap()), Some("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"));`. Inline the expected CSP string in the test so any header change forces a deliberate update.

## Leading questions (non-blocking)

### LQ1 — [LQ | drift:pr-code] — Status: open
The PR body's `Test plan` lists docker smoke-tests for `GET /web/`, `GET /auth/callback`, `GET /web/static/...` — server-side endpoint checks. None exercise the actual sign-in roundtrip (click Sign in → AAD authorize → bouncer → back to `/web/` → `handleRedirectPromise()` consumes fragment). Did you run an interactive sign-in against any AAD app reg (test or local)? If yes, given F1 it should have produced `AADSTS50011: redirect_uri mismatch` (or a redirect to `/` that bypasses the bundle); please share the trace. If no, F1 explains why neither peer-review nor the prior approvers caught this — the verification was server-side-only. Cited at PR body §"Test plan".

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.