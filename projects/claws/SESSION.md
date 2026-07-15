# Claws Session Context

## Agent Start

1. Read this file.
2. Read `projects/claws/README.md`.
3. Read `projects/claws/rfc-sketch.md`.
4. Read `projects/feeds/README.md` and
   `projects/feeds/user-shared-named-feeds-plan.md` when comparing to feeds.
5. Check live OpenClaw issue/PR state before making RFC claims.

## Baseline

- Area: Claws RFC.
- Primary repo: `openclaw/openclaw`.
- Local worktree: RFC worktree not present as of 2026-07-03; use the active
  OpenClaw worktree or create a dedicated RFC worktree before writing RFC text.
- Current branch: none.
- Main tracking file: `projects/claws/rfc-sketch.md`.
- Skills to use: `project-session`, `openclaw-pr-maintainer`, `gitcrawl` when
  available.

## Current Session

### 2026-07-14 Patrick review completion

- Patrick's review pass and the resulting ClawSweeper findings are implemented
  across the complete OpenClaw stack. The architecture remains the RFC's
  one-Claw-one-new-agent model; the repair pass hardened ownership, canonical
  owner delegation, read-only diagnostics/planning, and mutation-boundary
  concurrency rather than changing the product thesis.
- Final repaired OpenClaw chain:
  `#101328 39a9afb60ad` -> `#101755 223406487b3` ->
  `#101973 400298d36e6` -> `#102228 8c11734c566` ->
  `#102296 46d97677b2b` -> `#102306 b6ef82e81c1` ->
  `#102383 466714509e5` -> `#102406 b47c2c5da3a` ->
  `#102427 f0803441021` -> `#102959 c7c90c055f1` ->
  `#102982 64d377f9d72` -> `#106888 1e9569dbbf0`.
- The lower-stack mirror mismatch is fixed. `#101328` is fork-backed, while
  `#101755` uses the same-named OpenClaw branch as its base. The repaired
  `39a9afb60ad` head is now mirrored to that OpenClaw branch; the already
  repaired `#101755` and `#101973` heads were pushed to their OpenClaw branches.
  A live explicit-ref ancestry audit confirms every adjacent implementation
  head through `#102982` is now a direct descendant; `#106888` is fork-backed
  and directly descends from `#102982`.
- `#102982` now rejects expected workspace files that disappear or missing
  targets that appear after planning. Package updates atomically CAS the
  expected package row to a pending claim before invoking an installer,
  compensate that claim on failure/rollback, and reject concurrent ownership
  changes before external mutation. Validation passed: 59 focused update/CLI/
  owner/lifecycle tests including all 8 real lifecycle E2Es, full core
  typecheck, touched-file lint/format, conflict/diff checks, and clean
  `codex review --uncommitted`. Resolution comment:
  `https://github.com/openclaw/openclaw/pull/102982#issuecomment-4977049421`.
- `#106888` is restacked on the repaired update head. It is now a tight
  four-file `CLAW.md` input/export slice; it intentionally does not resurrect
  the local feed implementation removed by fail-closed planning. JSON reads
  remain compatible. Validation passed: 63 reader/export/CLI/lifecycle tests,
  all 8 real lifecycle E2Es, full core typecheck, lint/format/diff checks, and
  clean `codex review --base 64d377f9d72`. Resolution comment:
  `https://github.com/openclaw/openclaw/pull/106888#issuecomment-4977157123`.
- RFC PR `openclaw/rfcs#27` is at `dc56fa3`. It now uses the repository-required
  Summary/Motivation/Goals/Non-goals/Proposal/Rationale/Unresolved-questions
  structure; records canonical `CLAW.md` export plus JSON read compatibility;
  requires workspace-presence and package-ownership CAS at mutation time;
  specifies canonical agent deletion and sole unchanged `claw-installed`
  artifact uninstall; and lists all twelve OpenClaw PRs. Resolution comment:
  `https://github.com/openclaw/rfcs/pull/27#issuecomment-4980547900`.
- Fresh `@clawsweeper re-review` requests were posted on every head whose final
  repair or corrected base had not yet received a current review. Draft PRs
  remain draft. Do not treat stale `CHANGES_REQUESTED` bot reviews as current;
  inspect the durable ClawSweeper comment after the queued reruns complete.
- No Control UI implementation was added. Patrick explicitly accepted leaving
  it out during the experiment. The future standalone harness-agnostic
  `npx claws --agent openclaw|hermes` remains a separate project/spec decision.

### 2026-07-14 fresh-session handoff

- Last updated: 2026-07-14 America/Los_Angeles.
- Last agent: Codex.
- Current focus: finish Patrick/ClawSweeper repairs in stack order, starting
  with ownership-aware package cleanup in OpenClaw PR `#102296`.
- Package lifecycle PR `#102228` is pushed at `8c11734c566`. Patrick's six
  package findings are addressed: package decisions precede agent/workspace
  mutation, exact plugins reuse or conflict through shared preflight, root and
  package provenance is pending before external installers, package ownership
  records distinguish `claw-installed` from `preexisting`, JSON stdout stays
  machine-readable, and uninstall warnings survive version drift. Resolution
  comment:
  `https://github.com/openclaw/openclaw/pull/102228#issuecomment-4975724028`.
- Shared plugin preflight prerequisite PR `#107867` remains separate at
  `23300a476f4`; `#102228` currently contains the same helper commit because a
  fork-backed head cannot be used as an upstream stack base. Land or restack
  that prerequisite before final stack cleanup to avoid duplicate review
  surface.
- Status/remove PR `#102296` is restacked on repaired `#102228` and pushed at
  `4f0cd88bd47`. It now uses canonical `pruneAgentConfig`, atomically moves a
  managed file to a nonce staging path before digest/removal, and has a
  deterministic post-plan replacement test proving the replacement is
  retained. Direct core typecheck and seven focused lifecycle-state tests pass.
- Active worktree:
  `/root/src/openclaw-claws-pr6-lifecycle`, branch
  `user/giodl/claws-pr6-lifecycle`. Source worktree was clean at handoff. Its
  root `node_modules` is a local symlink to the healthy PR5 rebuild dependency
  tree because the original PR6 tree repeatedly triggered a stalled pnpm
  workspace install; invoke `node scripts/run-tsgo.mjs` and
  `node scripts/run-vitest.mjs` directly there.
- Remaining `#102296` work: extract a shared artifact lifecycle instead of
  adding Claw-specific uninstall code. The plugin adapter should delegate to
  existing `planPluginUninstall` / `uninstallPlugin`; contribute a canonical
  skill uninstall API with equivalent safety; Claws should invoke removal only
  for a sole, completed, unchanged `claw-installed` artifact. Pre-existing,
  shared, pending, modified, or ambiguous artifacts must be released but
  retained and reported. Do not post the PR-level Patrick resolution comment
  until this is implemented and verified.
- Downstream warning: `#102306` and all later Claws PR branches have not yet
  been restacked on repaired `#102296`. Finish PR6 first, then restack and
  address Patrick's remaining review findings in order: portable export
  (`#102306`), cron recovery/schema (`#102383`), MCP comparison/recovery/schema
  (`#102406`), provenance-defaulted update planning (`#102959`), then dependent
  update/CLAW.md heads.
- Blocking question: none. The agreed design is to contribute/refactor shared
  skill/plugin artifact lifecycle APIs and keep Claws as the provenance and
  final-reference policy caller.

### 2026-07-09 Patrick review update

### 2026-07-10 Control UI plugin-management impact

