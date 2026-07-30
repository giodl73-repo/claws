# OpenClaw Rust Node Session Context

## Agent Start

1. Read this file.
2. Read `projects/openclaw-rust-node/README.md`.
3. Read RFC 0001 and its current role review in `C:\src\openclaw-rust-node`.
4. Check live state in both `C:\src\openclaw-rust-node` and the OpenClaw source
   worktree used for contract verification.
5. Use the FACES development loop for RFC, architecture, or evidence-slice
   changes.

## Baseline

- Area: OpenClaw Rust node client, headless host, conformance, and first Lobster
  embedding proof.
- Primary implementation target: `openclaw/openclaw`; the separate
  `giodl73-repo/openclaw-rust-node` repository is now a donor/prototype.
- Active OpenClaw worktree: WSL `/root/src/openclaw-rust-gateway-client`.
- Active consolidated Rust follow-up worktree:
  `C:\src\openclaw-rust-runtime-followup`.
- Active Windows adopter worktree: `C:\src\openclaw-windows-rust-sidecar`.
- Current Windows branch: `agent/rust-node-sidecar-seam-rebase`, with exact
  head `194928fd` pushed to
  `giodl73-repo/openclaw-windows-node:agent/rust-node-sidecar-seam`.
- Current reviewed `main` commit: `307945482d5543b7e3572bc6c0c288d4ff5b758c`.
- OpenClaw source audit: `openclaw/openclaw` main at
  `219f27a5ec6b6ed058c95653ac604bc2a25a26d2` on 2026-07-28.
- Main tracking file: `projects/openclaw-rust-node/README.md`.
- Skills to use: `faces-development-loop` for architecture/conformance work,
  `openclaw-testing` when choosing Gateway validation, and `project-session`
  for handoffs.

## Current Session

