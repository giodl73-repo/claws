# EnterpriseClaw Current Roadmap - 2026-08-04

## Mission

Produce a Lobster-usable OpenClaw fork/image from signed upstream
`v2026.6.33` that carries only traceable, authority-none downstream behavior
until upstream releases or owner-specific replacements let each carry be
deleted.

This roadmap separates three queues:

1. carried upstream PR sources;
2. new EnterpriseClaw contract work from the 35 RFC scopes; and
3. Lobster downstream patches.

They are related, but they are not one ordering. Upstream-carried sources and
new work define or prove portable behavior. Patches keep Lobster working on the
selected release and are retired by proof.

## Immediate Fork/Image Path

| Step | Scope | Done when |
| --- | --- | --- |
| 1 | Keep fork metadata and source-admission controls from `lobster/integration` | Merged fork PRs #203 through #209 remain authority `none`; source heads are exact and reconstructable |
| 2 | Reconstruct signed upstream `v2026.6.33` | Base is deterministic and recorded; `lobster/rebase-v2026.6.33` remains metadata-only |
| 3 | Replay the reduced Lobster adoption layer | The downstream replay branch has one ordered patch stack with no stale patchers, no duplicate replacements, and focused tests for each island |
| 4 | Validate OpenClaw runtime | Targeted readiness, hosting, channel, node, Cron, Teams, memory, approval, and UI tests pass against the exact replay tree |
| 5 | Validate package/container image | Dockerized JS proof is green and remote-harness/NuGet auth blockers are repaired and pushed to the `giodl` fork; latest fork head `e97922975f` also aligns the package-pin contract tests to signed `openclaw@2026.6.33`. Final image materialization is blocked on Lobster npm feed publication for `openclaw@2026.6.33`: the Lobster runtime feed returns `E404`, while ADO promotion run `175419491` saw `2026.6.33` in upstream quarantine but skipped it as age 2d under the 7-day gate. |
| 6 | Validate Lobster adapter | Lobster can select the image, read readiness/hosting signals, route to the fork, roll back, and keep managed policy/fleet authority downstream |
| 7 | Publish migration PR | Only after the exact image digest, source tree, adapter proof, rollback proof, and deletion ledger are recorded |

## Carried Upstream PR Queue

Carried upstream PRs are source generations first. They become active only
through a bounded admission record.

| Queue | PRs | Current role | Next handling |
| --- | --- | --- | --- |
| Bootstrap and source controls | fork PRs #203-#206 | Landed fork machinery | Preserve; use for every future admission |
| EVID-001 managed config/readiness prefix | upstream #107026, #104018, #113421 via fork PRs #207-#208 | Evidence-only, authority none; #104018 is at fork head `a8098928a6b4276a78e3b29c6db76f5aeaef2f9f`, and #113421 is at fork head `65c55a973e2086b96c3175c69ba43a8f8bee8c19`. Both currently show zero visible failures and zero pending checks. | Preserve as source/proof; consume readiness conditions in the Lobster image/adopter proof after package feed and image materialization unblock. |
| EVID-002 hosting profiles | upstream #113422, #114636 via fork PR #209 | Evidence-only, authority none; #113422 is at fork head `b1444c990774de008c550d34c1862ee05e602e4a`, and #114636 is at fork head `3b5fbfd842598db0dfe8e05b0c65f91a05d609d0`. Both currently show zero visible failures and zero pending checks. | Preserve as source/proof; consume hosting profiles and conformance tooling in the v2026.6.33 Lobster image/adopter proof after package feed and image materialization unblock. |
| C1b independent owner evidence | #100960, #104158, #104159, #104160, #112385, #112865, #112896, #115329, #115390 | Source-only/quarantined unless admitted; active tracked heads are #100960 `2155498943dd4687d446b59f3df0124bba59ee51`, #104158 `a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`, #104159 `64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb`, #104160 `42da0fbd0365179ee3ea5c555634ebc186e0007b`, #112385 `041c3d5807ec4214d51ce1d90a0b44246d1584b4`, #112865 `32cd8e68b2d539dc0d6c9b3ef2821c3275961a20`, and #112896 `0c2ec9392063227c93c1d3ab516d195b2de72c8e`. #100960 and #112896 are rebased on current `upstream/main` `dcf7fadf2c03d594f455e140194044a492f1fc6e`; both have patch-equivalent range-diff proof and fresh exact-head ClawSweeper requests. | Watch #100960/#112896 CI/review and repair on the fork only if a concrete failure appears; keep #104158/#104159/#104160 draft unless maintainers explicitly accept source-harness proof or ask us to mark them ready. |
| C2 policy, Doctor, hosted enforcement | #81104, #84472, #98869, #99255, #99619, #101336, #101916, #115408, #116013 | Source-only/quarantined | Wait for policy, assurance, mutation, and host proof gates |
| C3/C4/C5 localization, Claws lifecycle, Rust | Remaining source ledger entries | Source-only/quarantined | Do not activate before the base image and authority gates are proven |

