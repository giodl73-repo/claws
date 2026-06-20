# Admin Session Context

## Agent Start

1. Read this file.
2. Read `projects/admin/README.md`.
3. Use `lobster-pr-ops` for Lobster PR checks and Azure pipeline state.
4. Use policy project context when the admin work touches managed OpenClaw
   policy baselines.

## Baseline

- Area: Lobster admin spaces, managed policy baselines, Partner Center
  registration, and tenant/global admin settings.
- Primary repo: `bic/lobster`.
- Related repo: `openclaw/openclaw` for policy baseline behavior.
- Main tracking files: `projects/admin/README.md`,
  `projects/admin/lobster-admin-spaces.md`,
  `projects/admin/partner-center.md`.
- Skill: `.agents/skills/lobster-pr-ops/SKILL.md`.

## Current Session

- Last updated: 2026-06-19.
- Last agent: Codex.
- Current focus: Policy admin stack has landed through the first feed-aware
  Scout policy slice. #2275 has merged with policy baseline state primitives and
  optional MOS3 policy-artifact metadata, #2270 has merged with OpenClaw policy
  bootstrap, and #3355 has merged with `scout policy preview` for tenant-feed
  package-defense/MOS3 block-status preview.
- Active branch / PR: #2275, #2270, #3355, and Partner Center prep doc #2422
  are merged; feed-related Lobster PRs through #3305 have landed enough to
  unblock the next policy-admin/feed pass.
- Known dirty state: `claws-hapi` had unrelated local edits before this
  update. #2422 merged on 2026-06-05 at merge commit
  `fe4837d5b8b193e0e9e68afde451845910aa6d92`.
- Storage decision for policy baselines: MOS3 stores and governs durable policy
  baseline artifacts. Lobster stores the selected artifact id/revision/hash and
  attestation metadata, resolves the effective baseline, and materializes the
  selected policy into OpenClaw. OpenClaw evaluates local policy conformance and
  does not fetch policy directly from MOS3 in this slice.
- The quarantine/admin policy slice should treat quarantined or failed package
  defense state as blocked for new discovery and install unless an explicit
  tenant or Microsoft exception outcome exists.

## Resume Checklist

- Run: check Lobster PR #3355.
- Latest live check on 2026-06-18: #2275 is open, non-draft, head
  `bf5f410f7bb8dd51c3c8f2bd4d6999c71dd39705`, with
  `Lobster-Runtime-PullRequest` and `Lobster-Runtime-Build-Validation` green,
  `GitOps/GitHubPop` failed, and review decision `CHANGES_REQUESTED`. #2270 is
  open, non-draft, stacked on #2275, head
  `94dc187ece60a6a7ed87dfcfab8a826f38520c83`, mergeable but unstable, with
  GitOps PoP and ADO failures from the stale bootstrap/package shape.
- Cleanup on 2026-06-18: #2275 was rebased cleanly onto Lobster `main`
  `038e4655c`, producing signed head
  `437bdc67158d0d7c99bf3dddb5a634febb10729a`, and force-pushed with lease.
  The branch now inherits current Lobster OpenClaw pins:
  `openclaw@2026.5.28`, `@openclaw/diagnostics-otel@2026.5.28`, and
  `@agents/tools@0.1.24`; the PR diff is back to the intended three-file
  policy-state primitive slice. Local proof passed
  `just cargo test admin_policy_baselines --no-fail-fast` (16 tests),
  `just cargo fmt --check`, and `git diff --check origin/main...HEAD &&
  git diff --check`. Required ADO builds were queued:
  PullRequest `168638566`, Build Validation `168638564`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/2275#issuecomment-183231981.
- Cleanup on 2026-06-18: #2270 was restacked onto refreshed #2275, resolving
  conflicts in `src/openclaw_container/package.json` and
  `src/openclaw_container/config/openclaw.plugins.json`. New signed head
  `40f7ac76a49aa68317f706b490b5976058c81a4e` preserves the current OpenClaw
  package shape and keeps `diagnostics-otel` while adding the `policy` plugin.
  Local proof passed `just openclaw-container-fmt-check` and `git diff --check
  user/giodl/lobster-admin-policy-state...HEAD && git diff --check`; direct
  local adapter `cargo test` is blocked by missing private `aether-rust` cargo
  registry auth. Required ADO builds were queued as the compile/test proof
  path: PullRequest `168640785`, Build Validation `168640781`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/2270#issuecomment-183235871.
