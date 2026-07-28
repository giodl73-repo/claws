# Catalog Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the current catalog section in `../openclaw/SESSION.md`.
4. Check live repo state before acting.

## Baseline

- Area: OpenClaw catalog metadata and catalog-driven command/tool inventory.
- Primary repo: `https://github.com/openclaw/openclaw`.
- Local worktree: `C:\src\openclaw-catalog-restack`.
- Current branch: `user/giodl/cli-catalog-review-dynamic-lenses`.
- Main tracking file: `projects/catalog/SESSION.md`.
- Skill to use: `codex-review` for review passes; `openclaw-pr-loop` for PR
  updates, CI, or push/PR handling.

## Current Session

- Last updated: 2026-07-28
- Last agent: Codex
- Current focus: command catalog ownership and observation-lifetime contract
  refreshed across the RFC and implementation review surfaces.
- Active branch / PR:
  - RFC PR: `https://github.com/openclaw/rfcs/pull/32`.
  - Upstream rollup PR:
    `https://github.com/openclaw/openclaw/pull/100960`.
  - Fork-local step PRs:
    `https://github.com/giodl73-repo/openclaw/pull/11` through
    `https://github.com/giodl73-repo/openclaw/pull/16`.
  - Commands comparison PRs:
    `https://github.com/giodl73-repo/openclaw/pull/24` through
    `https://github.com/giodl73-repo/openclaw/pull/26`.
  - Current local branch: `user/giodl/commands-inventory-prompt` in
    `C:\src\openclaw-commands-inventory`.
- Known dirty state:
  - `projects/openclaw/SESSION.md` has catalog review notes from the latest
    per-PR review pass.
  - Unrelated local doctor notes are dirty in `projects/doctor/`.
- Blocking question: none.

## Current Catalog Stack

- PR1 `user/giodl/cli-catalog-review-foundation` at `a80610e1be`.
- PR2 `user/giodl/cli-catalog-review-dynamic-lenses` at `e67c446807`.
- PR3 `user/giodl/cli-catalog-review-prompt` at `6c0c7f1eb5`.
- PR4 `user/giodl/cli-catalog-review-schema-fixtures` at `e08b56c47d`.
- PR5 `user/giodl/cli-catalog-review-generated-docs` at `34d5578e3b`.
- Preserved reviewed full stack:
  `user/giodl/cli-catalog-review-full-stack` at `a86631846a`.
- The catalog PR2 remains preserved at `e67c446807`. The remote
  `user/giodl/cli-catalog-review-hardening` branch is the head of upstream PR
  `openclaw/openclaw#100960` and now points to `70b91ef6206`. Runtime proof
  remains anchored at `90a7b1ca2b`; the final commit adds the discoverable
  `docs/cli/commands.md` reference, CLI index link, and docs navigation.

## 2026-07-10 Reduced Upstream Draft

- Completed another sequential Codex review and repair loop across PR3, PR6,
  and the full rollup. Final rollup review reported no actionable correctness
  regressions.
- Accepted and fixed three substantive cross-layer findings before reducing
  the upstream draft:
  - sandboxed `exec` no longer advertises host-only `openclaw` routes;
  - plugin prompt metadata is normalized and bounded;
  - routed operation effect metadata now reaches list/audit/summary outputs.
- Full-stack focused validation passed: 201 tests across five Vitest projects,
  generated-doc freshness, 53-file formatting, 50-file lint, diff checks, and
  conflict-free merge-tree.
- Preserved that reviewed result on fork branch
  `user/giodl/cli-catalog-review-full-stack` at `a86631846a`.
- Narrowed upstream draft `openclaw/openclaw#100960` to PR1+PR2 only and then
  updated PR2 to `e67c446807`; the title/body now center the core read-only catalog,
  runtime/plugin inventory, audit, operator-summary, and test-plan views.
- Fork review PR `giodl73-repo/openclaw#16` auto-closed after its shared head
  branch moved behind the PR5 base; the complete PR6/full-stack result remains
  preserved on `user/giodl/cli-catalog-review-full-stack`.
- Folded the minimum trustworthy-audit metadata down from the preserved full
  stack into PR2:
  - `CommandEffectProfile` contains only effect mode, optional risk, and
    optional confirmation requirement.
  - `CatalogExposure` contains only `public` / `internal` tier.
  - Plugin descriptors can be hidden; plugin metadata is runtime-validated at
    both registration boundaries.
  - Prompt command hints remain excluded from the source contract.