- Reviewed merged OpenClaw PR `#103176` (`feat: add Control UI plugin
  management`) and Patrick's `patrick.webp` analysis. The hosted RFC 0009 feed
  powers plugin/skill catalog discovery; installed MCP servers still come from
  local `mcp.servers`, and the Control UI MCP connector shelf remains a
  separately curated presentation surface.
- RFC PR `openclaw/rfcs#27` now makes that boundary normative: feeds discover
  plugin/skill packages, Claws compose exact package versions plus direct
  portable MCP declarations, and Claws do not define a connector catalog.
  It also requires CLI, Gateway, and Control UI uninstall paths to share
  Claw-reference warnings. RFC head is `fcc497d456a66ea5ae258578bf882d28bbcc42db`.
- The implementation stack was rebased onto current OpenClaw `main`
  `b7e7c27ef094de95947cfa637b5eecf906053038`. Bottom schema PR `#101328`
  now accepts a strict portable MCP union: stdio declarations or remote
  `sse`/`streamable-http` declarations with optional credential-free OAuth
  intent. Headers, tokens, client secrets, and completed OAuth state remain
  rejected. Head: `4ba6435fe0ddb0c08efff5afedb99b0c3ca7046d`.
- Package PR `#102228` moves Claw-reference discovery to a shared plugin
  uninstall helper used by the CLI and `uninstallManagedPlugin`, so the new
  Gateway/Control UI surface receives the same warning without turning
  provenance into an uninstall lock. Head:
  `ad96186c7e3f3c622b081e13c14e22a88611e306`.
- MCP PR `#102406` now installs, digests, exports, status-checks, and removes
  remote OAuth declarations as well as stdio declarations. Focused MCP/export/
  lifecycle tests passed (16 tests), and core typecheck passed. Head:
  `6c61f3c7f9287d1a751a557ecc5aad0b4c5d2f1f`.
- Restacked published heads through doctor: `#101755` `0d5051128fc`,
  `#101973` `92c5fc13bac`, `#102296` `93f51863427`, `#102306`
  `59f8ce33197`, `#102383` `d8d91d4e0b8`, and `#102427`
  `d1546122e546`. The in-progress `#102959` worktree was rebased onto the new
  doctor head; its untracked grouped update-planner files remain local.
- Focused validation passed 48 bottom schema/gate/CLI tests and 46 package/
  provenance/CLI/management-service tests. The only live red check is the
  unrelated label workflow on `#101755`: GitHub refuses to add a size label
  because the PR already has 100 labels; real behavior proof passes.
- PR `#102959` was rewritten and force-pushed as one grouped, agent-centric
  read-only update planner at `fac569fe76a73aa2b21008b3886948511d1761ea`
  (`Add grouped Claw update planning`). It adds
  `claws update <claw-or-agent> --from <source> --dry-run`, resolves package
  names only when unambiguous, compares agent/files/packages/MCP/cron by exact
  ownership and canonical digests, restores missing owned state, and marks
  operator drift or unresolved ownership as blocked manual work. Remote OAuth
  MCP declarations are covered. Validation passed 85 focused tests, core
  typecheck, and a real isolated add -> update dry-run round trip. PR title/body
  were refreshed to `Plan grouped Claw agent updates`.
- The broader PR11 pass corrected a stale offline cron-collision assertion in
  cron PR `#102383`, because scheduler collisions are owned by gateway
  `cron.add`, not dry-run local state. Restacked heads are `#102383`
  `63334bfe073`, `#102406` `76caf2cfbf8`, and `#102427` `d47b47c5adc`.
- PR `#102982` was rewritten and force-pushed at
  `af69df0dfacf9b2544af82bc937724a3d0a37931` (`Apply consented
  agent-only Claw updates`). It adds `claws update ... --yes` and
  `openclaw.clawUpdateResult.v1`, rebuilds the plan before mutation,
  compare-and-swaps the owned agent entry and root package/version/integrity
  record, preserves the original install timestamp, and rolls the config back
  if provenance fails while the written agent remains unchanged. Workspace,
  package-ref, MCP, and cron changes fail before mutation with
  `unsupported_update_actions`; future owner executors widen the same framework.
  Validation passed 90 focused tests, core typecheck, a real isolated
  add -> preview -> consented update -> status round trip, and a real remote MCP
  update rejection. PR title/body are `Apply consented agent-only Claw updates`.
- Final live stack audit: all eleven OpenClaw PR heads match their configured
  preceding stack bases and report successful required behavior/admission
  checks. `#101755` retains only the unrelated size-label workflow failure due
  GitHub's 100-label limit. RFC `#27` remains at `fcc497d456a6` and reports no
  configured checks.

- RFC PR `openclaw/rfcs#27` was rewritten around the principle that one Claw
  creates one complete new agent and workspace. It now uses grouped `agent`,
  `workspace`, `packages`, `mcpServers`, and `cronJobs` fields; keeps skills and
  plugins as portable packages; excludes credentials, bindings, providers, and
  runtime-specific account IDs; and renames the lifecycle verb from `apply` to
  `add`. Patrick's feedback was answered at
  `https://github.com/openclaw/rfcs/pull/27#issuecomment-4931913856`.
- RFC head: `5829ce30c1520e46d21f291d39866d2cb25d1d14` (`Revise Claws
  around agent ownership`). The RFC also defines the process-only experimental
  gate `OPENCLAW_EXPERIMENTAL_CLAWS=1`; disabled mode omits Claws from command
  registration, help, and completion without writing persistent config.
- Bottom OpenClaw PR `#101328` now includes the experimental CLI gate at
  `9a2b55625b73894d4d2761d93940731a93a03b14` (`feat(claws): gate
  experimental CLI`). Focused validation passed 190 tests across argv, schema,
  feed, CLI registry, root help, and lifecycle E2E. Direct root-help proof found
  zero `claws` entries with the env unset and one with it set.
- The previously reviewed 11-PR implementation stack remains prototype
  evidence and must be reshaped to the RFC before restacking. Start with the
  grouped manifest schema and `claws add --dry-run`, then propagate the new base
  through the descendants once that contract is stable.
- Bottom PR `#101328` was fully rewritten and pushed at
  `7f3bab34903639a51545291b6c2286c678695364` (`feat(claws): adopt
  grouped agent manifest`). It now validates schema version `1`, takes Claw
  identity from package metadata or explicit development identity, exposes
  `inspect` and `add --dry-run`, plans a new agent/workspace plus all grouped
  resources, and rejects the old flat/apply/feed CLI contract. PR title/body
  were refreshed. Validation passed 186 focused tests, lint, real CLI proof,
  help-gate proof, formatting, and conflict checks; full typecheck still reaches
  only the unrelated `src/secrets/config-io.ts` TS4058.
- PR `#101755` was rebased and repurposed as the second RFC slice, then
  force-pushed with lease at `f2f90aa72694a20428d10c7329106e512273ef84`
  (`feat(claws): create agent and install record`). `claws add --yes` now
  reserves one new workspace, appends one portable agent while preserving
  defaults/existing agents, rechecks config races, and persists one root
  `claw_installs` SQLite row. Declared files/packages/MCP/cron fail before
  mutation until their owner slices land. Validation passed 195 focused tests,
  lint, real config/SQLite proof, formatting, and conflict checks. PR title/body
  were refreshed to `Create Claw agent and root install record`.
- Next: rebase `#101973` / `user/giodl/claws-pr4-artifact-plan` onto `#101755`
  and rewrite it as confined bootstrap/supporting workspace file creation with
  managed hashes and partial-failure visibility.