- MOS3 update on 2026-06-18: #2275 was amended and force-pushed at signed head
  `dcafc451ea18dd1f713a437b0d03a27b58f7780f`. It adds optional
  `PolicyBaselineArtifactRef` metadata with `store=mos3`, artifact id,
  artifact revision, artifact hash, and optional attestation, plus docs/tests
  proving Lobster materializes policy locally for OpenClaw. Local proof passed
  `just cargo test admin_policy_baselines --no-fail-fast` (18 tests),
  `just cargo fmt --check`, and `git diff --check origin/main...HEAD &&
  git diff --check`. Fresh ADO queued: PullRequest `168655723`, Build
  Validation `168655719`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/2275#issuecomment-183260776.
- Restack on 2026-06-18: #2270 was rebased onto refreshed #2275 and
  force-pushed at signed head `5ed712c4c3b130fcd8d19a9a7fbb82aeb5e772e3`.
  Local proof passed `just openclaw-container-fmt-check` and `git diff --check
  user/giodl/lobster-admin-policy-state...HEAD && git diff --check`; direct
  local adapter cargo remains blocked by missing private `aether-rust` cargo
  registry auth. After ADO showed the code-mode container validator still
  expected the old plugin allowlist, the branch was amended to preserve the
  Policy plugin through `openclaw_plugins_override`, update
  `scripts/validate-code-mode-container.sh`, and add a regression test. Local
  proof passed `bash scripts/validate-code-mode-container.sh`,
  `just openclaw-container-fmt-check`, `cargo test openclaw_plugins_override
  --lib --no-fail-fast`, and `git diff --check
  user/giodl/lobster-admin-policy-state...HEAD && git diff --check`. Fresh ADO
  queued: PullRequest `168660798`, Build Validation `168660793`. Comment
  posted earlier:
  https://microsoft.ghe.com/bic/lobster/pull/2270#issuecomment-183260816.
- Codex review closeout on 2026-06-19: #2275 was rebased onto Lobster `main`
  `7a951b68e44cef44e86eddeb3d11ddcde9c344d2`, amended, signed, and pushed at
  head `55e0b5ad3085999fca3065c6d592156defc860a1`. Accepted fixes validate
  deserialized tenant accepted-reference matches and ignore artifact-only MOS3
  metadata drift when comparing OpenClaw policy identity. Local proof passed
  `just cargo test admin_policy_baselines --no-fail-fast` (21 tests),
  `just cargo fmt --check`, `git diff --check origin/main...HEAD && git diff
  --check`, and `codex review --base origin/main`. Fresh ADO queued:
  PullRequest `168677651`, Build Validation `168677649`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/2275#issuecomment-183306966.
- Codex review closeout on 2026-06-19: #2270 was restacked onto #2275 head
  `55e0b5ad3085999fca3065c6d592156defc860a1`, amended, signed, and pushed at
  head `5c92d2b4a9622142c598adc9fc8ad9ec66acc57e`. Accepted fixes preserve
  the Policy plugin through code-mode overlay validation, avoid Rust 1.85
  let-chains, reject symlinked policy parent ancestors before creating child
  directories, and point Docker warm-up at the baked
  `/opt/openclaw/config/policy.global.jsonc` baseline. Local proof passed
  `bash scripts/validate-code-mode-container.sh`,
  `just openclaw-container-fmt-check`,
  `cd src/openclaw_container; ..\..\cargo.sh test policy_bootstrap --lib
  --no-fail-fast`, `cargo test openclaw_plugins_override --lib
  --no-fail-fast`, warm-up generator smoke against a temp config copy, `git
  diff --check user/giodl/lobster-admin-policy-state...HEAD && git diff
  --check`, and `codex review --base user/giodl/lobster-admin-policy-state`.
  Fresh ADO queued: PullRequest `168677652`, Build Validation `168677650`.
  Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/2270#issuecomment-183306971.
