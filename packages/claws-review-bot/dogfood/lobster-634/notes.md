# notes — claws-lobster-architect dogfood on bic/lobster#634

Process notes, dropped findings, and voice-file feedback. Not the verdict; see `verdict-initial.md` for that.

## Run identity

- **Target**: bic/lobster#634 — feat(runtime,web): MSAL auth-redirect for /web (sign-in flow) by harryf.
- **Head SHA at R1 start**: `7e6e0d541ca0031088aeb010daf077686c5517cd` (HEAD as of run; per voice.md head-SHA-scoping rule, all findings are scoped to this SHA).
- **Base**: `9b96178979059f036683333c0b641adf1b7fa6d7` (`main`).
- **PR shape**: 12 files, +864 -117, 7 commits. Latest commit `7e6e0d54` is a substantial late-stage refactor that removed the SignInWidget's pre-sign-in button.
- **Other reviewer activity**: 16 review comments (mostly Copilot inline + author replies), 23 issue comments (Galin-Iliev `automaton` re-anchored 4 times, all approve; harryf peer-review surfaced e2e-coverage gaps; `dspektor` re-anchor at `f56c9466`).

## R0 — sources of truth

**PR claim digest** (5 material claims): see verdict §"Sources of truth" — all five extracted from the PR body and tagged C1-C5.

**Specs read**:
- `CLAUDE.md` (root) — orientation, no auth contract.
- `docs/authentication-redirect-uris.md` (heavily modified by this PR) — the producer-side AAD-FirstPartyApps contract.
- `src/lobster_web/src/services/msalAuth.ts` (existing, unchanged in this PR) — module-doc: "SINGLE source of truth for MSAL initialization and token acquisition." This is the spec for the bundle's MSAL behavior. F1 grounds in `msalAuth.ts:106`.
- `src/lobster_web/src/services/runtimeConfig.ts` (existing, unchanged) — `LobsterMsalConfig` shape.
- `src/lobster_web/index.html` (existing, unchanged) — pre-bundle MSAL stash.
- Issue `bic/lobster#298` — original design doc; identifies the open question on redirect-URI shape that this PR ostensibly resolves.

**Specs not found**:
- No `src/lobster_runtime/CLAUDE.md` and no `src/lobster_web/CLAUDE.md` — per root CLAUDE.md, the repo doesn't currently have package-level CLAUDE.md files. Heuristic 1 (walk-up CLAUDE.md) returned only the root one.
- No `docs/design/auth-redirect.md` or similar. The redirect-URI doc and msalAuth.ts module-doc are the closest things to an auth design spec.
- This is itself a noteworthy spec gap for a feature with this much surface area — but not load-bearing enough to escalate to its own finding given the redirect-URI doc fills most of the contract role.

**Drift hypotheses formed at R0** (each evaluated):
- H1 (bouncer ↔ bundle wiring) → F1, survived R4 + R5.
- H2 (PR body vs latest commit on TopNav) → F3, survived.
- H3 (docs claim "confirmed" but bundle disagrees) → folded into F1.

## R1 — full reads

Fetched the full diff (1416 lines) and read every changed file. Cross-referenced peer files via the `bic/lobster` `contents` API for unchanged files in the auth path (msalAuth.ts, runtimeConfig.ts, index.html, index.tsx). All five voice files re-read at the start.

## R2 — drift check

Worked through:
- PR claim ↔ code: H1, H2, H3 surfaced. C1+C2+C3 form a chain that requires `redirectUri = '/auth/callback'` to be set on the MSAL client; nothing in the diff or surrounding code does that. C4 contradicted by `7e6e0d54`.
- spec ↔ code: `authentication-redirect-uris.md` (post-diff) lists 73 `/auth/callback` URIs as the contract; `msalAuth.ts:106` defaults `redirectUri` to origin. Code violates the doc.
- spec ↔ spec: dev-start.sh and the redirect-URI doc disagree on `http` vs `https` for localhost (F5).
- code ↔ tests: no test pins the redirect-URI value (F2).