- PR `#101973` was rebased, rewritten, squashed to one commit, and force-pushed
  with lease at `47facef73082edd1961f685f5fc3be93a967c630` (`feat(claws):
  create managed workspace files`). It now writes only declared bootstrap and
  supporting files into the newly created agent workspace, uses fs-safe rooted
  IO, revalidates source digests, never overwrites an existing destination, and
  persists each successful file immediately in `claw_workspace_files`. Later
  failures mark the root install partial while preserving earlier file refs.
  The prototype caller-selected workspace and managed overwrite/update behavior
  were removed. Validation passed 204 focused tests, lint, real CLI/config/file/
  SQLite proof, formatting, and conflict checks; full typecheck still reaches
  only the unrelated `src/secrets/config-io.ts` TS4058. PR title/body were
  refreshed to `Create Claw-managed workspace files`.
- PR `#102228` was rebased, rewritten, squashed to one commit, and force-pushed
  with lease at `e550a6d10ed56eea7c70f54bccb156a8e69cbb0f` (`Install ClawHub packages
  for new agents`). It installs exact-version ClawHub skills into the created
  agent workspace and plugins through the existing shared plugin lifecycle,
  records each successful package reference immediately in root SQLite, and
  returns partial state without rolling back prior resources if a later package
  fails. Shared plugin uninstall remains operator-controlled: referenced Claws
  produce a deduplicated warning but do not block removal. MCP and cron actions
  remain fail-closed for later slices. Validation passed `pnpm tsgo:core`,
  `pnpm tsgo:core:test`, focused Oxlint, 22 package/provenance/uninstall tests,
  and all 6 Claw lifecycle E2E tests. PR title/body were refreshed to `Install
  ClawHub packages for new Claw agents`; current checks have no pending or
  failing jobs.
- PR `#102296` was rebased onto rewritten `#102228`, rewritten, squashed to one
  commit, and force-pushed with lease at
  `d11434ddfe47010980aa09fe03f342c6ed5b5914` (`Add plan-first Claw status and
  remove`). It adds experimental agent-centric status plus read-only remove
  planning and separately consented apply. Remove blocks agent-config drift and
  unsafe files, deletes only unchanged managed files, preserves local edits,
  releases package references without uninstalling artifacts, and keeps the
  install ledger/package refs visible when cleanup becomes unsafe after config
  commit. Package identity resolves only unambiguous installs; final agent ids
  disambiguate repeated adds. Validation passed `pnpm tsgo:core`, `pnpm
  tsgo:core:test`, focused Oxlint, 18 status/remove CLI tests, and 7 lifecycle
  E2E tests including a real add/status/preview/remove round trip. PR title/body
  were refreshed to `Add plan-first Claw status and remove`; current checks
  have no pending or failing jobs.
- Next: rebase `#102306` / `user/giodl/claws-pr7-export` onto rewritten
  `#102296` and adapt export to the grouped package identity and one-agent
  provenance ledger.
- PR `#102306` was rebased onto rewritten `#102296`, rewritten, squashed to one
  commit, and force-pushed with lease at
  `06b1e172426d02fa1370a3f4f3c7087254905064` (`Export installed agents as
  grouped Claw packages`). It adds agent-id-only export, explicitly projects
  portable agent fields, copies only ledger-managed workspace files through
  rooted IO, emits exact recorded package refs, and writes package identity plus
  the grouped manifest and safe sidecars into a new directory. Published
  identity is retained; development identity becomes
  `openclaw-claw-<agent-id>`. Validation passed `pnpm tsgo:core`, `pnpm
  tsgo:core:test`, focused Oxlint, 17 export/CLI tests, and 8 lifecycle E2E
  tests including add -> export -> inspect -> add in a fresh state directory.
  PR title/body were refreshed to `Export installed agents as grouped Claw
  packages`; current checks have no pending or failing jobs.
- Next: repurpose redundant skill PR `#102383` / `user/giodl/claws-pr8-skills`
  as the missing agent-pinned cron-job slice, then keep `#102406` for MCP and
  `#102427` for doctor diagnostics.
- Local `user/giodl/claws-pr8-skills` has been rebased onto export commit
  `06b1e172426` with both obsolete generic skill-installer commits dropped; it
  currently equals its new base and has not been pushed. Cron mutation must use
  the gateway-owned `cron.add`/`cron.remove` API because direct offline store
  replacement can race a running gateway. The slice should inject that owner
  API into add/remove, pin jobs to the final agent id, and persist returned
  scheduler ids immediately for partial cleanup/status/export.
- PR `#102383` was repurposed, rewritten, and force-pushed with lease at
  `1549403834f8008f56670c92f2d07183d0b6ef7b` (`Manage Claw cron jobs through
  the gateway`). Grouped cron declarations now use gateway-owned `cron.add`
  with agent-scoped declaration keys, persist pending/complete/failed ownership
  before and after scheduler mutation, appear in status, round-trip through
  export, and are removed through `cron.remove` before agent config. Ambiguous
  pending/failed ownership blocks destructive cleanup. Validation passed
  `pnpm tsgo:core`, 27 cron/lifecycle/export/CLI tests, 9 provenance/add tests,
  the real gateway protocol validator, formatting, and `git diff --check`.
  Fresh-model `codex review --commit HEAD` could not start because the local
  CLI selected unsupported ChatGPT model `gpt-5.3-codex`; no model override was
  used. PR title/body were refreshed to `Manage Claw cron jobs through the
  gateway`.
- Next: rebase `#102406` / `user/giodl/claws-pr9-mcp` onto rewritten `#102383`
  and replace its obsolete flat artifact logic with grouped `mcpServers`
  ownership, conflict handling, status/remove/export, and secret-safe
  provenance through the existing validated MCP config boundary.
- PR `#102406` was rebased onto rewritten `#102383`, rewritten, and
  force-pushed with lease at `794cbe6445f7209019a2160b69847264f64282da`
  (`Manage Claw MCP server ownership`). Grouped MCP declarations now use the
  validated top-level MCP config writer with atomic create-only collision
  protection; provenance stores only agent/name/canonical digest, not server
  config. Status reports present/modified/missing/pending/failed ownership,
  export round-trips only unchanged declarations, and removal compare-checks
  live config before unsetting it ahead of cron and agent cleanup. Structured
  failures are non-owning; thrown writes remain pending and block destructive
  cleanup. Validation passed `pnpm tsgo:core`, focused Oxlint with zero
  findings, 46 focused tests, and all 8 lifecycle E2E tests including a real
  add -> status -> export -> remove MCP config round trip. Fresh-model `codex
  review --commit HEAD` again could not start because local Codex selected the
  unsupported ChatGPT model `gpt-5.3-codex`; no model override was used. PR
  title/body were refreshed and latest GitHub Real behavior proof plus
  admission/sanity checks pass.
- Next: review and adapt `#102427` / `user/giodl/claws-pr10-doctor` for the new
  ownership ledgers. Its single doctor commit rebased cleanly onto `#102406` as
  local commit `e9cc5e2e4ee`, but has not been validated or pushed; inspect it
  as old-model prototype evidence rather than assuming its flat diagnostics
  remain correct.
