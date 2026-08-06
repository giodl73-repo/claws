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

- Last updated: 2026-07-22.
- Last agent: Codex.
- Current focus: non-draft Lobster PR #5422 implements M5 #867 using native
  MAC/MOS3 availability for the existing Scout Teams app. Lobster reads the
  targeted title preview, caches the caller-scoped decision, and composes it
  with the existing operator/ECS enrollment gate. There is no Lobster-owned
  setting, custom policy, declarative-agent surface, or runtime profile. The
  broader reuse readout remains:
  OpenClaw has interactive config/onboarding, schema-driven Control UI, strict
  config CLI/dry-run/validate, doctor repair, and policy conformance surfaces
  that map into Lobster policy/feed/admin previews.
- Active branch / PR: highest-priority #5422 on
  `user/giodl/scout-tenant-availability` in
  `C:\src\lobster-scout-tenant-availability`, commit `8feadccf92`, pushed to
  the `giodl/lobster` fork and marked ready. The first ADO runs exposed a
  missing ECS inventory entry and CI-toolchain lints; all were repaired in the
  current head. The blocking review is now addressed: an armed ECS availability
  gate fails closed on cold resolution failure or missing resolver, while a
  previously resolved caller retains the last-known decision after refresh
  failure. Direct resolver discovery/remap/reacquisition/title/cache tests were
  added. The branch merged current `main`; Rustfmt and diff checks pass, while
  local runtime compilation and Codex review timed out without findings. A
  current-head review's one contract-text finding was fixed by aligning the ECS
  schema comment. PullRequest `173354991` failed only in auto-injected Component
  Detection amid agent/service warnings; replacement `173385787` is queued on
  exact merge `b63b4647ac`. Build Validation `173355013` exposed the same
  missing-web-bundle failure as scheduled current-main run `173356043`, so the
  blocker is a shared pipeline regression rather than #5422 source. Focused fix
  #5495 restores the published `BuildWeb` artifact handoff at `7d76d8ff68`;
  PullRequest `173387944` and Build Validation `173387953` are queued on its
  exact merge `f044795806`. #5422 remains mergeable but has refreshed review
  pending; GitOps FileAffordance is green and GitHubPop requires user proof.
  The older draft Lobster stack is
  #3585 -> #3586 -> #3588 -> #3590
  -> #3603 -> #3607 -> #3623 -> #3693. #3693 branch
  `user/giodl/lobster-policy-admin-read-ux` lives in
  `C:\src\lobster-policy-default-config`. #2275, #2270, #3355, #3383, #3388,
  #3391, Partner Center prep doc #2422, and MAC registration refresh #3555 are
  merged.
- Rendezvous issue implementation: Lobster #5422 is open as the focused PR for
  #867. No separate Rendezvous repo PR is required for this runtime slice.
- Known dirty state: `claws-hapi` had unrelated local edits before this
  update. #2422 merged on 2026-06-05 at merge commit
  `fe4837d5b8b193e0e9e68afde451845910aa6d92`.
- Storage decision for policy baselines: MOS3 stores and governs durable policy
  baseline artifacts. Lobster stores the selected artifact id/revision/hash and
  attestation metadata, resolves the effective baseline, and materializes the
  selected policy into OpenClaw. OpenClaw evaluates local policy conformance and
  does not fetch policy directly from MOS3 in this slice.
- MAC/M365 admin center registration note from Aether review: public
  app/package distribution remains Partner Center or Microsoft 365/Teams admin
  center upload/preinstall. Aether's MOS3 path is runtime-side: discover the
  tenant MOS3 titles URL, mint MOS3-scoped user OBO tokens, query Titles &
  Acquisitions for `AgentSkills`/`AgentConnectors`, and register discovered
  connectors dynamically for TGS auth. Aether's proposed admin/publisher flows
  proxy MOS3 builder/admin endpoints using user OBO; tenant-admin gating is a
  local `wids`-claim precheck before forwarding to MOS3.
- WorkIQ/Aether MAC audit on 2026-07-21 established the #5422 storage
  direction. Cowork's `x-policies` overlay applies to its existing declarative
  agent, but Scout ships as a Teams tabs app and must use MAC's native title
  availability/block controls. MOS3 is authoritative; Lobster reads targeted
  marketplace title preview state with a user OBO token, caches it, and
  enforces explicit denial after operator enrollment. #5422 removes the
  file-backed authoritative state and custom PUT without inventing a profile,
  `gpt.json`, `x-policies`, or a declarative agent. Registration only needs to
  publish the existing Teams package and supply environment-specific MOS3 title
  ids; the stable AppId already exists in the manifest. Failure semantics:
  retain a last-known value after successful resolution; before the first
  successful resolution, an armed ECS gate fails retryably rather than granting
  access. ECS enforcement defaults off.
