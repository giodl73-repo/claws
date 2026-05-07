<!-- claws-lobster-architect:initial -->

## Architect Review — PR #634 @ `7e6e0d54`

## Sources of truth (R0)

**PR claim digest**: 7 claims (C1 add `/auth/callback` OAuth bouncer; C2 request-time MSAL clientId/authority substitution into `index.html` when env set; C3 MSAL off-by-default with placeholder pass-through; C4 reject HTML-special chars in MSAL env to prevent injection; C5 EV2 `ApplicationParameters.json`/`values.yaml` wire per-environment tokens into runtime env; C6 TopNav `SignInWidget` shows signed-in identity, no duplicate pre-sign-in CTA; C7 docs update to confirm `/auth/callback` and local-dev instructions).
**Specs read**: `docs/authentication-redirect-uris.md` §"Redirect-URI path"; `src/lobster_runtime/src/config.rs` doc comments on `MsalConfig` and env parsing; `src/lobster_runtime/src/routes/web.rs` module docs and `auth_callback`/`serve_index` docs; `src/lobster_runtime.ev2packaging/Deployment/chart/values.yaml` env var comments; `src/lobster_runtime/dev-start.sh` banner/instructions.
**Spec gaps**: no CLAUDE.md covering web auth/redirect behavior in `src/lobster_runtime/`; no visible inline contract in `src/lobster_web/src/services/msalAuth.ts` in this diff for `redirectUri` (see LQ1).
**Drift hypotheses**: H1 spec vs web init — does `msalAuth.ts` set `redirectUri` to `/auth/callback` to match the bouncer/docs? H2 tests vs code — `/auth/callback` CSP header not pinned by a test. H3 browser-flow e2e — no automated test for fragment preservation across the bouncer redirect. H4 integration breadth — router-level tests don't cover MSAL-on path end-to-end.

## Findings

### F1 — [Major | drift:code-tests] — Status: open
**Recommendation**: fix-before-merge or acknowledge with a follow-up issue that pins the header in tests.
**Invariant**: `/auth/callback` serves a minimal HTML bouncer with a restrictive CSP header; this CSP is a security control that must not regress silently.
**Where**: `src/lobster_runtime/src/routes/web.rs:~130` (`pub async fn auth_callback()` sets `Content-Security-Policy`); `src/lobster_runtime/src/routes/mod.rs:~210-226` (`auth_callback_returns_html_bouncer` only checks body text, not headers).
**Counter-search**: searched this PR diff for test assertions on `Content-Security-Policy` or `header::CONTENT_SECURITY_POLICY` — none found. The only `/auth/callback` test (`auth_callback_returns_html_bouncer`) validates body contents, not response headers.
**Suggested fix**: extend `auth_callback_returns_html_bouncer` to assert the CSP header is present and equals `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`. This pins the defense-in-depth control against future refactors.

## Leading questions (non-blocking)

### LQ1 — [LQ | drift:spec-code] — Status: open
Docs and runtime now anchor the redirect URI at `/auth/callback`. Where in `src/lobster_web/src/services/msalAuth.ts` (or equivalent) is `redirectUri` set to `/auth/callback` to match? Counter-search in this diff shows `/auth/callback` added in runtime/docs only; no TS changes surfaced. If the pattern relies on the bouncer only, please point to the code/config that ensures MSAL uses `/auth/callback` as the registered redirect (or call-site override).

### LQ2 — [LQ | drift:code-tests] — Status: open
Do we plan a browser e2e (Playwright or similar) that navigates to `/auth/callback#code=mock&state=mock` and asserts the location becomes `/web/#code=mock&state=mock`? The current oneshot tests validate the HTML but don't exercise fragment preservation in a JS-executing browser.

### LQ3 — [LQ | drift:code-tests] — Status: open
`warn_if_msal_template_missing` emits a `tracing::warn!` when MSAL is configured but `index.html` is missing or lacks placeholders. Any appetite to add a small test that verifies the warn path vs quiet path (e.g., with a test writer subscriber)?

### LQ4 — [LQ | spec] — Status: open
No CLAUDE.md section exists for web auth/redirect in `src/lobster_runtime/`. Consider capturing the high-level contract (bouncer behavior, substitution rules, MSAL-off default) in a short CLAUDE.md section to ground future reviews.

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.