- PR `#102427` was rewritten into one commit and force-pushed with lease at
  `74a53bb9ac3d1ab15b8a0ba004d65d76daf0ceb1` (`Add experimental Claw lifecycle
  diagnostics`). Doctor now projects the canonical `claws status` model rather
  than duplicating file/MCP inspection, reports partial installs, agent and
  workspace drift, MCP ownership states, unresolved cron refs, and orphaned
  subordinate rows across the workspace/package/MCP/cron ledgers. It remains
  advisory and mutation-free. Both the core check and ordered doctor
  contribution are omitted unless `OPENCLAW_EXPERIMENTAL_CLAWS=1`; real CLI
  proof showed the check is unknown when disabled and reports a modified
  managed `SOUL.md` when enabled. Validation passed `pnpm tsgo:core`, focused
  Oxlint with zero findings, 114 doctor tests, and real CLI proof. Fresh-model
  review remained blocked by the unsupported local `gpt-5.3-codex` ChatGPT
  pairing. PR title/body were refreshed and current GitHub behavior/admission/
  sanity checks pass.
- Next: rewrite `#102959` / `user/giodl/claws-pr11-update-plan` as grouped,
  agent-centric update planning. Its obsolete flat planner commit conflicted
  with the new schema and CLI and was skipped during local rebase; the local
  branch currently equals doctor head `74a53bb9ac3` and has not been pushed.

- Last updated: 2026-07-10.
- Last agent: Codex.
- Current focus: RFC PR `https://github.com/openclaw/rfcs/pull/27` was
  refreshed after authoring the five-PR OpenClaw lifecycle stack. The RFC now
  matches the implemented direction: consent-gated `apply`, SQLite provenance
  refs, workspace/persona apply, plugin artifact installers with warning-only
  uninstall provenance, `status`, and `remove`. Claw artifact refs are warning
  and explanation metadata, not uninstall locks or a direct-install ref-count
  model.
- Active branch / PR: WSL worktree `/root/src/openclaw-claws-pr2`, branch
  `user/giodl/claws-pr2-schema-plan`, draft PR
  `https://github.com/openclaw/openclaw/pull/101328`, commit
  `4b331214496f4ec831fe3f4f91a271163da2ac11`. This branch was force-updated
  from the former PR6 validation stack so #101328 is now the only OpenClaw
  validation PR. RFC PR remains `https://github.com/openclaw/rfcs/pull/27`;
  file is `rfcs/0016-claws.md`.
  Latest RFC branch-head commit is
  `b3f166e6f6b9625d02187af9a6217b193e36da42` after adding a tight four-PR
  automation follow-up track to the RFC: automation schema/dry-run preview,
  one consent-gated automation substrate, automation provenance/status, and
  disable/remove plus automation E2E. The RFC PR body was refreshed and a fresh
  `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/rfcs/pull/27#issuecomment-4920222035`.
  The previous RFC branch-head commit was
  `14c4b791de32a5aead70eeb4b95ee64b006680aa` after refreshing the RFC to match
  the creation/export PR #102306. The RFC now explicitly covers `claws export`
  as the authoring path for selected local plugin, workspace, and persona state;
  describes sidecar `files/...` exports, raw plugin-only stdout JSON, safety
  handling for unsafe file selections, and export-to-apply acceptance criteria;
  and updates the authored OpenClaw stack to six implementation PRs plus the
  RFC. A fresh `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/rfcs/pull/27#issuecomment-4920166514`.
  The previous RFC branch-head commit was
  `34b5530e2a9fe3bed604922649e5f5f0b3694a41` after refreshing the RFC to match
  the authored OpenClaw PR stack: #101328 validation/dry-run, #101755
  consent-gated apply and provenance refs, #101973 workspace/persona apply,
  #102228 plugin artifact installers plus plugin uninstall warnings, and
  #102296 status/remove lifecycle. The prior mutating-plan update was
  `74d469117d31f648cf273ab3a7561dcda8e07d9a`; the prior SQLite provenance role
  pass was `13448fa`, and the prior storage update was
  `76b7d4fc0b2a99bdbcc1c601476d11634c5442bb`. The RFC now keeps planning
  folded into `apply --dry-run --json`, records Claw provenance in OpenClaw's
  shared SQLite state store, and explicitly rejects the old uninstall-lock/ref
  count model. `plugins uninstall` should warn when Claws reference a plugin
  but proceed when confirmed or forced; `claws remove` releases Claw refs and
  Claw-managed workspace files without uninstalling plugin artifacts. Skill,
  MCP, connector installers plus automation, doctor, update, disable, and
  rollback are follow-up tracks on the same lifecycle.
  The RFC now uses `apply` for the Claw lifecycle verb and `remove` as the
  Claw-level inverse; artifact-level `uninstall` remains only for underlying
  package-like entries. The RFC PR body was refreshed and `@clawsweeper
  re-review` was requested at
  https://github.com/openclaw/rfcs/pull/27#issuecomment-4916290685. GitHub PR
  metadata now reports head `74d469117d31f648cf273ab3a7561dcda8e07d9a`.
- OpenClaw PR #101328 body/title were refreshed for the one-PR validation
  shape and `@clawsweeper re-review` was requested at
  https://github.com/openclaw/openclaw/pull/101328#issuecomment-4909704025.
  Former validation PRs #101755, #101842, #101874, and #101879 have comments
  noting they are superseded by #101328 and can be repurposed later for the
  mutating Claws apply/status/update/remove series.
- OpenClaw PR #101755 has been repurposed from the old feed-plan draft into
  mutating apply PR1, title `Persist Claw artifact provenance refs`, head
  `openclaw/openclaw:user/giodl/claws-pr3-feed-plan`, commit
  `eb9e435d53a`. Its base branch in the
  `openclaw/openclaw` repo, `user/giodl/claws-pr2-schema-plan`, was corrected
  to consolidated validation commit `4b331214496f4ec831fe3f4f91a271163da2ac11`;
  the raw compare API reports #101755 as one commit ahead. PR body includes RFC
  PR #27 and #101328 references plus real SQLite proof. `@clawsweeper
  re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/101755#issuecomment-4910769650`.
  Latest local validation for PR1 passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/provenance.test.ts src/cli/claws-cli.test.ts
  src/claws/lifecycle.e2e.test.ts
  src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; and real CLI proof with
  `OPENCLAW_DISABLE_BUNDLED_PLUGINS=1
  OPENCLAW_STATE_DIR=/tmp/openclaw-claws-mutating-pr1-proof-state node --import
  tsx src/entry.ts claws apply src/claws/fixtures/incident-response.claw.json
  --yes --json`, which recorded three rows in `claw_artifact_refs`. Codex
  review with `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr2-schema-plan` found and fixed stale-ref
  reconciliation, duplicate entry IDs, local path artifact identity collisions,
  package selector canonicalization, two strict typecheck issues, and
  duplicate-ID validation across optional unknown entries. Final Codex review at
  `eb9e435d53a` reported no high-confidence actionable regressions. Full
  `pnpm exec tsgo --noEmit --pretty false` is currently blocked by unrelated
  `src/secrets/config-io.ts` TS4058 outside the #101755 diff.
