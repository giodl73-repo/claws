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
- Current focus: ClawHub account-feed draft PRs #2948, #2949, #2950, #2951,
  #2953, #2957, #2958, and #2959 are code-backed implementation drafts, not
  just specs. #2957 is the first next-stack PR and remains stacked after #2950;
  #2958 is the second next-stack PR and remains stacked after #2957; #2959 is
  the public feed/profile surface PR stacked after #2958. #2950 is at
  `9b8f03d538af7414889d0c820f2d15f1a17d1135`, #2951 is at
  `c2425b3f24d0fb15c749c36a2916ae3954fd7a63`, #2953 is at
  `f23dd647af2768f0875291d43c32fc1ef2be1131`, #2957 is at
  `1e0c5615a35145d6fea1f53ea5a4122d36bbf9b4`, #2958 is at
  `404620ec5597570ae501554daff562629fdfa37b`, and #2959 is at
  `5f6d5aaa92b2185199b7a21b9d397945da0af428`. #2950/#2951/#2953 have green
  GitHub Actions after CI repairs; #2957 and #2958 CI/ClawSweeper dispatches
  are in progress; #2959 is newly opened and still waiting on checks. Vercel
  fails for expected fork authorization. They remain draft and should not be
  merged or marked ready without explicit user approval. RFC #25 includes the
  next ClawHub implementation stack at `26f4f346944179900cb129ff3b09dd93818a9aa5`.
  The OpenClaw trust stack is now non-draft/open and restacked in order:
  #98299 at `297003b252`, #98316 at `09734e867b`, #98338 at `231292f3ce`,
  and #98350 at `1a0102e1ea`. #98299 fixed the DSSE decoded-payload-byte
  verifier blocker and #98316/#98338/#98350 were rebased on top with PR bodies
  and re-review requests refreshed. #98299 and #98316 have exact-head
  ClawSweeper platinum/ready reviews, Patrick approval, proof sufficient, and
  no pending or non-cancelled failing checks. #98338 and #98350 have green
  labels/checks on the new heads but their durable ClawSweeper comments were
  still from older heads at last check; wait for exact-head ClawSweeper refresh
  before calling them merge-ready. Do not merge without explicit user approval.
- 2026-07-03 opened ClawHub draft PR #2957,
  https://github.com/openclaw/clawhub/pull/2957, from
  `giodl73-repo:follow-controls-discovery` with the PR #6 implementation slice.
  Scope: profile follow/unfollow controls with anonymous sign-in gating,
  followed-publisher discovery on the Creators page, paginated/searchable follow
  listing APIs, bounded sparse query scans, malformed cursor HTTP 400 handling,
  and focused route/API tests. Boundary remains discovery/notification only:
  following does not mark anything official, reviewed, trusted, or installable.
  Validation passed `git diff --check prhead/follow-graph-notifications...HEAD`,
  targeted `npx oxfmt --check`, and `codex review --base
  prhead/follow-graph-notifications` with no actionable regressions. Focused
  Vitest still cannot start locally because `vitest/config` / package `vitest`
  is absent in this checkout. PR targets `main` while stacked on #2950 because
  the dependency branch is on the fork; GitHub currently reports the merge state
  as dirty for that expected stack reason.
- 2026-07-03 opened ClawHub draft PR #2958,
  https://github.com/openclaw/clawhub/pull/2958, from
  `giodl73-repo:follow-notification-delivery` with the PR #7 implementation
  slice. Scope: durable in-app publisher follow notification rows, authenticated
  list/mark-read functions, bounded/deduped fanout from public skill and public
  plugin package publishes, muted-follow and self-publish suppression, capped
  fanout audit history, and focused notification tests. Boundary remains
  infrastructure only: no email/webhook delivery, no install CTA, and no
  official/reviewed/trusted/installable signal. Validation passed
  `git diff --check prhead/follow-controls-discovery...HEAD`, targeted
  `npx oxfmt --check`, and final `codex review --uncommitted` after fixing
  accepted fanout and visibility findings. Focused Vitest still cannot start
  locally because `vitest/config` / package `vitest` is absent in this checkout.
  PR targets `main` while stacked on #2957 because dependency branches are on
  the fork; GitHub reports `mergeStateStatus: DIRTY` for that expected stack
  reason, and auto-response/dispatch checks were in progress at open.
- 2026-07-03 local ClawHub PR #6-#10 specs: added local-only design briefs under
  `projects/feeds/clawhub-account-feeds/` and indexed them in that folder's
  README. No GitHub PRs were opened and no ClawHub implementation branches were
  changed. The five follow-up briefs are `follow-controls-discovery.md`,
  `follow-notification-delivery.md`, `public-feed-profile-pages.md`,
  `registry-submission-workflow.md`, and `reflected-registry-scan-state.md`.
  They match RFC #25's next ClawHub implementation stack and preserve the
  boundaries that follow, profile, notification, registry-submission, and
  reflected-state surfaces do not grant install authority by themselves. Scoped
  checks: no Microsoft/MOS3/tenant wording in the design pack and
  `git diff --check -- projects/feeds/clawhub-account-feeds` passed.
- 2026-07-03 local ClawHub PR #6-#10 role review: reviewed the five local
  briefs against `.craft/roles/claws` lenses for founder/community,
  skill-author/new-hire, CISO/compliance, platform/operator, policy steward,
  power user, UX, and gateway/runtime. Patched the briefs with role-driven
  acceptance criteria: private follow-list default, accessible follow and state
  controls, visible discovery reasons, reversible notification preferences,
  dead-letter/repair paths, author-actionable submission failures, stable
  idempotency/evidence references, reflected-state conflict handling, retention
  expectations, and stale/conflicting state repair paths. Scoped
  `git diff --check -- projects/feeds/clawhub-account-feeds` passed and the
  pack still has no Microsoft/MOS3/tenant wording.
- 2026-07-03 local ClawHub PR #6-#10 spec tightening: simplified the five
  follow-up briefs so they read as practical PR specs instead of role-review
  checklists. Renamed role-review sections to acceptance criteria, removed
  over-specific speculative controls, trimmed extra workflow states, and kept
  the core boundaries: following, notifications, public pages, registry
  submission, and reflected state do not grant install authority. Scoped
  `git diff --check -- projects/feeds/clawhub-account-feeds` passed; the pack
  remains free of Microsoft/MOS3/tenant wording.
- 2026-07-03 RFC #25 next ClawHub stack update: continued in
  `C:\src\openclaw-rfcs-snapshot` on branch
  `codex/hosted-feed-trust-addendum` and pushed commit
  `26f4f346944179900cb129ff3b09dd93818a9aa5` to draft RFC PR
  https://github.com/openclaw/rfcs/pull/25. The addendum now spells out the
  next ClawHub implementation stack after the current foundation drafts:
  follow controls and followed-publisher discovery, follow notification
  delivery, public feed/profile pages, registry submission workflow, and
  reflected registry/scan state. The text preserves the trust boundary that
  these surfaces do not grant install authority by themselves. A role-lens pass
  tightened the roadmap around user explainability, mute/unsubscribe controls,
  idempotent registry submission, and reflected status history. Validation
  passed `git diff --check` with the existing LF-to-CRLF warning, conflict
  marker scan, en/em dash scan, and `codex review --uncommitted` with no
  actionable RFC-roadmap issue. PR body updated; live #25 is draft/open and
  clean; checks had not reported yet after the amended force-push.
- 2026-07-03 RFC #25 implementation-status update: amended
  `rfcs/0009-hosted-feeds-for-plugins-and-skills.md` to record the landed
  ClawHub PR stack behind #2948-#2959. The RFC now names the code-backed slices
  for account-feed model/API, claim and official-state facts, follow graph API,
  profile and discovery surfaces, registry/scan bridge, follow controls,
  follow notifications, and public feed/profile routes, while keeping follow
  and discovery separate from official status, registry inclusion, install
  eligibility, and security-scan bypass. `git diff --check` stayed clean apart
  from the repo's existing LF-to-CRLF warning on that RFC file.
- 2026-07-03 ClawHub #2950/#2951/#2953 implementation and CI closeout:
  continued in `C:\src\clawhub` and converted the remaining three ClawHub
  feed-track drafts from specs-only to code-backed PRs. #2950
  `follow-graph-notifications` now implements publisher follow rows, follow /
  unfollow / list Convex functions, API-token HTTP handlers at
  `/api/v1/publisher-follows`, route constants, retention policy, generated API
  typing, audit events, and focused tests. Latest head
  `9b8f03d538af7414889d0c820f2d15f1a17d1135` fixed the live CI TS18047 errors
  by explicitly null-checking active publisher reads before audit/list
  serialization. #2951 `profile-discovery-surfaces` now implements the first
  publisher-profile/discovery presentation slice: official wording on the
  creator filter/title tag, profile state labels for facts present on the
  existing publisher payload, CSS, and route tests proving it does not imply
  missing review/scan/follow/local-approval states. Latest head
  `c2425b3f24d0fb15c749c36a2916ae3954fd7a63` fixed live CI by typing the
  profile test fixture as `PublicPublisherListItem` and using a branded
  publisher id. #2953 `registry-scan-bridge` now implements a
  `clawhub-schema` OpenClaw registry export helper plus dist output and tests
  for explicit ClawHub feed facts, selected candidate validation, entry state,
  retry idempotency, and GitHub provenance canonicalization. Latest head
  `f23dd647af2768f0875291d43c32fc1ef2be1131` passed without further repair.
  Validation passed targeted `oxfmt --check`, `git diff --check`,
  `git diff --cached --check`, node/dist checks and import smoke where
  applicable, final `codex review --uncommitted` passes for each local fix, and
  live GitHub Actions `pr-gates`, static, unit, packages, types-build,
  e2e-http, Playwright, secret scan, and auto-response are green for #2950,
  #2951, and #2953. Local focused Vitest commands still cannot start in this
  Windows checkout because local dependencies are absent and
  `vitest.config.ts` imports `vitest/config`; Bun/`bunx` is also unavailable.
  `@clawsweeper re-review` was requested on the final #2950 and #2951 heads
  and was already requested on #2953.