Rule: if an upstream PR merges and ships in a supported upstream release, delete
the carried entry only after the original fixture passes against released bytes
and a residue sweep proves the old path is unreachable.

## New 35-RFC Work Queue

The 35 RFC scopes are the contract portfolio. They should not all become
immediate implementation PRs. They flow through the ten implementation
packages:

| Wave | Package focus | Why here |
| --- | --- | --- |
| 0 | XPK-001 through XPK-009 execution controls | Required before granting authority, mutation, evidence custody, managed policy, release, fleet, or Rust canary behavior |
| 1 | Configuration/readiness/hosting and experience projection | Needed for Lobster to see what is running without owning OpenClaw runtime truth |
| 2 | Identity, authority, protected effects, and delivery | Needed before external actions, approvals, delivery, and retries become enterprise-grade |
| 3 | Knowledge, memory, workspace, data lifecycle, and resources | Needed after owner and effect boundaries are stable enough to avoid a universal resource model |
| 4 | Release, artifact trust, operations, fleet, and Rust Node Mode | Needed for canary, rollback, mixed-version, and exact TypeScript deletion |

For every RFC-derived work item, first classify it as reuse, adopt, extend
existing, new ask, downstream-only, or delete. File upstream only for the
smallest portable owner delta with an exact deletion target.

## Downstream Patch Queue

Current intake ledger:
`projects/enterpriseclaw/lobster-patch-intake-2026-08-06.md`.

Exact image patch manifest choices:
`projects/enterpriseclaw/lobster-image-patch-manifest-2026-08-06.md`.

The v2026.6.33 replay currently carries these downstream islands:

| Island | Current replay state | Roadmap disposition |
| --- | --- | --- |
| Teams | Six commits replayed | Keep for Lobster image unless released upstream replacements cover each behavior; then delete by fixture |
| Cron/Automations | Eight commits replayed | Split Lobster policy from portable scheduler gaps; delete staged-publication and authorization patches after accepted releases |
| Secrets/keyless WebIQ | Replayed | Track upstream keyless fix; keep only if Lobster still needs downstream policy |
| Personality prompt | Replayed | Treat as controlled prompt-extension behavior; replace with upstream owner contract if accepted |
| Node output/deadlines | Replayed plus local integration fixes | Keep only until node invocation/deadline contract lands and release proof passes |
| Memory list Gateway RPC | Replayed | Retire after memory read/list owner decisions and a released OpenClaw path exist |
| Exec approval capability token | Replayed | Keep until exact approval/effect correlation replacement ships |
| Hosted Control UI policy | Replayed plus local integration fixes | Keep as fork/Lobster adapter bridge until #115408/#116013 or successor ships and Lobster no longer depends on the patch |

Patches should be last in authority, not last in execution. Practically, they
must be replayed before Lobster can use the image, but every patch carries an
exit condition and must remain deletable.

## Current Local Proof

Worktree: `C:\src\openclaw-pr6839-v6633-rebase`
Branch: `lobster/pr6839-v2026.6.33-rebase`
OpenClaw replay head:
`91b47e6856a229e2d51c1a21e448843992232d5c`

Reduced patch artifact:
`C:\src\openclaw-pr6839-v6633-rebase\.artifacts\enterpriseclaw-reduced-patches-v2026.6.33-91b47e6`

Lobster image branch:
`C:\src\lobster-pr5402-reviewfix` on `promoteclaw/openclaw-2026.6.11-2`

Focused validation on 2026-08-04:

- `node_modules\.bin\oxfmt.CMD ...` passed on touched replay files.
- `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.ui.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-ui-enterpriseclaw.tsbuildinfo` passed.
- `node scripts/run-vitest.mjs src/gateway/server/readiness.test.ts --reporter=verbose --maxWorkers=1` passed: 96 tests.
- Earlier focused lanes in the same replay session passed for UI settings,
  readiness activation/conditions/execution capabilities, gateway watchdog,
  node-registry, and exec approval/deadline behavior.
- Additional `0028` node-invoke session-binding port passed:
  `node scripts/run-vitest.mjs src/agents/tools/nodes-tool.test.ts src/gateway/node-invoke-sanitize.test.ts src/gateway/server-methods/nodes.invoke-wake.test.ts --reporter=verbose --maxWorkers=1`
  and the same UI test typecheck cache.
- Additional `0030` structured node command policy compatibility passed
  `node-command-policy.test.ts` and `node-mode.test.ts`.
- Additional `0031` scoped test-stability fix passed
  `test/scripts/lobster-contracts.test.ts` and the full
  `src/cron/service/timer.regression.test.ts` file with `CI=true`.