- `catalog audit --plugin-descriptors` and
  `catalog summary --plugin-descriptors` now load opted-in plugin descriptors;
  operator summaries include separate high-risk attention.
- Final Codex review accepted and fixed plugin prompt-visibility inconsistency,
  missing CLI plugin loading for audit/summary, and omitted high-risk summary
  attention. The convergence review was clean.
- Reduced-draft validation passed: 57 focused tests, `pnpm tsgo:core:test`,
  changed-file format/lint, `git diff --check`, and a conflict-free merge-tree
  against current `origin/main`.
- Removed the dormant `promptProjection` JSON/count and `prompt` visibility
  value from PR2 so prompt generation is fully deferred instead of leaking an
  unused public shape into the initial catalog contract.
- Final branch Codex review at `e67c446807` found no actionable regressions.
- Rewrote RFC #32 to the compact template shape and pushed `842da7f`; PR1+PR2
  are the initial implementation, while fork PR3-PR6 are linked as example next
  steps rather than acceptance requirements. The RFC Codex review was clean,
  and the live RFC PR body now matches that boundary.

## 2026-07-09 RFC Filing / Review PR Prep

- Opened RFC PR `openclaw/rfcs#32`:
  `https://github.com/openclaw/rfcs/pull/32`.
- Latest RFC PR head: `767108a`, titled `Command Catalog`. The RFC file is now
  `rfcs/0016-command-catalog.md`. It recommends
  `openclaw commands` list/inspect as Option A and preserves the broader
  `openclaw catalog` list/audit/test-matrix/summary work as Option B.

## 2026-07-10 Commands Prompt Follow-Up

- Opened fork-only draft PR #26, `Optional PR3: add scoped command prompt
  projection`: `https://github.com/giodl73-repo/openclaw/pull/26`.
- Branch `user/giodl/commands-inventory-prompt` at `1eb05fc55a`, stacked on
  PR #25 (`user/giodl/commands-inventory-inspect`).
- The projection uses only command-owned catalog records: routed CLI
  operations, explicitly prompt-enabled plugin CLI commands, and caller-supplied
  node commands in `node-operator` scope. It excludes ownerless tool adapters
  and broader catalog reports.
- Safety behavior gates host CLI routes on available, unsandboxed `exec`,
  bounds externally supplied strings, and renders confirmation requirements.
- Validation passed: 103 focused tests, core TypeScript check,
  `git diff --check`, and a clean final Codex review.
- RFC PR #32 now links the optional follow-up at head `767108a`; its live PR
  body leads with the compliance/operator inventory need, cites related
  OpenClaw issues #52919, #77943, #50011, and #77730, and states that PR #26
  is not included in the initial upstream draft.
- A `.craft/roles/claws` review added three guardrails: omitted effect metadata
  means unknown rather than permissive, plugin collection is non-activating and
  fails visibly when incomplete, and catalog snapshots are not signed
  attestations by themselves.
- A final GitHub issue search added #98978 (help/completion metadata drift),
  #96697 (plugin-runtime cost on read-only listing), #89797 (node capability /
  command mismatch), and #78082 (stale external-provider registrations). The
  RFC now states that catalog output is OpenClaw-known state, not proof that an
  external provider has reconciled its control plane.
- The RFC now describes the right documentation automation boundary. Fork PR
  #15 generated one reference page plus navigation/map/glossary/freshness
  wiring; it did not update every CLI document. A future command-only docs PR
  should generate `/cli/commands`, enforce cross-surface description
  consistency, retain hand-authored workflow/SDK guidance, and exclude dynamic
  deployment inventory from checked-in snapshots.
- Opened fork-only optional PR4
  `https://github.com/giodl73-repo/openclaw/pull/28`, branch
  `user/giodl/commands-inventory-docs` at `375e03d6b8`, stacked on PR2. It adds
  generated `/cli/commands`, `docs:commands:gen` / `docs:commands:check`,
  `check:docs` integration, navigation/docs-map wiring, and three generator
  tests. It reuses the existing root-help/registered-command description
  contract rather than creating a duplicate guard.
- PR28 adversarial validation: private-QA environment output is stable; a
  temporary canonical description change made the freshness check fail with
  the expected regeneration instruction; restoration returned it to green.
  Final focused validation passed 10 tests across three shards and the branch
  diff Codex review was clean.