- OpenClaw PR #101973 is the next mutating apply PR, title
  `Apply Claw workspace files`, head
  `openclaw/openclaw:user/giodl/claws-pr4-artifact-plan`, base
  `user/giodl/claws-pr3-feed-plan`, commit `780d0cae142`. It is draft and
  replaces the intended reuse of old #101842 because #101842 was already
  merged/closed. This PR applies `workspaceFile` and `persona` entries through
  fs-safe under `--workspace`, records `claw_workspace_file_refs` in shared
  SQLite via the canonical `src/state/openclaw-state-schema.sql` and generated
  DB contract, canonicalizes workspace roots, blocks cross-Claw target
  adoption, allows same-Claw managed target updates across entry-id renames,
  preserves original `appliedAtMs`, cleans stale refs when workspace entries
  disappear, records successfully written refs if a later write fails, and
  counts only created/updated files in `appliedWorkspaceFiles`. Validation
  passed: `pnpm db:kysely:check`;
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/provenance.test.ts src/claws/workspace.test.ts
  src/state/openclaw-state-db.test.ts src/cli/claws-cli.test.ts
  src/claws/lifecycle.e2e.test.ts src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; focused
  `node scripts/run-vitest.mjs src/state/openclaw-state-db.test.ts
  src/claws/workspace.test.ts src/cli/claws-cli.test.ts`; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; real CLI proof for
  `claws apply --yes --workspace`; and final `codex review -c model=gpt-5.5
  --base origin/user/giodl/claws-pr3-feed-plan`, which reported no blocking
  correctness issues. PR body was refreshed and `@clawsweeper re-review` was
  requested at
  `https://github.com/openclaw/openclaw/pull/101973#issuecomment-4916085109`.
  Previous ClawSweeper feedback requested moving the table into canonical state
  schema; that has been addressed. Recheck live labels/comments before
  reporting final ClawSweeper state.
- OpenClaw PR #102228 is the next mutating apply PR, title
  `Apply Claw plugin artifacts`, head
  `openclaw/openclaw:user/giodl/claws-pr5-installers`, base
  `user/giodl/claws-pr4-artifact-plan`, commit
  `e176653a517e101ffcb0f5cb30114b45ea48f79a`. It is draft and adds real
  plugin-artifact installation for confirmed local/feed Claw apply by
  delegating through existing plugin installer paths with `pluginOnly: true`.
  It treats Claw artifact refs as warning/provenance metadata only: plugin
  uninstall warns when Claws reference the plugin but normal confirmed/forced
  uninstall proceeds, and dry-run uninstall stays read-only by skipping the
  provenance lookup. Apply now preflights workspace writes, persists scoped
  plugin provenance for successful partial installs before workspace writes,
  writes full artifact provenance after workspace success, rejects required
  non-plugin artifact surfaces until installers exist, skips optional
  unsupported surfaces, respects plugin enablement policy, and canonicalizes
  npm, npm-pack, ClawHub, path/file URL, and local git artifact identity.
  Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/provenance.test.ts src/claws/artifact-installers.test.ts
  src/claws/workspace.test.ts src/state/openclaw-state-db.test.ts
  src/cli/claws-cli.test.ts src/cli/plugins-cli.uninstall.test.ts
  src/claws/lifecycle.e2e.test.ts
  src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; `git diff --check`;
  and `node scripts/check-no-conflict-markers.mjs`. Full
  `pnpm exec tsgo --noEmit --pretty false` remains blocked only by unrelated
  `src/secrets/config-io.ts` TS4058. Final
  `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr4-artifact-plan` reported no high-confidence
  actionable correctness issues after fixes for ClawSweeper's earlier
  ownership/partial-apply findings and Codex findings around hook fallback,
  floating npm selectors, plugin policy matching, and dry-run uninstall
  side effects. PR body was refreshed and `@clawsweeper re-review` was posted
  at
  `https://github.com/openclaw/openclaw/pull/102228#issuecomment-4918941313`.
- OpenClaw PR #102296 is the final OpenClaw PR in the current Claws
  implementation stack, title `Add Claw status and remove lifecycle`, head
  `openclaw/openclaw:user/giodl/claws-pr6-lifecycle`, base
  `user/giodl/claws-pr5-installers`, commit
  `49eb30ad775269f7ad48e7817a1cc4c45acb70c6`. It is draft and adds
  `claws status [claw]` plus `claws remove <claw> --dry-run|--yes` over the
  persisted state created by the mutating apply stack. Remove deletes
  unchanged Claw-managed workspace files, retains modified/oversized/missing
  files safely, removes Claw provenance refs without uninstalling plugins, and
  keeps failed workspace refs visible if cleanup cannot safely finish. The E2E
  now runs apply -> status -> dry-run remove -> remove -> status through the
  real CLI. Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/provenance.test.ts src/claws/artifact-installers.test.ts
  src/claws/workspace.test.ts src/claws/lifecycle-state.test.ts
  src/state/openclaw-state-db.test.ts src/cli/claws-cli.test.ts
  src/cli/plugins-cli.uninstall.test.ts src/claws/lifecycle.e2e.test.ts
  src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; `git diff --check`;
  and `node scripts/check-no-conflict-markers.mjs`. Full
  `pnpm exec tsgo --noEmit --pretty false` remains blocked only by unrelated
  `src/secrets/config-io.ts` TS4058. Final
  `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr5-installers` reported no actionable correctness
  issues after fixes for stale workspace roots, partial delete preflight, hash
  revalidation, delete errors, and oversized modified files. PR body was
  created and `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/102296#issuecomment-4919518590`.
- OpenClaw PR #102306 is the creation/export follow-up PR, title
  `Add Claw manifest export command`, head
  `openclaw/openclaw:user/giodl/claws-pr7-export`, base
  `user/giodl/claws-pr6-lifecycle`, commit
  `b3be1eefb135081765b65341dcfbcd3647ad9d6e`. It is draft and adds
  `claws export` with include/exclude controls for installed plugins,
  workspace files, and persona files. `--out` writes a self-contained manifest
  plus `files/...` sidecars that can be applied by the existing lifecycle;
  plugin-only stdout stays raw manifest JSON. The exporter rejects empty
  exports, requires `--out` for file exports, skips symlink escapes,
  oversized/non-regular files, duplicate file targets, and produces unique
  entry ids for normalized path collisions. Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/provenance.test.ts src/claws/artifact-installers.test.ts
  src/claws/workspace.test.ts src/claws/lifecycle-state.test.ts
  src/state/openclaw-state-db.test.ts src/cli/claws-cli.test.ts
  src/cli/plugins-cli.uninstall.test.ts src/claws/lifecycle.e2e.test.ts
  src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; real CLI proof for
  `claws export --out` followed by `claws apply --yes`; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; and final
  `codex review -c model=gpt-5.5 --uncommitted`, which reported no actionable
  correctness issues. Full `pnpm exec tsgo --noEmit --pretty false` is still
  blocked by unrelated `src/secrets/config-io.ts` TS4058. PR body was created
  and `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/102306#issuecomment-4920135441`.
- Known dirty state: `claws-hapi` already had unrelated dirty files before
  this project was created; do not revert them.
- Blocking question: maintainer feedback on the Claws name, first supported
  typed entries, and OpenClaw/ClawHub schema sharing.

## Resume Checklist

- Run: live GitHub search for newer OpenClaw issues/PRs mentioning Claws,
  starter setup, package set, bundle, agent pack, skill manifest, feed, and
  selective install.
- Run: `cd /root/src/openclaw-claws-pr3 && git status --short --branch`.
- Run: `cd /root/src/openclaw-claws-pr3 && node scripts/run-vitest.mjs src/claws/schema.test.ts src/claws/feed.test.ts src/cli/claws-cli.test.ts`.
- Verify: whether `gitcrawl` is available; if not, use live `gh` and state the
  source gap.
- Review: OpenClaw current docs for plugins, plugin bundles, skills, ClawHub,
  install safety checks, and feeds/marketplace RFC stack.
- Update: this file and `rfc-sketch.md` after maintainer naming or scope
  decisions.

## Guardrails

- Do not prototype OpenClaw implementation code in `claws-hapi`.
- Keep Claws separate from feeds: Claws name runnable starter setups; feeds
  handle discovery, approval, and availability.
- Do not reintroduce the closed Agent Pack core proposal as workspace-template
  file import.
- Treat installer/update/autoload behavior as security-sensitive.