- The quarantine/admin policy slice should treat quarantined or failed package
  defense state as blocked for new discovery and install unless an explicit
  tenant or Microsoft exception outcome exists.
- Next Lobster policy-admin implementation slice after #3607: quarantine
  enforcement.

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
- #3391 Copilot feedback fix on 2026-06-20: amended head to
  `a07e8915e9397d9920e9a1e2930178c3ab02f24d`. Fixes preview correctness by
  building generated policy/strictness from all selected controls across every
  section for the active scope, while keeping the current section as the render
  filter. Policy preview JSON now emits nested overlay objects from dotted
  policy paths. Updated tests to parse the JSON preview, assert nested shape,
  and prove cross-section selections are retained. Local proof passed
  `npm run type-check`, targeted PolicyPage/clientRoutes Vitest (10 tests),
  touched-file Biome, and diff checks. Resolved the three Copilot threads.
  Fresh ADO queued: PullRequest `168861357`, Build Validation `168861356`.
  Comment posted:
  https://microsoft.ghe.com/bic/lobster/pull/3391#issuecomment-183686641.

## 2026-06-23 Update

- MAC registration refresh: opened Lobster #3555 from
  `user/giodl/lobster-mac-registration-refresh` at head
  `44cc96c649019e2b62353d40f4afdb385ca1f1dd`. It updates
  `docs/partner-center-registration.md` to make #2422's prep packet
  actionable for filing: register the M365 app package through Partner Center
  or Microsoft 365/Teams admin center, keep MOS3 as catalog/governance
  authority, mirror Aether/Cowork runtime discovery with MOS3-scoped OBO and
  tenant titles environment discovery, and add validation/open-decision items
  for MAC package proof and MOS3 integration proof. Local proof:
  `git diff --check`. PR comment:
  https://microsoft.ghe.com/bic/lobster/pull/3555#issuecomment-184318121.
  Required ADO manually queued because only GitOps attached initially:
  PullRequest `169222837`, Build Validation `169222908`. Current visible state
  at filing: `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed, ADO
  queued/pending.

## 2026-06-24 Update

- Live GHE check: #3391 merged on 2026-06-20 at head
  `a07e8915e9397d9920e9a1e2930178c3ab02f24d`.
- Live GHE check: #3555 merged on 2026-06-24 at head
  `44cc96c649019e2b62353d40f4afdb385ca1f1dd`.
- `gh pr checks` showed all required contexts green on both final heads:
  `GitOps/GitHubPop`, `Lobster-Runtime-PullRequest`, and
  `Lobster-Runtime-Build-Validation`.
- Lobster personal-policy upload/admin progress opened draft PR #3585 from
  worktree `C:\src\lobster-personal-policy-upload`, branch
  `user/giodl/lobster-personal-policy-upload`, head
  `d101becd8c9188af5b66f92cd5677e8dfbb1ccc9`, based on Lobster `origin/main`
  `a7df08c85`. This first live write slice adds authenticated
  `POST /v1/policy/personal/accept`, gated by
  `LOBSTER_POLICY_BASELINE_STATE_PATH` plus
  `LOBSTER_POLICY_BASELINE_STORAGE_DURABLE=true`, requiring a MOS3 artifact ref
  and OpenClaw comparison attestation before calling the #3388
  equal-or-stricter personal baseline state path. It also adds a web
  `policyApi` client for the route, but intentionally does not wire the Policy
  UX save button until the UI has a real MOS3 artifact/upload source.
- Local proof for that branch passed:
  `cd src/lobster_runtime && bash ../../cargo.sh fmt --check`,
  `bash ../../cargo.sh clippy --lib -- -D warnings`,
  `bash ../../cargo.sh test policy --lib --no-fail-fast` (103 tests),
  `cd src/lobster_web && npm run type-check`,
  `npx vitest run tests/services/policyApi.unit.test.ts --project unit`, and
  touched-file Biome for `policyApi.ts` / `policyApi.unit.test.ts`.
- Required ADO was manually queued for #3585 because no checks attached
  initially: PullRequest `169344001`, Build Validation `169344000`.
- Stacked draft PR #3586 opened from branch
  `user/giodl/lobster-policy-ux-save`, based on #3585 branch
  `user/giodl/lobster-personal-policy-upload`, head
  `ac17a114216c70c4d57b7ef4d37a94addc8d8042`. It wires the gated Policy UX
  save button to `policyApi.acceptPersonalPolicy`, adds explicit MOS3 artifact
  id/revision/attestation and OpenClaw comparison attestation fields, computes
  the SHA-256 over the generated policy JSON before save, and surfaces
  success/error status. This is artifact-selection save wiring, not a
  policy-specific MOS3 publish/upload backend.
- Local proof for #3586 passed:
  `cd src/lobster_web && npm run type-check`,
  `npx vitest run tests/pages/PolicyPage.unit.test.tsx tests/services/policyApi.unit.test.ts --project unit`
  (8 tests), touched-file Biome for `PolicyPage.tsx`, `PolicyPage.unit.test.tsx`,
  `policyApi.ts`, and `policyApi.unit.test.ts`, plus `git diff --check`.
- Required ADO was manually queued for #3586:
  PullRequest `169347041`, Build Validation `169347040`.
- Stacked draft PR #3588 opened from branch
  `user/giodl/lobster-policy-mos3-upload`, based on #3586 branch
  `user/giodl/lobster-policy-ux-save`, head
  `d516124c91aef0e949042b80e60a0d2b6ffe1020`. It adds
  `POST /v1/policy/personal/artifacts/publish`, packages generated policy
  JSONC for MOS3, mints MOS3 OBO tokens from the caller assertion, returns a
  hash-bound artifact ref for synchronous publishes, and updates the gated
  Policy UX save path to publish first and only call accept when an artifact is
  returned. Pending MOS3 publishes surface as submitted/pending and do not write
  Lobster policy state.
- Local proof for #3588 passed:
  `cd src/lobster_runtime && bash ../../cargo.sh fmt --check`,
  `bash ../../cargo.sh test policy --lib --no-fail-fast` (107 tests),
  `bash ../../cargo.sh test scout_mos3_publish --lib --no-fail-fast` (8 tests),
  `bash ../../cargo.sh clippy --lib -- -D warnings`,
  `cd src/lobster_web && npm run type-check`,
  `npx vitest run tests/pages/PolicyPage.unit.test.tsx tests/services/policyApi.unit.test.ts --project unit`
  (10 tests), touched-file Biome for Policy UX/API files and tests, plus
  `git diff --check`.
- Required ADO was manually queued for #3588:
  PullRequest `169350500`, Build Validation `169350496`.
- Stacked draft PR #3590 opened from branch
  `user/giodl/lobster-policy-materialization`, based on #3588 branch
  `user/giodl/lobster-policy-mos3-upload`, head
  `371d30e6910034b646be83aa673288065f9aa4cd`. It resolves the effective user
  policy baseline from durable Lobster policy state during gateway start option
  construction and projects `LOBSTER_OPENCLAW_POLICY_BASELINE_JSONC` plus
  managed policy delivery env into OpenClaw starts. Projection only activates
  when `LOBSTER_POLICY_BASELINE_STORAGE_DURABLE=true`; a configured but missing
  durable state path disables managed policy delivery for that start.
- Local proof for #3590 passed:
  `cd src/lobster_runtime && bash ../../cargo.sh fmt --check`,
  `bash ../../cargo.sh test gateway_proxy::start_options --lib --no-fail-fast`
  (38 tests), `bash ../../cargo.sh test admin_policy_baselines --lib --no-fail-fast`
  (28 tests), `bash ../../cargo.sh test policy --lib --no-fail-fast`
  (110 tests), `bash ../../cargo.sh clippy --lib -- -D warnings`, plus
  `git diff --check`.
- OpenClaw container companion proof
  `cd src/openclaw_container && bash ../../cargo.sh test policy_bootstrap --lib --no-fail-fast`
  is locally blocked by missing private `lobster` cargo registry auth
  (`cargo login --registry lobster` / `CARGO_REGISTRIES_LOBSTER_TOKEN`).
- Required ADO was manually queued for #3590:
  PullRequest `169354920`, Build Validation `169354917`.
- Stacked draft PR #3603 opened from branch
  `user/giodl/lobster-policy-review-fixes`, based on #3590 branch
  `user/giodl/lobster-policy-materialization`, head
  `905b75fd43889a9ea0c2fad0128fd365fb65c0e6`. It closes the Codex review
  findings across the active personal-policy stack: MOS3 personal artifact
  publish now requires durable policy storage before external publish, personal
  accept verifies an HMAC-backed trusted OpenClaw comparison attestation before
  persisting state, pending MOS3 publish responses serialize camelCase fields
  expected by the web client, and policy-state writes use temp-file persist plus
  cross-process sentinel locking with stale-lock recovery instead of
  delete-before-rename.
- Local proof for #3603 passed:
  `cd src/lobster_runtime && bash ../../cargo.sh fmt --check`,
  `bash ../../cargo.sh test policy --lib --no-fail-fast` (112 tests),
  `bash ../../cargo.sh test scout_mos3_publish --lib --no-fail-fast` (8 tests),
  `bash ../../cargo.sh clippy --lib -- -D warnings`, `git diff --check`, and
  `codex review --uncommitted` with no blocking correctness/security/
  maintainability findings.
- Required ADO was manually queued for #3603:
  PullRequest `169385504`, Build Validation `169385503`. Current visible state
  after attachment: draft, mergeable, `UNSTABLE`; `GitOps/FileAffordance`
  passed, `GitOps/GitHubPop` failed, and both Lobster runtime ADO contexts are
  attached and in progress/queued.
- Stacked draft PR #3607 opened from branch
  `user/giodl/lobster-feed-policy-sources`, based on #3603 branch
  `user/giodl/lobster-policy-review-fixes`, head
  `d78015a29ed6d0cf5a970bcc8c298f8ef8a87220`. It adds durable tenant feed
  policy source selection to the policy state snapshot, validates selected
  sources as attested tenant-approved feeds scoped to the caller tenant,
  persists only feed-bound source identity (`store`, `feedId`,
  `sourceRevision`, `sha256`), and exposes tenant-admin-gated
  `POST /v1/policy/feed-sources/select` with env-backed admin assignment
  loading via `LOBSTER_POLICY_ADMIN_ASSIGNMENTS_PATH`.
- Local proof for #3607 passed:
  `cd src/lobster_runtime && bash ../../cargo.sh fmt --check`,
  `bash ../../cargo.sh test policy --lib --no-fail-fast` (118 tests),
  `bash ../../cargo.sh clippy --lib -- -D warnings`, `git diff --check`, and
  `codex review --uncommitted` clean with no discrete bug identified.
- Required ADO was manually queued for #3607:
  PullRequest `169392741`, Build Validation `169392740`. Current visible state
  after attachment: draft, mergeable, `UNSTABLE`; `GitOps/FileAffordance`
  passed, `GitOps/GitHubPop` failed, and both Lobster runtime ADO contexts are
  attached and queued.
- Late 2026-06-24 policy stack refresh: #3585 was rebased onto Lobster
  `origin/main` `e31e8b3b2` after edpiva's review was resolved. The force-push
  produced new head `fa46e80e41c09e186a99c89bfbeaf6d0b3214ae9` and added
  `fix(runtime): block privileged tool gate overrides` because current `main`
  introduced `gateway_proxy::ecs_settings::tests::privileged_openclaw_tool_gates_are_not_user_overridable`.
  Local proof on the rebased head passed: exact failing ECS test,
  `gateway_proxy::ecs_settings` tests, `policy` tests (104), runtime
  `fmt --check`, runtime `clippy --lib -- -D warnings`, and `git diff --check`.
  #3585 was force-pushed and now needs refreshed review (`REVIEW_REQUIRED`) plus
  green ADO. Queued required ADO: PullRequest `169427858`, Build Validation
  `169427856`.
- Restacked and force-pushed dependent branches on top of #3585 head
  `fa46e80e4`: #3586 head `ac516dc64`, #3588 head `d39822134`, #3590 head
  `be7b4be00`, #3603 head `ce5787719`, and #3607 head `b42ff6397`.
  Manually queued required ADO for each pushed head: #3586 PullRequest
  `169428034` / Build Validation `169428055`; #3588 PullRequest `169428074` /
  Build Validation `169428096`; #3590 PullRequest `169428108` / Build
  Validation `169428137`; #3603 PullRequest `169428211` / Build Validation
  `169428367`; #3607 PullRequest `169428458` / Build Validation `169428471`.
  GitOps/FileAffordance remained green and GitHubPop remained failed on the
  higher PRs at the first post-push refresh.
- Local worktree `C:\src\lobster-personal-policy-upload` is currently on
  `user/giodl/lobster-policy-default-config`, reset onto refreshed #3607 head
  `b42ff6397`, with the intended uncommitted default OpenClaw config changes
  restored. Known concern before opening that PR: the proposed baked
  `gateway.auth.mode = trusted-proxy` still needs a boot-compatible trusted
  proxy header/proxy config decision.
- Default-config follow-up opened on 2026-06-25 as draft Lobster #3623 from
  `user/giodl/lobster-policy-default-config`, based on #3607 branch
  `user/giodl/lobster-feed-policy-sources`, latest head
  `403899240415c1f9f57c79c202e50f55f07edfe7`. It aligns the baked OpenClaw
  config with the default policy posture and fixes the runtime WS dial to
  overwrite `x-forwarded-user` / `x-forwarded-proto` for OpenClaw
  trusted-proxy auth. The container regression now loads the real baked
  `openclaw.json`, resolves sibling `$include` fragments, and evaluates the
  effective config against Lobster's default policy posture. Required ADO queued
  on the latest head: PullRequest `169441035`, Build Validation `169441034`.
  Local proof passed focused runtime trusted-proxy header tests from the prior
  head, runtime `fmt --check`, runtime `clippy --lib -- -D warnings`,
  openclaw-container `fmt --check`, effective-config Node smoke, and
  `git diff --check`. OpenClaw container Rust tests remain locally blocked by
  missing private `lobster` cargo registry auth; the OpenClaw policy checker
  script was blocked by a missing built OpenClaw plugin-sdk dependency in
  `C:\src\openclaw-stack`.
- #3585 review follow-up on 2026-06-25: used dedicated worktree
  `C:\src\lobster-personal-policy-accept`, rebased
  `user/giodl/lobster-personal-policy-upload` onto current Lobster `origin/main`
  `68fdbc5c0`, resolved the `ecs-settings.json` conflict by keeping current
  main's tailored disabled-reason text, and fixed Galin/edpiva's remaining
  CodeClaw blocker by adding `user_override_disabled_reason` for
  `openclaw_workiq_office_enabled` and `openclaw_customizations_enabled`.
  Regression coverage now includes both keys in
  `privileged_openclaw_tool_gates_*`. Also fixed the ADO clippy failure in
  `routes/policy.rs` by passing the copy artifact store enum by value. Pushed
  #3585 head `cb7f0ed2d9ad32bec610313726a898a860fb50cf`; PR is mergeable but
  still shows `CHANGES_REQUESTED` until reviewers refresh. Local proof passed:
  `cargo.sh fmt --check`, `cargo.sh test privileged_openclaw_tool_gates --lib
