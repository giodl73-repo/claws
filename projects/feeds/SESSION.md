# Feeds Session Context

## Agent Start

1. Read this file.
2. Read `projects/feeds/README.md`.
3. Check both OpenClaw and Lobster PR state before changing anything.
4. Keep OpenClaw feed primitives separate from Lobster Scout publishing choices.

## Baseline

- Area: OpenClaw native feed support and Lobster Scout feed integration.
- Primary repos: `openclaw/openclaw`, `bic/lobster`.
- Main tracking file: `projects/feeds/README.md`.
- Source archive: `.craft/waves/260528+hapi-the-bringer+openclaw-feeds/`.

## Current Session

- Last updated: 2026-06-23.
- Last agent: Codex.
- 2026-06-22 OpenClaw hosted-feed prep: Read latest RFC #19 after Vince's
  edits. Current RFC PR is `https://github.com/openclaw/rfcs/pull/19` at
  `da91683252c93c864213a7f8a853bc6e74032c9f`; Vince's commits emphasize named
  local source profiles, source refs instead of feed-owned domains or
  credentials, local auth/trust roots, signed envelopes, explicit unsigned-feed
  opt-in, and locally computed payload checksums after envelope verification.
  Patrick's review comments are now visible. Main points: clarify named local
  package sources and source refs; keep ClawHub owning registry search while
  clients filter results against feeds; avoid depending on mutable slugs where
  stable ids are needed; clarify priority/recommended/blocked/disabled
  semantics and feed composition precedence; be careful with skills because
  GitHub-synced skills may not have versions and may be indexed by ClawHub but
  installed directly from GitHub; consider whether regional feeds can be
  separate edge-cached feeds instead of an in-payload `regions` field; use
  "marketplace" for the user-facing concept where appropriate; clarify signing
  and trust-envelope terminology; and note ClawHub publisher labels are
  currently binary official/not official. Based on this, opened OpenClaw draft
  PR `https://github.com/openclaw/openclaw/pull/95846` from WSL worktree
  `/root/src/openclaw-feeds-hosted-catalog-prep`, branch
  `feeds-hosted-catalog-prep`, commit `44c0884c3ed`. The PR intentionally only
  implements RFC rollout step 1: reshapes
  `scripts/lib/official-external-plugin-catalog.json` as a feed-shaped bundled
  fallback, adds parser/type support in
  `src/plugins/official-external-plugin-catalog.ts`, preserves legacy local
  catalog parsing, and fails closed for unsupported versioned feed wrappers.
  It does not add hosted fetch, auth, source profiles, signed envelopes,
  regional selection, SQLite snapshots, search behavior, or skills. Local proof
  passed `pnpm exec oxfmt --check
  src/plugins/official-external-plugin-catalog.ts
  src/plugins/official-external-plugin-catalog.test.ts`, `pnpm exec oxlint
  --deny-warnings src/plugins/official-external-plugin-catalog.ts
  src/plugins/official-external-plugin-catalog.test.ts`, JSON parse of
  `scripts/lib/official-external-plugin-catalog.json`, `git diff --check`, and
  `CI=1 timeout 180s node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 17 tests passing.
  WSL note: this worktree has a stray local branch named `origin/main`, so
  future rebases should use `refs/remotes/origin/main` explicitly to avoid
  ambiguous-ref rebase failures.
- 2026-06-22 OpenClaw hosted catalog stack update: Opened draft PR
  `https://github.com/openclaw/openclaw/pull/95868` from branch
  `feeds-hosted-catalog-fetch`, commit `50bb65f1c9b`, as the next RFC 19 slice
  after #95846. It adds a guarded async hosted loader for
  `register.openclaw.ai`, conditional request headers, bounded response reads,
  checksum metadata, schema validation, and bundled fallback while leaving the
  existing synchronous catalog path unchanged. Then opened draft PR
  `https://github.com/openclaw/openclaw/pull/95877` from branch
  `feeds-hosted-catalog-snapshot-cache`, commit `accc57e1e5d`, stacked after
  #95846/#95868. #95877 adds the last-known-good snapshot store contract for
  the hosted loader: successful hosted loads can write the exact response body
  plus metadata and save time; fallback paths validate snapshot body checksum,
  schema, and any caller-provided `expectedSha256` before using the snapshot;
  missing or invalid snapshots still fall back to the bundled catalog. Local
  proof for #95877 passed `pnpm exec oxfmt --check
  src/plugins/official-external-plugin-catalog.ts
  src/plugins/official-external-plugin-catalog.test.ts`, `pnpm exec oxlint
  --deny-warnings src/plugins/official-external-plugin-catalog.ts
  src/plugins/official-external-plugin-catalog.test.ts`, `git diff --check`,
  `CI=1 timeout 180s node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 26 tests,
  `timeout 300s pnpm tsgo:core:test`, and `codex review -c model=gpt-5.5
  --uncommitted`. Codex initially found a real checksum-pinning issue for
  snapshots; the PR fixes it and the final review reported no discrete
  correctness issues. Live #95877 state after opening: draft, base `main`,
  merge state `CLEAN`; Real behavior proof passed, many broad CI shards were
  skipped by path selection. Next likely OpenClaw slice is binding this
  snapshot contract to an actual runtime-owned persistent store, or adding the
  hosted catalog source-profile selection if Vince wants that before storage.
  Follow-up: PR bodies for #95846, #95868, and #95877 were updated to use a
  shared journey structure with stack links, step number, what each PR does,
  what it intentionally does not do, review guidance, and validation.
  Second Codex review round on the full stack found one actionable P2:
  `official-external-plugin-catalog.ts` had introduced a top-level
  `fetchWithSsrFGuard` import, which would eagerly load guarded network/runtime
  dependencies for cold bundled-catalog callers. Fixed in #95868 by moving the
  guard to a dynamic import inside `loadHostedOfficialExternalPluginCatalogEntries`
  and adding a static regression test that rejects a top-level fetch-guard
  import. #95868 was force-pushed to verified commit `2acadea045a`; #95877 was
  rebased and force-pushed to verified commit `b1cb838ce1a`. Final validation
  passed oxfmt, oxlint, `git diff --check`, focused catalog tests with 27 tests
  passing on the top branch, `timeout 420s pnpm tsgo:core:test`, and
  `codex review -c model=gpt-5.5 --base refs/remotes/origin/main`, which
  reported no discrete actionable correctness issues. GitHub commit verification
  is valid for all commits in #95846, #95868, and #95877. #95846/#95868 are
  fork PRs with maintainer edits enabled; #95877 is a same-repo OpenClaw branch,
  so GitHub does not expose the fork-only `maintainerCanModify` flag, but
  OpenClaw maintainers can edit the branch directly.
- 2026-06-22 RFC #19 review update: Pushed
  `56577f97b2ad3c0b16299c3e84334255b2c7a462` to RFC PR #19 to address
  Patrick's review comments. The RFC now clarifies source refs versus local
  source profiles, preserves ClawHub/registry ownership of search ranking,
  distinguishes stable ids from mutable slugs, defines recommended/disabled/
  blocked semantics and composition precedence, moves regional behavior toward
  separate edge-cached feed variants instead of per-entry `regions` policy,
  adds GitHub-indexed skill caveats, simplifies signing to direct keys first
  with key rotation as a later signed document, and updates rollout around RFC
  alignment, signed public feeds, and small draft implementation PRs. Posted
  PR comment
  `https://github.com/openclaw/rfcs/pull/19#issuecomment-4772661178`. Vince is
  expected to be the responsible maintainer/merger for the main OpenClaw feed
  implementation chain; Gio will contribute draft PRs along the way for Vince
  and Patrick to refine or take over.
- 2026-06-22 OpenClaw #95846 review update: User clarified they wanted the
  main code PR reviewed, not the RFC. Automated `codex review` was attempted
  against `refs/remotes/origin/main` but the WSL Codex CLI rejected both
  `gpt-5.3-codex` and explicit `gpt-5-codex`/`gpt-5.1` overrides for the
  current ChatGPT account, so the automated Codex pass is blocked by model
  entitlement. Manual review of the three-file diff and surrounding
  catalog/doctor/install consumers found no code defect. ClawSweeper's concrete
  blocker was missing real behavior proof, not a code finding. Added PR body
  proof showing the patched module loads 74 official external entries, resolves
  `acpx` and `exa` install metadata, and passes
  `src/plugins/official-external-plugin-catalog.test.ts` with 17 tests. Also
  reran oxfmt, oxlint, JSON parse, and `git diff --check`. Requested
  `@clawsweeper re-review` at
  `https://github.com/openclaw/openclaw/pull/95846#issuecomment-4772902830`;
  ClawSweeper acknowledged and proof/check rerun is in progress.
- 2026-06-22 proposal refresh: Updated the MOS3 feeds proposal set to make the
  additive model explicit: MOS3 keeps owning registry metadata, acquisitions,
  assignments, user/admin settings, review, and policy decisions; feeds add the
  signed, scoped, materialized effective view that clients consume for governed
  discovery and install. Added
  `projects/feeds/mos3-feed-working-group-brief.md` as the short working-group
  handout. Updated the position, architecture, contract, admin experience,
  client conformance, and npm leverage docs with the same distinction. Copied
  refreshed Markdown and diagrams into
  `C:\Users\giodl\OneDrive - Microsoft\Documents\Microsoft Scout\Feeds` and
  regenerated DOCX versions in that folder with Word automation.
- 2026-06-22 Salem feedback update: Updated MOS3 feeds docs to address Salem's
  feedback that the proposal could read like a replacement for DV/agent
  artifacts and needed a clearer MOS3 RBAC story. The brief, position,
  architecture, admin experience, contract, and client conformance docs now
  state that feeds are not DV/artifact authority or write permission, and add
  explicit RBAC/persona validation around client reader, personal publisher,
  package/source owner, Microsoft curator, tenant admin, and operator/auditor.
  Synced the updated Markdown files and regenerated matching DOCX files in
  `C:\Users\giodl\OneDrive - Microsoft\Documents\Microsoft Scout\Feeds`.
