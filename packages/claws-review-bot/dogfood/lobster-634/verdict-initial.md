<!-- claws-lobster-architect:initial -->

# Architecture review — bic/lobster#634 @ `7e6e0d541ca0031088aeb010daf077686c5517cd`

**Verdict**: hold. 1 Major (block) drift between the bouncer route and the bundle's MSAL config; the rest is yieldable.

**Findings**: 5 total — 0 code, 0 spec, 5 drift (2 drift:pr-code, 2 drift:spec-code, 1 drift:code-tests).

---

## Sources of truth (R0)

**PR claim digest** (5 material claims):
- C1: AAD redirects to `/auth/callback`, where the runtime serves a bouncer that hands the URL fragment to `/web/`.
- C2: `lobster_web` bundle's MSAL `handleRedirectPromise()` consumes the fragment after the bounce.
- C3: Per-environment app reg via `CustomizedTokens` → env vars → request-time substitution into `index.html`.
- C4: TopNav gains a `<SignInWidget/>` that shows "Sign in" when MSAL is wired but no account is present, and switches to the account name after `handleRedirectPromise` resolves.
- C5: Unset env = placeholders survive = bundle's IIFE skips MSAL init (local-dev default).

**Specs read** (R0):
- `CLAUDE.md` (root) — orientation only; no auth contract.
- `docs/authentication-redirect-uris.md` — diff includes the redirect-URI list (65 prod + 7 test + 1 localhost) all on `/auth/callback`. Treat as the contract surface here: this list is what gets shipped to AAD-FirstPartyApps, so it IS the wire-level contract for the AAD ↔ runtime redirect URI.
- `src/lobster_web/src/services/msalAuth.ts` — the SINGLE source of truth for MSAL init per its module-doc; `redirectUri` defaults to `window.location.origin` at L106.
- `src/lobster_web/src/services/runtimeConfig.ts` — `LobsterMsalConfig` has only `clientId | authority | scopes | loginMethod`. No `redirectUri`.
- `src/lobster_web/index.html` — pre-bundle script stashes only `{ clientId, authority }` on `__LOBSTER_RUNTIME_CONFIG__.msal`; no redirect-URI override.
- Issue `bic/lobster#298` (referenced in `msalAuth.ts:16`) — original design open-question said "redirect URI shape (`lobster.<region>.gateway.<env>.island.powerapps.com`)", i.e. bare origin. PR-634 changed the contract without updating the bundle side.

**Specs not found**: no design doc for the `/auth/callback` bouncer path specifically; no CLAUDE.md under `src/lobster_runtime/` or `src/lobster_web/` covering the auth contract end-to-end. The redirect-URI doc and `msalAuth.ts` module-doc together carry the load.

**Drift hypotheses (formed at R0, evaluated below)**:
- H1: bouncer wired in Rust but bundle never asks AAD to redirect there (`redirectUri` default).
- H2: PR body's TopNav SignInWidget description doesn't match HEAD `7e6e0d54` (refactor removed the "Sign in" button).
- H3: docs claim `/auth/callback` is "confirmed" path but bundle config doesn't reference it.

All three survived R2/R4. They form F1, F3, and F2 below.

---

## Findings

### F1 — [Major | block | drift:spec-code] Bouncer route is dead code: bundle never sets `redirectUri = '/auth/callback'`

**Where**:
- Bouncer registered: `src/lobster_runtime/src/routes/mod.rs:51` → `src/lobster_runtime/src/routes/web.rs:130-160` (`auth_callback`).
- Redirect-URI doc lists `/auth/callback` for 73 hostnames: `docs/authentication-redirect-uris.md:32-194`.
- Bundle's MSAL init: `src/lobster_web/src/services/msalAuth.ts:106` — `redirectUri: config.redirectUri ?? window.location.origin`.
- Runtime-config shape: `src/lobster_web/src/services/runtimeConfig.ts:20-25` (`LobsterMsalConfig` has `clientId | authority | scopes | loginMethod` — no `redirectUri`).
- Pre-bundle stash: `src/lobster_web/index.html` MSAL IIFE writes `{ clientId, authority }` only.
- `createSignIn`: `src/lobster_web/src/services/msalAuth.ts:172-198` calls `loginRedirect({ scopes, state })` — no per-call redirect-URI override.