## R3 — lens results (terse)

- L1 (Rust safety): no new unsafe / unwrap / `#[allow]` / async-lock issues. No finding.
- L2 (plex-mock): not applicable; no plex-mock surface touched.
- L3 (OpenClaw integration shard): no finding; new `/auth/callback` route is an additive sibling of `/health/*`, doesn't conflict with existing gateway routing.
- L4 (Azure Linux build): no Dockerfile/pipeline YAML changes. No finding.
- L5 (lobster_web wire-format): no aether wire-format touched. No finding.
- L6 (Feature-flag/rollback): kill switch is the env-var unset; rollback is trivial (unset env var, redeploy). PASS.
- L7 (Cross-repo ripples): AAD-FirstPartyApps repo is the paired-PR target; explicitly acknowledged as out-of-scope follow-up. F1 makes merge-order question irrelevant — the integration is broken regardless of AAD-FirstPartyApps merge order.

## R4 — counter-search

For each surviving finding, searched for evidence the finding was wrong:
- F1: grep across the repo for `redirectUri` returns only `msalAuth.ts`; for `/auth/callback` returns only `docs/authentication-redirect-uris.md`. PR body re-asserts the bouncer is the active mechanism — but per drift.md, re-asserting one side doesn't resolve the drift.
- F2: no test in the diff or the surrounding repo asserts the redirect-URI ↔ bouncer contract.
- F3: PR body has not been updated since the original push; author acknowledged the refactor in an inline reply but did not refresh the body.
- F4: no other production consumer of `_getMsalInstance` was found.
- F5: doc explicitly addresses the http/https split but the dev-start.sh comment disagrees.

## R5 — challenge

