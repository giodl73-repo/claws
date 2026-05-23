# notes-redux — claws-lobster-architect dogfood-2 on bic/lobster#634

Process notes, dropped findings, comparison to first verdict, voice-file feedback v9+. Not the verdict; see `verdict-redux.md`.

## Run identity

- **Target**: bic/lobster#634 — feat(runtime,web): MSAL auth-redirect for /web (sign-in flow) by harryf.
- **Head SHA**: `7e6e0d541ca0031088aeb010daf077686c5517cd` (same as initial dogfood — head has not moved since `2026-05-07T18:20:35Z`).
- **Now**: `2026-05-07T19:29Z`. Last commit ~70 min ago. Repo `pushed_at` is more recent (19:23Z) but the PR's HEAD ref is unchanged; per `voice.md` active-PR rule the head-SHA-scoped clock is what matters, and the head has been settled for over an hour. Proceeding with full review (no `:hold`).
- **PR shape**: 12 files, +864 -117, 7 commits. Unchanged from initial run.
- **Other reviewer activity since initial dogfood**: harryf peer-review re-anchored at `2026-05-07T18:42:09Z` (PASS across all categories). Galin-Iliev / dspektor approvals re-anchored (LGTM). 25 issue comments now (was 23).

## R0 — sources of truth

Identical to initial run. Diff cache valid (same SHA). Re-fetched `msalAuth.ts`, `runtimeConfig.ts`, `index.html` to verify the F1 grounding still holds at HEAD: `redirectUri ?? window.location.origin` at `msalAuth.ts:106` confirmed; `LobsterMsalConfig` with no `redirectUri` field confirmed; index.html IIFE writing only `{ clientId, authority }` confirmed. F4 grounding: `_getMsalInstance` JSDoc still reads `/** @internal Get MSAL instance (tests only). */` at `msalAuth.ts:249`.

**LQ1 (new vs initial)**: under the updated `specs.md` heuristic chain, the absence of `src/lobster_runtime/CLAUDE.md` and `src/lobster_web/CLAUDE.md` for a feature this load-bearing now reads as a real spec gap worth surfacing. Initial dogfood noted it but didn't raise as LQ. Updated voice's clearer "When no spec exists" guidance (`specs.md` §"When no spec exists") tipped it over to LQ1 status.

## R1 — full reads