Local fixups restored hosted-control/readiness integration on top of the replay
branch:

- added missing hosted UI policy module;
- repaired app-render syntax from the replay;
- added Gateway config readiness typing;
- restored UTF-8 truncation helper;
- restored channel autostart suppression semantics required by hosting
  readiness; and
- preserved session-entry prompt extension keys.

The current OpenClaw realized patch artifact contains 25 generated patch files
after hosting base `67aab04e5e1`: the replayed Teams island, Cron island,
independent secrets/prompt/node/memory/approval/UI carries, the replay
integration fix, trusted node-invoke session binding, structured node command
policy compatibility, and scoped test stability.

The Lobster image branch now carries a 26-file Docker patch queue against the
fresh-clone signed release commit `v2026.6.33`
(`7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e`):

- `0000-enterpriseclaw-upstream-evidence-slices.patch` replays the admitted
  upstream evidence-slice delta from the signed release to the metadata base.
- 25 residual Lobster patches apply after that metadata base.
- Dropped/deferred old PR #6839 inputs: `0014`, `0020`, `0021`, `0023`,
  `0025`, `0027`, and the 2026.6.11-only `0029-openclaw-6.11-port-corrections`.

2026-08-06 patch-count update:

- `C:\src\lobster-promote-633-pinfix` is the validated 28-physical-patch
  branch at `e97922975f`, pushed to the `giodl` fork branch
  `promoteclaw/openclaw-2026.6.33`.
- `C:\src\lobster-promote-633` is a clean 30-physical-patch candidate at
  `3d09706faaf8`. It keeps the 28-file base and intentionally adds
  current-main `0031-cron-wake-only-payload-kind.patch` plus
  `0032-channel-participant-capability-surface.patch`; readiness/node-policy
  and scoped test-stability then shift to `0033` through `0035`.
- `C:\src\lobster-pr6839-fix` is a conflicted legacy PR #6839 repair tree with
  33 physical patch files excluding `0000`. It is a candidate-delta source
  only; do not port it wholesale.
- The older "31 patch" label is not currently a verified clean
  `v2026.6.33` physical patch queue. Before starting a fork with that label,
  name the 31st file, prove the Lobster dependency, apply it cleanly, validate
  it, and record its deletion condition.
- The older sensitivity, retry/session-init, DoltLite/SQLite, test-order,
  per-send sensitivity, and 2026.6.11 correction patches stay out unless
  current Lobster dependency proof exists.

Validation:

- `just openclaw-patches-check --offline` passed.
- The clean `C:\src\lobster-promote-633-pinfix` branch passed the 28-patch offline
  gate: all patch files are documented, applied by Dockerfile order, covered by
  the scoped JS runner, and pinned to `openclaw 2026.6.33` / `v2026.6.33` /
  `7af0cfc9c548`.
- A clean-branch source audit found no current `payload.kind`, literal
  `kind: "wake"`, `wake-only`, `CronWake`, or retained-wake caller in `src`,
  `scripts`, `docs`, or `.pipelines`, so the 32-only wake patch remains out.
- Dockerized OpenClaw JS unit proof passed: msteams patched-source, upstream
  evidence/readiness/hosting scoped tests, and vendored m365mail tests are
  green.
- `scripts/build-openclaw.sh` now preserves fresh caller package/feed tokens
  over stale `.env.cargo-auth` values, and the remote-harness Docker stage now
  uses the same explicit temporary npmrc auth pattern as the OpenClaw JS stages.
- `scripts/ensure-openclaw-image.sh` advanced through remote-harness npm
  install/build/prune and NuGet after those repairs, then failed at final
  runtime dependency materialization with npm `ETARGET`: no matching version
  found for `openclaw@2026.6.33` in the Lobster npm feed. No updated image
  digest exists yet.
- The repair set was committed as
  `bf72332b7172e68892bbbfe8724e8e1fc9a962ff` and pushed only to the `giodl`
  fork remote on branch `promoteclaw/openclaw-2026.6.33`.
- Follow-up commit `e97922975f` on the same `giodl` fork branch aligns the
  Python SDL and Rust adapter package-pin contract tests with signed
  `openclaw@2026.6.33`. Validation from the clean sibling worktree
  `C:\src\lobster-promote-633-pinfix` passed the exact Python SDL test, the
  targeted Rust adapter test, `git diff --check`, and
  `just openclaw-patches-check --offline`.
- The clean 30-file current-promote candidate at `3d09706faaf8` now has the
  same Dockerized OpenClaw JS proof class: after refreshing repo-local auth
  with `just rust-auth`, `just openclaw-js-unit-tests` passed msteams
  patched-source tests, upstream evidence/readiness/hosting scoped tests, and
  vendored m365mail tests. It remains a candidate rather than the default path
  until wake-only Cron, Channel Participant, and the per-thread Teams route
  update are accepted as initial carries.
