# PromoteClaw Session Context

## Agent Start

1. Read this file.
2. Read `projects/promoteclaw/README.md`.
3. Check live Lobster and OpenClaw release state before acting.
4. Do not prototype OpenClaw or Lobster implementation code in `claws-hapi`.

## Baseline

- Area: Regular promotion of the OpenClaw version baked into Lobster.
- Primary repo: `microsoft.ghe.com/bic/lobster`.
- Current Lobster pin: `src/openclaw_container/package.json` currently has
  `openclaw: 2026.5.28` and `@openclaw/diagnostics-otel: 2026.5.28`.
- Current patch base: `src/openclaw_container/Dockerfile` and
  `src/openclaw_container/openclaw-patches/README.md` refer to
  `v2026.5.28`.
- Current model: Lobster installs the official OpenClaw package and overlays
  Lobster-built patched source/dist where needed. The msteams plugin is built
  from pinned upstream OpenClaw source with Lobster patches applied.

## Current Session

- Last updated: 2026-07-16.
- Last agent: Copilot.
- Current focus: Drive the repaired PromoteClaw automation and its first
  generated Lobster OpenClaw upgrade through fresh CI and acceptance.
- Active branch / PR: Lobster #4355
  `https://microsoft.ghe.com/bic/lobster/pull/4355`, branch
  `user/giodl/promoteclaw-job`, head `6abe9b55d6`. Generated candidate:
  Lobster #4528 `https://microsoft.ghe.com/bic/lobster/pull/4528`, branch
  `promoteclaw/openclaw-2026.6.11`, head `d8ada10e6c`, draft and mergeable.
- Known dirty state: PromoteClaw Lobster worktrees used this session are clean.
  `C:\src\claws-hapi` has this session note update plus unrelated existing
  dirty project notes.
- Blocking question: #4528 needs fresh CI plus a newly built 2026.6.11 image
  for persisted-home Gateway, brokered Teams/msteams, and version-visibility
  acceptance; #4355 needs fresh CI/re-review and still requires
  `GHE_PROMOTECLAW_TOKEN` after merge.

## Resume Checklist

- Find or ask for Galin's LTS/quarantine feed URL, schema, and owner.
- Read `projects/promoteclaw/feed-discovery.md`.
- Read current Lobster version pin:
  `C:\src\lobster*\src\openclaw_container\package.json`.
- Read current patch base and patch list:
  `src/openclaw_container/openclaw-patches/README.md`.
- Identify the newest quarantine-cleared OpenClaw release.
- Compare each Lobster patch against the target OpenClaw release:
  - already upstream: drop from Lobster patch set;
  - still needed: rebase/reapply;
  - conflict/unclear: block promotion and ask for owner decision.
- Prepare a Lobster PR only after patch carry-forward is understood.
- For PromoteClaw automation PR #4355, check live status:
  `gh pr view 4355 --repo microsoft.ghe.com/bic/lobster --json statusCheckRollup,reviewDecision,mergeStateStatus`.

## Guardrails

- Promote only quarantine-cleared OpenClaw releases unless an explicit exception
  is approved.
- Terminology: #4355/#4528 links are Lobster PR/pipeline links. Say "Lobster
  OpenClaw-container promotion" or "Lobster OpenClaw bump"; reserve "OpenClaw
  PR/link" for upstream `openclaw/openclaw` issues, PRs, tags, or source links.
- Patch validation is mandatory: do not blindly reapply all old patches.
- Keep PromoteClaw notes in this project area; implementation work belongs in a
  Lobster worktree under `C:\src\lobster*`.
- Do not manually queue Lobster ADO while pools are exhausted unless explicitly
  asked for a named PR/branch.

## Open Threads

- 2026-07-21: #4528 was rebased onto current main and pushed at `0bb18c90fa`.
  Build `173074090`'s reused-worker git proof and WorkIQ `not present` matcher
  failures are fixed. Current-main patch 0018 was re-derived for OpenClaw
  `v2026.6.11`; all 18 patches apply cleanly in Docker order. Proof comments:
  `206579531`, `206590326`. Natural CI only; no manual ADO queue.
- #4355 current-head CI repair at 2026-07-16: pushed `6abe9b55d6`.
  The prior Repo validation failure was branch-owned: an unregistered
  PromoteClaw definition had been added to the live operations catalog with
  `definition-id: TBD`, which the OneLocBuild contract forbids. Removed the
  placeholder from `docs/ops-catalog/pipelines.yml` and the live-definition
  tables in `docs/pipelines.md`; pending registration remains documented in
  `docs/feed/README.md`. The exact OneLocBuild and PromoteClaw job tests passed,
  the PromoteClaw self-test passed, and Codex review was clean. Natural
  PullRequest build `172523497` is pending; no ADO run was manually queued.