- PR28 CI-routing validation found and fixed a descriptor-only gap: changes to
  `src/cli/program/subcli-descriptors.ts` or the command-reference generator now
  schedule `check-docs` while remaining non-doc changes for lane selection.
  Focused catalog/generator/workflow validation passed 50 tests, formatting,
  generated-doc freshness, docs-map freshness, and `git diff --check`.
- Opened optional live-node follow-up
  `https://github.com/giodl73-repo/openclaw/pull/29`, branch
  `user/giodl/commands-live-node` at `6df97ae7021`, stacked on prompt PR26. It
  reuses Gateway `node.describe` for `commands list/inspect --node <id>`,
  requires a connected node, and emits timestamped identifier-only runtime
  records compatible with the node-operator projection. Validation passed 29
  focused tests, type-aware lint, formatting, and diff checks. Full lint was
  blocked by a missing unrelated dependency in the borrowed WSL dependency
  tree; nested Codex review was blocked by unavailable WSL authentication.
- RFC PR32 now documents PR29 and the live-node metadata boundary at `67d5851`.
- RFC documentation follow-ups now include: public command page coverage,
  generated subcommand/option references, and runtime plugin inventory
  guidance. Live node guidance remains deferred until a paired-node collector
  exists; dynamic results are not canonical checked-in docs.
- PR2 and upstream draft #100960 now point to `90a7b1ca2b`. ClawSweeper's
  contributor-owned findings were addressed: requested plugin scans fail on
  loader exceptions or error diagnostics, the three plugin descriptor fields
  are documented with defaults and an example, and the PR body contains live
  core/plugin/failure proof.
- Exact-head proof: core inventory reported 61 descriptors / 26 runtime / 0
  plugin commands; opt-in plugin inventory reported 3 plugin commands; a
  controlled plugin registration failure exited 1 with zero stdout bytes.
- Focused hardening validation passed (10 tests), both final Codex reviews were
  clean, and fresh ClawSweeper reviews were requested on #100960 and RFC #32.
- The full core TypeScript runner emitted no diagnostics but did not complete
  within two five-minute local attempts; do not report that latest rerun as a
  pass.

## 2026-07-10 Commands Comparison Stack

- Preserved the existing catalog branches and upstream draft unchanged for
  side-by-side review.
- Created `C:\src\openclaw-commands-inventory` from current `origin/main`.
- Opened fork draft PR #24, `Alternative PR1: add commands inventory list`:
  `https://github.com/giodl73-repo/openclaw/pull/24`, branch
  `user/giodl/commands-inventory-foundation`, head `d038dbb415`.
- Opened stacked fork draft PR #25, `Alternative PR2: add exact command
  inspection`: `https://github.com/giodl73-repo/openclaw/pull/25`, branch
  `user/giodl/commands-inventory-inspect`, current head `90a7b1ca2b`.
- Option B removes ownerless tool adapters and aggregate audit/test-matrix/
  summary reports. It retains CLI descriptors, routes, runtime commands,
  opt-in plugin CLI descriptors, and caller-supplied node command records.
- Node records are explicitly labeled `caller-supplied`; neither comparison PR
  claims a live `node.list` / `node.describe` bridge yet.
- Current OpenClaw main already exposes Gateway RPC `commands.list` for
  agent-facing chat/native/skill/plugin commands. The RFC treats it as a
  separate existing surface and asks how future convergence should work.
- PR1 Codex review was clean after routing plugin logs away from both JSON and
  Markdown output and clarifying node scope.
- PR2 Codex review was clean after fixing inherited route semantics, exact
  existence, runtime aliases, inherited operations, dynamic Markdown fences,
  and lazy sub-CLI hydration for paths such as `models aliases list`.
- Validation: 44 focused tests on the full alternate stack and the core TypeScript
  check passed; focused PR1 and PR2 reruns also passed after review fixes.
- Promoted the commands stack to upstream draft
  `https://github.com/openclaw/openclaw/pull/100960` by moving its existing head
  branch `user/giodl/cli-catalog-review-hardening` to `7ad20bd596`. The PR title
  and body now describe `commands list` / `commands inspect`; the former catalog
  implementation remains preserved on the dedicated fork branches.
- Final promoted-head proof: 44 focused tests, core TypeScript check,
  `git diff --check`, and clean per-commit Codex reviews. The last review fix
  hydrates both core and sub-CLI lazy command groups before exact inspection.