- 2026-06-23 RFC feed telemetry addendum: After RFC #19 merged, opened follow-up
  RFC PR `https://github.com/openclaw/rfcs/pull/24` from WSL worktree
  `/root/src/openclaw-rfcs-feed-telemetry-addendum`, branch
  `feeds-telemetry-addendum`, latest signed commit `c11eca7`. The addendum
  answers the telemetry question: OpenClaw already has diagnostics events,
  local diagnostics bundles, `diagnostics-otel`, and plugin install records, so
  feeds can reuse the existing pipeline, but feed usage will not be measured
  automatically without explicit feed provenance and lifecycle events. The RFC
  proposes feed fetch, snapshot load, entry action, update, policy decision, and
  activation events, plus a feed provenance block on feed-backed install records.
  Local validation passed `git diff --check`, no em-dash check, and ASCII check.
- 2026-06-22 ADO pipeline ops note: Lobster feed PRs that need manual ADO
  queueing should use `projects/lobster/ado-pipelines.md`. The known working
  machine has Azure CLI plus the `azure-devops` extension and is logged into
  the Microsoft tenant as `giodl@microsoft.com`; pipeline commands must pass
  `--organization https://msazure.visualstudio.com --project One` explicitly
  and queue pipeline ids `457333` and `463346` for the PR source branch.
- 2026-06-22 Lobster #3422 fix/rebase pass: PR
  `https://microsoft.ghe.com/bic/lobster/pull/3422` was rebased onto current
  `origin/main` and force-pushed on branch
  `user/giodl/scout-feeds-admin-composition` at head
  `7981f08dade5c35f3f55507c48f048658b6ae8f1`. Fixes include server-side ECS
  fail-closed gating on `lobster.scout_feeds_admin_ux_enabled`,
  durable-storage acknowledgement before admin writes, admin publish serialized
  under the catalog lock/file lock, update-available approvals using the
  pending candidate version, pending-update rejection that preserves the
  reviewed package, source-coordinate selector bodies for approve/deny routes,
  clippy cleanup, sibling feature-flag tests, and docs for routes/env/flag.
  Current local proof on the rebased head passed `just rust-fmt-check`,
  `just web-fmt-check`, `just web-lint`, `just web-type-check`,
  `cd src/lobster_web; npm run test:unit -- tests/pages/FeedsPage.unit.test.tsx
  tests/services/webFeatureFlagsProbe.unit.test.ts`, ECS inventory via
  `py -3 scripts/ci/check-ecs-settings-inventory.py`, `git diff --check`, and
  `git diff --check origin/main...HEAD`. Local Rust validation is blocked after
  `just rust-auth` by Azure Artifacts `Lobster-Oxy` `ReadPackages` permission
  for this account; before rebase, the same fix set passed `just rust-clippy`,
  `just cargo test scout_feed --no-fail-fast`, and
  `just cargo test scout_catalog --no-fail-fast` on `fc34a1c4e`. ADO was
  requeued on `7981f08d`: PullRequest build `169091410`, Build Validation build
  `169091409`; both attached and were queued/in progress when last checked.
  The PR is mergeable but still shows `CHANGES_REQUESTED` from stale reviews on
  older commits until reviewers re-review. PR body and comment
  `https://microsoft.ghe.com/bic/lobster/pull/3422#issuecomment-184112536`
  summarize all addressed review items. GitHubPop remains noisy.
- OpenClaw stakeholder context: Gio met with Vince, Patrick, and the OpenClaw
  group. Vince is strongly aligned on feeds, primarily for plugins, because
  feeds give OpenClaw a uniform model for plugin control across companies:
  enable, block, approve, curate, update, and govern plugin availability
  without each client inventing a separate distribution channel. The RFC should
  frame OpenClaw feeds as a shared distribution and governance substrate for
  plugins first, while still general enough for skills and related packages.
  The Microsoft/MOS3 story should be positioned as an augmentation layer over
  ClawHub feeds: Microsoft can curate, govern, and compose registry/feed inputs
  into an enterprise-approved view, while OpenClaw clients consume the resulting
  feed contract uniformly. Patrick is expected to supplement the RFC with
  ClawHub-specific details after the initial PR is filed.
- RFC source note: transcript and summary from the 2026-06-17 OpenClaw feeds
  meeting were distilled into
  `projects/feeds/openclaw-feeds-rfc-meeting-2026-06-17.md`. Use that file as
  the source of truth for the new RFC: hosted JSON feed over HTTP, bundled
  fallback, plugin-first rollout, npm/package integrity, ClawHub public feed,
  Microsoft/MOS3 enterprise composition, tenant overrides, regional feeds,
  policy separation, Tencent/Xiaomi alignment, and Patrick follow-up details.
  Vince follow-up implementation pointers: current OpenClaw entry point is
  `src/plugins/official-external-plugin-catalog.ts`; underlying npm package
  data lives in `scripts/lib/official-external-plugin-catalog.json` using
  `openclaw.install.npmSpec`; onboarding reads it in
  `src/wizard/setup.official-plugins.ts`; install execution is in
  `src/commands/onboarding-plugin-install.ts`; example `@openclaw/acpx` is in
  the JSON catalog. The hosted-feed design should include manifest refactoring
  and use HTTP `Last-Modified` plus checksum to detect new feed versions.
  First RFC draft authored in WSL repo `/root/src/openclaw-rfcs` on branch
  `feeds-plugin-registry-rfc`, latest commit `da91683`, file
  `rfcs/0009-hosted-feeds-for-plugins-and-skills.md`. The draft follows
  `rfcs/0000-template.md`, uses `status: draft`, includes Mermaid diagrams for
  OpenClaw plugin feed behavior, Microsoft enterprise composition, and regional
  feeds, anchors the proposal to the existing external plugin catalog paths,
  and has no em dashes. Vincent added source-trust and signing-envelope detail
  at `4399109`; the latest follow-up clarifies that OpenClaw computes and
  persists a local `sha256` payload checksum after envelope verification, so
  feed checksums are not self-referential. RFC PR:
  `https://github.com/openclaw/rfcs/pull/19`. On 2026-06-20 no visible Patrick
  issue/review comments were returned by GitHub APIs; PR #19 is mergeable/CLEAN
  at `da91683252c93c864213a7f8a853bc6e74032c9f`, Socket checks are green, and
  ClawSweeper review is in progress.
