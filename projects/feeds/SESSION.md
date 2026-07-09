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

- Last updated: 2026-07-08.
- Last agent: Codex.
- 2026-07-08 MOS3 shared-registry delivery plan: added
  `projects/feeds/mos3-shared-registry-delivery-plan.md` as the July execution
  plan for Lobster/MOS3 shared registry work across skills, MCP/connectors, and
  agents. The plan keeps the work in the Feeds area, with six target dates:
  contract lock on 2026-07-10, skills search/local install PR by 2026-07-15,
  skills publish PR by 2026-07-20, MCP/connectors search PR by 2026-07-24,
  MCP/connectors publish foundation PR by 2026-07-29, and agents contract/RFC
  PR by 2026-07-31. It separates search, install, save-to-library, publish,
  share, follow, tenant approval, and runtime activation so connector/agent
  visibility does not imply local runtime support.
- 2026-07-08 ClawHub platform feed-signing direction: clarified that the
  first four OpenClaw trust PRs (#98299, #98316, #98338, #98350) remain the
  generic DSSE/config/refresh/CLI trust substrate. The ClawHub-specific
  zero-config UX lands in the follow-up PRs: RFC #25 now says ClawHub-hosted
  feeds use a ClawHub platform feed-signing key, OpenClaw bundles only the
  matching public key, and clients must not bootstrap trust from a ClawHub
  `/public-key` endpoint. ClawHub #3005 PR body/runbook now says the private
  key stays in Convex/env secret storage, the public key is added to OpenClaw's
  bundled trust roots, and the same ClawHub platform feed-signing path should
  sign `clawhub-public`, named, account, org, and ClawHub-composed feeds.
  OpenClaw #101981 now adds the bundled trust-root slot and keeps env/config as
  development/private-deployment/rotation/emergency overrides; it intentionally
  does not invent a fake production key. Pushed heads: RFC #25 `08b89b0`,
  ClawHub #3005 `fd1d3732`, and OpenClaw #101981 `708d0173`. #3005 was rebased
  onto current ClawHub `main`, changed the OpenClaw feed payload to schema v1,
  preserved DSSE signing over decoded payload bytes, and formatted the rebased
  handler test. Local validation passed focused feed handler tests (9 passed),
  targeted `format:check`, schema package build, and `git diff --check`.
  #101981 was restacked onto #98350 head `074dedb1057`; it remains GitHub
  `mergeStateStatus=DIRTY` against `main` until the first four trust PRs land,
  but the branch stack is current.
- 2026-07-08 OpenClaw/ClawHub signed default-feed review closeout:
  Codex-reviewed ClawHub PR `https://github.com/openclaw/clawhub/pull/3005`
  and OpenClaw PR `https://github.com/openclaw/openclaw/pull/101981`.
  Accepted/fixed ClawHub findings: moved signed `/v1/feeds/plugins` signing
  into a Node-runtime action module, made feed loaders use internal queries,
  bounded root feed max at 500, filtered skill lanes while paginating the
  existing active digest index up to a 5000-row scan cap, removed unused
  skill-feed backfill fields, used public origin for feed index URLs, added
  package visibility indexes before cap, and switched ClawHub/OpenClaw DSSE
  signing input to decoded payload bytes. OpenClaw fix head `35898de` and
  ClawHub fix head `5bc6456e` were pushed via `giodl73-repo`. Local proof:
  ClawHub focused feed handler tests and format/diff checks passed; OpenClaw
  focused catalog/envelope tests passed in the full checkout; final Codex
  reviews were clean for both PRs. PRs remain draft with fresh GitHub checks in
  progress; ClawHub Vercel shows the existing authorization failure context.
- 2026-07-07 named/followable feeds parking: closed the Lobster
  named/followable feeds stack until runtime/ADO stability improves. Closed PRs:
  #4044, #3990, #3991, #3995, #3996, and #3997. Each has a parking comment
  saying the work remains useful but is paused and should be revisited later
  after stability settles.
- 2026-07-07 Lobster PR loop: per user ordering, #3749 was fixed before
  touching more #4044 ADO. #3749 is now at head `bcfe1ca4f` with the runtime
  `RUSTSEC-2026-0204` deny waiver/restack and observed ADO builds PullRequest
  `171204412`, Build Validation `171204430`. #4044 requested changes are
  pushed at `958f92830`: MOS3 named followable feeds are ACL-filtered,
  group ACLs match caller directory/group ids, and followable GET plus
  `followedFeeds` diagnostics coverage was added. Do not manually queue #4044;
  wait for automatic checks after #3749 settles.
- 2026-07-06 Lobster named-feeds ADO drain: because ADO pools are exhausted,
  work the Lobster dependency stack one PR at a time from the bottom and rely
  on automatic ADO attachment/runs unless the user explicitly names a PR/branch
  to queue:
  #4044 -> #3990 -> #3991 -> #3995 -> #3996 -> #3997. #4044 now has head
  `b648a0ece9d693e2d38003e7c728a77bf400859a` after fixing the HabitsPage
  close-timer unit failure, merging current `origin/main`, removing the stale
  `AgentProvisioningService.agent_activated_tx` test-helper field, and
  carrying main's runtime `RUSTSEC-2026-0204` cargo-deny waiver. Local proof
  passed the focused HabitsPage unit test, web type-check, web format check,
  focused runtime `dev_proxy` tests, runtime fmt, runtime clippy,
  `scripts/stale-advisories.sh`, and `git diff --check`; observed ADO for
  #4044 was PullRequest `171137037` and Build Validation `171137041`. Wait for
  required contexts before moving to #3990; do not manually queue the next PR.
  #3749 is an independent approved/mergeable rerun candidate after #4044
  settles.
- 2026-07-06 OpenClaw hosted feed trust stack refresh: Confirmed the current
  signed trust stack is RFC `https://github.com/openclaw/rfcs/pull/25` plus
  OpenClaw PRs `https://github.com/openclaw/openclaw/pull/98299`,
  `https://github.com/openclaw/openclaw/pull/98316`,
  `https://github.com/openclaw/openclaw/pull/98338`, and
  `https://github.com/openclaw/openclaw/pull/98350`. This supersedes the older
  `extensions/feeds` #87824-#88732 framing for active public-key trust work.
  Live state: #98299, #98316, and #98350 still show stale ClawSweeper
  re-review-loop/unranked labels despite proof updates; #98338 already has
  `proof: sufficient` and is waiting on maintainer/security acceptance plus
  predecessor ordering. Updated `projects/feeds/README.md` with a dedicated
  "OpenClaw Hosted Feed Trust Stack" table and next action. Initial
  `@clawsweeper re-review` comments failed because `github.com` was active as
  the EMU account `giodl_microsoft`; switched `gh` to `giodl73-repo` and posted
  re-review comments on #98299, #98316, #98338, and #98350:
  `https://github.com/openclaw/openclaw/pull/98299#issuecomment-4896056511`,
  `https://github.com/openclaw/openclaw/pull/98316#issuecomment-4896056538`,
  `https://github.com/openclaw/openclaw/pull/98338#issuecomment-4896056535`,
  and
  `https://github.com/openclaw/openclaw/pull/98350#issuecomment-4896056530`.
- 2026-07-06 #4044 requested-change fix: Replaced superseded #3989 with
  Lobster PR `https://microsoft.ghe.com/bic/lobster/pull/4044`, then addressed
  Galin's requested changes on branch
  `user/giodl/scout-feeds-followable-foundation-refresh` at head
  `67562f2a0b89350e237e81badf2f20884fa28941`. Scope: followed named-feed
  expansion now re-checks current visible followable metadata before merging;
  source and tenant-approved follows reject new revision pins and legacy pinned
  follows fail closed; MOS3 named-feed token-bearing reads require HTTPS except
  loopback HTTP tests; docs now reflect named-only pins and bridge visibility
  semantics. Validation passed runtime `cargo fmt --check`, focused
  `scout_mos3_named_feeds`, `merge_followed_personal_feeds`, and
  `follow_feed_` tests, broader `cargo test scout_feed --lib` (155 passed),
  runtime `cargo clippy --lib -- -D warnings`, and `git diff --check`.
  Commented on #4044 with the fix summary. GitHubPop remains Gio-owned.
- 2026-07-06 Lobster named-feeds stack requested-change pass: Addressed the
  live review asks across the ready feeds stack. #3990 was rebased onto #4044
  head `67562f2a0` and now includes the Skills discovery UX asks: followable
  feed cards render trust labels plus labeled revision text, and followable
  discovery failures show a scoped warning while available skills remain
  visible. #3997 now fixes the requested-change ACL round-trip bug by splitting
  shared named-feed editing into typed user/group object-id fields and adding a
  regression test that preserves mixed `User` + `Group` ACL entries through
  Edit -> Save. Restacked and force-pushed #3991, #3995, #3996, and #3997 onto
  the refreshed branch chain. Local validation: #3990 focused
  `SkillsPage.feeds.unit.test.tsx` (19 passed), web `format:check`,
  web `type-check`, and `git diff --check`; #3997 focused
  `FeedsPage.unit.test.tsx` (15 passed), web `format:check`, web
  `type-check`, runtime `cargo fmt --check`, and `git diff --check`; #3991,
  #3995, and #3996 passed `git diff --check` plus runtime `cargo fmt --check`
  where applicable, with #3996 also passing web `format:check`. GitHubPop
  remains Gio-owned across the stack; old review decisions may remain stale
  until reviewers rerun on the new heads.
- 2026-07-06 Lobster followable/MOS3 requested-change pass: Addressed the new
  #3990/#3991 review asks in the lower branch
  `user/giodl/scout-feeds-followable-foundation-refresh` at head `4241a590c`.
  Runtime now loads the caller-visible named-feed set once per
  `personal.json` merge instead of once per followed named feed; MOS3 named
  discovery now logs token/list failures and skips MOS3 named identities that
  do not have a matching signed bridge feed document, preventing successful
  follows that cannot materialize into the personal feed. Docs now say only
  supported followed feeds expand into `personal.json`: signed named bridge
  documents, configured MOS3 marketplace source, and tenant-approved feeds.
  Restacked and pushed #3990 (`4107aa07b`), #3991 (`de821a5dc`), #3995
  (`f17cce98e`), #3996 (`6bc917647`), and #3997 (`18b712419`). Validation:
  lower branch passed runtime `cargo fmt --check`, `git diff --check`,
  focused `merge_followed_personal_feeds` tests (3 passed), and focused
  `follow_feed_` tests (2 passed); #3990 passed focused
  `SkillsPage.feeds.unit.test.tsx` (19 passed), runtime fmt, and diff check;
  #3997 passed focused `FeedsPage.unit.test.tsx` (15 passed), web
  `format:check`, runtime fmt, and diff check. Two later cargo reruns in the
  3991 worktree timed out under cargo/rustc cache contention and the orphaned
  processes were stopped; no test failure was observed. Live status after push:
  GitHubPop still failed across the stack, required checks were not yet green,
  and review decisions were stale until rerun.
- 2026-07-05 #3989 rebase: Rebasing Lobster PR
  `https://microsoft.ghe.com/bic/lobster/pull/3989` onto current `origin/main`
  resolved the merge conflict introduced by #3993's save-to-library route/docs
  rename. Conflict was docs-only in `docs/reference/scout-catalog-feeds.md`;
  resolution kept the #3989 followable route docs and the newer
  save-to-library route wording with `/install` legacy aliases. New head:
  `ca27836498b3cf2d399c7efd5360b0f1d0f0cdb2`. Pushed with
  `--force-with-lease`. Local validation passed runtime `cargo fmt --check`,
  `just cargo test scout_feeds --lib`, `just cargo test
  scout_mos3_named_feeds --lib`, and `git diff --check`. Web validation could
  not run because `npm ci` in `src/lobster_web` failed with private registry
  auth `E401`. Live PR state after push: mergeable again, review still
  required, GitHubPop failed on the new head, PullRequest queued, and Build
  Validation manually queued as ADO `170978279`.
- 2026-07-04 #3997 named-feed management slice: Created Lobster draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3997` on branch
  `user/giodl/scout-feeds-named-management`, stacked on
  `user/giodl/scout-feeds-named-ux` / #3996. Scope: adds guarded
  `GET /v1/scout/feeds/named/{feedId}` for editable named-feed document reads,
  adds the web API client `fetchNamedFeed`, and lets the Feeds page load an
  existing named feed into edit mode and save changes back through
  `upsertNamedFeed` with `feedId`. Local validation passed runtime
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
  focused named-feed runtime tests, runtime
  `cargo clippy --manifest-path src/lobster_runtime/Cargo.toml --lib -- -D
  warnings`, focused web `format:check`, focused web unit tests
  `tests/pages/FeedsPage.unit.test.tsx` and
  `tests/services/scoutFeedsApi.unit.test.ts`, web `npm run type-check`,
  focused web `lint`, and `git diff --check`. Required ADO queued:
  PullRequest `170879935`, Build Validation `170879933`.
- 2026-07-04 #3997 review fix: Manual Codex-review pass found private
  owner-only named feed ACLs could be reloaded as `shared` because the UI
  derived visibility before filtering the owner ACL entity. Amended #3997 to
  head `7c768ea5edad56c456c2e54dbab343ff10fcec57`, deriving visibility from
  editable ACL entities and adding FeedsPage coverage for owner-only private
  feeds saving as `visibility: private`. Focused web validation passed
  `format:check`, `tests/pages/FeedsPage.unit.test.tsx`, `type-check`, `lint`,
  and `git diff --check`. Requeued required ADO: PullRequest `170882226`,
  Build Validation `170882225`. Direct `codex review --base
  origin/user/giodl/scout-feeds-named-ux` timed out before returning findings.
- 2026-07-04 #3996 named-feed UX slice: Created Lobster draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3996` on branch
  `user/giodl/scout-feeds-named-ux`, stacked on
  `user/giodl/scout-feeds-named-sharing` / #3995. Scope: adds Feeds page
  named-feed authoring for title/description, private/shared/tenant visibility,
  shared MOS3-style user/group object ids, selected package entries, save via
  `upsertNamedFeed`, and a compact shared named-feeds follow list. Local
  validation passed web `format:check` for the touched files,
  `npm run test -- --run tests/pages/FeedsPage.unit.test.tsx`, web
  `npm run type-check`, web `npm run lint` for the touched files, and
  `git diff --check`. Required ADO queued: PullRequest `170878410`, Build
  Validation `170878407`.
- 2026-07-04 #3995 CI repair: ADO PullRequest `170876792` failed runtime
  quality on clippy `map_unwrap_or` at `src/routes/scout_feed.rs:1675`.
  Amended branch `user/giodl/scout-feeds-named-sharing` to head
  `ece5c27f061b5533c95a26cc44168f1c7d42e004` with the `map_or` fix. Local
  validation passed runtime `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml -- --check`, focused
  `routes::scout_feed::tests::upsert_named_feed --lib`, runtime
  `cargo clippy --manifest-path src/lobster_runtime/Cargo.toml --lib -- -D
  warnings`, and `git diff --check`. Requeued required ADO: PullRequest
  `170878409`, Build Validation `170878408`.
- 2026-07-04 #3995 named-feed sharing slice: Created Lobster draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3995` on branch
  `user/giodl/scout-feeds-named-sharing`, stacked on
  `user/giodl/scout-feeds-named-authoring` / #3991. Scope: extends
  `POST /v1/scout/feeds/named` with optional `visibility` and MOS3-shaped
  `acl`, persists private/shared/tenant-visible ACLs in bridge followable
  metadata, enforces tenant isolation for bridge named-feed ids, and rejects
  non-owner updates. Updated web API types and Scout feed docs. Local
  validation passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml
  -- --check`, focused runtime tests
  `routes::scout_feed::tests::upsert_named_feed` and
  `routes::scout_feed::tests::followable_feed_directory_filters_private_bridge_acl_for_other_users`,
  focused web `scoutFeedsApi` unit test, web `npm run type-check`, and
  `git diff --check`. Required ADO queued: PullRequest `170876792`, Build
  Validation `170876790`.
- 2026-07-03 PR readiness pass: Fixed #3990 CI typo on branch
  `user/giodl/scout-feeds-followable-skills-ux` with commit `527cdf989`
  (`followedFeedKey` -> `followableFeedKey` in `SkillsPage.tsx`).
  Verified in `C:\src\lobster-feeds-followable-skills-ux` with
  `npm run type-check`, focused
  `npx vitest run tests/pages/SkillsPage.feeds.unit.test.tsx`, and
  `git diff --check`, using then removing a temporary `node_modules` junction.
  Pushed the fix and queued ADO for #3990: PullRequest `170857862`, Build
  Validation `170857860`. Also queued E2E-only PullRequest reruns for #3989
  (`170857864`) and #3991 (`170857863`). #3993 remains draft while ADO
  PullRequest `170857592` and Build Validation `170857589` are still running.
- 2026-07-03 readiness follow-up: #3993 and #3989 both reached green Lobster
  ADO (`Lobster-Runtime-PullRequest` and `Lobster-Runtime-Build-Validation`)
  with only GitHubPop failing, so both PRs were marked ready for review. #3990
  and #3991 still had only runtime E2E shard failures after build validation
  passed, so fresh PullRequest reruns were queued: #3990 `170862228`, #3991
  `170862229`.
- 2026-07-03 E2E rerun follow-up: Latest status shows all four Lobster feed
  PRs have green `Lobster-Runtime-Build-Validation` and only single runtime E2E
  shard failures in `Lobster-Runtime-PullRequest` plus expected GitHubPop.
  #3993 and #3989 remain non-draft/ready for review; #3990 and #3991 remain
  draft. Queued fresh PullRequest reruns: #3993 `170865114`, #3989
  `170865113`, #3990 `170865112`, #3991 `170865111`.
- 2026-07-03 latest PR poll: #3989 is now non-draft with both Lobster required
  ADO checks green and only expected GitHubPop failing. #3993 rerun still hit a
  single runtime E2E shard failure, so PullRequest rerun `170867261` was
  queued for `user/giodl/skills-marketplace-local-install`. #3990 and #3991
  still have queued/running PullRequest contexts from the latest reruns.
- 2026-07-03 #3993 review cleanup: Addressed unresolved Copilot inline
  comments and Galin review nits on branch
  `user/giodl/skills-marketplace-local-install`; pushed commit `1121017cd`.
  Scope: removed duplicate feed-skill path availability prechecks from approved
  and marketplace install mutations, updated save-to-library docs prose, and
  hardened AGENTS skill reference parsing/sanitization so `SKILL.mdx` prose
  does not create a phantom active skill id. Validation passed
  `npm run type-check`, focused
  `npx vitest run tests/pages/SkillsPage.feeds.unit.test.tsx tests/services/agentsFile.unit.test.ts`,
  `npm run format:check`, `npm run lint`, and `git diff --check`. Required ADO
  queued on the new head: PullRequest `170867653`, Build Validation
  `170867651`.
- 2026-07-03 stack poll after #3993 cleanup: #3989 is now fully green,
  including GitHubPop, and remains non-draft. #3993 is non-draft on head
  `1121017c` with required ADO queued/running. #3990 and #3991 still have
  `Lobster-Runtime-PullRequest` failures on older runs while Build Validation
  is green; queued fresh PullRequest reruns #3990 `170868977` and #3991
  `170868976`.
- 2026-07-03 latest stack poll: #3989 remains fully green. #3993 is non-draft
  with both Lobster ADO checks green on head `1121017c`; only GitHubPop is
  failing. #3990 is draft with both Lobster ADO checks green; only GitHubPop is
  failing. #3991 still has one runtime E2E shard failure; queued PullRequest
  rerun `170872396`.
- 2026-07-03 #3991 named-feed authoring foundation: Created Lobster draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3991` on branch
  `user/giodl/scout-feeds-named-authoring`, based on
  `user/giodl/scout-feeds-followable-skills-ux` / #3990. Scope: adds
  `POST /v1/scout/feeds/named` for caller-owned bridge-backed named-feed
  create/update, writing both `FollowableFeed` metadata and an attested
  `FeedDocument` under `LOBSTER_SCOUT_FOLLOWABLE_FEED_DIR`. Omitted `feedId`
  generates deterministic caller-scoped ids
  `named:lobster:<tenant-hash>:<user-hash>:<slug>`. The route is gated by
  `scout_feeds_ux_enabled`, configured followable storage, and
  `LOBSTER_SCOUT_PERSONAL_STORAGE_DURABLE=true`. Also added bridge ACL
  filtering so private authored named feeds are only returned to the creating
  user, plus the web API client `upsertNamedFeed`, docs, and focused tests.
  Local validation passed `just rust-fmt`, `just rust-fmt-check`, focused
  `scout_feed` runtime tests (157 passed), `just rust-clippy`, and
  `git diff --check`. Local web checks remain blocked by missing private npm
  dev dependencies in the fresh worktree. Required ADO queued: PullRequest
  `170852234`, Build Validation `170852233`.
- 2026-07-03 #3991 web CI repair: ADO web static/unit failures on head
  `38f203d44` were both caused by a `SkillsPage.tsx` typo:
  `followedFeedKey` was referenced instead of `followableFeedKey` while
  building the followed feed key set. Amended #3991 to head `e5ce06ba9` with
  the one-line fix, verified `git diff --check`, and force-pushed branch
  `user/giodl/scout-feeds-named-authoring`. Requeued required ADO:
  PullRequest `170853294`, Build Validation `170853293`.
- 2026-07-03 live Skills marketplace validation: Parked the followable/named
  PR stack and revalidated prod 301 normal-user `/skills` at
  `https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/skills`.
  Recorder artifact:
  `C:\tmp\lobster-feeds-prod-301eus-live-2026-07-03T173519-068Z`.
  Result: Skills renders; marketplace feed search is live with
  `/v1/scout/feeds/marketplace.json` returning `200`, `feedId=mos3-root`, and
  `entryCount=103`; tenant-approved still returns typed
  `503 SCOUT_FEED_UNAVAILABLE` and remains hidden from the user when marketplace
  succeeds. Added focused helper
  `projects/feeds/demo/validate-lobster-skills-marketplace-install.mjs` and
  ran it against `billing-info-lookup`; artifact:
  `C:\tmp\lobster-skills-marketplace-install-prod-301eus-2026-07-03T173824-864Z`.
  The UI searches and clicks Install, but
  `POST /v1/scout/feeds/marketplace/install` returns typed
  `503 SCOUT_FEED_UNAVAILABLE`, shown as
  `We couldn't add billing-info-lookup yet. Scout feed request failed (503):
  The Scout feed is not available.` Code/config check shows this is expected
  for the current deployment: the chart only wires
  `LOBSTER_SCOUT_MARKETPLACE_FEED_MOS3_ENV`; marketplace install also requires
  personal write storage (`LOBSTER_SCOUT_PERSONAL_FEED_DIR` and
  `LOBSTER_SCOUT_PERSONAL_STORAGE_DURABLE=true`) before it can mutate the
  caller's personal feed.
- 2026-07-03 local-only Skills install hotfix: Created clean Lobster worktree
  `C:\src\lobster-skills-local-marketplace-install`, branch
  `user/giodl/skills-marketplace-local-install`, from `origin/main` at #3972
  merge commit `6b452f942`. Opened draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3993` at head `17444a30a`.
  Scope: `/skills` feed-backed Install now writes the selected marketplace or
  tenant-approved skill directly into the current workspace (`SKILL.md` plus
  managed `AGENTS.md`) and no longer calls
  `/v1/scout/feeds/{marketplace,approved}/install`, which mutates personal
  feed state and requires durable personal storage. `Save to library` and
  create-skill library publishing remain on `publishPersonalSkill`. Validation
  passed `git diff --check`, focused `SkillsPage.feeds` unit test (16 tests),
  `npm --prefix src/lobster_web run type-check`, targeted `lint`, and targeted
  `format:check`; web commands used a temporary dependency junction to the
  hydrated `C:\src\lobster-feeds-validation\src\lobster_web\node_modules`,
  removed after validation. Required ADO queued after a transient DevOps
  outage: PullRequest `170856441`, Build Validation `170856440`.
- 2026-07-03 #3993 route/API rename follow-up: Amended PR #3993 to head
  `cf53981c0`. Added primary backend aliases
  `/v1/scout/feeds/{marketplace,approved}/save-to-library` for personal
  feed/library saves while keeping the old `/install` routes as deprecated
  compatibility aliases. Renamed the web client methods to
  `saveMarketplaceSkillToLibrary` / `saveApprovedSkillToLibrary`, changed
  `/feeds` action buttons to `Save to library`, and updated docs/tests so
  `/skills` local install and `/feeds` library save are distinct concepts.
  Validation passed `git diff --check`, `just rust-fmt-check`, focused
  `scout_feed` runtime tests (147 passed), focused web unit tests
  (`SkillsPage.feeds`, `FeedsPage`, `scoutFeedsApi`, 37 passed), web
  `type-check`, targeted `lint`, and targeted `format:check`; web commands
  used the same temporary dependency junction and removed it after validation.
  Fresh ADO queued: PullRequest `170857592`, Build Validation `170857589`.
- 2026-07-03 #3990 stacked Skills UX slice: Created Lobster draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3990` on branch
  `user/giodl/scout-feeds-followable-skills-ux`, based on
  `user/giodl/scout-feeds-followable-foundation` / #3989. Scope: the normal
  `/skills` discovery section now loads followable feed identities alongside
  tenant-approved and marketplace skill feeds, shows matching shared/source
  feed identities in the same search results, lets users follow a feed, renders
  already-followed feeds as `Following`, and disables feed actions while an
  install/follow mutation is pending. Added focused `SkillsPage.feeds` unit
  tests for search/follow and already-followed state, and updated
  `docs/reference/scout-catalog-feeds.md`. Local validation passed
  `git diff --check`; web checks are locally blocked because this fresh
  worktree lacks hydrated private npm dev dependencies (`vitest`, `biome`,
  `@testing-library/jest-dom`, `node`, `vitest/globals`). Required ADO queued:
  PullRequest `170850898`, Build Validation `170850897`.
- 2026-07-03 #3989 MOS3 named-feed read chunk: Amended Lobster PR
  `https://microsoft.ghe.com/bic/lobster/pull/3989` to head
  `b1f4b976e5241a374baf1128dd52cd932827f698` on branch
  `user/giodl/scout-feeds-followable-foundation`. Added
  `scout_mos3_named_feeds.rs` with a MOS3 title-id followable-feed reader:
  configured title ids fetch ACL through
  `/builder/v1/users/titles/{titleId}/allowed?idType=TitleId` and best-effort
  display metadata through `/marketplace/v1/users/titles/{titleId}/preview`.
  The followable route now supports `LOBSTER_SCOUT_NAMED_FEED_MOS3_ENV` and
  `LOBSTER_SCOUT_NAMED_FEED_MOS3_TITLE_IDS`, acquires the MOS3 OBO token from
  the existing route token provider, projects returned title ACLs as
  `FollowableFeedKind::Named`, and fails open when the token/read path is
  unavailable. This proves MOS3-backed identity/ACL/preview reads only;
  create/update/follow writes still use the bridge until the MOS3 durable
  named-feed primitive is confirmed. Updated
  `docs/reference/scout-catalog-feeds.md` with the new env vars and store
  matrix wording. Local validation passed `just rust-fmt`,
  `just rust-fmt-check`, focused `scout_mos3_named_feeds` tests (2 passed),
  focused `scout_feed` tests (155 passed), `just rust-clippy`, and
  `git diff --check`. PR body updated and branch force-pushed. Required ADO
  queued on the new head: PullRequest `170850361`, Build Validation
  `170850360`.
- 2026-07-03 #3989 next implementation chunk: Expanded Lobster PR
  `https://microsoft.ghe.com/bic/lobster/pull/3989` to head
  `dfcd11101dbb22680cb4f87fce046b83785920e4`. The PR now makes follow records
  meaningful in `GET /v1/scout/feeds/personal.json`: when
  `scout_feeds_ux_enabled` and `LOBSTER_SCOUT_FOLLOWED_FEED_DIR` are
  configured, the effective personal feed merges supported followed feeds
  after the existing MOS3/local personal merge. Supported followed sources are
  tenant-approved feeds, the configured MOS3 marketplace source feed, and
  signed named-feed bridge documents stored under
  `LOBSTER_SCOUT_FOLLOWABLE_FEED_DIR` as `<sha256(feedId)>.feed.json`.
  Expansion is fail-open for the existing personal route: disabled flags,
  unavailable follow state, missing/bad source docs, or unsupported source feed
  identities leave the direct personal feed unchanged. Merged entries get
  `follow.feedId`, `follow.kind`, optional `follow.revision`, and
  `follow.trustLabels` metadata, then the effective personal feed is
  reattested. Added focused runtime tests for followed named-feed expansion and
  disabled-flag no-op behavior; updated `docs/reference/scout-catalog-feeds.md`.
  Local validation passed `just rust-fmt`, `just rust-fmt-check`, focused
  `scout_feed` runtime tests via `cargo.sh` (155 passed), `just rust-clippy`,
  and `git diff --check`. PR body updated. Required ADO queued on the pushed
  head: PullRequest `170848465`, Build Validation `170848464`; natural
  PullRequest run `170848444` is also in progress. Immediate live state:
  draft, review-required, mergeable but blocked, GitOps/FileAffordance passed,
  GitOps/GitHubPop failed for proof-of-presence, and required ADO checks are
  queued.
- 2026-07-01 #3748 review follow-up: Addressed dspektor feedback that Scout
  admin source diagnostics reported configured when user-config provider plus
  assignment/M365 admin source existed, without the ECS admin UX flag required
  by the real admin routes. In `C:\src\lobster-feeds-real-mos3-diagnostics`,
  pushed Lobster #3748 head `1bc680ee5` on
  `user/giodl/scout-feeds-mos3-source-diagnostics`. The diagnostic helper now
  requires `FeatureFlags.scout_feeds_admin_ux_enabled` for the caller and lists
  `"scout_feeds_admin_ux_enabled ECS flag"` in admin catalog/publish
  requirements. Added regression coverage for all other admin prerequisites
  present while the ECS flag is disabled. Validation: `cargo fmt --all --
  --check`, `git diff --check`, targeted source-diagnostics admin tests (3
  pass), and existing admin UX disabled route test (1 pass). Live after push:
  #3748 remains draft with `CHANGES_REQUESTED` until reviewer refresh;
  GitOps/FileAffordance passed, GitOps/GitHubPop failed, natural PullRequest
  ADO `170582081` queued, and manual Build Validation `170582631` queued.
- 2026-07-01 live 301 personal marketplace validation: Revalidated the
  normal-user Feeds path on the registered 301 URL
  `https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/skills`.
  Route/admin probe artifacts:
  `C:\tmp\lobster-route-admin-prod-301eus-2026-07-01T152702-027Z`.
  The token still has empty `wids`, so Gio is not recognized as M365 tenant
  admin by the feeds admin gate; `/v1/route` returns the cached passport
  assignment to `prdil302cus`, but direct browser navigation to
  `https://lobster-cus.us-ia302.gateway.prod.island.powerapps.com` hits
  Entra `AADSTS50011` because that origin's `/auth/callback` is not a
  registered redirect URI. Keep interactive validation on the 301 gateway URL.
  Broader artifacts:
  `C:\tmp\lobster-feeds-prod-301eus-live-2026-07-01T152901-985Z`. `/skills`
  renders the normal-user "Available from your organization" section, but
  tenant-approved and marketplace feed reads both return typed
  `503 SCOUT_FEED_UNAVAILABLE`, so there are no marketplace results to search
  or add. Direct `POST /v1/scout/feeds/marketplace/install` with a harmless
  MOS3 skill selector also returns typed `503 SCOUT_FEED_UNAVAILABLE`
  (`requestId=c0405e55-efec-4aa4-af9a-b0f2022e2310`). Conclusion: personal UX
  is deployed enough to show feed discovery and fail closed, but live
  marketplace search/install is blocked by missing Scout feed source/storage
  configuration in 301. `/v1/scout/feeds/source-diagnostics` still returns
  404, so #3748 diagnostics has not reached this environment yet.
- 2026-06-28 live Lobster 301 Feeds UX proof: Tested
  `https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/feeds`
  with the existing Edge/Playwright helpers and signed-in Edge profile. ECS
  override helper accepted both `scout_feeds_ux_enabled=true` and
  `scout_feeds_admin_ux_enabled=true` for Gio on island `prdia301eus0aks` /
  ring `firstrelease`, but `/v1/me/web-feature-flags` still reported both
  flags false in its snapshot. The route rendered the Feeds shell and admin
  controls anyway. Network proof showed the deployed UI calls
  `/v1/scout/feeds/approved.json`, `/personal.json`, `/marketplace.json`, and
  `/admin/catalog`, and all four returned 404 on 301. Artifacts:
  `C:\tmp\lobster-feeds-301-ecs-20260628-173546` and
  `C:\tmp\lobster-feeds-301-live-20260628-173610` including screenshots,
  `page-text.txt`, `feed-network-events.json`, and the live webm.
- 2026-06-28 301 feed route 404 bugfix: Filed
  `https://microsoft.ghe.com/bic/lobster/issues/3739` for the live 301 Feeds
  shell rendering while `/v1/scout/feeds/approved.json`,
  `/personal.json`, `/marketplace.json`, and `/admin/catalog` returned 404.
  Created worktree `C:\src\lobster-feeds-301-route-contract`, branch
  `user/giodl/scout-feeds-route-contract`, and opened PR
  `https://microsoft.ghe.com/bic/lobster/pull/3740` at head
  `824270b9342d45d272d7c1d6f79f84bce62bc53c`. Scope: always mount the
  authenticated Scout feed router in full-runtime deployments so missing
  storage/MOS3/admin source config returns the existing typed unavailable /
  fail-closed handler responses instead of route-level 404. Local validation
  passed `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `git diff --check`, and `cargo +1.95.0 test scout_feed --lib` with OpenSSL
  env configured. Broad `cargo +1.95.0 clippy --lib -- -D warnings` is blocked
  by unrelated repo-wide Rust 1.95 warnings; the introduced double-must-use
  warning was removed. Required ADO queued against `refs/pull/3740/head`:
  PullRequest `170149870`, Build Validation `170149869`. Immediate PR state:
  mergeable, review-required, GitOps/FileAffordance passed, GitHubPop failed,
  ADO pending.
- 2026-06-28 #3740 CI repair: ADO `Lobster Runtime - Quality` failed on the
  new route-contract test because the env mutex guard was held across async
  `oneshot`/body awaits (`clippy::await-holding-lock`). Amended PR #3740 to
  scope the env lock to router construction only, then verified
  `cargo +1.95.0 test scout_feed::tests::env_router_mounts_contract_routes_without_feed_sources --lib`,
  `cargo +1.95.0 clippy --lib --tests -- -D clippy::await-holding-lock`, and
  `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`. New head
  `3ea98b849331b8bf1625c60c8410d60ae53454fd`. Requeued required ADO against
  `refs/pull/3740/head`: PullRequest `170151415`, Build Validation
  `170151414`. Immediate GitHub state after force-push showed
  GitOps/FileAffordance passed; ADO checks are repopulating.
- 2026-06-28 Feeds UX simplification: Created worktree
  `C:\src\lobster-feeds-ux-simplify`, branch
  `user/giodl/scout-feeds-ux-simplify`, and opened PR
  `https://microsoft.ghe.com/bic/lobster/pull/3741` at head
  `ac8cf0155e92259037ddaa6951a70e7896d24447`. Scope: make `/feeds` default
  to one browse/search surface, move personal publish behind a `Publish skill`
  toggle, compact package type into a badge instead of a table column, and
  simplify tenant-admin composition into a lower `Tenant feed` section with
  import/publish actions and a footer deny reason field. Local validation
  passed web `npm run test:unit -- tests/pages/FeedsPage.unit.test.tsx`,
  `npm run type-check`, `npm run lint`, `npm run format:check`,
  `npm run build`, and `git diff --check`. Local full-app screenshot was not
  useful because the demo shell hides `/feeds` unless the admin feature-flag
  path is active; rerun 301 visual proof after #3740 and #3741 deploy.
  Required ADO queued against `refs/pull/3741/head`: PullRequest `170151051`,
  Build Validation `170151050`. Immediate PR state: mergeable,
  review-required, GitOps/FileAffordance passed, GitHubPop failed, ADO pending.
- 2026-06-28 301 proof prep after #3740/#3741 merge: Live GHE state confirms
  #3740 merged at `2026-06-28T21:57:32Z` with merge commit
  `c162a173e991eab110d16d94da6a4ae4e2340883`, and #3741 merged at
  `2026-06-28T22:21:53Z` with merge commit
  `ad17b3f7eef38abfec96d35f51613d42b479b66d`. Added reusable live proof helper
  `projects/feeds/demo/record-lobster-live-feeds.mjs`; `node --check` passes.
  Default command for 301 once the deployed build catches up:
  `node projects/feeds/demo/record-lobster-live-feeds.mjs`. Optional env:
  `LOBSTER_FEEDS_LIVE_ENV=prod-301eus`, `LOBSTER_FEEDS_LIVE_WAIT_MS`,
  `LOBSTER_FEEDS_LIVE_OUT_DIR`, and `LOBSTER_FEEDS_LIVE_EDGE_PROFILE`. The
  helper opens visible Edge, attempts per-user ECS overrides for
  `scout_feeds_ux_enabled` and `scout_feeds_admin_ux_enabled`, records `/feeds`
  and `/skills`, captures screenshots/video/body text, and writes
  `feed-network-events.json`, `enable-result.json`, and `summary.json`.
  Success criteria for 301 proof: `/v1/scout/feeds/approved.json`,
  `/personal.json`, `/marketplace.json`, and `/admin/catalog` are no longer
  route-level 404; missing source/storage config should surface typed
  fail-closed responses such as `SCOUT_FEED_UNAVAILABLE` where expected; `/skills`
  shows normal-user feed skill discovery; `/feeds` shows the simplified
  admin-oriented experience from #3741.
- 2026-06-28 301 proof run after deploy check: Ran
  `node projects\feeds\demo\record-lobster-live-feeds.mjs` against default
  `prod-301eus`. Artifacts:
  `C:\tmp\lobster-feeds-prod-301eus-live-2026-06-28T230059-840Z`. ECS override
  succeeded for both `scout_feeds_ux_enabled` and
  `scout_feeds_admin_ux_enabled`; `/v1/me/web-feature-flags` returned both
  flags true. Backend route-contract proof passed: approved, personal, and
  marketplace feed endpoints returned typed `503 SCOUT_FEED_UNAVAILABLE`
  instead of route-level 404, and admin catalog returned typed
  `403 SCOUT_FEED_FORBIDDEN`. `/skills` rendered and included the normal-user
  "Available from your organization" feed discovery section with the feed
  unavailable error. Remaining proof gap: `/feeds` still rendered the old
  pre-#3741 split layout with always-visible publish form and a separate
  `Type` table column, so 301 has picked up the #3740 backend route fix but not
  the #3741 web bundle yet. Rerun the same helper after the next 301 web deploy.
- 2026-06-28 tenant-admin claim bridge: Created worktree
  `C:\src\lobster-feeds-admin-tenant-claims`, branch
  `user/giodl/scout-feeds-admin-tenant-claims`, from current Lobster
  `origin/main` at `d257f1197`, and opened Lobster PR
  `https://microsoft.ghe.com/bic/lobster/pull/3746` at head
  `2225a418b246dee995df55d4d1658697b8c32449`. Scope: project validated JWT
  `wids` Entra directory-role ids into `ValidatedClaims`; treat Global
  Administrator and Cloud Application Administrator roles as the M365
  tenant-admin precheck for Scout feed admin UX/routes; bind
  `/v1/me/web-feature-flags`
  `scout_feeds_admin_ux_enabled` to both ECS rollout and that tenant-admin
  claim; allow feed admin backend routes when either the validated `wids`
  precheck passes or the existing `LOBSTER_SCOUT_ADMIN_ASSIGNMENTS_PATH`
  bootstrap snapshot grants `lobster.tenant.admin`. This aligns with the
  Aether/Cowork direction of using validated Entra/M365 claims as a local
  defense-in-depth precheck while keeping MOS3/M365 as the long-term authority.
  Validation passed with OpenSSL from
  `C:\Program Files\OpenSSL-Win64\lib\VC\x64\MD`: focused route test
  `admin_catalog_allows_m365_tenant_admin_claim_without_assignment_snapshot`,
  admin-space role tests `directory_roles_`, JWT validation test
  `happy_path_extracts_identity`, web flag tests `authenticated_route_`,
  broad `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml scout_feed --lib`
  (140 passed), `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `cargo fmt --manifest-path src\lobster_auth_types\Cargo.toml --check`, and
  `git diff --check`. Required ADO queued on #3746: PullRequest `170163694`,
  Build Validation `170163693`. Immediate PR state: mergeable,
  review-required, `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed,
  and required ADO contexts are queued. Remaining product caveat: bootstrap
  assignment snapshots still authorize backend admin routes, but the SPA
  rail/page visibility now requires the validated Entra tenant-admin `wids`
  claim plus ECS rollout.
- 2026-06-29 Lobster #3746 merged: live GHE state confirms
  `https://microsoft.ghe.com/bic/lobster/pull/3746` merged at
  `2026-06-29T03:01:35Z` with merge commit
  `81842b3255de329b0b6c75b2e74c8d40448d06e9`. This puts the validated
  Entra `wids` tenant-admin precheck for the Scout feeds admin UX/routes on
  `origin/main`; 301 proof can now verify whether Gio's live token carries one
  of the accepted directory-role ids once the deployment catches up.
- 2026-06-29 user-shared named feeds plan: Added
  `projects/feeds/user-shared-named-feeds-plan.md` as the covering ecosystem
  plan for viral feed sharing. The model keeps personal feeds as private
  working/install state, makes the user-facing personal feed an effective view
  over direct personal entries plus followed named feeds, introduces
  user-created named feeds with private, people/group-shared, and tenant-visible
  visibility, and preserves tenant-approved feeds as a separate admin
  promotion/trust state. The plan covers skills, plugins, policy baselines, MCP
  servers, connectors, agents, workflow packs, prompt/tool bundles, and future
  capability manifests. Updated the feeds README and MOS3 feed position note so
  this becomes the next PR direction rather than treating personal/team sharing
  as a vague later phase. Follow/include semantics were tightened so following
  a named feed is stored as a source reference in the personal effective feed,
  not as a destructive copy into the stored personal feed. The UX plan is now
  search-first: normal users use `/skills` to search their personal effective
  feed, follow source feeds from search results, and configure which followed,
  shared, organization, and marketplace feeds participate in search; tenant
  admins still use `/feeds` for approval and composition. Reviewed the plan
  against `.craft/roles/claws` and saved
  `projects/feeds/user-shared-named-feeds-role-review.md`; role feedback added
  portability, progressive disclosure, actionable source labels, support
  diagnostics, audit events, emergency block controls, and a dedicated
  audit/block/diagnostics PR slice. Final UX clarification: `/skills` search
  should return mixed result types, so users see matching individual entries and
  matching named feeds that are shared directly with them, shared with their
  groups, tenant-visible, or tenant-approved. Added MOS3 storage/search
  strategy: MOS3 is the desired system of record because it already has adjacent
  titles, acquisitions, shared/owned titles, ACL, owner, marketplace browse, and
  query primitives, but we still need to validate whether it has a first-class
  named-feed/collection object with follow, immutable revision, tenant-visible,
  mixed search, and audit semantics. Lobster should only bridge missing
  primitives with MOS3-compatible ids, ACLs, revisions, audit fields, and
  portable feed documents. Aether evidence is stronger than a generic hunch:
  its plugin sharing path reads MOS3 title ACLs with
  `GET /builder/v1/users/titles/{titleId}/allowed?idType=TitleId`, writes them
  with `POST /builder/v1/users/titles/{titleId}/allowed`, and derives
  `personal` from `ForAllUsers=false` plus no entities, `shared` from
  `ForAllUsers=false` plus user/group entities, and `tenant` from
  `ForAllUsers=true`. That supports using MOS3 title ACL semantics as the
  candidate visibility model for named feeds, while separately validating
  whether the named-feed/collection object itself can be represented as a MOS3
  title with revisions, follow/include state, mixed search, and audit. Lobster
  storage review confirms today's Scout feeds are hybrid: live personal feeds
  can be projected from MOS3 acquisitions, marketplace feeds can come from MOS3
  marketplace query, while tenant-approved feed documents, personal overlays,
  hosted personal artifacts, and tenant admin catalog state are file-backed
  under configured durable directories. The agent OneDrive path in Lobster is
  currently the OpenClaw workspace git repo on the user's Graph/SPO drive, not a
  general feed-document store. A OneDrive-backed named-feed bridge is plausible
  only if implemented as an explicit feed document/revision/ACL store with an
  indexed Lobster projection for `/skills`; it should not hide feed state inside
  the workspace repo.
- 2026-06-27 Lobster Scout feeds Skills-page UX PR: Created worktree
  `C:\src\lobster-feeds-skills-ux`, branch
  `user/giodl/scout-feeds-skills-ux`, and opened non-draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3718` at head
  `6da2dbe0615b1f81e333a242221b6bc01514c142`. Scope: normal users now get
  Scout feed skill discovery as a searchable skill-only section on `/skills`,
  with Add writing the exact tenant-approved or marketplace selector to their
  personal feed; the dedicated `/feeds` page and rail nav are now gated on the
  tenant-admin feeds flag. Local validation passed: web `npm run type-check`,
  focused unit tests for `SkillsPage.feeds`, `FeedsPage`, and
  `App.rail-hoist` (15 tests), targeted web lint, web `npm run format:check`,
  and `git diff --check`. Initial PR state: mergeable, review-required, no
  checks initially attached; manually queued required ADO PullRequest
  `170094658` and Build Validation `170094657`.
- 2026-06-27 follow-up for Lobster #3718: Addressed CodeClaw requested
  change by letting Skills feed discovery fetch failures surface through the
  existing error banner instead of rendering an empty catalog. Pushed head
  `739eee80681d1e949cdba2d415720536ce894766`. Local validation passed:
  focused web unit tests for `SkillsPage.feeds`, `FeedsPage`, and
  `App.rail-hoist` (16 tests), web `npm run type-check`, targeted web lint,
  web `npm run format:check`, and `git diff --check`. Requeued required ADO:
  PullRequest `170097420`, Build Validation `170097417`.
- 2026-06-27 Lobster Scout feed install docs PR: Created worktree
  `C:\src\lobster-scout-feeds-docs-install-endpoints`, branch
  `user/giodl/scout-feeds-install-docs`, and opened non-draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3717` at head
  `8258c4d39d82d0e5201f2c9abfa0b6e0036afb41`. Scope: document the hosted
  Scout feed install endpoints in `docs/reference/scout-catalog-feeds.md`,
  including `POST /v1/scout/feeds/marketplace/install`,
  `POST /v1/scout/feeds/approved/install`, selector fields, skill-only
  behavior, clean HTTPS install URL requirements, durable personal storage, and
  marketplace-vs-tenant-approved source/auth boundaries. Local validation:
  `git diff --check`. Initial live state: mergeable, non-draft,
  review-required, `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed
  for Proof of Presence, natural `Lobster-Runtime-PullRequest` build
  `170093644` queued, and manually queued required Build Validation
  `170093656`.
- 2026-06-27 follow-up for Lobster #3717: Addressed CodeClaw requested
  change by documenting the flattened install request shape
  `{ id, type, sourceRegistry, sourcePackage, version }` instead of a nested
  selector object. Pushed head `d8e60d18459d5d39fd7f5c41dbac6735d3f7cdd0`.
  Local validation passed `git diff --check`. Requeued required ADO:
  PullRequest `170097418`, Build Validation `170097419`.
- 2026-06-26 Lobster Scout tenant-approved personal install PR: Created
  worktree `C:\src\lobster-scout-feeds-approved-install`, branch
  `user/giodl/scout-feeds-approved-install`, and opened non-draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3698` at head
  `1c63173dc840fc6ec878fcd87c6effce8994c65f`. Scope: add
  `POST /v1/scout/feeds/approved/install` so a caller can copy a selected
  skill from the tenant-approved feed into their personal feed while keeping
  tenant-approved scope distinct from personal scope. The route verifies
  tenant-approved feed attestation and caller tenant, requires durable personal
  storage, reuses the locked personal-feed write path, records
  `personal.installKind=tenant-approved`, sanitizes the install URL, and
  rejects non-skill entries. Web `/feeds` now shows Add on tenant-approved
  skill rows and posts the exact entry selector. Local validation passed:
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test install_approved_skill --lib`,
  `src/lobster_runtime/../../cargo.sh test scout_feed --lib`,
  `src/lobster_runtime/../../cargo.sh clippy --lib -- -D warnings`, web
  `npm run format:check`, targeted web unit tests for `FeedsPage` and
  `scoutFeedsApi` (20 tests), web `npm run type-check`, web `npm run lint`,
  and `git diff --check`. Required ADO queued: PullRequest `170045815`,
  Build Validation `170045814`. Immediate PR state: mergeable, non-draft,
  review required, `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed
  for Proof of Presence, and ADO is queued/in progress.
- 2026-06-26 Lobster feeds validation pass: Created a throwaway validation
  worktree at `C:\src\lobster-feeds-validation` from `origin/main` head
  `6f9cb39ec` and added helper
  `projects/feeds/demo/validate-lobster-feeds-main.ps1`. Live GHE state shows
  the Lobster feeds PR chain through marketplace UX/install/admin approval,
  publish, and approved-state UX is merged: #3565, #3604, #3608, #3620,
  #3622, and #3627 all show `MERGED`. Fixed local Rust validation by having
  the helper auto-wire the installed OpenSSL at `C:\Program Files\OpenSSL-Win64`
  into `OPENSSL_DIR`, `OPENSSL_LIB_DIR`, `OPENSSL_INCLUDE_DIR`, and process
  `PATH`. Full helper validation now passes on current main:
  web `scoutFeedsApi`/`FeedsPage` unit tests passed with 2 files and 18 tests;
  Rust `scout_feed_cli` passed 74 tests; Rust `scout_feed` passed 136 tests;
  Rust `scout_mos3_marketplace` passed 3 tests. WSL/bash cargo is still too
  old for the lockfile v4, so use native PowerShell cargo via the helper for
  this validation path.
- 2026-06-25 OpenClaw hosted feeds proof-check refresh: Fixed the real PR #95868
  proof blocker by updating `feeds-hosted-catalog-fetch` to use the live
  `https://clawhub.ai/v1/feeds/plugins` default, accept feed schema v2, and
  normalize live ClawHub marketplace entries into installable catalog metadata.
  Pushed signed PR #95868 head `2d68751c140f`. Rebasing the downstream stack
  pulled that fix through #95877, #95964, #95969, #95981, #96155, and #96158;
  forced updated upstream branch heads are #95877 `be8678a80556`, #95964
  `13b94e75db`, #95969 `cdb7dda1ef`, #95981 `8b6fa2f51a`, #96155
  `b93aa0e04f`, and #96158 `5bcb4a40bb`. Local validation on the rebased PR8
  head passed targeted `oxfmt`, targeted `oxlint`, `git diff --check`, and
  `node scripts/test-projects.mjs src/plugins/official-external-plugin-catalog.test.ts src/cli/plugins-cli.marketplace-refresh.test.ts src/cli/plugins-cli.marketplace-entries.test.ts src/plugins/marketplace.test.ts src/config/zod-schema.marketplaces.test.ts`
  with 83 tests passed and 2 skipped. Refreshed proof transcripts under
  `C:\tmp\openclaw-feeds-proof\outputs`: PR2 live ClawHub default fetch,
  PR6 configured profile fetch, PR7 marketplace refresh, and PR8 offline
  snapshot entries. Updated the `Real behavior proof` sections on #95846,
  #95868, #95877, #95981, #96155, and #96158 and posted `@clawsweeper
  re-review` comments. Immediate status after re-review request: #95868,
  #95964, and #95969 show `proof: sufficient`; #95846, #95877, #95981,
  #96155, and #96158 still have stale `status: needs proof` labels until
  ClawSweeper refreshes.
- 2026-06-24 Lobster MOS3 marketplace import landed and stack refresh:
  PR `https://microsoft.ghe.com/bic/lobster/pull/3564` merged into `main`
  at `2026-06-25T00:05:06Z` with merge commit
  `0db073401e2b1d54cf2bb7d38d17a5f488446a50`. Rebased #3565
  `user/giodl/scout-feeds-marketplace-ux` onto current `main`, skipping the
  now-merged #3564 commits and leaving one UX commit at head
  `326e5642b1fec78ac577ebdc65866f42e24dae80`. Local validation passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test load_live_mos3_marketplace_feed_returns_root_feed --lib`,
  `src/lobster_runtime/../../cargo.sh clippy --lib -- -D warnings`, web
  `npm run format:check`, `npm run type-check`, `npm run lint`, targeted web
  unit tests for `FeedsPage` and `scoutFeedsApi` (12 tests), and
  `git diff --check`. Required ADO queued on #3565: PullRequest
  `169427727`, Build Validation `169427726`. Rebased downstream #3604
  `user/giodl/scout-feeds-marketplace-install` onto the new #3565 head, now at
  `f002be5eadf92e49ff9ad566feccc78bf9d221bf`. Local validation passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test install_marketplace_skill --lib`,
  `src/lobster_runtime/../../cargo.sh clippy --lib -- -D warnings`, web
  `npm run format:check`, `npm run type-check`, `npm run lint`, targeted web
  unit tests for `FeedsPage` and `scoutFeedsApi` (14 tests), and
  `git diff --check`. Required ADO queued on #3604: PullRequest
  `169427988`, Build Validation `169427990`. Both PRs are mergeable; GitHubPop
  is failing for Proof of Presence and ADO is running.
- 2026-06-24 Lobster Scout marketplace approved-state UX PR: Created worktree
  `C:\src\lobster-scout-feeds-marketplace-admin-state`, branch
  `user/giodl/scout-feeds-marketplace-admin-state`, stacked on #3620
  `user/giodl/scout-feeds-marketplace-admin-publish`, and opened PR
  `https://microsoft.ghe.com/bic/lobster/pull/3622` at head
  `db0dffcb331eee4cdbde4f7b77a5affb0f438c05`. Scope: make the Marketplace
  tab reflect tenant catalog state by showing catalog-approved or pinned
  marketplace entries as `Approved` / `In tenant feed` instead of offering a
  repeat Marketplace Approve action. Local validation passed web
  `npm run format:check`, `npm run type-check`, `npm run lint`,
  `npm run test:unit -- tests/pages/FeedsPage.unit.test.tsx` (7 tests), and
  `git diff --check`. The worktree uses a local ignored `node_modules` junction
  to the #3608 approval worktree for validation. Required ADO queued:
  PullRequest `169424716`, Build Validation `169424707`. Current PR state:
  mergeable, GitOps/FileAffordance passed, GitOps/GitHubPop failed, ADO
  running.
- 2026-06-24 Lobster Scout marketplace-approved publish PR: Created worktree
  `C:\src\lobster-scout-feeds-marketplace-admin-publish`, branch
  `user/giodl/scout-feeds-marketplace-admin-publish`, stacked on #3608
  `user/giodl/scout-feeds-marketplace-admin-approval`, and opened PR
  `https://microsoft.ghe.com/bic/lobster/pull/3620` at head
  `5d93100275a89f6eca330e404a1393c97b2939e9`. Scope: make tenant-approved
  feed publish include catalog-approved marketplace entries that are absent
  from the baseline/source feed, preserve baseline-first behavior when the
  same id is already emitted by baseline, avoid duplicate feed entries by id,
  and reattest after adding catalog-only entries. Local validation passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test catalog_publish_includes_approved_entry_missing_from_baseline --lib`,
  `src/lobster_runtime/../../cargo.sh test tenant_admin_publishes_marketplace_only_entry_to_approved_feed --lib`,
  `src/lobster_runtime/../../cargo.sh clippy --lib -- -D warnings`, and
  `git diff --check`. Broad `src/lobster_runtime/../../cargo.sh test scout_catalog --lib`
  hung under the local wrapper, so the exact focused regression tests are the
  proof. Required ADO queued: PullRequest `169423527`, Build Validation
  `169423528`. Current PR state: mergeable, GitOps/FileAffordance passed,
  GitOps/GitHubPop failed, ADO running.
- 2026-06-24 Lobster Scout marketplace tenant approval PR: Created worktree
  `C:\src\lobster-scout-feeds-marketplace-admin-approval`, branch
  `user/giodl/scout-feeds-marketplace-admin-approval`, stacked on #3422
  `user/giodl/scout-feeds-admin-composition`, and opened PR
  `https://microsoft.ghe.com/bic/lobster/pull/3608` at head
  `78a31492bad2761927ac928e5e02ec1c04f59e6d`. Scope: bring the MOS3
  marketplace feed read/install stack onto the tenant-admin composition base,
  add `POST /v1/scout/feeds/admin/marketplace/entries/{id}/approve`, verify
  marketplace root scope and attestation before catalog import, approve the
  exact marketplace source/version selector, and add Marketplace tab `Add` plus
  tenant-admin-only `Approve` actions in `/feeds`. Local validation passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test scout_feed --lib`,
  focused route tests for tenant marketplace approval and personal marketplace
  install, `src/lobster_runtime/../../cargo.sh test scout_mos3_marketplace --lib`,
  `src/lobster_runtime/../../cargo.sh clippy --lib -- -D warnings`, web
  `npm run format:check`, `npm run type-check`, `npm run lint`, targeted web
  unit tests for `FeedsPage` and `scoutFeedsApi` (17 tests), and
  `git diff --check`. Required ADO queued: PullRequest `169394372`, Build
  Validation `169394371`. Initial PR state: mergeable, GitOps/FileAffordance
  passed, GitOps/GitHubPop failed, ADO queued.
- 2026-06-24 Lobster Scout marketplace install PR: Created stacked worktree
  `C:\src\lobster-scout-feeds-marketplace-install`, branch
  `user/giodl/scout-feeds-marketplace-install`, on top of #3565 and opened
  non-draft PR `https://microsoft.ghe.com/bic/lobster/pull/3604` at head
  `9c8283f1185919061e4e77578dcf8e2cace47e49`. Scope: add authenticated
  `POST /v1/scout/feeds/marketplace/install`, load the live MOS3 marketplace
  feed under the caller's auth context, validate skill-only install entries,
  promote MOS3 `publicSkillPath` into `source.url` for the personal-feed copy,
  reject credential/query/fragment install URLs before durable persistence, and
  add the Marketplace tab Add action to write an installable skill into the
  caller's personal Scout feed. Local validation passed
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test install_marketplace_skill --lib`,
  `src/lobster_runtime/../../cargo.sh clippy --lib -- -D warnings`,
  web `npm run type-check`, `npm run lint`, `npm run format:check`, targeted
  web unit tests for `FeedsPage` and `scoutFeedsApi` (14 tests), and
  `git diff --check`. Direct Windows `cargo test` remains blocked by missing
  MSVC OpenSSL, so use `cargo.sh`. Required ADO queued on #3604:
  PullRequest `169385689`, Build Validation `169385686`.
- 2026-06-24 Lobster PR #3422 rebase: Rebasing
  `https://microsoft.ghe.com/bic/lobster/pull/3422` fixed the previous
  ADO disk-guard failure path by picking up current `main` including the merged
  runtime cache-prune pipeline fix. Worktree:
  `C:\src\lobster-feeds-admin-composition`, branch
  `user/giodl/scout-feeds-admin-composition`. Stashed one pre-rebase local
  `src/lobster_runtime/src/scout_feed_cli.rs` diff as
  `pre-rebase-scout-feed-admin-composition-local-auth-diff`; it appeared to be
  the already-merged Scout CLI auth surface from #3545, so it was not reapplied.
  Resolved web-feature-flags conflicts by keeping both
  `scout_feeds_admin_ux_enabled` and `web_gateway_multiplexing_enabled`, then
  force-pushed head `314aeed554154d565988a3f5b2f73bc956b38c07`. Local
  validation passed `git diff --check`,
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `src/lobster_runtime/../../cargo.sh test scout_feed --lib`,
  `npm run format:check` in `src/lobster_web`, and
  `npm run test:unit` in `src/lobster_web`. Direct Windows `cargo test` remains
  blocked by missing MSVC OpenSSL, so use `cargo.sh` for local Rust proof.
  Posted PR comment
  `https://microsoft.ghe.com/bic/lobster/pull/3422#issuecomment-184864446`.
  Fresh ADO queued: PullRequest `169376727`, Build Validation `169376721`.
  Remaining blockers at queue time: `GitOps/GitHubPop` proof-of-presence
  failure and stale Galin changes-requested review pending refresh.
- 2026-06-24 OpenClaw hosted marketplace PR stack proof pass: Rechecked
  hosted-feed PRs #95846, #95868, #95877, #95964, #95969, #95981, #96155,
  and #96158. Live ClawHub proof shows `https://clawhub.ai/v1/feeds/plugins`
  returns `schemaVersion: 2`, sequence `9`, `Last-Modified`, `ETag`, and
  `X-Content-Sha256`. Reproduced and fixed the PR #95877 invalid snapshot
  fixture bug by keying the seeded snapshot to
  `DEFAULT_OFFICIAL_EXTERNAL_PLUGIN_CATALOG_FEED_URL`; pushed signed commit
  `68a85a8e500`. Found and fixed the real schema mismatch in PR #95969 by
  accepting supported feed schema versions `1` and `2` while still rejecting
  unsupported versions; pushed signed commit `b551983516c`. Rebased and
  force-pushed downstream stack heads: #95964 `fb61b1d1fcb`, #95981
  `da816509136`, #96155 `82c404263a1`, and #96158 `bedf630f675`. Final branch
  validation passed
  `pnpm build`, `git diff --check`, and focused Vitest coverage:
  `official-external-plugin-catalog.test.ts`,
  `plugins-cli.marketplace-refresh.test.ts`,
  `plugins-cli.marketplace-entries.test.ts`, `plugins/marketplace.test.ts`,
  and `zod-schema.marketplaces.test.ts` with 85 plugin/catalog/config tests
  across the selected shards. Real CLI retries on the cumulative PR8 branch
  currently hit the 5s ClawHub fetch guard and fall back to bundled data, which
  proves the fallback path; earlier live proof listed hosted ClawHub marketplace
  entries from the same feed before the rebase, and the schema v2 path is now
  covered by focused tests. Added exact `## Real behavior proof` sections to
  all eight PR bodies. GitHub proof checks are passing; standalone
  `@clawsweeper re-review` comments were posted and acknowledged on all eight
  PRs before the PR3 fix, and changed PRs need fresh re-review after the latest
  force-pushes.
- 2026-06-24 Lobster PR #3564 review follow-up: Addressed Daren/dspektor's
  requested change on `https://microsoft.ghe.com/bic/lobster/pull/3564` from
  worktree `C:\src\lobster-scout-mos3-marketplace`, branch
  `user/giodl/scout-mos3-marketplace-search`. The branch already had
  `124d8b92e` validating discovered MOS3 Titles hosts before reusing cached
  `--auth-scope` tokens. Added and pushed `f8fa2f6ba` so hosted
  `Mos3Environment::live_config(..., discover_environment: true)` also opts
  into the same discovered-host validation for personal MOS3 feed loading.
  Updated the PR comment requesting Daren re-review:
  `https://microsoft.ghe.com/bic/lobster/pull/3564#issuecomment-184736766`.
  Local validation: `cargo fmt --check` and `git diff --check` passed; targeted
  `cargo test -p lobster_runtime scout_mos3_auth_tests::live_config_pairs_environment_base_url_with_token --lib`
  is blocked locally by missing private Cargo registry auth
  (`cargo login --registry lobster` / `CARGO_REGISTRIES_LOBSTER_TOKEN`). Fresh
  ADO queued on head `f8fa2f6ba`: PullRequest `169323755`, Build Validation
  `169323754`. `GitOps/GitHubPop` is failing because Proof of Presence needs
  Gio authentication for the new head.
- 2026-06-24 Lobster Scout marketplace UX PR: Created stacked worktree
  `C:\src\lobster-scout-feeds-marketplace-ux` from #3564, branch
  `user/giodl/scout-feeds-marketplace-ux`, and opened non-draft PR
  `https://microsoft.ghe.com/bic/lobster/pull/3565` at head `d007074b6`.
  Scope: add authenticated runtime route
  `/v1/scout/feeds/marketplace.json` backed by
  `scout_mos3_marketplace::import_mos3_marketplace_async`, configure it with
  `LOBSTER_SCOUT_MARKETPLACE_FEED_MOS3_ENV`, and add Marketplace as the third
  Lobster web `/feeds` tab using the existing search/filter flow. Local
  validation passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml
  --check`, `cargo test load_live_mos3_marketplace_feed_returns_root_feed`,
  targeted web `npm run format:check`, targeted web `npm run test:unit`, and
  `git diff --check`. Required ADO queued: PullRequest `169261923` and Build
  Validation `169261920`.
- 2026-06-23 Lobster Scout MOS3 marketplace PR: Confirmed there was MOS3
  marketplace proof in `projects/feeds/demo/mos3-personal-feed-demo.ps1`, but
  no landed Lobster Scout CLI PR exposing `/marketplace/v1/users/titles/query`.
  Created clean stacked worktree `C:\src\lobster-scout-mos3-marketplace` from
  #3545, branch `user/giodl/scout-mos3-marketplace-search`, and opened
  `https://microsoft.ghe.com/bic/lobster/pull/3564` at head `7b8e2718e`.
  Scope: add `scout feed import mos3-marketplace`, call
  `/marketplace/v1/users/titles/query` with AgentSkills/AgentConnectors and
  public/tenant scopes, normalize marketplace title summaries into Scout feed
  entries, add `--environment <env>` for known MOS3 Titles hosts, and rely on
  existing `scout feed search` for local marketplace search. Local validation
  passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`,
  `git diff --check`, `just cargo test scout_mos3_marketplace --lib`,
  `just cargo test import_mos3_marketplace_writes_feed_for_local_search --lib`,
  and `just cargo clippy --lib -- -D warnings`. Full
  `just cargo clippy --lib --tests -- -D warnings` remains blocked by existing
  unrelated `clippy::large_futures` warnings in
  `tests/client_disconnect_relay_test.rs` and
  `tests/graceful_shutdown_test.rs`. There is no local Scout auth cache, so no
  live MSIT call was made. Added helper script
  `projects/feeds/validate-mos3-marketplace.ps1` for device-code login,
  marketplace import, feed verification, and skill search. Required ADO was
  queued on `7b8e2718e`: PullRequest `169255287` and Build Validation
  `169255286`.
- 2026-06-23 Lobster Scout CLI auth follow-up: Pushed commit `e29b45f1a`
  to PR `https://microsoft.ghe.com/bic/lobster/pull/3545` after Codeclaw's
  follow-up cached-token finding. The fix applies the cached `--auth-scope`
  destination guard to both `feed import mos3-live` and `feed publish-mos3`
  before loading/sending cached tokens; loopback and MOS3 Titles hosts are
  allowed by default, with `--allow-auth-scope-any-host` as the explicit
  override. Added regression coverage for arbitrary HTTPS `--base-url`
  rejection in both commands, and fixed the ADO clippy findings in
  `scout_feed_cli_tests.rs`. Local validation passed
  `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `just cargo test scout_feed_cli --lib` (72 passed),
  `cd src\lobster_runtime; ..\..\cargo.sh clippy --lib --tests -- -D warnings`,
  and `git diff --check`. Posted PR comment
  `https://microsoft.ghe.com/bic/lobster/pull/3545#issuecomment-184344801`.
  Fresh ADO queued on `e29b45f1a`: PullRequest build `169229042` and Build
  Validation build `169229041`.
- 2026-06-23 PR #3545 ADO follow-up: Build Validation `169229041` passed.
  PullRequest `169229042` failed in `Lobster Runtime - Quality
  (fmt/clippy/build/deny)` before the Rust workload because the worker disk
  guard had only 4863 MB free against a 5000 MB minimum after cache pruning
  (`Bash exited with code 73`). This is worker/cache pressure rather than a
  code or clippy failure. Queued replacement PullRequest build `169238171` on
  the same head `e29b45f1a`.
- 2026-06-23 PR #3545 CI disk fix: Replacement PullRequest `169238171` hit
  the same release-cache disk guard with 4864 MB free. Pushed commit
  `f9fe0780` adding `RUST_CI_CARGO_TARGET_CACHE_ROOT` and
  `RUST_CI_DROP_TARGET_CACHE_MIN_FREE_MB` to the release-cache guard so it can
  drop oversized restored release target caches like the test/debug guard does.
  Local validation passed `bash scripts/tests/cargo-test-with-junit.test.sh`,
  `bash scripts/tests/rust-disk-guard.test.sh`, and `git diff --check`. ADO
  queue calls timed out but created runs anyway: PullRequest `169240751` and
  duplicate `169241122`; Build Validation `169240750` and duplicate
  `169241125`, all on `f9fe0780`.
- 2026-06-23 PR #3545 CI disk review fix: Codeclaw correctly requested that
  the full-drop env move from the pre-restore measurement step to the
  post-restore release-cache prune step. Pushed commit `0d1cc2cf7`, moving
  `RUST_CI_CARGO_TARGET_CACHE_ROOT` and
  `RUST_CI_DROP_TARGET_CACHE_MIN_FREE_MB` to `Prune ... transient cargo release
  cache and verify disk`, and adding a `check-runtime-pipeline-sdl.py`
  assertion for that post-restore placement. Local validation passed
  `python scripts\ci\check-runtime-pipeline-sdl.py`,
  `bash scripts/tests/cargo-test-with-junit.test.sh`,
  `bash scripts/tests/rust-disk-guard.test.sh`, and `git diff --check`.
  Posted PR comment
  `https://microsoft.ghe.com/bic/lobster/pull/3545#issuecomment-184480221`.
  Fresh ADO queued on `0d1cc2cf7`: PullRequest `169243364` and Build
  Validation `169243361`.
- 2026-06-23 MOS3 validation pass: On Lobster branch
  `user/giodl/scout-cli-auth-login` at `bf89f08a1`, deterministic MOS3
  validation passed `just cargo test scout_mos3 --lib` (23 tests) and
  `just cargo test scout_feed --lib` (120 tests), covering MOS3 environment
  scopes, token-provider handoff, snapshot import, live acquisitions import,
  publish package outcomes, hosted personal feed MOS3 projection, and
  publish-to-MOS3 route behavior. Built the Scout CLI with
  `just cargo build --bin scout`; `scout feed --help` and `scout auth status`
  work from `C:\src\lobster-scout-cli-auth-login\src\lobster_runtime\target\debug\scout.exe`.
  Default auth cache had no tokens. Attempted Azure CLI token acquisition for
  `https://titles.prod.mos.microsoft.com/.default` failed with AADSTS65002
  because Azure CLI's public client is not preauthorized for the MOS3 Titles
  resource, so live MOS3 validation must use `scout auth login` with an
  approved public client. Added read-only-by-default helper script
  `projects/feeds/validate-mos3-live.ps1`; pass `-Login` for device-code auth
  and `-Publish` only when intentionally testing MOS3 personal publish.
- 2026-06-23 Lobster Scout CLI auth review fix: Pushed commit `bf89f08a1`
  to PR `https://microsoft.ghe.com/bic/lobster/pull/3545` after
  Codeclaw/dspektor requested changes. Fixes: removed `Debug` derives from
  token-bearing cache/response structs, changed auth-cache writes to private
  temp-file + rename with Unix `0600`, rejected `auth logout --all` with
  `--scope`, corrected device-code expiry from `>` to `>=`, and blocked
  cached `--auth-scope` feed fetches to arbitrary HTTPS hosts unless
  `--allow-auth-scope-any-host` is passed; loopback and Lobster prod gateway
  feed hosts remain allowed. Added mocked AAD/device-code/refresh tests for
  success, device-code errors, malformed JSON, expiry, refresh success/failure,
  no-refresh-token, host-boundary rejection, and logout conflict. Local
  validation passed `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `just cargo test scout_feed_cli --lib` (70 passed),
  `just cargo check --bin scout`, `just cargo clippy --lib -- -D warnings`,
  and `git diff --check`. PR head is
  `bf89f08a121312ee01d6b8587b572fe879ed2822`; GitHub check rollup initially
  only showed GitOps (`FileAffordance` success, `GitHubPop` failure), so manual
  ADO was queued: PullRequest build `169219816` and Build Validation build
  `169219814`, both on `bf89f08a1`. Review remained changes-requested pending
  refresh.
- 2026-06-23 Lobster Scout CLI auth PR: Opened
  `https://microsoft.ghe.com/bic/lobster/pull/3545` from clean worktree
  `C:\src\lobster-scout-cli-auth-login`, branch
  `user/giodl/scout-cli-auth-login`, commit `136f4601c`. Scope: add
  `scout auth login/token/status/logout` with explicit cache path support and
  `--auth-scope` / `--auth-cache` opt-in for hosted feed fetch, live MOS3
  import, and MOS3 publish. Validation passed `cargo fmt --manifest-path
  src\lobster_runtime\Cargo.toml --check`, `just cargo test scout_feed_cli
  --lib` (61 passed), `just cargo check --bin scout`,
  `just cargo clippy --lib -- -D warnings`, and `git diff --check`. Broad
  `just cargo clippy --lib --tests -- -D warnings` is blocked by existing
  unrelated `large_futures` warnings in `client_disconnect_relay_test.rs` and
  `graceful_shutdown_test.rs`. Required ADO queued on the branch: PullRequest
  build `169198058` and Build Validation build `169198054`.
- 2026-06-23 OpenClaw hosted marketplace naming update: Addressed Patrick's
  stack comments on the RFC 19 implementation PRs. PR #95868 now uses the
  generic hosted endpoint `https://register.openclaw.ai/official-marketplace.json`
  instead of `official-external-plugin-catalog.json`; the bundled fallback file
  name intentionally remains unchanged. PR #95981 now uses the persisted
  OpenClaw config surface `marketplaces.feeds` and `marketplaces.sources`, with
  the loader bridge reading `config.marketplaces` instead of `config.catalog`.
  Posted direct replies on both PRs. Rebased and force-pushed the downstream
  stack after the PR2 rewrite: #95868 `f184d6d84a7`, #95877 `b486def151e`,
  #95964 `f261e7680fe`, #95969 `30fbce9d3cf`, and #95981 `fdd7f78f201`; all
  branch tips are signed/verified. Top-branch validation on #95981 passed
  targeted oxlint, `git diff --check`, focused config/plugin tests
  (`zod-schema.marketplaces.test.ts` and
  `official-external-plugin-catalog.test.ts`, 46 total tests), and
  `pnpm tsgo:core:test`.
- 2026-06-23 OpenClaw hosted marketplace PR7: Opened draft PR
  `https://github.com/openclaw/openclaw/pull/96155` from WSL worktree
  `/root/src/openclaw-feeds-hosted-catalog-prep`, branch
  `feeds-hosted-catalog-marketplace-refresh`, signed head `76baf5a499a`, base
  `feeds-hosted-catalog-config-profiles`. Scope: add
  `openclaw plugins marketplace refresh` as the first manual activation slice
  for the hosted marketplace feed path. The command reads `config.marketplaces`,
  calls the configured hosted loader, writes through the existing snapshot-store
  path, and reports hosted, hosted-snapshot, or bundled-fallback results in text
  or JSON. It supports `--feed-profile`, `--feed-url`, `--expected-sha256`, and
  `--json`. GPT-5.5 Codex review initially found that checksum-pinned refreshes
  could still exit 0 after bundled fallback; fixed by failing pinned refreshes
  unless the accepted result is a fresh hosted payload, with regression test.
  Final validation passed targeted oxfmt, oxlint, `git diff --check`, focused
  CLI/catalog tests (`plugins-cli.lazy.test.ts`,
  `plugins-cli.marketplace-refresh.test.ts`,
  `official-external-plugin-catalog.test.ts`; 44 total tests),
  `pnpm tsgo:core:test`, and a clean
  `codex review -c model=gpt-5.5 --base origin/feeds-hosted-catalog-config-profiles`.
- 2026-06-23 OpenClaw hosted marketplace PR9: Opened draft PR
  `https://github.com/openclaw/openclaw/pull/96194` from WSL worktree
  `/root/src/openclaw-feeds-hosted-catalog-prep`, branch
  `feeds-hosted-catalog-marketplace-telemetry`, signed head `1985e1c07e1`.
  Scope: implement the first feed telemetry slice from RFC addendum
  `https://github.com/openclaw/rfcs/pull/24` by emitting opt-in diagnostics
  timeline marks for `openclaw plugins marketplace refresh` and
  `openclaw plugins marketplace entries`. The events carry bounded attributes
  for command, result source, entry count, feed profile, URL override presence,
  feed host, feed id/sequence, HTTP status, payload checksum, validator
  presence, snapshot use, and coarse fallback category. Tests prove raw URL
  credentials, query strings, fragments, and override secrets are not emitted.
  Validation passed targeted `oxfmt`, targeted `oxlint`, `git diff --check`,
  focused marketplace CLI tests with 7 tests, and `timeout 300s
  pnpm tsgo:core:test`. GitHub selected checks are green. GPT-5.5 Codex review
  is currently blocked in WSL by an invalidated local Codex/ChatGPT token.
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
- 2026-06-23 OpenClaw hosted catalog PR4: Drafted
  `https://github.com/openclaw/openclaw/pull/95964` from WSL worktree
  `/root/src/openclaw-feeds-hosted-catalog-prep`, branch
  `feeds-hosted-catalog-persistent-snapshot`, commit `c371b39a93e`, stacked on
  `feeds-hosted-catalog-snapshot-cache`. This binds the #95877 snapshot
  contract to a SQLite-backed OpenClaw state table
  `official_external_plugin_catalog_snapshots`. The hosted loader now uses the
  persistent store by default, with `snapshotStore: null` preserved for callers
  and tests that need persistence disabled. It persists feed URL, body, HTTP
  status, ETag, Last-Modified, checksum, saved time, and update time, so HTTP
  304 or transient hosted failures can use a last-known-good state snapshot
  before falling back to the bundled catalog. Deliberately not included: source
  profiles, authenticated feed URLs, signed envelopes, background refresh,
  search, install UX, skills, or telemetry. Local validation passed
  `pnpm exec oxfmt --check` on touched TS/generated files, `pnpm exec oxlint
  --deny-warnings` on touched TS files, `pnpm db:kysely:check`,
  `git diff --check`, `CI=1 timeout 180s node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 29 tests, and
  `pnpm tsgo:core:test`. PR is draft; initial GitHub checks were in progress
  with merge state `UNSTABLE` immediately after opening.
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
- 2026-06-23 RFC 0009 feed telemetry addendum: After RFC #19 merged, opened
  follow-up PR `https://github.com/openclaw/rfcs/pull/24` from WSL worktree
  `/root/src/openclaw-rfcs-feed-telemetry-addendum`, branch
  `feeds-telemetry-addendum`, latest signed commit `b877bbb`. The PR now edits
  `rfcs/0009-hosted-feeds-for-plugins-and-skills.md` directly instead of adding
  a separate RFC. The addendum answers the telemetry question: OpenClaw already
  has diagnostics events, local diagnostics bundles, `diagnostics-otel`, and
  plugin install records, so feeds can reuse the existing pipeline, but feed
  usage will not be measured automatically without explicit feed provenance and
  lifecycle events. It proposes feed fetch, snapshot load, entry action, update,
  policy decision, and activation events, plus a feed provenance block on
  feed-backed install records. Local validation passed `git diff --check` and
  no-em-dash check; Socket checks are green on the PR.
- 2026-06-22 ADO pipeline ops note is historical. Current policy: Lobster ADO
  checks attach/run automatically; use `projects/lobster/ado-pipelines.md` for
  status/troubleshooting only, and do not run `az pipelines run` unless the
  user explicitly asks to queue a named PR/branch.
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
- 2026-06-23 OpenClaw hosted marketplace stack advanced through PR9. PR #96155
  `https://github.com/openclaw/openclaw/pull/96155` is draft PR7 on
  `feeds-hosted-catalog-marketplace-refresh`, based on
  `feeds-hosted-catalog-config-profiles`, signed head `76baf5a499a`. It adds
  `openclaw plugins marketplace refresh` as the manual activation path for
  hosted marketplace feeds and persisted snapshots. PR #96158
  `https://github.com/openclaw/openclaw/pull/96158` is draft PR8 on
  `feeds-hosted-catalog-marketplace-entries`, based on PR7, signed head
  `ee414550053`. It adds `openclaw plugins marketplace entries`, an explicit
  offline snapshot read mode in the hosted catalog loader, CLI docs, and focused
  tests. Validation passed for PR8: targeted `oxfmt`, targeted `oxlint`,
  `git diff --check`, focused CLI/catalog tests with 48 total tests,
  `timeout 300s pnpm tsgo:core:test`, and
  `codex review -c model=gpt-5.5 --base origin/feeds-hosted-catalog-marketplace-refresh`
  with no discrete correctness findings. The Codex review sandbox could not run
  tests because its read-only filesystem could not create the heavy-check lock,
  but the writable local test run passed. PR #96194 is draft PR9 on
  `feeds-hosted-catalog-marketplace-telemetry`, based on PR8, signed head
  `1985e1c07e1`; it adds bounded diagnostics timeline telemetry for explicit
  marketplace feed refresh/read commands. GPT-5.5 Codex review for PR9 is
  blocked until the local Codex token is refreshed.
- 2026-06-24 Lobster #3565 runtime unit failure investigated; superseded
  workaround below was later corrected by the follow-up entry. The
  failing check was
  `gateway_proxy::ecs_settings::tests::privileged_openclaw_tool_gates_are_not_user_overridable`
  in ADO builds `169427719` and `169427727`; it found that
  `openclaw_code_mode_enabled` and sibling OpenClaw WorkIQ tool gates were still
  user-overridable in `src/lobster_runtime/config/ecs-settings.json`. The
  superseded `5bb70db` head added `user_override_disabled_reason` to the
  protected code-mode and WorkIQ tool gates. Local validation: JSON parse,
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`, and
  `git diff --check` passed. Full local Rust test was blocked by local OpenSSL
  setup on Windows and private Cargo registry auth in WSL, so authenticated ADO
  is running as PullRequest `169435542` and Build Validation `169435538`.
- 2026-06-24 follow-up: edpiva correctly flagged that the `5bb70db` workaround
  contradicted #3618, where only `openclaw_code_mode_judge_enabled` remains
  non-overridable and the other code-mode/WorkIQ gates are scout-admin
  user-overridable. Updated #3565 to head `e5c8735`, removed the stray
  `user_override_disabled_reason` fields from those user-overridable gates,
  left the judge gate protected, and clarified the `build_router_from_env`
  comment for marketplace MOS3 configuration. Local validation: JSON parse,
  `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml --check`, and
  `git diff --check` passed. Focused Rust test still cannot complete locally
  because Windows OpenSSL is not configured. ADO requeued as PullRequest
  `169436683` and Build Validation `169436681`; auto PR run `169436671` also
  attached.
- 2026-06-24 Lobster #3422 was closed and replaced with fresh PR #3627
  `https://microsoft.ghe.com/bic/lobster/pull/3627` from the same
  `user/giodl/scout-feeds-admin-composition` branch at `9ce43517` to reset
  stale review state for tenant admin Scout feed composition. Required ADO was
  queued as PullRequest `169436955` and Build Validation `169436951`.
- 2026-06-26 Lobster feeds validation on fresh `origin/main` worktree
  `C:\src\lobster-feeds-validation`: OpenSSL was fixed for local Rust by
  setting `OPENSSL_DIR`, `OPENSSL_LIB_DIR`, `OPENSSL_INCLUDE_DIR`, and `PATH`
  in `projects/feeds/demo/validate-lobster-feeds-main.ps1`. The helper passed
  the focused web and Rust feed suites: web feeds UX/API 18 tests, Rust
  `scout_feed_cli` 74 tests, Rust `scout_feed` 136 tests, and Rust
  `scout_mos3_marketplace` 3 tests. A Playwright recording helper
  `projects/feeds/demo/record-lobster-feeds-playwright.mjs` captured the
  gated feeds UX against mocked personal, tenant-approved, marketplace, admin,
  install, and publish endpoints. Artifacts are in
  `C:\tmp\lobster-feeds-playwright-recording`, including
  `lobster-feeds-session.webm` and screenshots for personal, tenant-approved,
  marketplace, add, and publish views. The app still logs unrelated gateway
  websocket and history errors in this mock shell because Teams/M365 sign-in is
  not active, but the feeds UI and mocked API calls render and complete.
- 2026-06-26 live MOS3 read proof attempted with
  `projects/feeds/demo/record-mos3-live-proof.ps1` against MSIT. The script was
  updated to acquire a MOS3 token with PowerShell device-code auth and pass it
  to Scout via `--token-env`, because `scout auth login` hangs before printing
  its device-code message in this environment. Device-code sign-in for app
  `Microsoft Scout` / client id `7acd1687-fdfb-43f1-814d-f3e8bb8d604a` was
  blocked by Microsoft Entra with error code `530033`, request id
  `aa88284a-be6a-4e63-955a-426e41173200`, correlation id
  `be871883-4d05-4316-98b9-0c0452ca4010`, timestamp
  `2026-06-26T21:04:43.221Z`. This blocks live CLI proof until Scout's allowed
  auth path for MOS3 is available, or the app/conditional-access policy permits
  the requested MOS3 scope from this flow.
- 2026-06-26 live Lobster 302 Feeds UX proof: Added
  `projects/feeds/demo/enable-lobster-302-feeds-ecs.mjs`, which uses the
  signed-in Edge profile at `C:\tmp\lobster-feeds-302-edge-profile` and the
  app's own MSAL Lobster token provider to POST per-user ECS diagnostics
  overrides. Against
  `https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/feeds`, the
  helper successfully set `scout_feeds_ux_enabled=true` for Gio's user in
  tenant `72f988bf-86f1-41af-91ab-2d7cd011db47` on island
  `prdia302cus0aks` / ring `firstrelease`; `/v1/me/web-feature-flags`
  then returned `scout_feeds_ux_enabled: true`, and the Feeds UX rendered in
  Edge. Artifact directory:
  `C:\tmp\lobster-feeds-302-ecs-2026-06-26T212706-558Z`.
  The same live 302 build returned `404 unknown ECS setting
  scout_feeds_admin_ux_enabled`, so tenant-admin Feeds UX is not registered in
  that deployed build yet.
- 2026-06-26 live MOS3 marketplace CLI proof succeeded after switching from
  the hand-rolled browser PKCE helper to Lobster's existing MSAL Node/WAM token
  path. The browser helper failed with `AADSTS50011` because the Scout app does
  not allow `http://localhost:38473/callback`; device code had already been
  blocked by Conditional Access `530033`. Added
  `projects/feeds/demo/get-mos3-token-wam.ps1`, which wraps
  `src/lobster_runtime/dev/tok.mjs --client-id
  7acd1687-fdfb-43f1-814d-f3e8bb8d604a` for
  `https://titles.msit.mos.microsoft.com/.default`. Validation command:
  `powershell -ExecutionPolicy Bypass -File
  "C:\src\claws-hapi\projects\feeds\demo\get-mos3-token-wam.ps1" -Environment
  msit -RunMarketplaceProof`. It acquired a MOS3 token through WAM, imported 76
  marketplace entries, verified the feed, and `scout feed search skill` returned
  MOS3 skills including `power-automate-build`, `earnings-brief`,
  `issuer-brief`, `peer-analysis`, `lng-import-market-tracker`,
  `power-automate-mcp`, `sector-brief`, `power-automate-execution-layer`,
  `resize-for-social-media`, and `power-automate-debug`. Latest proof artifacts:
  `C:\Users\giodl\AppData\Local\Temp\mos3-wam-token-20260626-145035`.
- 2026-06-26 Scout CLI demo recording with explicit commands: created
  `C:\Users\giodl\AppData\Local\Temp\mos3-scout-cli-install-recording-20260626-151521\scout-cli-mos3-search-and-install-proof.webm`.
  It shows acquiring a MOS3 token through WAM, then running
  `scout feed import mos3-marketplace`, `scout feed verify`, `scout feed
  search`, `scout feed publish-local`, and `scout feed install --target` into
  `demo-openclaw\skills\demo-calendar`. The same artifact directory includes
  the transcript, HTML replay, screenshot, generated marketplace feed, personal
  feed, sample skill, installed target directory, and provenance file.
- 2026-06-26 feeds roadmap refresh: Live Lobster PR state confirms the Scout
  feeds stack through marketplace UX/install/admin approval/publish/state is
  merged: #3368, #3545, #3564, #3565, #3604, #3608, #3620, #3622, and #3627
  are all `MERGED`. Live ClawPilot state: #3542 remains open, non-draft, and
  approved at `502ec0bc`; #3613 remains open, non-draft, review-required at
  `61ae4cd1`. Reran failed GitHub checks on both ClawPilot PRs; prior CI logs
  show `pnpm install --frozen-lockfile` reported the lockfile was up to date and
  then failed with Azure Artifacts `ERR_PNPM_FETCH_401`, so the visible red
  checks are package-feed auth, not a feeds code or lockfile diff. Posted
  #3613 re-review request:
  `https://github.com/gim-home/m/pull/3613#issuecomment-4813926718`.
- 2026-06-29 MOS3-first feed contract update: tightened the named-feed plan so
  MOS3 is the intended product authority for feed and collection identity, ACLs,
  effective personal and tenant-approved projections, named-feed revisions,
  admin review, search, follow/include state where available, artifact metadata,
  and audit. Lobster file-backed durable feed dirs are now documented as local
  development, CI proof, or short-term bridge infrastructure only. The next PR
  direction is MOS3 contract validation first, then Lobster MOS3 route adapters,
  not a permanent Lobster-only named-feed store.
- 2026-06-29 policy/MOS3 storage check: confirmed Lobster policy already uses
  MOS3 for policy artifact storage when live publish is configured.
  `POST /v1/policy/personal/artifacts/publish` packages policy JSONC for MOS3,
  publishes via `/builder/v1/users/packages`, and returns a
  `PolicyBaselineArtifactRef` with `store=mos3`, artifact id, revision, SHA-256,
  and attestation. The accepted/effective policy state is not fully MOS3-owned
  yet: personal baseline acceptance, tenant feed-source selection, and effective
  baseline materialization are durable Lobster JSON state, and feed-source
  selection still reads tenant-approved feed documents from configured Lobster
  feed dirs. Updated the named-feed plan and role review so policy feed entries
  reference MOS3-governed policy artifacts while MOS3-first contract work covers
  the remaining selection/effective-feed authority.
- 2026-06-29 MOS3-real first PR started: updated
  `projects/feeds/user-shared-named-feeds-plan.md` with an execution plan for
  making 301 real: inventory route-to-store state, add source diagnostics, then
  replace the tenant-approved/admin store dependency before adding broader
  named-feed UX. Fetched Lobster `origin/main` to `92170eb51` and created clean
  worktree `C:\src\lobster-feeds-real-mos3-diagnostics` on branch
  `user/giodl/scout-feeds-mos3-source-diagnostics`. Implemented authenticated
  `GET /v1/scout/feeds/source-diagnostics`, returning PII-safe route source
  modes for approved feed, personal feed, marketplace feed, personal publish,
  admin catalog, and admin publish. Modes identify `mos3`,
  `lobsterFileBridge`, `hybrid`, or `unavailable` without returning paths or
  tenant/user ids. Also implemented authenticated
  `GET /v1/policy/source-diagnostics` for effective policy, personal accept,
  MOS3 artifact publish, and policy feed-source selection; this makes clear
  that policy artifact publish is MOS3-backed while effective/selection state is
  still a Lobster bridge. Updated `docs/reference/scout-catalog-feeds.md` with
  the route-to-store matrix and 301 validation bar. Validation passed in the
  Lobster worktree: `cargo fmt --manifest-path
  src\lobster_runtime\Cargo.toml --check`, `git diff --check`, focused
  `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml
  source_diagnostics --lib --no-fail-fast` (4 passed), broader
  `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml
  scout_feed --lib --no-fail-fast` (141 passed), and broader
  `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml policy
  --lib --no-fail-fast` (129 passed). Broad runtime clippy with Rust 1.95 is
  currently blocked by existing crate-wide lint findings outside this slice
  (`duration_suboptimal_units`, `map_unwrap_or`, etc.), matching the current
  known local clippy caveat.
- 2026-06-29 Lobster #3748 opened: committed the diagnostics slice in
  `C:\src\lobster-feeds-real-mos3-diagnostics` as
  `c98d84bba7c637e4a8b3f3f119f51441e354709c` (`feat(scout): add feed source
  diagnostics`), pushed branch `user/giodl/scout-feeds-mos3-source-diagnostics`,
  and opened draft PR `https://microsoft.ghe.com/bic/lobster/pull/3748`.
  PR state immediately after open: draft, mergeable, review-required,
  `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed for Proof of
  Presence, required ADO queued. Manual ADO builds queued: PullRequest
  `170173229`, Build Validation `170173228`; an automatic PullRequest run
  `170173224` also attached detector/repo-validation checks.
- 2026-06-29 Lobster #3748 rebased after #3746 merge: rebased
  `user/giodl/scout-feeds-mos3-source-diagnostics` onto Lobster `origin/main`
  at `81842b3255de329b0b6c75b2e74c8d40448d06e9`, producing head
  `fad372b5e84879d06a843880c907efd13725e2cb`, and force-pushed with lease.
  Validation after rebase passed `cargo fmt --manifest-path
  src\lobster_runtime\Cargo.toml --check`, `git diff --check`,
  `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml
  source_diagnostics --lib --no-fail-fast` (4 passed),
  `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml
  scout_feed --lib --no-fail-fast` (142 passed), and
  `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml policy
  --lib --no-fail-fast` (129 passed). Requeued required ADO on the updated
  head: PullRequest `170175972`, Build Validation `170175973`. Immediate live
  PR state: draft, mergeable, review-required, GitOps/FileAffordance passed,
  GitOps/GitHubPop failed for Proof of Presence, and both required Lobster
  runtime contexts are queued.
- 2026-06-29 Lobster #3748 review/CI fix: live PR state showed
  `CHANGES_REQUESTED` from dspektor and failed `Lobster Runtime — Quality`
  on head `fad372b5e84879d06a843880c907efd13725e2cb`. The clippy blocker was
  `clippy::unused_self` in `src/routes/policy.rs`; review also found that
  policy source diagnostics could report personal accept/artifact publish as
  configured without the `LOBSTER_POLICY_COMPARISON_ATTESTATION_KEY` required by
  the real write paths. Amended #3748 to make the effective-policy diagnostic a
  static helper and require the comparison attestation key for policy personal
  accept and MOS3 artifact publish diagnostics, with a missing-key regression
  test. New head:
  `4322823db4a06afaf964d6809e474b7bdb4cef9f`. Validation passed:
  `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `git diff --check`, `cargo +1.95.0 test --manifest-path
  src\lobster_runtime\Cargo.toml source_diagnostics --lib --no-fail-fast` (5
  passed), `just rust-clippy`, `cargo +1.95.0 test --manifest-path
  src\lobster_runtime\Cargo.toml policy --lib --no-fail-fast` (130 passed),
  and `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml
  scout_feed --lib --no-fail-fast` (142 passed). Requeued required ADO on the
  updated head: PullRequest `170181723`, Build Validation `170181722`.
- 2026-06-29 Lobster #3748 Copilot/requested-change follow-up: live review
  threads on `https://microsoft.ghe.com/bic/lobster/pull/3748` still had
  unresolved Copilot comments and dspektor patrol feedback for Scout admin
  diagnostics. Amended the diagnostics contract so the mixed prerequisite list
  serializes as `requirements` instead of misleading `requiredEnv`, made
  `/v1/scout/feeds/source-diagnostics` caller-aware for admin readiness via
  validated claims, and aligned admin catalog/publish diagnostics with the real
  authorization contract: ECS user-config provider is required, then either a
  validated M365 tenant-admin directory role or the assignment snapshot can
  satisfy admin authorization. Added regression coverage for a directory-role
  tenant admin without `LOBSTER_SCOUT_ADMIN_ASSIGNMENTS_PATH`, and for admin
  diagnostics failing closed without a user-config provider. Also fixed the
  docs `tenant IDs` / `user IDs` nit and documented `requirements`. New head:
  `f4c1e640f89f04341f2154e55f0c1dfd48d93bb4`. Validation passed:
  `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`,
  `git diff --check`, `cargo +1.95.0 test --manifest-path
  src\lobster_runtime\Cargo.toml source_diagnostics --lib --no-fail-fast` (7
  passed), `cargo +1.95.0 test --manifest-path src\lobster_runtime\Cargo.toml
  policy --lib --no-fail-fast` (130 passed), `cargo +1.95.0 test
  --manifest-path src\lobster_runtime\Cargo.toml scout_feed --lib
  --no-fail-fast` (144 passed), and `just rust-clippy`. Requeued required ADO
  on the updated head: PullRequest `170251303`, Build Validation `170251307`.
- 2026-06-29 live 301/302 route/admin validation prep: After the Lobster feeds
  PRs merged, reran `projects/feeds/demo/record-lobster-live-feeds.mjs` against
  both deployed environments. 301 (`prod-301eus`) rendered `/skills` and feed
  discovery, with approved/marketplace feed APIs returning typed
  `503 SCOUT_FEED_UNAVAILABLE`; the profile showed Gio signed in in the page
  chrome, but MSAL token acquisition failed with "No active MSAL account" and
  timed out, so admin flag detection was inconclusive. 302 (`prod-302us`)
  rendered `/feeds` and `/skills`, but feed APIs still returned route-level
  404, so 302 is behind 301 for the feeds backend stack. It also failed silent
  token acquisition. Added `projects/feeds/demo/probe-lobster-route-admin.mjs`
  to perform a focused signed-in probe: it opens 301/302, acquires a Lobster
  bearer token, calls `/v1/route`, `/v1/me/web-feature-flags`, and
  `/v1/scout/feeds/source-diagnostics`, and decodes token `wids` to identify
  whether the token has the Global Administrator or Cloud Application
  Administrator directory-role id. `node --check` passes. A short 301 probe
  timed out waiting for an interactive sign-in, so the next validation run needs
  Gio to complete sign-in in the visible Edge window.
- 2026-06-30 live route/admin probe result: Gio ran
  `projects/feeds/demo/run-lobster-route-admin-probe.ps1` against
  `prod-301eus` after interactive sign-in. The authenticated `/v1/route`
  response selected source `passport` and assigned Gio to cluster
  `prdil302cus`, geo `us`, category `firstrelease`, with public origin
  `https://lobster-cus.us-ia302.gateway.prod.island.powerapps.com`; the Redis
  assignment was stored until `2026-07-07T00:06:04Z`. Token claims were tenant
  `72f988bf-86f1-41af-91ab-2d7cd011db47`, user object id
  `d2f8c77b-c261-481f-9f38-0fe7b1c674d0`, UPN `giodl@microsoft.com`, and empty
  `wids`, so the token did not carry Global Administrator or Cloud Application
  Administrator. `/v1/me/web-feature-flags` returned
  `scout_feeds_ux_enabled=true` and `scout_feeds_admin_ux_enabled=false`.
  Conclusion: Gio is assigned to 302 CUS and is not recognized as an M365
  tenant admin by the current Lobster feed-admin gate. The
  `/v1/scout/feeds/source-diagnostics` probe returned 404, so the #3748
  diagnostics route had not reached the probed 301 origin yet.
- 2026-07-01 marketplace source wiring follow-up: created clean Lobster worktree
  `C:\src\lobster-feeds-public-gate` on branch
  `user/giodl/scout-feeds-public-gate`. Confirmed current `main` already gates
  the Skills-page feed discovery surface behind `scout_feeds_ux_enabled`; the
  live 301 appearance was because Gio's feature flags returned
  `scout_feeds_ux_enabled=true`, not because the surface was public/ungated.
  Added a regression unit test proving `SkillsPage` does not render or fetch
  feed discovery when `scoutFeedsUxEnabled` is absent. Wired deployment config
  for the first real source step: `values.yaml` now emits
  `LOBSTER_SCOUT_MARKETPLACE_FEED_MOS3_ENV` from
  `#scoutMarketplaceFeedMos3Env#`, with non-prod Test set to MOS3 `msit`,
  prod FirstRelease set to MOS3 `prod`, prod control-plane/default-disabled
  scopes left empty, and the devtest/preprod FRE overlay redeclaring the same
  token. This should turn marketplace search from `503 SCOUT_FEED_UNAVAILABLE`
  into live MOS3 Titles marketplace reads in Test and on 301/302 once merged
  and deployed. Personal
  install persistence remains a separate step: current runtime install still
  requires durable personal feed storage, and the target product direction is
  MOS3-backed personal storage rather than relying on Lobster-local files.
  Added CI config coverage in `scripts/test_release_monitoring_test.py` proving
  Test resolves to MOS3 `msit`, prod FirstRelease resolves to MOS3 `prod`, prod
  control-plane stays empty, and the FRE diagnostics overlay preserves `prod`.
  Opened draft PR https://microsoft.ghe.com/bic/lobster/pull/3878; amended head
  is `b6e9cadce`.
  Validation: `python scripts\check-token-collisions.py` passed; `python -m
  pytest scripts\fre301_prod_release_safety_test.py
  scripts\fre302_prod_release_safety_test.py scripts\check_token_collisions_test.py
  scripts\test_release_monitoring_test.py -q` passed (88 tests, 36 subtests);
  `git diff --check` passed. Frontend unit
  test execution was blocked in the fresh worktree because `npm ci` could not
  authenticate to the private npm feed, leaving `vitest` unresolved.
- 2026-07-02 live marketplace validation after #3878 merge: Confirmed Lobster
  #3748 merged at `2026-07-02T19:59:44Z` (`036053b00`) and #3878 merged at
  `2026-07-02T20:02:24Z` (`a96269cac`). Reran
  `projects/feeds/demo/record-lobster-live-feeds.mjs` against the registered
  prod 301 URL. Artifact:
  `C:\tmp\lobster-feeds-prod-301eus-live-2026-07-02T204636-805Z`. `/skills`
  rendered the normal-user feed discovery section, but
  `/v1/scout/feeds/marketplace.json` and `/approved.json` still returned typed
  `503 SCOUT_FEED_UNAVAILABLE`; the page text still says tenant-approved and
  marketplace skills are unavailable. This is expected from rollout timing:
  the latest observed successful main `Lobster-Runtime-PullRequest` run queued
  at `2026-07-02T20:00:07Z`, before #3878 merged, so it likely missed the
  marketplace MOS3 env change. Test validation used
  `https://lobster.us-ia002.gateway.test.island.powerapps.com/#/skills` with a
  separate Edge profile; artifact
  `C:\tmp\lobster-feeds-test-ia002-live-2026-07-02T135033-830Z`. Test did not
  render Skills/Feeds or call feed endpoints because the Microsoft tenant is
  waitlisted in that Test environment: feature-flag and ECS override calls
  returned `403 TENANT_NOT_ENROLLED`. Next validation should rerun prod after a
  main build/deploy that includes #3878, and rerun Test only with an enrolled
  Test tenant/user or an operator-approved waitlist bypass.
- 2026-07-02 prod marketplace validation success: Reran
  `projects/feeds/demo/record-lobster-live-feeds.mjs` against prod 301 after a
  later rollout window. Artifact:
  `C:\tmp\lobster-feeds-prod-301eus-live-2026-07-02T223541-407Z`.
  `/v1/scout/feeds/marketplace.json` now returns `200`, `feedId=mos3-root`,
  and `entryCount=103`; `/skills` renders marketplace search results with Add
  buttons, including `ask-about-vault`, `ask-harvey`,
  `ask-with-knowledge-source`, `billing-info-lookup`, `board-setup`,
  `bond-futures-basis`, `bond-relative-value`, and `box-ai-analysis`.
  `/v1/scout/feeds/approved.json` still returns typed
  `503 SCOUT_FEED_UNAVAILABLE`, so tenant-approved remains unconfigured, but
  marketplace feed search is now live in prod. Test remains blocked by
  `TENANT_NOT_ENROLLED` for the Microsoft tenant unless using an enrolled Test
  tenant/user.
- 2026-07-02 personal library UX fix opened as Lobster #3972
  (`https://microsoft.ghe.com/bic/lobster/pull/3972`, draft, head
  `user/giodl/scout-feeds-marketplace-add-ux`, commit `7a7226753`). The Skills
  feed UX now keeps marketplace/tenant-approved skills separate from the
  personal library, all under the existing `scout_feeds_ux_enabled` ECS flag.
  Marketplace/tenant-approved discovery installs those skills into the current
  workspace and does not publish them as personal skills. Once installed, the
  skill card can explicitly `Save to library`, publishing a personal-library
  copy through `publishPersonalSkill`; this is where MOS3 personal publish is
  used when configured. Installed workspace skill cards gain an ECS-gated
  `Save to library` menu action and `In library` pill after save. Create skill
  gains an ECS-gated `Save to my library` checkbox that publishes the new skill
  through `publishPersonalSkill` while still creating it locally.
  Tenant-approved feed load failures remain hidden when the marketplace feed is
  available, so prod's current `/approved.json` 503 does not show a
  user-facing warning while marketplace search works. Validation in
  `src/lobster_web`: `npm run test:unit -- tests/pages/SkillsPage.feeds.unit.test.tsx`
  (10 tests), `npm run type-check`, `npm run lint -- src/pages/SkillsPage.tsx
  tests/pages/SkillsPage.feeds.unit.test.tsx`, `npm run format:check --
  src/pages/SkillsPage.tsx tests/pages/SkillsPage.feeds.unit.test.tsx`, and
  `git diff --check`.
- 2026-07-03 Lobster #3972 requested-change follow-up: Galin's latest
  `CHANGES_REQUESTED` review at `2026-07-03T01:50:35Z` was against head
  `0765a4270` and found that the empty-description summary fallback still used
  raw `entry.source.registry`, allowing a newline-bearing registry to forge an
  extra managed `AGENTS.md` skill line. Pushed
  `0e848c4be3ef6591366ce1bd4288ba62c4c8ec67` (`fix(feeds): sanitize registry
  fallback`) on `user/giodl/scout-feeds-marketplace-add-ux`: `buildFeedSkill`
  now computes `sourceRegistry` first and uses the normalized value in the
  fallback summary, with a regression test covering an empty description and a
  registry containing a forged skill-line payload. Local validation in the
  Lobster worktree passed: `npm --prefix src/lobster_web run test:unit --
  tests/pages/SkillsPage.feeds.unit.test.tsx` (15 tests),
  `npm --prefix src/lobster_web run type-check`, targeted `lint`, targeted
  `format:check`, and `git diff --check`. Immediate live state:
  `reviewDecision=CHANGES_REQUESTED` because dspektor's old review is on
  `7a7226753` and Galin's review is on `0765a4270`; current PR head is
  `0e848c4b`. Checks attached on the new head: GitOps/FileAffordance passed,
  GitOps/GitHubPop failed, and Lobster-Runtime-PullRequest queued as ADO build
  `170796217`.
- 2026-07-03 Lobster #3972 second requested-change follow-up: Galin's
  `2026-07-03T02:14:04Z` review on `0e848c4b` found that normalized feed text
  could still include `skills/<id>/SKILL.md` substrings, which
  `parseAgentsFile`'s global `SKILL_REF_RE` pass would promote into phantom
  `activeSkillIds`. dspektor also commented that writing `AGENTS.md` before
  `SKILL.md` could leave an active-line orphan if the second write failed.
  Pushed `1b0cdfc02ac45b3b57ab364787cbe627ee6057df` (`fix(feeds): harden
  managed skill installs`) on `user/giodl/scout-feeds-marketplace-add-ux`.
  Feed-controlled text now breaks `skills/<id>/SKILL.md` path substrings before
  writing managed AGENTS summaries; tests assert `parseAgentsFile(...).activeSkillIds`
  excludes the forged id for both marketplace and approved registry fallbacks.
  `installFeedSkillInWorkspace` now writes `skills/<id>/SKILL.md` before
  `AGENTS.md`, and the partial-success test proves an AGENTS write failure
  leaves no AGENTS file while the skill file exists. Posted PR reply:
  `https://microsoft.ghe.com/bic/lobster/pull/3972#issuecomment-195214591`.
  Local validation passed: focused SkillsPage feeds unit test (16 tests),
  `npm --prefix src/lobster_web run type-check`, targeted `lint`, targeted
  `format:check`, and `git diff --check`. Immediate live state: PR head
  `1b0cdfc02`, worktree clean, review decision still `CHANGES_REQUESTED`
  pending reviewer refresh; only GitOps/FileAffordance was attached/passed
  immediately after push.
- 2026-07-03 Lobster #3972 CI failure triage: PullRequest ADO build
  `170798916` failed only in the Rust MITM canary job
  `Runtime E2E Tests Rust MITM canary: build images, run E2E tests (rust front-end)`.
  The failing test was unrelated to the web/feeds diff:
  `code_mode_office_chat_generates_docx_and_pdf_e2e::e2e::llm::test` panicked
  because the chat turn streamed "DOCX is correct..." but never reached an
  `agent/lifecycle/end` or chat-final terminator before the stream timeout.
  Other runtime shards passed, Web Static Checks passed, Web Unit Tests passed,
  Web E2E passed, GitOps/FileAffordance passed, and GitOps/GitHubPop passed.
  Requeued required ADO on the current head `1b0cdfc02`: PullRequest build
  `170807763` and Build Validation build `170807762`; both were visible on the
  PR as pending/notStarted immediately after queueing.
- 2026-07-03 Lobster #3972 merged: live PR state confirms
  `https://microsoft.ghe.com/bic/lobster/pull/3972` merged at
  `2026-07-03T13:52:41Z` with merge commit
  `6b452f94209407b97881c7481734a44810eb2506`. Final head was
  `1b0cdfc02ac45b3b57ab364787cbe627ee6057df`, review decision `APPROVED`, and
  all required checks passed, including GitOps/FileAffordance, GitOps/GitHubPop,
  GitOps/OwnershipEnforcer, Lobster-Runtime-PullRequest, and
  Lobster-Runtime-Build-Validation. The requeued PullRequest run
  `170807763` passed the runtime E2E shards and Rust MITM canary; Build
  Validation `170807762` also completed green.
- 2026-07-03 followable feeds direction: Decided the next product direction
  should not share a user's mutable personal feed directly. The safer viral
  abstraction is followable feeds: user-created named feeds, source feeds such
  as ClawHub or partner catalogs, and tenant-approved feeds can all be followed
  into the user's personal effective feed with explicit provenance and trust
  labels. Personal feeds remain private working/install state. Following
  ClawHub or another source feed does not imply tenant approval; entries must
  remain labeled by source and subject to tenant policy. Updated
  `projects/feeds/user-shared-named-feeds-plan.md` and the feeds README so PR 1
  starts with followable feed identity/follow records and MOS3 contract
  validation, before sharing UI.
- 2026-07-03 followable feed storage decision: Named feeds should be MOS3-owned,
  not a permanent Lobster-only store. Target storage is a MOS3 title or
  collection-like object for feed metadata, immutable MOS3 package/artifact/feed
  document revisions for published feed versions, and MOS3 per-user
  include/acquisition-like follow records if available. ACL should reuse the
  Aether-observed MOS3 title ACL shape: `ForAllUsers=false` plus no entities for
  private, `ForAllUsers=false` plus user/group `Entities` for shared feeds, and
  `ForAllUsers=true` for tenant-visible. Tenant-visible remains distinct from
  tenant-approved; tenant approval points at a selected revision or entries. If
  MOS3 lacks a primitive, Lobster can bridge temporarily with MOS3-compatible
  ids, ACL fields, revisions, and audit fields. Updated
  `projects/feeds/user-shared-named-feeds-plan.md`.
- 2026-07-03 followable feed foundation started: Created clean Lobster worktree
  `C:\src\lobster-feeds-followable-foundation`, branch
  `user/giodl/scout-feeds-followable-foundation`, from current `origin/main` at
  #3972 merge commit `6b452f942`. Opened draft Lobster PR
  `https://microsoft.ghe.com/bic/lobster/pull/3989` at head
  `5cc5ead8252e0df9486cc88a79779c704adfbed6`. Added the first runtime contract slice in
  `src/lobster_runtime/src/scout_feeds.rs`: `FollowableFeed`,
  `FollowableFeedKind`, `FollowableFeedSource`, `FollowedFeed`,
  `FollowedFeedRevision`, `FeedTrustLabel`, `Mos3FeedAcl`,
  `Mos3FeedAclEntity`, and `FeedVisibility`. The contract keeps signed
  `FeedDocument` revisions separate from stable followable feed identity,
  supports latest or pinned follows, preserves provenance/trust labels, and
  serializes the Aether-observed MOS3 title ACL shape with `ForAllUsers` and
  `Entities`. Updated `docs/reference/scout-catalog-feeds.md` to make MOS3 the
  named-feed identity/ACL/revision/follow/search target, with Lobster bridges
  only as migration-compatible fallback state. Validation in the Lobster
  worktree: `just rust-auth`, `just rust-fmt`, `just rust-fmt-check`,
  focused `cargo.sh test scout_feeds --lib --no-fail-fast` via the repo wrapper
  (21 passed), `just rust-clippy`, and `git diff --check`. Required ADO queued:
  PullRequest `170845063` and Build Validation `170845061`. Immediate PR state:
  draft, review-required, GitOps/FileAffordance passed, GitOps/GitHubPop failed
  for proof-of-presence, and both required ADO contexts are attached/in
  progress.
- 2026-07-03 #3989 expanded beyond contract-only: Amended Lobster PR #3989 to
  head `cd20ecbdf3171c6cde4a0df2057737d5db493af6`. The PR now includes actual
  gated implementation: `GET /v1/scout/feeds/followable`,
  `POST /v1/scout/feeds/followable/follow`, server-side
  `scout_feeds_ux_enabled` authorization for both normal-user follow routes,
  `LOBSTER_SCOUT_FOLLOWABLE_FEED_DIR` as the MOS3-compatible followable
  metadata bridge, `LOBSTER_SCOUT_FOLLOWED_FEED_DIR` as the per-user follow
  record bridge, source diagnostics for followable/followed stores, synthesized
  followable source identities for configured MOS3 marketplace and
  tenant-approved feeds, web API types/methods, and reference docs. Validation:
  `just rust-fmt`, `just rust-fmt-check`, focused `scout_feed` runtime tests
  via `cargo.sh` (153 passed), `just rust-clippy`, and `git diff --check`.
  Attempted web service unit test, but local fresh-worktree web deps are blocked
  by private npm `E401` during `just web-install`; documented this in the PR
  body. Requeued required ADO on the amended head: PullRequest `170847047` and
  Build Validation `170847046`.

## Resume Checklist

- Run: query current OpenClaw trust PRs RFC #25, #98299, #98316, #98338, and
  #98350 first. The older #87824-#87827/#88732 stack is historical unless the
  user explicitly asks about legacy feed discovery/lifecycle/search work.
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

- 2026-07-06 OpenClaw trusted-feeds key-management alignment: updated RFC #25
  and the trust implementation stack to follow OpenClaw's platform-signing
  model without reusing platform signing identities as feed keys. RFC branch
  `codex/hosted-feed-trust-addendum` now has `f6dd24e` clarifying that
  source-profile config stores non-secret publisher public keys, while publisher
  private signing keys are external publisher-side secret material with later
  rotation/revocation work. OpenClaw #98316 head `e6ca6c3c90` renames the
  config/help/schema surface to trusted publisher public keys; #98338 head
  `5478a2d43f` and #98350 head `8ba37ef8de` carry the same clarification
  up-stack. Lightweight validation only: `git diff --check` on the three
  OpenClaw branches and the RFC branch; no manual CI queueing.
- 2026-07-06 OpenClaw trusted-feeds Codex review: ran `codex review`
  incrementally over RFC #25 and OpenClaw #98299/#98316/#98338/#98350.
  Accepted and fixed two findings: #98316 now preserves the public
  `MarketplaceFeedSigningKeyConfig` alias as deprecated compatibility while
  exposing `MarketplaceFeedTrustedPublicKeyConfig`, and the interim signed-feed
  config path now throws a hard failure instead of returning a successful-looking
  empty bundled fallback before #98338 wires verifier enforcement. Carried the
  alias fix up-stack to #98338 and #98350. Final pushed heads: #98316
  `928115a2ce`, #98338 `c44c8aaf68`, #98350 `e2489e98ce`; #98299 remained
  `8742cc6515`; RFC #25 remained `f6dd24e`. Review reruns were clean for
  #98299/#98316/#98338/#98350/RFC #25. Lightweight validation only:
  `git diff --check`; focused Vitest was not run because this checkout lacks
  `node_modules`/Vitest.
- 2026-07-06 Lobster named-feeds review-fix pass: addressed current requested
  changes across the feeds stack and restacked/pushed all heads. #4044
  `user/giodl/scout-feeds-followable-foundation-refresh` now head `86408c0a`
  and tightens MOS3 named-feed discovery diagnostics/docs so MOS3 title IDs
  require signed bridge docs in `LOBSTER_SCOUT_FOLLOWABLE_FEED_DIR`; validation
  passed `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
  focused `source_diagnostics_reports_mos3_and_hybrid_sources_when_configured`,
  and `git diff --check`. #3990
  `user/giodl/scout-feeds-followable-skills-ux` now head `3cd346b0` and fixes
  Skills discovery to preserve approved+marketplace hard errors, warn on
  tenant-approved failures, save approved/marketplace installs through the
  personal library routes before local workspace install, and correct the
  followable docs wording; validation passed
  `npm run test:unit -- --run tests/pages/SkillsPage.feeds.unit.test.tsx`
  (20 passed), web `format:check`, and `git diff --check`. Restacked #3991
  head `6ce2c913`, #3995 head `acc3f0fd`, #3996 head `468bbac3`, and #3997
  head `ef3f423a`; #3997 also fixes the stale
  `followable_feed_acl_allows_caller` call to use
  `followable_feed_is_visible_to_caller`, with runtime fmt, stale-symbol grep,
  and `git diff --check` clean. Live immediately after push: review decisions
  still show prior requested-change state for #3990/#3991/#3995/#3997, but
  those reviews are on old commits and need re-review; GitHubPop remains red
  and required checks were not yet green.
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
- 2026-07-07 OpenClaw trust #98299 DSSE alignment: after Patrick clarified
  DSSE was preferred but not originally blocking, updated
  `feeds-trust-envelope-verifier` to use DSSE v1 pre-authentication encoding
  instead of the custom OpenClaw dot-joined signing input. Also added
  pre-crypto signature-list bounds: duplicate key IDs and more than 16
  signatures now make the envelope invalid before Ed25519 verification. Pushed
  `39d2e579a6` to `giodl73-repo:feeds-trust-envelope-verifier` and commented
  validation on #98299. Local validation in a hydrated clone passed:
  `node scripts\run-vitest.mjs src\plugins\official-external-plugin-catalog-envelope.test.ts src\infra\device-identity.test.ts`
  (19 tests), targeted `oxfmt --check`, and `pnpm tsgo:core:test`. GitHub
  checks started and were still pending at last check.
- 2026-07-07 OpenClaw trust stack restack after DSSE verifier: rebased and
  force-with-lease pushed the upper trust PR branches on top of #98299
  `39d2e579a6`. New heads: #98316 `756be49f58`
  (`feeds-trust-source-profiles`), #98338 `044ec0ca2c`
  (`feeds-trust-refresh-state`), and #98350 `f71871f58a`
  (`feeds-trust-cli-visibility`). Rebases were clean; #98350 dropped
  Patrick's `f3e0e61922` CI-repair commit as already present in the new
  refresh-state base. Live after push: all four PRs still show
  `reviewDecision=APPROVED`; #98299 had Telegram QA smoke failures/cancels to
  inspect, while #98316/#98338/#98350 had fresh CI running or queued.
- 2026-07-07 signed ClawHub feed bridge authored: opened draft ClawHub PR
  `https://github.com/openclaw/clawhub/pull/3005` on branch
  `user/giodl/clawhub-signed-openclaw-feed` at `685c963c`, based on the newer
  ClawHub feed-lanes branch. It adds `/v1/feeds/plugins`, emits the
  OpenClaw-compatible schema v2 plugin feed, and signs it with DSSE/Ed25519
  from `CLAWHUB_FEED_SIGNING_KEY_ID` and `CLAWHUB_FEED_SIGNING_PRIVATE_KEY`.
  Validation passed focused `bun run test -- --run
  convex/httpApiV1.handlers.test.ts --testNamePattern "feed handlers"` and
  `git diff --check`; branch oxlint currently fails before linting with
  `Rule 'no-underscore-dangle' not found in plugin 'eslint'`.
- 2026-07-07 OpenClaw default ClawHub trust follow-up authored: opened draft
  OpenClaw PR `https://github.com/openclaw/openclaw/pull/101981` on branch
  `feeds-trust-clawhub-default-profile` at `802d9ab9`, stacked on #98350. It
  lets the built-in `clawhub-public` profile verify signed feeds when
  `OPENCLAW_CLAWHUB_FEED_TRUSTED_KEY_ID` and
  `OPENCLAW_CLAWHUB_FEED_TRUSTED_PUBLIC_KEY` are set, fails closed if only one
  is set, and documents the ClawHub private signing key / OpenClaw public
  verification key split. Validation passed focused hosted-catalog/envelope
  Vitest, targeted `oxfmt --check`, `pnpm tsgo:core:test`, and `git diff
  --check`. Local fresh OpenClaw worktree
  `C:\src\openclaw-trust-clawhub-default-profile` still has generated
  `packages/speech-core/node_modules` link dirt from `pnpm install`; it was
  not staged or committed.