- Updated upstream rollup draft PR `openclaw/openclaw#100960` to link the RFC
  and the six fork-local review PRs.
- Opened fork-local draft review PRs:
  - PR1 foundation: `https://github.com/giodl73-repo/openclaw/pull/11`.
  - PR2 dynamic/operator lenses:
    `https://github.com/giodl73-repo/openclaw/pull/12`.
  - PR3 prompt projection:
    `https://github.com/giodl73-repo/openclaw/pull/13`.
  - PR4 schema fixtures:
    `https://github.com/giodl73-repo/openclaw/pull/14`.
  - PR5 generated docs:
    `https://github.com/giodl73-repo/openclaw/pull/15`.
  - PR6 hardening and consumer contract:
    `https://github.com/giodl73-repo/openclaw/pull/16`.
- Rebased the stack onto current `origin/main` after #100960 reported
  `DIRTY`; resolved one glossary conflict by preserving current main's pairing
  entries and adding `CLI catalog reference`.
- Validation after rebase passed in `C:\src\openclaw-catalog-restack`:
  focused catalog Vitest shards, targeted `oxfmt --check`, and
  `git diff --check origin/main...HEAD`.
- Live state after push: #100960 is `UNSTABLE` only because checks are running,
  not because of merge conflicts.

## Resume Checklist

- Run: `git status --short --branch` in `C:\src\openclaw-catalog-restack`.
- Verify: focused catalog Vitest shards and `git diff --check`.
- Review: one `codex review` per PR branch diff when the stack changes.
- Update: this file plus `projects/openclaw/SESSION.md` when branch hashes,
  review findings, or PR status change.

## 2026-07-23 Three-Agent Repair Pass

- Three independent architecture, correctness/security, and delivery/spec
  reviews found no P0 issue but identified correctness gaps across all seven
  branches.
- Foundation now preserves unknown effects, omits hidden descriptors from
  public inventory, and reports per-source collection status.
- Live node collection now uses pairing-aware diagnostics authentication,
  accepts only bounded command identifiers, and emits identifier-only records
  without invented effects, approval, availability, descriptions, schemas, or
  invocation payloads.
- Prompt projection is explicit caller opt-in, consumes normalized catalog
  records, rejects unsafe node identifiers, applies conservative unknown
  guidance, and does not invent empty node parameters.
- Generated docs restore `check:env-var-count`, omit hidden commands, and watch
  every canonical generator input.
- Policy evidence now includes runtime commands, unique route identities,
  collection scope, and node observations; drift ignores observation timestamps
  while comparing scope; bounded search includes nested runtime commands and
  aliases.
- RFC 0017 was rewritten around the final `openclaw commands` proposal with a
  concise alternative, stable JSON rules, acceptance criteria, current upstream
  PR mapping, and accurate prototype labeling.
- The old local `cli-catalog-overlay-pre-rfc.md` is now a supersession pointer,
  not a competing specification.
- Rewritten local heads after the repair pass and Oxc lint follow-up: foundation
  `37ca7c7668c`, live node `4a2d0ad06fee`, prompt `651cef48e4d3`, generated
  docs `12320349d800`, policy evidence `5a0fdaaf8294`, runtime drift
  `5bf1c719d093`, and bounded search `32bfd32fa4a5`.
- Focused validation passed 32 foundation tests plus the previously rerun node,
  prompt, docs, policy, drift, and search suites. A final all-slice invocation
  in the secondary worktree stalled before emitting results and exited without
  leaving a Vitest process; it is not counted as proof.
- Hosted foundation CI then found two Oxc `no-map-spread` errors in conditional
  metadata construction. The implementation now uses the repository's existing
  `Object.assign` pattern; changed-file Oxc/Oxfmt and all 32 focused foundation
  tests pass. Fresh CI and ClawSweeper reviews are running on the heads above.

## 2026-07-10 Upstream Commands Follow-Ups

- Opened three upstream draft follow-ups to `openclaw/openclaw#100960` using
  fresh branches that preserve the existing fork comparison PRs:
  - `#104158`, live paired-node command collection, branch
    `user/giodl/commands-upstream-node`, head `e13d199075`.
  - `#104159`, scoped command prompt projection, branch
    `user/giodl/commands-upstream-prompt`, head `9a6660bab1`.
  - `#104160`, generated command reference and freshness guard, branch
    `user/giodl/commands-upstream-docs`, head `9956762279`.