- Feed/promotion evidence on 2026-08-06: the latest scheduled ingest run
  `175490098` (`Lobster-Ingest-Upstream`, `20260806.18`) resolved the default
  target to `openclaw@2026.7.1-2`, found it already in
  `M365-Lobster-Upstream`, and promoted it to `@quarantine`. The latest
  scheduled promotion run `175419491` (`Lobster-Promote-OpenClaw-LTS-Packages`,
  `20260806.1`) enumerated `openclaw@2026.6.33` in upstream quarantine but
  skipped it as `age: 2d (required: 7d)`, while promoting/publishing 28
  eligible older versions and skipping those already present on the Lobster
  feed. Public npm reports `openclaw@2026.6.33` exists with tarball
  `https://registry.npmjs.org/openclaw/-/openclaw-2026.6.33.tgz`, but Lobster
  image materialization must use the configured Lobster feed unless an explicit
  alternate package source is approved.

Upstream PR #100960 follow-up work on 2026-08-04:

- 2026-08-06 restack: clean worktree
  `C:\src\openclaw-pr100960-tools-commands-main` rebased the four-commit
  command inventory branch from
  `8e72d20247b3adbd447fd738338ab3a93319ca5f` to
  `321a1a4fed537f4ca530c8134427a415eefe3bba` on `upstream/main`
  `05e3ce11aca70c6896d6a06047a663c90850449c`. `git range-diff` showed all
  four commits patch-equivalent; `git diff --check upstream/main..HEAD` and
  conflict-marker search passed. Focused Vitest was not rerun locally because
  this checkout has no dependency materialization, and the older WSL proof
  checkout is dirty and on a pre-restack head. The branch was force-updated
  only on the fork with an exact lease, the PR body was corrected to describe
  the proof boundary, and `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/100960#issuecomment-5208249311`.
  Watch CI/review before restacking the draft command children.
- Clean worktree: `C:\src\openclaw-pr100960-command-inventory-clean` on
  `enterpriseclaw/pr100960-command-inventory-clean`.
- Commit `e48cbbcedf3` narrows the command inventory slice so it no longer
  reserves a top-level `openclaw commands` root; the inventory is exposed as
  `openclaw plugins commands` under the existing plugins namespace.
- Commit `e48cbbcedf3` removes the proposed public plugin descriptor fields
  `effectProfile`, `commandExposure`, and `hidden` from the plugin SDK
  descriptor contract. Core command metadata remains intact.
- Focused proof passed on the clean worktree using cached Node `v24.15.0`:
  `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/inspect.test.ts src/cli-catalog-overlay/plugin-commands.test.ts src/cli/program/subcli-descriptors.test.ts src/plugins/captured-registration.test.ts src/plugins/loader.cli-metadata.test.ts --reporter=verbose --maxWorkers=1`
  and `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json
  --incremental --tsBuildInfoFile
  .artifacts/tsgo-cache/test-src-pr100960-clean.tsbuildinfo`.
- Clean-worktree validation passed: `pnpm format:check -- <19 touched files>`,
  `node scripts/docs-list.js`, `node scripts/generate-docs-map.mjs`, and
  `git diff --check`.
- The PR branch `user/giodl/cli-catalog-review-hardening` was pushed to
  `e48cbbcedf3014d7f54abd8395442864a499f4f3`. GitHub checks passed for that
  head: Real behavior proof, dependency guard, security-sensitive guard,
  dispatch, auto-response, and labeler.
- The PR body was updated to remove stale `openclaw commands` and plugin
  descriptor metadata claims, and to record exact-head proof. A ClawSweeper
  re-review was requested at
  `https://github.com/openclaw/openclaw/pull/100960#issuecomment-5186718928`
  and acknowledged at
  `https://github.com/openclaw/openclaw/pull/100960#issuecomment-5186719169`;
  the durable review completed for exact head `e48cbbcedf3`.
- Fresh ClawSweeper review no longer reports the removed plugin descriptor SDK
  expansion as the blocker. It now blocks on two P1 compatibility issues:
  `openclaw plugins commands` still consumes a plugin-owned nested command path,
  and startup policy still catalogs the old top-level `commands` path.
- An exploratory rebase onto current `upstream/main` was attempted and aborted
  cleanly after confirming current main's startup-policy invariant requires each
  catalog path to be registered, explicitly reserved, or plugin-owned.

Upstream PR #104158 follow-up work on 2026-08-04:

- Clean worktree: `C:\src\openclaw-pr104158-node-rebuild` on
  `enterpriseclaw/pr104158-node-rebuild`.
- Commit `2510718e835` rebuilds the live paired-node command inventory slice on
  top of #100960 head `e48cbbcedf3` and preserves the narrowed command inventory
  entry point from #100960.
