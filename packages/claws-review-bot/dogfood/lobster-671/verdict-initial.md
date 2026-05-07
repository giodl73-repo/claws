<!-- claws-lobster-architect:initial -->

## Architect Review — PR #671 @ `106d99544`

## Sources of truth (R0)

**PR claim digest**: 7 claims.
- C1: three lints land in lockstep across `lobster_runtime` + `lobster_plex_mock` (`disallowed_methods=deny`, `missing_errors_doc=warn`, `missing_panics_doc=warn`).
- C2: starter banlist of 4 entries authored in each crate's `clippy.toml`, each with a `reason` string.
- C3: production fix in `auth/jwks_cache.rs::JwksCache::new` is `#[allow(clippy::disallowed_methods, reason = "...documented fallback when builder() fails...")]`; "annotated rather than refactored because the existing fallback is the correct shape".
- C4: test-mod scoped allows in `config.rs::tests`, `auth/config.rs::tests`, `auth/jwks_cache.rs::with_keys_for_test`, serialized via existing `ENV_LOCK: Mutex<()>` static.
- C5: integration test crates `tests/integration_test.rs`, `tests/gateway_proxy_e2e.rs`, `tests/openclaw_chat_send_e2e.rs` gain `clippy::missing_errors_doc`, `clippy::missing_panics_doc`, and (for `gateway_proxy_e2e.rs`) `clippy::disallowed_methods` via file-level `#![allow]`; "the e2e tests use `Client::new()` for short-lived probe requests".
- C6: zero net new doc comments; existing 30 public Result-returning fns already carried `# Errors` sections.
- C7: `cargo clippy --all-targets -- -D warnings` clean on both crates.

**Specs read**: `docs/reference/clippy-security-lints.md` §3 ("Tier 2 — next cycle"); `CLAUDE.md` §"Rust" (CI gate description); GHE issue #653 closing checklist; `lobster_runtime/Cargo.toml` `[lints.clippy]` block (header comment block stating Tier 1/2 phasing).

**Spec gaps**: none — the Tier 2 phase plan is fully grounded in `docs/reference/clippy-security-lints.md` §3 and issue #653.

**Drift hypotheses**:
- C3 vs head code (`auth/jwks_cache.rs:80-101`) — body claims a `disallowed_methods` allow with fallback shape; head has `expect_used` allow with fail-fast shape. Push `106d9954` rewrote the constructor per Galin F2 but the body wasn't refreshed.
- C5 vs head code (`tests/gateway_proxy_e2e.rs:17-26`) — body claims `gateway_proxy_e2e.rs` adds `disallowed_methods` to its file-level allow; head dropped that lint per Galin F3 (and rewrote the `Client::new()` call sites to `Client::builder().build().unwrap()`).
- "10 lints below" header comment in `tests/integration_test.rs:2` and the cross-referenced `tests/openclaw_chat_send_e2e.rs:1` (via "See gateway_proxy_e2e.rs for rationale") vs the actual `#![allow]` block now containing 12 entries.

## Findings