- Merge-forward/re-review on 2026-06-19: #2275 merged at 2026-06-19T02:57:07Z.
  Copilot resolved #2270's conflict by merging current `main` into
  `user/giodl/lobster-admin-policy-bootstrap`, producing head
  `2790803da6ab04506120392e50046579aa702547` with a localized Dockerfile
  conflict resolution. Codeclaw approved that exact head at
  https://microsoft.ghe.com/bic/lobster/pull/2270#pullrequestreview-138639520.
  Asked Galin for exact-head re-review at
  https://microsoft.ghe.com/bic/lobster/pull/2270#issuecomment-183474091 and
  added Galin as a reviewer. Required ADO was manually queued because the
  Copilot merge-forward dropped the prior contexts: PullRequest `168739926` and
  Build Validation `168739924`; comment posted at
  https://microsoft.ghe.com/bic/lobster/pull/2270#issuecomment-183474241.
  Current visible blockers: `GitOps/GitHubPop` failed, ADO pending, and stale
  `CHANGES_REQUESTED` remains until Galin refreshes/dismisses the old review.
- #2270 merged on 2026-06-19 at 2026-06-19T16:02:05Z by giodl, merge commit
  `127727108ea36582b319f5917134d86131534ee1`, from head
  `2790803da6ab04506120392e50046579aa702547`.
- New stacked slice on 2026-06-19: #3355 was opened as draft from
  `user/giodl/lobster-scout-policy-cli`, stacked on
  `user/giodl/lobster-admin-policy-bootstrap`, at head
  `0c8e4aec1931a4db6e3d1dec27d0c9ca828a2dec`. It adds
  `scout policy preview --feed <approved.feed.json> [--json]` for
  tenant-approved feeds, verifies feed attestations, rejects non-tenant scopes,
  blocks `packageDefense.state=quarantined|failed` unless
  `packageDefense.exception=tenant|microsoft`, and emits allowed/warning/blocked
  preview output. Local proof passed `cd src/lobster_runtime;
  ..\..\cargo.sh fmt --check`, `cd src/lobster_runtime; ..\..\cargo.sh test
  scout_feed_cli --lib --no-fail-fast`, `git diff --check
  user/giodl/lobster-admin-policy-bootstrap...HEAD`, and `git diff --check`.
  Required ADO builds were queued: PullRequest `168683619`, Build Validation
  `168683617`. Initial GitHub state: draft, mergeable, `UNSTABLE`;
  `GitOps/GitHubPop` failed, `GitOps/FileAffordance` passed, ADO queued.
- #3355 restack on 2026-06-19: after #2270 merged, rebased only the Scout
  policy preview commit onto Lobster `main`
  `5d3391face4b9a0b13ea9b2f8beb27969cbf7c9d`, producing signed head
  `9f1b6e166cb695df88b43c461bb73952183bebe1`. The PR diff is now only
  `src/lobster_runtime/src/scout_feed_cli.rs` and
  `src/lobster_runtime/src/scout_feed_cli_tests.rs` (329 insertions / 1
  deletion). Local proof passed:
  `cd src/lobster_runtime; ..\..\cargo.sh fmt --check`,
  `cd src/lobster_runtime; ..\..\cargo.sh test scout_feed_cli --lib --no-fail-fast`,
  `git diff --check origin/main...HEAD`, and `git diff --check`. Force-pushed
  with lease, refreshed PR body, and commented proof at
  https://microsoft.ghe.com/bic/lobster/pull/3355#issuecomment-183517776.
  Fresh ADO queued: PullRequest `168750983`, Build Validation `168750985`.
  Current state: draft, mergeable, `GitOps/FileAffordance` passed,
  `GitOps/GitHubPop` failed, ADO pending.
- #3355 clippy fix on 2026-06-19: ADO PullRequest build `168750983` failed only
  `Lobster Runtime - Quality (fmt/clippy/build/deny)` on
  `clippy::redundant-closure-for-method-calls` in
  `src/scout_feed_cli.rs:981`. Amended the signed PR commit to head
  `ad6ce947661c6e7cddbde4883586dfee95269493`, changing
  `.filter(|character| character.is_ascii_alphanumeric())` to
  `.filter(char::is_ascii_alphanumeric)`. Local proof passed:
  `cd src/lobster_runtime; ..\..\cargo.sh fmt --check`,
  `cd src/lobster_runtime; ..\..\cargo.sh test scout_feed_cli --lib --no-fail-fast`,
  `cd src/lobster_runtime; ..\..\cargo.sh clippy --lib --tests --all-targets -- -D warnings`,
  `git diff --check origin/main...HEAD`, and `git diff --check`. PR body updated
  and proof comment posted at
  https://microsoft.ghe.com/bic/lobster/pull/3355#issuecomment-183588516. Fresh
  ADO queued: PullRequest `168759083`, Build Validation `168759084`.