- #4355 current-head review repair at 2026-07-16: pushed `d54209e158`.
  Dry-run now intentionally uses the managed Azure Artifacts token without GH
  credentials or mutation flags; malformed feed version/view shapes fail
  loudly; existing generated candidates are restored to draft before update;
  and the unused Python import was removed. PromoteClaw self-tests and 4 job
  tests passed, YAML/Python syntax checks passed, and Codex review was clean.
  Superseded PullRequest build `172521891` is cancelling after the newer push;
  no ADO run was manually queued.
- #4528 prior head `4f391f7d91` fixed build `172462154`'s shared
  `dead_code` failure by moving test-only install-seed helpers into the sibling
  test module. Natural PullRequest build `172520289` is in progress. Both
  OpenClaw image builds, the runtime image build, adapter quality/unit tests,
  patched OpenClaw JS tests, Web E2E, and Repo validation are green; runtime E2E
  and remaining tail jobs are still running. No ADO run was manually queued.
- #4528 current head `d8ada10e6c` fixes build `172520289`'s branch-owned
  diagnostics cron E2E failure. OpenClaw 2026.6.11 stores cron state in SQLite,
  so `/home/node/.openclaw/cron/jobs.json` no longer exists. The test now keeps
  its read-only safety assertion by inspecting the supported `openclaw cron
  show daily-diagnostics --json` response and rejects malformed, missing,
  `bash`, or `write` policy data. The pinned `v2026.6.11` CLI source confirms
  the JSON response contains the full job payload. `git diff --check`, Rustfmt,
  and Codex review passed; focused Cargo tests are locally blocked before build
  by missing private `ecsclient` registry auth. Natural PullRequest build
  `172535490` queued after push; no ADO run was manually queued.
- #4528 repair at 2026-07-15 02:40 UTC: rebased
  `promoteclaw/openclaw-2026.6.11` onto current `origin/main`, resolved the
  patch README and package conflicts, restored the missing msteams threading
  source in patch 0009, restored cron regression coverage in patches 0010/0011,
  removed only obsolete Docker test paths, and added native-Windows
  `python3`/`python` probing to the Gateway smoke. Committed as `ec876d7bdb`
  and force-pushed with lease. All 13 patches apply cleanly to pristine
  OpenClaw `v2026.6.11`; patched OpenClaw tests passed 127/127 across 8 files,
  runtime pipeline SDL tests passed 230/230, package/template/docs hashes
  matched, patch gates passed, and final autoreview was clean. Proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4528#issuecomment-202221226.
  Live state immediately after push: draft, MERGEABLE/BLOCKED,
  `GitOps/FileAffordance` green, `GitOps/GitHubPop` red,
  ADO build `172279887` queued/running, and prior review remains
  `CHANGES_REQUESTED`. Do not manually queue ADO.
- Confirm Galin's quarantine feed details.
- Feed details discovered and recorded in `feed-discovery.md`: upstream feed is
  `M365-Lobster-Upstream`, release view is `@Release`, team/local feed is
  `Lobster`, and promotion pipeline is
  `.pipelines/lobster-feed/promote-lts.yml`.
- #4355 adds `.pipelines/lobster-feed/promoteclaw-open-pr.yml`, scheduled daily
  at 07:00 UTC; it runs after the 06:00 UTC promotion job, reads
  `M365-Lobster-Upstream @Release`, and opens/updates a draft PromoteClaw PR
  with a mandatory patch carry-forward/image-validation checklist.
- #4355 now defaults `PROMOTECLAW_COMPANION_PACKAGES` to
  `@openclaw/diagnostics-otel` and rewrites version-aligned diagnostics
  metadata/validators/tests in generated candidates.
- #4528 promotes `openclaw` and `@openclaw/diagnostics-otel` to `2026.6.11`,
  updates `OPENCLAW_SRC_REF/SHA`, updates patch README base tags, re-derives the
  retained Lobster OpenClaw patches, and refreshes template/docs overlay drift
  hashes. Local proof passed: `bash scripts/ci/check-openclaw-patches.sh`,
  `scripts/check-upstream-hashes.sh` for templates/docs against extracted
  `openclaw-2026.6.11.tgz`, `python scripts\ci\check-runtime-pipeline-sdl.py`,
  `python scripts\check_runtime_pipeline_sdl_test.py`, and `git diff --check`.
  It remains draft until image build, Gateway startup, brokered Teams/msteams,
  and version visibility proof are complete. Latest live state after the
  session: `GitOps/GitHubPop` failed, FileAffordance passed, and
  `Lobster-Runtime-PullRequest` was queued.
