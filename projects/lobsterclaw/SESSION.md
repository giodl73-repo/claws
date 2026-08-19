# LobsterClaw Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Check live `bic/LobsterClaw` PR and branch state.
4. Check both WSL worktrees before acting.

## Baseline

- Area: LobsterClaw
- Primary repo: `https://microsoft.ghe.com/bic/LobsterClaw`
- Provenance worktree: `/root/src/lobsterclaw-provenance-v1`
- Patch scratch worktree: `/root/src/openclaw-microsoft-2026.6.33-lobster-7055`
- Upstream base: `v2026.6.33` / `7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e`
- Patch source: `bic/lobster` PR #7055 head `6bb4b88ee4b2ce0452d0715ffe6aeb33cb7b292c`
- Skill to use: `project-session`

## Current Session

- Last updated: 2026-08-18
- Last agent: GitHub Copilot CLI
- Current focus: land LobsterClaw PR #27 so generated-release artifact ownership
  moves into LobsterClaw, then rerun all five full qualification lanes for the
  immutable strict-parity v5 generation before making them blocking.
- Integration portfolio: branch
  `user/giodl/qualification-parity-2026.6.33-v4` now publishes a CI-validated
  `.lobsterclaw/integration-candidates.json` ledger. Its backward-compatible
  schema extension tracks 23 Gio-owned RFC PRs, 23 linked
  implementation/adopter PRs, direct upstream PR candidates, three
  fork-incubated proposals, five strategic adjacent RFCs,
  decisions, admitted manifest patch IDs, and exit conditions without treating
  a proposal as shipped release behavior. Peter's merged OpenClaw #90431
  node-hosted plugin tools/MCP/skills work is the first direct upstream PR row.
  The human-readable definitive view is
  `integration-portfolio-2026-08-18.md`. The authoritative LobsterClaw copy and
  backward-compatible schema extension merged in
  [LobsterClaw PR #26](https://microsoft.ghe.com/bic/LobsterClaw/pull/26) at
  `d2035cf1e7`. The PR body and diff contain no EnterpriseClaw references.
- Active branches:
  - `lobsterclaw/provenance-v1`, merged by LobsterClaw PR #1 at `3bdfd42af8c`.
  - `lobsterclaw/2026.6.33-7055-v2`, repaired generation at
    `3f38843bef3`, merged by LobsterClaw PR #2.
  - `lobsterclaw/repository-governance-default`, default-branch governance
    merged by LobsterClaw PR #3.
  - `lobsterclaw/repository-governance-release-2026.6.33`, active-generation
    governance merged by LobsterClaw PR #4 at `026d6ea49f2`.
  - `azure-pipelines`, branch-aware bootstrap CI merged by LobsterClaw PR #5
    from `64ec71767f2`.
  - `lobsterclaw/upstream-ref-provenance`, upstream lifecycle metadata merged
    by LobsterClaw PR #6 at `7bff57b3973`.
  - `lobsterclaw/generation-acceptance-ci`, merged by LobsterClaw PR #7 at
    `df302e59d9d`; it imports and verifies the release evidence feed, emits an
    isolated 295-registration `cgmanifest.json`, and runs dedicated CG plus
    generation acceptance jobs.
  - `lobsterclaw/release-qualification-2026.6.33`, merged by LobsterClaw PR #9
    at `e2026496bf`. It includes merged PR #10, binds five required source
    qualification lanes to the exact 6.33 release identity, and keeps them
    non-blocking while baseline failures are classified.
  - `lobsterclaw/patch-repair-lineage`, merged by LobsterClaw PR #10 at
    `9d37a536fa`. It adds ordered `repairs` links from a repair patch to prior
    patch IDs and attributes existing build-repair patch 0040 to patches 0000,
    0031, 0035, 0037, and 0039.
  - `release/2026.5.28`, pushed at signed upstream commit `e93216080aa1`.
    `lobsterclaw/2026.5.28-active` merged by LobsterClaw PR #11 at
    `4737fde39a`; it replays Lobster Active's exact 35-patch queue from
    `b292a70698` and records generated source tree `653c7f556fae`.
  - `lobsterclaw/release-qualification-2026.5.28`, merged by LobsterClaw PR #12
    at `81fca69ef0`. It adds a 314-entry exact-generation production dependency
    graph, 311 Component Governance registrations, nine-test generation
    acceptance, and five non-blocking source qualification lanes.
  - `lobsterclaw/repair-qualification-harness-2026.6.33`, merged by
    LobsterClaw PR #13 at `af305684b1`. It installs the exact
    SHA-512-pinned pnpm through the approved internal mirror, invokes pnpm
    directly, gates source lanes on bootstrap success, and fixes Windows pool
    routing. PR runs now use focused generation acceptance plus Linux checks;
    exact release commits retain the full five-lane qualification matrix.
  - `lobsterclaw/repair-qualification-harness-2026.5.28`, merged by
    LobsterClaw PR #14 at `9f40f304a1` with the same release-local harness
    repair and fast/full split.
  - `lobsterclaw/2026.6.33-7055-final`, merged by LobsterClaw PR #15 at
    `a485a37194` from generation head `efdd83ec4f`. It is a four-commit
    incremental update on the current release branch, publishes the exact
    40-patch generation, preserves repository governance and the merged
    qualification harness, and verifies canonical source tree
    `d40c6b489f3aa3cfbb1c6feaa7fc0fd5d525c183`.
  - `lobsterclaw/qualify-release-2026.6.33`, merged by LobsterClaw PR #16 at
    merge commit `cc5732b7f8`. It runs qualification from the exact 40-patch source tree
    `d40c6b489f3aa3cfbb1c6feaa7fc0fd5d525c183`, excluding repository metadata
    by construction, uses deterministic Git/build identity, and gives the
    existing shrinkwrap command a 30-minute qualification budget.
  - `lobsterclaw/qualify-release-2026.5.28`, merged by LobsterClaw PR #17 at
    merge commit `4320a8dca1`. It runs qualification from the exact 35-patch source tree
    `653c7f556faefa047f8d32a9ef66f4dc8af7271d`, classifies dependency-evidence
    `.gitignore` entries as repository metadata, and uses the same deterministic
    qualification checkout.
  - `lobsterclaw/qualify-release-2026.6.33`, follow-up PR #18 merged at
    `566fd90276`. It accepts Azure DevOps' short pull-request target branch form
    and prevents ambient CI branch variables from contaminating qualification
    tests.
  - `lobsterclaw/release-coverage-contract`, merged as LobsterClaw PR #19 at
    `0f3a5a42c0` from head `39904959c1`. It adds the central
    Lobster-authoritative supported-release admission gate, binds each release
    through generation tag, commit, manifest blob, and coverage snapshot, and
    requires evidence-backed dispositions for asymmetric behaviors.
  - `lobsterclaw/release-lifecycle-fixture`, open as LobsterClaw PR #20 at
    `8149c4f2ea`. It adds a hermetic `2099.*` rehearsal that proves exact
    upstream PR-head import, order-sensitive replay, immutable generation
    publication, support admission, promotion, rollback, source parity after
    upstream adoption, and tamper rejection. All 20 contract tests and the
    production release-coverage validator pass; 22 tests and release coverage
    pass, and Codex autoreview is clean.
    Disposable branch `fixture/release-lifecycle-rehearsal` has unique marker
    `cf0d22ca91`; because Azure reads CI branch filters from the default-branch
    pipeline definition, push or update that ref again after PR #20 merges to
    prove the new `fixture/*` trigger independently.
  - Lobster `user/giodl/lobsterclaw-consumer`, open as PR #8363 at
    `f8d3dfd431`. It pins 5.28 Active at `81fca69ef0` and strict-parity v3
    Candidate at `e077e241c3`, removes Docker-time patch replay, builds both lineages with
    generation-specific cache identity, prevents Active/Candidate local-image
    reuse collisions, and enforces 33 shared plus nine explicitly dispositioned
    asymmetric behaviors. Both lineages now run applicable source contracts and
    focused JS tests, and CI rejects a source ref that does not equal
    `v<openclawVersion>`. Active proof now derives all 97 applicable
    patch-owned tests from the immutable generation, normalized patch-name
    collisions fail, and source-tree pins require exact 40-character lowercase
    SHA-1 equality. Lobster now also binds those pins to merged support-contract
    commit `0f3a5a42c0` through a third immutable LobsterClaw gitlink. The gate
    reads and validates the authoritative contract blob, full release and
    behavior coverage,     exact generation manifests, all 42 retained Candidate patch sources, and
    every manifest's historical commit/path bytes; metadata-only renames remain
    in patch-owned test discovery. Active
    full-image verification receives the selected lineage, and targeted
    Active/Candidate checks work. The branch-level Codex autoreview is clean.
    The 37-test aggregate gate, 75-patch transition parity, focused regressions,
    and final Codex autoreview pass. Inspektor approved exact head
    `f8d3dfd431`; a refresh of Galin's older request-changes review is requested.
    The PR is mergeable but blocked: GitHubPop is failed and both required
    Lobster runtime contexts are absent.
  - Lobster `user/giodl/openclaw-633-qualification-repairs`, open as PR #9364
    at `ced2c62702`. Patch 0045 makes Microsoft-feed shrinkwrap checks
    deterministic without masking graph/version changes, records reviewed
    config and Plugin SDK generated artifacts/budgets, and marks custom
    `web_fetch` header values sensitive. Lobster PR CI now runs OpenClaw's own
    `release:generated:check` against the exact patched source before the
    unpublished m365mail overlay, with ephemeral feed auth. The PR is mergeable
    but review-required; required hosted contexts have not attached yet.
  - Strict-parity stack is merged:
    - PR #21 merged at `4ef987f51a` and publishes immutable 42-patch v3.
    - PR #20 merged at `bb850ee098` and rehearses the release lifecycle.
    - PR #22 merged at `67b5350d30` and admits v3 into the support contract.
    - PR #23 merged at `23d0fd3ceb` into its stacked lifecycle-fixture base.
      Its parity delta did not reach `main`; follow-up PR #24 is open from that
      branch to `main`, mergeable, and review-required.
  - Local proof `user/giodl/config-model-proof` at `a03889e2eb` adds a
    read-only Gateway Client Config Model against the exact 2026.6.33 release.
    It is not part of an immutable published generation and must be rebuilt as
    an ordered patch only after review.
- Generation worktree: `/root/src/lobsterclaw-2026.6.33-7055-v2`
- Generation state: 39 ordered patch commits plus one final manifest commit.
  The verifier reports patch count 39 and status `valid`; independent replay
  matches source tree `d05c8821480b5e24817ea792057423f8b577ae95`.
  Frozen install, full build, 23 provenance/reconstruction tests, and 41
  focused repair tests pass. Exact merged release head
  `7bff57b3973e501715269df5be6104615b392bfa` also passed remote
  `pnpm install --frozen-lockfile`, `pnpm build:ci-artifacts`, and
  `pnpm build:plugin-sdk:strict-smoke` on Blacksmith Testbox
  `tbx_01m01eme7j8abfxpadvkqx8zqm`.
- Source PR: `bic/lobster#7055`, merged at `ed6a864f9ae6` from exact final head
  `584e8b208047`. Its required runtime and GitOps checks passed. Relative to the
  published LobsterClaw generation, the final head changes patch files 0001 and
  0018 and adds 0041 (`msteams-ack-reactions`), for 40 total patch files.
- Known dirty state: `claws-hapi` has unrelated user changes. The lifecycle
  fixture worktree `C:\src\lobsterclaw-release-lifecycle-fixture` is clean and
  pushed at `8149c4f2ea`. The qualification
  worktree `C:\src\lobsterclaw-release-qualification` is clean and pushed at
  `7ff9a83ad9`; the 5.28 qualification worktree
  `C:\src\lobsterclaw-release-qualification-2026.5.28` is clean and pushed at
  `3ea635dfb5`; the Lobster consumer worktree
  `C:\src\lobster-lobsterclaw-consumer-fix` is clean and pushed at
  `f8d3dfd431`. Lobster repair worktree
  `C:\src\lobster-633-qualification-repairs` is clean and pushed at
  `9c2c168fe5`; LobsterClaw harness worktree
  `C:\src\lobsterclaw-633-qualification-green` has one uncommitted
  qualification environment line pending the new immutable generation. The v4
  worktree `C:\src\lobsterclaw-633-parity-v4` is clean and pushed on
  `user/giodl/integration-portfolio-v2` at `4be4142453`; PR #26 merged at
  `d2035cf1e7`. The generated-artifact gate worktree
  `C:\src\lobsterclaw-generated-release-gate` is clean and pushed at
  `6661f2dac5` for LobsterClaw PR #27.
- Blocking question: LobsterClaw PR #27 needs review and CI. Lobster PR #9364
  still has a generated-artifact failure, one known timing-sensitive Rust E2E
  failure, failed GitHubPop, and a stale changes-requested review. Lobster PR
  #8363 retains its review/hosted-gate blockers.

## Qualification Classification

- Current live verdict: immutable-generation and LobsterClaw contract gates pass,
  but full OpenClaw source qualification is non-blocking and not green.
  - 2026.5.28 build `176842584`: Linux checks, build/package, tests, Windows,
    and Node 22 lanes all fail.
  - 2026.6.33 build `176843021`: Windows and Node 22 pass; Linux checks,
    build/package, and tests fail.
- The deterministic 6.33 Linux checks/build failures are now repaired on
  Lobster PR #9364:
  - every root/publishable-extension shrinkwrap passes against the Microsoft
    mirror in explicit preservation mode, while the original mirror-induced
    stale failure remains reproducible with the mode disabled;
  - config-doc and Plugin SDK API baselines pass with reviewed semantic deltas;
  - SDK surface checks pass at exact reviewed budgets 10445 exports, 5216
    callable exports, 3251 deprecated exports, and 418 deprecated
    `config-types` exports.
- Linux tests remain pending: the LobsterClaw bounded-output harness repair is
  committed locally, but the lane must rerun to reveal any test failure hidden
  behind the prior Azure diagnostic-log disk exhaustion.
- 5.28 exact merged run `176773892` at `81fca69ef0`:
  provenance and the 311-registration dependency evidence passed. Generation
  acceptance, Linux checks/build/tests, and Node 22 stopped at the first install
  because Corepack attempted blocked `registry.npmjs.org` downloads. Windows
  never started because the job routed to obsolete `Hosted Ubuntu 1604`.
- 6.33 exact merged run `176771264` at `e2026496bf`:
  the same branch-owned surfaces passed or failed at the same boundaries.
- Both runs also report inherited organization Secure Supply Chain Analysis
  findings for 12 upstream Docker references and one Kubernetes reference.
  Those findings are visible but are not patch regressions.
- Classification: current source-lane failures are `harness/environment`, not
  OpenClaw upstream failures or Lobster patch regressions. Source behavior
  remains untested until the harness is repaired and rerun.
- Repair PR baseline runs `176778006` and `176778005` proved all six source
  tasks start successfully, including Windows, but generation acceptance hit
  its explicit 60-minute timeout. PRs #13/#14 now use a 180-minute generation
  budget, lockfile-keyed pnpm caches, and only two heavy PR jobs. Optimized runs
  `176783911` and `176783910` reached the 180-minute ceiling while pnpm retried
  blocked `registry.npmjs.org`. PR heads `20c486041a` and `e0123ea834` now set
  `PNPM_CONFIG_REGISTRY` to the approved mirror and disable release-age metadata
  checks; both 19-test harness suites pass.

## Resume Checklist

- Land LobsterClaw PR #27 so every generation PR runs OpenClaw's
  `release:generated:check` against reconstructed source.
- Diagnose the exact generated-artifact failure on Lobster PR #9364; treat its
  Rust shard failure separately as the known pre-wake hot-loop timing flake.
- Rerun Linux checks, build/package, tests, Node 22, and Windows; make
  qualification blocking only after all five are green.
- Recheck Galin's review refresh and required contexts on Lobster PR #8363.
- Keep recursive submodule checkout scoped to OpenClaw context packaging, E2E
  image building, and JS source tests.
- Check Lobster PR #7055 exact-head runtime results and address only
  branch-owned failures.
- Confirm generation head `3f38843bef3`, run `node .lobsterclaw/verify`, and
  preserve source tree `d05c8821480b5e24817ea792057423f8b577ae95`.
- Preserve the merged generation and keep governance changes limited to
  `.github/CODEOWNERS` and `es-metadata.yml`.
- Treat the `v2026.6.33` `zalouser` shrinkwrap drift as an upstream-base
  exception: both files are byte-identical to the signed base.

## Guardrails

- Keep LobsterClaw private; Lobster #7055 contains private Microsoft adapters.
- Lobster owns its supported-version set and promotion timing. LobsterClaw must
  have a published, fully patched, qualified immutable generation for every
  supported version before Lobster advances or adds a pin.
- Never use one mutable or repository-wide generation pointer for multiple
  Lobster image lineages. Each supported lineage pins an exact generation
  commit, with independent provenance, qualification, and cache identity.
- Retain prior supported generations until Lobster explicitly removes the
  corresponding OpenClaw version from Active, Candidate, or rollback support.
- Never drop a patch merely because it no longer applies.
- Retain it, rebuild it under the same identity, or remove it only after the
  replacement behavior and recorded validation pass without the patch.
- Never force-update a published generation.
- Do not commit or revert unrelated `claws-hapi` changes.

## Open Threads

- Preserve the merged strict-parity stack and its immutable generation tags.
- After PR #20 merges, update `fixture/release-lifecycle-rehearsal` so unique
  marker `cf0d22ca91` (or its successor) proves the default-branch
  `fixture/*` CI trigger and permissions independently of PR validation.
- Land PR #24 so PR #23's 75-patch transition-parity receipt is present on
  `main`, not only its stacked fixture branch.
- Recheck exact release runs `176843037` and `176843039`; qualification
  evidence is release-scoped and Lobster owns deployment-role assignment.
- Recheck Lobster PR #8363 on head `f8d3dfd431`; require current-head approval,
  GitHubPop, `Lobster-Runtime-PullRequest`, and
  `Lobster-Runtime-Build-Validation` to be visible and green.
- Classify and repair LobsterClaw 6.33 exact-head Linux qualification failures:
  duplicate-scan ownership, shrinkwrap timeout, generated release metadata,
  Plugin SDK surface drift, and real Vitest failures versus shard timeouts.
- Repeat exact-head qualification review for Active 5.28.
- Change qualification jobs from non-blocking to required only after all five
  required lanes are green on each exact release commit.
- Rebase and open the pushed Lobster consumer branch only after it pins the new
  exact 40-patch generation; do not open the stale 39-patch version.
- Preserve `upstreamRefs` as an immutable import-time snapshot with exact
  commits; do not rewrite published generations when upstream PR state changes.
- Preserve the merged `bic/lobster#7055` runtime proof from run `176769302`.
- Land generation `2026.6.33-lobster-7055-4fb3a5a7` from
  `lobsterclaw/2026.6.33-7055-v2`.
- Keep the older `lobsterclaw/2026.6.33-7055` branch as historical evidence;
  do not use it as the final candidate.
- Select and qualify a newer upstream release for dashboards/widgets. The
  2026.6.33 generation predates the board protocol; do not partially backport
  the coordinated dashboard stack without explicit approval.

## Session Checkpoints

Detailed session handoffs live in `sessions/`.