- #3355 review fix on 2026-06-19: accepted dspektor's requested change that
  policy preview was only reading `packageDefense.state` and could report MOS3
  imported tenant-feed entries with `mos3.blockStatus`/`blockStatus` as allowed.
  Amended the signed PR commit to head
  `0eea3eb266717b3fcf4884272685206482078e57`, normalizing policy state from
  `packageDefense.state`, `mos3.blockStatus`, then `blockStatus`; `blocked`,
  `quarantined`, and `failed` now block unless the tenant/Microsoft exception is
  present. Added a regression test for MOS3-style blocked/quarantined metadata.
  Local proof passed:
  `cd src/lobster_runtime; ..\..\cargo.sh fmt --check`,
  `cd src/lobster_runtime; ..\..\cargo.sh test scout_feed_cli --lib --no-fail-fast`,
  `cd src/lobster_runtime; ..\..\cargo.sh clippy --lib --tests --all-targets -- -D warnings`,
  `git diff --check origin/main...HEAD`, and `git diff --check`. PR body updated
  and review response posted at
  https://microsoft.ghe.com/bic/lobster/pull/3355#issuecomment-183605831. Fresh
  ADO queued on the fixed head: PullRequest `168773470`, Build Validation
  `168773467`.
- #3355 CI formatter closeout on 2026-06-19: ADO PullRequest `168773470`
  failed the Lobster Runtime quality job because CI used the repo-required MS
  Rust formatter toolchain (`ms-prod-1.93`) and the previous local fmt pass used
  newer rustfmt output. Installed/selected the MS toolchain, applied the
  formatter-only diff, amended the signed PR commit to
  `5c51a7a99adead641cbc37c2593678157f53835b`, and force-pushed with lease.
  Local proof passed:
  `bash scripts/ci/check-rustfmt-ci-parity.sh && cd src/lobster_runtime && ../../cargo.sh fmt --check`,
  `cd src/lobster_runtime; ..\..\cargo.sh test scout_feed_cli --lib --no-fail-fast`,
  `cd src/lobster_runtime; ..\..\cargo.sh clippy --all-targets --no-deps -- -D warnings`,
  `git diff --check origin/main...HEAD`, and `git diff --check`. PR body updated
  and proof comment posted at
  https://microsoft.ghe.com/bic/lobster/pull/3355#issuecomment-183614666.
  Fresh ADO queued: PullRequest `168782471`, Build Validation `168782468`.
- RFC follow-up on 2026-06-19: OpenClaw RFC PR #6
  (`docs: update policy conformance exec approvals evidence`) was marked ready
  and squash-merged after #90003 landed the corresponding exec approvals work.
  Merge commit: `0e353436f90bcde4091c72d3c09225ea516c3654`.
- Verify: clear GitOps PoP for #2275 head `55e0b5ad3` and #2270 head
  `5c92d2b4a`. Attempting to rerequest failed check-runs
  `459735296` and `459738371` from this machine returned GitHub API `404`, so
  rerun likely needs the normal GitOps app/UI path or a fresh app-triggered
  update.
- #3355 merged on 2026-06-19 after the MOS3 block-status fix, CI formatter
  closeout, green ADO, and GitOps PoP clearance.
- #3383 opened on 2026-06-19 from
  `user/giodl/lobster-scout-policy-polish` at head
  `07b6a549520b303b22bffe487f5b1c9bdebe7eb3`. It handles the non-blocking
  Copilot/Galin polish after #3355: scope-before-attestation error ordering,
  readable human-facing reason text, and explicit read-only help text for
  `scout policy preview`. Local proof passed:
  `cd src/lobster_runtime; ..\..\cargo.sh fmt --check`,
  `cd src/lobster_runtime; ..\..\cargo.sh test scout_feed_cli --lib --no-fail-fast`,
  `cd src/lobster_runtime; ..\..\cargo.sh clippy --all-targets --no-deps -- -D warnings`,
  `git diff --check origin/main...HEAD`, and `git diff --check`. Required ADO
  was queued manually because only GitOps attached initially: PullRequest
  `168792050`, Build Validation `168792048`. Current visible blockers:
  GitOps PoP failed, ADO pending, review required.
