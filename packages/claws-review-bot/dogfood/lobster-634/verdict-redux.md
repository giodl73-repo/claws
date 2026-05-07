<!-- claws-lobster-architect:initial -->

## Architect Review — PR #634 @ `7e6e0d54`

**Verdict**: hold. 1 Major-block (`drift:code-code`, W6 + W10) on the bundle ↔ bouncer wiring; the rest is yieldable. 5 findings total — 0 code, 0 spec-only, 5 drift (1 drift:code-code, 1 drift:spec-code, 1 drift:spec-code|pre-existing, 1 drift:pr-code, 1 drift:spec-spec) + 1 drift:code-tests projection of F1.

---

## Sources of truth (R0)

**PR claim digest** (5 material claims):
- C1: AAD redirects to `/auth/callback`; runtime serves a bouncer that hands the URL fragment to `/web/`.
- C2: `lobster_web` bundle's MSAL `handleRedirectPromise()` consumes the fragment after the bounce.
- C3: Per-environment app reg via `CustomizedTokens` → env vars → request-time substitution into `index.html`.
- C4: TopNav gains a `<SignInWidget/>` showing "Sign in" pre-auth, account display name post-auth.
- C5: Unset env = placeholders survive = bundle's IIFE skips MSAL init (local-dev default).

**Specs read**:
- `CLAUDE.md` (root) — orientation only; no auth contract.
- `docs/authentication-redirect-uris.md` — heavily edited by this PR; lists 65 prod + 7 test + 1 localhost redirect URIs all on `/auth/callback`. Contract-class for the AAD-FirstPartyApps producer side.
- `src/lobster_web/src/services/msalAuth.ts` — unchanged; module-doc declares itself the SINGLE source of truth for MSAL init. `auth.redirectUri = config.redirectUri ?? window.location.origin` at L106.
- `src/lobster_web/src/services/runtimeConfig.ts` — unchanged; `LobsterMsalConfig = { clientId, authority, scopes?, loginMethod? }`. No `redirectUri` field.
- `src/lobster_web/index.html` — unchanged; pre-bundle IIFE writes `{ clientId, authority }` on `__LOBSTER_RUNTIME_CONFIG__.msal`. No `redirectUri` stash.
- Issue `bic/lobster#298` — original design doc cited from `msalAuth.ts:16`.

**Spec gaps**: no `src/lobster_runtime/CLAUDE.md`, no `src/lobster_web/CLAUDE.md`, no `docs/design/auth-redirect.md`. The redirect-URI doc + `msalAuth.ts` module-doc carry the contract weight together. Noted as LQ-spec1.

**Drift hypotheses**:
- H1 (`drift:code-code`): new Rust bouncer + 73-entry redirect-URI list assume `redirectUri = '/auth/callback'`; existing TS bundle defaults `redirectUri = window.location.origin` and never overrides. Two production code surfaces in this PR's design disagree about the redirect URI. → F1.
- H2 (`drift:spec-code`): `authentication-redirect-uris.md` (contract-class doc) lists `/auth/callback`; bundle code does not honor it. → folded into F1 as a sibling spec-code drift; the primary drift is code-code.
- H3 (`drift:pr-code`): PR body's TopNav SignInWidget description vs `7e6e0d54` (post-refactor SignInWidget has no "Sign in" button). → F3.
- H4 (`drift:code-tests`): no test pins `redirectUri` ↔ `/auth/callback` wire-up. → F2.
- H5 (`drift:spec-code | pre-existing`): `_getMsalInstance` JSDoc says "tests only" but PR adds first production consumer. → F4.
- H6 (`drift:spec-spec`): `dev-start.sh` says `https://localhost:8443/auth/callback`; redirect-URI doc says `http://localhost:8443/auth/callback`. → F5.

All six survived R2/R4/R5.

---

## Findings