- Latest update: Lobster PR #1946 `https://microsoft.ghe.com/bic/lobster/pull/1946` had a failed `Lobster-Runtime-PullRequest` run `168736240` on current head `381332ad9`. The failure was isolated to `Runtime E2E Tests Build images, run E2E tests (shard 3/4)`, specifically the setup step `Setup: Start docker-compose E2E stack`, which exited with code 17 after Docker returned `failed to receive status: rpc error: code = Canceled desc = context canceled`. Build Validation `168736237` is green and the local/unit/static checks in the failed PullRequest run were green, so this looks like an E2E infrastructure startup failure rather than a ClawHub adapter code failure. A replacement PullRequest pipeline was manually queued as ADO build `168781368` on the same head and is in progress; as of the last check it had not reached the Runtime E2E stage yet. GitHubPop is failing as usual.

  2026-06-20 update: Lobster PR #3368
  `https://microsoft.ghe.com/bic/lobster/pull/3368` is rebased onto current
  `main` and force-pushed at head `5a1ecf020` on
  `user/giodl/scout-feeds-web-ux`. The latest fixes address Daron/Codeclaw
  feedback by adding fail-closed ECS gate `lobster.scout_feeds_ux_enabled`,
  limiting `?enableScoutFeeds=1` to localhost/demo/dev, gating
  `/v1/scout/feeds/personal/publish-local` behind explicit
  `LOBSTER_SCOUT_PERSONAL_LOCAL_PUBLISH_ENABLED=true`, preflighting local
  feed/artifact storage before MOS3 publish side effects, moving hosted
  artifact writes under the same per-feed lock as feed replacement/cleanup,
  adding lock ownership tokens plus stale-lock rename-aside recovery, cleaning
  replaced unreferenced personal artifacts, and resolving the routed Lobster
  runtime base per API request. Local proof passed
  `just cargo test scout_feed::tests --lib` (33), `just cargo test
  web_feature_flags --lib` (11), `just cargo test config::feature_flags --lib`
  (106), `just cargo clippy --lib --tests -- -D warnings`, rustfmt check,
  focused web unit tests for `webFeatureFlagsProbe`, `scoutFeedsApi`,
  `FeedsPage`, and `App.rail-hoist` (46), `npm run type-check`, touched-file
  web format/lint, and `git diff --check`. Required ADO runs are queued on
  the final head: PullRequest `168826736`, Build Validation `168826735`.
  GitHubPop is failing for Proof of Presence, and review remains
  `CHANGES_REQUESTED` until the latest automated/requested-change reviews
  refresh.

  2026-06-20 follow-up: Lobster PR #3368 was updated and pushed at head
  `8d4f43555` on `user/giodl/scout-feeds-web-ux` to address the latest live
  blockers. The update removes the user-controlled `?mode=demo` feeds URL
  override path, keeping `?enableScoutFeeds=1` limited to development builds or
  localhost; keeps `/feeds` registered while the web feature flag probe is
  pending and shows a gated loading state until the flag resolves; distinguishes
  MOS3 pending publish copy from published copy with unit coverage; adds
  `scout_feeds_ux_enabled` to `src/lobster_runtime/config/ecs-settings.json`;
  and verifies a claimed stale lock token after rename before entering stale
  recovery. Local proof passed `python scripts/ci/check-ecs-settings-inventory.py`,
  `just cargo test scout_feed::tests --lib` (33), `just cargo clippy --lib
  --tests -- -D warnings`, focused web unit tests for `FeedsPage` and
  `App.rail-hoist` (9), `npm run type-check`, `npm run lint`,
  `npm run format:check`, rustfmt check, and `git diff --check`. PR comment:
  `https://microsoft.ghe.com/bic/lobster/pull/3368#issuecomment-183678401`.
  ADO runs are queued/in progress on `8d4f43555`: PullRequest `168850652` and
  Build Validation `168850649`. GitHubPop still fails for Proof of Presence.
  OpenClaw #87824 was also rebased on 2026-06-19 onto current `origin/main` and
  pushed to head `504426827e699f0309e6c27e8a53eecd92ebf9b2`. The P1
  ClawSweeper finding was fixed by routing default HTTPS feed loads through
  `fetchWithSsrFGuard` with audit context `feeds.feed-document`, releasing the
  guarded dispatcher, and adding CLI tests for guarded loads and guard blocks.
  Local proof passed focused feeds/bundled-health Vitest, targeted oxlint,
  scoped oxfmt plus `git diff --check`, plugin inventory check, and
  `pnpm tsgo:extensions`. Re-review was requested at
  https://github.com/openclaw/openclaw/pull/87824#issuecomment-4753212224.
  Real CLI proof was then added to the PR body after running the source CLI with
  isolated temp config/state: `openclaw feeds sources --json`, `openclaw feeds
  list --json`, and `openclaw feeds search proof --type plugin --json` all
  exited 0 against a local `file://` feed. The body explicitly notes that no
  external HTTPS endpoint was contacted in the CLI proof; HTTPS SSRF behavior is
  covered by the focused test added in the branch. Proof comment/re-review:
  https://github.com/openclaw/openclaw/pull/87824#issuecomment-4753281499.
  GitHub `Real behavior proof` check is now passing; ClawSweeper re-review is
  queued and labels may still be stale until it finishes. ClawSweeper then
  raised a new P2 availability finding for unbounded HTTPS response bodies. That
  was fixed on pushed head `57d27be40d336c62c89a5a7fe2794ddd5170558b` by using
  `readResponseWithLimit` with a 1 MiB `MAX_FEED_DOCUMENT_BYTES` cap and adding
  overflow coverage that verifies guarded dispatcher release. Latest proof
  passed focused feeds/bundled-health Vitest (25 tests), oxlint, scoped
  oxfmt/diff check, `pnpm tsgo:extensions`, and the real source CLI proof again.
  PR body was updated and re-review requested at
  https://github.com/openclaw/openclaw/pull/87824#issuecomment-4753354239.
  OpenClaw #87825 was then rebased onto updated #87824 and pushed to head
  `75abd34788ff68c7f62164e2f391d70e23478436`, resolving the dirty merge state.
  Local validation passed focused feeds/doctor/bundled-health Vitest, targeted
  oxlint, scoped oxfmt/diff check, and `pnpm tsgo:extensions`. Real source CLI
  proof was added to the PR body and posted at
  https://github.com/openclaw/openclaw/pull/87825#issuecomment-4753634623:
  dry-run printed the delegated `openclaw skills install` command, an approved
  feed entry installed through the real local skill installer into a temporary
  workspace, and an unapproved feed entry failed with exit 2 under enforced
  approval policy. GitHub `Real behavior proof` is passing; #87825 is still a
  draft and same-repo, so the maintainer-edit fork flag does not apply.
  OpenClaw #87826 was also rebased onto updated #87825 and pushed to head
  `bb7ed067731bd79429081e74bf54032fd4a681e3`, resolving its dirty merge state.
  The update fixes ClawSweeper's duplicated policy docs phrase, restores
  `feeds` as a supported policy section after the rebase, and removes a stale
  test fallback caught by oxlint. Local proof passed focused policy/feeds
  Vitest (355 tests), targeted oxlint, scoped oxfmt/diff check, and
  `pnpm tsgo:extensions`. Real source CLI proof was added to the body and
  posted at
  https://github.com/openclaw/openclaw/pull/87826#issuecomment-4753692724:
  `policy check --json` emitted redacted feed evidence and the expected
  unpinned/unsigned feed findings, and `doctor --lint` surfaced the same feed
  policy checks. GitHub `Real behavior proof` is passing; #87826 remains draft
  and needs ClawSweeper label/review refresh plus maintainer acceptance of the
  feed policy trust contract.
  OpenClaw #87827 was rebased onto updated #87826 and pushed to head
  `47aabc7bcd2ec3289fed0b4cbf4e6834cf385133`, resolving its dirty merge state.
  The update fixes ClawSweeper's lifecycle findings by omitting `generatedAt`
  unless explicitly requested so default `feeds build` output is deterministic,
  and by making `feeds validate`/`feeds hash` accept `file://` and `https://`
  feed URLs through the shared feed byte loader. Local proof passed focused
  feeds/policy/bundled-health Vitest (367 tests), targeted oxlint, scoped
  oxfmt/diff check, and `pnpm tsgo:extensions`. Real source CLI proof was added
  to the body and posted at
  https://github.com/openclaw/openclaw/pull/87827#issuecomment-4753794245:
  `feeds validate`, `feeds hash`, deterministic double `feeds build`,
  `feeds diff`, `feeds updates`, and `feeds notices` all produced the expected
  output against isolated `file://` feed artifacts. GitHub `Real behavior proof`
  is passing; #87827 is draft, mergeable/CLEAN, and the `status: needs proof`
  label is stale pending ClawSweeper label/review refresh.
  OpenClaw #88732 was rebased onto updated #87827 and pushed to head
  `c487721eafb27b0226e3cdfed5a54d8ddef2d12f`, resolving its dirty merge state.
  The update documents native feed search flags/default behavior in
  `docs/cli/plugins.md` and `docs/cli/skills.md`, fixes stale source import
  paths after the rebase, and aligns policy feed evidence so an omitted
  `plugins.entries.feeds.enabled` flag is treated as enabled unless explicitly
  false. Local proof passed focused native-search/feed/policy Vitest shards
  (8, 64, and 371 tests), targeted oxlint, scoped oxfmt/diff check,
  `pnpm tsgo:extensions`, and `pnpm tsgo:core`. Real source CLI proof was added
  to the body and posted at
  https://github.com/openclaw/openclaw/pull/88732#issuecomment-4753900292:
  `skills search` and `plugins search` returned the expected isolated pinned
  `file://` feed results both explicitly with `--catalog-feeds`/`--feed-source`
  and through configured default feed search. GitHub `Real behavior proof` is
  passing; #88732 is draft, mergeable/CLEAN, and the stale `status: needs proof`
  label plus compatibility/security readiness labels need ClawSweeper
  review/label refresh and maintainer acceptance of the native feed-search
  trust/default contract.
  Previous update: Lobster PR #1946 `https://microsoft.ghe.com/bic/lobster/pull/1946` is now the active Lobster feed PR. It was rebuilt as one commit on current `origin/main`, force-pushed to `user/giodl/scout-feeds-clawhub-adapter`, retitled "Import ClawHub snapshots into Scout feeds", and marked ready for review. Latest head is `381332ad9`, which addresses Codeclaw's requested package-catalog gap by accepting native ClawHub package containers (`packages`, `packageReleases`, `packageCapabilities`) plus digest wrappers (`packageSearchDigest`, `packageCapabilitySearchDigest`, `skillSearchDigest`), preserving npm/package coordinates, artifact hashes, install/artifact/tarball URLs, OpenClaw npm specs, and `source.feed` lane metadata. Scope remains a file-backed `clawhub-snapshot` source adapter that normalizes exported ClawHub/OpenClaw catalog JSON into the existing Scout `FeedPackageEntry` contract and can later be replaced by the OpenClaw RFC hosted-feed design without changing Scout feed consumers. Local proof on `381332ad9` passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`, `git diff --check`, `just cargo test scout_clawhub --lib` (16 passed), `just cargo test scout_feed_cli --lib` (50 passed), and `just cargo clippy --lib --tests -- -D warnings`. Required ADO builds were queued and attached on the new head: PullRequest `168736240`, Build Validation `168736237`. GitHubPop is failing as usual; Codeclaw changes-requested review is still active until refreshed.
  Previous update: Lobster PR #3345 `https://microsoft.ghe.com/bic/lobster/pull/3345` merged into `main` on 2026-06-18. Lobster PR #3353 `https://microsoft.ghe.com/bic/lobster/pull/3353` merged into `main` on 2026-06-18, adding Lobster-hosted content-addressed personal skill artifact storage for the personal feed lane, plus `publish-local --artifact-dir --artifact-base-url` to emit hosted artifact URLs. The model keeps tenant-approved feeds as the enterprise marketplace lane and uses hosted personal artifacts for user-owned portable skills. Initial scope is intentionally single-file `SKILL.md` artifacts, because the current installer downloads hosted artifacts as one file and does not extract archives.
  Previous update: New Lobster PR #3345 `https://microsoft.ghe.com/bic/lobster/pull/3345` was opened on 2026-06-18 from `user/giodl/scout-feeds-personal-openclaw-install` at head `51260263d`. It straightens the feed model by allowing `scout feed install` to install from attested `personal` feeds as well as `tenantApproved` feeds, including hosted personal skill artifacts over HTTPS, while root/baseline feeds remain non-installable. Personal feeds now represent a user's portable skill library for direct OpenClaw installation; tenant-approved feeds remain the enterprise marketplace/admin-approved lane. The PR also updates docs and fixes a current relay test compile break by passing the new `decoupling_enabled` argument. Local proof passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`, `git diff --check`, `just cargo test scout_feed_cli --lib` (42 passed), and `just cargo clippy --lib --tests -- -D warnings`. Required ADO builds were queued: PullRequest `168666402`, Build Validation `168666401`.
  Previous update: ClawPilot PR #3542 was updated and force-pushed at head
  `427abffc` on 2026-06-18. It now uses the existing Scout Desktop Weave
  app-token helper for live Lobster prod feed profiles when no explicit feed
  bearer token is configured, so the live demo path is app sign-in plus
  `SCOUT_DESKTOP_FEED_ENV=prod-301eus`, not manual bearer-token copy/paste.
  It also adds renderer action coverage proving an installable feed-backed
  skill calls `skillsAPI.importUrl(...)`. Local proof passed
  `pnpm exec vitest run --project node electron/scout-feed-catalog.test.ts
  common/scout-feed-catalog.test.ts`, `pnpm exec vitest run --project unit
  src/features/extensions/useExtensionsActions.test.tsx`, `git diff --check`,
  and touched-file type-aware `oxlint`. ClawPilot PR #3613 was cleanly rebased
  onto the updated #3542 head and force-pushed at `e2e8116d`; local proof
  passed node feed/publish/preload/skills IPC tests, unit detail dialog plus
  action tests, and stacked type-aware `oxlint`. Both PRs remain non-draft with
  ClawPilot Buddy and PR-agent checks running.
  Previous update: Lobster PR #3305 merged into `main` on 2026-06-18 at merge
  commit `b129b5dc`, landing the Scout catalog publishing workflow for tenant
  review catalogs and approved-feed publishing. ClawPilot issue
  `https://github.com/gim-home/m/issues/3648` now tracks the Scout Desktop feed
  consumption and local personal-publish arc. ClawPilot PR #3542 was rebased
  onto current `main`, updated at head `0c4e1a93`, force-pushed, and marked
  ready for review. It now loads tenant-approved and personal feed sources
  together and supports opt-in live prod profiles:
  `SCOUT_DESKTOP_FEED_ENV=prod-301eus` maps to
  `https://lobster.eus-ia301.gateway.prod.island.powerapps.com/v1/scout/feeds/{approved,personal}.json`,
  while `prod-302us` maps to
  `https://lobster.us-ia302.gateway.prod.island.powerapps.com/v1/scout/feeds/{approved,personal}.json`.
  Local proof passed `pnpm exec vitest run --project node
  electron/scout-feed-catalog.test.ts common/scout-feed-catalog.test.ts` and
  touched-file type-aware `oxlint`. ClawPilot PR #3613 was rebased on the
  updated #3542 head, updated at head `fd37837e`, force-pushed, and marked
  ready for review. It now publishes local skills into an attested personal
  feed and lets local `file://.../SKILL.md` personal feed entries install
  through the existing skill import IPC path. Local proof passed node
  `common/scout-feed-publish`, `common/scout-feed-catalog`,
  `electron/preload`, and `electron/ipc/skills-ipc` tests, the unit
  `ExtensionsDetailDialog.telemetry` test, and touched-file type-aware
  `oxlint`. Both PRs are non-draft with PR template metadata fixed and
  ClawPilot Buddy / GitHub checks running.
  Previous update: Lobster PR #3272 merged into `main` on 2026-06-18 at merge
  commit `c61bba02`, landing `scout feed publish-local` for attested personal
  feeds from local skill artifacts. Lobster PR #3273 merged into `main` on
  2026-06-18 at merge commit `e291f3d8`, landing `scout feed publish-mos3` and
  the MOS3 package publish write path, including direct `--skill <path>`
  packaging and generated temp-zip cleanup. The local plus MOS3 personal-feed
  publish arc is now in `main`. Lobster PR #3305
  `https://microsoft.ghe.com/bic/lobster/pull/3305` is open from
  `user/giodl/scout-feeds-publishing-workflow-main` at updated head
  `bf68c4eef`; it adds the Scout catalog publishing workflow for tenant review
  catalogs and approved-feed publishing. Review feedback from Codeclaw,
  Inspektor, and EmmBot was addressed by preserving reviewed package versions
  while updates are pending, adding `pendingUpdate`, making catalog writes
  atomic, removing the empty-feed sentinel, restoring nullable search-result
  titles, normalizing list status output, and fixing the stale docs command.
  Local proof passed `cargo fmt
  --manifest-path src/lobster_runtime/Cargo.toml --check`, `git diff --check`,
  `just cargo test scout_catalog --lib`, `just cargo test scout_feed_cli
  --lib`, and `just cargo clippy --lib --tests -- -D warnings`. Required ADO
  builds were queued on the new head: PullRequest `168573759` and Build
  Validation `168573760`. Next Lobster feed work should move to ClawHub adapter or
  post-merge integration follow-up rather than #3272/#3273 CI chasing.
  Previous update: Lobster PR #3273 was open to
  `main`, non-draft, and mergeable at head `e1f4bcb3` after fixing the ADO
  Runtime unit test failure.
  ADO failed on `a5389462` because two new `publish-mos3 --skill` cleanup tests
  scanned global temp state and raced parallel package tests. Commit
  `e1f4bcb3` narrows those assertions to per-test `scout-mos3-*` prefixes.
  Local proof passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml
  --check`, `git diff --check`, `just cargo test scout_feed_cli --lib` (39
  tests), `just cargo test scout_mos3_publish --lib` (5 tests), and `just
  cargo clippy --lib --tests -- -D warnings`. Fresh ADO builds are queued and
  attached on the new head: PullRequest `168523885`, Build Validation
  `168523884`; GitHubPop is still failing. ClawPilot PR #3542 was then updated
  at head `aada9c3e` to make the personal feed the easy Desktop integration
  path: `SCOUT_DESKTOP_PERSONAL_FEED_PATH`,
  `SCOUT_DESKTOP_PERSONAL_FEED_URL`,
  `SCOUT_DESKTOP_PERSONAL_FEED_BEARER_TOKEN`, and
  `SCOUT_DESKTOP_FEED_BEARER_TOKEN` now load Lobster's user-scoped
  `/v1/scout/feeds/personal.json` as a normalized Scout feed, while preserving
  the existing MOS3 snapshot path. Validation passed node feed/preload tests
  (79 passed, 4 skipped), unit extension tests (33 passed), `oxfmt --check`,
  `oxlint --deny-warnings`, and type-aware `oxlint` on the touched files.
  Previous update: Took #3272 and
  #3273 review feedback after the initial
  post-#1939 restack. #3272 was updated at head `0937b232` to report
  expected/actual personal `FeedScope` on mismatches, validate tenant/user
  publish scope components, centralize personal feed id construction, and write
  feeds via temp-file + rename. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml`, `git diff --check`, `just cargo test
  scout_feed_cli --lib` (34 tests), and `just cargo clippy --lib --tests --
  -D warnings`. Fresh #3272 ADO builds were queued: PullRequest `168511388`
  and Build Validation `168511389`. #3273 was restacked on that #3272 head,
  then updated at head `42375799` to clean up generated `--skill` temp zips on
  both success and upload error while preserving caller-provided `--package`
  files. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml`, `git diff --check`, `just cargo test
  scout_feed_cli --lib` (38 tests), `just cargo test scout_mos3_publish --lib`
  (5 tests), and `just cargo clippy --lib --tests -- -D warnings`. Fresh #3273
  ADO builds were queued: PullRequest `168513250` and Build Validation
  `168513249`. Previous update: #1939 merged into `main` at `6d70078e` on
  2026-06-17. After
  that, #3272 was rebuilt onto current `origin/main` as a single commit,
  validated, and force-pushed at head `8003c945`; local proof passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `git diff --check`, `just cargo test scout_feed_cli --lib` (33 tests), and
  `just cargo clippy --lib --tests -- -D warnings`. Fresh #3272 ADO builds
  were queued: PullRequest `168502613` and Build Validation `168502612`.
  #3273 was rebuilt on top of #3272 as a single MOS3 publish commit, then
  expanded so `scout feed publish-mos3` supports `--skill <path>` as the
  cloud-backed publish path: the CLI now packages a local skill file/directory
  into a deterministic store-only zip and uploads it to MOS3, while preserving
  `--package <package.zip>` for already-built packages. The updated PR was
  validated and force-pushed at head `af32d849`; local proof passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `git diff --check`, `just cargo test scout_mos3_publish --lib` (5 tests),
  `just cargo test scout_feed_cli --lib` (36 tests), and `just cargo clippy
  --lib --tests -- -D warnings`. Fresh #3273 ADO builds were queued:
  PullRequest `168510284` and Build Validation `168510283`. #3272 is now one
  commit ahead of `main`; #3273 is one commit ahead of #3272. #3273 has stale
  changes-requested reviews from the old conflict state; a proof comment was
  posted showing the new head is mergeable. It is now approved and mergeable,
  with GitHubPop failing and fresh ADO queued/running. Previous update:
  Corrected the Lobster feeds branch topology and moved the
  full feeds stack toward `main`. The real integration branch
  `user/giodl/scout-feeds-docs` was reset to the remote stack head, rebased
  cleanly onto current `origin/main` `a324e5257`, validated locally, and pushed
  with lease at head `ccc9fcbac`. #1939
  `https://microsoft.ghe.com/bic/lobster/pull/1939` is now non-draft, titled
  "Land Scout feeds stack", and is the explicit mainline landing PR for the
  11-commit feeds stack. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check`, `git diff --check`, `just cargo
  test scout_feed --lib` (56 tests), and `just cargo clippy --lib --tests --
  -D warnings`. Required ADO builds were queued on #1939: PullRequest
  `168490899` and Build Validation `168490895`. Current blockers are review,
  GitHubPop failing, and the two ADO jobs still pending/queued. Important
  topology note: previous "merged" Scout feed PRs #1941, #1944, #3170, #3221,
  #3236, #3238, #3240, #3256, and #3264 were merged into the stack branch, not
  `main`; #1939 is the PR that carries them into `main`. Previous update:
  Opened Lobster PR #3272
  `https://microsoft.ghe.com/bic/lobster/pull/3272` from
  `user/giodl/scout-feeds-personal-local-publish`, stacked on
  `user/giodl/scout-feeds-docs` at head `2cf29dee`. #3272 adds
  `scout feed publish-local` to create or update an attested personal Scout
  feed from a local skill artifact, preserving local provenance, artifact hash,
  and source metadata. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check`, `git diff --check`, `just cargo
  test scout_feed_cli --lib` (33 tests), and `just cargo clippy --lib --tests
  -- -D warnings`. Required ADO builds were queued: PullRequest `168482770`
  and Build Validation `168482767`; both are running and GitHubPop is failing.
  #3272 is open, non-draft, mergeable, and approved. Opened stacked Lobster PR
  #3273 `https://microsoft.ghe.com/bic/lobster/pull/3273` from
  `user/giodl/scout-feeds-mos3-publish-write`, stacked on #3272 at head
  `1f752fa2`. #3273 adds `scout feed publish-mos3` plus a MOS3 package publish
  client for `POST /builder/v1/users/packages`, with explicit bearer token,
  package zip, scope, title format, should-block option, and response shaping
  for published, pending, invalid, and scope-disabled outcomes. Local proof
  passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `git diff --check`, `just cargo test scout_mos3_publish --lib` (5 tests),
  `just cargo test scout_feed_cli --lib` (34 tests), and `just cargo clippy
  --lib --tests -- -D warnings`. Required ADO builds were queued: PullRequest
  `168484815` and Build Validation `168484814`; both are queued and GitHubPop
  is failing. Previous update: Restacked Lobster PR #3264
  `https://microsoft.ghe.com/bic/lobster/pull/3264` on the fixed #3256 head
  `fb2963e1` and force-pushed #3264 at head `3e6df926`. The rebase was clean.
  Fixed #3264's test helper so `just cargo clippy --lib --tests -- -D
  warnings` passes under the broader CI-equivalent test-target clippy lane.
  Local proof passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml
  --check`, `git diff --check user/giodl/scout-feeds-live-personal-mos3...HEAD`,
  `just cargo test scout_feed_cli --lib` (29 tests), and `just cargo clippy
  --lib --tests -- -D warnings`. Fresh ADO builds were queued for #3264:
  PullRequest `168469011` and Build Validation `168469010`; GitHubPop is
  failing while #3264 remains draft. Previous update: Fixed Lobster PR #3256
  `https://microsoft.ghe.com/bic/lobster/pull/3256` after ADO
  `Lobster-Runtime-PullRequest` failed the Rust 1.93 runtime quality lane on
  `clippy::default-trait-access` in `src/routes/scout_feed_tests.rs`. Commit
  `fb2963e1` imports `std::collections::BTreeMap` and replaces
  `metadata: Default::default()` with `metadata: BTreeMap::default()`.
  Local proof passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml
  --check`, `git diff --check`, `just cargo test routes::scout_feed --lib` (12
  tests), `just cargo test scout_mos3 --lib` (17 tests), and `just cargo clippy
  --lib --tests -- -D warnings`. Fresh required ADO builds were queued for
  #3256 head `fb2963e1`: PullRequest `168466171` and Build Validation
  `168466172`. #3256 was then marked ready for review; the ADO checks are still
  running and GitHubPop is still showing its pre-ready failure. Previous update:
  Opened Lobster draft PR #3264
  `https://microsoft.ghe.com/bic/lobster/pull/3264` from
  `user/giodl/scout-feeds-personal-client` stacked on #3256 at head
  `91abe95f`. #3264 adds `scout feed fetch --url <feed-url>
  (--token <bearer>|--token-env <env>) --out <feed.json>` so the Scout CLI can
  fetch an authenticated hosted feed, require HTTPS except loopback test URLs,
  refuse redirects, verify feed attestation, and save a local attested feed for
  existing `feed search` flows. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check`, `git diff --check`, and `just cargo
  test scout_feed_cli --lib` (29 tests). Required ADO builds were queued for
  #3264: PullRequest `168464049` and Build Validation `168464045`; GitHubPop is
  failing while the PR is draft. Previous update: Lobster PR #3240 merged into stack base
  `user/giodl/scout-feeds-docs` at merge commit `dd37d698`. Restored the live
  personal MOS3 follow-up, rebased it on the updated base, and opened draft
  Lobster PR #3256 `https://microsoft.ghe.com/bic/lobster/pull/3256` from
  `user/giodl/scout-feeds-live-personal-mos3` at head `ac940c3f`. #3256 wires
  `/v1/scout/feeds/personal.json` to optionally acquire a MOS3-scoped caller
  token, fetch live MOS3 acquisitions, normalize them into `FeedDocument`,
  re-scope the feed as personal for the authenticated tenant/user, and preserve
  the file-backed personal feed fallback. Local proof passed `cargo fmt
  --manifest-path src/lobster_runtime/Cargo.toml --check`, `git diff --check`,
  `just cargo test routes::scout_feed --lib` (12 tests), and `just cargo test
  scout_mos3 --lib` (17 tests). `just cargo clippy --lib -- -D warnings` was
  attempted but timed out after more than 20 minutes without a result. Required
  ADO builds were queued for #3256: PullRequest `168451109` and Build Validation
  `168451108`; GitHubPop is failing while the PR is draft. Previous update:
  Lobster PR #3238 merged into stack base
  `user/giodl/scout-feeds-docs` at merge commit `d670cf41`. Lobster PR #3240
  `https://microsoft.ghe.com/bic/lobster/pull/3240` was marked non-draft,
  rebased onto the updated base, and force-pushed at head `bfedd103c`.
  #3240 remains approved. Local `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check` and `git diff --check` pass; focused
  Cargo test is still blocked before compilation by private `ecsclient`
  resolution. Required ADO builds were queued for head `bfedd103c`:
  PullRequest `168433602` and Build Validation `168433598`; GitHubPop is
  failing pending proof of presence. The live personal MOS3 follow-up branch
  work is stashed locally as `wip live personal mos3 before updating 3240` and
  was not pushed. Previous update: Addressed Codeclaw feedback on Lobster PR
  #3238. Commit
  `c96df9f8` fixes the stale `scout_feed_tests.rs` compile issue by adding
  `FeedScope.user_id_hash: None` to the tenant-approved struct literal and
  updating the `claims` helper call to pass both user and tenant ids. Commented
  on the PR with proof. Local `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check` and `git diff --check` pass; focused
  Cargo test is still blocked before compilation by private `ecsclient`
  resolution. Fresh ADO builds were queued for head `c96df9f8`:
  PullRequest `168422941` and Build Validation `168422940`; review remains
  changes-requested until Codeclaw refreshes, and GitHubPop is failing pending
  proof of presence. Previous update: Lobster PR #3236 merged into
  `user/giodl/scout-feeds-docs` at merge commit `d84abde3`. Lobster PR #3238
  was rebased onto that updated base, skipping duplicated lower-stack commits
  from #3221/#3236, and force-pushed at head `3ed9f8bf`. #3238 is now
  non-draft and ready for review. Local proof passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check` and
  `git diff --check origin/user/giodl/scout-feeds-docs...HEAD`; focused
  `cargo test --manifest-path src/lobster_runtime/Cargo.toml scout_feed --lib`
  remains blocked before compilation by private `ecsclient` resolution. Fresh
  required ADO builds were queued: PullRequest `168421370` and Build Validation
  `168421368`; GitHubPop is failing pending proof of presence. Previous update:
  Opened Lobster draft PR #3240
  `https://microsoft.ghe.com/bic/lobster/pull/3240` from
  `user/giodl/scout-feeds-mos3-auth` stacked on #3236 at head `bd83e9630`.
  It adds `scout_mos3_auth` with first-class MOS3 environment names, Titles
  base URLs, delegated `.default` resource scopes, a `TokenProvider` based
  `acquire_mos3_token` helper, and tests proving MOS3 uses explicit Titles
  scopes rather than Graph. Local proof passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check` and
  `git diff --check`; focused Cargo test remains blocked before compilation by
  private `ecsclient` resolution. Required ADO builds were queued:
  PullRequest `168419854` and Build Validation `168419852`; GitHubPop is
  failing pending proof of presence. Previous update: Added a live MOS3 v-team
  demo harness at
  `projects/feeds/demo/mos3-personal-feed-demo.ps1`. The script uses Aether's
  preauthorized MOS3 token helper instead of Azure CLI, because Azure CLI's
  client app fails MOS3 scopes with AADSTS65002. Verified against MSIT on
  2026-06-17: `/catalog/v1/users/acquisitions/get` succeeds for
  `giodl@microsoft.com` but returns zero personal acquisitions, so the generated
  personal feed is empty; `/marketplace/v1/users/titles/query` succeeds and
  returns 24 marketplace titles, including 12 titles with skills and 24 with
  connectors. Use
  `powershell -ExecutionPolicy Bypass -File .\projects\feeds\demo\mos3-personal-feed-demo.ps1 -Environment msit -ShowMarketplace`
  for the meeting demo. Previous update: Lobster PR #3221 merged into stack base
  `user/giodl/scout-feeds-docs` at merge commit `ef345689`. Lobster PR #3236
  was retargeted/rebased onto that updated base, fixed for the Rust 1.93 clippy
  `double_must_use` blocker by removing the redundant `#[must_use]` on
  `build_router`, force-pushed at head `dbff419af`, and marked ready for
  review. Fresh required ADO checks are attached and running on #3236:
  PullRequest `168412678` and Build Validation `168412679`. GitHubPop is still
  failing pending proof of presence, so #3236 is not publishable yet. Feed
  strategy docs were then updated to reflect the current implementation status:
  #3170 MOS3 catalog export import, #3221 live MOS3 import, #3236 hosted
  tenant-approved feed, #3238 personal feed projection, and the current gap
  around admin composition/materialization. Markdown and DOCX exports were
  refreshed under
  `C:\Users\giodl\OneDrive - Microsoft\Documents\Microsoft Scout\Feeds`.
  Codeclaw then requested one security/contract fix on #3236: require
  `tenantIdHash` on hosted tenant-approved feeds. Commit `f6aec46db` changes
  the route to fail closed unless `scope.tenant_id_hash` exactly matches the
  authenticated caller tenant hash, adds
  `load_approved_feed_rejects_missing_tenant_scope`, and comments back on the
  PR. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check` and `git diff --check`; focused
  Cargo test is still blocked before compilation by private `ecsclient`
  resolution. Fresh ADO checks were queued: PullRequest `168415296` and Build
  Validation `168415297`. Review decision remains changes requested until
  reviewer/Codeclaw refreshes, and GitHubPop still needs proof of presence.
  Previous update: Lobster PR #3238 was opened as a draft stacked on #3236 from
  `user/giodl/scout-feeds-personal-publishing` at head `0c55235ce`. It adds a
  user-scoped `personal` feed scope, `GET /v1/scout/feeds/personal.json`,
  `LOBSTER_SCOUT_PERSONAL_FEED_DIR`, hashed tenant/user path partitioning, feed
  attestation validation, and exact caller tenant/user scope checks. This is a
  projection slice for user-authored or acquired packages, not a publishing API.
  Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml`, `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check`, and `git diff --check`; focused
  `cargo test --manifest-path src/lobster_runtime/Cargo.toml scout_feeds --lib`
  is blocked before compilation by private `ecsclient` dependency resolution.
  Required ADO checks were queued for #3238: PullRequest `168411082` and Build
  Validation `168411081`; GitHubPop is failing pending proof of presence.
  Previous update: Lobster PR #3236 was opened as a draft stacked on #3221 from
  `user/giodl/scout-feeds-hosted-effective-feed` at head `e474c84e`. It adds
  `GET /v1/scout/feeds/approved.json`, mounted by
  `LOBSTER_SCOUT_APPROVED_FEED_PATH`, to serve the signed tenant-admin-approved
  effective Scout feed behind Lobster auth. The route verifies feed
  attestation and tenant scope on every request and sets `Cache-Control:
  no-store`. Local proof passed `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml --check` and `git diff --check`; focused
  `cargo test --manifest-path src/lobster_runtime/Cargo.toml scout_feed::tests
  -- --nocapture` is blocked before compilation by private `ecsclient`
  resolution. Required ADO checks are attached and running on #3236:
  PullRequest `168409775` and Build Validation `168409774`; GitHubPop is
  failing pending proof of presence. #3221 is approved and has ADO checks
  attached on head `13772d89e`; it still needs GitHubPop proof and green ADO
  before #3236 should be rebased/marked ready.
  Previous update: Lobster PR #1944 merged into stack base
  `user/giodl/scout-feeds-docs` at merge commit `9d44a5a0`. Lobster PR #3170
  was correctly restacked onto that updated base and then updated at
  `f476c33e` to address the two open review blockers: normalize MOS3
  `state`/`deploymentState`/`deployment_state` to `mos3.deploymentState`, test
  those aliases, document the emitted MOS3 metadata keys including `source.feed`
  for lane metadata, and update the main roadmap so PR 3 is explicitly the MOS3
  catalog snapshot adapter. Required ADO checks are attached and running:
  PullRequest `168346373` and Build Validation `168346374`. GitHubPop is still
  failing on #3170, and review is now approved. Lobster PR #3221 was restacked
  on the new #3170 head at
  `ee2818f7`; rebase resolution preserved #3170's `mos3.deploymentState`
  contract plus #3221's live-MOS3 metadata additions. Required ADO checks are
  attached and running: PullRequest `168346557` and Build Validation
  `168346559`. GitHubPop is also failing on #3221. Local proof passed for
  rustfmt, `git diff --check`, and the Docker stub regression where applicable;
  local Rust compile/test/clippy are currently blocked before compilation by
  private dependency resolution for `ecsclient` resolving from crates.io in this
  checkout. Keep #3170 and #3221
  separate for now: #3170 is the MOS3 catalog export adapter layer, while #3221
  is the live MOS3 HTTP/token-boundary follow-on. Aether's latest MOS3
  usage was reviewed from `C:\src\aether`: current live-MOS3 alignment should
  follow `Mos3CatalogClient`, `Mos3EnvironmentCache`, `mos3_token`,
  `PluginCatalogService`, and `Mos3ConnectorRegistrar`, including environment
  discovery, MOS3-scoped OBO tokens, `client-request-id`, diagnostic header
  capture, `AgentSkills`/`AgentConnectors`, `validDomains`, `auth.referenceId`,
  `remoteMcpServer.mcpServerUrl`, skill `blob_path` and `public_skill_path`,
  and policy overlays from `getGptsById`. Use "MOS3 catalog export" or "MOS3
  catalog snapshot export" in partner-facing docs; "MOS3 snapshot" is our local
  adapter shorthand, not a confirmed MOS3 product noun.