- The Git history is ordered node -> prompt -> docs on top of #100960. All
  three upstream PRs target `main` and remain draft; their diffs will contract
  as preceding slices merge.
- Fresh reordered validation passed: node 24 focused tests, prompt 103 focused
  tests, docs 50 focused tests with 9 environment-specific skips, generated
  command-reference freshness, and per-slice `git diff --check`.
- `#100960` now links the three upstream follow-ups in its PR body.
- `#104159` now threads a trusted run-scoped command inventory through the
  embedded runner into `node-operator` prompts. Node commands require the
  `nodes` tool, use the valid `nodes action=invoke` / `invokeCommand` /
  `invokeParamsJson` shape, are deterministically capped at 32 dynamic
  surfaces, and stay below and outside the stable prompt-cache boundary/key.
- Prompt follow-up validation now passes 130 focused tests plus the core
  TypeScript check. Commit-scoped Codex review on `9a6660bab1` reported no
  actionable findings after fixing host/plugin gating, node-tool gating,
  bounded ordering, cache placement/keying, and node invocation guidance.
- Worktree `C:\src\openclaw-commands-upstream-stack` was recreated cleanly
  after a Windows pnpm junction damaged only the initial disposable checkout.
  The damaged checkout was moved to
  `C:\src\_retired-openclaw-commands-upstream-stack-20260710`; do not treat it
  as an active worktree.

## 2026-07-10 Command Catalog Consumer Drafts

- Updated RFC PR `openclaw/rfcs#32`; the RFC is now
  `rfcs/0017-command-catalog.md` at head `66eb59c`, with three optional
  consumer slices. They are examples, not acceptance requirements for the
  initial `commands list` / `commands inspect` contract.
- Opened fork-local draft PRs stacked on the upstream docs head:
  - `giodl73-repo/openclaw#30`, policy evidence projection, head `ba23768930`.
  - `giodl73-repo/openclaw#31`, runtime inventory comparison, head `1b7b6478fb`.
  - `giodl73-repo/openclaw#32`, bounded command search projection, head
    `200a5be6cb`.
- The evidence projection is deterministic and explicitly non-attesting. The
  drift projection reports OpenClaw-observed snapshot changes without inferring
  policy violations or external control-plane state. Search results are
  non-executable, capped at 20, and hydrate exact detail separately.
- Focused Vitest coverage passed for all three slices (4 tests total), as did
  formatting and `git diff --check`. The full Windows TypeScript check exhausted
  both 4 GB and 8 GB heaps after focused tests passed; no type errors were
  emitted before OOM.
- Active implementation worktree: `C:\src\openclaw-commands-leverage-stack`.

## 2026-07-22 RFC Main Refresh

- Rebased `openclaw/rfcs#32` (`RFC 0017: Command Catalog`) onto upstream main
  `13819ef` without conflicts and force-pushed the fork branch with lease.
- Current RFC head: `362e497`; the PR diff remains one 414-line RFC file.
- The RFC remains `status: draft`. ClawSweeper's only outstanding lifecycle
  item is the required `maintainer-discussion` thread and resulting canonical
  relationship decision for Gateway `commands.list`.

## 2026-07-22 Implementation Main Refresh

- Rebased the seven command-catalog implementation branches onto OpenClaw main
  `8108b9637b0` and force-pushed each fork head with an explicit lease. The
  initial refresh crossed 70 upstream commits without implementation conflicts;
  a second 14-commit refresh on July 23 was also conflict-free.
- Current heads: foundation `8d99208c34e`, live node `9cfc1aafa48`, prompt
  `1e71176a579`, generated docs `f249db6e2b1`, policy evidence
  `c61bd552d69`, runtime drift `408dec15063`, and bounded search
  `6ddc79d3bff`.
- Ported plugin catalog metadata to the refactored registration leaves
  (`plugin-registration.types.ts` and `registry-registrars-operations.ts`) and
  prompt inventory forwarding to
  `attempt-system-prompt-prepare.ts`.
- Fixed the strict-indexing type error in the node-command Markdown fixture and
  regenerated `docs/docs_map.md`; the CI-reported stale map is resolved. Knip's
  four unused-type groups were also fixed by keeping internal component aliases
  module-private while preserving the aggregate programmatic API contracts.