### F1 — [Major | block | drift:code-code] — Status: open
**Recommendation**: block — must fix before merge.
**Invariant**: MSAL `auth.redirectUri` (the URL `loginRedirect` sends to AAD as `redirect_uri=`) MUST equal an entry in the AAD app registration's redirect-URI list AND must equal the URL that actually receives the fragment-bearing redirect. This PR provisions `/auth/callback` on both the runtime side and the AAD-FirstPartyApps producer doc, but the bundle's MSAL init constructs `redirectUri = config.redirectUri ?? window.location.origin`, and `LobsterMsalConfig` has no `redirectUri` field for the runtime to populate. Per `watches.md` W6 lobster-side surface: "MSAL `auth.redirectUri` configuration (must match the AAD app-registration redirect-URI list exactly — bundle vs doc-list drift is a W6 finding)." Per W10: `docs/authentication-redirect-uris.md` is contract-class for AAD-FirstPartyApps consumption.
**Where**:
- New bouncer: `src/lobster_runtime/src/routes/web.rs:130-160` (`auth_callback`); registered at `src/lobster_runtime/src/routes/mod.rs:51`.
- Redirect-URI doc (73 entries, all on `/auth/callback`): `docs/authentication-redirect-uris.md:9-23, 32-194` (post-diff).
- Bundle MSAL init: `src/lobster_web/src/services/msalAuth.ts:106` — `redirectUri: config.redirectUri ?? window.location.origin`.
- Runtime-config shape: `src/lobster_web/src/services/runtimeConfig.ts:11-16` — `LobsterMsalConfig` has no `redirectUri`.
- Pre-bundle stash: `src/lobster_web/index.html` MSAL IIFE writes `{ clientId, authority }` only.
- `createSignIn`: `src/lobster_web/src/services/msalAuth.ts:172-198` — `loginRedirect({ scopes, state })`; no per-call redirect-URI override.

**Counter-search**: `redirectUri` grep across the repo returns one file (`msalAuth.ts`); `"/auth/callback"` returns one file (`docs/authentication-redirect-uris.md`). Nothing wires the two together. PR body re-asserts the bouncer is the active mechanism — but this is the *premise* of the drift (two production code surfaces disagree about which URI is in use), not evidence of resolution. Galin-Iliev/dspektor approvals do not include the bundle wire-up; they re-anchored on the runtime side. harryf peer-review at `2026-05-07T18:42:09Z` flagged "e2e-redirect-roundtrip" implicitly via the SignInWidget unit-test follow-up but did not reach the redirect-URI mismatch directly.

**Suggested fix** (bot does not pick a side per `drift.md`):
- a) Wire `redirectUri = ${origin}/auth/callback` through the bundle: extend `LobsterMsalConfig` with `redirectUri?`, set it from the index.html IIFE (or compute it as `${window.location.origin}/auth/callback` in the bundle's `initMsalAuth` consumer), and pin via a unit test in `msalAuth.unit.test.ts` that the constructed `MsalConfiguration.auth.redirectUri` ends with `/auth/callback`. OR
- b) Drop the bouncer route + the 73-entry doc list and revert to the bare-origin redirect-URI shape from issue #298 — which then requires the bare origin (`/`) to do something useful (currently `health::root`, which is JSON; the bundle's hash router is at `/web/`).

The author chooses; the other side aligns. Note that `harryf` peer-review (`2026-05-07T18:42:09Z`) approves Security/Style/Git/Architecture/Testing/Docs — none of those check the cross-language wire-up. Two human approvals (Galin-Iliev, dspektor) approved on the runtime-side surface; neither approval evidences the bundle ↔ AAD wire-up actually working end-to-end.

---

### F2 — [Major | drift:code-tests] — Status: open
**Recommendation**: fix-or-acknowledge — Strong-tier.
**Invariant**: tests on a security-sensitive redirect path must pin the contract the production code claims, not just one side of it. The bouncer test asserts the bouncer's HTML shape (`window.location.replace('/web/'`); the redirect-URI test must also assert the constructed MSAL `redirectUri` matches what AAD will be told.
**Where**:
- Bouncer integration tests: `src/lobster_runtime/src/routes/mod.rs:1014-1107`.
- Bundle MSAL init (no redirect-URI test): `src/lobster_web/src/services/msalAuth.ts:99-112`; `src/lobster_web/tests/services/msalAuth.unit.test.ts` (existing) does not assert the redirect URI matches the AAD app-reg allowlist.