- Patch necessity audit note: do not use #4528 as the place to delete carried
  Lobster patches just because hosted-integration work may eventually retire
  them. Keep the 12-patch carry-forward for the version bump unless exact
  upstream-equivalent behavior is proven; use hosted-integration follow-ups for
  broader removal/replacement decisions.
- SQLite migration note for #4528: OpenClaw `2026.6.11` includes startup/doctor
  SQLite migration paths such as guarded Gateway startup session maintenance and
  plugin-registry/auth-profile migrations. Lobster should not add a separate
  migration step in the PromoteClaw PR; validate Gateway startup against a
  persisted/non-empty OpenClaw home as part of the remaining smoke proof.
- Added #4528 commit `c4975c8ba6` with opt-in
  `scripts/openclaw-gateway-container-smoke.sh` plus `just
  openclaw-gateway-container-smoke`. The smoke boots a built Gateway image with
  a non-empty persisted OpenClaw home, POSTs
  `/extension/v1/openclaw-gateway/start`, checks the baked OpenClaw version, and
  verifies the SQLite `installed_plugin_index` diagnostics-otel seed. Local
  validation: `bash -n scripts/openclaw-gateway-container-smoke.sh`,
  `git diff --check`, `just --summary`, and script skip path with no local
  `aether-openclaw:local` image.
- Live Lobster status at 2026-07-13 15:58 PT: #4528 remains draft and blocked
  at head `c4975c8ba6`; `GitOps/FileAffordance` passed, `GitOps/GitHubPop`
  failed, and `Lobster-Runtime-PullRequest` build `172074466` is running
  repo-validation legs. #4355 remains blocked at head `efc51ca468`;
  OpenClaw image build, OpenClaw Agent image build/smoke, and several build
  legs passed, but `GitOps/GitHubPop`, `Repo validation Validate`, and
  `Lobster Runtime — Unit Tests` failed while many ADO legs are still running.
- Dependency-stack note for #4362: pushed `f20b9bc7ed` to
  `user/giodl/lobster-restore-file-mutation-tools` after merging current
  `origin/main`. The failed ADO adapter unit/quality legs built GitHub's
  generated `refs/pull/4362/merge` at `443d479658`, whose auto-merge
  reintroduced a stale `workspace_deny_tools` reference in
  `paths_tests.rs`; branch head `b1e5a128e7` compiled before the merge.
  The pushed fix removes that stale hunk from the real branch merge source.
  Local proof: `cargo fmt --check`, `git diff --check`, and pre-merge focused
  `cargo test -p openclaw-adapter
  shipped_policy_baseline_keeps_workspace_guardrails_without_baked_sandbox_defaults
  -- --exact` compiled successfully. Post-merge local cargo test is blocked by
  missing private Lobster Cargo registry auth/token, not by the test source.
  Immediately after push, GitHub showed new head `f20b9bc7ed` with no checks
  attached yet; do not manually queue ADO unless explicitly asked.
- Follow-up #4362 Repo validation failure on build `172082510`: ApplicationParameters
  / OpenClaw EV2 safety failed because
  `scripts/fixtures/application-parameters/openclaw-model-map.rendered.json`
  lagged the current model catalog and lacked required
  `prod-anthropic-claude-opus-4-6`. Pushed `4f691d7803` to update the rendered
  fixture so `anthropic-claude-opus-4-6`, `claude-opus-4-6`, and
  `prod-anthropic-claude-opus-4-6` map to
  `prod-anthropic-claude-opus-4-6`, and updated the validator unit expected
  onboarded-model list. Local proof: focused
  `scripts.check_token_collisions_test.RenderedScopeAuthTokenTests` plus
  `TokenCollisionCliTests.test_main_success_reports_clean_application_parameters`,
  `python scripts\check-token-collisions.py`, and `git diff --check`.
  Proof comment: https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-200904601.
  Immediately after push, #4362 head was `4f691d7803`, mergeable/BLOCKED, with
  `GitOps/FileAffordance` green and `GitOps/GitHubPop` red; runtime checks had
  not reattached yet.
- Follow-up #4362 Repo validation failure on build `172087315`: the previous
  fixture fix was incomplete because `MINIMAL_AUTH_TOKENS` in
  `scripts/check_token_collisions_test.py` still used the older bare-only
  OpenClaw model map, causing rollback-warning CLI tests to fail before their
  warning assertions. Pushed `a126d030a3` to align that shared minimal token
  fixture with the prod Opus 4.6 model map. Local proof:
  `python -m unittest scripts.check_token_collisions_test -v` (64 tests),
  `python scripts\check-token-collisions.py`, and `git diff --check`.
  Proof comment: https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-200912301.
  Immediately after push, #4362 head was `a126d030a3`, mergeable/BLOCKED, with
  only `GitOps/FileAffordance` visible and green; runtime checks had not
  reattached yet.