## Open Threads

- Confirm the product name: `Claws`, or another maintainer-owned term.
- Decide whether the first RFC should define only a manifest/read/plan contract,
  or also a CLI install command.
- Decide whether Claw manifests live as feed entries, npm package metadata,
  ClawHub records, OCI artifacts, or all of the above through a source-neutral
  resolver.
- Preserve the boundary with plugin-bundled skills: plugin bundles own
  plugin-local companion skills; Claws compose runnable starter setups across
  artifacts, files, and automations.
- Preserve staged implementation: schema/local reader/inspect plus dry-run
  apply-plan first, then consent-gated apply, provenance, workspace/persona
  writes, plugin installers, status/remove, and a separate dependent ClawHub
  track.
- Follow-up required: skill/MCP/connector installers, automation enablement,
  doctor diagnostics, update planning/apply, disable, rollback, and ClawHub
  publish/search/feed export.
- Latest ClawSweeper state: RFC PR #27 has a fresh re-review request at commit
  `34b5530e2a9fe3bed604922649e5f5f0b3694a41` after aligning the RFC with the
  authored OpenClaw lifecycle stack and removing the old ref-count/uninstall-lock
  model. Recheck labels before reporting final ClawSweeper state. Remaining work
  is maintainer acceptance and ClawHub follow-through.
- PR2 Codex review: initial review using `gpt-5.3-codex-spark` found one P2
  issue: malformed optional known entries could be treated as optional unknown
  future entries. Fixed by allowing the optional-unknown path only for truly
  unknown kinds and adding a regression test. Later review found one P3
  diagnostic-path issue; fixed by kind-directed known-entry parsing so malformed
  known fields report paths such as `$.entries[0].selector`. Final review
  against `refs/remotes/origin/main` reported no actionable correctness
  regressions.
- PR2 proof: `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/cli/claws-cli.test.ts` passed; `node scripts/run-vitest.mjs
  src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts` passed;
  `node scripts/check-no-conflict-markers.mjs` passed; `git diff --check`
  passed. Real CLI proof was added to the PR body using
  `OPENCLAW_DISABLE_BUNDLED_PLUGINS=1 OPENCLAW_STATE_DIR=/tmp/openclaw-claws-pr2-proof-state node --import tsx src/entry.ts claws inspect/plan ...`.
  ClawSweeper re-review at `7dd8468c934` moved labels to `proof: sufficient`
  and `status: 👀 ready for maintainer look`; live checks have no current
  failures or pending checks. Remaining blocker is explicit
  maintainer approval of the new public schema/CLI contract. Typecheck via
  direct `node scripts/run-tsgo.mjs ...` is blocked in this linked worktree
  because `node_modules/.bin/tsgo` is absent; dependency reconciliation was not
  run from this Codex worktree.
- PR3 proof: `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/feed.test.ts src/cli/claws-cli.test.ts
  src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts` passed; `git diff
  --check` passed; `node scripts/check-no-conflict-markers.mjs` passed. Real
  CLI proof passed for `claws feed inspect` and `claws feed plan` against
  `src/claws/fixtures/local-claws.feed.json`. Full-project `tsgo` is blocked
  because `node_modules/.bin/tsgo` is absent; full-project direct `tsc` OOMed
  at default heap and 8GB heap. A narrowed direct TypeScript compile over the
  changed Claws/CLI files passed with `--ignoreConfig --types node`.
- PR3 latest review loop: user approved `gpt-5.5` for Codex review. First
  review found real source-boundary issues: symlink escape and over-broad `..`
  prefix rejection. Fixed with realpath containment before manifest reads and
  tests for symlink escape, file URL containment, file URL escape, and
  `..starter.claw.json` in-root filenames. Final
  `codex review -c model=gpt-5.5 --base origin/user/giodl/claws-pr2-schema-plan`
  returned no actionable correctness issues. ClawSweeper later flagged that the
  PR body proof snippets did not match current-head JSON shape. The body was
  updated with a formal `Real behavior proof` section and exact current-head
  JSON for `claws feed inspect` and `claws feed plan`, then
  `@clawsweeper re-review` was posted. Live labels now show
  `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`; live checks have no current failures
  or pending checks. Remaining human blocker: `liuhao1024` commented that
  feature PRs are not accepted under the project contribution policy.
- PR4 latest review loop: draft PR
  `https://github.com/openclaw/openclaw/pull/101842` is open against PR3. It
  adds `src/claws/artifacts.ts`, extends plan/types with artifact preview and
  unsupported-required counts, and updates text CLI output to show unsupported
  required entries. Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts src/claws/feed.test.ts
  src/cli/claws-cli.test.ts src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; changed-file direct `tsc`; and
  real CLI proof via `OPENCLAW_DISABLE_BUNDLED_PLUGINS=1
  OPENCLAW_STATE_DIR=/tmp/openclaw-claws-pr4-proof-state node --import tsx
  src/entry.ts claws feed plan src/claws/fixtures/local-claws.feed.json
  incident-response --json`. `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr3-feed-plan` initially found selector and text
  output issues; fixed trailing `@`, npm build metadata, `npm-pack:`, dist-tag
  pinning, text-mode required unsupported output, empty `git:`/`git+`/`file:`
  rejection, and absolute local path preview support. Final review at commit
  `bfac2ffe7e9a` reported no actionable correctness issues. PR body was
  refreshed with current-head proof and `@clawsweeper re-review` was posted at
  `2026-07-07T18:53:19Z`. ClawSweeper then flagged one P1 actionable issue:
  the artifact preview reimplemented selector parsing instead of reusing the
  canonical plugin/npm/git/file parsers, causing unsupported broad selectors to
  look supported. Fixed at commit `8eeef1c91a73` by extracting/reusing shared
  parsers in `src/infra/plugin-install-specs.ts` and
  `src/infra/git-plugin-spec.ts`, preserving `OPENCLAW_HOME` semantics for
  `git:~/...`, and adding selector regression tests. Validation passed:
  focused Claws/CLI/git installer Vitest suites, `git diff --check`,
  `node scripts/check-no-conflict-markers.mjs`, and real CLI proof. Direct
  changed-file `tsc --ignoreConfig` is still limited by repo path aliases for
  `@openclaw/*` packages. Final `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr3-feed-plan` reported no actionable regressions.
  PR body was refreshed and `@clawsweeper re-review` was posted at
  `2026-07-07T19:31:00Z` for head `8eeef1c91a73`; the initial sweep run
  `openclaw/clawsweeper#28893108397` was cancelled by queue/concurrency and
  replaced by `openclaw/clawsweeper#28893270590`. Live labels now show
  `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`; live checks have no current failures
  or pending checks.
- PR5 latest review loop: draft PR
  `https://github.com/openclaw/openclaw/pull/101874` is open against PR4 at
  commit `a2b32d18e04`. It adds `openclaw.clawApplyPlan.v1`,
  `claws apply --dry-run`, and `claws feed apply --dry-run`. The apply plan
  models artifact installs, consent-required workspace/automation actions,
  provenance records, rollback actions, and required-entry blockers without
  mutating state. Codex review initially found that optional unsupported entries
  were treated as blockers; fixed so optional unsupported entries are skipped
  without inflating `blockedEntries` or `installActions`. Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts src/claws/feed.test.ts
  src/cli/claws-cli.test.ts src/cli/program/command-registry.test.ts
  src/cli/program/root-command-descriptions.test.ts`; targeted
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/cli/claws-cli.test.ts`; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; and real CLI proof for local
  and feed dry-run apply. Final `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr4-artifact-plan` reported no actionable
  regressions. Live PR labels show `proof: sufficient`,
  `rating: platinum hermit`, and `status: ready for maintainer look`; live
  checks have no failures or pending checks. A fresh `@clawsweeper re-review`
  was posted after reboot at
  `https://github.com/openclaw/openclaw/pull/101874#issuecomment-4908853935`.