- Current focus: Feeds stacks rebased and pushed; reviewed Scout Desktop
  feasibility for MOS3 feed consumption. Current recommendation: do not add
  direct MOS3 auth/acquire logic to ClawPilot/Scout Desktop yet; add a
  Lobster/Scout effective-feed consumer that maps Lobster `FeedDocument` entries
  into the existing Extensions catalog, validates feed attestation, and records
  feed provenance on install. MOS3 stays behind the Lobster/MOS3 source adapter
  until MOS3 API and acquisition semantics are stable. MOS3 feed composition position
  and architecture notes split and improved with stakeholder framing,
  composition rules, and runtime boundaries; feed contract standard, admin
  experience, and client conformance notes added, reviewed, and aligned on
  effective outcomes; npm leverage note updated to position skills and plugins
  as npm packages by default while MOS3 remains the governance and composition
  plane; package defense added as the required evidence gate for npm-backed
  skills and plugins without requiring a new "npm Defender" product name; npm
  package authoring convention added with `mos3.capability.json` sidecar,
  package defense evidence, and MOS3 effective feed boundary; schematic tables
  converted to narrative prose except for behavior-story tables; seven
  high-quality feed diagrams added and embedded in
  Markdown and DOCX exports under
  `C:\Users\giodl\OneDrive - Microsoft\Documents\Microsoft Scout\Feeds`;
  OpenClaw stack merge state is clean; Lobster MOS3 catalog export adapter PR
  #3170 is restacked on the current Scout CLI layer with required ADO checks
  attached and running; Lobster stack still needs CI/check follow-up. PR #1941
  was marked ready for review on 2026-06-16;
  Eduardo requested tenant hash normalization; fix commit `04da5ac52` pushed so
  `scout_feeds::tenant_id_hash` delegates to `admin_spaces::tenant_id_hash`.
  ADO then failed `Lobster CLI Validation` on a transitive `vite` npm audit
  advisory; lockfile-only fix `8d29b07c8` pushed to resolve `vite` to
  `8.0.16`. Direct ADO builds were requeued for head `8d29b07c8`: PullRequest
  build `168292060`, Build Validation build `168292059`. Next stack PR #1944
  was rebased onto current #1941 head and marked ready for review at head
  `37e30f2e`; after #1941 merged, #1944 was restacked onto the updated
  `user/giodl/scout-feeds-docs` base at head `a423dc955`, clearing conflicts.
  Fresh ADO builds queued: PullRequest `168313552`, Build Validation
  `168313550`. #1944 then failed both runtime container image builds because
  the Docker dependency warm-up stubbed `src/main.rs` and `src/lib.rs` but not
  the new Cargo bin target `src/bin/scout.rs`. Fix commit `24d878251` updates
  both Docker builder stages to stub `src/bin/scout.rs` and adds
  `scripts/lobster_runtime_dockerfile_stub_test.py`, which checks Cargo bin
  paths against Docker warm-up stubs. New ADO builds queued for #1944:
  PullRequest `168320550`, Build Validation `168320549`. #1944 then added the
  narrow install slice requested for this PR: commit `747266819` adds
  `scout feed install --feed <approved.feed.json> --id <skill-id> --target
  <openclaw-root>`, limited to verified tenant-approved feeds, skill packages,
  local `file://` artifacts, safe install ids, no overwrite, no hooks, and
  provenance under `<target>/skills/<id>/.scout-feed-provenance.json`. New ADO
  builds queued for #1944 head `747266819`: PullRequest `168326149`, Build
  Validation `168326147`. Codeclaw then requested one change on the install
  slice: verify `artifact_sha256` before copying local artifacts. Commit
  `093d1eefe` fixes that by hashing file artifacts by bytes and directory
  artifacts by deterministic tree hash before creating `<target>/skills/<id>`.
  Local proof passed: rustfmt check, `git diff --check`, Docker stub regression,
  runtime clippy with `-D warnings`, and `cargo test scout_feed_cli::tests`
  with 23 passed. New ADO builds queued for #1944 head `093d1eefe`:
  PullRequest `168334440`, Build Validation `168334441`. GitHubPop is green,
  Codeclaw review is approved, Build Validation is green, and the remaining
  #1944 blocker was PullRequest runtime E2E shards. PR #1944 later merged into
  the stack base at `9d44a5a0`. MOS3 adapter PR #3170 is now restacked onto
  that updated base and then updated at head `f476c33e`; required ADO builds
  `168346373` and `168346374` are running, GitHubPop is failing, and review is
  approved. Live MOS3 PR #3221 is a draft stacked on #3170 from branch
  `user/giodl/scout-feeds-live-mos3` at head `ee2818f7`. It adds
  `scout feed import mos3-live`, fetches live MOS3 acquisitions, optionally
  discovers the MOS3 titles environment, and preserves Aether-aligned MOS3
  metadata. Required ADO builds `168346557` and `168346559` are running, and
  GitHubPop is failing.