- Follow-up #4362 Runtime quality failure on build `172091020`: after Repo
  validation passed, `Lobster Runtime — Quality` failed during the compile /
  clippy install step from current-main API drift. `scheduler/mod.rs` was
  missing the new `ManagedGatewayStartRequest.owner_upn_fallback` field, and
  `sandbox_connection_tests.rs` still used removed `SandboxConnectionCaller`,
  `request.caller`, and `manager.get_connection(...)`. Pushed `eff879c58d`:
  scheduler sets `owner_upn_fallback: None`; the sandbox test matrix now uses
  `ManagedGatewayStartIntent::{SpaGatewayWs, TeamsBridge, NativeTeamsDelivery}`
  and `manager.start_gateway(...)`. Local proof: `cargo fmt --manifest-path
  src/lobster_runtime/Cargo.toml -- --check`, `git diff --check`, and stale API
  grep clean. Local targeted cargo test remains blocked by missing private
  Lobster Cargo registry token. Proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-200920341.
  Immediately after push, #4362 head was `eff879c58d`, mergeable/BLOCKED, with
  no checks attached yet.
- #4362 rebase at 2026-07-13 18:55 PT: the long-running ADO build `172096093`
  remained stuck reporting Detect / Repo validation in progress while the PR
  also became conflicting. Rebasing
  `user/giodl/lobster-restore-file-mutation-tools` onto `origin/main`
  (`67590f3abf`) hit two narrow conflicts: wrapped expected text in
  `scripts/check_token_collisions_test.py` and the
  `ManagedGatewayStartIntent::SchedulerWake` arm in
  `src/lobster_runtime/src/sandbox_connection_tests.rs`. Resolved both by
  keeping the already-intended rebased behavior, validated with
  `python -m unittest scripts.check_token_collisions_test -v`,
  `python scripts\check-token-collisions.py`, `cargo fmt --manifest-path
  src\lobster_runtime\Cargo.toml -- --check`, and `git diff --check`, then
  force-pushed the PR branch on `bic/lobster` to head `5c0ad59904`.
  Immediately after push, #4362 was mergeable/BLOCKED with no checks attached
  yet and review reset to `REVIEW_REQUIRED`.
- Follow-up #4362 Runtime quality failure on build `172100425`: ADO completed
  most legs but `Lobster Runtime — Quality (fmt/clippy/build/deny)` failed in
  `Install ms-prod-1.93 + cargo clippy` because clippy denies
  `unreachable!` under `-D warnings`
  (`src/lobster_runtime/src/sandbox_connection_tests.rs:116`). Pushed
  `4bb8b6584c` to use `panic!("not in test matrix")` for the impossible
  scheduler arm instead. Local proof: `cargo fmt --manifest-path
  src\lobster_runtime\Cargo.toml -- --check` and `git diff --check`. Local
  full clippy remains blocked by missing `CARGO_REGISTRIES_LOBSTER_TOKEN`.
  Immediately after push, #4362 head was `4bb8b6584c`, mergeable/BLOCKED, with
  `GitOps/FileAffordance` green, `GitOps/GitHubPop` red, runtime checks not yet
  reattached, and review reset to `REVIEW_REQUIRED`.
- #4362 rebase at 2026-07-14 06:01 PT: after ADO build `172108630` went fully
  green, `origin/main` advanced to `d760e6c823` and GitHub reported
  DIRTY/CONFLICTING. Rebasing the PR branch hit one real conflict in
  `src/lobster_runtime/src/sandbox_connection_tests.rs`; resolved by keeping
  current-main EOL admission tests and retaining the clippy-safe
  `ManagedGatewayStartIntent::SchedulerWake => panic!("not in test matrix")`
  non-matrix arm. The prior `4bb8b6584c` clippy-fix commit dropped during
  rebase because the resolved sandbox commit already contains the same patch.
  Local proof: `git diff --check`, `cargo fmt --manifest-path
  src\lobster_runtime\Cargo.toml -- --check`,
  `python -m unittest scripts.check_token_collisions_test -v`, and
  `python scripts\check-token-collisions.py`. Force-pushed the PR branch to
  head `c1c745f12d`; immediately after push GitHub showed MERGEABLE/BLOCKED,
  no conflicts, `GitOps/FileAffordance` green, ADO/GitHubPop not reattached yet,
  and review still `CHANGES_REQUESTED`.
- Define the regular cadence and owner notification format for Omar.
- Decide whether PromoteClaw should have a small helper script to read the
  feed, compare pins, and produce a PR checklist.
- Extend PR 4355 or its follow-up to consume the Upstream-First Release Compact:
  patch admission metadata, patch-added/retained/dropped/deletion-ready counts,
  expiry blocking, and deletion-ledger updates.