--no-fail-fast`, `cargo.sh test policy --lib --no-fail-fast` (109 tests),
  `cargo.sh clippy --lib -- -D warnings`, and `git diff --check`. Required ADO
  queued: PullRequest `169445321`, Build Validation `169445320`.
- #3693 opened on 2026-06-26 from
  `user/giodl/lobster-policy-admin-read-ux`, stacked on #3623. It adds
  authenticated effective-policy state readback and renders the loaded
  baseline source/id/revision/hash in the gated Policy UX. Local proof passed
  runtime fmt, policy tests, runtime clippy, web type-check, focused web
  Vitest, touched-file Biome, and `git diff --check`. Required ADO queued:
  PullRequest `170027612`, Build Validation `170027607`.
- #3695 opened on 2026-06-26 from
  `user/giodl/lobster-policy-source-selection-ux`, stacked on #3693. It adds
  tenant-approved feed source selection to the gated Policy UX and brings the
  supporting tenant feed-source runtime route/state into this stack. Local
  proof passed runtime fmt, `cargo test policy`, runtime clippy, web
  type-check, focused PolicyPage/policyApi Vitest, touched-file Biome, and
  `git diff --check`. Required ADO queued: PullRequest `170033542`, Build
  Validation `170033541`. Later restack likely needed once #3623/#3693 settle.
- #5422 was revised on 2026-07-21 after auditing the current Scout package,
  Cowork's declarative-agent policy pattern, Aether's MOS3 clients, and the
  native Microsoft 365 admin-center app controls. Scout's existing package is
  a Teams tabs app, so the PR no longer invents a `gpt.json`, `x-policies`
  setting, profile, or declarative-agent surface. Head `dc60582777` now reads
  the existing Teams title directly from
  `GET /marketplace/v1/users/titles/{titleId}/preview?idType=TitleId`, validates
  the environment title id plus stable manifest AppId, and denies explicit
  native block state after operator enrollment. Cache scope is tenant+user,
  expired callers are pruned, and rollout is default-off through
  `lobster.scout_native_availability_enabled`. Registration now only needs to
  publish the existing Teams package and return per-environment MOS3 title ids.
  Wrapper-backed fmt, affected-crate check, targeted MOS3 tests (6), clippy
  with warnings denied, and final `codex review --uncommitted` are clean. The
  focused runtime test target remains blocked by the pre-existing missing
  `windows_sys` test dependency in MIP staging.
- Fresh required ADO for #5422 was running on 2026-07-21 against merge SHA
  `8aea349c25`: PullRequest `173251337` and Build Validation `173251336`.

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