- PR6 latest review loop: draft PR
  `https://github.com/openclaw/openclaw/pull/101879` is open against PR5 at
  commit `d2089ad1943`. It adds `src/claws/lifecycle.e2e.test.ts`, which
  invokes the real `src/entry.ts` CLI with `node --import tsx` and covers local
  inspect/plan/apply dry-run, feed plan/apply dry-run, and fail-closed
  non-dry-run apply. Codex review initially found inherited config-path leakage;
  fixed by pinning child `HOME`, `USERPROFILE`, `OPENCLAW_CONFIG_PATH`,
  `OPENCLAW_HOME`, and `OPENCLAW_STATE_DIR` to a temp sandbox and setting
  `OPENCLAW_TEST_FAST=1`. Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/cli/claws-cli.test.ts src/claws/lifecycle.e2e.test.ts`;
  `node scripts/run-vitest.mjs src/claws/lifecycle.e2e.test.ts`;
  `git diff --check`; `node scripts/check-no-conflict-markers.mjs`; and final
  `codex review -c model=gpt-5.5 --base
  origin/user/giodl/claws-pr5-lifecycle-plan`, which reported no actionable
  regressions. `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/101879#issuecomment-4908854170`.
  Live labels now show `proof: sufficient`, `rating: 🐚 platinum hermit`, and
  `status: 👀 ready for maintainer look`; live checks have no current failures
  or pending checks.

- PR8 skill-artifact apply: draft PR `https://github.com/openclaw/openclaw/pull/102383`
  is open against PR7 (`user/giodl/claws-pr7-export`) at commit
  `71fbfbce624`. It implements the RFC #27 first-series skill installer track:
  `claws apply --yes` can install supported Claw `skill` artifacts via existing
  ClawHub and local/git source skill installers, records skill artifact
  provenance only for installed/satisfied artifact keys, validates ClawHub
  owner-qualified refs against local status/origin metadata, and requires
  matching `.openclaw/source-origin.json` for local/git idempotence. Validation
  passed: focused Claws/provenance/artifact installer/CLI/lifecycle E2E Vitest
  suites; `git diff --check`; `node scripts/check-no-conflict-markers.mjs`;
  final `codex review -c model=gpt-5.5 --uncommitted` reported no discrete
  correctness issues. `pnpm exec tsgo --noEmit --pretty false` remains blocked
  by inherited unrelated `src/secrets/config-io.ts(12,17)` TS4058. ClawSweeper
  re-review was requested at
  `https://github.com/openclaw/openclaw/pull/102383#issuecomment-4921267686`.

- OpenClaw PR #102406 is the next first-series Claws PR, title
  `Apply Claw MCP server artifacts`, head
  `openclaw/openclaw:user/giodl/claws-pr9-mcp`, base
  `user/giodl/claws-pr8-skills`, commit `430b524495a`. It is draft and adds
  inline MCP server artifact apply for `mcpServer` entries by using the Claw
  entry id as the `mcp.servers` name and a JSON object selector as the server
  config. Writes delegate through the existing validated MCP config writer;
  non-inline MCP selectors remain unsupported/skipped until a resolver exists;
  differing existing MCP server configs fail closed instead of being
  overwritten; and persisted artifact identity uses digest-only labels so inline
  MCP secrets are not stored in artifact keys/selectors. Validation passed:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/claws/provenance.test.ts src/claws/artifact-installers.test.ts
  src/cli/claws-cli.test.ts src/claws/lifecycle.e2e.test.ts`; real CLI proof
  for `claws apply --yes --json` writing `mcp.servers.docs` and recording one
  digest-only MCP artifact ref; `git diff --check`; and
  `node scripts/check-no-conflict-markers.mjs`. Final
  `codex review -c model=gpt-5.5 --uncommitted` reported no actionable
  correctness issues after fixes for non-inline MCP skipping, config-sensitive
  artifact identity, overwrite conflicts, and secret-safe provenance. Full
  `pnpm exec tsgo --noEmit --pretty false` remains blocked only by inherited
  unrelated `src/secrets/config-io.ts(12,17)` TS4058. PR body was created and
  `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/102406#issuecomment-4921474710`.

- OpenClaw PR #102427 is the next first-series Claws PR, title
  `Add Claw doctor diagnostics`, head
  `openclaw/openclaw:user/giodl/claws-pr10-doctor`, base
  `user/giodl/claws-pr9-mcp`, commit `b00b2badccb`. It is draft and adds
  `core/doctor/claws-state` for applied Claw provenance drift: orphaned refs
  without apply records, missing/disabled/changed inline MCP server config,
  missing/modified/unreadable/unsafe/oversized Claw-managed workspace files,
  and future persisted connector refs as unsupported until OpenClaw has a
  stable connector setup path. Regular `openclaw doctor` and structured
  `doctor --lint` both see the check. Validation passed:
  `node scripts/run-vitest.mjs src/claws/doctor.test.ts
  src/flows/doctor-core-checks.test.ts
  src/flows/doctor-health-contributions.test.ts`; the broader Claws/doctor
  suite including `src/claws/lifecycle.e2e.test.ts`; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; real CLI proof for
  `doctor --lint --only core/doctor/claws-state --json` reporting a modified
  Claw-managed `SOUL.md`; and final `codex review -c model=gpt-5.5
  --uncommitted`, which reported no discrete regression after fixes for the
  interactive doctor no-op, read-error handling, and MCP config drift. Full
  `node scripts/run-tsgo.mjs --noEmit --pretty false` is blocked in this linked
  worktree because `node_modules/.bin/tsgo` is absent. PR body was created and
  `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/102427#issuecomment-4921668047`.
- RFC PR #27 was refreshed at commit `bd8a9ba` to simplify the first-series
  plan after connector review: connectors are no longer an OpenClaw
  implementation PR in this stack. They remain preview-only/fail-closed until
  OpenClaw has a stable connector-owned setup surface. The authored stack now
  lists #102383 skills, #102406 MCP, and #102427 doctor diagnostics as the
  three first-series completion PRs. The RFC PR body was refreshed and
  `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/rfcs/pull/27#issuecomment-4921709497`.
- RFC PR #27 was refreshed again at commit `6365389` to add the two-PR
  OpenClaw update/reconcile track: read-only `claws update --dry-run --json`
  planning first, then consent-gated `claws update --yes` apply. The RFC PR
  body was refreshed and `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/rfcs/pull/27#issuecomment-4926164140`.
- OpenClaw PR #102959 is the next Claws PR, title `Add Claw update dry-run
  planning`, head `openclaw/openclaw:user/giodl/claws-pr11-update-plan`, base
  `user/giodl/claws-pr10-doctor`, commit `9904dd9e6b7`. It is draft and adds
  `openclaw.clawUpdatePlan.v1` plus
  `openclaw claws update <claw> --from <manifest> --dry-run --json`. The
  planner compares persisted Claw state to a target manifest, reports
  artifact/workspace add/change/remove/unchanged/manual/blocked decisions,
  scopes workspace refs by canonical workspace root, fans out unscoped
  workspace plans across all managed roots, fails target id mismatches, and
  keeps `claws update --yes` fail-closed for the next PR. Validation passed:
  focused Claws update/CLI tests; the broader Claws/provenance/workspace/state
  CLI/lifecycle E2E/registry suite; `git diff --check`;
  `node scripts/check-no-conflict-markers.mjs`; `oxfmt --check` for touched
  files; real CLI proof for apply followed by update dry-run; and final
  `codex review -c model=gpt-5.5 --uncommitted`, which reported no discrete
  correctness issues after fixes for workspace drift, phase changes, target
  diagnostics, and multi-workspace planning. Full `node scripts/run-tsgo.mjs
  --noEmit --pretty false` timed out after 180s without diagnostics in this
  linked WSL worktree. `@clawsweeper re-review` was posted at
  `https://github.com/openclaw/openclaw/pull/102959#issuecomment-4926723757`.