- Active branch / PR: Lobster PR #3368
  `https://microsoft.ghe.com/bic/lobster/pull/3368` is open from
  `user/giodl/scout-feeds-web-ux` for web search and personal publish UX.
  Lobster PR #1946 `https://microsoft.ghe.com/bic/lobster/pull/1946` is open
  from `user/giodl/scout-feeds-clawhub-adapter` for ClawHub snapshot import.
  Lobster PR #3272, PR #3273, PR #3305, PR #3345, and PR #3353 are merged into
  `main`.
  ClawPilot PR #3542
  `https://github.com/gim-home/m/pull/3542` is open from
  `user/giodl/scout-desktop-mos3-feed` at head `fc9324c3` after the review
  security fix that gates arbitrary feed env vars to dev and only attaches prod
  app tokens to fixed Lobster prod feed URLs. ClawPilot PR #3613
  `https://github.com/gim-home/m/pull/3613` is open from
  `user/giodl/scout-desktop-personal-feed-publish` at head `6799ec5f`,
  stacked on #3542. #3613 adds `skills:publish-personal`, a dev/test-only
  local-skill Publish button, a Hugin `PublishSkill` measure, catalog
  invalidation after publish, and fs-backed tests for local-only rejection,
  missing skill metadata, missing `SKILL.md`, malformed existing feed handling,
  temp-write + rename, feed merge, install URL, dotfile hash exclusion, symlink
  rejection, and direct `skills:import-url` `file://` handling. Local proof passed focused node
  publish/feed tests, focused unit extension tests, format, lint, type-aware
  lint, and `git diff --check`. PR-agent and ClawPilot Buddy checks are queued
  or in progress for both ClawPilot PRs.