- #3383 update on 2026-06-19: Galin requested changes after Copilot flagged raw
  metadata display text flowing into TSV preview reasons. Amended the PR to head
  `1423d19d236570ce2d5bac4bdc2125cbc0f23705`, trimming display values and
  replacing ASCII control characters before rendering while preserving
  normalized-token decision matching. Added tab/newline + mixed-case regression
  coverage. Fresh local proof passed `fmt --check`,
  `cargo.sh test scout_feed_cli --lib --no-fail-fast`, `clippy --all-targets
  --no-deps -- -D warnings`, and diff checks. Fresh ADO queued: PullRequest
  `168801728`, Build Validation `168801725`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3383#issuecomment-183636316.
- #3383 CI formatter fix on 2026-06-19: ADO failed on the CI MS Rust formatter
  changing `src/lobster_runtime/src/scout_feed_cli.rs`; Build Validation also
  had a transient EV2 ADO token validation failure and PullRequest had one E2E
  shard failure. Installed/selected the CI `ms-prod-1.93` toolchain path,
  applied the formatter-only diff, amended #3383 to head
  `ccb87b2ef12a1a1bf139c9ef8dd92ba56d352efc`, and force-pushed. Local proof
  passed `bash scripts/ci/check-rustfmt-ci-parity.sh && cd src/lobster_runtime && ../../cargo.sh fmt --check`,
  `cd src/lobster_runtime && ../../cargo.sh test scout_feed_cli --lib --no-fail-fast`
  (57 tests), `cd src/lobster_runtime && ../../cargo.sh clippy --all-targets --no-deps -- -D warnings`,
  and diff checks. Fresh ADO queued: PullRequest `168814220`, Build Validation
  `168814219`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3383#issuecomment-183646361.
- #3388 opened on 2026-06-19 from
  `user/giodl/lobster-personal-policy-mos3`, stacked on #3383, at head
  `a7b4296bb5ccbf39ffab249cb05d3c406bb59708`. It adds personal policy baseline
  state/model support: per-user personal records, MOS3 artifact requirement with
  artifact hash matching materialized policy content, OpenClaw equal-or-stricter
  acceptance against the tenant-effective baseline, and user bootstrap
  precedence of personal override, tenant override, then deployment default.
  Local proof passed `fmt --check`,
  `cargo.sh test admin_policy_baselines --lib --no-fail-fast`,
  `clippy --all-targets --no-deps -- -D warnings`, and diff checks. Fresh ADO
  queued: PullRequest `168801726`, Build Validation `168801724`. Comment
  posted:
  https://microsoft.ghe.com/bic/lobster/pull/3388#issuecomment-183636326.
- #3388 restack on 2026-06-19: rebased onto fixed #3383 head `ccb87b2ef`,
  applied CI formatter output in admin policy baseline files, fixed deserialized
  test fixtures to include `personal_baselines`, and removed direct indexing
  flagged by CI clippy. New head:
  `0b9f4af53f04ee3bb2488ff27a0be327d54aa518`. Local proof passed
  `bash scripts/ci/check-rustfmt-ci-parity.sh && cd src/lobster_runtime && ../../cargo.sh fmt --check`,
  `cd src/lobster_runtime && ../../cargo.sh test admin_policy_baselines --lib --no-fail-fast`
  (28 tests), `cd src/lobster_runtime && ../../cargo.sh clippy --all-targets --no-deps -- -D warnings`,
  and diff checks. Fresh ADO queued: PullRequest `168815581`, Build Validation
  `168815579`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3388#issuecomment-183647476.
- #3391 opened on 2026-06-19 from
  `user/giodl/lobster-policy-ux-gate`, stacked on #3388, at head
  `be39c6f7755324046569403eb552ec12f4829cd1`. It adds a real Policy UX
  preview hidden behind `?enablePolicyUx=1`, including scope selection,
  section tabs for tools/sandbox/model-network/gateway/channels/data-auth/exec
  approvals/plugins-feeds, selectable controls, strictness preview, generated
  policy JSON, and a disabled MOS3 save path. Local proof passed
  `npm run type-check`,
  `npx vitest run tests/pages/PolicyPage.unit.test.tsx tests/services/clientRoutes.unit.test.ts --project unit`,
  `npx biome check --formatter-enabled=true --linter-enabled=true --organize-imports-enabled=false --assists-enabled=false src/App.tsx src/services/clientRoutes.ts src/pages/PolicyPage.tsx tests/pages/PolicyPage.unit.test.tsx tests/services/clientRoutes.unit.test.ts`,
  and `git diff --check`. Playwright screenshot proof rendered
  `http://127.0.0.1:3011/?enablePolicyUx=1#/policy` successfully after
  waiting for the Policy heading. Required ADO queued: PullRequest `168806376`,
  Build Validation `168806373`.