- Focused proof passed using cached Node `v24.15.0`:
  `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/live-node-commands.test.ts --reporter=verbose --maxWorkers=1`
  passed 18 focused tests.
- `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json
  --incremental --tsBuildInfoFile
  .artifacts/tsgo-cache/test-src-pr104158-node-rebuild.tsbuildinfo`,
  `pnpm format:check -- <7 touched files>`, and `git diff --check` passed.
- The PR branch `user/giodl/commands-upstream-node` was updated with
  `--force-with-lease` from old head `4a2d0ad06fe` to
  `2510718e8357601f7f4ca23f44428a259f4b459e`. The PR body was updated with
  exact proof and dependency state. Visible GitHub checks passed, but the PR
  remains draft and dirty against `main` because #100960 is still unresolved.

Upstream PR #100960 current-main rebuild on 2026-08-05:

- New worktree: `C:\src\openclaw-pr100960-tools-commands-main` on
  `enterpriseclaw/pr100960-tools-commands-main`, based on current
  `upstream/main` `392e1c0620b`.
- Commit `13ddbc80a4be7e432954d456802f955b9488b3a9` rebuilds #100960
  as `openclaw tools commands` instead of `openclaw plugins commands`.
  `tools` is now a registered built-in sub-CLI, no longer a reserved
  non-plugin root, and `plugins` no longer owns the inventory subcommand.
- This commit preserves the earlier descriptor boundary fix: plugin CLI
  descriptors still expose parse-time shape only, while core-owned catalog
  metadata carries effect/exposure fields.
- `git diff --check HEAD~1..HEAD` passed, stale `openclaw plugins commands`
  references were removed from `src/` and `docs/`, and repo-local autoreview
  exited cleanly with
  `C:\src\claws-hapi\.agents\skills\autoreview\scripts\autoreview --mode uncommitted`.
- Windows dependency materialization remained blocked by package feed/TLS
  failures, so validation moved to a native WSL checkout at
  `/tmp/openclaw-pr100960-tools-validate`. `pnpm install --frozen-lockfile
  --reporter=append-only` passed there with Node `v24.15.0` and pnpm
  `v11.15.1`.
- Focused Vitest passed 4 shards / 58 tests for the command catalog, root
  descriptors, plugin metadata, and registration policy. `pnpm docs:list`,
  `pnpm docs:map:gen`, `pnpm format:check -- <29 touched files>`, and
  `git diff --check HEAD~1..HEAD` passed.
- Real CLI proof passed for
  `OPENCLAW_PROFILE=pr100960-proof node scripts/run-node.mjs tools commands
  list --json` and `... tools commands inspect gateway status --json`; the
  inventory included both built-in `tools` and `tools commands`, and inspection
  found `gateway-status`.
- CI on prior pushed heads exposed a type-name mismatch in
  `src/plugins/cli-registry-loader.ts`, unused catalog metadata normalizers,
  and compact-shard test expectations around logging-state cleanup and the
  now-plugin-discoverable `tools` root. The current head fixes all three.
  Local WSL reruns passed the focused catalog metadata tests,
  `pnpm deadcode:full`, and the affected compact-shard files
  `src/cli/catalog-cli.test.ts` plus `src/cli/run-main.exit.test.ts`
  (213 tests).
- The PR branch `user/giodl/cli-catalog-review-hardening` was force-updated
  through `5560b84f3c2`, `9aa4eceb016`, `c07c0b1cabf`, and current
  `13ddbc80a4b` with exact leases. The PR body was updated with exact real
  behavior proof, and `@clawsweeper re-review` was requested again at
  `https://github.com/openclaw/openclaw/pull/100960#issuecomment-5187562824`.
  Fresh GitHub checks are running; early guards, docs, prod types, plugin SDK
  baseline, and several focused shards have passed, while the full CI matrix
  and ClawSweeper durable verdict are pending.

Upstream PR #104158 current-main restack on 2026-08-05:

- Worktree: `C:\src\openclaw-pr104158-node-rebuild` on
  `enterpriseclaw/pr104158-node-rebuild`.
- Commit `7a7b723f677001346c2a9f1dde69623ae4727ea8` restacks live paired-node
  command inventory on top of #100960 head
  `13ddbc80a4be7e432954d456802f955b9488b3a9`.
- WSL validation reset `/tmp/openclaw-pr100960-tools-validate` to #100960
  `13ddbc80a4b`, applied the #104158 delta, and passed
  `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/live-node-commands.test.ts --reporter=verbose --maxWorkers=1`
  (18 tests), `pnpm format:check -- <7 touched files>`, `git diff --check`,
  and `pnpm deadcode:full`.
- The PR branch `user/giodl/commands-upstream-node` was force-updated with
  exact lease from `b9ae9751beb` to `7a7b723f677`. The PR body was updated
  with current dependency and validation. It remains draft because exact live
  paired-node proof is still required before merge readiness.