### F1 — [Major | drift:pr-code] — Status: open
**Recommendation**: fix-before-merge — update the PR body, or carve a body-revision commit.
**Invariant**: W9 (no material PR-claim drift). The "Production fix" section is the audit-trail description of how `JwksCache::new` handles configured-builder failure; an auditor reading the merged commit message would learn the wrong shape. Body says "annotated rather than refactored because the existing fallback is the correct shape (try-configured-builder, fall back to default)"; head replaces the fallback with `expect`-and-panic.
**Where**: PR body §"Production fix" vs `src/lobster_runtime/src/auth/jwks_cache.rs:80-101` at SHA `106d99544`. Also PR body §"Integration test crates" claim that `gateway_proxy_e2e.rs` gets `clippy::disallowed_methods` vs `src/lobster_runtime/tests/gateway_proxy_e2e.rs:17-26` at SHA `106d99544` (lint dropped from the `#![allow]` block per F3 fix). Author's reply at `issuecomment-128946926` correctly describes the new shape; the body itself wasn't synced.
**Counter-search**: searched commit `106d99544` body — that commit message accurately describes the F2/F3 fixes. The drift is between the *PR body* (what auto-merge will use as the squash-commit message via `auto_merge.commit_message`, which still has the stale "fix(rust): clippy Tier 2 phase 3" body shape) and the *head code*. Confirmed `auto_merge` is enabled with `merge_method: squash`; the squash-commit body is the body shown in the PR description, not the latest individual commit message — so this drift will land in the merged history.
**Suggested fix**: edit the PR body §"Production fix" to describe the `expect_used` allow + fail-fast shape (paragraph already exists in the F2 reply at `issuecomment-128946926` and in commit `106d9954`'s message), and remove the `disallowed_methods` mention from the integration-test paragraph for `gateway_proxy_e2e.rs`. Non-material per W9 (the new shape is more defensible than the body's claimed shape — fail-fast at boot beats silent degradation), so Strong-tier; yields on body update.

### F2 — [Minor | drift:code-code] — Status: open
**Recommendation**: fix-or-acknowledge.
**Invariant**: in-file convention comment must match the convention's content. `tests/integration_test.rs:2` and the comment-block it anchors describe a "core test-idiom exemption set" of "10 lints below" common across all three integration test crates; the actual `#![allow]` block now contains 12 entries (9 originals + `indexing_slicing` from #668 + `missing_errors_doc` + `missing_panics_doc` from this PR).
**Where**: `src/lobster_runtime/tests/integration_test.rs:2` ("The 10 lints below are the *core test-idiom exemption set*"); cross-referenced from `src/lobster_runtime/tests/openclaw_chat_send_e2e.rs:1` ("See gateway_proxy_e2e.rs for rationale on the test-crate-level allows.") and `tests/gateway_proxy_e2e.rs` (origin of the rationale comment).
**Counter-search**: confirmed the count was already stale after #668 added `indexing_slicing` — pre-existing modifier applies to the 11th lint, this PR adds the 12th. The convention itself ("when promoting a new lint to a deny that affects test code, add it to the core set in all three files") was honored cleanly; only the count metadata is stale.
**Suggested fix**: rewrite the lead-in to "The N lints below are the core test-idiom exemption set" with N as a stable count, or drop the count entirely ("The lints below are the core test-idiom exemption set"). The stable form prevents the same drift on phase-N+1.

## Leading questions (non-blocking)

### LQ1 — [LQ | spec] — Status: open
The `# Panics` doc on `JwksCache::new` (`src/lobster_runtime/src/auth/jwks_cache.rs:80-89`) says rustls-tls-backend-init failure is "build-time / link-time misconfiguration, not a runtime-recoverable condition." Is there an integration-test or build-script assertion that pins this property — i.e. that fails loud if `rustls-tls` is *not* the active feature? Today the contract lives only in the doc comment; a one-line `compile_error!` cfg guard or a `#[test] fn assert_rustls_tls_active() { ... }` would survive a future feature-flag refactor that replaces the TLS backend. Not blocking — flagging because the rationale for choosing `expect` over `?` rests on this contract holding.

### LQ2 — [LQ | code] — Status: open
The `with_keys_for_test` constructor at `src/lobster_runtime/src/auth/jwks_cache.rs:117-130` retains `reqwest::Client::new()` under a `disallowed_methods` allow. The reason string ("synthetic JWKS bypass never makes a real HTTP request, so the configured-builder pattern doesn't matter") is sound. Worth checking: is the `http: reqwest::Client` field on `JwksCache` reachable from any test path that *does* make an HTTP request after constructing via `with_keys_for_test`? If yes, the test client has no timeouts and could hang a CI shard on a network blip. If no (the field is unreachable on this construction path), the cleaner shape is `Option<reqwest::Client>` so the type system enforces the unreachability. Not blocking — drop if a quick read shows `get_signing_key` / `refetch` always short-circuit on the test path.

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.
