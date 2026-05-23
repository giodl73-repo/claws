# Process notes — PR #671 dogfood

## Run summary

- Head SHA: `106d99544416102f99a28d0aa649961d0b78769c` (push 2 of 2; first push `725f84d7` introduced phase 3, second addressed Galin Iliev review F1/F2/F3).
- Author: `juliome`. PR is in `mergeable_state: blocked`, `auto_merge: enabled` (squash, body-as-commit-message).
- Prior reviewers active on PR before this run: Galin Iliev (PRR\_kwDOAA\_wH84GbMEJ — 3 findings, all addressed in `106d9954`), harryf (peer-review, posted twice — once on `725f84d7`, once on `106d9954`, both PASS-shape).
- 2 findings raised (1 Major drift:pr-code, 1 Minor drift:code-code), 2 LQs.

## Lens fire/skip log

- **L1 (Rust safety)**: fired heavy. Walked panic-discipline, lint-posture, error-handling, async, visibility, cargo-hygiene watches against the diff.
  - panic discipline: new `.expect("rustls-tls Client::builder must initialize")` in `JwksCache::new` is properly justified — `#[allow(clippy::expect_used, reason = "...")]`, doc carries `# Panics` block, contract makes failure impossible at runtime. Compliant with code.md L1 (cross-repo: matches icelines `.expect("infallible with these options")` pattern).
  - lint posture: every new `#[allow]` site carries `reason = "..."`. Compliant with PR #668 convention.
  - error handling: no new `anyhow::Result<T>` in library APIs; doesn't introduce new `?` chains.
  - async / unbounded channels / Drop: not touched.
  - visibility: `pub(crate) mod test_util`, `pub(crate) static ENV_LOCK` — correct (not `pub`).
  - cargo hygiene: lockstep honored across both crates' Cargo.toml + clippy.toml.