- Follow-up exact-head proof at #104158 head
  `f123c84735777e4f39adf27321ab23975a5a827f` in WSL
  `/tmp/openclaw-pr100960-tools-validate` passed
  `node scripts/run-vitest.mjs run src/gateway/server.node-pairing-authz.test.ts --reporter=verbose --maxWorkers=1 --testNamePattern "requests re-pairing when a paired node reconnects with upgraded commands|clears stale reapproval when a node returns to its approved surface"`
  with 2 live Gateway paired-node command-surface tests, plus
  `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts --reporter=verbose --maxWorkers=1 --testNamePattern "includes commands from one connected paired node when requested"`
  proving CLI projection from `node.describe` into
  `tools commands list --json --node`. A temporary spawned child-process CLI
  proof harness was attempted but hung before setup markers; it was removed
  without source changes. Treat the supplemental proof as exact-head support,
  not as a replacement for maintainer-requested spawned CLI proof.
- The PR body was then replaced from
  `projects/enterpriseclaw/pr-bodies/openclaw-104158.md` using the exact
  OpenClaw Real behavior proof schema. The GitHub Real behavior proof check
  is now successful on the current head, and `@clawsweeper re-review` was
  requested at
  `https://github.com/openclaw/openclaw/pull/104158#issuecomment-5188190152`.
- Follow-up repair at #104158 head
  `428b385479686827862155e56a726f19be3d764b` fixes the durable review
  findings: Gateway-valid command strings are preserved, connected-but-unpaired
  nodes are rejected, successful empty live queries retain live provenance,
  node labels are sanitized before Markdown output, and the docs now list the
  live paired-node flags and semantics. WSL validation passed 22 focused
  catalog/list/CLI tests, 2 live Gateway paired-node command-surface tests, a
  broader 276-test catalog/CLI/plugin cluster, `oxfmt --check`,
  `git diff --check`, and `pnpm deadcode:exports`. Windows focused Vitest was
  blocked by the checkout-local `configureFsSafeNative` environment error, and
  `check-changed` was blocked by unavailable Crabbox `ci-fast` capacity plus an
  unrelated stack-wide max-lines baseline shrink. The PR body was updated again
  from `projects/enterpriseclaw/pr-bodies/openclaw-104158.md`; Real behavior
  proof is green, and `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104158#issuecomment-5188461338`
  with ack
  `https://github.com/openclaw/openclaw/pull/104158#issuecomment-5188461720`.
- Follow-up restack at #104158 head
  `4e4cfc9d09742aa2cf46171559e2f826a75f88be` moves the live-node command
  inventory child branch onto #100960's current repaired parent
  `7cb8c5b38755cbe367597e97e24dd3a594bfc933`, dropping duplicate parent
  repair commits. It also fixes the clean WSL validation regression where
  node-supplied invocation hints with row-breaking whitespace could break
  generated Markdown table rows. Windows formatter and diff checks passed;
  clean WSL validation passed 28 focused catalog/list/live-node/CLI tests,
  a broader 279-test catalog/CLI/plugin cluster, `oxfmt --check`, `git diff
  --check`, and `pnpm deadcode:exports`. The branch was force-pushed with an
  exact lease to `giodl73-repo/openclaw:user/giodl/commands-upstream-node`;
  the PR body was updated and `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104158#issuecomment-5193003351`.

Upstream PR #104159 current-main restack on 2026-08-05:

- Worktree: `C:\src\openclaw-pr104159-prompt-rebuild` on
  `enterpriseclaw/pr104159-prompt-rebuild`.
- Commit `980b637eb0c3abe16d513b54ba82297e0833602d` restacks scoped command
  prompt projection on top of #104158 head `7a7b723f677`.
- Conflict resolution preserved current main's project-scoped curated context
  filtering while adding command inventory prompt projection for the embedded
  runner and system prompt surfaces.
- WSL validation at exact head passed 161 focused tests across command catalog,
  live-node inventory, prompt projection, command inventory prompt, system
  prompt, and embedded-runner prompt files. `pnpm format:check -- <11 touched
  files>`, `git diff --check 7a7b723f677001346c2a9f1dde69623ae4727ea8..HEAD`,
  and `pnpm deadcode:full` passed.
- The PR branch `user/giodl/commands-upstream-prompt` was force-updated with
  exact lease and the PR body was updated with current dependency and
  validation. It remains draft pending parent readiness and exact prompt/live
  behavior proof.
- Follow-up exact-head prompt proof at #104159 head
  `b9cdaec9b56d598517955e505276434f44b382ca` in WSL
  `/tmp/openclaw-pr100960-tools-validate` passed
  `node scripts/run-vitest.mjs run src/cli-catalog-overlay/prompt-projection.test.ts src/agents/command-inventory-prompt.test.ts src/agents/system-prompt.test.ts src/agents/embedded-agent-runner/system-prompt.test.ts --reporter=verbose --maxWorkers=1 --testNamePattern "command|Command|node-operator|inventory|prompt"`
  with 60 focused prompt/projection tests across 5 Vitest projects.