**The drift**: this PR registers a `/auth/callback` route, claims AAD uses it, and provisions a 73-entry redirect-URI list pointing at it — but the bundle constructs `PublicClientApplication` with `auth.redirectUri = window.location.origin`. MSAL will send AAD `redirect_uri=https://lobster.<region>.gateway.<env>.island.powerapps.com/` (the origin), not `/auth/callback`. Two possible runtime outcomes:

1. **AAD app reg only has `/auth/callback` registered** (which is what the docs in this PR provision): AAD rejects with `AADSTS50011: redirect_uri did not match any of the registered values`. Sign-in fails at first click in every prod env.
2. **AAD app reg has both origin and `/auth/callback` registered** (out of band): origin wins, AAD redirects to `https://<host>/`, the bouncer at `/auth/callback` never executes, the 73-entry list in `authentication-redirect-uris.md` is wrong, and `handleRedirectPromise` runs against the ServeDir-served bare origin (which 404s — there's no route at `/`, only `/web/`).

Either branch means the integration described in the PR body does not work as written. The bouncer + the redirect-URI doc form a contract the bundle does not honor.

**Counter-search**: grep for `redirectUri` across `bic/lobster` returns one file (`msalAuth.ts`); for `"/auth/callback"` returns one file (`docs/authentication-redirect-uris.md`). Nothing in the diff or the surrounding repo wires the two together. PR body re-asserting the bouncer is the active mechanism is not evidence — that's the premise of the drift.

**Yield**: per W10, this is a contract spec (`authentication-redirect-uris.md` is the producer side of the AAD-FirstPartyApps contract; the bouncer route is the runtime contract). Drift between contract specs and code is non-negotiable. Either:
- a) the bundle wires `redirectUri` to `${origin}/auth/callback` (extend `LobsterMsalConfig` to carry it, set it in the index.html stash, pass it through `initMsalAuth`), and the runtime tests gain a fixture asserting the wire-up, OR
- b) the bouncer route + the 73-entry doc list are removed and the redirect URI is the bare origin (which means a different server-side route — the bundle's hash router runs at `/web/`, so the origin `/` would still need to handle the redirect or 302 to `/web/`).

Choose. The bot does not pick a side.

**Status**: open

---

### F2 — [Major | drift:code-tests] No test exercises the redirect-URI MSAL config; bouncer test asserts dead code

**Where**:
- Bouncer integration tests: `src/lobster_runtime/src/routes/mod.rs:1014-1107` (`auth_callback_returns_html_bouncer`, `web_root_*`).
- Bundle MSAL init: `src/lobster_web/src/services/msalAuth.ts:99-112` — no test asserts `redirectUri` is ever set to `/auth/callback`.
- `src/lobster_web/tests/services/msalAuth.unit.test.ts` (existing per code search) — does not assert the redirect URI matches the AAD app reg's allowlist.

**The drift**: the bouncer assertion `html.contains("window.location.replace('/web/'")` confirms the bouncer's HTML shape, but the bouncer can only run if AAD redirects there, which depends on the bundle's MSAL `auth.redirectUri`. No test exercises the chain. If the redirect-URI default flips (or stays as `window.location.origin`), every bouncer test still passes — the tests don't pin the contract.

This is the test-side projection of F1: F1 says the contract is broken; F2 says the test suite cannot detect it.

**Counter-search**: no test in the diff or the surrounding repo searches for `/auth/callback` AND `redirectUri` in the same fixture. The harryf peer-review (`128923901`) flagged "e2e-redirect-roundtrip — FAIL" for the same gap.

**Yield**: Strong. Yields on either:
- a unit test in `msalAuth.unit.test.ts` that asserts the constructed `MsalConfiguration.auth.redirectUri` equals the documented bouncer URL when the config requests it, OR
- a tracking issue with acceptance criteria pinning the bouncer ↔ bundle wire-up.

Adding a Playwright e2e test (as the peer-review suggested) covers a different surface — it would catch F1 but only at integration-test cost. A unit-level redirect-URI assertion is cheaper and pins the same contract.

**Status**: open

---

### F3 — [Major | drift:pr-code] PR body misdescribes TopNav SignInWidget at HEAD

**Where**:
- PR body: "TopNav gains a `<SignInWidget/>` that shows 'Sign in' when MSAL is wired but no account is present; switches to the account display name after `handleRedirectPromise` resolves."
- HEAD code: `src/lobster_web/src/App.tsx:213-216` — `if (account === null) { return null; }`. There is no "Sign in" button in the widget.
- Author reply on inline thread `App.tsx:168` (`128923901`): refactor in `7e6e0d54` "removed the pre-sign-in 'Sign in' button entirely, deferring to the existing CapabilityBanner and Landing page."

**The drift**: the PR body still describes the widget as a two-state component (Sign-in button → account name). Post-`7e6e0d54` the widget has one rendered state (account name) and one null state. A reviewer reading the PR body for the post-merge changelog will think a Sign-in affordance was added to TopNav; it was not.

**Counter-search**: PR body unchanged since the original push (no `body` field update on the PR REST resource between `393c04f3` and HEAD). Author acknowledged the refactor in the inline reply but did not update the body.

**Yield**: W9 non-material claim (UI behavior description, not security/contract/rollback). Strong-tier — yields on PR body update reflecting the post-`7e6e0d54` shape: "TopNav gains a `<SignInWidget/>` that displays the signed-in user's name; pre-sign-in CTA is handled by the existing CapabilityBanner / landing-page button."

**Status**: open

---

### F4 — [Major | drift:spec-code] `_getMsalInstance` is `@internal` but used in production rendering

**Where**:
- Spec (JSDoc): `src/lobster_web/src/services/msalAuth.ts:249` — `/** @internal Get MSAL instance (tests only). */`.
- Code: `src/lobster_web/src/App.tsx:46` imports `_getMsalInstance` and calls it from `SignInWidget`'s state initializer (`App.tsx:191`) and the polling effect (`App.tsx:198`).

**The drift**: the JSDoc is a contract — `@internal` plus the explicit "tests only" prose says the export is not part of the public surface and not for production code paths. `App.tsx` is production. The widget reaches into the singleton because there's no public "subscribe to active-account changes" surface on `msalAuth.ts`.

This is a code-organization smell, not a security or runtime correctness issue. But the JSDoc is itself a spec, and the diff violates it without updating it — that's the drift definition.

**Counter-search**: no other production consumer of `_getMsalInstance` was found in the repo. This is the first one.

**Yield**: W11 (non-contract spec drift), Strong-tier. Yields on either:
- adding a public `getActiveAccountSnapshot(): MsalAccountInfo | null` (or an event-callback subscription) to `msalAuth.ts` and switching `SignInWidget` to it; the `@internal` boundary stays clean, OR
- updating the JSDoc on `_getMsalInstance` to drop "tests only" and document the production use site.

**Status**: open

---

### F5 — [Minor | drift:pr-code] `dev-start.sh` MSAL block redirect URI scheme mismatch

**Where**:
- Diff: `src/lobster_runtime/dev-start.sh:81-95` says "The TEST-Lobster app registration must have `https://localhost:8443/auth/callback` in its redirect-URI list".
- Diff: `docs/authentication-redirect-uris.md:200-208` says local-dev redirect URI is `http://localhost:8443/auth/callback` (note: `http`, not `https`), with explicit prose: "`http://` (not `https://`) is allowed by AAD only for `localhost`".

**The drift**: dev-start.sh and the redirect-URI doc disagree on the scheme. AAD's localhost exemption is for `http://`; the registration doc takes that path. The dev-start.sh comment says `https://`. Whichever is correct, the two should agree — and given `dev-start.sh` itself binds TLS at 8443 (with self-signed cert), `https://localhost:8443/auth/callback` would actually be the URL the browser hits at runtime. So which does AAD need registered: the `http://` form (AAD-allowed-because-localhost) or the `https://` form (matches what the browser sends)?

**Counter-search**: the doc explicitly addresses this: "the local dev server uses self-signed TLS but AAD treats the redirect as exempt from TLS-only enforcement when the host is localhost." That implies AAD will accept `https://` for localhost too, but the doc still picks `http://`. Neither doc cites an authoritative AAD policy reference.

**Yield**: Minor `drift:spec-spec`. Yields on aligning the two; whichever scheme is correct should be in both places, with a one-line comment naming the AAD policy that allows it.

**Status**: open

---

## Watches not triggered

- **W1 (silent contract break)**: no aether-side or SSE wire-format change.
- **W5 (cross-repo paired PR)**: AAD-FirstPartyApps registration is acknowledged as out-of-scope follow-up. Strict W5 reads on lobster ↔ aether / lobster ↔ openclaw — AAD-FirstPartyApps isn't one of those. F1 makes the merge-order question moot anyway: the integration doesn't work even if the AAD PR lands first.
- **W6 (credential / redirect-handling regression)**: bouncer construction does not introduce token-leak or open-redirect surface (`window.location.replace('/web/' + search + hash)` is same-origin via relative path; no Authorization header forwarded; CSP `default-src 'none'` plus single inline script is appropriately restrictive given the input is a static string in Rust). No finding.
- **W7 (import-time env assertion)**: `warn_if_msal_template_missing` runs from `build_router` (startup), not at module-import time, and is a `warn!`, not a `raise`. No finding.
- **W8 (public-fork boundary leak)**: PR is lobster-internal; nothing destined for the openclaw upstream fork.

---

## What the bot is NOT raising (and why)

- Per-request disk read of `index.html` in `serve_index` (`web.rs:30-49`): perf observation, not a regression. Already raised by `harryf` peer-review at `128923901`. Out of scope per voice — `harryf` covers this lane.
- `ServeDir::new(static_dir)` constructed per request in `serve_static_asset`: same — `harryf` already noted; not duplicating.
- Style/format/clippy: covered by lobster CI + `harryf`.
- `SignInWidget` polling vs MSAL `addEventCallback`: peer-review LQ from `harryf` at `128755881`. Acknowledged as Soft.
- 250ms × 20 polling re-render comment from `Copilot:128744...` — already addressed by `harryf` in `dd55575` with the `prevId === nextId` short-circuit. Not re-raising.

---

## Required before merge

- F1 — drift:spec-code, W10. Either wire `redirectUri = ${origin}/auth/callback` through the bundle (extend `LobsterMsalConfig`, the index.html stash, and `initMsalAuth`'s consumer), or remove the bouncer + the 73-entry doc list and revert to the bare-origin redirect-URI shape from issue #298. The bot does not pick a side; one of the two must land in this PR.

## Strong-yield items (yield on specific evidence)

- F2 — add a unit test in `msalAuth.unit.test.ts` asserting the constructed `redirectUri`, OR a tracking issue with acceptance criteria.
- F3 — refresh the PR body's TopNav-widget description.
- F4 — either expose a public account-snapshot surface on `msalAuth.ts` and switch the widget to it, or update the `@internal` JSDoc.

## Minor

- F5 — align dev-start.sh and the redirect-URI doc on `http://` vs `https://localhost:8443/auth/callback` and cite the AAD policy.

---

*Re-parse: this comment is the ledger. Findings F1-F5 are open at SHA `7e6e0d54`. Status keywords used: `open`. On next tick the bot reads its most recent `claws-lobster-architect:*` marker on this PR and reconstructs F1-F5 state.*