- Validation on the exact stack passed whole-repo `oxfmt`, command-reference
  freshness, docs-map freshness, and `git diff --check`. The earlier focused
  run passed 18 files / 190 tests. A fresh WSL type/test rerun is inconclusive:
  WSL repeatedly terminated `tsgo` and Vitest with filesystem/swap `SIGBUS`
  errors after the host disk filled during a disposable worktree checkout.
  Treat GitHub CI on these refreshed heads as the fresh type/test authority.
- Upstream PRs remain #100960 (ready), #104158-#104160 (draft). Fork consumer
  PRs #30-#32 remain draft; no readiness or merge action was taken.
- Fresh #100960 CI on `2928ead46bc` passed `check-dependencies`,
  `check-test-types`, `check-docs`, and `check-lint`. `build-artifacts` and all
  QA smoke profiles fail only on the Control UI startup-size ratchet; the same
  QA failure reproduces on exact current-main run `29979854683`. ClawSweeper
  has started a fresh review and has not posted findings yet.
- Command-reference and docs-map freshness passed after the 70-commit refresh.
  Watch the fresh GitHub CI run for the authoritative type, dependency, lint,
  and compact-test results.

## 2026-07-23 Foundation CI Follow-Up

- Fresh #100960 run `30007978296` passed every substantive gate except
  `checks-node-compact-large-5`. Attempts 1 and 2 each timed out only
  `src/system-agent/tui-backend.test.ts` at its 120-second per-test limit;
  the other 1,169 tests in that isolated shard passed.
- Exact-base main run `30007280700` passed the same job, but the affected test
  already took 73 seconds and the full file took 140 seconds. The PR attempts
  were broadly 1.6-2x slower across unrelated shards and TUI tests, so this is
  a threshold-sensitive runner slowdown rather than a catalog assertion or
  changed TUI code path.
- Attempt 3 of run `30007978296` failed identically: the same test took 126.9
  seconds while the other 1,169 tests passed. Do not change unrelated TUI code
  or raise its timeout solely to make this catalog PR pass.
- Equivalent local proof is unavailable: the WSL dependency tree has prior
  filesystem/swap damage, and native Vitest did not reach startup output before
  its bounded six-minute shell timeout. No matching test process remained.
- Crabbox remote proof did not start. The non-root WSL profile lacked broker
  auth, Blacksmith lacked its separate login, and the root broker token was
  stale (`401`). No AWS or Testbox lease was allocated.
- The stack was then refreshed onto current main `8108b9637b0`; no intervening
  commit touched the TUI test or its Vitest configuration. All seven refreshed
  diffs pass `git diff --check`, and docs-map freshness passes. The
  TypeScript-backed command-reference checker could not start in the damaged
  local dependency environment; it passed before the base-only refresh.
- Fresh foundation CI run `30012862160` on head `8d99208c34e` passed docs,
  lint, test-types, dependencies, build/QA, security, and every compact shard
  except `checks-node-compact-large-5`. That shard again failed only the same
  unrelated TUI test at 127.7 seconds; its other 1,169 tests passed. The
  aggregate gate is red only because of that shard.
- `security-fast` initially hit an external production-advisory HTTP 503; its
  job-only rerun passed. Do not rerun superseded run `30007978296` or the
  expensive compact shard again without a new reason.
- ClawSweeper started a refreshed-head review for #100960 but had only posted
  its start placeholder at handoff. Main advanced again after the push, so
  GitHub reports #100960 as `BEHIND`; do not chase a moving tip absent a
  substantive compatibility change or maintainer request.

## 2026-07-28 Ownership And Lifetime Refresh

- Updated RFC 0017 on `openclaw/rfcs#32` at `de47718` to make the catalog's
  ownership boundary explicit: contributing registries retain command
  semantics, namespace/conflict handling, registration lifetime, and execution
  authority.
- Defined each catalog result as a source-scoped observation snapshot. Record
  identity supports comparison but is not a capability token or proof that the
  same runtime registration remains available.
- Clarified that missing or failed source collection remains unknown, so drift
  consumers cannot interpret catalog absence as command removal or revocation.
- Clarified that public, internal, hidden, documentation, and prompt projections
  are views only; they do not grant or revoke command authority.
- Aligned the review-facing bodies for RFC #32 and implementation PRs #100960,
  #104158, #104159, and #104160. The three follow-up PR bodies were also
  reformatted from flattened Markdown into readable sections.
- No implementation API or new lifecycle framework was added in this pass.

## Guardrails