- Known dirty state: `C:\src\openclaw-stack` is on
  `tmp/rebase-feeds-native-search-default` with pre-existing untracked
  `artifacts/`; `C:\src\lobster-enterprise-feeds-1` is clean on
  `user/giodl/scout-feeds-clawhub-adapter`;
  `C:\src\lobster-scout-feeds-cli` is clean on
  `user/giodl/scout-feeds-cli`;
  `C:\src\lobster-scout-feeds-mos3-adapter` is clean on
  `user/giodl/scout-feeds-mos3-publish-write` after pushing #3273 head
  `5aa78381`; `C:\src\lobster-scout-feeds-web-ux` is clean on
  `user/giodl/scout-feeds-web-ux` after pushing #3368 head `769514b44`.
- Blocking question: direct MOS3 write-back remains the next design decision
  after #3542 and #3613. The current ClawPilot draft PR #3542 is the step-2
  Desktop consumption slice: consume Lobster/MOS3 tenant-approved and personal
  feeds in the Extensions catalog. The current ClawPilot draft PR #3613 is the
  local personal-feed publishing slice, so a local skill can publish into the
  same feed contract before MOS3 write-back is added. Tenant-admin composition
  may be owned by MOS3 if MOS3 owns N-source composition, tenant policy, and
  effective-feed publishing.