- OpenClaw PR #102982 is the next Claws PR, title `Apply Claw update
  reconciliations`, head
  `openclaw/openclaw:user/giodl/claws-pr12-update-apply`, base
  `user/giodl/claws-pr11-update-plan`, commit
  `86d6f0aa891b0540e9e6e843b24eb6705ab77079`. It is draft and implements the
  consent-gated `claws update <claw> --from <manifest> --yes` path on top of
  the read-only planner. The update apply path revalidates the plan, fails on
  manual/blocker/error states, requires `--workspace` for workspace/persona
  reconciliation, validates workspace writes before artifact mutation, installs
  supported target artifacts, removes stale unchanged Claw-managed workspace
  files, preserves local edits, handles same-entry-id target moves, defers
  artifact provenance rewrites until workspace reconciliation succeeds, and
  emits `openclaw.clawUpdateResult.v1`. Validation passed:
  `node scripts/run-vitest.mjs src/cli/claws-cli.test.ts
  src/claws/update-plan.test.ts src/claws/provenance.test.ts`; the broader
  Claws/doctor/CLI suite including `src/claws/lifecycle.e2e.test.ts`;
  `git diff --check`; `node scripts/check-no-conflict-markers.mjs`;
  `pnpm exec oxfmt --check --threads=1 src/cli/claws-cli.runtime.ts
  src/cli/claws-cli.test.ts src/claws/lifecycle-state.ts
  src/claws/provenance.ts src/claws/update-plan.ts`; and real CLI proof for
  apply followed by `claws update --yes --workspace --json` updating `SOUL.md`
  and deleting a stale managed file. `node_modules/.bin/tsgo --noEmit
  --pretty false` now gets past this patch and stops at inherited
  `src/secrets/config-io.ts(12,17)` TS4058. Final `codex review -c
  model=gpt-5.5 --uncommitted` reported no actionable correctness issues after
  fixes for same-id workspace moves, premature provenance rewrites, and the
  update-result logger type. PR body was created and `@clawsweeper re-review`
  was posted at
  `https://github.com/openclaw/openclaw/pull/102982#issuecomment-4927121568`.

- OpenClaw PR #102982 was superseded in place at commit `5f121bf3f93` and
  retitled `Apply consented grouped Claw updates`. The consented `--yes` path
  now executes every grouped owner from PR #102959: agent config, managed
  workspace files, package references/installers, MCP servers, and cron jobs.
  Workspace and MCP writes use digest/expected-value checks; cron changes must
  converge on the stable declaration key and scheduler id; package removal is
  reference-only and conflicting shared plugin version pins fail closed.
  Completed owners compensate in reverse order before root Claw provenance is
  advanced. Uncertain config/gateway writes and package artifacts without an
  installer rollback surface `update_partial` rather than claiming atomicity.
  The PR body explicitly aligns shared package ownership with Control UI plugin
  management PR #103176 and keeps portable MCP declarations separate from its
  curated connector shelf. Validation passed: 133 tests across the full Claws,
  CLI, lifecycle, config, and executor surface; non-incremental
  `tsgo -p tsconfig.json --noEmit`; `git diff --check`; and a real isolated CLI
  `1.1.0 -> 1.2.0` preview/apply/status proof that changed the agent, added two
  managed files, added a remote OAuth MCP server, and ended with zero partial,
  drifted, or unresolved records. A fresh `@clawsweeper re-review` was posted
  at `https://github.com/openclaw/openclaw/pull/102982#issuecomment-4938897298`.

- RFC PR #27 was synchronized with the completed implementation series at
  commit `845df5c`. The RFC now links all eleven ordered OpenClaw PRs, cites
  merged Control UI plugin-management PR #103176, defines exact-version package
  update and conflicting shared-plugin pin behavior, documents per-owner
  concurrency boundaries and reverse compensation, and requires explicit
  partial results for uncertain Gateway/config writes or installed artifacts
  without rollback. The resolved shared-package update question was removed
  from `Unresolved questions`, and update acceptance criteria now cover
  revalidation, compensation, and partial outcomes. The RFC PR body was
  refreshed; live state is mergeable with no reported checks. A fresh
  `@clawsweeper re-review` was posted through the GitHub app as comment
  `4939017821` after the CLI identity was rejected by the RFC repo's managed
  user policy.

- All eleven live OpenClaw PR bodies were audited and normalized as one review
  arc. PRs #101328, #101755, and #101973 no longer pin stale pre-rebase branch
  or RFC heads. PRs #102228 through #102427 now state their dependency, precise
  ownership boundary, sequencing rationale, and next stage. The cron contract
  now correctly says `main` maps to `session:main` while the scheduler record
  remains pinned to the final Claw agent id. The package PR explicitly names the
  shared CLI/Gateway/Control UI uninstall-warning path and #103176 alignment.
  PR #102959 explains why planning is read-only, and #102982 identifies itself
  as the final consent/compensation stage. A live follow-up scan confirmed every
  body has stack and arc context, every base is correct, and no stale head hash
  claims remain.

- OpenClaw PR `#106888` (`Add CLAW.md manifest support`) is a new draft slice
  above `#102982`, at `a8015acb698`. It adds YAML-frontmatter `CLAW.md`
  support for direct/package reads, local feed resolution, and `claws export`,
  while using the existing typed manifest schema and lifecycle unchanged. It
  has 67 passing focused reader/feed/export/CLI/lifecycle E2E tests, real CLI
  inspect/add proof, and a clean final stacked-base Codex review. The review
  fixes preserve a declared `CLAW.md` format through in-package symlinks and
  keep that internal format hint out of public source/provenance output.
  `pnpm tsgo:core` remains
  blocked by the inherited unused `PersistedClawPackageRef` import in
  `src/claws/package-update.ts`. Draft PR:
  `https://github.com/openclaw/openclaw/pull/106888`; `@clawsweeper re-review`
  was refreshed at `https://github.com/openclaw/openclaw/pull/106888#issuecomment-4964031316`.
  This is OpenClaw format compatibility only. Defer the standalone portable
  `npx claws` CLI/spec until a separate project and npm namespace decision.

- 2026-07-14 package-review repair: `#102228` is now at `8c11734c566` with
  Patrick's six package findings addressed and a resolution comment at
  `https://github.com/openclaw/openclaw/pull/102228#issuecomment-4975724028`.
  It stages package decisions before agent/workspace mutation, uses shared
  plugin preflight for exact reuse/conflicts, records root/package pending
  provenance before external installers, keeps JSON stdout quiet, uses shared
  schema state, and warns on version-drifted uninstall dependencies. Focused
  `pnpm tsgo:core` plus CLI/lifecycle/provenance/package/uninstall tests pass.
  Next active repair is `#102296`: use canonical agent-delete behavior, make
  managed-file removal identity safe, and implement ownership-aware package
  removal as requested by Patrick/ClawSweeper.