- Keep implementation work in OpenClaw worktrees, not `claws-hapi`.
- Keep durable catalog project state here; use `projects/openclaw/SESSION.md`
  only for broader OpenClaw PR-loop context and cross-links.
- Do not use broad process-kill commands. If cleanup is needed, identify the
  exact PID and ask explicitly first.
- Do not overwrite unrelated dirty notes such as `projects/doctor/*`.

## 2026-07-09 Fresh Per-Branch Codex Review

- Reviewed all six OpenClaw catalog branches independently against their
  actual stacked bases, then reviewed the complete rollup against current
  `origin/main`. No implementation changes were made or pushed.
- PR1 accepted one Markdown-rendering finding: runtime-supplied node fields
  are interpolated into table cells without escaping delimiters, line breaks,
  or backticks.
- PR2 accepted the same rendering bug class for plugin descriptions; the
  sibling runtime-command description path needs the same shared table-cell
  encoder. PR3 prompt projection and PR4 schema fixtures were clean.
- PR5 accepted two documentation-contract findings: the generated page points
  users to the CLI for node inventory even though only programmatic callers can
  currently supply node commands, and `cli/catalog` is missing from
  `docs/docs.json` navigation.
- PR6 accepted three findings: no OpenClaw production caller populates
  `cliCatalogOverlay`; plugin effect/exposure metadata is copied across the JS
  plugin boundary without runtime validation; and hidden lazy plugin
  descriptors can reappear through runtime Commander enumeration.
- The rollup review accepted two cross-layer findings: routed CLI operations
  remain prompt-visible when an agent lacks an execution surface, and plugin
  logs are isolated from JSON output but can corrupt Markdown catalog output.
- Verification on `user/giodl/cli-catalog-review-hardening` passed: 15 focused
  files / 145 tests across 5 Vitest shards, generated-doc `--check`, both diff
  checks, and a conflict-free `git merge-tree` with current `origin/main`.
- Review checkout note: the nested reviewer launched a local `pnpm install`
  and stopped only its own two Node child processes; it did not target Codex or
  pre-existing sessions.

## Open Threads

- Lobster Scout catalog PR1 is open:
  `https://microsoft.ghe.com/bic/lobster/pull/4272`, branch
  `user/giodl/scout-catalog-inventory-plugin`, head `c0386a6b6`, rebased on
  current `origin/main`. Fix follow-up added 2026-07-09: catalog-inventory is
  preserved by the OpenClaw plugin overlay, strict container wiring validation
  now includes the catalog plugin files/CLI/tool contract, shipped-manifest
  tests cover the catalog plugin, and the unrelated `backup_sqlite_snapshot`
  allowance was removed from the catalog PR. Validation passed locally:
  `bash scripts/validate-code-mode-container.sh`,
  `python scripts/openclaw_container_hardening_test.py`, catalog plugin
  `npm test -- --test-reporter=dot`, `cargo fmt --check`, JSON parse smoke,
  node syntax checks, and `git diff --check`. Targeted Cargo tests were
  blocked locally by missing `CARGO_REGISTRIES_LOBSTER_TOKEN`. Live ADO build
  `171662067`: repaired `Validate code-mode container wiring` task passed;
  broader Lobster runtime checks were still running. `GitOps/GitHubPop` still
  needs PoP.
- Lobster Scout catalog PR2 is open:
  `https://microsoft.ghe.com/bic/lobster/pull/4297`, branch
  `user/giodl/scout-catalog-node-prompt`, head `8471b690a`, restacked on PR1
  `https://microsoft.ghe.com/bic/lobster/pull/4272`. Scope: adds a
  catalog-backed `node-operator` prompt projection to Lobster's
  `catalog-inventory` plugin, exposes it through
  `catalog prompt --scope node-operator` and
  `catalog_inventory { action: "nodePrompt" }`, and updates `nodes-code-mode`
  to use the shared catalog renderer instead of a separate hand-written prompt.
  Validation after restack passed: catalog plugin
  `npm test -- --test-reporter=dot`, node-prompt import smoke using
  `renderNodeOperatorPromptReport`, bundled `nodes-code-mode/index.js` syntax
  check, `bash scripts/validate-code-mode-container.sh`, and
  `git diff --check`. Local `nodes-code-mode` tests are blocked because `tsx`
  is not installed in that plugin worktree environment.
- Watch #100960 checks after the rebased push.
- Use the fork-local PRs as review aids; open equivalent upstream PRs only if
  maintainers prefer separate implementation PRs.
