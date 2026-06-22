# Feeds Project

Feeds work spans OpenClaw native feed support and Lobster Scout feed
integration. This folder is the active index; old wave docs remain source
material.

## OpenClaw Active PRs

| PR | Branch | Status | Purpose |
| --- | --- | --- | --- |
| [#95846](https://github.com/openclaw/openclaw/pull/95846) | `feeds-hosted-catalog-prep` | Draft open, opened 2026-06-22 at `44c0884c3ed`; based on current `main`; focused tests/format/lint passed locally | First RFC 19 implementation prep slice: reshape the bundled official external plugin catalog into a feed-shaped local fallback while preserving current behavior. No hosted fetch, auth, signed envelope, regional selection, SQLite cache, search, or skills behavior yet. |
| [#95868](https://github.com/openclaw/openclaw/pull/95868) | `feeds-hosted-catalog-fetch` | Draft open, commit `50bb65f1c9b`; stacked after #95846; local format/lint/focused tests/typecheck and Codex review passed | Add guarded hosted catalog fetch from `register.openclaw.ai` with conditional headers, bounded response reads, checksum metadata, schema validation, and bundled fallback. No persistent snapshot store yet. |
| [#95877](https://github.com/openclaw/openclaw/pull/95877) | `feeds-hosted-catalog-snapshot-cache` | Draft open, commit `accc57e1e5d`; stacked after #95846/#95868; merge state clean; local format/lint/focused tests/typecheck and Codex review passed | Add the last-known-good snapshot fallback contract for the hosted catalog loader. Validates cached body checksum/schema and preserves `expectedSha256` pinning before using a snapshot; falls back to bundled catalog when no valid snapshot exists. |
| [#88732](https://github.com/openclaw/openclaw/pull/88732) | `feeds-native-search-default` | Draft open, updated 2026-06-19 to `c487721eafb`; mergeable; native search docs/import/policy evidence fixes pushed; PR body has real skills/plugins feed-search proof; stale `needs proof` label awaiting ClawSweeper refresh and maintainer trust/default approval | Native feed search defaults. |
| [#87827](https://github.com/openclaw/openclaw/pull/87827) | `feeds-lifecycle-tooling` | Draft open, updated 2026-06-19 to `47aabc7bcd`; mergeable; deterministic build and URL validate/hash findings fixed; PR body has real lifecycle CLI proof; stale `needs proof` label awaiting ClawSweeper refresh | Feed lifecycle tooling. |
| [#87826](https://github.com/openclaw/openclaw/pull/87826) | `feeds-policy-conformance-4pr` | Draft open, rebased, merge clean | Feed catalog policy conformance. |
| [#87825](https://github.com/openclaw/openclaw/pull/87825) | `feeds-approved-installs` | Draft open, rebased, merge clean | Install approved feed entries. |
| [#87824](https://github.com/openclaw/openclaw/pull/87824) | `feeds-read-only-discovery` | Draft open, updated 2026-06-19 to `57d27be40d`; mergeable; SSRF guard and remote body-cap findings fixed; PR body has real `openclaw feeds` CLI proof; ClawSweeper re-review queued | Read-only feed discovery. |

## Lobster Active PRs

| PR | Branch | Status | Purpose |
| --- | --- | --- | --- |
| [#1939](https://microsoft.ghe.com/bic/lobster/pull/1939) | `user/giodl/scout-feeds-docs` | Merged into `main` at `6d70078e` on 2026-06-17 | Mainline landing PR for the full Scout feeds stack. |
| [#1941](https://microsoft.ghe.com/bic/lobster/pull/1941) | `user/giodl/scout-feeds-contract` | Merged into stack base `user/giodl/scout-feeds-docs`; lands in `main` through #1939 | Add Scout feed contract. |
| [#1944](https://microsoft.ghe.com/bic/lobster/pull/1944) | `user/giodl/scout-feeds-cli` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `9d44a5a0` | Add local Scout feed CLI with approved-feed skill install slice. |
| [#3170](https://microsoft.ghe.com/bic/lobster/pull/3170) | `user/giodl/scout-feeds-mos3-adapter` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `3672639f` | Import MOS3 catalog export snapshots into Scout feeds. |
| [#3221](https://microsoft.ghe.com/bic/lobster/pull/3221) | `user/giodl/scout-feeds-live-mos3` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `ef345689` | Import live MOS3 acquisitions into Scout feeds. |
| [#3236](https://microsoft.ghe.com/bic/lobster/pull/3236) | `user/giodl/scout-feeds-hosted-effective-feed` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `d84abde3` | Host a signed tenant-admin-approved Scout feed at `/v1/scout/feeds/approved.json`. |
| [#3238](https://microsoft.ghe.com/bic/lobster/pull/3238) | `user/giodl/scout-feeds-personal-publishing` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `d670cf41` | Add a user-scoped personal Scout feed projection at `/v1/scout/feeds/personal.json`. |
| [#3240](https://microsoft.ghe.com/bic/lobster/pull/3240) | `user/giodl/scout-feeds-mos3-auth` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `dd37d698` | Add MOS3 environment and delegated token-scope mapping for Scout feed runtime auth. |
| [#3256](https://microsoft.ghe.com/bic/lobster/pull/3256) | `user/giodl/scout-feeds-live-personal-mos3` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `e2d6765c` | Serve live MOS3 acquisitions through `/v1/scout/feeds/personal.json` with file-backed fallback preserved. |
| [#3264](https://microsoft.ghe.com/bic/lobster/pull/3264) | `user/giodl/scout-feeds-personal-client` | Merged into stack base `user/giodl/scout-feeds-docs` at merge commit `70db2571` | Add `scout feed fetch` so the Scout CLI can download an authenticated hosted feed, verify attestation, and save it for local search. |
| [#3272](https://microsoft.ghe.com/bic/lobster/pull/3272) | `user/giodl/scout-feeds-personal-local-publish` | Merged into `main` at `c61bba02` on 2026-06-18 | Add `scout feed publish-local` to create or update an attested personal feed from a local skill artifact. Took review feedback for scope validation, expected/actual scope errors, shared feed id construction, and atomic feed writes. |
| [#3273](https://microsoft.ghe.com/bic/lobster/pull/3273) | `user/giodl/scout-feeds-mos3-publish-write` | Merged into `main` at `e291f3d8` on 2026-06-18 | Add `scout feed publish-mos3` and a MOS3 package publish client for `POST /builder/v1/users/packages`, including direct `--skill <path>` packaging before upload and cleanup of generated temp zips. Latest fix hardens temp-package cleanup tests against parallel CI by checking per-test package prefixes. |
| [#3305](https://microsoft.ghe.com/bic/lobster/pull/3305) | `user/giodl/scout-feeds-publishing-workflow-main` | Merged into `main` at `b129b5dc` on 2026-06-18 | Add Scout catalog publishing workflow: import feed entries into a tenant review catalog, approve/reject/deny/list/validate/update entries, and publish approved entries back into an attested tenant-approved feed. |
| [#3345](https://microsoft.ghe.com/bic/lobster/pull/3345) | `user/giodl/scout-feeds-personal-openclaw-install` | Merged into `main` on 2026-06-18 | Allow `scout feed install` to install from attested personal feeds as the user's portable skill library, including hosted personal skill artifacts, while preserving tenant-approved feeds as the enterprise marketplace lane. Root and baseline feeds remain non-installable. |
| [#3353](https://microsoft.ghe.com/bic/lobster/pull/3353) | `user/giodl/scout-feeds-hosted-personal-artifacts` | Merged into `main` on 2026-06-18 | Add Lobster-hosted content-addressed personal skill artifact storage for the personal feed lane, plus `publish-local --artifact-dir --artifact-base-url` to emit hosted artifact URLs. |
| [#1946](https://microsoft.ghe.com/bic/lobster/pull/1946) | `user/giodl/scout-feeds-clawhub-adapter` | Merged into `main` on 2026-06-19 at merge commit `2e67898e` | Import ClawHub snapshots into Scout feeds. Latest head accepts native package catalog snapshots and digest wrappers. This is a replaceable snapshot adapter until the OpenClaw RFC hosted-feed format lands. |
| [#3368](https://microsoft.ghe.com/bic/lobster/pull/3368) | `user/giodl/scout-feeds-web-ux` | Open, non-draft at `8d4f43555`; mergeable; ADO PullRequest `168850652` and Build Validation `168850649` in progress; GitHubPop failing for Proof of Presence; review still changes-requested pending refresh | Add the Lobster web `/feeds` page for personal and tenant-approved feed search, plus a personal publish panel. Latest head gates the UX behind ECS, gates local publish behind an explicit env flag, limits URL override to dev/localhost, keeps direct `/feeds` loads alive while flags resolve, handles MOS3 pending publish copy, preflights MOS3-backed publish storage, serializes artifact write/feed cleanup under the feed lock, and verifies stale-lock token claims. Tenant-admin source composition and ClawHub approval UX remain follow-up work. |

## Scout Desktop / ClawPilot Active PR

| PR | Branch | Status | Purpose |
| --- | --- | --- | --- |
| [#3542](https://github.com/gim-home/m/pull/3542) | `user/giodl/scout-desktop-mos3-feed` | Open, non-draft at `2cad1e40`; all visible checks green; review required | Temporary Scout Desktop feed/MOS3 snapshot bridge into the Extensions catalog, now with multi-feed loading, opt-in live Lobster prod profiles for 301 EUS and 302 US, automatic Scout Desktop Weave app-token auth when no explicit feed bearer token is configured, silent catalog loading, per-feed failure isolation, and trusted install URL handling. |
| [#3613](https://github.com/gim-home/m/pull/3613) | `user/giodl/scout-desktop-personal-feed-publish` | Open, non-draft at `f526c9f4`, stacked after #3542; Buddy shards in progress after force-push; review required | Publish local Scout Desktop skills into an attested personal Scout feed JSON file via the same `SCOUT_DESKTOP_PERSONAL_FEED_PATH` the catalog loader reads, with optional publish-path override for dev/CI, and install local `file://` personal feed entries only from local feed files. |

PR #3542 is the Scout Desktop consumer-side bridge for the feeds stack. It loads
a normalized Scout feed from `SCOUT_DESKTOP_FEED_PATH` or
`SCOUT_DESKTOP_FEED_URL`, or a raw MOS3 snapshot from
`SCOUT_DESKTOP_MOS3_SNAPSHOT_PATH` or `SCOUT_DESKTOP_MOS3_SNAPSHOT_URL` with
optional `SCOUT_DESKTOP_MOS3_BEARER_TOKEN`. The bridge exposes feed entries
through `extensions-catalog:list` and merges skill entries into the Extensions
catalog. Feed skills are installable only when the entry includes an HTTP(S)
skill URL. PR commit `f32f0203` accepts `installUrl` or `install_url` on a
Scout feed entry/source and common MOS3 snapshot aliases such as `skillUrl`,
`artifactUrl`, `packageUrl`, `blobUrl`, and `downloadUrl`; otherwise entries
render as metadata-only. PR commit `8e72c258` verifies Scout feed attestations
when present and maps MOS3 `public_skill_path` / `publicSkillPath` into
`metadata["mos3.publicSkillPath"]`, making Lobster #3170/#3221 feed output
installable when that value is an HTTP(S) skill URL.
PR commit `aada9c3e` adds explicit personal feed aliases:
`SCOUT_DESKTOP_PERSONAL_FEED_PATH`, `SCOUT_DESKTOP_PERSONAL_FEED_URL`, and
`SCOUT_DESKTOP_PERSONAL_FEED_BEARER_TOKEN`, plus
`SCOUT_DESKTOP_FEED_BEARER_TOKEN` as the generic feed-token fallback. This lets
Scout Desktop consume Lobster's user-scoped `/v1/scout/feeds/personal.json` as
a normalized Scout feed rather than treating it as a raw MOS3 snapshot.
PR commit `0c4e1a93` rebases #3542 onto current `main`, fixes the bridge to
load tenant-approved and personal feed sources together, and adds
`SCOUT_DESKTOP_FEED_ENV=prod-301eus` / `prod-302us`. The 301 profile points at
`https://lobster.eus-ia301.gateway.prod.island.powerapps.com/v1/scout/feeds/{approved,personal}.json`;
the 302 profile points at
`https://lobster.us-ia302.gateway.prod.island.powerapps.com/v1/scout/feeds/{approved,personal}.json`.
PR commit `427abffc` wires those live prod profiles through the existing Scout
Desktop Weave app-token helper when no explicit feed bearer token is configured,
so the demo path is app sign-in plus `SCOUT_DESKTOP_FEED_ENV`, not manually
pasting a token. It also adds renderer action coverage proving an installable
feed-backed skill calls `skillsAPI.importUrl(...)` with the feed entry's skill
URL.
PR commit `2cad1e40` addresses review feedback by making catalog loads
silent-only for app-token auth, isolating failures across configured feeds,
rejecting remote `file://` or cross-host install URLs, preserving already
installed feed skill state, and documenting the Scout feed bridge. Focused
node/unit tests, format, lint, type-aware lint, `git diff --check`, and Codex
review all passed locally.

PR #3613 is the Scout Desktop publish-side follow-up. It adds
`skills:publish-personal`, a Publish button for local skill detail dialogs, and
an attested feed writer that publishes local skill metadata plus a deterministic
directory hash into `SCOUT_DESKTOP_PERSONAL_FEED_PATH`. Optional
`SCOUT_DESKTOP_PERSONAL_FEED_TENANT_ID_HASH`,
`SCOUT_DESKTOP_PERSONAL_FEED_USER_ID_HASH`, and
`SCOUT_DESKTOP_PERSONAL_FEED_PUBLISHER` values scope and label the feed. This
is local personal-feed publication only; direct MOS3 write-back remains a later
step. PR commit `fd37837e` also allows local `file://.../SKILL.md` entries
published into the personal feed to be treated as installable by the feed
consumer and imported through the existing skill import IPC path.
After #3542's app-token update, #3613 was rebased and force-pushed at
`f526c9f4`. The latest commit addresses review feedback by keeping remote feeds
from driving local file reads, moving publish env resolution behind a tested
helper, making publish use the same personal feed path the catalog loader reads
by default, and preserving installed-state matching when feed titles differ from
skill names. Focused node/unit tests, format, lint, type-aware lint, `git diff
--check`, and Codex review all passed locally.

This PR intentionally does not implement live MOS3 Discovery, WAM/MSAL scope
selection, MOS3 acquisition, or MOS distributed tracing. Direct MOS3 client work
should be a follow-up that uses Discovery plus the MOS3 environment scope table.
It is aligned with Lobster PRs #3170 and #3221: #3170 converts MOS3 catalog
exports into Scout feeds, #3221 imports live MOS3 acquisitions into Scout
feeds, and #3542 proves Scout Desktop can consume a feed or snapshot and
surface skills. Runtime install remains owned by the consumer. Lobster PR #3236
now provides the hosted tenant-approved feed route
`/v1/scout/feeds/approved.json`; until #3236 lands, Desktop can continue to
consume a file or static URL feed via `SCOUT_DESKTOP_FEED_PATH` /
`SCOUT_DESKTOP_FEED_URL`. Lobster PR #3238 adds the next stacked projection for
per-user personal feeds at `/v1/scout/feeds/personal.json`.

## Source Notes

- `openclaw-feeds-rfc-meeting-2026-06-17.md`
- OpenClaw RFC direction from the Vince/Patrick/OpenClaw meeting: feeds should
  be framed first as a plugin distribution and governance model. The core value
  is uniform enterprise control for plugins across companies and clients:
  enable, block, approve, curate, update, and audit through a feed contract
  rather than client-specific marketplace logic. ClawHub remains the community
  and public registry/feed source; Microsoft/MOS3 can augment that source by
  curating and composing ClawHub plus other inputs into an enterprise-approved
  feed for tenant/admin-managed consumption. Patrick is expected to add ClawHub
  details after the initial RFC PR is opened.
- `mos3-feed-composition-position.md`
- `mos3-feed-working-group-brief.md`
- `mos3-feed-composition-architecture.md`
- `mos3-feed-contract-standard.md`
- `mos3-feed-admin-experience.md`
- `mos3-feed-client-conformance.md`
- `mos3-feed-npm-leverage.md`
- `mos3-feed-npm-authoring.md`
- `skills-marketplace-feeds-architecture.md`
- `.craft/waves/260528+hapi-the-bringer+openclaw-feeds/`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/enterprise-feeds.md`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/enterprise-feeds-wave-plan.md`

## Aether MOS3 Review

The latest Aether pull shows MOS3 usage has moved beyond a simple snapshot
shape. `Mos3CatalogClient` now models acquisitions, marketplace browse, shared
titles, owned titles, acquire/unacquire, title preview, skill file download,
package validation, package publish, ACL, and owner operations. Live MOS3 work
for Lobster should reuse those contracts as the reference shape instead of
inventing a new feed-only API boundary.

Key alignment points for the post-#3170 live MOS3 PR: use MOS3 environment
discovery before calling titles APIs; mint a MOS3-scoped OBO token for the
selected titles host; pass `client-request-id`; preserve `traceresponse` and
diagnostic headers for support; request `AgentSkills` and `AgentConnectors`;
preserve `titleId`, `assetId`, `appId`, `acquisitionContext`,
`canBeUnacquired`, `blockStatus`, `scope`, `acquisitionState`, skill
`blob_path` and `public_skill_path`, connector `auth.referenceId`,
`remoteMcpServer.mcpServerUrl`, and title `validDomains`.

Partner-facing wording should call #3170's input a "MOS3 catalog export" or
"MOS3 catalog snapshot export". "MOS3 snapshot" remains our local adapter term,
not a confirmed MOS3 product noun.

## Next

- Keep OpenClaw feed primitives separate from Lobster Scout publishing choices.
- Lobster #3272 and #3273 are now merged into `main`; the local and MOS3
  personal-feed publish arc is landed.
- Lobster #3305 is merged into `main`; Scout catalog review and approved-feed
  publishing are landed.
- Lobster #3345 is merged into `main`; personal feeds can now install into an
  OpenClaw enlistment. Lobster PR #3353 is now open for Lobster-hosted personal
  artifact bytes for portable personal feed entries.
- Lobster PR #3368 is open for the first Scout feeds web UX: search personal
  and tenant-approved feeds, and publish local `SKILL.md` content into the
  caller's Lobster-hosted personal feed. Latest head `4a3df009b` adds the
  durable-storage ack gate, shared per-feed lock with stale-lock recovery,
  temp-file feed writes, and `/feeds` rail-route coverage. Required ADO builds
  are queued as PullRequest `168778939` and Build Validation `168778937`.
  Remaining PR state is waiting on CI and dspektor re-review of the durable
  storage fix. The next UX/backend slice should be tenant-admin source
  composition, including ClawHub source approval and effective-feed publishing
  controls.
- Follow up ClawPilot PR #3542 for review; visible checks are green at
  `2cad1e40`. For a live-prod demo, launch Scout Desktop with
  `SCOUT_DESKTOP_FEED_ENV=prod-301eus` after signing into the app.
- Follow up ClawPilot PR #3613 while ClawPilot Buddy shards run at `f526c9f4`;
  it is non-draft, stacked after #3542, and covers local personal-feed publish
  before direct MOS3 write-back.
- Do not put feed implementation prototypes in `claws-hapi`.
