<!-- claws-lobster-architect:initial -->

## Architect Review — PR #634 @ `7e6e0d54`

## Sources of truth (R0)

**PR claim digest**: 6 claims (C1: Adds MSAL auth-redirect support for /web via /auth/callback bouncer, C2: Runtime substitutes MSAL client ID/authority into index.html at request time, C3: MSAL is opt-in via env var, C4: HTML injection prevented by config validation, C5: Test coverage for all new logic, C6: Docs and deployment config updated in lockstep).
**Specs read**:
- `docs/authentication-redirect-uris.md` §"/auth/callback redirect-URI path, AAD registration, and runtime wiring"
- `src/lobster_runtime/src/config.rs` docstrings and inline comments
- `src/lobster_runtime/src/routes/web.rs` module-level contract comments
- `src/lobster_web/index.html` (referenced in code and doc)
- `src/lobster_runtime.ev2packaging/ApplicationParameters/ApplicationParameters.json` (CustomizedTokens, MSAL config)
- `src/lobster_runtime.ev2packaging/Deployment/chart/values.yaml` (env var wiring)
**Spec gaps**: none — all touched surfaces have explicit contract or design doc coverage.
**Drift hypotheses**:
- C1 vs code/tests: Is /auth/callback bouncer and redirect flow covered by an E2E test? (unit test only)
- C2 vs code/tests: Is runtime substitution of MSAL config in index.html tested at integration level?
- C5 vs code/tests: Are all new code paths (SignInWidget, CSP header, warn_if_msal_template_missing) covered by tests?
- C6 vs code: Do docs and deployment config match the implemented redirect-URI and env var names?

## Findings

### F1 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W2, W10.
**Recommendation**: fix-before-merge — add test or tracking issue.
**Invariant**: `/auth/callback` bouncer must be covered by an E2E test that exercises the full browser redirect round-trip (AAD → /auth/callback → /web/ with fragment preserved).
**Where**: `src/lobster_runtime/src/routes/web.rs:130-160`, `src/lobster_web/index.html:77-95`.
**Counter-search**: Searched for Playwright, Cypress, or browser-based E2E test exercising `/auth/callback` → `/web/` with fragment. Only unit test `auth_callback_returns_html_bouncer` found; it asserts HTML string, not browser navigation. No test executes JS or verifies fragment preservation.
**Suggested fix**: Add a browser-based E2E test (Playwright or similar) that navigates to `/auth/callback#code=mock&state=mock` and asserts the browser lands on `/web/` with the fragment intact. If not feasible in this PR, file a tracking issue and acknowledge in-thread.

### F2 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W2, W10.
**Recommendation**: fix-before-merge — add test or tracking issue.
**Invariant**: `SignInWidget` component must have test coverage for all states (hidden, sign-in, signed-in).
**Where**: `src/lobster_web/src/App.tsx:192-261`.
**Counter-search**: Searched for vitest, jest, or testing-library tests for `SignInWidget`. None found. No test mocks `_getMsalInstance()` or asserts on widget rendering.
**Suggested fix**: Add component-level tests for `SignInWidget` covering all three states. If not feasible in this PR, file a tracking issue and acknowledge in-thread.

### F3 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W2, W10.
**Recommendation**: fix-before-merge — add test or tracking issue.
**Invariant**: `/auth/callback` must emit the restrictive CSP header (`Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`) and this must be asserted by a test.
**Where**: `src/lobster_runtime/src/routes/web.rs:133`.
**Counter-search**: Searched for test asserting on response headers for `/auth/callback`. `auth_callback_returns_html_bouncer` only asserts HTML body, not headers.
**Suggested fix**: Extend `auth_callback_returns_html_bouncer` to assert the CSP header is present and correct. If not feasible in this PR, file a tracking issue and acknowledge in-thread.

### F4 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W2, W10.
**Recommendation**: fix-before-merge — add test or tracking issue.
**Invariant**: Assumption that browsers preserve URL fragments across `window.location.replace()` must be validated by an automated test.
**Where**: `src/lobster_runtime/src/routes/web.rs:143-155`.
**Counter-search**: Searched for browser-based test validating fragment preservation. Only manual Docker smoke test mentioned in PR/peer review; no automated test found.
**Suggested fix**: Same as F1 — a browser-based E2E test would validate this. If not feasible in this PR, file a tracking issue and acknowledge in-thread.

### F5 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W2, W10.
**Recommendation**: fix-before-merge — add test or tracking issue.
**Invariant**: Integration test must exercise `build_router` with `Some(MsalConfig)` and verify placeholder substitution in the response.
**Where**: `src/lobster_runtime/tests/integration_test.rs`.
**Counter-search**: Searched for integration test constructing router with MSAL config. All tests use `None` for MSAL. Unit tests in `routes/mod.rs` cover substitution logic, but integration layer only exercises MSAL-off path.
**Suggested fix**: Add an integration test variant that passes a `Some(MsalConfig)` to `build_router` and verifies placeholder substitution. If not feasible in this PR, file a tracking issue and acknowledge in-thread.

### F6 — [Major | drift:code-tests] — Status: open
**Watches invoked**: W2, W10.
**Recommendation**: fix-before-merge — add test or tracking issue.
**Invariant**: `warn_if_msal_template_missing` diagnostic must be covered by a test that asserts the warning is (or is not) emitted.
**Where**: `src/lobster_runtime/src/routes/web.rs:167-190`.
**Counter-search**: Searched for test using `tracing_subscriber` or similar to capture and assert on warning emission. None found.
**Suggested fix**: Add a test that verifies the warning is emitted when MSAL is configured but `index.html` is missing or lacks the placeholder. If not feasible in this PR, file a tracking issue and acknowledge in-thread.

## Leading questions (non-blocking)

### LQ1 — [LQ | drift:code-code] — Status: open
The `SignInWidget` polling approach (250ms interval for 5s) is pragmatic for catching post-redirect account appearance. Is there a reason not to use MSAL's event callback API (`addEventCallback`) directly? (Peer review notes this as a possible follow-up.)

### LQ2 — [LQ | code] — Status: open
The `reject_html_chars` validator blocks `<`, `>`, `"`, and `'`, but not backslash or backtick. Is there a reason not to block these as well, or to switch to positive validation (UUID for client_id, URL for authority)?

### LQ3 — [LQ | code] — Status: open
The `serve_static_asset` function constructs a new `ServeDir` per request. Is there a reason not to cache the `ServeDir` instance in `WebState` for high-traffic deployments?

### LQ4 — [LQ | drift:spec-code] — Status: open
The Preprod ClusterCategory in `ApplicationParameters.json` still uses `AzureSubscriptionId: "00000000-0000-0000-0000-000000000000"` (placeholder). Is this intentional, and is there a tracking issue for the follow-up provisioning?

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.