- Last updated: 2026-07-30.
- Last agent: Codex.
- The intended review shape is now two OpenClaw implementation PRs plus one
  initial Windows adopter PR. Draft [OpenClaw #116050](https://github.com/openclaw/openclaw/pull/116050)
  remains the foundation. Upstream draft [#116450](https://github.com/openclaw/openclaw/pull/116450)
  is the exact second-PR head at `10e4e6e96d1`; it temporarily targets `main`
  because GitHub cannot base an upstream PR on #116050's fork branch. After
  #116050 lands, its remaining diff is the eight-commit follow-up: 2,754
  additions and 361 deletions across 16 files. Fork #192 is closed as
  superseded; narrow evidence PRs #186-#191 are also closed. Hosted Linux and
  macOS companion checks and the proof gates pass on #116450. Current-head
  Windows proof passes 45 node-host tests, strict workspace Clippy, Rustdoc,
  formatting, and diff checks; the unchanged foundation Gateway socket test
  still resets on Windows and has prior Linux proof. Full aggregate and
  commit-only Codex reviews timed out without a verdict, so no clean
  consolidation-wide review is claimed.
- Draft [RFC #54](https://github.com/openclaw/rfcs/pull/54) is clean at
  `cdc10f5` and now links the two upstream OpenClaw PRs. Draft Windows
  [#1068](https://github.com/openclaw/openclaw-windows-node/pull/1068) absorbed
  fork PR #1 and is rebased onto upstream `9acafa60` at `194928fd`; GitHub now
  reports it mergeable/CLEAN with all hosted checks complete and green. Its
  current-head live Gateway MXC proof passes 2/2.
- Merged Windows fork PR [giodl73-repo/openclaw-windows-node#1](https://github.com/giodl73-repo/openclaw-windows-node/pull/1)
  is included in upstream adopter PR #1068 at `194928fd`. It extracts command
  indexing, eight-slot bounded execution, duplicate tracking, caller/transport
  cancellation, telemetry, and completion events from `WindowsNodeClient` into
  the transport-independent `NodeCapabilityDispatcher`. The default C# runtime
  and Gateway wire parsing remain unchanged. The rebase also preserves current
  challenge-timestamp, reconnect-authorization, and disposal behavior through
  the generic runtime contract. Full build, 3,402 Shared tests (32 existing
  environment-gated skips), 2,022 Tray tests, 516 Connection tests, diff check,
  and Codex review pass. After stopping both WSL
  distributions and removing only the stale generated E2E temp tree, the
  current-head live MXC lane passed 2/2: Gateway `system.run` executed through
  the paired Windows node under MXC containment, and a write to tray data was
  denied. The isolated distro was unregistered during successful teardown.
  PR #1068 now carries the current-head proof and links the consolidated Rust
  follow-up PR #116450.
- RFC #54 and the three implementation PR bodies now share one explicit series
  description and landing order. Durable body sources live in this project
  directory. The #116050 description was also restored from a previously
  flattened Markdown body to a structured 150-line review surface.
- Draft stacked fork PR [giodl73-repo/openclaw#191](https://github.com/giodl73-repo/openclaw/pull/191)
  is based on PR #190 at `d679316798c`. It adds one shared lifecycle corpus
  for invocation request, ordered input, progress, and success/failure result
  envelopes, then consumes it from the public TypeScript validators and the
  Rust parser/result/loopback paths. It also corrects the request schema to
  accept the Gateway's shipped nullable `paramsJSON` and optional `sessionKey`
  shape and exports the missing request/input validators. Cancellation remains
  excluded pending upstream PR #115390; connection retirement remains in
  #190. Blacksmith Testbox `tbx_01kyrgezbpxyytfh0k7g0jzbq6` proved formatting
  and the focused TypeScript tests; all 45 node-host tests and Rustdoc pass on
  Windows. Codex review found no actionable issue. The PR is draft and
  mergeable; expected fork-only App-token checks fail or skip.
- Draft stacked fork PR [giodl73-repo/openclaw#190](https://github.com/giodl73-repo/openclaw/pull/190)
  is based on PR #189 at `df18b57791f`. It snapshots the commands advertised
  by each activated Rust node connection and fails closed with
  `COMMAND_NOT_ADVERTISED` when a session-bound invocation falls outside that
  connection manifest. The reusable handler registry may remain a superset;
  reconnect can therefore advertise a fresh subset without mutating handlers.
  Loopback proof connects twice with different manifests, verifies reciprocal
  rejection, cancels active child work when the first connection retires, and
  admits the newly advertised command on the second. All 57 Linux Rust tests,
  strict Clippy, Rustdoc, formatting, and diff checks pass. Codex review on the
  byte-identical Linux mirror found no actionable correctness issue. The PR is
  draft, mergeable, and fork-only; real-behavior, dispatch, actionlint, and
  no-tabs checks pass, while only the expected fork App-token label and
  auto-response jobs fail. It adds no Gateway approval policy or protocol
  change.
- Draft stacked fork PR [giodl73-repo/openclaw#189](https://github.com/giodl73-repo/openclaw/pull/189)
  is based on PR #188 at `b01c419dfc2`. It expands the shared fixture into an
  explicit authority-handoff contract: canonical TypeScript Gateway policy
  decides whether work crosses transport; Rust evaluates only delivered work
  and may narrow it through local admission. Gateway-denied and undeclared
  commands never reach Rust admission or handlers. The first Testbox run found
  that TypeScript normalization preserves duplicates while approval comparison
  uses set semantics; the corrected focused test passed on Blacksmith Testbox
  `tbx_01kyrcjn18f32kht74g85tspse`, and formatter proof passed on
  `tbx_01kyrcr4s82kx4zy0yx6efgs1y`. All 56 Linux Rust workspace tests, strict
  Clippy, Rustdoc, formatting, and diff checks pass. `codex review --commit
  HEAD` found no introduced correctness issue. The PR is a tests/fixture-only
  fork evidence slice and adds no production policy surface.
- Draft stacked fork PR [giodl73-repo/openclaw#188](https://github.com/giodl73-repo/openclaw/pull/188)
  is based on PR #187 at `20b1c043e37`. It adds deterministic capability
  advertisement and one embedding-owned asynchronous admission callback that
  runs inside the existing invocation deadline before handler/progress/duplex
  work. Reject, panic, and timeout fail closed. Gateway pairing/plugin policy
  remains authoritative; Rust receives a decision and does not implement
  `system.run`, process policy, MCP/skills, plugins, product IPC, or approval
  UI. A shared JSON fixture is consumed by both the canonical TypeScript
  approval-surface normalizer and Rust runtime tests. All 56 Rust workspace
  tests pass on Linux, including loopback websocket proof; strict Clippy,
  Rustdoc, formatting, and diff gates pass. The TypeScript fixture test is
  locally blocked because two clean frozen installs failed on npm registry TLS
  before dependencies were available; the fork's main CI suite is skipped, so
  this remains an explicit review gap. GitHub's real-behavior, dispatch,
  actionlint, and workflow checks pass; only the expected fork-only label and
  auto-response jobs fail because the upstream GitHub App private key is not
  available. One existing gateway socket test resets on Windows but passes at
  the exact pushed head on Linux. The automated Codex review helper stalled
  without findings and was terminated; a direct full-diff audit found no
  actionable issue.
- Draft [openclaw-windows-node#1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
  is open and mergeable at `194928fd`. It adds `INodeRuntimeClient` and an injectable factory,
  keeps `WindowsNodeClient` as the production default, and moves `NodeService`
  plus A2UI consumers to the runtime contract. The migration document assigns
  Gateway transport, registration, invocation, cancellation, reconnect, and
  lifecycle to a future Rust sidecar adapter while C# retains WinUI, operator,
  MCP, approvals, and Windows-native handlers. `build.ps1`, 458 Connection
  tests, 3,277 Shared tests (31 existing environment-gated skips), and 1,958
  Tray tests passed; `codex review --uncommitted` found no actionable issue.
  RFC #54 now links this adopter proof at head `92361f5`.
- Draft [RFC 0028](https://github.com/openclaw/rfcs/pull/54) proposes the durable
  ownership boundary: OpenClaw/Peter's maintainer group owns the reusable
  headless Rust runtime and its protocol/security/conformance contract;
  Microsoft keeps Windows Companion, tray, settings, Windows UX, native tools,
  packaging, and deployment in Edge/Chromium-owned repositories; Scout Cloud
  manages the canonical node through Gateway surfaces. It records Scott's
  requested model pending Peter/maintainer acceptance. Its latest validation
  is the consolidated proof recorded above, superseding the earlier
  `6ba98f82` snapshot.
- Draft stacked fork PR [giodl73-repo/openclaw#187](https://github.com/giodl73-repo/openclaw/pull/187)
  is based on PR #186 at `b43f0c8ef09`. It adds bounded duplex input/progress,
  UTF-8-safe chunks, ordered sequencing, heartbeats, exact invocation routing,
  cancellation cleanup, and explicit rejection of duplex one-shot dispatch.
  The 54-test workspace, strict Clippy, Rustdoc, formatting, diff checks, and
  committed-head Codex review are clean.
- RFC #54 is mergeable/CLEAN at `24d1e0e` and its ClawSweeper review found no actionable
  document issue; it correctly leaves the ownership decision to maintainers.
  Its rationale and PR body now inventory the existing TypeScript, Swift,
  Kotlin, C#, and C node precedents: one language-neutral node contract with
  platform-specific advertised capability catalogs. The detailed source-pinned
  matrix is `official-node-implementation-inventory-2026-07-29.md`.
  Foundation PR #116050 now fixes ClawSweeper's concrete port issue at
  `13242763f3d`: default health uses OS-assigned loopback port zero and reports
  the resolved address, while explicit stable ports remain supported. Its PR
  body contains an inspectable binary transcript proving startup on `38057`,
  HTTP 200 health, pre-Gateway HTTP 503 readiness, SIGTERM shutdown, and the
  loopback invocation/result test. GitHub's Real behavior proof check passes.
  ClawSweeper re-reviewed the current head and cleared both the port and proof
  findings; its sole remaining P1 is maintainer acceptance of the public
  node-host contract. The macOS companion and complete Linux companion build,
  including Rust tests and bundles, passed in Actions run `30496616913`.
- Final convergence branch: `agent/rust-gateway-client` at `6e61c852825`,
  rebased onto current OpenClaw `main` and pushed to
  `https://github.com/giodl73-repo/openclaw/tree/agent/rust-gateway-client`.
  The intended single OpenClaw PR adds the top-level `crates/` workspace,
  `openclaw-gateway-client`, `openclaw-node-host` (library plus
  `openclaw-node` binary), and migrates the Linux Tauri app to the shared
  client. Tauri remains the desktop shell; the two crates are its reusable
  protocol/session substrate and the headless node profile/runtime built on
  that substrate.
- Final proof after rebase and autoreview fix: standalone gateway-client library
  check passes; the Rust workspace passes 43 tests plus doc tests; strict workspace Clippy
  passes; the current Linux Tauri tree passes all 98 tests; diff checks pass.
  A complete independent autoreview returned no actionable findings after
  fixes for retained event waits after idle disconnect, event draining,
  invocation cancellation, timeout semantics,
  heartbeat visibility, trusted private plaintext targets, clean-checkout
  binary placement, and TLS failure classification.
- Draft OpenClaw PR [#116050](https://github.com/openclaw/openclaw/pull/116050)
  is open for Peter's review. The user confirmed maintainer status, authorized
  the author-cap exception and force-with-lease update, and asked that the PR
  remain draft. GitHub reports the current head with maintainer edits enabled
  and no running or failed checks; mergeability is being recalculated after the
  body update. Its body now explicitly distinguishes the shared Rust
  foundation from full `src/node-host` parity and records four incremental
  follow-up layers: client conformance/lifecycle, runnable node parity,
  OpenClaw integrations, and official distribution. Each lower layer is
  independently reusable and the TypeScript host remains the behavioral
  reference.
- Draft stacked fork PR [giodl73-repo/openclaw#186](https://github.com/giodl73-repo/openclaw/pull/186)
  is based on `agent/rust-gateway-client` at `ead685cf9bee`. It adds
  `DeviceSigningRequest` so a platform-owned Ed25519 key signs the crate-owned
  canonical v3 payload, verifies the returned signature locally, exposes the
  issued device token through `NodeSession`, and adds `NodeLifecycle` as the
  single connection/reconnect/runtime driver for both native embedders and the
  bundled host. Its connection factory is called before every attempt; typed
  events and issued-token delivery stay separate. It intentionally excludes
  FFI, platform storage, `system.run`, and other execution-policy surfaces. The
  48-test workspace, strict Clippy, Rustdoc, formatting, diff checks, and final
  `codex review --base agent/rust-gateway-client` are clean.
  GitHub reports the draft as mergeable but `UNSTABLE`: the fork-only
  `auto-response` and `label` jobs cannot read the upstream GitHub App private
  key. Their logs fail before repository code runs; this is fork infrastructure,
  not a Rust test failure.
- Peter pointed to the OpenClaw Linux Tauri implementation as an existing Rust
  client and suggested refactoring. The source-audited convergence proposal is
  `tauri-convergence-proposal-2026-07-29.md`. The Tauri code is a production
  Rust operator/UI client (`openclaw-linux`, mode `ui`, role `operator`), not a
  Rust node host; Canvas is delegated to the separate TypeScript
  `openclaw node run` host. Its strongest reusable behaviors are TLS pinning,
  device-token persistence/mismatch clearing, server-directed reconnect pause,
  and half-open detection. Its fixed sequential Quick Chat request loop and
  Tauri `AppHandle` coupling are not a reusable session.
- Current architecture decision: converge on one OpenClaw-owned, in-tree,
  Tauri-free, role-safe Rust Gateway session. Take/adapt the production
  transport/security behaviors from Tauri and keep/port the experimental
  repository's node profile, concurrent correlation/event streams, activation,
  invocation lifecycle, bounded runtime, and headless host. Use closed operator
  and node profiles plus injected per-attempt connection, signer, and
  device-token-store adapters. Do not import either implementation wholesale.
- Proposed sequence: (1) extract pure Tauri security/reconnect helpers, (2)
  extract a concurrent generic session with Tauri unchanged as first consumer,
  (3) port the node profile/invocation client with a real-Gateway proof, (4)
  port the bounded runtime/headless host, (5) prove Scout as an external adopter,
  then (6) decide publishing and official support. Each slice must delete its
  superseded copy and merge independently.
- PR 1 evidence slice: `C:\src\openclaw-rust-gateway-core`, branch
  `agent/rust-gateway-core`, base
  `59640bad267da103666d69bc7aad4e0639f41300`, committed as
  `12659125fc716d16e624c259a06771129959b063` and pushed to
  `giodl73-repo/openclaw`. The five intended files are the Linux Cargo
  manifest/lock, `gateway_ws.rs`, and
  the new Tauri-free crate manifest/library. Tauri directly consumes shared TLS
  pinning, bounded connect-error parsing, token invalidation, server reconnect
  pause, and capped backoff. Direct `rustls` and `subtle` ownership moved from
  the desktop binary to the core crate.
- PR 1 proof: `cargo test -p openclaw-gateway-core` passes 3/3; focused Clippy
  passes with warnings denied; format and diff checks pass; Linux/Tauri
  `cargo check --all-targets` passes. Full app tests pass 69/70. The single
  failure, `gateway_ws::tests::connect_frame_matches_gateway_schema`, is
  source-proven on the untouched base: it expects pinned `caps == []` while
  untouched `connect_params` initializes caps with `agent-kind`. Keep that
  baseline correction separate from the extraction.
- Tooling caveat: the first cold full test exhausted the C: drive; only the
  generated worktree Cargo target was cleaned, after which low-debug check and
  tests ran. A timed-out `codex review --uncommitted` coincided with deletion of
  the original shared worktree metadata. The implementation directory was
  repaired as a standalone partial Git checkout at the exact base without
  replacing working files. Codex produced no verdict; Claude fallback failed
  with an invalid workspace API key. The required `scripts/committer` was then
  attempted in normal and `--fast` modes under WSL, but both stalled after
  staging. Git for Windows Bash successfully ran the same required wrapper in
  documented `--fast` mode after separate formatting/test proof. The resulting
  commit was pushed to the fork; no PR was opened.
- Current focus: the merged PR #1-#5 series now contains the RFC, the first
  reusable vertical slice, and the unpublished `openclaw-node` crate. It owns
  challenge-before-connect,
  node defaults, bounded request correlation/timeouts, retained and live event
  streams, close propagation, loopback/TLS URL policy, and reusable Ed25519
  `NodeIdentity` generation/import/export with final-boundary canonical v3
  signing. Applications still own secure identity and issued-token persistence.
  It also exposes a side-effect-free reconnect policy with bounded backoff,
  structured manual device-pairing pauses, terminal auth/protocol/configuration
  pauses, healthy-session retention, and one explicit trusted stored-token
  fallback. The old R2 planning brief was deleted; do not create another
  ceremony-only PR. It now also withholds declared node surfaces until explicit
  embedding activation and provides generic typed invocation receipt/result
  completion. Gateway capability approval remains operator-observed because
  node-role `hello-ok` does not disclose the effective surface and node-role
  sessions do not receive operator-scoped `node.pair.*` broadcasts. R5 now
  adds the reusable `CommandRuntime`: exact routing, receipt-relative
  deadlines, cooperative local cancellation, original/current JSON byte
  limits, panic containment, per-session duplicate tracking, zero queued
  handler work, bounded result delivery, and explicit fail-closed critical
  delivery saturation. Raw typed dispatch remains independently reusable.
- R7: `https://github.com/giodl73-repo/openclaw-rust-node/pull/3`, branch
  `agent/r7-headless-host`, merged into `main` as `94c1643a`. It adds
  the generic foreground `openclaw-node` host with
  non-secret JSON config, operator-injected auth/identity secrets, configurable
  non-`system.*` status command, bounded loopback health/readiness, redacted
  JSON diagnostics, in-memory adoption of issued device tokens, typed protocol
  close classification, bounded reconnect, and graceful Ctrl-C/SIGTERM
  shutdown. Its health task is cancellation-safe and supervised: transient
  accept failures retry with a bound, repeated failures terminate the host,
  and dropping the host releases the listener. Hardened credential files,
  services, packaging, and publication remain R8.
- R8 package-acceptance slice: merged
  `https://github.com/giodl73-repo/openclaw-rust-node/pull/4`, branch
  `agent/r8-package-acceptance`, reviewed head `c63c7794037199944c6b43fbf9720056a21d1868`.
  It builds native Linux x64, Windows x64, and macOS ARM64 release binaries,
  archives each with LICENSE and README, verifies a SHA-256 sidecar, extracts
  into a clean directory, and executes the packaged binary's Cargo-derived
  version and help paths. The retained workflow artifacts are short-lived
  evidence, not published or supported releases. Signing, attestations, SBOM,
  services, credential hardening, rollback, and release ownership remain
  separate R8 gates.
- R8 supply-chain evidence slice: merged
  `https://github.com/giodl73-repo/openclaw-rust-node/pull/5`, branch
  `agent/r8-supply-chain-evidence`, reviewed head `4772740`, squash-merged as
  `3079454`. It preflights the locked Cargo graph, scans it against the fresh
  RustSec database, generates a CycloneDX 1.5 executable SBOM with dependencies
  for all target platforms, proves generation leaves `Cargo.lock` unchanged,
  validates the Cargo-derived root identity, and retains the SBOM for seven
  days. It does not sign, attest, attach, or publish the SBOM and does not set
  license, source, or maintenance policy.
- R8 package-provenance slice: draft
  `https://github.com/giodl73-repo/openclaw-rust-node/pull/6`, branch
  `agent/r8-package-provenance`, reviewed head `9654b94`. It attests each exact
  accepted native archive with GitHub OIDC and SHA-pinned `actions/attest`,
  documents verification constrained to this repository, workflow, and
  GitHub-hosted runners, and skips only privileged attestation for external
  forks and Dependabot. It does not publish, code-sign, attach the SBOM,
  establish publisher identity, or assign release ownership.
- Node-mode comparison: `node-mode-analogue-audit.md` now classifies the
  TypeScript, shared Swift, macOS, Android, Watch, iOS share, official Windows,
  official ESP, Linux Rust operator, and Moltis Rust implementations. Use its
  R1-R4 briefs when drafting implementation PRs. Moltis is a Rust mechanics
  analogue only, not an OpenClaw wire-contract source.
- Scout adopter audit: Edge draft PR `16301549`, branch
  `users/lingnanzeng/lobster-scout-node` at `1db1974`, independently implements
  a Debug-only macOS Rust `system.run` cdylib for Lobster's v2 node contract.
  `scout-overlap-audit-2026-07-29.md` maps the substantial transport, reconnect,
  identity, invocation, runtime, FFI, and packaging overlap. Scout can become a
  first adopter after Lobster converges on the official v3 handshake and the
  generic crate adds external-signer and per-attempt connection-provider seams;
  do not add a Lobster-specific wire profile to the generic core.
  Mac onboarding additionally confirms a two-native-repo proof boundary:
  `chromium.src` owns the interactive Copilot.app build/sign/launch, XPC
  recovery, and Host arbitration, while `edge.undockedcopilot` owns the
  long-lived CopilotAppHost desktop companion and Rust dylib. Chromium should
  not depend on the Rust crate; it participates in a cross-repository Desktop
  acceptance lane with single Mach-service ownership. The deletion target is
  duplicate node-client mechanics inside CopilotAppHost, not the Host process
  or Chromium bridge.
- Upstream U1 slice: draft
  `https://github.com/openclaw/openclaw/pull/115390`, branch
  `feat/node-invoke-cancel-contract`, reviewed head
  `7c8dc5f5f221ed4cc7238ad38ae04fec95de1584`. It publishes the existing
  `{ invokeId, nodeId }` cancellation payload, registers generated protocol
  output, updates the Swift model, and binds the Gateway producer and node-host
  consumer to the shared type. Lifecycle fixtures and the durable node-only
  projection remain follow-ups under issue #115375.
- Active branch / PR: R0
  `https://github.com/giodl73-repo/openclaw-rust-node/pull/1` merged into `main`
  as `dbc2774e00e7811182d89dd36cdbdc3459657a28`. R1
  `https://github.com/giodl73-repo/openclaw-rust-node/pull/2` merged into `main`
  as `d341c35370d5ff941d14d028e41ab632c28b9e1c`. R7 PR #3 merged into `main`
  as `94c1643a7d0dc1223020d66e7adf1519d508548f`; the landed tree exactly matches
  the green, independently reviewed `743f482` head. R8 package-acceptance PR
  #4 merged into `main` as `7749536fd843128b2231d8d033af6af3fb9624f2`.
  Supply-chain evidence PR #5 squash-merged into `main` as
  `307945482d5543b7e3572bc6c0c288d4ff5b758c`. Package-provenance PR #6 is
  draft from `agent/r8-package-provenance` at `9654b94`; all five checks are
  green and its three final-head package attestations verify independently.
- Known dirty state: `C:\src\openclaw-rust-node` is clean on
  `agent/r8-package-provenance` at `9654b94`. `C:\src\claws-hapi` already
  contains unrelated dirty and untracked project notes; preserve them.
  `C:\src\openclaw-rust-gateway-core` is clean at `12659125fc7`, tracking
  `fork/agent/rust-gateway-core`. The active WSL OpenClaw worktree is clean on
  `agent/rust-gateway-client` at `02c96a1ec96`, tracking the pushed fork branch.
  The final full Codex branch review found one P1: a retained event receiver
  could wait forever after an idle transport disconnect because the session
  retained a broadcast sender. Commit `6e61c852825` races event receipt with
  connection closure and adds a real loopback-socket regression. All Rust
  workspace tests, strict Clippy, all 98 Tauri tests, and diff checks passed;
  the second full Codex review returned no actionable regressions. `origin`
  remains the official OpenClaw repository and was not modified. The
  user authorized one OpenClaw PR and the scoped force-with-lease update; draft
  PR #116050 is open and mergeable. The active WSL checkout is now clean on
  `agent/rust-runnable-node-parity` at `b43f0c8ef09`, tracking its pushed fork
  branch. Fork PRs #186 and #187 are the two dependent evidence slices. RFC
  worktree `C:\src\openclaw-rfcs-0028` is clean at `24d1e0e`.
- Real behavior proof: the Rust client connected to an isolated real OpenClaw
  `2026.7.1` installed Gateway, received a Gateway-issued device token,
  reconnected with the same identity and issued token, then classified a real
  rejected device token as a terminal auth pause. The earlier identity proof
  also passed against `2026.7.2` source commit `7c8dc5f5`. A new isolated
  OpenClaw `2026.7.1` proof explicitly allowlisted `example.status`, verified
  preapproval filtering, approved the distinct node capability request through
  the operator CLI, then completed a real typed Rust invocation/result. The
  final PR #2 head also proved runtime success, structured failure, timeout,
  saturation, and disconnect cleanup through the real CLI/Gateway path. Each
  owned Gateway process was stopped and its disposable state removed.
- R7 proof: 61 deterministic tests pass. Its scripted Gateway smoke covers
  configured command advertisement, status result, loopback readiness,
  in-memory issued-device-token reconnect, and graceful socket shutdown.
  Strict formatting, Clippy with warnings denied, docs, and diff checks pass.
  A brand-new isolated Cargo target built and executed the Windows release
  binary; the disposable target was removed. Full Linux-target check and
  Clippy also passed for the Unix SIGTERM path, after which the temporarily
  installed target was removed. A cancellation regression proves dropping the
  host releases its health listener. Final `codex review --base origin/main`
  on `743f482` returned clean with no actionable findings after two accepted
  health-lifecycle findings were fixed and all focused/full gates reran.
- R8 package proof: local Windows zip/checksum/extract/version/help smoke passed;
  `actionlint` 1.7.12, release build, format, 61 deterministic tests, Clippy
  with warnings denied, docs, and diff checks passed. Autoreview found and
  fixed one duplicated `0.0.0` assertion by deriving the expected version from
  Cargo metadata; its final rerun was clean. GitHub Actions run `30457803008`
  passed the exact package path on native Linux x64, Windows x64, and macOS
  ARM64 runners. CI and protocol-pin checks are also green at `c63c779`.
- R8 supply-chain proof: local RustSec 0.22.2 scanned 133 locked dependencies
  with no vulnerability failure; CycloneDX 0.5.9 generated a validated 1.5
  executable SBOM for `openclaw-node@0.0.0` with 128 components and left
  `Cargo.lock` unchanged. Autoreview found and fixed locked-graph consistency
  and target-platform wording, then returned clean. Hosted run `30461269201`
  passed in 19 seconds and retained the 18,803-byte `openclaw-node-sbom`
  artifact through 2026-08-05. CI, protocol pin, and all three package jobs are
  also green at `4772740`.
- R8 provenance proof: hosted Package acceptance run `30463412462` passed on
  Linux x64, Windows x64, and macOS ARM64 at PR head `9654b94` and test-merge
  source `ef960e0946dd4b5c850b5905f71738f0afa7d21f`. All three downloaded
  archives passed `gh attestation verify` with repository, signer-workflow,
  and GitHub-hosted-runner constraints. Their SHA-256 digests are Linux
  `1075fe696bdfd00764978a2f00b03b3798606fbc9e095f14b11937688dddd457`,
  Windows `9e763448035cad309a5898b02e358f85254331a4428e526b1c5daee9f7c554dc`,
  and macOS `52c1cd505f612abcaa5861016cfdfe7c80b7d6ea82559947464f358c28b02451`.
  An actual external-fork or Dependabot PR was not created solely to exercise
  the privileged-step skip.
- Blocking question: OpenClaw maintainers have not yet accepted long-term
  runtime, conformance, security, or release ownership. Draft RFC 0028 is now
  the primary decision surface; issue #115975 is earlier context.
  The registry also has no stable calendar release of
  `@openclaw/gateway-protocol`; R1 pins `2026.7.2-beta.5` and remains explicitly
  non-release-ready. These block publication and official adoption, not the
  merged experimental implementation.
- Maintainer question now precedes the broader adoption decision: whether to
  accept extraction of the existing Tauri transport into a Tauri-free shared
  Rust Gateway session, with the node host as a second profile/consumer. Do not
  edit issue #115975 or open a new issue/PR without explicit user authorization.

## Resume Checklist

- Run: `git -C C:\src\openclaw-rust-node status --short --branch`.
- Run: `gh pr view 1 --repo giodl73-repo/openclaw-rust-node --json
  url,state,isDraft,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup`.
- Run: `gh pr view 2 --repo giodl73-repo/openclaw-rust-node --json
  url,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup`.
- Run: `gh pr view 4 --repo giodl73-repo/openclaw-rust-node --json
  url,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews`.
- Run: `gh pr view 5 --repo giodl73-repo/openclaw-rust-node --json
  url,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews`.
- Run: `gh pr view 6 --repo giodl73-repo/openclaw-rust-node --json
  url,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews`.
- Verify: `git -C C:\src\openclaw-rust-node diff --check` and inspect the full
  RFC diff against `origin/main`.
- Run: `gh pr view 115390 --repo openclaw/openclaw --json
  url,state,isDraft,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup`.
- Run: `gh pr view 187 --repo giodl73-repo/openclaw --json
  url,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews`.
- Run: `gh pr view 54 --repo openclaw/rfcs --json
  url,state,isDraft,headRefOid,mergeable,reviewDecision,statusCheckRollup,comments,reviews`.
- Review: track cancellation schema review/CI on PR #115390 and confirm the
  default SSH verifier still executes `openclaw node identity --json`.
- Review: make sure device-pairing and node-capability request IDs, reconnect,
  filtering, approval, rejection, and reapproval are distinct acceptance cases.
- Review: keep the implementation generic and maintain no more than one
  short-lived dependent Rust PR stacked.
- Review: use `node-mode-analogue-audit.md` to assign each R1-R4 behavior to an
  authoritative contract or named implementation analogue.
- Decide: whether lifecycle fixtures and the node-contract projection should be
  separate OpenClaw PRs after the cancellation schema review.
- Decide: whether R1 may review against the beta pin now, and whether the full
  schema is vendored into R1 only after the first stable package is published.
- Update: record owner decisions, merged/released OpenClaw artifacts, and exact
  reviewed heads here before Rust cancellation work starts.

## Guardrails

- Keep Rust implementation and RFC edits in `C:\src\openclaw-rust-node`, not
  `claws-hapi`.
- Keep Lobster implementation in a dedicated Lobster worktree after the generic
  client contract is accepted.
- Do not invent missing node wire shapes in Rust. Land and release them in
  `openclaw/openclaw` first or remove the behavior from V1.
- Do not conflate signed device pairing with node command-surface approval.
- Do not weaken SSH identity verification to make standalone enrollment easier.
- Do not register custom handlers under OpenClaw-owned namespaces.
- Do not expose `system.run` without an OpenClaw-owned execution-policy corpus
  and named security/release owners.
- Do not label crates or binaries official before OpenClaw accepts ownership.
- Preserve unrelated dirty files in `claws-hapi` and other worktrees.

## Open Threads

- Codex review closeout on 2026-07-30: completed passes found and fixed six
  foundation issues (request/cancellation ordering, mapped-IPv4 trust, TLS
  typing/reconnect policy, terminal reconnect metadata, and queued final-event
  delivery) plus one follow-up P1 (rejected adopted-device-token fallback).
  Current heads are #116050 `7600501dd50` and #116450 `c533982d751`; 47 and 62
  Rust workspace tests respectively pass with strict Clippy/rustdoc/formatting.
  Final clean-verdict retries timed out in the local Codex review service and
  are not represented as clean. Windows #1068 and RFC #54 returned clean Codex
  reviews and remain unchanged.

- Keep draft PR #116050 draft until Peter has reviewed the proposed two-crate
  ownership boundary. Track its Linux companion and policy checks; do not merge
  it on the user's behalf.
- Prepare the PR 1 body and decide whether to open a draft PR from
  `giodl73-repo:agent/rust-gateway-core` to `openclaw/openclaw:main`. Recheck
  exact remote head `12659125fc7` first; do not open it until explicitly asked.
- Decide whether to fix the contradictory pinned-capabilities assertion in a
  separate tiny baseline PR; do not mix it into the shared-core extraction.

- Present `tauri-convergence-proposal-2026-07-29.md` to Peter. Ask first for
  agreement on the common primitive and a small Tauri-only extraction; do not
  pitch wholesale import of the experimental repository.
- Confirm the preferred in-tree crate location and Rust code owner. Keep the
  location separate from the architectural/API decision.
- Before implementation, capture Linux Quick Chat behavior tests plus a
  negative profile-mixing test and concurrent request/event test. The second
  profile is accepted only after an isolated real-Gateway node invocation.

- Track OpenClaw issue #115975 for the official Rust implementation ownership,
  repository, package identity, support, security, and release decision. Do not
  import or publish the implementation before that decision.
- Track OpenClaw PR #115390 for the `node.invoke.cancel` payload contract and
  issue #115375 for lifecycle fixtures and a durable node-contract projection.
- Review Rust PR #2's generic client boundary, beta pin, and node-contract
  projection. Do not recreate the deleted R2 planning brief.
- Decide whether the full schema pin plus a node-contract projection is the
  accepted cross-language publication model.
- Decide whether V1 installs a compatible identity-inspection shim or documents
  manual enrollment only.
- Select exact current and predecessor OpenClaw release artifacts for the
  compatibility matrix; keep OpenClaw `main` as a non-gating drift canary.
- PRs #1-#5 are merged and package-provenance PR #6 is draft, green, and
  independently verified. Review and merge #6 independently before choosing
  another R8 security or release slice.
  Scout now has a concrete Rust node implementation in Edge PR `16301549`, but
  it targets Lobster v2 and Debug-only `system.run`; use it as the first adopter
  and deletion target only after contract convergence and generic embedder seams.
  Start R6 wire cancellation/streaming only after its OpenClaw contracts land
  and ship; do not expand the Rust API from unpublished lifecycle guesses.
- Treat long-lived CopilotAppHost as the Scout node-lifecycle owner. Delete only
  duplicate node-client/runtime mechanics after adoption; retain the Host
  process, Swift platform adapter, and Chromium XPC bridge.
- Track Edge PR `16301549`; the cheapest convergence proof is the current Rust
  client against Lobster's endpoint to enumerate v3/client/upgrade differences.
- Name the OpenClaw protocol, security, and release owners before official
  publication.
- Present R0 and PR #115390 as related ownership/contract context while keeping
  their merge paths independent; implementation still merges as proved rather
  than as a deep stack.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`. Keep this file
as the concise canonical resume snapshot.