- Scout Desktop PR work started in `C:\src\clawpilot` on branch
  `user/giodl/scout-desktop-mos3-feed` from local `origin/main`
  `9622f039` (`v0.23.112`). Remote fetch from `https://github.com/gim-home/m`
  is blocked by GitHub auth, so the branch used the existing local `origin/main`
  ref. Current implementation adds a temporary env-configured feed bridge:
  `SCOUT_DESKTOP_FEED_PATH` / `SCOUT_DESKTOP_FEED_URL` for normalized Scout feed
  JSON, `SCOUT_DESKTOP_MOS3_SNAPSHOT_PATH` /
  `SCOUT_DESKTOP_MOS3_SNAPSHOT_URL` for direct MOS3 snapshot JSON, and optional
  `SCOUT_DESKTOP_MOS3_BEARER_TOKEN` for URL fetches. It maps skill entries into
  the Extensions catalog, skips connector/plugin entries with diagnostics, and
  only enables install when the feed entry includes an HTTP(S) skill URL.
  Focused validation passed with local tool entrypoints:
  `node node_modules\vitest\vitest.mjs run --project node common/scout-feed-catalog.test.ts electron/scout-feed-catalog.test.ts electron/preload.test.ts`,
  `node node_modules\vitest\vitest.mjs run --project unit src/features/extensions/ExtensionsCard.test.tsx src/features/extensions/parseCatalogContent.test.tsx`,
  and non-type-aware `oxlint` on touched files. Full `tsc --noEmit` is blocked
  by pre-existing dependency/type drift in the checkout. Filed as
  `https://github.com/gim-home/m/pull/3542` from commit `85f2ee70`.
  Follow-up commit `5444a37e` fixed the PR-owned type-aware lint finding in
  `electron/scout-feed-catalog.test.ts` by passing test env overrides through a
  `NodeJS.ProcessEnv` helper. PR body now uses the default template; remaining
  expected blockers are Jakob's real tracking issue reference, `/m-code-review`
  confirmation, and optional real-app proof with a sample MOS3/Scout snapshot.
  MOS3 direct-client note: use Discovery first and select the environment
  resource scope from the discovered endpoint; Delos sovereign scope appears to
  be `https://titles.delos.mos.svc.sovcloud-api.de/.default`, while the GUID
  form should only be used if MOS3/Entra docs identify it as the accepted
  resource identifier. Real MOS3 calls also need trace id/correlation-vector
  logging per MOS distributed tracing guidance.
  PR body was then updated after MOS3 docs review: direct MOS3 auth remains
  explicitly out of scope for #3542; follow-up direct-client work should use
  Discovery and the MOS3 environment table rather than hard-coding one scope.
  Known Identifier URI scopes captured in the PR body:
  `https://testappservices.mos.microsoft.com/.default`,
  `https://titles.msitprv.mos.microsoft.com/.default`,
  `https://titles.msit.mos.microsoft.com/.default`,
  `https://titles.prod.mos.microsoft.com/.default`,
  `https://titles.gccm.mos.microsoft.com/.default`,
  `https://titles.gcch.mos.svc.usgovcloud.microsoft/.default`,
  `https://titles.dod.mos.svc.usgovcloud.microsoft/.default`, and
  `https://titles.bleu.mos.svc.sovcloud-api.fr/.default`. CI on commit
  `5444a37e` is green except the PR template check, which still needs Jakob's
  issue number and `/m-code-review` confirmation.
  Follow-up commit `982f1126` added
  `src/features/extensions/useExtensionsData.test.tsx`, covering the renderer
  merge from `extensionsCatalogAPI.list()` into catalog skills plus feed
  install-state behavior for metadata-only vs installable feed skills. Local
  validation passed: unit extension tests 33 passed, node feed/preload tests 71
  passed / 4 skipped, format on the new test, non-type-aware lint on the new
  test, and type-aware lint on `useExtensionsData` + its test. PR body proof now
  explicitly says no manual app run has been done against a real MOS3/Scout
  feed yet, and macOS is marked as CI-covered.
  Follow-up commit `f32f0203` assumes MOS3/feed entries can carry installable
  artifact URLs and broadens install URL detection: normalized Scout feeds now
  accept `installUrl` / `install_url` on the entry or source, and raw MOS3
  snapshots accept aliases such as `skillUrl`, `artifactUrl`, `packageUrl`,
  `blobUrl`, and `downloadUrl`. These map to the existing feed skill install
  path, which calls `skillsAPI.importUrl(...)` when the selected catalog item has
  an HTTP(S) `source.installUrl`. Local validation for `f32f0203` now passes:
  `pnpm exec vitest run --project unit --project node
  common/scout-feed-catalog.test.ts
  src/features/extensions/useExtensionsData.test.tsx` passed 7 tests across 2
  files; `pnpm exec oxfmt --check` passed on the three touched files;
  `pnpm exec oxlint --deny-warnings` passed on the three touched files; and
  `pnpm exec oxlint --deny-warnings --type-aware --type-check` passed on the
  three touched files. Local repair note: the interrupted hoisted install had
  left `node_modules/.bin` absent, so Windows shims were recreated locally for
  `vitest`, `oxfmt`, `oxlint`, and `tsgolint`.
  CI for `f32f0203` is green in ClawPilot Buddy, including Lint & Format,
  Windows/macOS unit tests, and Windows/macOS E2E shards. The PR-body edit
  retriggered lightweight GitHub checks (`debounce`, `check`, `label`), which
  were pending at the last check.
  Caveat: full `pnpm install --frozen-lockfile` still stalls before writing
  pnpm metadata in this checkout, even after `pnpm run auth:1js`.
  After Lobster #3170 merged, Scout Desktop was checked against the landed
  Lobster feed contract. #3170 emits compatible `FeedDocument` JSON, and #3236
  now provides the hosted Lobster `/v1/scout/feeds/approved.json` route for a
  signed tenant-approved effective feed once it lands. Commit `8e72c258` pushed
  to PR #3542 verifies Scout feed attestations when present and accepts MOS3
  `public_skill_path` / `publicSkillPath` as
  `metadata["mos3.publicSkillPath"]`, so Lobster #3170 / #3221 output is
  installable when that value is an HTTP(S) skill URL. Focused validation
  passed: `pnpm exec vitest run --project unit --project node
  common/scout-feed-catalog.test.ts
  src/features/extensions/useExtensionsData.test.tsx` (10 tests), `pnpm exec
  oxfmt --check` on the touched files, `pnpm exec oxlint --deny-warnings` on
  the touched files, and `pnpm exec oxlint --deny-warnings --type-aware
  --type-check` on the touched files.
- 2026-06-19 ClawPilot review-fix update: PR #3542
  `https://github.com/gim-home/m/pull/3542` was updated and force-pushed at
  `2cad1e40`. Reviewer feedback addressed: passive catalog loads use
  silent-only app-token acquisition, configured feed failures are isolated,
  install URLs are limited to trusted HTTP(S) `SKILL.md` URLs on the source host
  or subdomains, existing installed feed skills stay installed even when an
  entry lacks an install URL, and docs now cover the Scout feed bridge. Local
  proof passed: focused node feed tests (46 tests), focused unit extension
  tests (11 tests), format, lint, type-aware lint, `git diff --check`, and
  Codex review clean. GitHub showed all visible checks green and review
  required.
- 2026-06-19 ClawPilot personal-publish update: PR #3613
  `https://github.com/gim-home/m/pull/3613` was rebased onto #3542 and
  force-pushed at `f526c9f4`. Reviewer feedback addressed: remote feeds cannot
  drive local `file://` reads, local feed files can still install
  `file://.../SKILL.md`, publish env resolution is centralized/tested, publish
  defaults to `SCOUT_DESKTOP_PERSONAL_FEED_PATH` so the writer and catalog
  reader use the same file, and feed item `name` now uses the stable skill id so
  display titles do not break installed-state matching. Local proof passed:
  focused node feed/publish tests (47 tests), focused unit extension tests (22
  tests), format, lint, type-aware lint, `git diff --check`, and Codex review
  clean. GitHub checks were queued/in-progress immediately after the push.
