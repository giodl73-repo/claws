<!-- claws-lobster-architect:initial -->

## Architect Review — PR #634 @ `7e6e0d541`

## Sources of truth (R0)

**PR claim digest**: 4 claims (C1 Lobster runtime exposes `/auth/callback` as OAuth callback bouncer; C2 runtime supports MSAL env vars (`LOBSTER_MSAL_CLIENT_ID`/`LOBSTER_MSAL_AUTHORITY`) and substitutes placeholders in `index.html`; C3 `/auth/callback` handler serves a CSP-protected HTML bouncer preserving query+fragment; C4 web UI adds `SignInWidget` to display MSAL account).

**Specs read**: `docs/authentication-redirect-uris.md` §"Redirect-URI path"; inline doc comments in `src/lobster_runtime/src/routes/web.rs:1-17`; inline doc comments in `src/lobster_runtime/src/config.rs:2-12`.

**Spec gaps**: none.

**Drift hypotheses**: 
- C3 vs tests (no test asserts CSP header).
- C2 vs integration tests (no integration test for MSAL-on placeholder path).
- `warn_if_msal_template_missing` vs tests (no test asserts warning).

## Findings

### F1 — [Major | drift:code-tests] — Status: open  
**Recommendation**: fix-before-merge.  
**Invariant**: Code doc comments declare:
- `/auth/callback` must include the CSP header (`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`) per `src/lobster_runtime/src/routes/web.rs:133-138`.  
- `build_router(Some(MsalConfig))` must substitute `__LOBSTER_MSAL_CLIENT_ID__`/`__LOBSTER_MSAL_CLIENT_ID__` in `index.html`.  
- `warn_if_msal_template_missing` must emit a warning when MSAL is configured but placeholders are missing per `src/lobster_runtime/src/routes/web.rs:170-179`.  
**Where**: `src/lobster_runtime/src/routes/web.rs:133-138`; `src/lobster_runtime/tests/integration_test.rs` (MSAL-off only); `src/lobster_runtime/src/routes/web.rs:170-179`.  
**Counter-search**: searched test files for `Content-Security-Policy`/`csp`, for `MsalConfig` in integration tests, and for `warn_if_msal_template_missing` — no assertions found.  
**Suggested fix**: 
- Add assertion of the CSP header in `auth_callback_returns_html_bouncer`.  
- Add an integration test that passes `Some(MsalConfig)` to `build_router` and verifies placeholder substitution.  
- Add a test (e.g. via `tracing_subscriber`) to verify `warn_if_msal_template_missing` emits the expected warning.

## Leading questions (non-blocking)

### LQ1 — [LQ | drift:spec-code] — Status: open  
The local-dev section in `docs/authentication-redirect-uris.md` instructs registering `http://localhost:8443/auth/callback`, but `dev-start.sh` logs `https://localhost:8443/auth/callback` (src/lobster_runtime/dev-start.sh:85). Confirm the intended URI scheme for local-dev MSAL redirects.

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.