- The PR body was then replaced from
  `projects/enterpriseclaw/pr-bodies/openclaw-104159.md` using the accepted
  Real behavior proof schema. The GitHub Real behavior proof check is
  successful on the current head, and `@clawsweeper re-review` was requested
  at
  `https://github.com/openclaw/openclaw/pull/104159#issuecomment-5188209047`.
  The proof remains source-harness prompt construction proof, not a live
  provider/model conversation.
- Follow-up repair at #104159 head
  `eec8e3e41c51bf8724b705e84f6376107ae61d7d` restacks on #104158
  `428b3854796` and fixes the durable review findings: complete model-visible
  projection cap, node prompt-visibility enforcement, safe node argument-hint
  filtering, unknown plugin descriptor semantics, and compaction prompt
  parity. WSL validation passed 124 prompt/command tests, 10 projection tests,
  12 embedded prompt tests, 6 targeted compaction prompt tests,
  `oxfmt --check`, `git diff --check`, and `pnpm deadcode:exports`. The PR
  body was updated from `projects/enterpriseclaw/pr-bodies/openclaw-104159.md`
  and `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104159#issuecomment-5188564109`
  with ack
  `https://github.com/openclaw/openclaw/pull/104159#issuecomment-5188564534`.
  Real behavior proof and exact ClawSweeper review are running on the new head.
- Follow-up restack at #104159 head
  `6cd9b578207fc53a960f966b0f5cd7c0605aa2db` moves the prompt-projection
  child branch onto #104158's current restacked head
  `4e4cfc9d09742aa2cf46171559e2f826a75f88be`. Clean WSL validation used
  temporary commit `a135dd953fe4b07a861d40c99168306b7ddeff5a` on top of
  #104158 and passed 174 focused command catalog, prompt projection, system
  prompt, and embedded prompt tests; 3 targeted compaction prompt tests;
  `oxfmt --check`; `git diff --check`; and `pnpm deadcode:exports`. The
  branch was force-pushed with an exact lease to
  `giodl73-repo/openclaw:user/giodl/commands-upstream-prompt`; the PR body was
  updated and `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104159#issuecomment-5193080628`.
- Follow-up ClawSweeper repair at #104159 head
  `31a1422983736db10ed528305d2452b4a85bedad` caps the fully rendered
  command-inventory prompt section, advertises only generic-node-invoke
  compatible commands by default, and carries `commandInventory` through the
  typed compaction runtime params. WSL validation in
  `/tmp/openclaw-pr100960-tools-validate` passed the focused prompt,
  projection, system prompt, embedded prompt, and compaction Vitest set;
  `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json`;
  `pnpm deadcode:exports`; `pnpm exec oxfmt --check` on all 8 touched files;
  and `git diff --check`. The branch was pushed to
  `giodl73-repo/openclaw:user/giodl/commands-upstream-prompt`, the PR body was
  updated from `projects/enterpriseclaw/pr-bodies/openclaw-104159.md`, and
  `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104159#issuecomment-5194369294`.

Upstream PR #104160 current-main restack on 2026-08-05:

- Worktree: `C:\src\openclaw-pr104160-docs-rebuild` on
  `enterpriseclaw/pr104160-docs-rebuild`.
- Commit `3f95c85a3656ae3bf37bc7d278b32d280db1da17` restacks the generated
  command reference guard on top of #104159 head `eec8e3e41c5`.
- The repair keeps `docs/docs_map.md` as the source stub and removes the
  duplicate docs-map script/check wiring; the existing publish/package renderer
  remains the docs-map owner. It also normalizes
  `OPENCLAW_ENABLE_PRIVATE_QA_CLI` and `OPENCLAW_EXPERIMENTAL_CLAWS` while
  generating public command docs, preserves generated live-node CLI flag
  documentation, removes the duplicate nav entry, caps command prompt guidance,
  and hides host CLI routes in Code Mode prompts.
- WSL validation used `/tmp/openclaw-pr100960-tools-validate` reset to #104159
  `eec8e3e41c51bf8724b705e84f6376107ae61d7d` with this PR's diff applied.
  It passed 4 Vitest shards / 114 tests, `pnpm docs:commands:check`, `oxfmt
  --check`, `git diff --check`, and `pnpm deadcode:exports`.
- The PR branch `user/giodl/commands-upstream-docs` was force-updated from
  `2c0b0ffe7fe` to `3f95c85a3656`. The PR body now records the exact WSL
  proof. `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104160#issuecomment-5188702737`
  with ack
  `https://github.com/openclaw/openclaw/pull/104160#issuecomment-5188703160`.
  The proof is source-harness generated-docs and prompt-surface proof; no
  deployed docs site was rendered.