- 2026-06-19 Lobster Scout feeds web UX update: PR #3368
  `https://microsoft.ghe.com/bic/lobster/pull/3368` was updated at
  `4a3df009bcd8eec48049ee98142c76ee82e734ee`. The latest commit addresses the
  durable-storage review by failing hosted personal publish closed unless
  `LOBSTER_SCOUT_PERSONAL_STORAGE_DURABLE=true` is set, adding a shared
  per-feed `.lock` file with stale-lock recovery around the read/mutate/write,
  keeping temp-file/sync/persist feed writes, and adding tests for the durable
  ack gate, cross-process lock contention, stale-lock recovery, and concurrent
  same-feed publish. It also fixes `/feeds` as a rail-bearing route and extends
  the rail-hoist regression test to navigate through `/feeds`. Local proof
  passed: `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `just cargo test scout_feed::tests --lib` (24 passed),
  `just cargo clippy --lib --tests -- -D warnings`, targeted web unit tests for
  `App.rail-hoist`, `FeedsPage`, and `scoutFeedsApi` (13 passed),
  `pnpm type-check`, `pnpm lint`, `git diff --check`, and Codex review clean.
  Required ADO was manually queued on the new head: PullRequest build
  `168778939` and Build Validation build `168778937`. GitHub still showed
  dspektor's prior requested-changes review active immediately after the push;
  a PR comment was posted asking for re-review with the new storage invariant.
- 2026-06-20 Lobster Scout feeds web UX review update: PR #3368
  `https://microsoft.ghe.com/bic/lobster/pull/3368` was updated at
  `18a4e118157c2d7377b286e63b6d94fed7da465b` on
  `user/giodl/scout-feeds-web-ux`. The latest commit closes the remaining
  concrete Copilot inline cleanup by returning safe `BadRequest` validation
  messages as the runtime `ApiError.userMessage`; added
  `bad_request_response_surfaces_validation_message` coverage. Verified the
  other old inline items are addressed on the branch: web error extraction
  handles top-level `userMessage` / `errorCode`, personal feed metadata does
  not include `personal.hostedArtifact.path`, and signed feed writes are
  temp-file plus atomic persist under locks. Local proof passed:
  `just cargo test scout_feed::tests --lib` (34 passed),
  `just cargo clippy --lib --tests -- -D warnings`,
  `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  targeted web unit tests for `scoutFeedsApi`, `FeedsPage`, and
  `App.rail-hoist` (17 passed), `npm run type-check`, `npm run lint`,
  `npm run format:check`, and `git diff --check`. Required ADO queued on the
  new head: PullRequest build `168852545` and Build Validation build
  `168852544`. PR comment:
  `https://microsoft.ghe.com/bic/lobster/pull/3368#issuecomment-183680201`.
  GitHub review decision remains `CHANGES_REQUESTED` from stale reviews until
  reviewers refresh.
- 2026-06-20 Lobster Scout feeds web UX landed: PR #3368
  `https://microsoft.ghe.com/bic/lobster/pull/3368` merged to `main` at
  `2026-06-20T15:08:13Z`. Merge commit:
  `9787c19761f967549e88abc00feacd88f76e6823`. This lands the gated Feeds UX,
  personal/tenant feed search, MOS3-backed personal publish UX, local publish
  dev/test guardrails, durable personal artifact/feed storage checks, and the
  review hardening around public artifact base URLs, feed locking, stale-lock
  recovery, metadata caps, pending publish copy, and validation error surfacing.
- 2026-06-20 Lobster Scout tenant-admin feed composition branch started:
  PR #3422 `https://microsoft.ghe.com/bic/lobster/pull/3422` from
  `user/giodl/scout-feeds-admin-composition` in
  `C:\src\lobster-feeds-admin-composition`, head
  `d4cf7a3667a4a2a76fb343fe95a6cfa3b131f4c5`. Scope: file-backed tenant
  admin catalog APIs over the existing `scout_catalog` model, per-tenant
  approved-feed output directory support, fail-closed `lobster.tenant.admin`
  authorization via admin assignment snapshot, and a separately flighted Feeds
  page tenant-admin composition panel. Local validation passed in WSL:
  `cargo test web_feature_flags --lib` and `cargo test scout_feed --lib`
  (116 feed-related tests). Web validation passed:
  targeted Biome check for changed feed/web files, `pnpm vitest run
  tests/services/webFeatureFlagsProbe.unit.test.ts`, and ECS inventory check.
  `tests/pages/FeedsPage.unit.test.tsx` is authored but could not run locally
  because this worktree's reused `node_modules` is missing
  `@tanstack/react-query`; CI should run with a fresh install. Required ADO
  queued: PullRequest build `168856235` and Build Validation build
  `168856234`. Current PR state right after open: non-draft, mergeable,
  review required, ADO queued, `GitOps/FileAffordance` passed, and
  `GitOps/GitHubPop` failed with placeholder details URL.
- 2026-06-22 OpenClaw hosted catalog prep review refreshed: PR #95846
  `https://github.com/openclaw/openclaw/pull/95846` remains draft and
  mergeable at head `44c0884c3edcaa07ea94d5f82624fe99b3f532b7`. Default
  `codex review --base refs/remotes/origin/main` is blocked by local Codex
  account/model entitlement for `gpt-5.3-codex`, but the explicit override
  `codex review -c model=gpt-5.5 --base refs/remotes/origin/main` completed
  and reported no actionable correctness issues. The review sandbox could not
  run tests because its read-only filesystem could not create the heavy-check
  lock directory; normal writable-shell validation passed:
  `pnpm exec oxfmt --check src/plugins/official-external-plugin-catalog.ts src/plugins/official-external-plugin-catalog.test.ts`,
  `pnpm exec oxlint --deny-warnings src/plugins/official-external-plugin-catalog.ts src/plugins/official-external-plugin-catalog.test.ts`,
  `git diff --check refs/remotes/origin/main...HEAD`, and
  `CI=1 timeout 180s node scripts/test-projects.mjs src/plugins/official-external-plugin-catalog.test.ts`
  with 17 tests passing. ClawSweeper re-review is queued after proof was added
  to the PR body; latest PR comments only show the old proof-needed verdict,
  the `@clawsweeper re-review` command, and the queue acknowledgment.
- 2026-06-22 OpenClaw hosted catalog fetch draft opened: PR #95868
  `https://github.com/openclaw/openclaw/pull/95868` from
  `feeds-hosted-catalog-fetch`, commit
  `50bb65f1c9b211bc2cfaf28d5714dbd2de2e790a`, stacked on #95846 but opened
  against `main` because the base prep branch is a fork PR. Scope: async
  guarded fetch loader for
  `https://register.openclaw.ai/official-external-plugin-catalog.json`, HTTPS
  and hostname allowlist enforcement, optional `If-None-Match` /
  `If-Modified-Since` headers, `sha256:` body checksum, schema v1 validation,
  bounded body reads with chunk timeout, and bundled fallback for network,
  HTTP, schema, checksum, size, timeout, or 304-without-cache cases. Existing
  sync `listOfficialExternalPluginCatalogEntries()` remains bundled only.
  Validation passed: targeted `oxfmt --check`, targeted `oxlint
  --deny-warnings`, `git diff --check`, focused catalog test with 21 tests,
  `pnpm tsgo:core:test`, and `codex review -c model=gpt-5.5 --uncommitted`
  with no actionable correctness issues. PR body had to be repaired through
  REST API after an initial shell-substitution create mangled backticked text.

## Resume Checklist

- Run: query OpenClaw PRs #87824-#87827 and #88732.
- Run: query Lobster PR #1946 first for the remaining ClawHub adapter branch.
  #1939 is merged into `main` at `6d70078e`; #3272 is merged at `c61bba02`;
  #3273 is merged at `e291f3d8`.
- Verify: identify which stack layer is current before restacking.
- Read: `projects/lobster/feeds-scout.md` for Lobster-specific Scout feed
  operating model and admin-setting touchpoints.
- Update: this file and README when PR statuses change.

## Guardrails

- Do not put feed implementation prototypes in `claws-hapi`.
- Keep install/discovery/policy/lifecycle/feed-search concerns separated.
- Do not mix Lobster Scout publishing policy into OpenClaw primitive PRs.

## Open Threads

- 2026-06-19 OpenClaw #87824 update: pushed signed head `41fe48a7dd8` on
  `feeds-read-only-discovery`, fixing the remaining ClawSweeper HTTPS feed
  availability/redaction findings and proof gap. HTTPS feed fetches now pass
  `timeoutMs: 15000` to `fetchWithSsrFGuard`; HTTPS body reads pass
  `chunkTimeoutMs: 15000` to `readResponseWithLimit`; failure diagnostics
  redact URL credentials, query strings, and fragments. Added focused coverage
  for timeout options, oversized response redaction, stalled-body redaction,
  and a committed GitHub Raw proof fixture at
  `extensions/feeds/testdata/proof-feed.json`. Real source CLI proof in the PR
  body now loads that fixture over HTTPS and shows `feeds list --json` /
  `feeds search calendar --type plugin --json` returning
  `proof-calendar-helper`. Validation passed focused feeds CLI Vitest (14
  tests), full `extensions/feeds/src` Vitest (18 tests), targeted `oxlint`,
  targeted `oxfmt --check`, `pnpm tsgo:extensions`, and `git diff --check`.
  Re-review comment:
  https://github.com/openclaw/openclaw/pull/87824#issuecomment-4755290678.
  Live after ClawSweeper refresh: draft, merge state `CLEAN`,
  `proof: sufficient`, rating `gold shrimp`, and `status: waiting on author`.
- Decide whether Scout catalog publishing still needs any follow-up beyond the
  landed Lobster #3305 workflow and ClawPilot #3613 local publish path.
- Decide when Scout Desktop client consumption should switch from local/file
  feed URL proof to the Lobster hosted approved-feed endpoint from #3236.
- Review `mos3-feed-composition-position.md` and
  `mos3-feed-composition-architecture.md` with MOS3/shared registry partners.
- Review `mos3-feed-contract-standard.md`, `mos3-feed-admin-experience.md`, and
  `mos3-feed-client-conformance.md` after the position is accepted.