- 2026-07-02 ClawHub #2948/#2949 CI repair pass: fixed the two real ClawHub
  feed-track CI blockers in `C:\src\clawhub`. #2948 now has head
  `9446b053ca10c38cf345dd620786e2aa59152dc9`; the fix keeps the
  `continues past filtered package rows` test on one package query instance so
  the mock cursor advances past the filtered private row to the older public
  row. #2949 now has head `addff1f13ab6857a3d457ae38d0565ca754ad614`; the fix
  uses a non-shadowing `testId` helper for branded Convex `Id<...>` values in
  `convex/lib/publisherState.test.ts`. Validation passed `git diff --check`
  plus targeted `oxfmt --check` for both touched test files. Local Vitest/tsc
  could not run because this Windows checkout still lacks `bun`, `node_modules`,
  and local test/typecheck binaries; CI proof covered the exact gates. Live
  GitHub Actions after push: #2948 and #2949 pass `pr-gates`, static, unit,
  packages, types-build, e2e-http, Playwright, secret scan, and auto-response;
  only Vercel fails for expected fork authorization. `@clawsweeper re-review`
  was requested on both exact heads. Follow-up on #2951: reran the stale failed
  `playwright-local-auth / account-cleanup` shard without changing the branch;
  the rerun passed, so all five ClawHub feed-track draft PRs (#2948, #2949,
  #2950, #2951, #2953) now have green GitHub Actions and only the expected
  Vercel fork authorization failure.
- 2026-07-02 ClawHub feed-track current-head Codex review check: reran
  `codex review --base origin/main` in `C:\src\clawhub` for the two branches
  whose heads changed after earlier reviews. #2949 at
  `addff1f13ab6857a3d457ae38d0565ca754ad614` reported no discrete introduced
  correctness, security, or maintainability issues; #2948 at
  `9446b053ca10c38cf345dd620786e2aa59152dc9` reported no discrete actionable
  regressions. The docs-only PRs #2950, #2951, and #2953 remain on the same
  heads that already had clean Codex review coverage.
- 2026-07-02 ClawHub #2948 implementation update: continued in
  `C:\src\clawhub` on branch `account-feed-model-api` and pushed amended head
  `03092f189de2612cfa4eb682bbd666132d88082f` to draft PR
  https://github.com/openclaw/clawhub/pull/2948. The PR now implements the
  first account/publisher feed API slice in the same PR: `clawhub-schema`
  account-feed contract, Convex internal feed projections, HTTP GET routes for
  account/publisher detail and feed endpoints, OpenAPI docs, generated schema
  dist files, focused route/projection/schema tests, and the account-feed spec.
  Review-triggered fixes removed client cursor entry trust, filtered skill
  package rows from plugin entries, bounded source scanning, normalized IDs
  before table reads, removed double decoding of already-decoded route path
  segments with a `%25` regression test, and mapped malformed percent-encoded
  account/publisher route paths to normal 404 responses. Validation passed
  `git diff --check`, `git diff --cached --check`, targeted `oxfmt --check`,
  OpenAPI JSON parse, `node --check packages/schema/dist/accountFeed.js`, and
  final `codex review --base origin/main` with no actionable findings. Local
  Vitest/tsc/Convex runtime proof was not run because this Windows shell lacks
  `bun`, `node_modules`, and local `vitest`/`tsc`/`convex` binaries. PR remains
  draft; do not merge. Live CI at last check: head `03092f18`, Vercel failing
  only for expected fork authorization, several GitHub Actions checks still in
  progress, ClawSweeper re-review requested and command-router acknowledged.
- 2026-07-02 ClawHub #2949 implementation update: continued in
  `C:\src\clawhub` on branch `claim-official-state` and pushed amended head
  `dab68ea64ed5ff5e8940fb743d54682fff1391ea` to draft PR
  https://github.com/openclaw/clawhub/pull/2949. The PR is no longer docs-only:
  it keeps `specs/claim-official-state.md`, adds derived publisher state facts
  (`claimState`, `officialState`, `restrictionState`) for the existing admin
  official-publisher list path, adds prior/new official-state metadata to
  official add/remove audit logs, preserves legacy personal-publisher claimed
  state through owner membership rows when `linkedUserId` is absent, and extends
  the admin client schema to accept the optional state object while remaining
  compatible with older server responses. Scope intentionally does not add
  self-service claim approval,
  verified-state grants, follow state, profile UX, account-feed status fields,
  OpenClaw registry review, scan authority, install authority, or feed signing.
  Validation passed `git diff --check`, `git diff --cached --check`, targeted
  `oxfmt --check`, scoped banned-term scan, and final
  `codex review --base origin/main` with no actionable findings after the
  legacy personal-publisher claim-state fix. Local
  Vitest/tsc/Convex runtime proof was not run because this Windows shell lacks
  `bun`, `node_modules`, and local `vitest`/`tsc`/`convex` binaries. PR remains
  draft; do not merge. Live CI at last check: head `dab68ea6`, Vercel failing
  only for expected fork authorization, GitHub Actions running, ClawSweeper
  re-review requested and command-router acknowledged.
- 2026-07-02 ClawHub #2949 follow-up Codex review: reran
  `codex review --base origin/main` after fetching `origin/main`. The first
  completed review found one accepted P2: `claimState` could still report
  `claimed` when a personal publisher's linked user, or an org/member row's
  user, was deleted/deactivated. Fixed locally in `C:\src\clawhub` by checking
  active linked users and active membership users, preserving legacy personal
  publishers through active owner rows only, and adding focused regression
  tests in `convex/lib/publisherState.test.ts`. A second requested review found
  one accepted P2 in that local fix: it used an unbounded membership
  `.collect()` on the official-publisher list path. Fixed locally by switching
  claim derivation to bounded `by_publisher_and_role` role-bucket reads
  (`owner` for legacy personal publishers; `owner`, `admin`, `publisher` for
  orgs) with conservative claimed behavior when a role bucket hits the scan
  cap. Validation passed targeted `oxfmt --check`, `git diff --check`, and the
  final `codex review --base origin/main` with no actionable findings. This
  fix has now been amended into PR #2949 and force-pushed with lease as head
  `02f37d05b0e853c99e738e0ee9f579465627a3b0`. The PR body was updated with
  the active-user and bounded lookup review follow-ups, and
  `@clawsweeper re-review` was posted at
  https://github.com/openclaw/clawhub/pull/2949#issuecomment-4870140014.
  Latest live state after push: PR remains draft; GitHub Actions are running;
  Vercel is failing for expected fork authorization; ClawSweeper command-router
  acknowledged the re-review request.
- 2026-07-02 ClawHub #2949 CI repair: live CI on head
  `02f37d05b0e853c99e738e0ee9f579465627a3b0` failed `pr-gates` because
  `convex/lib/publisherState.test.ts` mocked Convex query builders with
  non-chainable `q.eq`, while the production helper now uses
  `q.eq("publisherId", ...).eq("role", ...)`. Fixed the test fixture locally,
  passed `git diff --check` and targeted `oxfmt --check`, amended the PR commit,
  and force-pushed with lease to head
  `8397af9c80d542d32a1afc1a01c4a67ac3f29cc4`. Posted
  `@clawsweeper re-review` at
  https://github.com/openclaw/clawhub/pull/2949#issuecomment-4870332128.
  Latest live state after push: PR remains draft; CI restarted and is queued or
  in progress; Vercel is failing for expected fork authorization; ClawSweeper
  command-router acknowledged the re-review request.
- 2026-06-28 RFC trust addendum opened: filed draft RFC PR
  https://github.com/openclaw/rfcs/pull/25 from
  `giodl73-repo:codex/hosted-feed-trust-addendum`. The addendum updates
  `rfcs/0009-hosted-feeds-for-plugins-and-skills.md` with the next five-PR
  trust verification series: RFC addendum, envelope/verifier primitives,
  source-profile trust config, marketplace refresh trust state, and
  CLI/operator visibility. Before writing it, checked current OpenClaw
  patterns on `openclaw/openclaw@origin/main`: trust is local/derived,
  `marketplaces.feeds.*.verification` is currently unsigned-only,
  persisted hosted snapshots store cache/checksum/validators only, feed
  install candidates already require configured `sourceRef` plus
  `state: available` and `publisher.trust: official`, and ClawHub install/update
  paths keep release trust and artifact integrity verification with the package
  source. Validation passed `git diff --check` plus an en/em dash scan.
- 2026-06-29 RFC #25 account-feed update: amended the draft RFC PR to head
  `ef8d4973679cffcd58c8c4c0b8fb379fb69310d8` and updated the PR body. Added
  `ClawHub account feeds and following` to RFC 0009: ClawHub can publish
  account-backed feeds tied to stable ClawHub account / publisher ids;
  OpenClaw can trust those feeds as ClawHub-authored after feed verification;
  following an account is discovery/notification/search-filter signal only and
  does not imply official status, OpenClaw registry inclusion, install
  eligibility, local approval, or scan bypass. The section also separates feed
  source trust, publisher identity, official status, downstream registry
  inclusion, and install/security trust. Validation passed `git diff --check`
  and en/em dash scan; same Windows CRLF warning as before.
- 2026-06-29 RFC #24 merged / #25 rebased: after the user decided the
  telemetry addendum should land first, posted maintainer acceptance/proof on
  #24 (https://github.com/openclaw/rfcs/pull/24#issuecomment-4837913782),
  squash-merged #24 at `a8844eb53a2bb75465a8dc6115652f552f5a8389`, fetched
  `origin/main`, and rebased #25 onto it. Resolved the RFC 0009 conflict by
  keeping both the feed telemetry/observability addendum and the trust plus
  ClawHub account-feed addendum, with rollout items renumbered 1-14. Force
  pushed #25 to `b234386e982a51f7ddd770f565206cfe09d55c79`, updated the PR
  body with the merge-order note, and verified #25 is open, draft, mergeable,
  and clean on GitHub. Validation passed
  `git diff --check origin/main...HEAD -- rfcs/0009-hosted-feeds-for-plugins-and-skills.md`,
  conflict-marker scan, and en/em dash scan.
- 2026-06-29 RFC #25 user-feed roadmap update: amended the draft RFC PR to
  `d125eda808a89c40c86754eff91709707b9b3139` to spell out the next user-feed
  stages as two tracks. The ClawHub product track owns the account/publisher
  feed model, claim flow, follow graph, notifications, profile surfaces, and
  search filters such as "people I follow"; the OpenClaw trust/runtime track
  owns verified ClawHub-authored feed envelopes, source-profile trust state,
  bounded CLI/diagnostics visibility, and discovery consumption of verified
  account-feed state. The RFC keeps install authority, official status,
  OpenClaw registry inclusion, local approval, scans, and package artifact
  verification as separate gates for later PRs. PR body updated; validation
  passed `git diff --check`, conflict-marker scan, and en/em dash scan.
- 2026-06-29 RFC #25 stack split update: amended the draft RFC PR to
  `810b553c297149e8b3d09fc3111c182ca345567c` with PR-sized slices in each
  track. ClawHub product stack: account-feed model/API, claim and official-state
  flow, follow graph and notifications, profile/discovery surfaces, and
  registry/scan bridge. OpenClaw trust/runtime stack: feed envelope verifier,
  source-profile trust config, refresh/snapshot trust state, CLI/operator
  visibility, and discovery consumption after verified account-feed state
  exists. PR body updated; validation passed `git diff --check`,
  conflict-marker scan, and en/em dash scan.
- 2026-06-29 RFC #25 joint phase update: amended the draft RFC PR to
  `c87a1005e5a643fd865606ab9dc8808a24a09978` to add a third, joint ecosystem
  phase after the ClawHub product and OpenClaw trust/runtime stacks. The phase
  covers install and policy integration, security/scanning maturity, ranking
  and recommendations, enterprise composition, regional and partner mirrors,
  publishing workflow, admin/audit surfaces, and compatibility hardening. PR
  body updated; validation passed `git diff --check`, conflict-marker scan,
  and en/em dash scan.
- 2026-06-29 RFC #25 role-review guardrails: reviewed the roadmap against
  relevant `.craft/roles/claws` lenses: founder, skill-author, new-hire, ciso,
  compliance, policy-steward, platform-eng, power-user, gateway-eng,
  cowork-ux-eng, and m365-connector-eng. Amended the draft RFC PR to
  `96cc9648bebef164cfe68a844d523e52cc6f05c8` with stakeholder guardrails:
  community simplicity/removability, author DX, first-time user clarity,
  security/compliance provenance, coherent policy modeling, fleet/operator
  visibility, and stable runtime/connector enforcement paths. PR body updated;
  validation passed `git diff --check`, conflict-marker scan, and en/em dash
  scan.
- 2026-06-29 RFC #25 template-shape cleanup: after user noted that internal
  review process should not be injected unless the RFC template expects it,
  checked `rfcs/0000-template.md` and repo README authoring notes. Removed the
  explicit stakeholder/role-review guardrails block from RFC 0009 and cleaned
  the PR body back to template-relevant summary, roadmap, notes, and validation.
  Current draft PR head is `926ee828a05c1a8cec10ec9d730180cc86a9642c`.
  Validation passed `git diff --check`, no role/guardrail terms remain in the
  RFC text, and conflict-marker plus en/em dash scans are clean.
- 2026-06-30 RFC #25 ClawSweeper follow-up: fixed ClawSweeper's diagnostics
  wording concern by narrowing the operator diagnostics bullet to exclude raw
  feed URLs, credentials, query strings, signing material, and unbounded
  identity values while preserving bounded feed ids, configured source profile
  names, checksum references, entry ids, package source types, policy states,
  and outcome categories when diagnostics are enabled. Amended and force-pushed
  draft PR #25 to `8367099ad038b079a3741dee153e31c2bf8e02aa`, updated the PR
  body with copied current-head validation output, and posted maintainer
  follow-up / `@clawsweeper re-review` at
  https://github.com/openclaw/rfcs/pull/25#issuecomment-4843915393. GitHub
  reports #25 open, draft, clean, and mergeable; ClawSweeper acknowledged the
  re-review request.
- 2026-06-30 OpenClaw trust PR #1 opened: created
  `C:\src\openclaw-feeds-trust-envelope` from fresh `origin/main` and opened
  draft PR https://github.com/openclaw/openclaw/pull/98299 from fork branch
  `giodl73-repo:feeds-trust-envelope-verifier`, head
  `7d6e2d64e52043b30e1617c5221495ed40643ac3`. Scope is the first
  implementation slice from RFC #25: signed hosted feed envelope verifier
  primitives for the official external plugin catalog. It adds a primitive
  module plus focused tests for Ed25519 PEM/raw base64url verification, stable
  payload signing input, payload type validation, tamper rejection, wrong-key
  rejection, malformed envelope rejection, and verify-before-parse invalid
  payload handling. It intentionally does not wire signed envelopes into
  marketplace refresh, config, snapshot persistence, CLI output, or install
  eligibility. Validation passed:
  `node scripts/run-vitest.mjs src/plugins/official-external-plugin-catalog-envelope.test.ts`
  (7 tests), targeted `oxfmt --check`, targeted `oxlint --deny-warnings`, and
  `git diff --cached --check`. Initial upstream push failed because the active
  GitHub identity could not push to `openclaw/openclaw`; switched active
  github.com auth to `giodl73-repo`, added fork remote, pushed, and opened the
  draft PR. Live state after initial checks settled: draft, open, mergeable,
  and `mergeStateStatus: CLEAN`.
- 2026-06-30 OpenClaw #98299 Codex review follow-up: ClawSweeper/Codex review
  accepted one real issue in the draft PR: the envelope verifier duplicated the
  existing PEM/raw Ed25519 verification logic in `src/infra/device-identity.ts`.
  Local staged fix extracts shared Ed25519 helpers into
  `src/infra/ed25519-signature.ts`, keeps `device-identity` public APIs as
  wrappers, and makes the hosted envelope verifier use the shared verifier.
  Validation passed `node scripts/run-vitest.mjs src/infra/device-identity.test.ts
  src/plugins/official-external-plugin-catalog-envelope.test.ts` twice,
  targeted `oxfmt --check`, targeted `oxlint --deny-warnings`, `git diff --check`,
  `git diff --cached --check`, and final `codex review --base origin/main` with
  no actionable findings. Local worktree has staged changes only; not committed,
  pushed, or PR-body-updated yet.
- 2026-07-01 OpenClaw #98299 proof/push: committed the shared Ed25519 helper
  fix as `8742cc651520c62fc2b303cb41ebf7b489985b1f` (`refactor: share Ed25519
  signature helpers`) and pushed `giodl73-repo:feeds-trust-envelope-verifier`.
  Ran source-harness proof with `node --import tsx -` from
  `C:\src\openclaw-feeds-trust-envelope`: generated an Ed25519 proof key,
  signed a minimal `clawhub-official-proof` envelope, verified accepted
  (`PROOF:accepted=true`, `PROOF:signedBy=clawhub-root-proof`), tampered the
  payload, and verified rejection (`PROOF:tamperedOk=false`,
  `PROOF:tamperedError=invalid-signature`). Re-ran focused validation:
  `node scripts/run-vitest.mjs src/infra/device-identity.test.ts
  src/plugins/official-external-plugin-catalog-envelope.test.ts` (15 tests),
  targeted `oxfmt --check`, targeted `oxlint --deny-warnings`, and
  `git diff --cached --check`. Updated the PR body with the required `Real
  behavior proof` section and posted `@clawsweeper re-review` at
  https://github.com/openclaw/openclaw/pull/98299#issuecomment-4849310312.
  Live state after push: draft/open at `8742cc6515`, `mergeStateStatus: CLEAN`,
  and GitHub real-behavior proof check green. ClawSweeper comment-router runs
  completed successfully, but the durable review comment still shows old
  exact-head markers and stale `status: needs proof` / `rating: unranked krab`
  labels until the item review refresh finishes.
- 2026-07-01 OpenClaw trust series PR #3 started: created
  `C:\src\openclaw-feeds-trust-source-profiles` on branch
  `feeds-trust-source-profiles`, stacked on #98299 head `8742cc6515`. Local
  implementation extends marketplace feed verification config from
  unsigned-only to `unsigned` or `signed` with local Ed25519 signing keys and an
  optional positive threshold. It updates generated config help/labels,
  config/types, the marketplace zod schema, marketplace schema tests, and the
  official external catalog feed profile type. Scope remains config-contract
  only: no refresh verification wiring, snapshot trust-state persistence,
  CLI/operator output, install eligibility, or source-profile enforcement
  changes yet. Validation passed:
  `node scripts/run-vitest.mjs src/config/zod-schema.marketplaces.test.ts`,
  `node scripts/run-vitest.mjs src/config/schema.help.quality.test.ts src/config/zod-schema.marketplaces.test.ts src/infra/device-identity.test.ts src/plugins/official-external-plugin-catalog-envelope.test.ts`,
  targeted `pnpm exec oxlint --deny-warnings`, targeted
  `pnpm exec oxfmt --check`, and `git diff --check`. Diff is 6 files,
  +149/-17. This was the pre-commit local validation before opening #98316.
- 2026-07-01 OpenClaw trust series PR #3 opened: committed the source-profile
  trust config slice as `a419080f033992d441fec0122174af9e09144ff8` (`feat:
  add signed marketplace feed config`), pushed
  `giodl73-repo:feeds-trust-source-profiles`, and opened draft PR
  https://github.com/openclaw/openclaw/pull/98316. The PR targets `main` as a
  draft because #98299's dependency branch is on the fork; reviewers should
  focus on the top commit until #98299 lands. Live PR state after create:
  draft/open, `mergeStateStatus: UNSTABLE` while initial checks run, with
  expected stacked commits from #98299 plus top commit `a419080f03`.
- 2026-07-01 OpenClaw #98316 Codex review follow-up: ran
  `codex review --base fork/feeds-trust-envelope-verifier`. Accepted review
  findings that signed config must not be silently bypassed and private PEMs
  must not validate as public feed keys. Amended #98316 to
  `a54b57dffdf04d381ae9dfa7a3ad1e7fb520125d`: config schema now rejects PEM
  private-key blocks in `verification.keys[].publicKey`; signed feed profiles
  fail closed in the hosted catalog loader until envelope enforcement is wired
  by returning a non-throwing fallback result with zero entries, no fetch, and
  no unsigned snapshot/bundled public entries for that selected signed profile.
  Focused validation passed
  `node scripts/run-vitest.mjs src/config/zod-schema.marketplaces.test.ts src/plugins/official-external-plugin-catalog.test.ts`,
  targeted `oxfmt --check`, targeted `oxlint --deny-warnings`, and
  `git diff --check`. Final Codex review reported no discrete correctness,
  security, or compatibility issues. Force-pushed the draft branch and updated
  the PR body/proof; GitHub Real behavior proof is green on new head, with
  remaining new-head checks still settling at last poll.
- 2026-07-01 OpenClaw #98316 second Codex review: reran
  `codex review --base fork/feeds-trust-envelope-verifier` at head
  `a54b57dffdf0`. Review reported no discrete high-confidence regressions in
  the marketplace config schema or official external catalog loading paths, and
  explicitly noted the signed-feed behavior is fail-closed and covered by the
  added tests. No code changes were made.
- 2026-07-01 OpenClaw trust series PR #4 opened: created
  `C:\src\openclaw-feeds-trust-refresh-state` on branch
  `feeds-trust-refresh-state`, stacked on #98316 head `a54b57dffd`, committed
  `27be652aa6143e2220c39c1c9fd914f68e3d7147` (`feat: verify signed
  marketplace feed refresh`), pushed to `giodl73-repo`, and opened draft PR
  https://github.com/openclaw/openclaw/pull/98338. Scope wires signed source
  profiles into hosted marketplace refresh, persists bounded trust state
  (`mode`, configured signing key id, signature count, threshold, verified-at)
  with hosted snapshots, re-verifies signed snapshots with the current source
  profile before use, and rejects invalid signed live bodies or unsigned old
  snapshots without falling back to bundled entries for that signed profile. It
  does not change install eligibility or the current marketplace refresh /
  entries CLI payload shape; CLI/operator trust visibility remains the next
  slice. Validation passed focused envelope/catalog Vitest (8 + 55 tests),
  source harness proof for signed refresh plus unsigned snapshot rejection,
  `pnpm tsgo:core`, `pnpm db:kysely:check`, targeted `oxlint`, targeted
  `oxfmt --check`, `git diff --check`, and
  `codex review --base fork/feeds-trust-source-profiles` with no actionable
  findings. A full local `src/state/openclaw-state-db.test.ts` run on Windows
  still hits existing platform-sensitive NFS journal-mode expectation
  (`delete` expected, `wal` observed); the new additive migration was validated
  by a source harness that drops and restores the five trust columns. Live #98338
  state immediately after create: draft/open, `mergeStateStatus: UNSTABLE`
  while initial checks run.
- 2026-07-01 OpenClaw trust series PR #5 opened: created
  `C:\src\openclaw-feeds-trust-cli-visibility` on branch
  `feeds-trust-cli-visibility`, stacked on #98338 head `27be652aa6`, committed
  `b17fe34c182e706a2cd3fb89fcf4cd6e0a511db5` (`feat: show marketplace feed
  trust state`), pushed to `giodl73-repo`, and opened draft PR
  https://github.com/openclaw/openclaw/pull/98350. Scope is the final
  CLI/operator visibility slice from RFC #25: marketplace refresh and entries
  JSON/text output now show bounded signed feed trust state for verified hosted
  live/snapshot results, while diagnostics emit only low-cardinality trust facts
  (`feedTrustVerified`, mode, signature count, threshold) and tests assert they
  do not include signing key ids, raw URLs, feed ids, checksums, URL credentials,
  token query strings, override tokens, or signing material. Validation passed
  focused marketplace CLI Vitest (12 tests), targeted `oxlint`, targeted
  `oxfmt --check`, `pnpm tsgo:core`, `git diff --check`, and two
  `codex review --base fork/feeds-trust-refresh-state` runs with no actionable
  findings. Live #98350 state immediately after create: draft/open at
  `b17fe34c18`, `mergeStateStatus: UNSTABLE` while initial checks run.
- 2026-07-01 OpenClaw trust series Codex review pass: reran focused Codex
  reviews across the four OpenClaw implementation PRs, each against its
  immediate stack base. #98299 (`codex review --base origin/main`) was clean;
  #98316 (`codex review --base fork/feeds-trust-envelope-verifier`) was clean
  after one timeout/retry; #98338
  (`codex review --base fork/feeds-trust-source-profiles`) was clean; and
  #98350 (`codex review --base fork/feeds-trust-refresh-state`) was clean.
  No code changes were made from this pass. Live GitHub/ClawSweeper state still
  has separate maintainer/security asks: #98316 wants non-test proof or
  acceptance of the staged fail-closed config contract, #98338 flags duplicate
  trust-anchor threshold hardening, and #98350 inherits that trust-anchor
  concern plus wants real CLI/source-harness proof before merge.
- 2026-06-28 #96194 merged: user approved verify/merge after final clean
  state, but live GitHub state already showed `MERGED` before running
  `merge-run`; Vince (`vincentkoc`) merged #96194 at
  `2026-06-28T22:44:27Z`. Merge commit:
  `9c5ee4676d0732e72ee9a939ae4918dc89bcaab8`
  (https://github.com/openclaw/openclaw/commit/9c5ee4676d0732e72ee9a939ae4918dc89bcaab8).
  Source head was `be9ce48da09889c3383438534dfa4d73070d416b`. The merge
  landed the hardened telemetry contract after Codex review, pass/skip checks,
  ClawSweeper `proof: sufficient` / `rating: platinum hermit` /
  `status: ready for maintainer look`, and maintainer acceptance comment
  https://github.com/openclaw/openclaw/pull/96194#issuecomment-4827581524.
  While starting the wrapper path, `scripts/pr review-init 96194` created /
  switched `C:\src\openclaw-prflow\.worktrees\pr-96194` to `temp/pr-96194`;
  no `prepare-run`, `merge-verify`, or `merge-run` was run after detecting the
  PR was already merged.
- 2026-06-28 #96194 telemetry field hardening: after user asked whether to
  remove remaining metadata risk before merge, amended the PR commit from
  `e3013414bd` to `be9ce48da09889c3383438534dfa4d73070d416b` and
  force-with-lease pushed `feeds-hosted-catalog-marketplace-telemetry`. The
  diagnostics event no longer emits feed host, feed profile name, feed id, or
  payload checksum values; it emits bounded presence booleans
  (`feedProfileProvided`, `feedIdPresent`, `payloadChecksumPresent`) plus
  source mode, entry count, feed sequence, HTTP status, validator presence,
  snapshot/offline/pinned/fallback booleans/categories. Focused validation
  passed targeted `oxfmt`, targeted `oxlint`, focused marketplace
  refresh/entries tests (10 tests), `git diff --check`, and
  `codex review --base origin/main`; Codex found no actionable regressions and
  noted the attributes avoid raw URLs/checksums while preserving command
  behavior. PR body updated for the safer field set and new prepared head.
  `@clawsweeper re-review` queued at
  https://github.com/openclaw/openclaw/pull/96194#issuecomment-4827558325.
  Fresh GitHub checks are running on `be9ce48da0`; prior exact-head
  ClawSweeper labels from `e3013414bd` are stale until the new review settles.
- 2026-06-28 #96194 maintainer contract acceptance: posted maintainer comment
  https://github.com/openclaw/openclaw/pull/96194#issuecomment-4827581524
  accepting the narrowed diagnostics timeline field set on current head
  `be9ce48da0`, limited to bounded operational fields and presence booleans.
  The acceptance explicitly depends on not emitting raw feed URLs, URL hosts,
  profile names, feed ids, payload checksums, URL credentials, query strings,
  fragments, or override token values; broader/higher-cardinality telemetry
  needs a follow-up review.
- 2026-06-28 #96194 final review/checks: after another user-requested review,
  fetched latest `origin/main` (advanced to `a54206f0f5`) and ran
  `codex review --base origin/main` from
  `C:\src\openclaw-prflow\.worktrees\pr-96194`; Codex again reported no
  actionable correctness issues in the marketplace diagnostics telemetry paths
  or adjacent tests, and noted the added timeline attributes are bounded and
  use existing diagnostics gating. Live #96194 state at head
  `e3013414bd26b5b26a5e5c4c3bb545379b38e189`: non-draft,
  `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`, checks pass/skip with no
  not-green checks, ClawSweeper labels `proof: sufficient`,
  `rating: platinum hermit`, and `status: ready for maintainer look`. Live LOC
  is +291/-2 across 3 files. RFC/addendum trace: this PR satisfies the staged
  diagnostics/observability slice for marketplace feed refresh and entries by
  emitting opt-in diagnostics timeline marks with feed id, sequence/source,
  bounded checksum/status/snapshot/fallback attributes, and URL secret/query/
  fragment redaction tests; it intentionally does not complete the broader RFC
  addendum items for signed envelopes, regional feeds, tenant effective-feed
  governance, search ranking, install enforcement, drift reporting, or admin
  composition.
- 2026-06-28 #96194 marked ready / Codex review: after user approval, ran
  `gh pr ready 96194 --repo openclaw/openclaw`; live PR is non-draft at exact
  head `e3013414bd26b5b26a5e5c4c3bb545379b38e189`. Fetched current
  `origin/main` (main had advanced to `a54919dcbc`) and reran
  `codex review --base origin/main`; Codex reported no actionable correctness
  issues in the diagnostics telemetry changes or tests. ClawSweeper exact-head
  labels refreshed to `proof: sufficient`, `rating: platinum hermit`, and
  `status: ready for maintainer look`; its current-head review still calls out
  maintainer acceptance of the new diagnostics event attribute surface and
  serialized-state test fixtures before merge. Live PR checks after marking
  ready were still running (`auto-response`, `QA Smoke CI`, and several compact
  node shards pending) while many required checks already passed, including
  Real behavior proof, lint, prod/test types, dependency/security guards,
  security-high shards, and plugin contract checks. Local worktree
  `C:\src\openclaw-prflow\.worktrees\pr-96194` remains clean on
  `pr-96194-prep`, ahead 1 / behind 3 from `origin/main`; do not run
  prepare/merge until ready-triggered checks settle and the maintainer accepts
  the telemetry surface.
- 2026-06-28 #96194 restacked: Created
  `C:\src\openclaw-prflow\.worktrees\pr-96194` from current `origin/main`
  after #96158 merged and cherry-picked only the PR-owned telemetry commit
  `18b7747591`, producing prepared head
  `e3013414bd26b5b26a5e5c4c3bb545379b38e189`. The live PR diff is now three
  files (`src/cli/plugins-cli.runtime.ts`,
  `src/cli/plugins-cli.marketplace-refresh.test.ts`,
  `src/cli/plugins-cli.marketplace-entries.test.ts`) instead of the old
  stacked 20-file diff. Validation passed targeted `oxfmt --check`, targeted
  `oxlint`, focused marketplace refresh/entries tests (10 tests),
  `git diff --check`, `codex review --base origin/main`, and real runtime
  proof with isolated `OPENCLAW_HOME` plus `OPENCLAW_DIAGNOSTICS=1`; the
  offline entries command wrote a `plugins.marketplace.feed.entries` timeline
  mark with bounded attributes (`command`, `entries: 74`, `source:
  bundled-fallback`, `offline: true`, `fallbackCategory: offline`). Full
  `pnpm tsgo:core` was attempted but fails in unrelated current-main
  `src/acp/**` imports from `@agentclientprotocol/sdk`, outside the PR diff.
  Force-pushed `feeds-hosted-catalog-marketplace-telemetry` from old head
  `18b7747591` to `e3013414bd`, repaired the PR body with the narrower scope
  and proof, and queued `@clawsweeper re-review` at
  https://github.com/openclaw/openclaw/pull/96194#issuecomment-4827450137.
  Live PR is still draft, mergeable, visible checks are pass/skip including
  Real behavior proof, but ClawSweeper labels/comment are stale at
  `status: 📣 needs proof` / `rating: 🧂 unranked krab` until the queued exact
  head review updates.
- 2026-06-28 #96158 merged: after user approval, ran
  `scripts/pr merge-run 96158` from `C:\src\openclaw-prflow` using Git for
  Windows Bash. The wrapper reran merge verification, accepted unrelated
  behind-main drift in memory docs/search, terminal-link tests/source,
  cron failure alerts, config eval, and subagent format files with no overlap,
  and squash-merged the PR. Live PR state is `MERGED`; merge commit
  `9bb004359ee5ee15b0881c2bce89bd4385db5a3a`, merged by `giodl73-repo` at
  2026-06-28T21:11:30Z from prepared head
  `1289a25156b8784439a2df4d0e34718895bd1ff6`. Completion comment:
  https://github.com/openclaw/openclaw/pull/96158#issuecomment-4827407382.
  Wrapper cleanup warnings: failed to delete remote branch
  `openclaw/openclaw:feeds-hosted-catalog-marketplace-entries`, and
  `C:\src\openclaw-prflow\.worktrees\pr-96158` remains because
  `pr-96158-prep` is checked out there.
- 2026-06-28 #96158 verified/prepared: Rebased the single PR-owned entries
  commit onto current `origin/main`, moving live head from `fd69293cd9` to
  `1289a25156b8784439a2df4d0e34718895bd1ff6`; force-with-lease push updated
  `feeds-hosted-catalog-marketplace-entries`. Local validation passed targeted
  `oxfmt --check`, targeted `oxlint`, focused CLI lazy/entries tests,
  `pnpm docs:check-mdx`, `pnpm tsgo:core`, `git diff --check`, offline JSON
  runtime proof (`source: bundled-fallback`, `entryCount: 74`), and
  `codex review --base origin/main` with no actionable correctness issues. PR
  body now references prepared/proof head `1289a25156`; ClawSweeper refreshed at
  21:00 UTC with `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`. Fresh GitHub checks are pass/skip,
  including Real behavior proof, lint, docs, shrinkwrap, test types, QA Smoke
  CI, and compact node shards. Wrapper flow from `C:\src\openclaw-prflow`
  passed `review-validate-artifacts 96158`, `OPENCLAW_TESTBOX=1 scripts/pr
  prepare-gates 96158`, `OPENCLAW_TESTBOX=1 scripts/pr prepare-push 96158`,
  and `scripts/pr merge-verify 96158`; merge verify accepted behind-main drift
  as unrelated memory/cron/config/subagent files with no overlap. Do not run
  `scripts/pr merge-run 96158` without explicit user approval and maintainer
  acceptance of the new public entries CLI/JSON/text output contract.
- 2026-06-28 #96158 docs fix / CI status: Addressed ClawSweeper's docs finding
  by documenting `openclaw plugins marketplace entries --feed-profile <name>`
  and `--feed-url <url>` in `docs/cli/plugins.md`; targeted `oxfmt`,
  `pnpm docs:check-mdx`, `git diff --check`, and isolated offline JSON runtime
  proof passed at `fd69293cd9` with `source: bundled-fallback` and
  `entryCount: 74`. PR body now references prepared/proof head
  `fd69293cd9`; `@clawsweeper re-review` refreshed to
  `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`. Live PR remains non-draft and
  mergeable, but `mergeStateStatus` is `UNSTABLE` because `check-lint` and
  `check-additional-extension-bundled` both fail on unrelated
  `extensions/line/src/message-cards.test.ts:333` `eslint(no-shadow)` for
  `loneHighSurrogate`; #96158's diff is still limited to docs and CLI
  marketplace entries files.
- 2026-06-28 #96158 prepared: Fetched live PR after #96155 landed, found the
  branch retargeted to `main` but still draft/conflicting at old stacked head
  `5bcb4a40bb`. Created
  `C:\src\openclaw-prflow\.worktrees\pr-96158` from current `origin/main`,
  cherry-picked only the PR8 entries-command commit, fixed a docs restack
  duplicate and aligned the JSON-output test fixture with the current
  trusted-candidate install resolver (`state: available`,
  `publisher.trust: official`). Validation passed:
  `pnpm exec oxfmt ...`, `pnpm exec oxlint --deny-warnings ...`,
  `CI=1 node scripts/test-projects.mjs src/cli/plugins-cli.lazy.test.ts
  src/cli/plugins-cli.marketplace-refresh.test.ts
  src/cli/plugins-cli.marketplace-entries.test.ts
  src/plugins/official-external-plugin-catalog.test.ts`,
  `pnpm tsgo:core:test`, `pnpm docs:check-mdx`, `git diff --check`, and
  `codex review --base origin/main` with no actionable correctness issues.
  Runtime proof used isolated `OPENCLAW_HOME` and
  `runPluginMarketplaceEntriesCommand({ offline: true, json: true })`; it
  returned `source: bundled-fallback`, `entryCount: 74`, and normalized install
  metadata. Force-pushed
  `feeds-hosted-catalog-marketplace-entries` from `5bcb4a40bb` to
  `c8f2d3e40739fd9beb86a730ae5e063fe307bda8`, updated the PR body, marked the
  PR ready, and queued `@clawsweeper re-review` at
  https://github.com/openclaw/openclaw/pull/96158#issuecomment-4826962078.
  First ClawSweeper pass raced the PR-body update and still saw stale proof, so
  after verifying the live body referenced `c8f2d3e407`, queued a second
  re-review at
  https://github.com/openclaw/openclaw/pull/96158#issuecomment-4826985214.
  Final live state: non-draft, base `main`, `mergeStateStatus: CLEAN`,
  `mergeable: MERGEABLE`, all current checks green/skipped, labels
  `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`.
- 2026-06-28 #96155 merged: After explicit user approval, ran the maintainer
  wrapper flow from `C:\src\openclaw-prflow` using Git for Windows Bash. A WSL
  Bash attempt failed on mixed `/mnt/c` alternate-object paths; Git for Windows
  Bash was used for the real wrapper commands. Initialized review artifacts,
  filled a `READY FOR /prepare-pr` recommendation, and ran hosted exact-head
  gates because full local `prepare-run` reproduced the known baseline
  `npm shrinkwrap guard` failure from broad `pnpm check`, outside #96155's
  touched docs/CLI/plugin-catalog files. `OPENCLAW_TESTBOX=1 scripts/pr
  prepare-gates 96155`, `OPENCLAW_TESTBOX=1 scripts/pr prepare-push 96155`,
  and `scripts/pr merge-verify 96155` passed; merge verify accepted behind-main
  drift limited to unrelated opencode/proxy files with no overlap. Then ran
  `scripts/pr merge-run 96155`, which squash-merged the PR. Live PR state is
  `MERGED`; merge commit
  `102a65477e8d4520a0732f056c72f9a7c4785ac8`, merged by `giodl73-repo` at
  2026-06-28T17:29:16Z from prepared head
  `1614070e92cd534c34aa19ea5cb58257519367e4`. Completion comment:
  https://github.com/openclaw/openclaw/pull/96155#issuecomment-4826855615.
  Wrapper cleanup warnings: failed to delete remote branch
  `openclaw/openclaw:feeds-hosted-catalog-marketplace-refresh`, and
  `C:\src\openclaw-prflow\.worktrees\pr-96155` remains because
  `pr-96155-prep` is checked out there. The `openclaw-prflow` root still has
  preexisting local edits in `scripts/pr` and `scripts/pr-lib/merge.sh` that
  were not touched here.
- 2026-06-28 #96155 ready: Created
  `C:\src\openclaw-prflow\.worktrees\pr-96155`, cherry-picked only the
  PR-owned marketplace refresh command commit onto current `origin/main` after
  #95981 merged, and force-with-lease pushed
  `feeds-hosted-catalog-marketplace-refresh` to
  `219aa1d92856bb9097cda48de31d038445e085af`, then Codex review fixes amended
  and force-with-lease pushed head
  `034ab82b953e51f65ca9dd3e3dc5599b110ebb00`. Accepted Codex findings were:
  document `plugins marketplace refresh`; reject query/fragment direct feed
  URLs; use the real `clawhub-public` profile in docs/proof; normalize bare and
  prefixed uppercase SHA-256 pins; require manifest `sourceRef` only for
  non-default explicit feed URLs while preserving the default ClawHub URL path.
  Added a final docs clarification for unpinned fallback success, pinned-refresh
  failure, and snapshot-persistence failure, amended, and force-with-lease
  pushed final head `1614070e92cd534c34aa19ea5cb58257519367e4`. Final
  `codex review --base origin/main` found no actionable correctness issues.
  The restacked diff is focused to seven files (`docs/cli/plugins.md`,
  `src/cli/plugins-cli*`, and `src/plugins/official-external-plugin-catalog*`);
  the old broad stacked head `b93aa0e04f` is no longer live. Validation passed
  targeted `oxfmt`, targeted `oxlint`, `git diff --check`, focused marketplace
  refresh/lazy/catalog tests, `pnpm docs:check-mdx`, and `pnpm tsgo:core`.
  `pnpm format:docs:check` is still not usable on this Windows checkout because
  repo-wide `oxfmt` hits command-line-length before checking the file; targeted
  docs checks passed. Live proof used
  `runPluginMarketplaceRefreshCommand({ feedProfile: "clawhub-public", json: true })`
  against `https://clawhub.ai/v1/feeds/plugins` with isolated state at
  `C:\tmp\openclaw-feeds-proof\pr96155-refresh-034ab82`: hosted feed
  `clawhub-official`, 59 entries, sequence 19, checksum
  `sha256:76a49aad745fe828c7f88b5a870ad67b5953c5235b4c928b1d6189584b257b63`,
  ETag
  `"sha256:76a49aad745fe828c7f88b5a870ad67b5953c5235b4c928b1d6189584b257b63-gzip"`,
  and `lastModified: Sun, 28 Jun 2026 12:47:16 GMT`; offline reload returned
  `hosted-snapshot` with the same feed/checksum. The PR body was repaired and
  updated with this proof, `@clawsweeper re-review` was queued again at
  https://github.com/openclaw/openclaw/pull/96155#issuecomment-4826679215, and
  ClawSweeper refreshed exact-head review for `1614070e92` with
  `proof: sufficient`,
  `rating: 🐚 platinum hermit`, `status: 👀 ready for maintainer look`,
  `Rank-up moves: none`, and the remaining maintainer decision: accepting the
  public `plugins marketplace refresh` CLI contract/four flags and the
  operator-visible snapshot-persistence failure mode. After user approval, ran
  `gh pr ready 96155 --repo openclaw/openclaw`; after the final push, three
  unrelated compact shards initially failed outside the PR-owned files and were
  rerun with `gh run rerun 28328301975 --failed`; the rerun completed pass.
  Fresh non-draft GitHub checks are pass/skip/neutral only, including Real
  behavior proof, lint, prod/test types, shrinkwrap, security highs, QA Smoke
  CI, and compact node shards. Live PR state is `isDraft: false`,
  `mergeStateStatus: CLEAN`, head
  `1614070e92cd534c34aa19ea5cb58257519367e4`. User then approved the
  maintainer merge path and the refresh CLI compatibility contract for this
  staged manual snapshot-refresh slice.
- 2026-06-28 #95981 merged: After explicit user approval, ran
  `scripts/pr merge-run 95981` from `C:\src\openclaw-prflow` using Git for
  Windows Bash. First merge attempt stopped because main advanced into
  `scripts/plugin-sdk-surface-report.mjs`; `prepare-sync-head` hit a conflict
  there. Resolved by preserving main's intervening deprecated-export budget
  increase plus #95981's four config-type exports, raising
  `OPENCLAW_PLUGIN_SDK_MAX_PUBLIC_DEPRECATED_EXPORTS` to `3253`; verified with
  `node scripts/plugin-sdk-surface-report.mjs --check`. After more main churn,
  pushed final prepared head
  `ef4d81cd0824de2322857028e64786a9dad304dd` directly with exact
  force-with-lease so the PR branch had correct current-main ancestry. GitHub
  checks passed on `ef4d81cd08`; `OPENCLAW_TESTBOX=1 scripts/pr prepare-run
  95981` passed hosted exact-head gates; `scripts/pr merge-verify 95981`
  passed. A first `merge-run` then hit a GitHub base-branch-modified race; a
  rerun accepted unrelated behind-main Minimax extension drift and
  squash-merged #95981. Live PR state is `MERGED`; merge commit
  `70e0fd4d8b91c81a982aaed2ddde4d178675a017`, merged by `giodl73-repo` at
  2026-06-28T14:53:33Z. Completion comment:
  https://github.com/openclaw/openclaw/pull/95981#issuecomment-4826461928.
  Wrapper cleanup warnings: failed to delete remote branch
  `openclaw/openclaw:feeds-hosted-catalog-config-profiles`, and
  `C:\src\openclaw-prflow\.worktrees\pr-95981` remains because
  `pr-95981-prep` is checked out there. The `openclaw-prflow` root still has
  preexisting local edits in `scripts/pr` and `scripts/pr-lib/merge.sh` that
  were not touched here.
- 2026-06-28 #95981 verify/prepare: Live PR was non-draft and clean at
  `35eeb6d89a27`, but `scripts/pr merge-verify 95981` found mainline drift it
  classified as merge-critical, so the prep branch was synced onto current
  `origin/main` and pushed to remote head
  `c21b444a20667872e2df35f8cebf01f6702cb308`. The sync did not change the PR
  diff content; it refreshed ancestry after main advanced. The PR body was
  repaired from flattened Markdown and updated to reference `c21b444a20`.
  Local `scripts/pr prepare-run 95981` passed `pnpm build` but `pnpm check`
  failed only on `npm-shrinkwrap.json is stale`; the same failure reproduced on
  latest `origin/main`, so it is baseline repo noise outside the PR. Used the
  documented fallback:
  `OPENCLAW_TESTBOX=1 scripts/pr prepare-sync-head 95981`, waited for GitHub
  exact-head checks on `c21b444a20`, then reran
  `OPENCLAW_TESTBOX=1 scripts/pr prepare-run 95981`, which passed hosted
  exact-head gates and confirmed the remote branch was already at prepared
  head. Final `scripts/pr merge-verify 95981` passed; it accepted later
  behind-main drift as unrelated Discord extension files
  (`extensions/discord/src/internal/rest.ts` and `.test.ts`). Live final state:
  `isDraft: false`, head `c21b444a20`, `mergeStateStatus: CLEAN`,
  `mergeable: MERGEABLE`, GitHub checks pass/skip only, ClawSweeper labels
  `proof: sufficient`, `rating: platinum hermit`, and
  `status: ready for maintainer look`. Do not run
  `scripts/pr merge-run 95981` without explicit user approval and maintainer
  acceptance of the durable `marketplaces.*` config/trust-root contract.
- 2026-06-28 #95981 marked ready: After user approval, ran
  `gh pr ready 95981 --repo openclaw/openclaw`. The non-draft checks exposed
  two narrow CI issues: an oxlint `no-base-to-string` assertion and stale
  plugin SDK surface budgets for four new public config-type exports. Fixed the
  test to compare through `expectRequestUrl(url)`, bumped the SDK surface
  budgets from `10388`/`3247` to `10392`/`3251` and the `config-types`
  deprecated budget from `416` to `420`, amended the single PR commit, and
  force-with-lease pushed head
  `35eeb6d89a27e746729ea3666284931603dbb4da`. Local proof passed targeted
  `oxlint`, `plugin-sdk-surface-report --check`, focused marketplace/config and
  hosted catalog tests (10 + 45 tests), the plugin SDK surface Vitest file (8
  tests after one transient rerun), `oxfmt`, and `git diff --check`. Refreshed
  live ClawHub proof against `https://clawhub.ai/v1/feeds/plugins`: hosted
  feed `clawhub-official`, 59 entries, sequence 19, checksum
  `sha256:76a49aad745fe828c7f88b5a870ad67b5953c5235b4c928b1d6189584b257b63`,
  ETag
  `"sha256:76a49aad745fe828c7f88b5a870ad67b5953c5235b4c928b1d6189584b257b63-gzip"`,
  and `lastModified: Sun, 28 Jun 2026 12:47:16 GMT`; PR body was updated with
  that proof. Final live PR state: `isDraft: false`, head
  `35eeb6d89a27`, GitHub checks pass/skip only, `mergeStateStatus: CLEAN`,
  `mergeable: MERGEABLE`, and ClawSweeper labels are `proof: sufficient`,
  `rating: platinum hermit`, `status: ready for maintainer look`. Remaining
  merge decision is maintainer acceptance of the durable `marketplaces.*`
  config/trust-root contract.
- 2026-06-28 #95981 restack/review: Created
  `C:\src\openclaw-prflow\.worktrees\pr-95981`, cherry-picked the PR6 config
  profile commit onto current `origin/main` after #95969, fixed ClawSweeper's
  URL-contract blocker by rejecting credentials, query strings, and fragments
  in `marketplaces.feeds.*.url`, regenerated
  `docs/.generated/config-baseline.sha256`, and force-with-lease pushed
  `feeds-hosted-catalog-config-profiles` to `de557ea0acd82c720ddab6a90ca7bff8c21e6d6f`.
  Validation passed `oxfmt`, `oxlint`, focused marketplace/config and hosted
  catalog tests (10 + 45 tests), `pnpm tsgo:core:test`, `pnpm tsgo:core`,
  `pnpm config:docs:check`, `git diff --check`, and live
  `loadConfiguredHostedOfficialExternalPluginCatalogEntries` proof against
  `https://clawhub.ai/v1/feeds/plugins` (59 entries, feed sequence 17,
  ClawHub-only install spec for `@expediagroup/expedia-openclaw`). ClawSweeper
  exact-head review on `de557ea0ac` is `proof: sufficient`, `rating: platinum
  hermit`, `status: ready for maintainer look`, security cleared, and still
  calls out maintainer acceptance of the durable `marketplaces.*` trust-root
  config contract before marking the draft ready.
- 2026-06-27 hosted catalog merge queue refresh: Live OpenClaw feed search
  identifies the nine-PR hosted catalog stack for weekend merging:
  #95846 -> #95868 -> #95877 -> #95964 -> #95969 -> #95981 -> #96155 ->
  #96158 -> #96194. #95846 is the first target and is draft/open at
  `44c0884c3edcaa07ea94d5f82624fe99b3f532b7`, base `main`, merge clean,
  mergeable, and approved by Patrick on the current head. Its live checks are
  pass/skip only, including Real behavior proof passing, but labels still show
  stale proof-needed state. #95868 and #95877 are also approved/clean; #95964
  and #95969 are approved/clean; #95981, #96155, #96158 have no reviewDecision
  yet but are merge clean; #96194 is currently dirty/conflicting and should be
  handled after the lower stack lands or restacked. `projects/feeds/README.md`
  has been updated to separate this hosted catalog stack from the older native
  feeds chain.
- 2026-06-27 #95846 maintainer closeout: Ran Codex review on the first hosted
  catalog stack PR and found no actionable correctness issues. Marked #95846
  ready for review, synced it onto current main, fixed the stricter extension
  package boundary TypeScript issue by making the valid feed type require
  `schemaVersion`, `id`, `generatedAt`, `sequence`, and `entries` and by
  narrowing `sequence` before comparison, then pushed synced head
  `82d05bdc461eab94db7e0ad4e7d99650daf84815`. Local proof passed the focused
  catalog Vitest file (17 tests) and
  `pnpm run test:extensions:package-boundary:compile` (116 compiled plugins).
  Hosted exact-head CI/Testbox gates passed, `scripts/pr prepare-push 95846`
  completed without needing a push, and `scripts/pr merge-verify 95846` passed.
  Merged via `scripts/pr merge-run 95846` at 2026-06-27T14:41:41Z; merge
  commit `4010b81a77f40c17ebfc55a6b47571dc1ef92902`.
- 2026-06-27 #95868 rebase after #95846: Created
  `C:\src\openclaw-prflow\.worktrees\pr-95868`, fetched PR #95868, rebased
  `feeds-hosted-catalog-fetch` onto `origin/main` after #95846 merged, skipped
  the duplicate already-merged #95846 prep commit, and resolved the hosted
  loader conflict by preserving #95868's hosted feed work plus #95846's stricter
  feed type/narrowed `sequence` guard. Focused proof passed
  `CI=1 node scripts/test-projects.mjs src/plugins/official-external-plugin-catalog.test.ts`
  with 24 tests. Force-with-lease pushed
  `giodl73-repo/openclaw:feeds-hosted-catalog-fetch` from
  `2d68751c140f06ce80d68210aad26a6b99ff5c92` to
  `e03750d0f903d436efd06b0f1d1e9da16812105a`. Live #95868 remains draft/open,
  approved, mergeable/unstable while fresh checks start.
- 2026-06-27 #95868 Codex review fixes pushed: Ran `codex review --base
  origin/main` from `C:\src\openclaw-prflow\.worktrees\pr-95868` after the
  rebase. Accepted and fixed three findings:
  synthesized live ClawHub entries now require `state: available`,
  `publisher.trust: official`, and `sourceRef: public-clawhub`; ClawHub
  `sha256:<hex>` checksums are no longer copied into npm `expectedIntegrity`
  unless the feed value is SRI-shaped; and the install candidate guard now
  explicitly narrows `find()` before synthesis. Local amended head
  `55dea31e9f` was force-with-lease pushed to
  `giodl73-repo/openclaw:feeds-hosted-catalog-fetch`, replacing live PR head
  `e03750d0f903d436efd06b0f1d1e9da16812105a`; #95868 is now draft/open,
  approved, and checks are running on `55dea31e9f`. Verification passed
  `git diff --check`, `CI=1 node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 26 tests,
  `pnpm tsgo:core`, and the final `codex review --base origin/main` reported
  no correctness issues.
- 2026-06-27 #95868/#95969 integrity boundary update: After ClawSweeper flagged
  live ClawHub `sha256:<hex>` candidate integrity on #95868, split ownership
  across the stack. #95868 now deliberately does not interpret
  `install.candidates[].integrity`; it remains a transport/loader slice and
  was force-with-lease pushed to `6582726791aa314315444fe9aead47913e1ba925`.
  Local proof for #95868 passed `git diff --check` and
  `CI=1 node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 25 tests. #95969
  now owns source-profile integrity semantics: `public-clawhub` candidate
  `sha256:<hex>` values are normalized through the ClawHub SHA-256 integrity
  helper for the ClawHub install choice, while npm source profiles only
  preserve npm SRI-shaped integrity. #95969 was force-with-lease pushed to
  `51a300b6bcabc757c6d6104f0004a674d0288d92`; local proof passed
  `git diff --check`, `pnpm tsgo:core`, and
  `CI=1 node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 38 tests.
  PR bodies for #95868 and #95969 were updated to document the boundary, and
  `@clawsweeper re-review` was queued on both PRs.
- 2026-06-27 #95868 transport-only follow-up: ClawSweeper still objected that
  #95868 synthesized `npmSpec`/`defaultChoice` install metadata while dropping
  candidate integrity, even though #95969 owns source-profile integrity. Fixed
  #95868 by removing hosted candidate-to-manifest install synthesis entirely;
  the parser now preserves hosted feed entries as raw metadata-only records, so
  candidate-to-install interpretation is fully deferred to #95969. Local proof
  passed `git diff --check`, `pnpm tsgo:core`, and
  `CI=1 node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 25 tests. Pushed
  #95868 head `ac2cbe0e948c48fc1fe228f9a6ef3bc3162140bf`, updated the PR body
  to remove installable-entry language, and queued `@clawsweeper re-review` at
  `https://github.com/openclaw/openclaw/pull/95868#issuecomment-4819271887`.
- 2026-06-27 #95868 maintainer prepare: The local maintainer wrapper was run
  from `C:\src\openclaw-prflow`. `/root/src/openclaw-maintainers-repo` was not
  present in WSL, so the private maintainer docs could not be refreshed on this
  machine; used the existing Windows wrapper flow instead. `scripts/pr
  review-init 95868`, local review artifact creation, and `scripts/pr
  review-validate-artifacts 95868` passed with recommendation
  `READY FOR /prepare-pr` and no findings. `scripts/pr prepare-gates 95868`
  first failed because `pnpm check` hit the repo-wide npm shrinkwrap guard;
  the exact same `pnpm deps:shrinkwrap:check` failure reproduces on latest
  `origin/main`, so it is baseline noise unrelated to #95868's two changed
  plugin catalog files. `OPENCLAW_TESTBOX=1 scripts/pr prepare-gates 95868`
  passed exact-head hosted gates and wrote `.local/gates.env`; `OPENCLAW_TESTBOX=1
  scripts/pr prepare-push 95868` completed without pushing because the remote
  branch was already at prepared head `ac2cbe0e948c48fc1fe228f9a6ef3bc3162140bf`.
  `scripts/pr merge-verify 95868` stopped at `PR is draft`, as expected. The
  PR body was then replaced with clean Markdown and `@clawsweeper re-review`
  was queued at
  `https://github.com/openclaw/openclaw/pull/95868#issuecomment-4819814766`;
  lightweight label/proof checks passed after rerun. The PR was then marked
  ready for review at the same head; it is no longer draft, remains approved,
  and is merge clean. ClawSweeper labels are still stale (`needs proof` /
  `unranked`) until the queued durable review refresh lands. Do not run
  `merge-run` until ClawSweeper refreshes and the hosted feed trust boundary is
  accepted by a maintainer.
- 2026-06-27 #95868 lint cleanup: After marking #95868 ready, full CI exposed
  one PR-owned `check-lint` failure in
  `src/plugins/official-external-plugin-catalog.test.ts`: an unused
  `resolveOfficialExternalPluginLabel` import and two unnecessary `entry!`
  assertions. Fixed by removing the stale import and explicitly throwing if the
  parsed live-style ClawHub entry is missing before calling resolver helpers.
  Local proof passed targeted `pnpm exec oxlint --deny-warnings` on the catalog
  source/test files, targeted `pnpm exec oxfmt --check`, `git diff --check`,
  and `CI=1 node scripts/test-projects.mjs
  src/plugins/official-external-plugin-catalog.test.ts` with 25 tests. Pushed
  #95868 to `47ce2ac9a691fa5915e3c701774f3cf37a48ca8f`; fresh GitHub checks
  completed pass/skip only, including `check-lint` and `check-shrinkwrap`.
  Merge state is `CLEAN` and review decision remains `APPROVED`. ClawSweeper
  labels remained stale (`needs proof` / `unranked`), so a fresh
  `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/95868#issuecomment-4820061151`
  and acknowledged at
  `https://github.com/openclaw/openclaw/pull/95868#issuecomment-4820061997`.
  Wait for the durable ClawSweeper comment/labels to refresh before rerunning
  merge verification.
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
- For hosted catalog PR verify/merge work, use
  `projects/prs/SESSION.md` section `OpenClaw Verify/Merge Best Practices`.
  Current learned flow: restack only PR-owned commits onto `origin/main`, run
  focused validation plus `codex review --base origin/main`, refresh PR body
  with live proof, queue one `@clawsweeper re-review`, wait for exact-head
  durable labels/comments, preserve draft state until explicitly told to mark
  ready, then use the `C:\src\openclaw-prflow` `scripts/pr` wrapper order and
  pause before final `merge-run`.
- Hosted catalog boundary decision for #95964 and successors: persisted hosted
  feed bodies are inert snapshot/cache material, not trusted install, search,
  startup, or source authority. Later PRs must explicitly validate source
  profiles and feed trust rules before consuming persisted entries for
  marketplace behavior.
- Read: `projects/lobster/feeds-scout.md` for Lobster-specific Scout feed
  operating model and admin-setting touchpoints.
- Update: this file and README when PR statuses change.

## Guardrails

- Do not put feed implementation prototypes in `claws-hapi`.
- Keep install/discovery/policy/lifecycle/feed-search concerns separated.
- Do not mix Lobster Scout publishing policy into OpenClaw primitive PRs.

## Open Threads

- 2026-06-27 OpenClaw #95868 Codex review refresh: `codex review --base
  origin/main` on `47ce2ac9a6` found one real P2 issue: hosted ClawHub schema
  v2 entries with only `id`/`title` and no manifest/name were parsed but then
  dropped by catalog dedupe. Fixed in OpenClaw head `76da9328af` by adding a
  normalized catalog entry dedupe key that preserves manifest ids first,
  legacy `name` entries second, and metadata-only hosted `id` entries third.
  Added loader-level regression coverage for live ClawHub metadata-only entries.
  Validation passed:
  `pnpm exec oxlint --deny-warnings src/plugins/official-external-plugin-catalog.ts src/plugins/official-external-plugin-catalog.test.ts`,
  `pnpm exec oxfmt --check src/plugins/official-external-plugin-catalog.ts src/plugins/official-external-plugin-catalog.test.ts`,
  `git diff --check`,
  `CI=1 node scripts/test-projects.mjs src/plugins/official-external-plugin-catalog.test.ts`
  with 26 tests passing, and final `codex review --base origin/main` with no
  actionable correctness issues. Pushed to `giodl73-repo/openclaw` branch
  `feeds-hosted-catalog-fetch`; repeated `codex review --base origin/main`
  after the push also reported no actionable correctness issues. GitHub CI is
  running on the new head and ClawSweeper labels/comments are stale until a
  fresh review completes.
- 2026-06-27 OpenClaw #95868 ClawSweeper proof refresh: all GitHub checks
  passed/skipped and ClawSweeper was requeued on exact head
  `76da9328af8498b99f133f8f0fe3f10f42cbee3d`. First exact-head review still
  blocked on stale PR-body proof, so the PR body was restored/refreshed with
  current-head live `node --import tsx` proof against
  `https://clawhub.ai/v1/feeds/plugins`: `resultSource: hosted`, 59 entries,
  feed `clawhub-official` sequence 16, checksum
  `sha256:cf3d85c1d6ede1907ca265e9b214ac6ff1c715c90c30ec65e8017addb590e32d`,
  ETag
  `"sha256:cf3d85c1d6ede1907ca265e9b214ac6ff1c715c90c30ec65e8017addb590e32d-gzip"`,
  and `lastModified: Sat, 27 Jun 2026 18:43:36 GMT`. ClawSweeper then updated
  the durable review to `needs maintainer review before merge` with labels
  `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`; PR merge state is `CLEAN`. A
  redundant follow-up ClawSweeper run `28300327339` is still in progress in
  `Review exact event item`; watch it only for regressions, but the visible PR
  labels/comments are good.
- 2026-06-27 OpenClaw #95868 merged: used Git for Windows Bash to run
  `scripts/pr prepare-run 95868`, `scripts/pr merge-verify 95868`, and
  `scripts/pr merge-run 95868` from `C:\src\openclaw-prflow`. Prepare used
  hosted exact-head gates, found no changelog requirement, and confirmed remote
  PR head already matched local prep head
  `76da9328af8498b99f133f8f0fe3f10f42cbee3d`. Merge verify noted the branch
  was behind `main`, but drift was unrelated: no overlap with prepared files
  and no critical infra drift. Squash merge completed at
  `c29e1fe764f3928051e2db443c439e946aae7680` on 2026-06-27T20:20:06Z by
  `giodl73-repo`; completion comment:
  https://github.com/openclaw/openclaw/pull/95868#issuecomment-4821232632.
  Wrapper cleanup left `C:\src\openclaw-prflow\.worktrees\pr-95868` because it
  was checked out, and `openclaw-prflow` still has preexisting local edits in
  `scripts/pr` and `scripts/pr-lib/merge.sh` that were not touched here.
- 2026-06-27 OpenClaw #95877 ready refresh: created
  `C:\src\openclaw-prflow\.worktrees\pr-95877`, restacked
  `feeds-hosted-catalog-snapshot-cache` onto current `origin/main` after
  #95868 merged, and cherry-picked the two PR-owned commits. Codex review
  found a real validator issue in the snapshot fallback: conditional callers
  could receive a URL-matching but stale snapshot after the caller's `ETag` /
  `Last-Modified` validators changed. Fixed by passing request validators into
  every snapshot fallback path and rejecting mismatched cached snapshot
  metadata before checksum/schema acceptance. Local validation passed targeted
  `pnpm exec oxlint --deny-warnings`, targeted `pnpm exec oxfmt --check`,
  `git diff --check`, and
  `CI=1 node scripts/test-projects.mjs src/plugins/official-external-plugin-catalog.test.ts`
  with 33 tests. Final `codex review --base origin/main` reported no
  actionable correctness issues. Force-with-lease pushed current head
  `5f71635bbafe75c8109248da66b297b8ee4f9657` to the same-repo OpenClaw branch,
  updated the PR body with current proof, marked #95877 ready, and queued
  `@clawsweeper re-review` at
  https://github.com/openclaw/openclaw/pull/95877#issuecomment-4821515389.
  Live state immediately after: ready/open, approved, merge state `UNSTABLE`
  while fresh checks run, stale labels still include `status: needs proof` and
  `rating: silver shellfish` until ClawSweeper refreshes.
- 2026-06-27 OpenClaw #95877 proof refresh: ClawSweeper settled on exact head
  `5f71635bbafe75c8109248da66b297b8ee4f9657` with patch quality
  `platinum hermit` but kept `status: needs proof` because the PR body only
  showed mocked fetch/in-memory store proof. Ran a live source harness with
  `node --import tsx -` from
  `C:\src\openclaw-prflow\.worktrees\pr-95877` against
  `https://clawhub.ai/v1/feeds/plugins`, using a file-backed snapshot store at
  `C:\tmp\openclaw-feeds-proof\pr95877-live-snapshot\official-external-plugin-catalog.snapshot.json`.
  First load returned `source: hosted`, status 200, 59 entries,
  `clawhub-official` sequence 16, ETag
  `"sha256:cf3d85c1d6ede1907ca265e9b214ac6ff1c715c90c30ec65e8017addb590e32d-gzip"`,
  and checksum
  `sha256:cf3d85c1d6ede1907ca265e9b214ac6ff1c715c90c30ec65e8017addb590e32d`.
  Second conditional load sent that ETag as `If-None-Match`, received HTTP 304,
  validated the persisted snapshot, and returned `source: hosted-snapshot`
  with the same 59-entry feed. PR body was updated with the full terminal JSON
  proof and `@clawsweeper re-review` was queued at
  https://github.com/openclaw/openclaw/pull/95877#issuecomment-4821621465.
  ClawSweeper then refreshed the durable review on the same exact head: labels
  now show `proof: sufficient`, `rating: diamond lobster`, and
  `status: ready for maintainer look`; merge state is `CLEAN`, review decision
  is `APPROVED`, and GitHub checks are pass/skip. The remaining step is normal
  maintainer prepare/merge flow, not more proof repair.
- 2026-06-27 OpenClaw #95877 prepare/verify: live PR state before prepare was
  non-draft, approved, merge `CLEAN`, checks pass/skip, and ClawSweeper labels
  `proof: sufficient`, `rating: diamond lobster`, `status: ready for
  maintainer look` on exact head
  `5f71635bbafe75c8109248da66b297b8ee4f9657`. Ran the Windows wrapper from
  `C:\src\openclaw-prflow` using Git for Windows Bash. Initial
  `scripts/pr prepare-run 95877` stopped because full local `pnpm check` hit
  `npm-shrinkwrap.json is stale`; the same `pnpm check` failure reproduced on
  latest `origin/main` in the wrapper worktree, so this is baseline repo noise
  unrelated to #95877's two plugin catalog files. Filled and validated
  `.local/review.md` / `.local/review.json` with recommendation
  `READY FOR /prepare-pr` and zero findings. Then
  `OPENCLAW_TESTBOX=1 scripts/pr prepare-gates 95877` passed hosted exact-head
  gates at `2026-06-27T22:24:15Z`; `OPENCLAW_TESTBOX=1 scripts/pr
  prepare-push 95877` found the remote branch already at local prep head and
  skipped push; `scripts/pr merge-verify 95877` passed. Merge verify noted the
  branch is behind main, but drift is unrelated to prepared files and no
  critical infra drift was present.
- 2026-06-27 OpenClaw #95877 merged: after user approval, ran
  `scripts/pr merge-run 95877` from `C:\src\openclaw-prflow` using Git for
  Windows Bash. Merge verify rechecked the same unrelated behind-main drift and
  passed, then the wrapper squash-merged #95877. Live PR state is `MERGED`;
  merge commit `12685ee6b7520c1798e4f6f8f5c7cc60f56e8d55`, merged by
  `giodl73-repo` at `2026-06-27T22:26:50Z`; completion comment:
  https://github.com/openclaw/openclaw/pull/95877#issuecomment-4822397593.
  Wrapper cleanup warning: remote branch
  `openclaw/openclaw:feeds-hosted-catalog-snapshot-cache` was not deleted, and
  `C:\src\openclaw-prflow\.worktrees\pr-95877` remains because
  `pr-95877-prep` is checked out there.
- 2026-06-27 OpenClaw #95964 restack/proof refresh: created
  `C:\src\openclaw-prflow\.worktrees\pr-95964`, restacked the PR to current
  `origin/main` after #95877 merged, and cherry-picked only the PR-owned
  persistence commit. New head is `4d788d9774` on branch
  `feeds-hosted-catalog-persistent-snapshot`; force-with-lease replaced old
  live head `13b94e75db`. The restacked diff is limited to the SQLite-backed
  hosted snapshot store, loader wiring, focused tests, and generated state
  schema files; it no longer touches the hosted catalog JSON and preserves
  #95877's ETag/Last-Modified snapshot validator checks. Validation passed
  targeted `oxlint`, targeted `oxfmt --check`, `pnpm db:kysely:check`,
  `git diff --check`, focused catalog tests with 35 tests, and
  `codex review --base origin/main` with no actionable correctness issues.
  Live source proof against `https://clawhub.ai/v1/feeds/plugins` used isolated
  state directory `C:\tmp\openclaw-feeds-proof\pr95964-live-snapshot`: first
  load returned hosted feed `clawhub-official` sequence 16 with 59 entries and
  wrote `state/openclaw.sqlite`; second conditional load with the live ETag
  received HTTP 304 and returned `source: hosted-snapshot` from the persisted
  SQLite row. PR body was updated with this proof and `@clawsweeper re-review`
  was queued at
  https://github.com/openclaw/openclaw/pull/95964#issuecomment-4822614020.
  ClawSweeper refreshed the durable review on exact head `4d788d9774` at
  22:53 UTC and labels now show `proof: sufficient`, `rating: gold shrimp`,
  and `status: ready for maintainer look`. It found no concrete author-action
  repair. User accepted option 5 for the boundary: this PR is the durable cache
  layer only; persisted hosted feed bodies are inert snapshot material, not
  trusted install/search/startup/source authority, and later stack PRs must
  explicitly validate source profiles and feed trust rules before consuming
  persisted entries for marketplace behavior. PR body was updated with this
  maintainer boundary decision. The PR remains draft until the user explicitly
  asks to mark it ready.
- 2026-06-27 OpenClaw #95964 marked ready: after user approval, ran
  `gh pr ready 95964 --repo openclaw/openclaw`. Live PR is now non-draft at
  exact head `4d788d9774c8293e092d96412e5c6fe9dab4f0ad`, review decision
  `APPROVED`, and ClawSweeper labels `proof: sufficient`, `rating: platinum
  hermit`, `status: ready for maintainer look`. Marking ready triggered fresh
  GitHub checks, so merge state is temporarily `UNSTABLE` while ready checks
  complete.
- 2026-06-28 OpenClaw #95964 verify-ready: repaired ClawSweeper's Kysely
  guardrail finding by replacing raw `node:sqlite` snapshot-store reads/writes
  with shared-state Kysely sync helpers, committed
  `1f950286cda3eec6e46ba10283b3f8449d075be8`, then replayed the two PR-owned
  commits onto current `origin/main` after a wrapper sync produced an
  overbroad intermediate diff. The live PR head is now
  `372ec63c99779ef4522dbb666e60c1279f68e4ef` with the intended six-file diff
  only. Validation passed targeted oxfmt/oxlint, focused catalog tests,
  `pnpm db:kysely:check`, `pnpm lint:kysely`,
  `pnpm check:database-first-legacy-stores`, architecture/import-cycle/
  deprecated-api checks, `pnpm tsgo:core`, `git diff --check`, and
  `codex review --base origin/main` before the final replay. Live ClawHub
  source proof was refreshed in the PR body for the current head. GitHub
  checks are pass/skip after rerunning a transient `security-fast` 503 failure.
  ClawSweeper durable review refreshed on exact head `372ec63c99` with
  `proof: sufficient`, `rating: platinum hermit`, and `status: ready for
  maintainer look`; it still records the maintainer compatibility/security
  boundary decision. Local full `pnpm check` still fails only on the known
  baseline `npm-shrinkwrap.json is stale` guard, so hosted exact-head gates were
  used. `scripts/pr prepare-gates 95964`,
  `scripts/pr prepare-push 95964`, and `scripts/pr merge-verify 95964` passed;
  merge verify accepted behind-main drift limited to QA scenario YAML files.
  Do not run `scripts/pr merge-run 95964` without explicit user approval.
- 2026-06-28 OpenClaw #95964 merged: after user approval, ran
  `scripts/pr merge-run 95964` from `C:\src\openclaw-prflow` using Git for
  Windows Bash. The wrapper reran merge verification, accepted the same
  unrelated behind-main QA scenario YAML drift, and squash-merged the PR.
  Live PR state is `MERGED`; merge commit
  `d1b917120a47600d6bb361adcb6b933978ce6e39`, merged by `giodl73-repo` at
  2026-06-28T02:01:23Z. Completion comment:
  https://github.com/openclaw/openclaw/pull/95964#issuecomment-4824064143.
  Wrapper cleanup warnings: failed to delete remote branch
  `openclaw/openclaw:feeds-hosted-catalog-persistent-snapshot`, and
  `C:\src\openclaw-prflow\.worktrees\pr-95964` remains because
  `pr-95964-prep` is checked out there.
- 2026-06-28 OpenClaw #95969 merged: restacked and repaired the source-profile
  slice after #95964. Final prepared head
  `6dc6ca154c7f0000a6961a347a2d572a2493b8a6` fixes the CI lint URL assertion,
  fails closed on missing `state: available` / `publisher.trust: official`,
  keeps ClawHub artifact integrity off npm fallback metadata by omitting
  `npmSpec` for ClawHub-source candidates, validates manifest `sourceRef` even
  when top-level candidates exist, and narrows direct feed URL overrides back
  to `clawhub.ai`. Local validation passed targeted oxfmt/oxlint, focused
  catalog tests (44 tests), `pnpm tsgo:core`, `git diff --check`, and final
  `codex review --base origin/main` with no high-confidence correctness
  issues. Live proof on the final code path loaded
  `https://clawhub.ai/v1/feeds/plugins`, returned 59 hosted entries, normalized
  the Expedia `public-clawhub` hash to SRI, emitted no npm fallback for that
  ClawHub artifact hash, and found zero unknown source-ref entries. GitHub CI
  was pass/skip, ClawSweeper exact-head labels were `proof: sufficient`,
  `rating: platinum hermit`, and `status: ready for maintainer look`.
  `scripts/pr prepare-gates 95969`, `prepare-push`, and `merge-verify` passed;
  merge verify accepted unrelated behind-main drift in auto-reply/hook files.
  After user approval, `scripts/pr merge-run 95969` squash-merged the PR at
  merge commit `1b0766080a30bd976217bea0b2b87efba439734a`, merged by
  `giodl73-repo` at 2026-06-28T03:56:55Z. Completion comment:
  https://github.com/openclaw/openclaw/pull/95969#issuecomment-4824706106.
  Wrapper cleanup warnings: failed to delete remote branch
  `openclaw/openclaw:feeds-hosted-catalog-source-profiles`, and
  `C:\src\openclaw-prflow\.worktrees\pr-95969` remains because
  `pr-95969-prep` is checked out there. Next hosted stack PR is #95981, draft
  at `8b6fa2f51aa493bdd69dd569067bca108a9113d5`, base `main`,
  `mergeStateStatus: DIRTY`, no review decision, and stale proof-needed labels.
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
- 2026-07-01 OpenClaw hosted feed trust series ClawSweeper fixes applied:
  fixed the accepted duplicate trust-anchor finding across the stacked draft
  PRs and pushed the restacked branches. #98316 `feeds-trust-source-profiles`
  is now at `16cbe678ce`; it rejects malformed raw base64url Ed25519 public
  keys before permissive Node decoding, rejects duplicate signed-feed key IDs,
  rejects duplicate normalized public keys including raw-vs-PEM duplicates, and
  keeps the signed profile fail-closed before refresh enforcement. #98338
  `feeds-trust-refresh-state` is now at `3ce0cfafaf`; it rebases onto #98316
  and counts signature thresholds over unique normalized public-key material,
  with a regression proving two key IDs backed by the same key cannot satisfy
  `threshold: 2`. #98350 `feeds-trust-cli-visibility` is now at
  `3bda4dbcc3`, rebased onto the hardened refresh-state head. Validation
  passed for #98316:
  `node scripts/run-vitest.mjs src/config/schema.help.quality.test.ts src/config/zod-schema.marketplaces.test.ts src/plugins/official-external-plugin-catalog.test.ts`,
  targeted `oxlint`, targeted `oxfmt --check`, `git diff --check`, and final
  `codex review --base fork/feeds-trust-envelope-verifier` with no actionable
  findings. Validation passed for #98338: focused config/envelope/catalog
  Vitest, targeted `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:core`,
  `pnpm db:kysely:check`, `git diff --check`, and Codex review clean against
  `fork/feeds-trust-source-profiles`. Validation passed for #98350: focused
  CLI/envelope/config Vitest, targeted `oxlint`, targeted `oxfmt --check`,
  `pnpm tsgo:core`, `pnpm db:kysely:check`, `git diff --check`, and Codex
  review clean against `fork/feeds-trust-refresh-state`. PR bodies were updated
  with final heads/proof, and final `@clawsweeper re-review` comments were
  posted:
  https://github.com/openclaw/openclaw/pull/98316#issuecomment-4850220826,
  https://github.com/openclaw/openclaw/pull/98338#issuecomment-4850220837,
  and https://github.com/openclaw/openclaw/pull/98350#issuecomment-4850220843.
  Remaining expected review caveat: #98350 may still ask for real
  CLI/source-harness proof beyond mocked CLI runtime tests, even though the
  concrete duplicate trust-anchor security finding is fixed.
- 2026-07-01 second Codex review pass over the hosted feed trust stack was
  clean across all four OpenClaw draft PR diffs. Commands/results:
  `codex review --base origin/main` in
  `C:\src\openclaw-feeds-trust-envelope` found no discrete regression in
  #98299's Ed25519 helper extraction or envelope verifier; `codex review --base
  fork/feeds-trust-envelope-verifier` in
  `C:\src\openclaw-feeds-trust-source-profiles` found the #98316 signed config
  and fail-closed behavior internally consistent; `codex review --base
  fork/feeds-trust-source-profiles` in
  `C:\src\openclaw-feeds-trust-refresh-state` found no high-confidence
  regressions in #98338's signed verification, snapshot trust persistence, or
  state schema updates; `codex review --base fork/feeds-trust-refresh-state` in
  `C:\src\openclaw-feeds-trust-cli-visibility` found no actionable issues in
  #98350's marketplace trust-state visibility changes.
- 2026-07-01 OpenClaw hosted feed trust stack feedback pass: checked live PR
  state for #98299, #98316, #98338, and #98350 and did not merge anything.
  #98299 is still draft/open, clean, `proof: sufficient`, platinum, and ready
  for maintainer/security look. #98338 is still draft/open with sufficient
  proof and no concrete contributor repair left; remaining concern is
  maintainer/security approval of the signed-feed trust boundary and stack
  order. #98316 and #98350 still had stale ClawSweeper `needs proof` labels
  after the duplicate trust-anchor fixes, so added fresh proof to the PR
  bodies and requested re-review. #98316 now includes source-harness output
  proving valid signed config acceptance, malformed raw-key rejection,
  duplicate trust-anchor rejection, and selected signed-profile no-fetch
  fail-closed behavior. #98350 now includes real CLI output from isolated
  `OPENCLAW_HOME` / `OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH` runs of
  `node scripts/run-node.mjs plugins marketplace refresh --feed-profile
  proof-signed --json` and `node scripts/run-node.mjs plugins marketplace
  entries --feed-profile proof-signed --json`, using a generated Ed25519 key
  and a public proof branch
  `giodl73-repo/openclaw:feeds-trust-cli-proof-feed`; both command outputs
  showed `source: hosted`, one entry, and signed trust state
  `signedBy: clawhub-proof-root`, `signatureCount: 1`, `threshold: 1`.
  Re-review comments:
  https://github.com/openclaw/openclaw/pull/98316#issuecomment-4861157694 and
  https://github.com/openclaw/openclaw/pull/98350#issuecomment-4861157794.
  ClawSweeper acknowledged both new requests, but durable review labels had
  not refreshed yet at the last live check: #98316 and #98350 were both
  draft/open and clean, still labeled `status: needs proof`.
- 2026-07-01 ClawHub product-side account feed design pack started in
  `projects/feeds/clawhub-account-feeds/`. Created an index plus five
  PR-sized working drafts: `account-feed-model-api.md`,
  `claim-official-state.md`, `follow-graph-notifications.md`,
  `profile-discovery-surfaces.md`, and `registry-scan-bridge.md`. These are
  claws-hapi working designs first; after review against the ClawHub repo shape,
  promote them into ClawHub as formal design docs or implementation PRs. The
  key boundaries captured are: account feed authenticity requires signed
  ClawHub envelopes; publisher identity, official state, OpenClaw registry
  inclusion, local approval, following, scans, and package artifact integrity
  remain separate gates.
- 2026-07-01 reviewed the ClawHub account feed design pack against
  `.craft/roles/claws` lenses: founder/community, skill-author/new-hire,
  CISO/compliance, UX, and platform operations. Added role-review acceptance
  requirements across the pack: lightweight ordinary publishing; distinct
  labels for follow/verified/official/OpenClaw reviewed/locally approved;
  audit events for claims, official-state transitions, key changes, exports,
  scans, and revocations; API pagination/idempotency/replay/rate-limit
  contracts; and registry exports that carry explicit facts rather than inferred
  trust.
- 2026-07-01 corrected the ClawHub account feed design pack scope to be
  OpenClaw-only. Removed Microsoft/MOS3/tenant framing from
  `projects/feeds/clawhub-account-feeds/`; OpenClaw registry review, OpenClaw
  scans, local approval, ClawHub official state, and install eligibility are now
  the separated signals in those drafts.
- 2026-07-01 ClawHub account-feed PR stack started in `C:\src\clawhub`. Opened
  draft PR #2948, https://github.com/openclaw/clawhub/pull/2948, from
  `giodl73-repo:account-feed-model-api` with the first spec slice:
  `specs/account-feeds.md` plus `specs/README.md` index entry. Scope is the
  account/publisher feed model, draft API shape, feed metadata, signing/cache
  boundaries, OpenClaw trust separation, author experience, audit requirements,
  and open questions. Local validation passed `git diff --check` and a scoped
  banned-term scan for Microsoft/MOS3/tenant wording; `bun run format:check`
  could not run because `bun` is not installed in this Windows shell.
- 2026-07-01 Codex review for ClawHub PR #2948 passed clean:
  `codex review --base origin/main` in `C:\src\clawhub` reported no discrete
  correctness issue in the docs-only spec/index diff.
- 2026-07-01 opened ClawHub draft PR #2949,
  https://github.com/openclaw/clawhub/pull/2949, from
  `giodl73-repo:claim-official-state` with the second spec slice:
  `specs/claim-official-state.md` plus `specs/README.md` index entry. Scope is
  claim, verification, official, suspension, revocation, transition, display,
  feed, and audit state boundaries while preserving `specs/official-publishers.md`
  as the existing official publisher policy source. Local validation passed
  `git diff --check` and scoped banned-term scan; `bun run format:check` could
  not run because `bun` is not installed in this Windows shell.
- 2026-07-01 Codex review for ClawHub PR #2949 passed clean:
  `codex review --base origin/main` in `C:\src\clawhub` reported no introduced
  inconsistency or actionable defect in the docs-only spec/index diff.
- 2026-07-01 opened ClawHub draft PR #2950,
  https://github.com/openclaw/clawhub/pull/2950, from
  `giodl73-repo:follow-graph-notifications` with the third spec slice:
  `specs/follow-graph-notifications.md` plus `specs/README.md` index entry.
  Scope is follow/unfollow semantics, stable follow identity, notification
  events/rules, search/discovery boundaries, privacy, abuse controls, and
  replay/backfill. Local validation passed `git diff --check` and scoped
  banned-term scan; `bun run format:check` could not run because `bun` is not
  installed in this Windows shell. Codex review passed clean:
  `codex review --base origin/main` reported no actionable correctness issues
  in the docs-only spec/index diff.
- 2026-07-01 opened ClawHub draft PR #2951,
  https://github.com/openclaw/clawhub/pull/2951, from
  `giodl73-repo:profile-discovery-surfaces` with the fourth spec slice:
  `specs/profile-discovery-surfaces.md` plus `specs/README.md` index entry.
  Scope is account/publisher profile and feed pages, search/discovery filters,
  trust/state label display rules, empty/restricted states, feed-page behavior,
  accessibility copy, and open product questions. Local validation passed
  `git diff --check` and scoped banned-term scan; `bun run format:check` could
  not run because `bun` is not installed in this Windows shell. Codex review
  passed clean: `codex review --base origin/main` reported no discrete
  correctness, security, or maintainability issue in the docs-only spec/index
  diff.
- 2026-07-01 opened ClawHub draft PR #2953,
  https://github.com/openclaw/clawhub/pull/2953, from
  `giodl73-repo:registry-scan-bridge` with the fifth spec slice:
  `specs/registry-scan-bridge.md` plus `specs/README.md` index entry. Scope is
  the bridge between explicit ClawHub feed facts and OpenClaw registry review,
  scan state, reflected status, retry/withdrawal/resubmission behavior, audit
  requirements, and install-eligibility boundaries. Local validation passed
  `git diff --check` and scoped banned-term scan; `bun run format:check` could
  not run because `bun` is not installed in this Windows shell. Codex review
  passed clean: `codex review --base origin/main` reported no actionable
  correctness, security, or maintainability issues in the docs-only spec/index
  diff. Initial `playwright-local-auth / publish-generated-card` failed on a
  Convex `skills:listVersions` timeout unrelated to the docs diff; reran failed
  jobs and the shard passed. Live PR state after rerun: draft/open at
  `b5c58679`, all GitHub Actions checks green, with only the Vercel preview
  status failing because the fork deployment needs OpenClaw Foundation team
  authorization.
- 2026-07-01 ClawHub account-feed design pack live pass: checked draft PRs
  #2948, #2949, #2950, #2951, and #2953. #2948, #2950, and #2953 have all
  GitHub Actions checks green, with only Vercel preview auth failures from fork
  deployment authorization. #2949 and #2951 still show stale failed
  `playwright-local-auth / account-cleanup` rollups; rerun attempts as both
  `giodl_microsoft` and `giodl73-repo` failed with GitHub's `Must have admin
  rights to Repository` response, so a repo admin must rerun or the branch must
  get a new commit to retrigger. #2951 also had a ClawSweeper proof ask; updated
  the PR body with explicit `git diff --check` / scoped banned-term scan /
  missing-`bun` proof output and posted `@clawsweeper re-review` at
  https://github.com/openclaw/clawhub/pull/2951#issuecomment-4860853516.
- Decide whether Scout catalog publishing still needs any follow-up beyond the
  landed Lobster #3305 workflow and ClawPilot #3613 local publish path.
- Decide when Scout Desktop client consumption should switch from local/file
  feed URL proof to the Lobster hosted approved-feed endpoint from #3236.
- Review `mos3-feed-composition-position.md` and
  `mos3-feed-composition-architecture.md` with MOS3/shared registry partners.
- Review `mos3-feed-contract-standard.md`, `mos3-feed-admin-experience.md`, and
  `mos3-feed-client-conformance.md` after the position is accepted.