**Counter-search**: no test in this PR or surrounding repo searches for `/auth/callback` AND `redirectUri` in the same fixture. The bouncer assertion `html.contains("window.location.replace('/web/'")` would still pass even if MSAL never sends AAD to the bouncer (F1's branch 2). harryf peer-review's "SignInWidget unit tests are acknowledged as a follow-up" call-out covers a different surface.

**Suggested fix**: a unit test in `msalAuth.unit.test.ts` that calls `initMsalAuth(...)` and asserts the resulting `MsalConfiguration.auth.redirectUri` equals the documented bouncer URL when the runtime config requests it; OR a tracking issue with acceptance criteria pinning the bundle ↔ bouncer wire-up. Adding a Playwright e2e (per peer-review suggestion) would also catch F1, but at integration-test cost; a unit-level redirect-URI assertion is cheaper and pins the same contract.

---

### F3 — [Major | drift:pr-code] — Status: open
**Recommendation**: fix-or-acknowledge — Strong-tier (W9 non-material).
**Invariant**: per W9, the PR body becomes a changelog entry and audit trail; non-material claims (UI behavior description) yield on body update, but misrepresentation poisons downstream readers.
**Where**:
- PR body: "TopNav gains a `<SignInWidget/>` that shows 'Sign in' when MSAL is wired but no account is present; switches to the account display name after `handleRedirectPromise` resolves."
- Code at HEAD: `src/lobster_web/src/App.tsx:213-216` — `if (account === null) { return null; }`. No "Sign in" button rendered.
- Author reply on inline thread `App.tsx:168` (`128923901`): refactor in `7e6e0d54` "removed the pre-sign-in 'Sign in' button entirely, deferring to the existing CapabilityBanner and Landing page."

**Counter-search**: PR body unchanged since `393c04f3` per the PR REST resource. Author acknowledged the refactor in inline reply but did not refresh the body. Test-count claim ("8 new ones") also drifts from the actual count (11 added: 6 config + 5 routes); folding into this finding rather than raising separately — both fixes are a single body edit.

**Suggested fix**: rewrite the PR body's TopNav/test-count paragraphs to match HEAD. Suggested wording: *"TopNav gains a `<SignInWidget/>` that displays the signed-in user's name; pre-sign-in CTA is handled by the existing CapabilityBanner / landing-page button. 11 new tests across config parsing (6) and route integration (5)."*

---

### F4 — [Major | drift:spec-code | pre-existing] — Status: open
**Recommendation**: fix-or-acknowledge — Strong-with-modifier per `watches.md` "Pre-existing drift" branch. Yields on follow-up issue + author acknowledgment that this PR isn't the right place to fully fix; does not silently disappear.
**Invariant**: JSDoc `@internal` annotation is a contract on consumer-side use ("test-only consumers"); this PR introduces the first production consumer and thus is the moment the existing prose becomes legibly stale. Per `voice.md`: "Pre-existing tech debt in touched files — out of scope unless this PR introduces or worsens it." This PR worsens it (first production consumer).
**Where**:
- Spec (JSDoc on a singleton-getter, predates this PR): `src/lobster_web/src/services/msalAuth.ts:249` — `/** @internal Get MSAL instance (tests only). */`.
- Code (new in this PR): `src/lobster_web/src/App.tsx:46` imports `_getMsalInstance`; called from `SignInWidget` state initializer (`App.tsx:191`) and the polling effect (`App.tsx:198`).

**Counter-search**: no other production consumer of `_getMsalInstance` was found at HEAD. This is the first one. The drift is between the JSDoc (older) and the new production import — pre-existing prose, surfaced by the PR.

**Suggested fix**: either (a) expose a public `getActiveAccountSnapshot(): MsalAccountInfo | null` (or an event-callback subscription) on `msalAuth.ts` and switch `SignInWidget` to it, keeping the `@internal` boundary; OR (b) update the JSDoc on `_getMsalInstance` to drop "tests only" and document the production use site. Per the pre-existing modifier, fix-in-this-PR is not required if a follow-up issue is filed with acceptance criteria.

---

### F5 — [Minor | drift:spec-spec] — Status: open
**Recommendation**: fix-or-acknowledge — Soft-tier.
**Invariant**: two specs in this PR's diff disagree on the localhost-callback scheme; the AAD-FirstPartyApps producer doc (the contract surface) and the dev-onboarding doc must agree, and whichever is correct should cite the AAD policy that allows it.
**Where**:
- `src/lobster_runtime/dev-start.sh:81-95` (post-diff) — comment says "The TEST-Lobster app registration must have `https://localhost:8443/auth/callback` in its redirect-URI list".
- `docs/authentication-redirect-uris.md:200-208` (post-diff) — local-dev URI is `http://localhost:8443/auth/callback` (note: `http`), with explicit prose: "`http://` (not `https://`) is allowed by AAD only for `localhost`".

**Counter-search**: doc explicitly addresses the issue ("the local dev server uses self-signed TLS but AAD treats the redirect as exempt from TLS-only enforcement when the host is localhost"), implying AAD will accept both — but the doc still picks `http://`. dev-start.sh binds TLS at 8443 with self-signed cert, so the browser actually sends `https://localhost:8443/auth/callback`. Neither doc cites authoritative AAD policy. The author is the same on both files; this is a reconciliation, not a cross-team coordination.

**Suggested fix**: pick one scheme, set both files to it, and add a one-line citation to the AAD localhost-redirect policy. If `http://` is correct (matches the doc), update dev-start.sh to say `http://`; if `https://` is correct (matches what the browser actually sends), update the doc.

---

## Leading questions (non-blocking)

### LQ1 — [LQ | spec] — Status: open
No `CLAUDE.md` was located under `src/lobster_runtime/` or `src/lobster_web/`, and no `docs/design/auth-redirect.md` exists. For a feature that wires MSAL across Rust + TypeScript with a custom bouncer and a 73-entry redirect-URI doc, future PRs in this area lack a single load-bearing spec to ground reviews against. Consider a short `docs/design/auth-redirect.md` that names the bundle ↔ bouncer ↔ AAD contract end-to-end, or a `CLAUDE.md` under each package. This LQ is informational; not blocking.

---

## Watches not triggered

- **W1 (silent contract break)**: no aether-side or SSE wire-format change.
- **W2 (test coverage reduction)**: 11 tests added; none removed/disabled.
- **W3 (feature-flag removal)**: the env-var-unset kill switch is the *new* opt-in default; no existing flag removed.
- **W4 (rollback)**: rollback is trivial — unset `LOBSTER_MSAL_CLIENT_ID`, redeploy; placeholders survive and bundle skips MSAL init. PASS.
- **W5 (paired-PR cross-repo coordination)**: AAD-FirstPartyApps registration is acknowledged out-of-scope follow-up. Strict W5 reads on lobster ↔ aether / lobster ↔ openclaw. The AAD-FirstPartyApps repo isn't one of those. F1 makes the merge-order question moot anyway: the integration is broken regardless of the AAD PR's merge order.
- **W6 (credential / redirect-handling regressions)**: F1 invokes W6 explicitly per the lobster-side surface added to `watches.md`. No additional W6 finding — bouncer construction does not introduce token-leak or open-redirect surface (`window.location.replace('/web/' + search + hash)` is same-origin via relative path; no Authorization header forwarded; CSP `default-src 'none'` plus single inline script with no DOM-injection surface is appropriately restrictive).
- **W7 (import-time env assertion)**: `warn_if_msal_template_missing` runs from `build_router` (startup), not at module-import time, and is a `warn!`, not a `raise`. PASS.
- **W8 (public-fork boundary leak)**: PR is lobster-internal; nothing destined for `openclaw/openclaw`.
- **W11 (non-contract spec drift)**: F4 covers the `@internal` JSDoc drift; no other prose-class drift surfaces.

---

## What the bot is NOT raising (and why)

- Per-request disk read of `index.html` in `serve_index` (`web.rs:30-49`): perf observation, not a regression. `harryf` peer-review covers this lane (see `2026-05-07T18:42:09Z` peer-review comment, "Suggestions" §1).
- `ServeDir::new(static_dir)` constructed per request in `serve_static_asset`: `harryf` covers (peer-review §2). Not duplicating.
- `SignInWidget` polling vs MSAL `addEventCallback`: peer-review LQ from `harryf`; acknowledged Soft.
- 250 ms × 20 polling re-render: addressed in `dd55575` with the `prevId === nextId` short-circuit. Not re-raising.
- CSP `unsafe-inline`: bouncer HTML is a static string in Rust with no untrusted input; `unsafe-inline` is bounded to a single inline script with no DOM-injection surface. Not a credential-class regression. (Considered + dropped at R5.)
- `response_mode=query` fragment-leak speculation (peer-review §4): MSAL's documented default is `response_mode=fragment`; raising as a hardening suggestion would duplicate harryf's lane.

---

## Required before merge

- F1 — `drift:code-code`, W6 + W10. Either wire `redirectUri = ${origin}/auth/callback` through the bundle (extend `LobsterMsalConfig`, the index.html stash, and `initMsalAuth`'s consumer), or remove the bouncer + the 73-entry doc list and revert to the bare-origin redirect-URI shape from issue #298. The bot does not pick a side; one of the two must land in this PR.

## Strong-yield items

- F2 — add a unit test in `msalAuth.unit.test.ts` asserting the constructed `redirectUri`, OR a tracking issue with acceptance criteria.
- F3 — refresh the PR body's TopNav-widget description and test-count.
- F4 — `pre-existing` modifier: yields on follow-up issue + author acknowledgment that this PR isn't the right place to fix the singleton-getter design; or fix-in-place per the suggestions above.

## Minor

- F5 — align dev-start.sh and the redirect-URI doc on `http://` vs `https://localhost:8443/auth/callback` and cite the AAD policy.

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.

*Re-parse: this comment is the ledger. Findings F1-F5 + LQ1 are open at SHA `7e6e0d54`. Status keywords used: `open`. On next tick the bot reads its most recent `claws-lobster-architect:*` marker on this PR and reconstructs F1-F5 + LQ1 state from the headers.*