Strongest case the PR is fine: "AAD has both origin and `/auth/callback` registered out-of-band; the bouncer is forward-looking; F1 is a perception drift, not a runtime drift." Counter: even in that branch, the 73-entry doc list is wrong (it doesn't list the origin URLs that AAD allegedly already accepts), and the bouncer never executes. Drift between the PR body's described mechanism and the real one stands. Finding survives.

Second challenge: "F3 is just stale prose, not a contract drift." Counter: per W9, the PR body becomes a changelog entry; misrepresentation poisons downstream readers. Strong-tier (non-material), not Major-block. Severity correctly tagged.

Third challenge: "F4 is bikeshedding — the `@internal` annotation is informal." Counter: the JSDoc is the spec. Drift.md is explicit that comment-as-spec drift is a finding. Severity is Minor / Strong-tier per W11; correctly tagged.

## Findings raised but DROPPED at R4 or R5

1. **`SignInWidget` polling re-renders**: Copilot already raised this; harryf already addressed it in `dd55575` with the `prevId === nextId` short-circuit. Not novel — voice.md says don't duplicate `harryf`'s lane.

2. **CSP allows `unsafe-inline`**: considered raising under W6 (credential/redirect-handling). Dropped: the bouncer HTML is a static string in Rust with no untrusted input; `unsafe-inline` here is bounded to a single inline script with no DOM-injection surface. Not a credential-class regression.

3. **Per-request `tokio::fs::read_to_string` on `index.html`**: perf-class, harryf's lane (Soft / out-of-scope per voice.md).

4. **`ServeDir::new(static_dir)` per request in `serve_static_asset`**: same — Soft, harryf's lane.

5. **`warn_if_msal_template_missing` does sync `std::fs::read_to_string` from `build_router`**: harryf already raised at peer-review `128923901`. Not duplicating.

6. **No browser e2e for fragment preservation**: harryf raised as `e2e-redirect-roundtrip` at `128763941`. F2 grounds in the same gap but at the unit-test level, which is closer to the actual contract. Not double-charging.

7. **PR-claim drift on test count**: PR body says "8 new ones for MSAL env-var parsing, /auth/callback bouncer, and /web/ substitution branches"; diff shows 6 config tests + 5 route tests = 11. Galin-Iliev's automaton said "6 + 6"; harryf peer-review at `128923901` said "12". Counted myself: config.rs has 6 `#[test]` additions in this diff, routes/mod.rs has 5 `#[tokio::test]` additions = 11. Considered raising as W9 non-material drift but: (a) the PR body's wording ("including 8 new ones") is hedge-y enough that "11 of which 8 cover MSAL specifically" is plausibly the intended reading; (b) per voice.md / watches.md, non-material claims yield on PR body update — pursuing this in addition to F3 (which already requires a body update) is duplicate yield. Folded into F3 implicitly: when the body gets refreshed for the SignInWidget description, the test count should be corrected too.

8. **`MsalConfig` types diverge between Rust (`config.rs:42`) and TS (`runtimeConfig.ts:20`)**: Rust has `client_id, authority`; TS has `clientId, authority, scopes?, loginMethod?`. Not a drift — they're different surfaces (Rust = env-var producer, TS = bundle consumer); the wire is index.html string substitution, not a typed schema. Considered raising as L5 lobster_web wire-format drift but the wire here is two HTML placeholder strings, which is what L5 calls additive. Dropped.

9. **`web.rs:120` constructs `ServeDir::new(static_dir)` per request — could fail if `static_dir` becomes unreadable mid-request**: edge case; `ServeDir` returns `Infallible` per the comment in code. Code is correct; not a finding.

## Voice-file feedback (this is the iterate-the-voice signal)

These are observations from running the protocol on a real PR. Each is something I noticed felt off; treat as input for the next pass on the voice files.

### v1 — `voice.md` "Re-parse expectation" is underspecified

The closing paragraph says re-parsing the previous comment is the ledger and that "templates in `verdicts.md` (when written) are authoritative." Neither `verdicts.md` nor `grammar.md` exists yet. I made up a finding-status block at the bottom (`Status: open`). For dogfood it's fine; for the real bot tick a stable parsable shape needs to exist now, not later. Concrete asks:
- Pin a finding-id grammar (`F1` vs `F-001` vs `F1.1`?).
- Pin status keywords (I used `open`; spec also mentions `resolved`, `wontfix-asserted`, `superseded` — consistency check needed).
- Pin the file:line citation form. I used `path/to/file.ext:line` and `path/to/file.ext:line-line`. Mixing inline backticks and ranges is fine; pinning whether `line:col` is allowed would be useful (ilygre style on aether sometimes uses col).

### v2 — `watches.md` W6 "credential / redirect-handling regressions" is the right scope but the surfaces list is aether-shaped

W6's "Surfaces" examples are all httpx / token-redirect ones from aether. On lobster, the credential surfaces are different: MSAL `auth.redirectUri`, AAD app-reg redirect-URI list, OAuth fragment carrying through `window.location.replace`, CSP shape on the bouncer page, scope strings passed to `loginRedirect`. F1 is W6-adjacent (a misconfigured redirect URI is a redirect-handling failure), but not the same flavor as the aether-side examples. Either:
- W6 surfaces should add an explicit lobster-side bullet ("MSAL `auth.redirectUri` ↔ AAD app-reg redirect-URI list mismatch"), or
- a new W12 "AAD redirect-URI contract" is split out from W6 with its own non-negotiable status.
I tagged F1 under W10 (contract spec ↔ code drift) instead, because the redirect-URI doc reads as a contract and that fit cleaner. But the credential-class character of the finding is also real. The voice could be sharper here.

### v3 — `specs.md` heuristic 1 (walk-up CLAUDE.md) is weak when the repo doesn't use package-level CLAUDE.md

Lobster has only a root CLAUDE.md. The runtime and web packages don't have CLAUDE.md files. Heuristic 1 produces the root file every time, which is an orientation doc, not a contract. The fallback then becomes heuristic 4 (API-REFERENCE) which doesn't exist on lobster either, and heuristic 5 (adjacent README) — the package READMEs are user-facing build instructions, not contracts. Effectively for lobster, the heuristic chain hands me to the inline doc comments (heuristic 6) faster than the repo-walk does, but specs.md presents that as a last-resort. Suggest reordering for repos like lobster where inline doc-comments and module-level docstrings are the load-bearing spec.

### v4 — `code.md` L3 (OpenClaw integration shard) is the lens I struggled most to apply

This PR has zero gateway / dispatch / snap-restore changes, but L3 is non-trivially worded — I had to walk it line-by-line to confirm none of its bullets fired. Suggest a "negative shape" hint: "Skip L3 entirely if no file under `src/lobster_runtime/src/{gateway,container_proxy,plex_*}` is touched." That would have saved me a careful read-through. Same suggestion for L4 (skip if no `Dockerfile` or `*.yml` in pipeline paths), L2 (skip if no `lobster_plex_mock` divergence).

### v5 — `drift.md` four-truths model lacks a "code ↔ code" category

F1 is a drift between the new Rust code (`web.rs::auth_callback` + `mod.rs:51`) and the existing TypeScript code (`msalAuth.ts:106`). Spec-code drift is closest, but the drift is really between two pieces of code (one new in this PR, one existing) that are supposed to wire together. The drift framework treats spec as the third pillar, so I categorized it as `drift:spec-code` using the redirect-URI doc as the spec — which is correct, but feels like a forcing-function. Consider adding `drift:code-code` for "two code surfaces that should wire together but don't" — common in cross-component PRs that span Rust + TS in this monorepo. Or explicitly note that `drift:spec-code` covers comment-as-spec / module-doc-as-spec cases.

### v6 — yield model needs an explicit "pre-existing drift, surfaced by this PR" tier

F4 (`_getMsalInstance` `@internal` boundary leak) was introduced by this PR but the underlying smell — exposing a singleton-getter as an `@internal` export — is older. Voice.md says "Pre-existing tech debt in touched files — out of scope unless this PR introduces or worsens it." This PR worsens it (first production consumer). I raised it as Minor. The voice could be more explicit on this branch: "if a PR is the first consumer of a previously-only-test-used API, the `@internal` boundary is now wrong; it's a finding."

### v7 — head-SHA scoping when PRs have force-pushes

The PR has 7 commits including merge commits. Other reviewers (Galin-Iliev) re-anchored 4 times at different SHAs. The voice's head-SHA-scoping rule says "If the PR head moves during review, we abort and start over on the new SHA" — but in practice on a real bot loop, the head moves several times during a single human-review cycle. This is fine; the voice handles it via `:reeval:<sha>` markers. But specs.md or voice.md could note that the typical first-tick on an active PR is a hold (the merge-block hold marker) until the head settles, then a full review. I produced an `:initial` review on the live HEAD without holding first. For dogfood that's fine; for a real bot loop, holding first might prevent wasted cycles.

### v8 — terse-format finding-line gold standard would help

The voice gives severity / category templates, but the worked-example findings in voice.md / watches.md / drift.md are prose (the "Examples" lines). I had no canonical full finding to imitate — the closest reference is the prose in drift.md §"Examples." The next iteration of voice could include a single full F1-style finding (with the citation, drift, counter-search, yield, status block) as a gold standard for new bot ticks to match. Currently the bot has to invent the layout from voice.md's severity table.

## Files relevant to the human reviewing this dogfood

- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\verdict-initial.md` — the verdict comment to be reviewed for voice.
- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\notes.md` — this file.
- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\pr634.diff` — full PR diff cache.
- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\issue-comments.json` — 23 issue comments cache.
- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\review-comments.json` — 16 review comments cache.
- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\files.json` — 12-file file list cache.
- `C:\src\claws-hapi\packages\claws-review-bot\dogfood\lobster-634\commits.json` — 7-commit cache.
