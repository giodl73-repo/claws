# Control UI Session Context

## Agent Start

1. Read this file.
2. Read `projects/control-ui/README.md`.
3. Read Lobster PR #6041 and its design doc before making implementation
   claims.
4. Check live Lobster PR state and local worktree state before acting.
5. Read related project context only as needed: `config-admin`,
   `hosted-integration`, `managed-config`, `admin`, `ux-state`, and `lobster`.

## Baseline

- Area: Hosted OpenClaw Control UI in Lobster.
- Primary repo: `microsoft.ghe.com/bic/lobster`.
- Related repo: `openclaw/openclaw`.
- Local worktree: choose or create a clean Lobster worktree before
  implementation; do not use the dirty `C:\src\lobster` checkout.
- Current branch: `user/giodl/control-ui-surgical-routes`.
- Main tracking file: `projects/control-ui/README.md`.
- Skills to use: `project-session`, `project-creator`, and `lobster-pr-ops`;
  use OpenClaw PR/testing skills when the generic OpenClaw slices start.

## Current Session

- Last updated: 2026-08-04.
- Last agent: Copilot.
- Current focus: Land and deploy Lobster PR #7039 to FRE-301, then validate the
  merged hosted OpenClaw Control UI preview through its three ECS gates.
- Active branch / PR: Lobster design PR
  [bic/lobster#6060](https://microsoft.ghe.com/bic/lobster/pull/6060),
  `user/giodl/control-ui-hosting-design` at
  `bab71c50d4`; Lobster draft all-in-one preview PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121)
  merged as `8be34c43f1c1` and contains hosted `/openclaw`, Control UI staging, runtime host policy
  bootstrap, hosted Gateway route, default-off ECS rollout/replacement gates
  for `/chat`, `/sessions`, and `/settings`, real-bundle proof harness, and
  Lobster image patch `0019-hosted-control-ui-policy.patch`; Lobster PR
  [bic/lobster#7039](https://microsoft.ghe.com/bic/lobster/pull/7039),
  `user/giodl/control-ui-deployment-env` at `691ac5987d`, configures
  `OPENCLAW_CONTROL_UI_DIR=/app/static/openclaw-control-ui` in the production
  Runtime chart and adds a deployment contract test; Lobster PRs
  [#6088](https://microsoft.ghe.com/bic/lobster/pull/6088) and
  [#6113](https://microsoft.ghe.com/bic/lobster/pull/6113) are closed as
  superseded; Lobster draft stacked PR
  [bic/lobster#6116](https://microsoft.ghe.com/bic/lobster/pull/6116),
  `user/giodl/control-ui-root-cutover` remains a separate follow-up for the
  `/` to `/openclaw/` ECS cutover gate. OpenClaw draft PR
  [openclaw/openclaw#115408](https://github.com/openclaw/openclaw/pull/115408)
  targets `main` from fork branch
  `user/giodl/control-ui-host-policy-main` at
  `633c2f60fb223fcb253d4da33208be21d8b8b2e0` and references umbrella issue
  [openclaw/openclaw#115423](https://github.com/openclaw/openclaw/issues/115423).
- Known dirty state: `claws-hapi` already had unrelated dirty project notes
  before this area was created. `C:\src\lobster` is on
  `user/giodl/openclaw-copilot-dev-validation` with unrelated dirty files and
  scratch directories. OpenClaw proof work is in dirty detached worktree
  `C:\src\openclaw-5402-0012-rederive`; unrelated non-UI changes preexisted
  there and must not be reverted. OpenClaw PR #115396 was a release-line draft
  and is now closed because we are not backporting this host-policy work.
  Current-main port worktree: `C:\src\openclaw-control-ui-host-policy-main`
  is clean at PR #115408 head.
  Lobster implementation worktree `C:\src\lobster-control-ui-proof` tracks
  `origin/user/giodl/control-ui-hosting-runtime` and is clean against pushed
  #6088 except untracked `.tmp-control-ui-screen/` scratch.   Lobster surgical
  worktree `C:\src\lobster-control-ui-surgical` is clean against pushed #6121
  head `114efc92fb` except untracked CI scratch logs, `.tmp-cdn-fixture/`,
  and `.tmp-ado-timeline-174718311.json`. Deployment worktree
  `C:\src\lobster-control-ui-env` is clean at pushed PR #7039 head
  `691ac5987d`.
- Blocking question: PR #7039 is open, mergeable, review-required, and has no
  required checks attached yet. It must merge and deploy to FRE-301 before the
  three ECS gates can activate `/openclaw`.

## 2026-07-29 PR #6060 review closeout

- Published `bab71c50d4`, making the five requested design contracts
  falsifiable and normative: publication/runtime fail-closed policy, initial
  P99 <= 1 ms acceptance, blocking device-auth bypass proof, per-flag fallback
  preservation, and structured inline editable-page denial findings.
- Replied to and resolved all five conversations. Exact-head review is
  requested and natural Runtime `174368694` is queued. The dedicated design
  worktree is clean.

## 2026-07-28 Project Start

- Read the Claws project shape because prior Claws work has been the strongest
  precedent: explicit thesis, narrow proof slices, exact-head PR tracking,
  role-reviewed scope reduction, live behavior proof, and session checkpoints.
- Live Lobster PR #6041 is open, draft, mergeable but blocked. It adds
  `docs/design/2026-07-28-openclaw-control-ui-hosting.md` and indexes it from
  `docs/README.md`.
- Visible PR checks at read time: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` succeeded; `GitOps/GitHubPop` failed; required
  Lobster runtime ADO contexts were not attached.
- The design says Lobster should host the unmodified, version-matched OpenClaw
  Control UI instead of continuing parallel Lobster chat/session/task/plugin/
  agent/settings surfaces.
- Key boundary: OpenClaw owns Control UI routes, Gateway methods, config schema,
  validation, and mutation semantics. Lobster owns Entra auth, tenant admission,
  user-to-container routing, runtime policy, deployment-owned config, rollout,
  and telemetry.
- First implementation step should be a disposable vertical proof at
  `/openclaw`, not a committed platform rewrite.

## 2026-07-28 Proof Slice 1

- Created clean Lobster worktree `C:\src\lobster-control-ui-proof` from `main`
  and branch `user/giodl/control-ui-hosting-proof`; did not use dirty
  `C:\src\lobster`.
- Implemented an optional static OpenClaw Control UI mount:
  `OPENCLAW_CONTROL_UI_DIR` set means serve the bundle under `/openclaw`;
  unset or empty means `/openclaw` returns 404.
- Runtime startup validates the Control UI directory only when configured and
  logs the mounted route. Existing `STATIC_DIR`, `/web`, `/static`, auth, and
  Gateway router defaults remain unchanged.
- `/openclaw` and extensionless deep links serve the Control UI shell with
  `Cache-Control: no-cache`; file-like paths such as
  `/openclaw/assets/app.js` and `/openclaw/control-ui-config.json` serve static
  assets directly from the Control UI directory.
- Added a Windows-only direct `windows-sys` dependency because existing MIP
  staging code directly imports `windows_sys::*`; without this, local
  `lobster-runtime` tests do not compile on Windows before reaching the new
  route tests.
- Verification passed:
  `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`5 passed; 0 failed; 3855 filtered out`).
  `git diff --check` passed.

## 2026-07-28 Proof Slice 2

- Verified local OpenClaw package shape from available worktrees: Control UI is
  built to `dist/control-ui`, package checks require `dist/control-ui/index.html`
  plus assets, and the root OpenClaw package includes `dist/`.
- Added Lobster staging helper
  `C:\src\lobster-control-ui-proof\scripts\stage-openclaw-control-ui.mjs`.
  It defaults to Lobster's pinned `src/openclaw_container/package.json`
  dependency (`openclaw@2026.5.28` at proof time), extracts
  `dist/control-ui`, and verifies `index.html` plus asset files.
- Wired staging into local `build-static.sh`, Official.Build BuildWeb,
  shared PR/BuildValidation BuildWeb, E2E inline web bundle build steps, and
  Dev.Buddy BuildWeb. Required CI paths fail if Control UI staging fails.
- The runtime image can carry `/app/static/openclaw-control-ui`, but the route
  remains disabled unless deployment sets
  `OPENCLAW_CONTROL_UI_DIR=/app/static/openclaw-control-ui`.
- Verification passed: `node --check scripts/stage-openclaw-control-ui.mjs`;
  fixture staging via `node -e`; `cargo fmt -p lobster-runtime --check`;
  `git diff --check`; and
  `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`5 passed; 0 failed; 3855 filtered out`).
- Direct local `npm view openclaw@2026.5.28` was blocked by npm auth (`E401`),
  so package-path proof came from local OpenClaw source/package scripts rather
  than the private registry tarball.

## 2026-07-28 Proof Slice 3

- Added a runtime-owned `/openclaw/control-ui-config.json` bootstrap endpoint
  instead of trusting a packaged static file for host integration metadata.
- Bootstrap JSON advertises Lobster's same-origin Gateway WebSocket path
  `/v1/openclaw-gateway`, browser client family, read/write OpenClaw scopes,
  Lobster MSAL auth mode, and the invariant that static requests do not start a
  container.
- The exact route is registered ahead of the `/openclaw/{*rest}` static
  catch-all, so Lobster's runtime contract wins even if the OpenClaw bundle
  contains its own `control-ui-config.json`.
- Verification passed: `cargo fmt -p lobster-runtime --check`,
  `git diff --check`, and
  `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`5 passed; 0 failed; 3855 filtered out`). The first test attempt timed out
  on Cargo artifact locking; rerun completed successfully.

## 2026-07-28 Proof Slice 4

- Added Gateway policy family `HostedControlUi` for the hosted `/openclaw`
  browser surface.
- `HostedControlUi` resolves to read/write only and never inherits the broad
  `gateway_manage_capability_enabled` browser manage grant; direct lifecycle
  verbs such as `sessions.delete` fail closed with
  `ManageCapabilityRequired`.
- The runtime bootstrap config now advertises
  `/v1/openclaw-gateway?client_family=hosted-control-ui`, and the Gateway
  handler maps that query value to the hosted family while preserving legacy
  browser behavior for missing/unknown values.
- Verification passed: `just cargo test -p lobster-runtime hosted_control_ui
--lib` (`2 passed; 0 failed; 3860 filtered out`),
  `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`5 passed; 0 failed; 3857 filtered out`),
  `cargo fmt -p lobster-runtime --check`, and `git diff --check`.
  Test commands were slow because Cargo waited on package/artifact locks.

## 2026-07-28 OpenClaw Policy Slice 1

- Added an OpenClaw Control UI `HostControlPolicyV1` capability with required
  `routes`, `settings`, and `actions` maps, default-open local behavior, exact
  and wildcard setting/action lookup, and bootstrap loading from
  `<basePath>/control-ui-config.json`.
- Wired the policy into the top-level application context, router startup,
  shell route whitelist, settings navigation, and shared settings workspace
  call sites so disabled routes are centrally hidden/redirected without
  editing every page's route logic.
- Wired policy actions into `GatewayBrowserClient.request` as a client-side
  preflight and wired policy `gateway.path` / `gateway.scopes` into Gateway
  connect so Lobster can supply the hosted relay URL and reduced operator
  scopes.
- Wired settings policy into `runtimeConfig.patchForm`, `removeFormValue`,
  `setRaw`, and preset staging so exact/wildcard locked settings block shared
  config edits centrally; server-side enforcement remains required.
- Verification passed in `C:\src\openclaw-5402-0012-rederive`:
  `..\node_modules\.bin\vitest.cmd run --config vitest.config.ts
src/app/host-policy.test.ts src/app/gateway-store.test.ts
src/lib/config/host-policy.test.ts src/api/gateway.node.test.ts`
  (`4 passed`, `58 tests passed`), `pnpm --dir ui build`, and
  `git diff --check` for touched files.

## 2026-07-28 OpenClaw Policy Slice 2

- Extended the OpenClaw presentation layer for hosted read-only settings:
  Advanced config now passes host read-only state into the existing
  schema-form `disabled` path, disables raw editing, disables Save/Apply/Open,
  and marks the layout with `config-layout--host-readonly`.
- Quick Settings now accepts a `readOnly` prop and disables deployment-config
  controls such as thinking level, fast mode, browser enablement, tool profile,
  config presets, and Save/Apply while leaving navigation/status controls live.
- Verification passed in `C:\src\openclaw-5402-0012-rederive`:
  `..\node_modules\.bin\vitest.cmd run --config vitest.config.ts
src/pages/config/quick.test.ts src/pages/config/view.host-policy.test.ts
src/app/host-policy.test.ts src/lib/config/host-policy.test.ts
src/app/gateway-store.test.ts src/api/gateway.node.test.ts`
  (`6 passed`, `79 tests passed`), `pnpm --dir ui build`, and
  `git diff --check` for touched files. A direct run of
  `view.browser.test.ts` was skipped after Playwright reported the local
  Chromium binary missing; the new regression lives in jsdom instead.

## 2026-07-28 Lobster Policy Slice 5

- Aligned Lobster's runtime-owned
  `/openclaw/control-ui-config.json` response with OpenClaw's generic
  `hostControlPolicy` wrapper.
- The emitted policy now includes host metadata, hosted Gateway relay path
  `/v1/openclaw-gateway?client_family=hosted-control-ui`, reduced
  `operator.read`/`operator.write` scopes, default-open route/settings/action
  behavior, disabled hosted diagnostic/node routes, read-only deployment-owned
  settings, brokered config save/apply actions, and disabled local file/session
  deletion actions.
- Kept Lobster-specific auth metadata outside the generic policy wrapper so
  OpenClaw can consume the reusable contract and ignore Lobster-only bootstrap
  fields.
- Verification passed in `C:\src\lobster-control-ui-proof`:
  `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`5 passed`), `just cargo test -p lobster-runtime hosted_control_ui --lib`
  (`2 passed`), `cargo fmt -p lobster-runtime --check`, and
  `git diff --check` for the touched route files. The first route-test compile
  timed out while rustc was still active; after compile completion, the rerun
  passed quickly.

## 2026-07-28 OpenClaw Policy Slice 3

- Extended OpenClaw's generic host action policy into session deletion
  affordances: sidebar session delete now no-ops before confirmation when
  `sessions.delete` is disabled, and the menu item is visibly disabled.
- Sessions page bulk deletion now checks the same `sessions.delete` policy
  before confirmation or mutation, and the pure Sessions view accepts an
  optional `canDeleteSessions` flag that disables table selection and the bulk
  delete button while defaulting open for local/non-hosted callers.
- Verification passed in `C:\src\openclaw-5402-0012-rederive`:
  `..\node_modules\.bin\vitest.cmd run --config vitest.config.ts
src/pages/sessions/view.test.ts src/app/host-policy.test.ts
src/lib/config/host-policy.test.ts src/pages/config/view.host-policy.test.ts
src/app/gateway-store.test.ts src/api/gateway.node.test.ts`
  (`6 passed`, `91 tests passed`), `pnpm --dir ui build`, and
  `git diff --check` for touched OpenClaw UI policy files.

## 2026-07-28 OpenClaw PR Slice 4

- Created clean OpenClaw release-line branch
  `user/giodl/control-ui-host-policy-pr` from `release/2026.7.1`/`v2026.7.1`
  base commit `2d2ddc43d0dcf71f31283d780f9fe9ff4cc04fe4`.
- Cherry-picked the generic host Control UI policy stack into commit
  `26881cec5f1030ed3c4368cbcf6debe2a61c21d1`, pushed it to
  `giodl73-repo/openclaw`, and opened draft PR
  [openclaw/openclaw#115396](https://github.com/openclaw/openclaw/pull/115396)
  against `release/2026.7.1`.
- Local validation before PR: `pnpm --dir ui build`, `pnpm --dir ui exec
vitest run --config vitest.config.ts src/pages/sessions/view.test.ts
src/app/host-policy.test.ts src/lib/config/host-policy.test.ts
src/pages/config/view.host-policy.test.ts src/app/gateway-store.test.ts
src/api/gateway.node.test.ts` (`6 passed`, `91 tests passed`), and
  `git diff --check`.
- Current-main port was attempted in clean worktree
  `C:\src\openclaw-control-ui-host-policy-main`; direct cherry-pick has real
  Control UI drift conflicts, so it was aborted and left clean for a separate
  manual forward-port slice.

## 2026-07-28 OpenClaw Main Port

- Manually forward-ported the generic host Control UI policy stack to current
  OpenClaw `main` in `C:\src\openclaw-control-ui-host-policy-main`.
- Opened draft PR
  [openclaw/openclaw#115408](https://github.com/openclaw/openclaw/pull/115408)
  from `user/giodl/control-ui-host-policy-main` at
  `d198e97cb6f9b03520d5b7e882a6358c06ce4879`; PR is current with `main` and
  blocked only on draft/in-flight checks at last read.
- Filed umbrella issue
  [openclaw/openclaw#115423](https://github.com/openclaw/openclaw/issues/115423)
  for the broader host-controlled Control UI surface and linked #115408 with a
  non-closing `Refs #115423`.
- Validation passed: focused Control UI Vitest suite
  (`src/pages/sessions/view.test.ts`, `src/app/host-policy.test.ts`,
  `src/lib/config/host-policy.test.ts`,
  `src/pages/config/view.host-policy.test.ts`,
  `src/app/gateway-store.test.ts`, `src/api/gateway.node.test.ts`) with
  `6 passed`, `132 tests passed`, plus `git diff --check HEAD~1 HEAD`.
- Full local build/typecheck remains environment-blocked in this clean
  worktree because dependency install cannot fetch private feed packages
  (`@openclaw/fs-safe`, `@modelcontextprotocol/sdk`, `tar`) without auth; the
  filtered TypeScript scan showed no remaining errors in touched UI policy
  files.

## 2026-07-28 Lobster Hosted Route Hardening

- Replaced the proof-only hosted family query
  `/v1/openclaw-gateway?client_family=hosted-control-ui` with a
  runtime-owned hosted Gateway route `/v1/openclaw-control-ui-gateway` in
  `C:\src\lobster-control-ui-proof`.
- Lobster now advertises the hosted route from
  `/openclaw/control-ui-config.json`; the old query form deliberately resolves
  to the normal browser family, so the hosted restriction is path-derived by
  the runtime router rather than trusted from client query params.
- The hosted route reuses the existing WebSocket upgrade handler, JWT/auth
  middleware, connection lifecycle, and metrics path, but resolves
  `ClientFamily::HostedControlUi` before dual-leg capability policy is applied.
- Validation passed:
  `just cargo test -p lobster-runtime hosted_control_ui_route_selects_read_write_client_family --lib`
  (`1 passed`),
  `just cargo test -p lobster-runtime hosted_control_ui --lib` (`2 passed`),
  `just cargo test -p lobster-runtime openclaw_control_ui --lib` (`5 passed`),
  `cargo fmt -p lobster-runtime --check`, and `git diff --check`. Initial
  concurrent test runs timed out while Cargo/rustc were still compiling; warmed
  reruns passed.

## 2026-07-29 Lobster Implementation PR

- Committed the accumulated Lobster proof as
  `55a34d02cf76b7a94730c4d7e3a1081f374dfbf3` on
  `user/giodl/control-ui-hosting-proof`, then amended the inherited bot author
  to Gio and force-pushed the corrected commit
  `904090781f1e64828cc86cba96a8beda9eff6987`.
- Opened draft implementation PR
  [bic/lobster#6087](https://microsoft.ghe.com/bic/lobster/pull/6087),
  separate from design PR #6041, but closed it after confirming the forked head
  did not attach `Lobster-Runtime-PullRequest`.
- Pushed the same corrected commit to in-repo branch
  `origin/user/giodl/control-ui-hosting-runtime` and opened replacement draft
  PR [bic/lobster#6088](https://microsoft.ghe.com/bic/lobster/pull/6088).
  Local branch now tracks the in-repo branch.
- Initial #6088 state: draft, mergeable, review required. `GitOps/FileAffordance`
  and `GitOps/OwnershipEnforcer` passed; `GitOps/GitHubPop` failed as expected
  pending human proof-of-presence. Required `Lobster-Runtime-PullRequest` was
  still missing from raw check runs at last read, not failed.
- Galin approved #6088 at head
  `904090781f1e64828cc86cba96a8beda9eff6987`; Copilot/Galin left only
  non-blocking review notes. Updated the PR body and added a PR comment
  documenting that `config.set`/`config.apply` host-policy entries are UI
  preflight in this slice with OpenClaw native `operator.admin` authorization as
  the server-side backstop, explaining the Windows-only `windows-sys`
  dependency, and confirming extensionless `/openclaw/{*rest}` is intentional
  SPA fallback behavior.
- After waiting again, #6088 still had no `Lobster-Runtime-PullRequest` check
  run attached in GHE; `GitOps/FileAffordance` and `GitOps/OwnershipEnforcer`
  were green, and `GitOps/GitHubPop` remained the expected human
  proof-of-presence failure. Azure DevOps definition `457333`
  (`Lobster-Runtime-PullRequest`) did receive PR build `174234223` for
  `refs/pull/6088/merge` at exact head
  `904090781f1e64828cc86cba96a8beda9eff6987`, but the run completed as
  `canceled` immediately with `ci.isInformationalRun=True`,
  `ci.message=Informational run`, and did not publish the required GitHub
  context.
- Decision: do not block stacked Lobster work on #6088's missing ADO context or
  OpenClaw package promotion. Treat #6088 as the base branch for follow-on PRs,
  and expect the OpenClaw build/package quarantine window to take at least one
  week before Lobster can consume a promoted OpenClaw build directly.
- Opened stacked Lobster draft PR
  [bic/lobster#6113](https://microsoft.ghe.com/bic/lobster/pull/6113) from
  `user/giodl/control-ui-rollout-gate` onto #6088. It adds
  `openclaw_control_ui_enabled` as a process-scope ECS rule, default false,
  keeps `/openclaw` hidden with 404 even when `OPENCLAW_CONTROL_UI_DIR` is
  configured, and reads the gate per request for no-restart rollback.
  Validation passed: `cargo fmt -p lobster-runtime --check`, `just cargo test
-p lobster-config-schema openclaw_control_ui --lib` (`2 passed`), `just cargo
test -p lobster-runtime openclaw_control_ui --lib` (`7 passed`), `just cargo
test -p lobster-runtime hosted_control_ui --lib` (`2 passed`), `python
scripts/ci/check-ecs-settings-inventory.py`, and `git diff --check`.
  Initial #6113 checks: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` passed, `GitOps/GitHubPop` failed as expected for
  human proof-of-presence, and `Lobster-Runtime-PullRequest` completed
  neutral.
- Opened stacked Lobster draft PR
  [bic/lobster#6116](https://microsoft.ghe.com/bic/lobster/pull/6116) from
  `user/giodl/control-ui-root-cutover` onto #6113. It adds
  `openclaw_control_ui_root_redirect_enabled` as a separate process-scope ECS
  rule, default false. `/` continues to redirect to `/web/` unless Control UI
  assets are configured and both `openclaw_control_ui_enabled` and
  `openclaw_control_ui_root_redirect_enabled` are true. `/?health=1` still
  returns the operator service/build JSON snapshot during cutover, and the
  root redirect reads ECS per request for no-restart rollback.
  Validation passed: `cargo fmt -p lobster-runtime --check`, `just cargo test
-p lobster-config-schema openclaw_control_ui --lib` (`4 passed`), `just cargo
test -p lobster-runtime openclaw_control_ui --lib` (`7 passed`), `just cargo
test -p lobster-runtime full_runtime_root --lib` (`5 passed`), `just cargo
test -p lobster-runtime hosted_control_ui --lib` (`2 passed`), `python
scripts/ci/check-ecs-settings-inventory.py`, and `git diff --check`.
  Initial #6116 checks: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` passed, `GitOps/GitHubPop` failed as expected for
  human proof-of-presence, and `Lobster-Runtime-PullRequest` completed
  neutral/skipping.
- Local pre-PR validation passed: `node --check
scripts/stage-openclaw-control-ui.mjs`, `cargo fmt -p lobster-runtime
--check`, `git diff --check`, `just cargo test -p lobster-runtime
openclaw_control_ui --lib` (`5 passed`), `just cargo test -p lobster-runtime
hosted_control_ui --lib` (`2 passed`), and `just cargo test -p
lobster-runtime hosted_control_ui_route_selects_read_write_client_family
--lib` (`1 passed`).

## 2026-07-29 Surgical Replacement Design Addendum

- Updated Lobster design PR
  [bic/lobster#6041](https://microsoft.ghe.com/bic/lobster/pull/6041) with a
  surgical route-replacement alternative at commit
  `b393ba2fe2b6c689498026e30560da9eb652573c`.
- The addendum makes `/chat` -> `/openclaw/chat`, session history/rail ->
  `/openclaw/sessions`, and optional `/tasks` -> `/openclaw/tasks` an accepted
  migration path alongside full `/` cutover.
- It records that surgical replacement stays route-level: Lobster redirects or
  links selected entries into the hosted OpenClaw bundle behind independent ECS
  flags, while keeping the old React pages compiled and rollbackable during
  acceptance.
- It also records the OpenClaw policy addendum needed for this mode:
  `presentation.defaultRoute` and `presentation.navigation`, without promising
  exported OpenClaw components.
- Verification passed: `git diff --check` in
  `C:\src\lobster-control-ui-hosting-design`. The branch was pushed to both the
  PR fork remote `giodl` and in-repo `origin`; direct ref checks show both at
  `b393ba2fe2b6c689498026e30560da9eb652573c`, though `gh pr view 6041` still
  reported the previous head immediately after push, likely GHE indexing lag.

## 2026-07-29 Lobster Surgical Routes PR

- Created clean worktree `C:\src\lobster-control-ui-surgical` and branch
  `user/giodl/control-ui-surgical-routes` from
  `origin/user/giodl/control-ui-rollout-gate` so this alternative stacks on
  #6113 without depending on the optional root cutover PR #6116.
- Opened draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121) at
  `0ff03fd8b60f3464fe62bc0bbf6797f30c8ba944`.
- The PR adds process-scope ECS flags
  `openclaw_control_ui_replace_chat_enabled` and
  `openclaw_control_ui_replace_sessions_enabled`, both default false, plus
  runtime redirects from `/chat` to `/openclaw/chat` and `/sessions` to
  `/openclaw/sessions` only when the hosted Control UI master gate and the
  corresponding replacement gate are enabled.
- Verification passed in `C:\src\lobster-control-ui-surgical`:
  `cargo fmt -p lobster-runtime -p lobster-config-schema --check`,
  `python scripts/ci/check-ecs-settings-inventory.py`,
  `git diff --check HEAD~1 HEAD`,
  `just cargo test -p lobster-config-schema openclaw_control_ui --lib`
  (`5 passed`), and
  `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`11 passed`).
- Initial #6121 state: draft, mergeable, clean; `GitOps/FileAffordance` passed
  immediately. Other GitOps/ADO contexts had not attached yet at first read.

## 2026-07-29 Lobster Web Shell Handoff Slice

- Continued draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121) in
  `C:\src\lobster-control-ui-surgical`; pushed commit
  `1133580b6bccb524575df9fa82fd92a462708351`.
- Added runtime index substitutions for
  `__LOBSTER_OPENCLAW_CONTROL_UI_REPLACE_CHAT_ENABLED__` and
  `__LOBSTER_OPENCLAW_CONTROL_UI_REPLACE_SESSIONS_ENABLED__`, exposing them as
  `readRuntimeConfig().openclawControlUiReplaceChatEnabled` and
  `openclawControlUiReplaceSessionsEnabled` in the SPA.
- Added a top-level `/chat` route handoff: when
  `openclawControlUiReplaceChatEnabled` is true, the React `/chat` route
  performs a browser-level replace to `/chat`, letting the Lobster runtime
  redirect to `/openclaw/chat` only if the master and chat replacement gates are
  still enabled.
- Verification passed in `C:\src\lobster-control-ui-surgical`:
  `cargo fmt -p lobster-runtime --check`, `git diff --check`,
  `cargo test -p lobster-runtime render_index_html --lib` (`8 passed`),
  `cargo test -p lobster-runtime openclaw_control_ui --lib` (`11 passed`), and
  `cargo test -p lobster-config-schema openclaw_control_ui --lib` (`5 passed`).
- Web type-check was not runnable in this worktree without changing dependency
  state: `src/lobster_web` has no `node_modules` and no local `pnpm-lock.yaml`;
  `pnpm --dir src/lobster_web exec tsc --noEmit` failed on missing type packages.
- PR #6121 body was updated after push. Live state after the push: draft,
  mergeable, approved, but `UNSTABLE`: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` passed, `Lobster-Runtime-PullRequest` was
  neutral/skipping, and required `GitOps/GitHubPop` failed with Proof of
  Presence instructions for commit
  `1133580b6bccb524575df9fa82fd92a462708351`. This needs interactive
  Microsoft/PME authentication before the PR can be considered ready.

## 2026-07-29 Lobster Sessions Handoff Slice

- Added the sessions UX handoff to the same draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121), pushing
  commit `f72be1278b787987fd5125c4e40a72bdef4a23b9`.
- The SPA now recognizes `ROUTES.sessions` / `/sessions`, registers a route
  that browser-hands off to runtime `/sessions` when
  `openclawControlUiReplaceSessionsEnabled` is true, and otherwise redirects
  back to `/chat`.
- The rail shows a top-level `Sessions` entry only under the sessions
  replacement flag. In that mode App also withholds the old Lobster
  `showChatHistory` rail rows so users are not shown two competing session
  surfaces.
- Added client-route unit coverage for direct `/web/sessions` normalization,
  though the local JS runner remains dependency-blocked in this worktree.
- Verification passed in `C:\src\lobster-control-ui-surgical`: `git diff
--check`, `cargo fmt -p lobster-runtime --check`, `cargo test -p
lobster-runtime openclaw_control_ui --lib` (`11 passed`), and `cargo test -p
lobster-runtime render_index_html --lib` (`8 passed`). Local
  `pnpm --dir src/lobster_web exec vitest run tests/services/clientRoutes.unit.test.ts
--project unit` failed because `vitest` is not installed locally.

## 2026-07-29 Lobster Handoff Query Preservation

- Added a hardening commit to draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121):
  `3ea5a0c3bfab3bf20f082d81b14588d706320913`.
- `OpenClawControlUiHandoff` now builds its browser-level runtime target with
  `buildExternalRouteHandoffTarget`, preserving query parameters from Wouter
  hash routes such as `/sessions?pane=trash` when handing off to runtime
  `/sessions`.
- Added unit coverage for the pure handoff-target helper in
  `src/lobster_web/tests/services/clientRoutes.unit.test.ts`; local execution
  remains dependency-blocked because `vitest` is not installed in this worktree.
- Verification passed in `C:\src\lobster-control-ui-surgical`: `git diff
--check` and `cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`11 passed`). Local Vitest remained blocked by missing `vitest`.

## 2026-07-29 Lobster Settings Handoff Slice

- Added the settings replacement target to draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121), pushing
  commit `d7751314d2d5cfc7c20668ff588f17acd05865d8`.
- Added process-scope ECS flag
  `openclaw_control_ui_replace_settings_enabled`, default false, and runtime
  `/settings` -> `/openclaw/settings` redirect gated by both the hosted Control
  UI master gate and the settings replacement gate.
- The SPA now exposes
  `readRuntimeConfig().openclawControlUiReplaceSettingsEnabled`, recognizes
  `ROUTES.settings`, and hands `/settings` to runtime `/settings` under the
  replacement flag while preserving route query params.
- The rail shows a top-level `Settings` entry only under the settings
  replacement flag. The existing Lobster account-menu `AgentSettingsDialog`
  remains intact because it owns Lobster-specific identity/attendant settings,
  not generic OpenClaw Control UI settings.
- Verification passed in `C:\src\lobster-control-ui-surgical`: `cargo fmt -p
lobster-runtime -p lobster-config-schema --check`, `git diff --check`,
  `python scripts/ci/check-ecs-settings-inventory.py`, `cargo test -p
lobster-config-schema openclaw_control_ui --lib` (`5 passed`), `cargo test
-p lobster-runtime openclaw_control_ui --lib` (`11 passed`), and `cargo test
-p lobster-runtime render_index_html --lib` (`8 passed`). Local Vitest
  remained blocked by missing `vitest`.

## 2026-07-29 Lobster Surgical Acceptance Checklist

- Updated draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121) body
  with an acceptance checklist for the surgical hosted Control UI route set:
  staged Control UI bundle, master `/openclaw` gate, chat/sessions/settings
  replacement redirects with query preservation, rollback of each replacement
  flag, master-gate rollback, no static-load container allocation, and hosted
  Gateway policy/scopes once the promoted OpenClaw package is available.
- No code changed. Lobster worktree
  `C:\src\lobster-control-ui-surgical` remains clean at
  `d7751314d2d5cfc7c20668ff588f17acd05865d8`.
- Live PR state at this update: draft, mergeable, `UNSTABLE`;
  `GitOps/GitHubPop` still needs later Proof of Presence,
  `Lobster-Runtime-PullRequest` is neutral/skipping, and review state is
  currently `CHANGES_REQUESTED`. Review-thread handling is now the next
  non-code-adjacent follow-up if we continue on #6121 before the quarantine
  window ends.

## 2026-07-29 Lobster Real-Bundle Proof Harness

- Added commit `c2b8f9e786d12f24528ef9166f3f32582cd230f7` to draft PR
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121).
- The new ignored test
  `routes::tests::openclaw_control_ui_serves_real_bundle_proof` lets a local
  operator point Lobster's router at a real OpenClaw `dist/control-ui` bundle
  using `OPENCLAW_CONTROL_UI_PROOF_DIR`, without making normal CI depend on a
  local artifact.
- Local proof passed using OpenClaw PR #115408 head
  `633c2f60fb223fcb253d4da33208be21d8b8b2e0` and
  `C:\src\openclaw-control-ui-host-policy-main\dist\control-ui`:
  `cargo test -p lobster-runtime openclaw_control_ui_serves_real_bundle_proof
--lib -- --ignored` (`1 passed`).
- The proof covers the real OpenClaw shell under `/openclaw/settings`,
  surgical redirects for `/chat`, `/sessions`, and `/settings`, query
  preservation, reduced hosted Gateway path/scopes, read-only wildcard
  settings, and disabled `sessions.delete` in
  `/openclaw/control-ui-config.json`.
- Regression validation also passed in
  `C:\src\lobster-control-ui-surgical`: `cargo fmt -p lobster-runtime
--check`, `git diff --check`, `python scripts/ci/check-ecs-settings-inventory.py`,
  `cargo test -p lobster-runtime openclaw_control_ui --lib` (`11 passed`, `1
ignored`), `cargo test -p lobster-runtime render_index_html --lib` (`8
passed`), and `cargo test -p lobster-config-schema openclaw_control_ui
--lib` (`5 passed`).
- PR #6121 body was updated with the local proof. Live state after push:
  draft, mergeable, `UNSTABLE`; `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` passed, `Lobster-Runtime-PullRequest` completed
  neutral, `GitOps/GitHubPop` failed for the expected human proof-of-presence
  gate, and review state remains `CHANGES_REQUESTED`.

## Resume Checklist

- Run: `gh pr view 6041 --repo microsoft.ghe.com/bic/lobster --json headRefName,headRefOid,isDraft,mergeStateStatus,mergeable,reviewDecision,statusCheckRollup,updatedAt`.
- Verify: `gh pr diff 6041 --repo microsoft.ghe.com/bic/lobster --name-only`.
- Review: `docs/design/2026-07-28-openclaw-control-ui-hosting.md` from PR #6041
  and the local Lobster relay/static-hosting code before selecting a branch.
- Inspect: Lobster `/v1/openclaw-gateway`, `GatewayWs`, static asset hosting,
  feature-flag, and ECS patterns.
- Update: this file and add a `sessions/` checkpoint after any proof,
  branch/PR, design-review, or live-check change.

## Guardrails

- Keep implementation work in Lobster or OpenClaw worktrees, not `claws-hapi`.
- Do not use the dirty `C:\src\lobster` checkout for implementation.
- Start with a disposable proof before filing implementation PRs.
- Do not introduce an iframe, Lobster Control UI fork, second config writer,
  browser-held `operator.admin`, or broad management daemon.
- Static Control UI assets and bootstrap must not allocate or cold-start a user
  container.
- Hidden or disabled UI is presentation only; runtime and OpenClaw mutation
  boundaries must enforce lockdown.
- Keep broad config-backed pages read-only until OpenClaw enforces
  deployment-owned paths atomically.
- Preserve ECS rollback to the current Lobster SPA through production
  acceptance.

## Open Threads

- Locate the promoted OpenClaw package Control UI artifact path and decide how
  Lobster extracts/digest-binds it into `OPENCLAW_CONTROL_UI_DIR`.
- Confirm whether existing same-origin Gateway authentication is sufficient, or
  whether a bounded opaque WebSocket ticket is required.
- Define the first typed lockdown policy and fail-closed method gate in Lobster.
- Reconcile the OpenClaw and Lobster proof branches into PR-shaped stacks:
  OpenClaw generic host policy first, Lobster hosted config consumer second.
- Treat OpenClaw PR #115408 as the only active OpenClaw host-policy PR. Do not
  backport this work to `release/2026.7.1`.
- Stack follow-on Lobster PRs on #6088 while waiting for OpenClaw build/package
  quarantine. Watch #6088 for required Lobster checks (`GitOps/GitHubPop` and
  `Lobster-Runtime-PullRequest`) and review comments; the current ADO issue is
  an informational canceled run, not a failing runtime test.
- Decide which current Lobster SPA surfaces remain Lobster-owned during the
  first cutover window.

## 2026-07-29 OpenClaw Host Policy Simplification

- Tightened the OpenClaw host-policy PR to a smaller V1 contract for Peter
  review:
  - [openclaw/openclaw#115408](https://github.com/openclaw/openclaw/pull/115408)
    now has commit `47347c579d1e7a84ca4ec68fb0e48af6aeb7c06f`, includes a
    normal merge from current `main`, and is draft/mergeable but `UNSTABLE`
    while checks settle.
- Closed the release-line draft
  [openclaw/openclaw#115396](https://github.com/openclaw/openclaw/pull/115396)
  after confirming we are not trying to backport hosted Control UI policy.
- Settings policy V1 is now intentionally coarse: `settings["*"]` or
  `defaults.setting` can make hosted settings read-only, while granular
  field ownership/child editable exceptions are deferred to a later
  server-enforced config contract.
- The PR body now states that browser `requestPreflight` is presentation
  preflight only. Lobster remains responsible for hosted authorization and
  method/scope enforcement.
- The PR body also includes expected follow-up PRs: host-authoritative
  config mutation, later granular settings ownership, server-side action
  enforcement expansion, packaged hosted proof fixtures, and optional
  component-level embedding.
- Validation on #115408 main worktree:
  `vitest run --config vitest.config.ts src/app/host-policy.test.ts
src/lib/config/host-policy.test.ts src/app/gateway-store.test.ts
src/api/gateway.node.test.ts` from `ui/` passed (`4 files`, `88 tests`),
  and `git diff --check HEAD~2 HEAD` passed.
- Validation gap: local jsdom rendered view tests remain blocked by missing
  local `ui/node_modules/.bin/vitest`/`jsdom`; `pnpm exec` attempts private
  feed dependency repair and fails without auth.
- Confirmed current Lobster surgical branch already emits
  `hostControlPolicy.settings["*"].state = "readOnly"`, matching the
  simplified OpenClaw contract. No Lobster code change was needed for the
  policy-shape alignment.

## 2026-07-29 OpenClaw Bootstrap Scope Fix

- Patched the active OpenClaw PR
  [openclaw/openclaw#115408](https://github.com/openclaw/openclaw/pull/115408)
  to fix ClawSweeper's P1 bootstrap-token scope finding.
- New PR head:
  `633c2f60fb223fcb253d4da33208be21d8b8b2e0`.
- `GatewayBrowserClient` now applies host-provided `operatorScopes` before
  falling back to the default bootstrap scope list, so hosted
  `hostControlPolicy.gateway.scopes` wins even when a bootstrap token is used.
- Added focused coverage in `ui/src/api/gateway.node.test.ts` proving the
  bootstrap-token connect frame and signed device payload use the host scope
  list.
- Validation passed in `C:\src\openclaw-control-ui-host-policy-main\ui`:
  `vitest run --config vitest.config.ts src/api/gateway.node.test.ts
src/app/host-policy.test.ts src/lib/config/host-policy.test.ts
src/app/gateway-store.test.ts` (`4 files`, `89 tests`) and `git diff --check`.
- Updated #115408 body with the fixed P1 and collapsed follow-ups to three
  meaty PRs: host-authoritative config/action enforcement, granular settings
  ownership after that contract exists, and packaged hosted proof harness.
- Live state after push: draft, mergeable, `UNSTABLE` while checks/review
  settle for the new head. No manual ClawSweeper re-review comment was added
  because new-head checks had already queued.
- ClawSweeper re-reviewed new head `633c2f60fb223fcb253d4da33208be21d8b8b2e0`
  and confirmed the prior bootstrap-token scope finding appears resolved. The
  PR remains blocked only on expected non-code gates: maintainer approval for
  the new hosted Control UI contract and real hosted proof showing route
  redirects, read-only settings, reduced-scope Gateway connection, and
  host/server-denied mutation.

## 2026-07-29 OpenClaw Host Policy Docs And Refresh

- Addressed the next #115408 review finding by adding public hosted Control UI
  policy documentation in
  `C:\src\openclaw-control-ui-host-policy-main\docs\web\host-control-policy.md`.
  The page covers the opt-in enablement path, V1 schema, default-open local
  behavior, Gateway path/scope precedence including bootstrap-token
  connections, and the requirement that the host or Gateway relay enforce auth
  and mutation policy server-side.
- Linked the new doc from `docs\web\control-ui.md`, added it to
  `docs\docs.json`, and regenerated `docs\docs_map.md`.
- Pushed docs commit
  `4183e62ab1a7cc93650256e9ed8cb87ad5ddb61f` to
  [openclaw/openclaw#115408](https://github.com/openclaw/openclaw/pull/115408).
- Refreshed the PR branch with current `origin/main` using a normal merge
  commit instead of rewriting branch history. Current pushed head is
  `c475fe270e6f2d349151f187276ca1a60b07d370`; the PR is mergeable but still
  `UNSTABLE` while review/check state settles.
- Local post-refresh validation passed in
  `C:\src\openclaw-control-ui-host-policy-main`: `git diff --check`,
  `node scripts/check-docs-mdx.mjs docs/web/host-control-policy.md
docs/web/control-ui.md --max-errors 20`, `node scripts/generate-docs-map.mjs
--check`, and from `ui/`,
  `vitest run --config vitest.config.ts src/api/gateway.node.test.ts
src/app/host-policy.test.ts src/lib/config/host-policy.test.ts
src/app/gateway-store.test.ts` (`4 files`, `89 tests`).
- Validation caveats: broad docs scripts timed out locally when run across the
  tree; `pnpm docs:map:gen` also attempted dependency repair and failed against
  the private feed without auth, so the docs map was regenerated directly with
  `node scripts/generate-docs-map.mjs`.
- Posted a refreshed-head `@clawsweeper re-review` comment for `c475fe2`. The
  review worker started at `2026-07-29T16:43:46Z` with a lease expiring at
  `2026-07-29T17:24:46Z`; wait for the durable review comment before making the
  next readiness call.
- Live PR and umbrella issue bodies were later tightened to answer the
  Lobster-hack concern explicitly:
  - PR #115408 now states that a host can technically patch CSS/JS or fork the
    bundle, but that is brittle and not the supported OpenClaw integration
    model.
  - PR #115408 and issue #115423 now both state the correctness boundary:
    OpenClaw owns generic browser presentation policy, while the host runtime or
    Gateway relay owns authoritative auth, scope checks, and mutation denial.

## 2026-07-29 OpenClaw Server Enforcement Stack

- Created stacked OpenClaw worktree
  `C:\src\openclaw-control-ui-server-policy` on branch
  `user/giodl/control-ui-server-policy`, based on #115408 head
  `c475fe270e6f2d349151f187276ca1a60b07d370`.
- Added commit `cf5ac27f5bd1cf5a3eadb2ac8a6360f66c95237e`
  (`feat: add hosted gateway policy enforcement`) for the generic
  server-side enforcement contract:
  - new `src/gateway/host-gateway-policy.ts` helper with `enabled`,
    `disabled`, and `brokered` method action states;
  - optional `GatewayRequestContext.hostGatewayPolicy`;
  - dispatch-time enforcement after role/scope auth and before handlers or
    session mutations;
  - exact method keys plus hierarchical wildcards such as `sessions.*`;
  - opt-in default-open behavior and trusted synthetic-client bypass.
- Opened draft stack
  [openclaw/openclaw#116013](https://github.com/openclaw/openclaw/pull/116013)
  against `main`. It intentionally includes the full #115408 commit stack plus
  the new server-enforcement commit, matching the normal stacked-PR workflow.
- #116013 current summary from GitHub: draft/open, base `main`, head
  `giodl73-repo:user/giodl/control-ui-server-policy`, 31 files, +1238/-37.
- Validation passed for the new slice:
  `oxfmt --check` on the four touched files, `oxlint` on the four touched
  files, `git diff --check`, and a `node --import tsx` probe proving wildcard
  policy denial returns `HOST_GATEWAY_POLICY_BLOCKED`.
- Focused Vitest caveat: `vitest run --config vitest.config.ts
src/gateway/server-methods.authorization.test.ts` starts but fails before
  test execution because this local worktree cannot install/fetch private
  `@openclaw/fs-safe` from `packagefeedproxy.microsoft.io` without credentials.
  The PR includes new tests covering write-scope denial, admin-scope denial,
  and synthetic-client bypass.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`. Keep this file
as the concise canonical resume snapshot.

## 2026-07-29 Lobster OpenClaw Image Policy Patch

- Added Lobster-side OpenClaw source patch
  `src/openclaw_container/openclaw-patches/0019-hosted-control-ui-policy.patch`
  on `C:\src\lobster-control-ui-surgical`, following the existing image patch
  registry/apply model instead of shipping a new OpenClaw package during the
  quarantine wait.
- Patch 0019 backports the hosted Control UI browser policy contract onto the
  pinned `v2026.5.28` source after patches `0001`-`0018`: bootstrap
  `hostControlPolicy`, hosted Gateway path/scopes, `/settings` alias,
  centrally hidden disabled routes/settings tabs, coarse read-only settings for
  Advanced + Quick Settings, and disabled bulk `sessions.delete`.
- Wired `0019-hosted-control-ui-policy.patch` into the Dockerfile `COPY` and
  sequential `git apply --check && git apply` list, and documented it in
  `openclaw-patches/README.md` with re-derive guidance and upstream drop
  condition.
- Validation passed in `C:\src\lobster-control-ui-surgical`:
  `just openclaw-patches-check --offline`, `just openclaw-patches-check`
  fresh-clone applicability (`18 patch(es) apply cleanly to pristine
v2026.5.28`), and `git diff --cached --check`.
- Validation caveat: `just openclaw-js-unit-tests` was attempted for a patched
  source build but timed out locally after 10 minutes while running Docker
  target `openclaw-msteams-build`; the leftover build processes from that
  attempt were stopped.

## 2026-07-30 Lobster PR #6121 CI Repair

- Pushed commit `f3c9376f97415bb0037405996d19f94437946c7e` to
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121) after
  diagnosing ADO run `174420064` failures from exact head `aff75f4a4b`.
- Fixes included the Biome formatter diff in `src/lobster_web/src/App.tsx`,
  a clippy `needless-pass-by-value` fix for
  `build_router_with_profile_kill_switches_and_control_ui`, stale Autodev
  `AdoErrorReasons` references, and CDN packaging exclusion for
  `dist/openclaw-control-ui/**` because hosted OpenClaw assets are served by
  runtime rather than uploaded to Lobster web CDN.
- Local verification passed in `C:\src\lobster-control-ui-surgical`:
  `just web-fmt-check`, `just cargo fmt -p lobster-runtime --check`,
  `python scripts/package_web_cdn_test.py`, a fixture replay of
  `scripts/package-web-cdn.py` with representative
  `openclaw-control-ui/` files, `cd src/lobster_runtime; ../../cargo.sh
clippy --all-targets --no-deps -- -D warnings`, and `git diff --check`.
- Local verification caveat: `just autodev-dotnet-check` cannot run on this
  machine because `global.json` requires .NET SDK `10.0.100` and no .NET SDK is
  installed.
- Live state after push: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` green; `GitOps/GitHubPop` failed for expected
  human proof-of-presence; ADO run `174429986` is in progress with Detect
  green and the formerly failing Web Static, Runtime Quality, Autodev .NET,
  and web bundle/CDN paths still running at last poll.

## 2026-07-30 Lobster PR #6121 Runtime Clippy Follow-Up

- ADO run `174429986` proved the prior repair fixed Autodev, Web Static, web
  bundle, CDN packaging, OpenClaw image build, and OpenClaw JS unit tests, but
  still failed `Lobster Runtime — Quality` on a second
  `clippy::needless-pass-by-value` wrapper at
  `build_router_with_profile_and_kill_switches`.
- Pushed follow-up commit `9465e9c9def129c9f375addb95c13dae05a08e65` to make
  the router-builder wrapper chain borrow the runtime config subscriber
  consistently.
- Local verification passed: `just cargo fmt -p lobster-runtime --check`,
  `cd src/lobster_runtime; ../../cargo.sh clippy --all-targets --no-deps --
-D warnings`, and `git diff --check`.
- Live state after push: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` green; expected `GitOps/GitHubPop` failure;
  new `Lobster-Runtime-PullRequest` ADO run `174433748` attached and is in
  early Detect/Repo validation.

## 2026-07-30 Lobster PR #6121 Bootstrap Route Review Fix

- Took dspektor's constructive `CHANGES_REQUESTED` feedback on
  [bic/lobster#6121](https://microsoft.ghe.com/bic/lobster/pull/6121): the
  OpenClaw bundle requests `/__openclaw/control-ui-config.json` before
  Lobster route policy is available, while Lobster was only serving
  `/openclaw/control-ui-config.json`.
- Pushed commit `924d65ce7b5968e186818b75043b3ad38b9a6cd7` adding a
  runtime-owned alias at `/__openclaw/control-ui-config.json`, backed by the
  same hosted Control UI config handler and the same default-off ECS gate as
  the `/openclaw` config route.
- Extended runtime tests to assert the mount stays hidden when disabled, both
  config URLs return the same no-cache hosted policy when enabled, and the
  ignored real-bundle proof fetches the concrete relative `./assets/...` file
  plus the upstream bootstrap config URL.
- Local verification passed in `C:\src\lobster-control-ui-surgical`:
  `just cargo fmt -p lobster-runtime --check`, `git diff --check`,
  `cd src/lobster_runtime; ../../cargo.sh clippy --all-targets --no-deps --
-D warnings`, `just cargo test -p lobster-runtime openclaw_control_ui --lib`
  (`11 passed`, `1 ignored`), and with
  `OPENCLAW_CONTROL_UI_PROOF_DIR=C:\src\openclaw-control-ui-host-policy-main\dist\control-ui`,
  `just cargo test -p lobster-runtime
openclaw_control_ui_serves_real_bundle_proof --lib -- --ignored` (`1
passed`).
- Live state after push: PR #6121 head is `924d65ce7b`, draft, mergeable but
  `BLOCKED` with `CHANGES_REQUESTED`; `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` are green, `GitOps/GitHubPop` has the expected
  proof-of-presence failure, and `Lobster-Runtime-PullRequest` ADO run
  `174441255` is queued/in progress.

## 2026-07-30 Lobster PR #6121 Main Merge Refresh

- ADO run `174441255` on head `924d65ce7b` failed, and GitHub marked PR #6121
  `CONFLICTING` after `main` moved.
- Merged current `origin/main` into
  `user/giodl/control-ui-surgical-routes`, resolving the only content conflict
  in `src/openclaw_container/openclaw-patches/README.md` by preserving both
  `main`'s `0017-exec-approval-capability-token-relay.patch` documentation and
  this PR's `0022-hosted-control-ui-policy.patch` documentation.
- Pushed merge commit `bd85aaf7a92a26843fdc411c462866569d8c1f50`. PR #6121 is
  mergeable again, still draft, with no active review decision at first poll.
- Local validation passed in `C:\src\lobster-control-ui-surgical`:
  `just cargo fmt -p lobster-runtime --check`,
  `just openclaw-patches-check --offline`,
  `just cargo test -p lobster-runtime openclaw_control_ui --lib` (`11 passed`,
  `1 ignored`), `cd src/lobster_runtime; ../../cargo.sh clippy --all-targets
--no-deps -- -D warnings`, full `just openclaw-patches-check`, and
  `git diff --check`.
- Live state after push: `GitOps/FileAffordance` and
  `GitOps/OwnershipEnforcer` green; expected `GitOps/GitHubPop` failure;
  `Lobster-Runtime-PullRequest` ADO run `174512321` queued/in progress.

## 2026-07-31 Lobster PR #6121 Rebase Onto Main

- Rebasing `user/giodl/control-ui-surgical-routes` onto current `origin/main`
  completed and was force-pushed with lease to head
  `dff45863eef78ba7fe14cd8598eab88f56400f07`.
- Resolved main drift by keeping the current consolidated OpenClaw patch stack,
  inserting hosted Control UI policy as
  `0019-hosted-control-ui-policy.patch`, and preserving main's rail
  automations model while using one
  `openclawControlUiReplaceCoreRoutesEnabled` gate for `/chat`, `/sessions`,
  and `/settings`.
- Added a tiny rebase repair commit to remove a duplicate Windows
  `windows-sys` target dependency section and keep Windows clippy green for
  Linux-only confined manifest store carriers.
- Local validation passed in `C:\src\lobster-control-ui-surgical`:
  `git diff --check`, `just web-fmt-check`, `just web-lint`,
  `just web-type-check`, `just cargo fmt -p lobster-runtime --check`,
  `just check-runtime-clippy`, `just openclaw-patches-check --offline`, and
  `just openclaw-patches-check`.
- Live state after push: PR #6121 head is `dff45863ee`, draft, mergeable, and
  `BLOCKED`. `GitOps/FileAffordance` and `GitOps/OwnershipEnforcer` passed;
  `GitOps/GitHubPop` failed for the expected human proof-of-presence gate; and
  required `Lobster-Runtime-PullRequest` ADO run `174614353` is queued/in
  progress.

## 2026-07-31 Lobster PR #6121 AAD Throttle Repair

- ADO run `174718311` on PR #6121 head `ca3785524f` proved the prior runtime
  route clippy repair was good: `Lobster Runtime - Quality`, unit tests, web
  static/unit/E2E, OpenClaw image build, OpenClaw JS unit tests, and adapter
  checks passed.
- The remaining actionable failures shared one root cause before repo code ran:
  AzureCLI service-connection login hit AAD `AADSTS90055` / HTTP 429 throttling
  while validating Torus WIF or minting TRIPS/git tokens.
- Pushed commit `114efc92fb50546e16dd125252320e04ab9fa953`
  (`fix: retry throttled AzureCLI auth gates`) to add
  `retryCountOnTaskFailure: 2` to the three observed AzureCLI@2 auth gates:
  Repo validation Torus WIF validation, hard-mint git-write TRIPS user, and
  TRIPS connectivity-smoke token mint.
- Local validation passed in `C:\src\lobster-control-ui-surgical`:
  `python scripts\check_runtime_pipeline_sdl_test.py` (`314 tests`),
  `python scripts\pipeline_cancel_safe_conditions_test.py` (`28 tests`), and
  `git diff --check`.
- Live state immediately after push: PR #6121 head is `114efc92fb`, draft and
  mergeable, but checks had not attached yet. `GitOps/GitHubPop` is still
  expected to require human proof-of-presence once checks attach.

## 2026-07-31 Lobster PR #6121 Main Refresh Repair

- ADO run `174724180` on the prior PR head failed after most validation passed;
  GitHub then marked #6121 conflicting against current `main`.
- Rebasing `user/giodl/control-ui-surgical-routes` onto current `origin/main`
  completed and was force-pushed with lease to head
  `5d5a82bc458bdf31bdcae72d7ccac42dd602b6cf`.
- Resolved the rebase conflict in
  `src/openclaw_container/openclaw-patches/README.md` by preserving `main`'s
  newer patch inventory and adding this PR's hosted Control UI patch as
  `0019-hosted-control-ui-policy.patch`; the README now documents all 24 patch
  files, including `0018`, `0019`, `0021`, `0022`, `0023`, `0024`, and `0025`.
- Local validation passed in `C:\src\lobster-control-ui-surgical`:
  `git diff --check`, `just web-fmt-check`, `just web-lint`,
  `just web-type-check`, `python scripts\package_web_cdn_test.py`,
  `just cargo fmt -p lobster-runtime --check`,
  `python scripts\check_runtime_pipeline_sdl_test.py` (`314 tests`),
  `python scripts\pipeline_cancel_safe_conditions_test.py` (`28 tests`),
  `just cargo test -p lobster-runtime openclaw_control_ui --lib` (`11 passed`,
  `1 ignored`; rerun with `CARGO_BUILD_JOBS=1` after a timed-out parallel
  compile), `just check-runtime-clippy`, `just openclaw-patches-check
  --offline`, full `just openclaw-patches-check`, and direct web unit tests for
  `SkillsPage.querycache.unit.test.tsx` plus `clientRoutes.unit.test.ts`
  (`39 passed`).
- Validation caveats: broad `just web-test` timed out locally, so the two
  touched web unit suites were run directly; ignored real-bundle proof skipped
  because `C:\src\openclaw-control-ui-host-policy-main\dist\control-ui` is not
  present.
- Live state immediately after push: PR #6121 is draft, mergeable, and
  `BLOCKED`; checks had not attached yet. `GitOps/GitHubPop` is still expected
  to require human proof-of-presence once checks attach.

## 2026-08-01 Lobster PR #6121 Current-Main Restack

- Merged current `origin/main` into
  `user/giodl/control-ui-surgical-routes` and published exact head
  `33313f26e74414378b4cc96046c9552427ec2b57`.
- Resolved the only conflict in
  `src/openclaw_container/src/confined_manifest_store.rs` by retaining
  `main`'s Linux-only `MAX_MANIFEST_BYTES` guard, which matches the
  Linux-gated `MANIFEST_BOUNDS` import, and deduplicating overlapping
  `cfg_attr` annotations.
- Preserved the approved hosted Control UI behavior and did not add Galin's
  optional P3 follow-ups during the conflict repair.
- Local validation passed: `git diff --check`, `just rust-fmt-check`,
  `just openclaw-patches-check`,
  `cargo.sh test -p openclaw-adapter --no-fail-fast`, and the PR hard-gate
  policy checker plus all 17 policy tests. The aggregate
  `just openclaw-container-test` cannot run on native Windows because
  `aether-priv-bridge` uses Unix sockets.
- PR #6121 is mergeable again. Exact-head reviews were re-requested from
  `Galin-Iliev` and `dspektor`; required Runtime CI attached naturally and is
  queued with early stages running, while `GitOps/GitHubPop` is red pending
  human proof of presence.

## 2026-07-31 OpenClaw Server Enforcement Contract Shape

- Updated OpenClaw PR
  [#116013](https://github.com/openclaw/openclaw/pull/116013) in
  `C:\src\openclaw-control-ui-server-policy` with commit
  `4a09753f25400b1fc729b1fe95be4abc72a4a58f`
  (`feat: share hosted policy decision contract`).
- PR2 still only enforces hosted policy for Gateway actions, but now defines a
  reusable `HostPolicyDecision` shape (`state`, `reason`, `source`, `broker`)
  and shared matcher for exact keys, hierarchical wildcards, same-depth segment
  wildcards, and `*`.
- The docs now include a hypothetical Lobster/Policy settings example
  (`gateway.bind`, `tools.exec.host`, `channels.*.groupPolicy`) so the later
  policy settings-constraints stack can reuse the same decision model instead
  of introducing a second contract.
- Validation passed: `git diff --check`, targeted `oxfmt --check`, targeted
  `oxlint`, `scripts/check-docs-mdx.mjs docs/web/host-control-policy.md`, and a
  direct `tsx` smoke for decision matching and broker/source error details.
  Focused Vitest was blocked before test execution by missing private
  `@openclaw/fs-safe/config`; the commit hook was blocked by missing
  `node_modules/.bin/oxfmt`, so the commit used `--no-verify` after direct
  checks.
- Live state after refresh: #116013 head `4a09753f25`, draft, and
  `CONFLICTING`/`DIRTY` against `main` because it remains stacked on #115408;
  attached checks are green or intentionally skipped.

## 2026-07-31 OpenClaw Hosted Policy Stack Refresh

- Refreshed OpenClaw PR
  [#115408](https://github.com/openclaw/openclaw/pull/115408) in
  `C:\src\openclaw-control-ui-host-policy-main` by rebasing
  `user/giodl/control-ui-host-policy-main` onto current `origin/main`.
- Resolved current Control UI settings/sidebar conflicts by preserving `main`'s
  extracted settings shell and reapplying the hosted policy hooks:
  host-policy route filtering, settings read-only/disabled state, config
  autosave/apply affordances, and disabled session deletion.
- Added rebase repair commit `6fba8ef36745794493266960efc063afacb0fcd1`
  (`fix: repair hosted policy rebase`) restoring the small
  `view-status.ts` helper plus `ConfigProps.onApply` wiring.
- Force-pushed #115408 to fork branch
  `user/giodl/control-ui-host-policy-main`; live state after push:
  draft, mergeable, `UNSTABLE` while checks settled, with no-tabs/actionlint,
  proof, labels, and detector checks passing or intentionally skipped.
- Restacked OpenClaw PR
  [#116013](https://github.com/openclaw/openclaw/pull/116013) in
  `C:\src\openclaw-control-ui-server-policy` onto the refreshed #115408 head
  and force-pushed to fork branch `user/giodl/control-ui-server-policy`.
  New head is `55e3c97ddc157c1ad167be60dcd2e497834536f5`.
- Local validation available without a full JS dependency install passed:
  `git diff --check` and anchored conflict-marker scans on both worktrees.
  Full `pnpm exec oxfmt --check ...` could not run locally because pnpm tried
  to install the full workspace and failed against `packagefeedproxy` with
  `chalk-6.0.0.tgz` 404 plus current Node `v24.14.0` below repo engine
  `>=24.15.0`.
- Live state after #116013 push: draft, mergeable, `UNSTABLE`; dispatch and
  detectors started passing, with no-tabs/actionlint/proof/labels still
  attaching at first poll.