- #3391 restack on 2026-06-19: rebased onto refreshed #3388 head `0b9f4af53`.
  New head: `65c516900147b665519128b16aaab356ed2cc1aa`. Local proof passed
  `npm run type-check`, targeted PolicyPage/clientRoutes Vitest, touched-file
  Biome check, and diff checks. Fresh ADO queued: PullRequest `168815951`,
  Build Validation `168815950`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3391#issuecomment-183647636.
- Next after #3388: live upload/admin endpoint for a user/admin personal policy
  artifact. It should call the accepted state path only after OpenClaw strictness
  comparison says the policy is equal-or-stricter than the effective
  tenant/global baseline. Store the accepted artifact in MOS3, record artifact
  id/revision/hash/attestation in Lobster state, reject weakening policies, and
  materialize the accepted policy locally into OpenClaw. Later
  enforcement-readiness items remain:
  most-restrictive-wins, exception semantics, unknown token warnings, and JSON
  wire stability coverage.
- Rule: every Lobster PR must show green `GitOps/GitHubPop`,
  `Lobster-Runtime-PullRequest`, and `Lobster-Runtime-Build-Validation`.
  Manually queue both ADO pipelines when path filters do not attach them.
- Review: do not present Redis-only admin state as final durable customer
  authority.
- Update: this file and `projects/admin/README.md` when stack state changes.

## 2026-06-20 Update

- #3383 merged at `af6bfa7c8350d33c88160e541e1e42cdb0ff6060` with final head
  `ccb87b2ef12a1a1bf139c9ef8dd92ba56d352efc`.
- #3388 was automatically retargeted to `main` and remains at head
  `0b9f4af53f04ee3bb2488ff27a0be327d54aa518`. Required ADO umbrellas
  `168815581` and `168815579` are green. Remaining blockers are
  `GitOps/GitHubPop` and review (`REVIEW_REQUIRED`). Status comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3388#issuecomment-183653976.
- Later 2026-06-20 refresh: #3388 review decision is now `APPROVED` after
  dspektor's approval; Galin and emiranda both left non-blocking comments.
  Required ADO remains green. Only visible merge blocker is `GitOps/GitHubPop`.
- #3391 is open, non-draft, stacked on #3388 at
  `65c516900147b665519128b16aaab356ed2cc1aa`. Review decision is `APPROVED`
  and required ADO umbrellas `168815951` and `168815950` are green. Remaining
  blockers are `GitOps/GitHubPop` and the stack dependency on #3388 landing.
- #3388 merged on 2026-06-20 at merge commit
  `f9278926e10b9f0ecc77eb1d6fc2824d9ce6fd34` with final head
  `0b9f4af53f04ee3bb2488ff27a0be327d54aa518`.
- #3391 was automatically retargeted to `main` and remains at head
  `65c516900147b665519128b16aaab356ed2cc1aa`. Required ADO umbrellas
  `168815951` and `168815950` are still green. Current GitHub state is
  `MERGEABLE`/`BLOCKED`; visible blockers are `GitOps/GitHubPop` and refreshed
  formal review (`REVIEW_REQUIRED`) after the retarget.
- #3391 rebase on 2026-06-20: rebased onto current Lobster `main`
  `0ad443d8b`, resolving conflicts by preserving both the landed Feeds route
  and the gated Policy UX route. New head:
  `20c0682a9d5fa7505c995244a3f0c5c369c670cb`. Local proof passed
  `npm run type-check`, targeted PolicyPage/clientRoutes Vitest (9 tests),
  touched-file Biome, and diff checks. Fresh ADO queued: PullRequest
  `168860003`, Build Validation `168860002`. Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3391#issuecomment-183686141.

## Guardrails

- Keep admin authorization, policy baseline, and Partner Center submission notes
  here.
- Keep feed catalog implementation in feeds/Scout notes, not admin notes.
- Do not prototype Lobster implementation code in `claws-hapi`.

## Open Threads

- Durable admin storage decision.
- Partner Center registration material and proof.
- How feed settings later reuse the admin global-floor plus tenant-subset model.
- Direct ADO build-validation trigger may be needed when the required check does
  not attach automatically; see `projects/admin/lobster-admin-spaces.md`.