- Follow-up restack at #104160 head
  `d4cc71e1a7e8cc2bb89f97f671af7e22b32da12e` moves the generated docs/prompt
  guard child branch onto #104159's current restacked head
  `6cd9b578207fc53a960f966b0f5cd7c0605aa2db`. Clean WSL validation used
  temporary commit `054d6e57b5917513bd1446bc4efdf8922b583664` on top of
  #104159 and passed 250 focused generator/workflow/prompt/projection tests,
  `pnpm docs:commands:check`, `oxfmt --check`, `git diff --check`, and
  `pnpm deadcode:exports`. The branch was force-pushed with an exact lease to
  `giodl73-repo/openclaw:user/giodl/commands-upstream-docs`; the PR body was
  updated and `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104160#issuecomment-5193139652`.
- Follow-up repair/restack at #104160 head
  `d7c0abb33737a9e596567c08bc6d8cb680b4de4a` moves the docs/prompt child
  branch onto #104159 `31a1422983736db10ed528305d2452b4a85bedad` and repairs
  the latest review findings: typed Code Mode state now reaches compacted
  prompt rebuilds, plugin-owned descendants remain reachable below the
  core-owned `tools` namespace, and private QA plus experimental Claws
  descriptor gates participate in docs freshness. WSL validation in
  `/tmp/openclaw-pr100960-tools-validate` passed focused Vitest coverage for
  command policy, docs guard/generator, prompt/projection, embedded prompt,
  and compaction; `pnpm docs:commands:check`; test tsgo; `pnpm
  deadcode:exports`; `oxfmt --check` on 16 touched files; and `git diff
  --check`. The branch was force-updated with exact lease to
  `giodl73-repo/openclaw:user/giodl/commands-upstream-docs`, the PR body was
  updated from `projects/enterpriseclaw/pr-bodies/openclaw-104160.md`, and
  `@clawsweeper re-review` was requested at
  `https://github.com/openclaw/openclaw/pull/104160#issuecomment-5194573817`.

## Next Execution Order

1. Choose the image-fork patch manifest explicitly before more branch work:
   keep the conservative 28-file `pinfix` queue for the fastest validated
   Lobster image path, or promote the clean 30-file current-main parity queue
   only after accepting wake-only Cron and Channel Participant as intentional
   carries. Do not create or advertise a 31-file fork until the extra file is
   named and proven. The exact choices are recorded in
   `lobster-image-patch-manifest-2026-08-06.md`.
2. Let normal quarantine promotion publish `openclaw@2026.6.33` to the Lobster
   npm feed after the 7-day gate, or get an approved Day0 work item before
   manually queueing `Lobster-Promote-OpenClaw-LTS-Packages` with
   `specificVersion=2026.6.33 day0Override=true`. Do not queue Day0 without
   that work item. The package exists in upstream quarantine but is not yet in
   the Lobster runtime feed, so latest image materialization reached the feed
   and failed with npm `ETARGET` for `openclaw@2026.6.33`.
3. Re-run `just openclaw-js-unit-tests` only if the patch queue changes, then
   rerun `scripts/ensure-openclaw-image.sh` from
   `C:\src\lobster-promote-633-pinfix` at fork commit `e97922975f` and record the
   exact image digest.
4. Run Lobster adapter validation against the exact image: readiness RPC,
   hosting profile selection, route/rollback, and managed-policy boundaries.
5. Preserve the stale timeout patcher removal already made in
   `C:\src\lobster-pr5402-reviewfix`; upstream `openclaw@2026.6.33` owns the
   bundle-MCP request-timeout behavior, and local Lobster validators plus
   `just openclaw-patches-check --offline` have passed with the patcher gone.
6. Publish the fork/image migration PR with tree SHA, image digest, adapter
   proof, rollback proof, and patch deletion ledger.
7. Watch #100960 at exact head
   `2155498943dd4687d446b59f3df0124bba59ee51` and #112896 at exact head
   `0c2ec9392063227c93c1d3ab516d195b2de72c8e`: both are rebased on current
   `upstream/main` `dcf7fadf2c03d594f455e140194044a492f1fc6e`, GitHub checks
   are attaching, and the PR bodies / ClawSweeper re-review requests are
   updated for the restored-hold startup-pending exception, same-journal
   startup descriptor binding, Admin HTTP RPC restore-status suspension
   exception, and clean rebase-only refresh.
8. Keep #104158, #104159, and #104160 draft until maintainers explicitly
   accept source-harness proof or ask us to mark them ready; they currently
   have zero visible failures and zero pending checks.
9. Resume 35-RFC implementation package work only after the base image is
   usable and the relevant owner/deletion gate is explicit.