Re-read all 6 voice files in full. Major changes vs the v8 voice the initial dogfood ran against:
- `voice.md` now has explicit category vocabulary including `drift:code-code`; canonical finding example block; severity-vocabulary table; explicit pre-existing modifier reference.
- `watches.md` now has a "Pre-existing drift surfaced by this PR" branch with Strong-with-modifier yield and the `pre-existing` modifier label.
- `watches.md` W6 "Surfaces (lobster-side)" now lists the MSAL-redirect-URI-mismatch case explicitly and cites this PR (#634) F1 as the reference example.
- `grammar.md` is new — re-parse contract pinning marker / header / R0 / findings / LQ / footer / status keywords.
- `code.md` and `drift.md` have skip-when sections and a `drift:code-code` examples block (which uses this PR's F1 as the canonical example).

## R2 — drift check

Worked through PR claim ↔ code, spec ↔ code, code ↔ code, spec ↔ spec, code ↔ tests against the same six hypotheses. All six survived.

The biggest change: H1 (the bundle ↔ bouncer disagreement) now has a clean home — `drift:code-code`. In the initial dogfood I forced it into `drift:spec-code` using the redirect-URI doc as the spec, which fit but felt strained. This time the doc-side drift is folded into F1 as a sibling spec-code drift; the *primary* drift is between two code surfaces (new Rust bouncer + new doc list vs existing TS bundle).

## R3 — lens results (terse)

- L1 (Rust safety): no new unsafe / unwrap / `#[allow]` / async-lock issues. PASS.
- L2 (plex-mock): skip — neither `lobster_runtime` nor `lobster_plex_mock` (parity surface) touched in a way that diverges. The new `routes/web.rs` + `routes/mod.rs` changes are runtime-only; `lobster_plex_mock` doesn't claim to mirror auth routes. (Updated voice's "Skip when" branch made this a faster decision than before.)
- L3 (OpenClaw integration shard): skip — no `gateway/`, `container_proxy/`, or `plex_*` paths touched. (Updated `code.md` skip-when made this a 5-second check.)
- L4 (Azure Linux build): skip — no Dockerfile / pipeline YAML / `.dockerignore` changes.
- L5 (lobster_web wire-format): no aether wire-format touched. Index.html string substitution is two HTML placeholders — additive per L5.
- L6 (Feature-flag/rollback): the env-var-unset kill switch is the rollback path. PASS.
- L7 (Cross-repo ripples): AAD-FirstPartyApps registration is paired-PR follow-up; F1 makes the merge order moot.

## R4 — counter-search

Per surviving finding:
- **F1**: `redirectUri` grep returns one file (`msalAuth.ts`); `"/auth/callback"` returns one file (`docs/authentication-redirect-uris.md`). Nothing wires the two together. Galin-Iliev / dspektor approvals re-anchored at HEAD do not include the bundle wire-up. harryf peer-review at `18:42:09Z` does not flag F1 — but reads "Architecture: error-handling-on-external-calls PASS" and "E2E: All four primary runtime scenarios" — both of those are runtime-side. PR body's re-assertion that the bouncer is the active mechanism is the *premise* of the drift, not evidence of resolution. Finding survives.
- **F2**: no test pins the `redirectUri` ↔ `/auth/callback` contract. Survives.
- **F3**: PR body unchanged since `393c04f3`. Survives.
- **F4**: no other production consumer of `_getMsalInstance` exists. Survives. Pre-existing modifier added per updated `watches.md` branch.
- **F5**: doc + dev-start.sh remain inconsistent on `http`/`https`. Survives.
- **LQ1** (new): heuristic chain in `specs.md` returned root CLAUDE.md only; no auth-design doc.

## R5 — challenge

- "F1 is dead-code-not-runtime-bug": even in the most generous read (AAD app reg has both origin AND `/auth/callback` registered out-of-band), the 73-entry doc list is wrong (it doesn't list origin URLs) and the bouncer never executes — drift survives between the PR-described mechanism and the actual one. The category is now correctly `drift:code-code`, not strained-`drift:spec-code`.
- "F1 invokes W6 — too aggressive": no, watches.md W6 lobster-side surface explicitly names "MSAL `auth.redirectUri` configuration (must match the AAD app-registration redirect-URI list exactly — bundle vs doc-list drift is a W6 finding)." That is precisely F1.
- "F4 with `pre-existing` is bikeshedding": the JSDoc is older than this PR; the production import is new. Strong-with-modifier per the updated branch is the right tier — yields on follow-up + acknowledgment.
- "F3 is just stale prose": W9 non-material; Strong-tier — that's exactly what the verdict says.

## Findings raised but DROPPED at R4 or R5

Same dropped set as initial run, plus one re-categorization:

1. SignInWidget polling re-renders — already addressed in `dd55575`.
2. CSP `unsafe-inline` — bounded to a single static-string inline script; not a credential-class regression. Considered W6, dropped.
3. Per-request `tokio::fs::read_to_string` — harryf's lane.
4. `ServeDir::new(static_dir)` per-request — harryf's lane.
5. `warn_if_msal_template_missing` sync `std::fs::read_to_string` — harryf's lane (peer-review §1).
6. No browser e2e for fragment preservation — harryf's lane (peer-review SignInWidget unit-test follow-up); F2 covers the unit-test gap.
7. `response_mode=query` fragment leak — harryf raised in peer-review §4; not duplicating.
8. Test-count drift (PR body says "8" / actual 11) — folded into F3 instead of standalone (one body edit fixes both).
9. `MsalConfig` types diverge between Rust and TS — different surfaces with HTML placeholder string as the wire (additive).
10. `web.rs:120` ServeDir per-request edge case — `Infallible` per code; not a finding.

---

## Comparison to first verdict (`verdict-initial.md`)

### Findings re-classified under updated voice

| Finding | Initial category | Redux category | Reason |
|---|---|---|---|
| F1 | `[Major \| block \| drift:spec-code]` (forced) | `[Major \| block \| drift:code-code]` (clean) | Updated `voice.md` adds `drift:code-code`. The drift is between new Rust code (bouncer + doc) and existing TS code (`msalAuth.ts:106`); both are production code. The `drift:code-code` example block in `drift.md` cites this PR explicitly. The redirect-URI doc still applies as a sibling spec-code drift but is no longer the primary lens. |
| F2 | `[Major \| drift:code-tests]` | unchanged | Test-side projection of F1 — tests don't pin the contract. Same shape. |
| F3 | `[Major \| drift:pr-code]` | unchanged | PR body misdescribes TopNav at HEAD. Same shape. Folded test-count drift into the same finding instead of teasing apart. |
| F4 | `[Major \| drift:spec-code]` | `[Major \| drift:spec-code \| pre-existing]` | The `@internal Get MSAL instance (tests only).` JSDoc is older; this PR is the first production consumer. Updated `watches.md` "Pre-existing drift" branch fits exactly. Yield drops from "Strong" to "Strong-with-modifier" — yields on follow-up issue + acknowledgment. |
| F5 | `[Minor \| drift:pr-code]` (mistagged in initial) | `[Minor \| drift:spec-spec]` | Initial verdict header said `drift:pr-code` but body argued spec-spec. Redux makes the category honest: dev-start.sh comment ↔ redirect-URI doc are both spec surfaces; they disagree on the localhost scheme. |
| LQ1 (new) | not raised | `[LQ \| spec]` | Updated `specs.md` "When no spec exists" guidance made the missing `CLAUDE.md` + missing design doc legible as an LQ. Initial verdict noted the gap in process notes only. |

### Watches not in initial that fired in redux

- W6 (lobster-side surface): F1 now invokes W6 directly per the explicit lobster-side bullet added to `watches.md`. Initial verdict tagged F1 only under W10 — strictly correct, but missed the credential-class character of the finding. The `bot does not yield` rule applies twice now (W6 *and* W10 are both non-negotiable for F1).

### Pre-existing modifier usage

Used on F4. The updated voice rule reads cleanly: "Pre-existing rot becomes legible at exactly the moment a new PR touches it; that's the cheapest moment to notice." The first dogfood's voice-feedback v6 specifically asked for this — it's now there and applies straightforwardly.

### New findings the updated lenses surfaced

LQ1 (no `CLAUDE.md` for the auth surface) — the updated `specs.md` heuristic-chain + "When no spec exists" §made this raisable as LQ rather than buried in process notes. Substantively the same observation; structurally now in the ledger.

### Findings the updated lenses did NOT add

I half-expected the updated W6 surface list to make me find a *second* credential-class issue I missed last time. It didn't — re-evaluating the bouncer construction (CSP shape, `window.location.replace` same-origin path, no Authorization header forward), nothing new triggers. F1 remains the single credential-class finding. This is honest data, not a failure of the voice update.

### Did the voice updates measurably improve the output?

**Yes, on three concrete axes:**

1. **F1 categorization is no longer strained.** Initial dogfood explicitly flagged this in voice-feedback v5: "Spec-code drift is closest, but the drift is really between two pieces of code... feels like a forcing-function." The new `drift:code-code` category exactly fits, AND `drift.md`'s example block cites this very PR — meaning the next time the bot evaluates a similar drift, the category is already named for it.

2. **F4 has a proper tier.** Pre-existing-with-modifier yields on follow-up + ack, not on full fix-in-PR. That's a more accurate read of the situation (the singleton-getter design predates this PR; this PR shouldn't be the place to redesign it; but the JSDoc is now load-bearingly stale).

3. **R3 (lens evaluation) is faster.** Skip-when sections in `code.md` for L2/L3/L4 turned a careful read-through into a 5-second decision per lens. Estimated ~3 minutes saved on this PR; would scale linearly on PRs that touch fewer lens surfaces.

**Did the updates cause regressions?** No. F1's severity (Major | block) and yield (non-negotiable W6 + W10) are unchanged; the category change improves precision without weakening the hold. The pre-existing modifier on F4 doesn't downgrade severity — Major stays Major, the yield rule is just more explicit.

---

## Voice-file feedback v9+ (this is the iterate-the-voice signal, again)

### v9 — `grammar.md` works as a re-parse contract; one tightening needed

I followed `grammar.md`'s shape exactly: marker first, H2 header second, R0 §, Findings §, LQ §, footer. One thing tripped me up: `grammar.md` says the H2 header must be `## Architect Review — PR #<N> @ \`<short-sha>\`` and `<short-sha>` is "the first 9 characters." But the SHA in the marker is currently rendered as `<short-sha>` too — so does `:initial` carry a SHA in the marker, or only `:reeval:<sha>`? `grammar.md` §"Marker" lists the four marker forms and only `:reeval:<sha>` carries the SHA; but `:initial` and `:approve` headers still have the SHA in the H2. That's fine — the marker is the kind, the H2 carries the SHA — but `grammar.md` could spell out that the SHA-in-marker only appears for `:reeval`, and the SHA in the H2 is mandatory for `:initial`, `:reeval:*`, and `:approve`.

### v10 — `voice.md` Canonical finding example uses prose-y "Suggested fix"; my F1 needed a (a)/(b) structure

The canonical example shows `Suggested fix: move the assertion into ... Two regression tests pinning ... survive a future refactor.` — that's a single-sentence fix, fine for that finding. My F1's drift has two valid resolutions and the bot is required by `drift.md` not to pick. So the "Suggested fix" field for F1 has (a) wire it through, (b) drop the bouncer route. The canonical example doesn't show how to format multi-option drift fixes. Suggest adding a second canonical finding example (drift category) that shows the (a)/(b) shape with the "bot does not pick a side" disclaimer in the field.

### v11 — `voice.md` severity-vocabulary table doesn't say what to call a finding that's both W6 AND W10

F1 invokes W6 (credential class, non-negotiable) AND W10 (contract spec drift, non-negotiable). Both are non-negotiable. The header says `[Major | block | drift:code-code]` — there's no slot for "watch IDs invoked." The text in **Invariant** carries the W6 + W10 reference, which is fine. But for a re-parse-time reconstruction of yield-rule, it might be useful to either (a) add a `Watches: W6, W10` bold-prefix line per finding, or (b) have the parser extract watch IDs from the **Invariant** prose. Option (a) is cleaner for the parser. Optional.

### v12 — `watches.md` "Pre-existing drift" branch is clear; one phrasing nit

The branch reads: "Default tier: Strong-with-modifier. Yields on follow-up issue filed + author acknowledgment that this PR isn't the right place to fix." The implicit assumption is that the follow-up issue + ack happen in *PR comments*, not in the verdict itself. Confirmed by `voice.md` §"What this bot does NOT do" ("Author commentary or apology language — the bot does not editorialize"). One nit: the phrase "this PR isn't the right place to fix" is a thing the *author* asserts, not the bot. The bot's job is to register that the drift exists; the author's reply (containing follow-up issue link + ack) is what unlocks the yield. Could be phrased as "Yields after the author has filed the follow-up issue and posted an acknowledgment that the PR isn't the right place to fix it" to make the actor explicit.

### v13 — `code.md` skip-when sections are great; one missing case for L1

L1 (Rust safety) has no skip-when section, only a "Don't watch for" and a "Skip when" that says "The PR touches no `*.rs` files" + "Cargo.lock-only" + "no-Rust directory." For PR #634 the diff has Rust changes (config.rs, mod.rs, web.rs new, integration_test.rs) so L1 applies — but the changes are auth/MSAL plumbing, not the safety/error/async/panic surfaces L1 mostly watches. I evaluated L1 in full and produced no finding. Could be faster: a "Skip the safety/unsafe sub-bullets when the diff has no `unsafe` and no async-lock changes; skip the panic-discipline sub-bullets when the diff has no new `unwrap`/`expect`/`panic!` per `git diff | grep -E '\.unwrap\(\)|\.expect\(|panic!'`." This is incremental; not a v9 blocker.

### v14 — `drift.md` `drift:code-code` example block uses this PR; loop hazard?

`drift.md` §"`drift:code-code`" first example: *"Bundle's MSAL init defaults `auth.redirectUri = window.location.origin`. Backend `/auth/callback` route assumes `redirectUri = "/auth/callback"`. Both are production code; they disagree about which redirect URI is in use. (Reference: `bic/lobster#634` F1.)"* — that's exactly F1 in this verdict. Good for the bot (the example is canonical and self-grounding) but creates a tiny loop hazard: if the bot is asked to review #634 in the future, it should not just look up the example and copy F1 verbatim — it should re-derive F1 from the diff. Today's run did re-derive (verified at R0 by re-reading `msalAuth.ts:106`, `runtimeConfig.ts:11-16`, `index.html`); future ticks should preserve that discipline. Not a voice-file fix; just a note for the bot's R0 protocol: *"the example in `drift.md` may match the PR you're reviewing; do not skip the re-derivation."*

### v15 — `voice.md` active-PR rule needed a clearer "what counts as moved"

The voice says "If head SHA moved within last 5 min, post a `:hold` and stop." The PR's `pushed_at` field updated within 5 minutes (19:23Z) — but the head ref's commit timestamp was 70 minutes ago. I had to reason about which clock matters. `pushed_at` updates on *any* push to the repo, including merges to other branches; the head ref's commit timestamp is the actual "head SHA moved" signal. Could be tightened: "If the head ref's commit timestamp (`commits[-1].commit.author.date`) is within the last 5 minutes, post a `:hold` and stop. The repo's `pushed_at` field is not the right clock — it updates on any push."

### Voice-file v1-v8 status check

- **v1** (re-parse expectation) — `grammar.md` resolves this. Closed.
- **v2** (W6 lobster-shaped surfaces) — added the lobster-side bullet citing this PR. Closed.
- **v3** (specs.md heuristic 1 weakness on lobster) — `specs.md` now mentions the fallback chain explicitly when no `CLAUDE.md` exists. Closed.
- **v4** (L3 hard to apply) — `code.md` now has skip-when for L3. Closed.
- **v5** (no `drift:code-code` category) — added. Closed. v14 is a follow-up nit.
- **v6** (pre-existing tier) — `watches.md` "Pre-existing drift" branch. Closed. v12 is a phrasing nit.
- **v7** (head-SHA-scoping when force-pushing) — partially addressed by `voice.md` active-PR rule + 30-min wait window. v15 is a tightening.
- **v8** (terse-format finding-line gold standard) — `voice.md` Canonical finding example. Closed. v10 is a follow-up.

All eight v1-v8 items closed or follow-up'd. The voice updates measurably improved the output and addressed every concrete request from the first dogfood.

---

## Files relevant to the human reviewing this dogfood

- `C:\src\claws\packages\claws-review-bot\dogfood\lobster-634\verdict-redux.md` — the new verdict comment.
- `C:\src\claws\packages\claws-review-bot\dogfood\lobster-634\notes-redux.md` — this file.
- `C:\src\claws\packages\claws-review-bot\dogfood\lobster-634\verdict-initial.md` — the first verdict (for diff).
- `C:\src\claws\packages\claws-review-bot\dogfood\lobster-634\notes.md` — the first run's notes (v1-v8 voice feedback).
- `C:\src\claws\packages\claws-review-bot\dogfood\lobster-634\pr634.diff` — full PR diff cache (still valid, same SHA).