- **L2 (plex-mock parity)**: skipped per code.md "both crates touched in matching shape" rule. Verified clippy.toml diff is identical (4 banlist entries, same `reason` strings). Verified Cargo.toml `[lints.clippy]` diff is identical (3 lines added at the same place in the comment-grouped block). plex_mock has no `auth/jwks_cache.rs`, no `config.rs::tests` env mutations, no e2e test crates — so the production-side fixes have no plex_mock counterpart by construction (not a divergence).
- **L3 (OpenClaw integration shard)**: skipped — no gateway/dispatch/snap-restore surface touched; pure lint posture change.
- **L4 (Azure Linux build resilience)**: skipped — no Dockerfile / pipeline YAML / `.dockerignore` touched.
- **L5 (lobster_web wire-format)**: skipped — no Pydantic alias / SSE event / response model touched.
- **L6 (feature-flag / rollback)**: not directly relevant. The `JwksCache::new` change has rollback-trivial semantics (revert one commit, no schema, no client cache) — silent under W4.
- **L7 (cross-repo ripples)**: skipped — no aether-paired or openclaw-fork-bound surface. The fork relevance is W8: nothing in the diff names internal repos / paths / users (verified the comments in clippy.toml + Cargo.toml + jwks_cache.rs don't leak `claws`, `bic/*`, internal users, etc.). Clean.

## Watches evaluated

- W1 (silent contract break): N/A — no wire format / SSE event / Pydantic alias / proto touched.
- W2 (test coverage reduction): no tests removed or disabled. The local `static ENV_LOCK: Mutex<()>` was relocated to `crate::test_util::ENV_LOCK`, not removed; serialization semantics preserved.
- W5 (cross-repo coordination): N/A — change is local to lobster.
- W6 (credential / redirect): N/A — no httpx / MSAL / OBO / cookie surface.
- W7 (import-time assertion): N/A — no module-level raise / assert added.
- W8 (fork boundary leak): clean — no internal names in any of the touched files' new content.
- W9 (PR-claim drift): **F1 fired**. Body's "Production fix" and "Integration test crates" sections describe pre-F1/F2/F3 shapes. Strong-tier (non-material — describes shape, not security mitigation).
- W10 (contract-class spec drift): N/A — `docs/reference/clippy-security-lints.md` §3 matches code exactly.
- W11 (non-contract spec drift): no `CLAUDE.md` description of clippy tier rollout to drift against. The in-file comment header on `tests/integration_test.rs` ("The 10 lints below") is an in-code convention statement that drifts — that's the F2 finding (escalated from W11 to drift:code-code because it lives in code, not in a separate spec).

## Findings considered and dropped

- **Considered (dropped)**: Add a CI lockstep check between the two `clippy.toml` files. — Already raised by harryf in both peer-review comments as a non-blocking suggestion; bot does not duplicate harryf's coverage (per voice.md "What this bot does NOT do"). Skipped without lowering to LQ to avoid noise.
- **Considered (dropped at counter-search)**: Possible drift between `JwksCache::new` doc paragraph (says "we punt by deferring to the first request, which has fail-closed semantics anyway") and the new `# Panics` block (says "Failing fast at boot beats silently degrading auth"). Initial read suggested contradiction. Counter-search: the "punt by deferring" sentence describes the choice *not to fetch JWKS eagerly*; the `# Panics` sentence describes the choice *to panic if the HTTP client itself fails to construct*. These are different decisions on different conditions — no contradiction. Dropped.
- **Considered (dropped at challenge)**: Whether the `expect_used` allow on `JwksCache::new` is the wrong tier — should be `disallowed_methods` since the surrounding text talks about reqwest `Client::new`. Re-read confirms: head code uses `.expect()` on `Client::builder().build()`, never calls `Client::new()` in production. The lint that fires is `expect_used` (banned by Tier 1 #639 at `deny`), not `disallowed_methods`. The author's allow targets the correct lint. Dropped.
- **Considered (dropped)**: New `#[deny(missing_docs)]` interaction with the new `test_util` module (`src/lobster_runtime/src/lib.rs:38-49`). Counter-search: the module is `#[cfg(test)]`, so `missing_docs` doesn't fire on its items in a non-test build, and the test build allows the same allowlist as before. Inner `///` doc on the `ENV_LOCK` static is present anyway. Dropped.
- **Considered (dropped)**: Whether removing `disallowed_methods` from the `gateway_proxy_e2e.rs` file-level allow block re-exposes the `Client::builder().build().unwrap()` sites. Counter-search: `Client::builder` is not banned (only `Client::new` is); only the `.unwrap()` would be a concern, and the file's `unwrap_used` allow covers that. Dropped.
- **Considered (LQ-tier polish, dropped to keep terse)**: The `JwksCache.http: reqwest::Client` field is unconditionally constructed even on the `with_keys_for_test` path that doesn't make HTTP requests. `Option<reqwest::Client>` would express the intent. Promoted into LQ2 (kept because it's a real type-system observation that survives the F2 refactor).

## Comparison vs harryf #668 peer-review and #671 peer-reviews

- harryf's #668 review covered Style/Security/Git/Architecture/Testing/Docs/E2E/Assumption-Testing categories — all PASS, with two non-blocking suggestions (one about `significant_drop_tightening` allow scope, one about a phase-3 sweep of cast lints).
- harryf's #671 reviews (run twice) covered the same shape — all PASS, with three non-blocking suggestions: lockstep CI check on the two clippy.toml files, narrow the file-level `disallowed_methods` on `gateway_proxy_e2e.rs` (the second review correctly noted this is now narrower after F3 — the suggestion is residual and subjective), and ENV\_LOCK doc comment for cross-module reasoning.
- harryf's coverage is style/peer-review-shaped; this bot's coverage is contract/drift-shaped. No overlap on the two findings raised here:
  - F1 (drift:pr-code) is exactly the gap harryf doesn't watch — harryf reads the diff and PASSes the diff; doesn't cross-check the PR body against the diff at head.
  - F2 (drift:code-code on a header comment count) is below harryf's signal threshold (he flagged a similar thing in #634 but only when it was load-bearing — a stale count comment is not).
- Galin Iliev's prior PRR (`PRR_kwDOAA_wH84GbMEJ`) covered exactly the L1-shaped findings this bot would have raised on the first push: F1 crate-wide ENV\_LOCK (cross-module unsafety class), F2 fail-fast on JWKS builder error (silent-degrade-to-default-client was the bug `disallowed_methods` exists to prevent), F3 narrow gateway-proxy file-level allow. All three were addressed in `106d9954` cleanly. If this bot had reviewed the first push (`725f84d7`), it would have raised these — so the bot agrees with Galin's review, and on the head SHA those findings are correctly closed.

## Voice-file feedback

- The `code.md` skip rules for L2 ("both crates touched in matching shape") let the bot skip L2 cleanly here despite L2 being heavy on paper for a Tier 2 phase rollout. This is the correct shape — but the rule could be sharpened: "matching shape" was easy to verify by eyeballing the two clippy.toml diffs because they're 18-line identical insertions with identical `reason` strings. For larger lockstep diffs, a more precise rule ("the diff in the second crate is byte-for-byte identical to the matching slice in the first crate, modulo crate-name strings") would be operational. Worth a future addition to the L2 lens body.
- The `watches.md` W9 distinction between "material claims (security mitigation, contract preserved/extended, rollback documented)" and "non-material claims (test count, line count)" was easy to apply to F1's audit-trail concern, but the body's claimed shape sits on a fence: "the existing fallback is the correct shape" *is* a contract claim about how the auth path behaves on init failure — borderline material. Calibrated as Strong (non-material) here because the head shape is more defensible than the body's claimed shape, so the drift doesn't materially mislead about a *worse* shape. If the drift went the other way (body says fail-fast, code silently falls back), it would escalate to W9 non-negotiable.
- The `voice.md` "Active-PR rule" (hold-then-review) was not invoked here because both pushes settled — push 1 at 17:21 UTC, push 2 at 19:19 UTC, current time 19:21 UTC and harryf's second peer-review at 18:40 UTC suggests the PR is settled. Bot proceeded to full R0-R5 directly. If a third push lands during this review, abort and re-anchor on the new SHA per voice.md.
- The grammar.md `Status: open` keyword is correct for both findings; F1 may close to `resolved` as soon as the body is edited (no commit needed), F2 needs a one-line code touch.

## Confidence calibration

- F1 (drift:pr-code): high confidence (~95%). The body text is verbatim, the head code is verbatim, the divergence is direct. Author's own reply at `issuecomment-128946926` describes the new shape and acknowledges the gap implicitly.
- F2 (drift:code-code, count): high confidence (~85%). The "10 lints below" claim is a verifiable count against the visible block. Slight discount for "the comment may be deliberately stale to avoid re-touching the same comment on every phase" — but the convention's purpose (cross-file consistency) suggests the count was load-bearing when authored.
- LQ1 (rustls-tls feature pin): medium confidence (~60%). May already be enforced by Cargo.toml `default-features = false` + explicit `rustls-tls` feature gate; bot didn't deeply audit the feature graph.
- LQ2 (with_keys_for_test client unreachability): medium confidence (~50%). Real type-system observation, but possibly already audited and decided against on ergonomic grounds.

## Verdict shape

Initial review, not approve, not hold. Two findings open; PR is functionally close (Galin's substantive findings are all addressed cleanly, harryf's non-blockers are non-blockers). The author can resolve F1 with a body edit (no push needed) and F2 with a one-line comment touch — both fit in the same body-edit + amend cycle.
