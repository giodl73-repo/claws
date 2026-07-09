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

- Last updated: 2026-07-08.
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
