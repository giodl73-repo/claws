# Hosted Integration Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked RFC and `../layering-contracts/hosted-integration.md`.
4. Read the OpenClawTransport, `node.invoke`, hosted identity, and ProxyPipe inventories.
5. Check the RFC, Lobster audit, and selected OpenClaw worktree state.

## Baseline

- Area: OpenClaw Hosted Integration And Capability Bindings
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`
- RFC worktree: `C:\src\openclaw-rfcs-duplex-transport`
- Lobster audit worktree: `C:\src\lobster-layering-audit`
- Current RFC branch: `user/giodl/rfc-duplex-transport`
- Main tracking file: `README.md`
- Skill to use: `project-session`; use OpenClaw debugging/testing and PR-loop skills when implementation starts

## Current Session

- Last updated: 2026-07-29
- Last agent: Codex
- Project state: **PAUSED by Gio on 2026-07-29**. Preserve all branches, fork
  PRs, upstream issues/PRs, landing packets, and adopter evidence. Resume with
  live GitHub/GHE and current-`main` checks; do not assume the recorded merge
  state or bases remain current after the pause.
- Resume decision: obtain the O4 plugin-manifest ownership decision first:
  whether `hostIntegrationBundle` is accepted as a distinct durable manifest
  contract or replaced by an approved `contracts`-based equivalent. If the
  boundary is accepted, replay the prepared bounded reverse-carrier package
  from a fresh then-current `main` branch and file it only after Gio explicitly
  authorizes the upstream issue and issue-linked draft PR.
- Archive branch verification on 2026-07-29:
  - O1 remote and clean worktree: `48fab2d723d0`;
  - O4 authoritative remote/PR head: `14bd05f56914`;
  - G1 remote and clean worktree: `c6ce310f1ab4`;
  - G2 remote and clean worktree: `519e1c57819d`;
  - Lobster deployment selection/G3/G4 remote and clean worktrees:
    `86edeaafc859`, `ee6970551294`, `8b4402a73766`, `bad65d354d2e`, and
    `728678ac3c81`.
    The WSL O4 worktree `/root/src/openclaw-hosted-package-2b-host-bundles`
    remains on superseded pre-rebase commit `dbc74b3c1d2e` and diverges from the
    authoritative pushed branch. Never push that checkout as-is; recreate or
    refresh it from remote head `14bd05f56914` when resuming.
- Promotion guardrail: O1 and O4 received explicit filing authorization and
  are now upstream issue-linked drafts. Continue authoring and validating the
  remaining package series as fork-only drafts; do not file another upstream
  OpenClaw issue or PR until Gio explicitly authorizes that package.
- Current O1 landing packet: upstream [issue #114772](https://github.com/openclaw/openclaw/issues/114772)
  and [draft PR #114773](https://github.com/openclaw/openclaw/pull/114773), on
  `user/giodl/o1-one-hop-dispatch-upstream` at `48fab2d723d0`, rebased onto
  upstream `main` `dd248759ef56`. It narrows O1 to the behavior-preserving local
  one-hop dispatcher after the live maintainer review rejected a durable
  `network-guard/v1` profile without a second connection owner. The portable
  guard profile is now deferred to O6. Proof passed 101 focused tests,
  type-aware Oxlint, Oxfmt, diff hygiene, a real loopback redirect harness, and
  clean `codex review --base upstream/main`. The refreshed branch is pushed to
  the fork with maintainer edits enabled. ClawSweeper reviewed the exact head,
  found no actionable issue, retained `proof: sufficient`, and marked it
  platinum / ready for maintainer review. It is mergeable and intentionally
  not rebased a second time merely to chase a moving `main`.
  Broader draft PR #113513 was linked and closed as superseded.
- Current O2 evidence packet: fork branch
  `user/giodl/o2-exact-origin-credential-slots-current-main` at
  `d15ab96cbf4`, stacked on current O1. It removes every dependency on the
  deferred network-guard profile and preserves exact-origin, initial-hop-only,
  redacted credential resolution. Proof passed 116 focused tests, production
  TypeScript, type-aware Oxlint, Oxfmt, diff hygiene, a real loopback redirect
  harness, and clean Codex review. The core-test type graph remained queued
  behind another worktree's shared heavy-check lock during the bounded window.
  The branch is pushed to the fork and no PR was opened. O2 is now `EXTRACT`,
  not independently landable: existing issue #104849 carries a
  `no-new-fix-pr` product/security gate and requires an approved provider/plugin
  owner. Local drafts are `o2-exact-origin-credential-slots-decision-note.md`
  and `o2-exact-origin-credential-slots-pr-draft.md`.
- Current O4 landing packet: upstream [issue #114782](https://github.com/openclaw/openclaw/issues/114782)
  and [draft PR #114783](https://github.com/openclaw/openclaw/pull/114783), on
  `user/giodl/o4-manifest-first-host-bundles-upstream` at `dbc74b3c1d2e`,
  rebased onto upstream `main` `dd248759ef56`. It adds only the closed, inert
  `hostIntegrationBundle` manifest inventory and existing-registry projection;
  no runtime registration, activation, readiness, Status, Doctor, credentials,
  dispatch, or hosted execution. Proof passed 143 focused plugin tests, core
  typecheck, type-aware lint, formatting, full build, docs checks, clean Codex
  review, and the real Lobster five-contribution discovery harness. The
  refreshed exact-head proof repeated all 143 focused tests and the live
  Lobster manifest/registry harness. ClawSweeper found no actionable defect,
  retained `proof: sufficient`, and marked it gold / ready for maintainer
  review with the intentional manifest compatibility risk called out. The new
  plugin-manifest surface explicitly requires plugin-owner confirmation.
- Current primary slice: [OpenClaw fork PR 184](https://github.com/giodl73-repo/openclaw/pull/184)
  at `519e1c57819`, the bounded reverse-carrier owner consolidation stacked on
  G1 host-bundle generation PR 183. It composes O11-O14, prepares one
  content-addressed owner binding from exact recorded generations, exposes the
  effective bundle generation through the public Plugin SDK, and fences URL
  schemes, proof expiry, session currentness, clock ownership, and incremental
  protocol state before terminal operation release. The combined review's
  premature-terminal finding is fixed. Exact-head proof passes 65 carrier and
  11 host-bundle tests, the full build and Plugin SDK API/export gates, core and
  all 175 test declaration projects, focused lint/format/diff hygiene, and a
  clean final Codex review. Blacksmith Testbox could not allocate because the
  CLI was authenticated to a different organization; no lease or Actions run
  was created. Fork real-behavior-proof and workflow-sanity checks pass; only
  expected fork-permission auto-response/label jobs fail, while the upstream
  CI matrix is skipped. It is draft and mergeable; no upstream issue or PR was
  filed.
- Current Lobster adopter: [fork draft PR 59](https://microsoft.ghe.com/giodl/lobster/pull/59)
  at `ee697055129`, stacked directly on deployment-selection PR 58. It registers
  one exact plugin-authenticated WebSocket route only from a G2-prepared binding
  whose owner generation and `lobster/host` bundle generation match. The normal
  startup entry and disabled selection remain inert and do not read authority.
  Its exact external-consumer replay against OpenClaw `519e1c57819` passes all
  23 plugin tests with a real loopback HTTP/WebSocket upgrade.
- Runtime-peer gate: G1-G3 are authored and proven. The local upstream landing
  packet and problem-led issue body are now ready but remain unfiled. G4's
  lifecycle contract is defined in
  `g4-lobster-runtime-peer-lifecycle-2026-07-29.md`. Fork draft
  [Lobster PR 60](https://microsoft.ghe.com/giodl/lobster/pull/60) at
  `8b4402a737` proves stable-window reset, full jitter, and exact shutdown-watch
  semantics. Fork draft [Lobster PR 61](https://microsoft.ghe.com/giodl/lobster/pull/61)
  at `bad65d354d`, stacked on PR 60, atomically binds one selected authority,
  peer fingerprint, identity, and exact plugin route; transport failures retry,
  while configuration, admission, and protocol failures enter `Blocked` without
  a retry storm. Fork draft [Lobster PR 62](https://microsoft.ghe.com/giodl/lobster/pull/62)
  at `728678ac3c`, stacked on PR 61, adds the deployment-owned attempt budget
  and circuit cooldown, terminal cancellation plus forced-abort drain bound,
  and one stop-before-start generation owner. All 41 tests, canonical format,
  strict Clippy, and review pass. All G4 slices remain inactive. Next freeze the
  fork proof and prepare the single reverse-carrier upstream landing packet;
  real Gateway proof, rollout, production startup wiring, and default activation
  remain separate and require explicit authorization. The canonical filing
  packet is `bounded-reverse-carrier-owner-landing-packet-2026-07-29.md`, with
  independent issue and PR bodies; the only product gate is explicit
  @steipete confirmation of the O4 manifest/public Plugin SDK ownership seam.
- Current focus: validate independently useful OpenClaw factorizations without
  requiring the RFC. O1 now has the canonical upstream issue and draft PR
  above; upstream draft PR 113513 is closed superseded evidence. Exact-origin
  credential slots are fork draft PR 158. Manifest-first host bundles now have
  the canonical upstream issue and draft PR above; fork PR 159 and Lobster
  external-plugin proof PR 32 remain source evidence.
  Provider request traffic policy is now fork draft PR 160, stacked on Package
  2A, with its separate Lobster production-path consumer proof in draft PR 33.
  Provider dispatch bindings are fork draft PR 162, stacked on Package 3A,
  with the paired Lobster production-path proof in draft PR 34. The first
  composed external-plugin adopter is now Lobster fork draft PR 35, stacked
  directly on inert plugin PR 29 and proven against a temporary fork-only
  OpenClaw composition of PRs 159, 160, and 162. Its credential-slot
  composition follow-up is Lobster fork draft PR 36, stacked on PR 35. The
  lifecycle-safe credential resolver registrar is now fork draft PR 163,
  stacked directly on credential slots PR 158. OpenClaw fork draft PR 164 now
  composes dispatcher-declared slots with same-plugin lifecycle resolvers and
  materializes credentials only on the selected initial guarded hop. Lobster
  PR 36 is its packaged adopter proof. OpenClaw fork draft PR 165 now adds the
  independent caller-driven runtime readiness projection, with Lobster fork
  draft PR 37 as its packaged five-service adopter. OpenClaw fork draft PR 166
  now defines the independent reverse-provider dispatch contract as a parallel
  child of PR 164; it deliberately does not depend on readiness PR 165. Lobster
  fork draft PR 40 consumes its exact fixture corpus as a parallel conformance
  adopter without registering or activating a carrier. OpenClaw fork draft PR
  168 now adds the read-only status inventory as a child of readiness PR 165,
  reusing its registry-scoped runtime inventory instead of reviving the older
  duplicate schema or global mutable owner evidence.
- Consolidated fork review stack: [OpenClaw PR 71](https://github.com/giodl73-repo/openclaw/pull/71)
  guarded dispatch core; [PR 72](https://github.com/giodl73-repo/openclaw/pull/72)
  generic host composition contracts; [PR 73](https://github.com/giodl73-repo/openclaw/pull/73)
  generic hosted provider dispatch; [PR 74](https://github.com/giodl73-repo/openclaw/pull/74)
  additional provider owners; and [PR 75](https://github.com/giodl73-repo/openclaw/pull/75)
  Microsoft interactions. All are fork-only drafts. Packages 4 and 5 are
  corrected parallel children of package 3 and are ready for one-by-one review.
- Legacy upstream package 1 evidence: [OpenClaw PR 113513](https://github.com/openclaw/openclaw/pull/113513),
  draft, branch `user/giodl/guarded-dispatch-core-upstream`, head
  `c85d52bfff5`. Its base is now stale and its durable `network-guard/v1`
  contract remains blocked on an owner/second-consumer decision. Do not update
  or promote it; use the current O1 fork branch above as the landing packet.
- Package 2A credential slots: [fork PR 158](https://github.com/giodl73-repo/openclaw/pull/158),
  draft, branch `user/giodl/hosted-integration-credential-slots`, head
  `7dfbc71bdeb`, stacked on Package 1 head `c85d52bfff5`. It is a four-file
  internal evidence slice with no config, Plugin SDK, bundle, status, doctor,
  browser, or generic model-tool surface.
- Package 2A credential resolver registration: [fork PR 163](https://github.com/giodl73-repo/openclaw/pull/163),
  draft, branch `user/giodl/hosted-integration-credential-resolver-registration`,
  head `83230d1cc37`, stacked directly on PR 158. It adds
  `api.registerCredentialSlotResolver(...)`, immutable validated registry
  metadata, cross-plugin resolver-ID ownership, owner replacement, and
  transaction rollback without invoking credentials during registration. It
  adds no config/CAPI carrier, dispatcher wiring, readiness, Status, or Doctor
  surface. Closeout passed 27 focused tests, all four core/extension type
  graphs, SDK API checks, targeted type-aware lint, diff hygiene, and clean
  `codex review --uncommitted`.
- Package 2B manifest-first host bundles: canonical upstream
  [issue #114782](https://github.com/openclaw/openclaw/issues/114782) and
  [draft PR #114783](https://github.com/openclaw/openclaw/pull/114783), with
  [fork PR 159](https://github.com/giodl73-repo/openclaw/pull/159) retained as
  source evidence. The upstream branch is
  `user/giodl/o4-manifest-first-host-bundles-upstream` at `95c4d3fdcaff`. It
  validates a closed, immutable `host-integration-bundle/v1` declaration during
  plugin discovery, rejects conflicting bundle ownership without choosing a
  winner, and carries enabled declarations in the current plugin registry
  snapshot with loader-owned provenance. It adds no runtime registration API,
  singleton, activation, readiness, Status, Doctor, credentials, or dispatch.
  First live review loop completed on 2026-07-25: every applicable fork CI job
  is green, including Linux companion and real-behavior proof; the only red
  jobs are fork-only `label`/`auto-response` workflows missing the upstream
  GitHub App private key. No comments, reviews, or ClawSweeper findings are
  attached to the current head.
- Package 3A provider request traffic policy: [fork PR 160](https://github.com/giodl73-repo/openclaw/pull/160),
  draft, branch `user/giodl/hosted-integration-provider-traffic-policy`, head
  `13f6012e2ca`, stacked on Package 2A. It adds one immutable, provenance-bearing
  `provider-request-traffic-policy/v1` generation, Plugin API registration with
  transaction-safe replacement, and enforcement in the guarded streaming LLM
  fetch path before dispatch and on every redirect. It has no host-bundle,
  credential, hosted-execution, readiness, Status, or Doctor dependency. Local
  closeout passed 337 focused tests, core typecheck, type-aware lint, SDK API/
  export/surface gates, diff hygiene, and a clean final Codex review. Fork CI's
  real-behavior proof, Workflow Sanity, and applicable detection jobs are green;
  only the expected fork-only `label` and `auto-response` jobs are red.
- Package 3B provider dispatch bindings: [fork PR 162](https://github.com/giodl73-repo/openclaw/pull/162),
  draft, branch `user/giodl/hosted-integration-provider-dispatch-bindings`, head
  `0e62ffe1711`, stacked on Package 3A. It adds lifecycle-safe Plugin API
  registration for `provider-request-dispatcher/v1`, exact traffic-policy
  generation fencing, and selected one-hop injection into the production
  guarded model fetch. OpenClaw retains redirect and protected-header policy;
  the selected binding receives a target-specific network guard and owns DNS/
  connection enforcement. Unknown, duplicate, and stale bindings fail closed,
  while unbound requests keep the existing local route. It adds no carrier,
  bundle, CAPI, readiness, Status, or Doctor surface. Closeout passed 137
  focused tests, core/core-test type checks, SDK surface gates, type-aware lint,
  formatting, diff hygiene, and clean Codex review.
- Credential materialization bridge: [fork PR 164](https://github.com/giodl73-repo/openclaw/pull/164),
  draft, branch `user/giodl/hosted-integration-credential-materialization`, head
  `938218ae3b6`, stacked on the fork-only composition proof branch. A selected
  dispatcher declares immutable credential slots; OpenClaw resolves only
  same-plugin lifecycle-owned resolvers at dispatch time, applies references
  only to the initial guarded hop, and strips them before host dispatch. It
  preserves protected-header conflicts, exact-origin checks, redirects, and
  transaction rollback. Closeout passed 132 focused tests, all four type
  graphs, SDK API baseline, targeted type-aware lint, formatting, diff hygiene,
  and final clean Codex review.
- Runtime readiness projection: [fork PR 165](https://github.com/giodl73-repo/openclaw/pull/165),
  draft, branch `user/giodl/hosted-integration-runtime-readiness`, head
  `b86df32297c`, stacked on PR 164. It adds lifecycle-owned plugin criteria and
  an immutable `host-integration-runtime-inventory/v1` projection with bounded
  timeout/retry/cache behavior, sanitized `True`/`False`/`Unknown` results,
  deterministic plugin namespaces, and no implicit Status, Doctor, health, or
  startup side effect. Closeout passed 22 focused tests, core/core-test type
  graphs, SDK baseline, type-aware lint, formatting, diff hygiene, and final
  clean Codex review. Real behavior proof is green; only expected fork-only
  `label` and `auto-response` automation failures are present.
- Canonical profile runtime inventory: [fork PR 175](https://github.com/giodl73-repo/openclaw/pull/175),
  draft, branch `user/giodl/hosted-integration-profile-runtime-inventory`, head
  `6e51687283c`, stacked on composition base `f128c584b9a`. The base is exact
  Hosting Profiles head `e9c1988c5e59` plus standalone host bundles. This is
  the clean replacement path for PR 165: it reuses canonical readiness
  providers and caller selection, adds only same-plugin manifest references
  and the immutable bundle inventory, and adds no duplicate registry, config,
  startup gate, Status, Doctor, or activation behavior. Closeout passed 33
  focused tests, direct Oxlint, the core TypeScript graph, the full build, diff
  hygiene, and a clean final Codex review. The draft is mergeable and its
  lightweight fork checks are initializing.
- Lobster canonical runtime inventory adopter: [fork PR 49](https://microsoft.ghe.com/giodl/lobster/pull/49),
  draft, branch `user/giodl/lobster-profile-runtime-inventory`, head
  `c4bf85b7ff`, stacked directly on host-bundle proof PR 32. It publishes five
  honest inactive `Unknown` criteria, proves canonical inventory projection,
  explicit profile-required selection, registration rollback, and a
  self-contained deployed plugin bundle against exact OpenClaw PR 175 head
  `6e51687283c`. Six plugin tests, the focused Rust contract test, formatting,
  diff hygiene, and exact-head runtime proof pass. Codex review's valid bundle
  finding was fixed; its later manifest-field claim was rejected because the
  implementation preserves entries with object spread and the asserted test
  passes. The draft is clean and mergeable but has no attached required Lobster
  checks; ADO/GitOps were not manually queued.
- Read-only status inventory: [fork PR 168](https://github.com/giodl73-repo/openclaw/pull/168),
  draft, branch `user/giodl/hosted-integration-status-inventory`, head
  `6577d460703`, stacked on PR 165 and parallel to PR 166. It exposes the
  existing `host-integration-runtime-inventory/v1` through the operator-read
  `hostIntegration.status` RPC and adds it to `status --json` only for a
  reachable Gateway with non-empty bundles. It loads or activates no plugin,
  accepts no probe parameters, and adds no Doctor, health, startup, or carrier
  surface. Closeout passed 51 focused tests, both TypeScript graphs, focused
  lint/formatting, diff hygiene, a real registry-to-payload source harness, and
  clean `codex review --uncommitted`. Remote build proof is blocked by
  Blacksmith organization auth and missing brokered AWS login. Fork real-
  behavior proof and Workflow Sanity are green; only the expected fork-only
  `label` and `auto-response` jobs fail.
- Doctor readiness projection: [fork PR 170](https://github.com/giodl73-repo/openclaw/pull/170),
  draft, branch `user/giodl/hosted-integration-doctor-inventory`, head
  `b728840dcea`, stacked on PR 168. It converts the existing running-Gateway
  inventory into structured Doctor findings: `False` is an error, `Unknown` is
  a warning, framework reasons remain actionable, and owner-defined reasons are
  collapsed to closed generic codes. It performs one bounded read-only RPC,
  skips disallowed exec-backed Gateway credentials, emits no success finding,
  and adds no plugin load, activation, repair, provider acquisition, startup
  gate, or new schema. Its live CLI proof exposed and corrected the status
  helper's generic backend client mode; the bounded query now uses the same
  CLI-scoped client as the operator command. Closeout passed the original 105
  focused tests plus 25 transport-focused tests, focused lint and formatting,
  the core TypeScript graph, diff hygiene, and clean Codex review. Real behavior proof, Workflow
  Sanity, and all other applicable fork checks are green; only the expected
  fork-only `label` and `auto-response` jobs fail because the fork has no
  upstream GitHub App private key.
- Lobster live Doctor adopter: [fork PR 48](https://microsoft.ghe.com/giodl/lobster/pull/48),
  draft, branch `user/giodl/lobster-host-doctor-inventory`, head
  `55a9c03302`, stacked on live status proof PR 44. It reuses the packaged
  plugin and live Gateway harness, resolves OpenClaw's registered health
  contribution, and proves three real owner-reported `Unknown` states become
  redacted warnings while the two ready states stay silent. Two consecutive
  cold-start runs and the exact-head run passed after adding an explicit child
  Gateway readiness handshake. The mergeable draft has no attached checks;
  required Lobster GitOps/Azure contexts remain a promotion-time gate and were
  not manually queued.
- Reverse-provider dispatch contract: [fork PR 179](https://github.com/giodl73-repo/openclaw/pull/179),
  draft, branch `user/giodl/hosted-integration-standalone-reverse-carrier-contract`,
  head `fa6f09737a8`, stacked directly on current O1 `48fab2d723d0`. It defines a
  bounded `reverse-provider-dispatch/v1` frame contract, strict validator,
  deterministic trace evaluator, and language-neutral fixtures for credit,
  half-close, cancellation, certainty, and binding/incarnation/generation
  fencing. Credential references and network-guard policy never cross the
  boundary; `routeProfile` is only the bounded identity of a route owned and
  prepared by the connection owner. Closeout passed 27 focused tests,
  type-aware lint, formatting, diff hygiene, and final clean Codex review. The
  exact 16-case fixture SHA-256 is `237f98958af9e732860d87ac0e560ce5adfccb16b0d53a66fea27d75bc24f864`.
  The fork real-behavior check passed; its red auto-response job is only the
  expected missing upstream GitHub App private key. No endpoint, live
  connection, readiness, Status, Doctor, retry, or reconnect replay is included.
- Lobster reverse-carrier conformance adopter: [fork PR 53](https://microsoft.ghe.com/giodl/lobster/pull/53),
  draft, branch `user/giodl/lobster-standalone-reverse-carrier-conformance`, head
  `6725e0b2b1`, stacked directly on inert plugin PR 29. It pins OpenClaw
  `fa6f09737a8`'s exact 16-case fixture bytes by SHA-256 and adds production
  coverage for stale bindings, GET/HEAD bodies, zero chunks, and cumulative
  response credit. It rejects carrier-supplied `networkGuard` fields and keeps
  Lobster-owned network guard profiles in `DispatcherConfig.route_guards`, keyed
  by the approved `routeProfile`. It
  changes no socket, registration, plugin manifest, deployment, or activation
  authority. Eighteen focused tests, deny-warnings Clippy, diff
  hygiene, and Rustfmt pass. Codex review proposed an in-flight-credit race; it
  was rejected because the single operation actor cannot poll inbound credit
  while its outbound send is awaited and commits `response_bytes` before its
  next inbound poll. Two broader runtime-suite attempts both reached 4,000+
  tests and failed only the unrelated `graceful_shutdown_test` target. The
  draft is clean and mergeable; ADO was not manually queued.
- Active branch / PR: [fork Doctor readiness PR 170](https://github.com/giodl73-repo/openclaw/pull/170), branch `user/giodl/hosted-integration-doctor-inventory`, head `b728840dcea`; [Lobster live Doctor adopter PR 48](https://microsoft.ghe.com/giodl/lobster/pull/48), branch `user/giodl/lobster-host-doctor-inventory`, head `55a9c03302`; [Lobster reverse-carrier conformance PR 40](https://microsoft.ghe.com/giodl/lobster/pull/40), branch `user/giodl/lobster-reverse-carrier-conformance`, head `b1b662bacf`; [fork reverse carrier contract PR 166](https://github.com/giodl73-repo/openclaw/pull/166), branch `user/giodl/hosted-integration-reverse-carrier-contract`, head `566cbe31d0e`; [fork runtime readiness PR 165](https://github.com/giodl73-repo/openclaw/pull/165), branch `user/giodl/hosted-integration-runtime-readiness`, head `b86df32297c`; [Lobster runtime readiness adopter PR 37](https://microsoft.ghe.com/giodl/lobster/pull/37), branch `user/giodl/lobster-host-runtime-readiness`, head `343cff9a78`; [fork credential materialization PR 164](https://github.com/giodl73-repo/openclaw/pull/164), branch `user/giodl/hosted-integration-credential-materialization`, head `938218ae3b6`; [Lobster packaged adopter PR 36](https://microsoft.ghe.com/giodl/lobster/pull/36), branch `user/giodl/lobster-host-credential-plugin`, head `63ec23b7ac`; [fork credential resolver registrar PR 163](https://github.com/giodl73-repo/openclaw/pull/163), branch `user/giodl/hosted-integration-credential-resolver-registration`, head `83230d1cc37`; [fork package 3B PR 162](https://github.com/giodl73-repo/openclaw/pull/162), branch `user/giodl/hosted-integration-provider-dispatch-bindings`, head `0e62ffe1711`; [fork package 3A PR 160](https://github.com/giodl73-repo/openclaw/pull/160), branch `user/giodl/hosted-integration-provider-traffic-policy`, head `13f6012e2ca`; [upstream package 1 PR 113513](https://github.com/openclaw/openclaw/pull/113513), branch `user/giodl/guarded-dispatch-core-upstream`, head `c85d52bfff5`; [fork package 2A PR 158](https://github.com/giodl73-repo/openclaw/pull/158), branch `user/giodl/hosted-integration-credential-slots`, head `7dfbc71bdeb`; [fork package 2 PR 72](https://github.com/giodl73-repo/openclaw/pull/72), branch `user/giodl/hosted-integration-capi-owner-operations`, head `10b5d0f23c2`; [fork package 3 PR 73](https://github.com/giodl73-repo/openclaw/pull/73), branch `user/giodl/hosted-integration-hosted-capi-execution`, head `1ac7184d60e`; [fork package 4 PR 74](https://github.com/giodl73-repo/openclaw/pull/74), branch `user/giodl/hosted-integration-additional-provider-owners`, head `633e087a455`; [fork package 5 PR 75](https://github.com/giodl73-repo/openclaw/pull/75), branch `user/giodl/hosted-integration-microsoft-interactions`, head `bfc0e8fe5e3`; [fork RFC PR 2](https://github.com/giodl73-repo/rfcs/pull/2), branch `user/giodl/rfc-duplex-transport`, published head `ebf8ea8af55`; [readiness composition PR 156](https://github.com/giodl73-repo/openclaw/pull/156), head `9c6ceb9016a`.
- Package 1 Lobster proof: [Lobster PR 30](https://microsoft.ghe.com/giodl/lobster/pull/30),
  branch `user/giodl/lobster-validate-guarded-dispatch`, head `dc48f43dad2`,
  stacked on inert host-contribution plugin PR 29.
- Package 2A Lobster proof: [Lobster PR 31](https://microsoft.ghe.com/giodl/lobster/pull/31),
  branch `user/giodl/lobster-validate-credential-slots`, head `b738e6974e`,
  stacked on PR 30. The one-file validation harness imports production
  OpenClaw source and uses real loopback origins; it adds no Lobster runtime
  authority.
- Package 2B Lobster proof: [Lobster PR 32](https://microsoft.ghe.com/giodl/lobster/pull/32),
  branch `user/giodl/lobster-validate-host-bundles`, head `54d133652aa`,
  stacked directly on inert external-plugin PR 29. It projects the canonical
  five-item deployment inventory into `openclaw.plugin.json` and exercises
  production OpenClaw manifest discovery plus registry snapshot construction
  without importing Lobster plugin runtime. The fork-only draft is clean and
  mergeable but has no attached CI contexts; required Lobster ADO/GitOps checks
  remain a promotion-time requirement, not current proof.
- Package 3A Lobster proof: [Lobster PR 33](https://microsoft.ghe.com/giodl/lobster/pull/33),
  branch `user/giodl/lobster-validate-provider-traffic-policy`, head
  `1bf39700e6`, stacked on credential proof PR 31. Its one-file harness
  registers a Lobster-named generation through the production OpenClaw Plugin
  API and drives `buildGuardedModelFetch` over real loopback services. The
  committed exact-head run proves direct-route selection despite hostile
  ambient proxy variables, timeout narrowing, explicit pre-send denial,
  redirect denial before the second hop, private-network narrowing, and route
  conflict denial before target or proxy send. Syntax, formatting, diff hygiene,
  and final Codex review are clean. The draft is mergeable with no attached
  checks; required Lobster ADO/GitOps contexts remain a promotion-time gate.
- Package 3B Lobster proof: [Lobster PR 34](https://microsoft.ghe.com/giodl/lobster/pull/34),
  branch `user/giodl/lobster-validate-provider-dispatch-bindings`, head
  `3610b780b63`, stacked on traffic-policy proof PR 33. Its one-file harness
  registers the policy and dispatcher through the production Plugin API and
  drives real loopback services through `buildGuardedModelFetch`. Exact-head
  proof covers JSON POST-body preservation, selected connection ownership,
  two OpenClaw-owned manual redirect hops, cross-origin Authorization stripping,
  connection-owner network-guard enforcement, pre-send duplicate/stale/missing
  binding failure, and the unchanged unbound direct path. The first Codex review
  correctly requested the POST-body case; the fixed exact-head rerun and final
  review are clean. The mergeable draft has no attached CI contexts; required
  Lobster ADO/GitOps contexts remain a promotion-time gate.
- Composed Lobster host-egress plugin: [Lobster PR 35](https://microsoft.ghe.com/giodl/lobster/pull/35),
  branch `user/giodl/lobster-host-egress-plugin`, head `e44fbaf44c0`, stacked
  directly on inert external-plugin PR 29. The shipped config remains
  inventory-only; explicit validation mode registers the
  `lobster/enterprise-egress` policy and `lobster/egress` dispatcher together
  and is restricted to canonical HTTP `127.0.0.1` origins. The dispatcher
  preserves Fetch body normalization, streaming request and response bodies,
  bodyless statuses, abort signals, and OpenClaw-owned redirects. Exact-head
  proof against temporary fork composition branch
  `user/giodl/hosted-integration-plugin-composition-proof` at `361013884f6`
  covers manifest discovery, failed-activation rollback, guarded POST, and
  unload cleanup. Nine plugin tests, two baked-config preflight tests, 144
  composed OpenClaw focused tests, diff hygiene, and final Codex review pass.
  No CAPI activation, reverse carrier, readiness, Status, or Doctor surface is
  added. The draft has no attached CI contexts; required Lobster ADO/GitOps
  checks remain a promotion-time gate.
- Composed Lobster credential-slot validation: [Lobster PR 36](https://microsoft.ghe.com/giodl/lobster/pull/36),
  branch `user/giodl/lobster-host-credential-plugin`, head `63ec23b7ac`,
  stacked on PR 35. Its dispatcher now declares the exact-origin
  `lobster/capi-token` slot while the resolver remains registered through the
  normal Plugin API lifecycle. The proof no longer prepares bindings or calls
  guarded one-hop dispatch manually; it drives OpenClaw's production
  `buildGuardedModelFetch`. The exact-head proof against OpenClaw `938218ae3b6`
  covers manifest discovery, rollback, activation, traffic policy, credential
  materialization, guarded POST, and unload, with one resolver call, one target
  hit, request-body preservation, and HTTP 200. Twelve plugin tests,
  generated-JS synchronization, and diff hygiene pass. Two final automated
  review attempts timed out without output, so review is recorded as
  unavailable rather than clean.
  No CAPI activation, reverse carrier, readiness, Status, or Doctor surface is
  added. The draft has no attached checks; required Lobster ADO/GitOps contexts
  remain a promotion-time gate.
- Lobster runtime readiness adopter: [Lobster PR 37](https://microsoft.ghe.com/giodl/lobster/pull/37),
  branch `user/giodl/lobster-host-runtime-readiness`, head `343cff9a78`, stacked
  on PR 36. It attaches five plugin-owned criteria to the canonical Lobster
  bundle, reports implemented policy/dispatcher/credential services as `True`,
  leaves CAPI and reverse-provider adapters as stable `Unknown`, and never
  resolves credentials during readiness. The exact-head proof against OpenClaw
  `b86df32297c` covers manifest discovery, rollback, activation, runtime
  readiness, guarded POST, and unload; it reports aggregate `Unknown`, zero
  pre-dispatch resolver calls, one guarded resolver call, one target hit, and
  preserved request body. Twelve plugin tests, the targeted Rust deployment
  test, rustfmt, diff hygiene, and final Codex review pass. The clean draft has
  no attached checks; required Lobster ADO/GitOps contexts remain a
  promotion-time gate.
- RFC file: `rfcs/0020-hosted-integration-and-capability-bindings.md`
- RFC sidecars drafted under `rfcs/0020/`:
  `host-integration-bundle-v1-spec.md`, `credential-slot-v1-spec.md`,
  `provider-request-traffic-policy-v1-spec.md`,
  `hosted-provider-dispatch-v1-spec.md`, and
  `host-integration-readiness-v1-spec.md`.
- RFC sidecar review: Gateway runtime, Lobster operator, CISO/security, and
  skeptical maintainer role passes tightened async credential resolution,
  atomic registration, owner/readiness authority, policy-generation fencing,
  bounded carrier work, network-guard schema, disconnect certainty, audit,
  proxy narrowing, and conformance fixtures. Final contradiction review is
  clean after defining RFC 0018 condition ordering for RFC 0020 criteria and
  mapping RFC 0023 `hostIntegrationGeneration` to `hostBundleGeneration`.
- Readiness dependencies: [RFC PR 33](https://github.com/openclaw/rfcs/pull/33)
  adds `rfcs/0018/readiness-v1-spec.md`; [RFC PR 37](https://github.com/openclaw/rfcs/pull/37)
  adds `rfcs/0023/hosting-profile-v1-spec.md`. RFC 0020 uses their canonical
  `True`/`False`/`Unknown`, required/advisory, bounded provider, projection,
  and optional profile contracts without copying them.
- Known dirty state: `claws-hapi` has this session edit plus unrelated project
  changes that must remain untouched. The RFC 0020 and PR 156 worktrees are
  clean at their published heads. The credential resolver registrar worktree
  is clean and pushed at `83230d1cc37`; PR 163 is a mergeable fork-only draft
  stacked on PR 158. Real behavior proof, workflow sanity, dispatch, and scan
  detection checks pass; only the expected fork-only `label` and
  `auto-response` jobs fail. OpenClaw PR 164 is clean and pushed at
  `938218ae3b6`; its paired exact production proof is recorded in both fork
  draft bodies. Lobster PR 36 is clean and pushed at `63ec23b7ac`, mergeable,
  and proven against OpenClaw head `938218ae3b6`;
  no required Lobster ADO/GitOps contexts are attached. OpenClaw PR 165 is
  clean and pushed at `b86df32297c`; its real-behavior proof check is green and
  only the expected fork-only `label` and `auto-response` jobs fail. Lobster PR
  37 is clean and pushed at `343cff9a78`, mergeable, and proven against the
  exact OpenClaw head; no required Lobster ADO/GitOps contexts are attached.
  OpenClaw PR 166 is clean and pushed at `566cbe31d0e`; real-behavior proof,
  Workflow Sanity, dispatch, and detection checks are green, with only the
  expected fork-only `label` and `auto-response` failures.
  Package 2A is clean and pushed at
  `7dfbc71bdeb`; its 117 focused tests, formatting, diff hygiene, and final
  Codex review pass. Blacksmith remote proof was blocked by an authenticated
  organization mismatch and brokered AWS Crabbox was not logged in, so fork
  CI or a restored remote provider owns the remaining clean-environment
  type/lint proof. PR 158 is mergeable; its expected fork-only `label` and
  `auto-response` failures are present, and draft routing skipped the heavy
  code matrix. Lobster PR 31 is clean, pushed, mergeable, and linked from the
  PR 158 real-behavior-proof section. Its committed proof shows zero readiness
  resolutions, first-hop-only credentials across same- and cross-origin
  redirects, and denied-origin failure before resolution or send. Three local
  Codex review attempts timed out without output, so its review is recorded as
  unavailable rather than clean.
  Package 1's fresh ClawSweeper review now verifies the live proof, reports no
  correctness findings, and raises proof confidence to 4/6. It remains blocked
  only on a human ownership decision for versioned `network-guard/v1`; the bot
  recommends keeping the profile local until an approved second connection
  owner exists, plus rebasing and refreshing proof before merge. Generic
  package #2-#5 worktrees remain published. D4a and D3a
  source changes are committed and pushed, but
  their hydrated Windows worktrees report generated tracked `node_modules` link
  churn that is intentionally unstaged. D4a PR 59 has the expected fork-only
  `label` and `auto-response` failures while other checks initialize. E4a and
  E4b worktrees are clean and pushed; E4b's targeted checks and final Codex
  review have no accepted findings. E4a's first fork CI run exposed one
  E4a test-helper type error;
  commit `6c86b760d76` fixes it and the replacement run is queued. The remaining
  failures reproduce D2a stack baseline failures or missing fork secrets. E4b
  has no attached fork checks. D4b is review-clean, committed, pushed, and
  open as fork-only draft PR 9 stacked on D2b; no checks are attached yet.
  D4c is review-clean, committed as `a2a11dfadb8`, pushed, and open as fork
  draft PR 62 stacked on D2a. Its fork workflows are initializing.
  D4d is review-clean, committed as `96d9b358da`, pushed, and open as fork-only
  draft PR 10 stacked on Lobster D2b PR 6. Its focused proof passed 49
  host-provider tests, the runtime key-source test, strict Clippy for both
  touched crates, formatting, diff hygiene, and final Codex review. The D4d
  worktree is clean and no matching PR exists in `bic/lobster`.
  D5a is review-clean, committed as `0b8f8684457`, pushed, and open as fork
  draft PR 63 stacked on D2a PR 52. Its focused proof passed 35 tests, four
  TypeScript lanes, plugin SDK export/boundary checks, focused lint/format,
  diff hygiene, and final Codex review. No matching PR exists in
  `openclaw/openclaw`; the fork-only `label` and `auto-response` checks fail as
  expected while other fork workflows initialize.
  D5b is review-clean, committed as `681a394bf7`, pushed, and open as fork-only
  draft PR 11 stacked on Lobster D2b PR 6. Its proof passed 46 host-provider
  tests, focused hosted/existing ACF source tests, strict Clippy for both
  touched crates, formatting, JSON parsing, diff hygiene, and final Codex
  review. The worktree is clean, no matching PR exists in `bic/lobster`, and
  the fork draft has no attached checks yet.
  D5c is review-clean, committed as `5cce30fce01`, pushed, and open as fork
  draft PR 65 stacked on D5a PR 63. The final Codex closeout passes 109
  extension tests with no accepted findings. Extension source and test
  typechecks, Gateway auth, generated docs and channel metadata, SDK exports,
  raw-fetch, channel-agnostic boundaries, formatting, and diff hygiene pass.
  The repository-wide monolithic SDK guard still reports the pre-existing
  `extensions/lobster-host/index.ts` import; one broad npm postpublish test has
  an unrelated Windows path-separator expectation. The D5c worktree is clean
  and no matching PR exists in `openclaw/openclaw`.
  The RFC Fleet update is committed as `1cf5afd2964`, pushed, and reflected in
  the draft PR body. Package 1 has been refreshed directly onto upstream
  `main`, review-hardened, and filed as mergeable upstream draft PR 113513 at
  `c85d52bfff5`. The final proof passed 130 focused tests, both core type-check
  lanes, the unchanged Plugin SDK API baseline, type-aware changed-file lint,
  diff hygiene, and a clean `codex review --base upstream/main`. A separate
  Lobster-owned runtime harness now imports production `fetchWithSsrFGuard`
  and proves direct, explicit caller-resolved proxy, and managed proxy-resolved
  routes against real loopback TCP services, even with hostile inherited proxy
  environment variables. The redacted proof is linked in the PR body through
  Lobster PR 30. The requested ClawSweeper re-review is queued; explicit human
  confirmation that `src/infra/net` should own internal `network-guard/v1`
  remains outstanding. CI is otherwise initialized. Package 2 is clean, synchronized, and mergeable at
  `0526a4a9e15`; fork-only `label` and `auto-response` failures remain expected.
  Package 3 is restacked onto package 2, clean, synchronized, and mergeable at
  `df1e3c6a724`. Fork PR 73 now presents one cell-local provider-dispatch
  session: no tenant selector, process-audience admission, peer/binding/bundle/
  owner fencing, post-hello activation, bounded credit/queues/traces, exclusive
  bundle ownership, HTTPS-preserving CAPI redirects, and inactive-by-default
  composition. All 412 tests across the 22 changed test files pass in seven
  Vitest shards. The final `codex review --base
fork/user/giodl/hosted-integration-capi-owner-operations` exited clean with no
  accepted/actionable findings.
  Package 4 is rebuilt from corrected package 3, clean, synchronized, and
  published at `633e087a455`. PR 74 contains provider-owned Substrate, WebIQ,
  and Anthropic bindings with generic typed host policy and dispatcher
  selections. It contains no CAPI or bundled Lobster host. All 59 focused tests
  pass; production and core-test type checks, Oxfmt, Oxlint, generated checks,
  and diff hygiene are clean.
  Package 5 is rebuilt from corrected package 3, clean, synchronized, and
  published at `bfc0e8fe5e3`. PR 75 contains native Teams ACF and Microsoft 365
  mail owners using `msteams/acf-token`, `m365mail/graph-token`, and arbitrary
  compatible typed host policy/dispatcher selections. It contains no CAPI,
  `lobster-host`, or `lobster/*` source coupling. All 262 focused tests across
  18 files pass; core source/tests and extension source/tests type-check; SDK
  API/export, inventory, docs map, MDX, links, Oxfmt, Oxlint, and diff hygiene
  are clean.
  The plugin-first host-bundle slice is committed as `4c3a78987bf8`, pushed,
  and open as mergeable fork-only draft [Lobster PR 29](https://microsoft.ghe.com/giodl/lobster/pull/29),
  stacked directly on D1b PR 3. Its clean worktree is
  `C:\src\lobster-host-contribution-plugin` on branch
  `user/giodl/lobster-host-contribution-plugin`. It bundles the canonical
  five-contribution deployment JSON
  into an inert startup plugin, rejects partial, duplicate, malformed, skewed,
  or default-active inventories, survives Lobster's default plugin overlay,
  and registers no tools, services, or runtime authority. Three manifest tests,
  the OpenClaw build-context guard, Rust formatting, and diff hygiene pass.
  Native full Rust tests stop on the existing Unix-only privileged bridge when
  run on Windows; the WSL retry is blocked before compilation by the missing
  private Lobster Cargo registry token. `codex review --uncommitted` findings
  for overlay preservation, Node 20 compatibility, and malformed-entry
  fail-open behavior were fixed. Its final Docker-stage finding was rejected
  after source verification: the Dockerfile never runs the bundle generator;
  it copies the already-generated plugin, and the canonical JSON is available
  whenever the repository-local generator runs.
  The plugin PR remains unchanged. Its child validation-only draft
  [Lobster PR 30](https://microsoft.ghe.com/giodl/lobster/pull/30) is mergeable
  at `dc48f43dad2`, contains only
  `scripts/validation/openclaw-guarded-dispatch-runtime.mjs`, and has no
  attached fork checks. The exact-head runtime output reports direct
  `proxyHits: 0`, explicit-proxy `proxyHits: 1`, managed-proxy `proxyHits: 2`,
  and `result: pass`. Node syntax, diff hygiene, and final Codex review are
  clean; the review sandbox could not execute the WSL proof, which was run
  independently and passed before and after commit.
  Package 2 dependency hydration is blocked by the fork feed's unavailable
  `@openclaw/crabline@0.1.11` tarball, but the existing test harness and pinned
  standalone Oxfmt/Oxlint proof pass. The RFC worktree is clean. D2a, D2b,
  B1-F1, and C3 worktrees are otherwise clean; `claws-hapi` contains these
  hosted-integration note edits plus unrelated `projects/feeds/SESSION.md` and
  `.codex-review-state-continuity-output.txt` changes that must remain
  untouched.
- Blocking question: which OpenClaw promotion establishes the real F2
  compatibility expiry and begins the bounded zero-old-path measurement window
  for CAPI and Graph deletion?

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-duplex-transport status --short --branch`
- Run: `git -C C:\src\lobster-layering-audit status --short --branch`
- Review: `source-audit-2026-07-11.md`, `comparison-matrix.md`, and `role-review-2026-07-11.md`
- Treat `four-area-architecture.md` and the area documents as source audits,
  not the current implementation architecture.
- Review: RFC 0020's native attachment -> owner contract -> optional hosted
  dispatch decision tree.
- Review: the five `rfcs/0020/` sidecars and their dependencies on RFC PRs 33
  and 37.
- Continue: paired owner/adopter deletion slices before designing a reverse
  carrier.
- Next: commit the RFC sidecars, force-with-lease push the rebased RFC branch,
  update fork RFC PR 2's body, then return to the PR 71-75 Codex findings.
- Update: this file and the deletion ledger after each evidence slice

## Guardrails

- Preserve `OpenClawTransport` as the host/app Gateway client abstraction; reuse Gateway peer machinery only as an optional carrier implementation.
- Preserve `node.invoke` wire behavior and keep hosts distinct from nodes.
- Do not tunnel ProxyPipe envelopes through `host.invoke`.
- Keep Channels, approvals, AgentHarness, lifecycle, and continuity with their existing owners.
- Do not open an upstream RFC or implementation PR until explicitly requested after architecture review.

## Open Threads

- D4a is committed as `b359c0541ed` and open as fork-only draft PR 59 stacked
  on D2a PR 52. D4b is committed as `2ef805b5e0` and open as fork-only draft
  PR 9 stacked on Lobster D2b PR 6. Together they preserve exact `x-apikey`
  origin binding, request defaults and bounds, adult-result filtering,
  external-content wrapping, local/hosted parity, independent WebIQ readiness,
  stateless shared authority, rollback, and release-gated old-path retirement.
  D4c is committed as `a2a11dfadb8` and open as fork draft PR 62 stacked on
  D2a PR 52. It preserves bounded attachment transformation, exact API-key
  slot selection, fallback request fields, raw Anthropic SSE responses, and
  local/hosted parity without activating runtime authority. D4d is committed
  as `96d9b358da` and open as fork-only draft PR 10 stacked on Lobster D2b PR 6. It preserves exact key/origin binding, owner-prepared final bytes,
  independent readiness, stateless authority, explicit rollback, redacted
  evidence, and release-gated old-path retirement without adding provider
  semantics to Rust. D5a is committed as `0b8f8684457` and open as fork draft
  PR 63 stacked on D2a. It keeps ACF Activity semantics in the Teams Channel
  owner, exact-binds `lobster/acf-token`, denies redirects, preserves raw
  responses, and remains inactive. D5b is committed as `681a394bf7` and open
  as fork-only draft PR 11. It captures trusted session identity outside the
  reverse wire, verifies the fixed Bot Framework audience, checks live
  disable/revocation state before acquisition, exact-binds the five D5a
  origins, and materializes only the bearer header value. D5c is committed as
  `5cce30fce01` and open as fork draft PR 65. D5d is implemented in
  `C:\src\lobster-hosted-integration-d5d-graph-adoption`: it adds the exact
  `lobster/graph-token` contribution and four-origin policy, a mailbox-bound
  WIF resolver that accepts only exact object ID or case-insensitive UPN,
  Graph canary readiness/rollback evidence, and m365mail-only Gateway bearer
  delivery. The host-provider suite passes 51 tests; focused runtime and
  adapter tests plus strict host-provider/runtime Clippy pass; final Codex
  review is clean. The vendored overlay and legacy Graph injection remain
  promotion-gated deletion targets because Lobster is still pinned to
  OpenClaw `v2026.5.28`.
- Consolidated package 5 is the reviewer-facing replacement for D5a/D5c:
  `/root/src/openclaw-hosted-package-5-generic`, remote branch
  `user/giodl/hosted-integration-microsoft-interactions`, published head
  `bfc0e8fe5e3`. It preserves Teams ACF Channel semantics and Graph mailbox
  semantics as separate owners while sharing package 3's cell-local authority
  fences and accepting generic external-host contributions. Root packaging,
  generated metadata/docs, exact owner credential slots, identity checks,
  account behavior, rate limiting, persistent replay state, concurrent dedupe,
  strict typing, and package contract exports are proven. PR 75 is clean,
  mergeable, and curated as the final fork-only package.
- F2 is implemented in
  `C:\src\lobster-hosted-integration-f2-capi-observation`, stacked on D2b. It
  adds an exact CAPI observation contract with four rollout phases, minimum
  OpenClaw `2026.6.11`, redacted request/response fingerprints, independently
  supplied authority, and deterministic blockers for version, parity,
  old-path use, expiry, rollback, and phase drift. The fixture intentionally
  leaves compatibility expiry unset, so removal cannot be declared ready
  before promotion policy exists. The host-provider suite passes 45 tests,
  strict Clippy passes, and final Codex review is clean.
- E4a/E4b owns the continuity restore hold as a normal OpenClaw/Lobster pair.
  E4a extends the existing lifecycle-owner generation and operational
  surfaces after A3/B5/B6a/B6b; E4b fences both Lobster launch fan-ins after
  E4a/F1 and can proceed alongside D2. Both fork-only PRs are open; neither is
  an upstream activation or merge request.
- `OpenClawTransport` is confirmed as the public app SDK's client-to-Gateway
  request/event abstraction and is no longer extended by the RFC.
- RFC 0020 now leads with three composable branches: native attachments, owner
  contracts, and optional hosted physical dispatch. The old two-problem and
  four-area structures remain audit history rather than product frameworks.
- RFC 0020 adopts one complete Gateway cell per tenant trust domain. Owner
  bindings, credentials, generations, readiness, Status, and Doctor remain
  cell-local; payload tenant or session fields cannot select another cell.
  Fleet owns local lifecycle, Lobster may own multi-machine placement and
  aggregation, and neither becomes a semantic owner or shared application
  carrier. Fleet bridge isolation leaves outbound egress open by default, so
  the existing network-guard and host-policy work remains required.
- A ClawBus-style multiplexed session is not a V1 surface. Native transports
  remain authoritative, with one narrow provider-dispatch reverse carrier when
  the host must physically execute requests.
- The FACES area documents remain supporting evidence; the sellable architecture
  is one owner-first decision tree with shared composition and safety rules.
- The `.craft/roles` review approved the model with explicit attachment,
  single-writer migration, plan-generation/incarnation separation, and
  default-deny constraints.
- Exec approval is confirmed as Area 1 because the host carries a user/policy
  authorization decision over the canonical Gateway approval surface; it does
  not provide a runtime capability.
- `area-1-exec-approval-host-contract.md` defines the exact three-layer surface:
  owner attachment descriptor, reusable host approval consumer, and prepared
  composition binding.
- OpenClaw already has the reference approval consumer in
  `createExecApprovalChannelRuntime` and the typed Channel adapter surface in
  `ChannelApprovalCapability.nativeRuntime`.
- ProxyPipe deletion requires no new approval protocol. The likely OpenClaw
  product work is supported packaging, generated non-TypeScript schemas,
  conformance fixtures, lifecycle status, and hosting documentation.
- Rich human-actor provenance is not currently preserved in the Gateway
  approval record or the ProxyPipe response. Keep host audit correlation in V1
  and evaluate any structured actor assertion as a separate additive change.
- `area-1-channel-attachment-contract.md` defines Channel endpoint and adapter
  attachments without introducing a generic normalized ingress RPC.
- Lobster's existing HTTP Teams-delivery path proves that ordinary HTTP can
  replace ProxyPipe tags 12-13. The remaining contract is owner-defined
  trusted-forwarder authentication, classified acknowledgement, idempotency,
  readiness, and route generation.
- Approval and Channel integrations share composition metadata but deliberately
  do not share a callback schema: approvals are Gateway consumers; Channels
  are endpoint or Channel adapter attachments.
- `area-1-provider-traffic-governance.md` fixes the Area 1/Area 2 handoff:
  Area 1 compiles deny/narrow/route policy into the existing provider guarded
  fetch path; Area 2 supplies a dispatcher only when the host physically
  executes the request.
- Standard proxy, TLS, and service-mesh egress remain valid bindings. A remote
  policy callback and a hosted HTTP dispatcher are not required for ordinary
  governed deployments.
- `area-1-operations-and-catalog.md` completes the common model with three V1
  attachment kinds: Gateway client, Channel endpoint, and traffic policy.
- Area 1 owns those OpenClaw-driven integration seams. Each owner retains
  validation, activation, generation, provenance, and migration authority;
  Area 3 aggregates trusted owner evidence through Hosting Profiles, status,
  and Doctor.
- A remote Channel adapter is deferred until a concrete Channel proves that
  endpoint routing and ordinary outbound governance are insufficient.
- Canonical Gateway administration remains Gateway-owned. The assembled status
  view reports owner-produced desired/effective state, generation, readiness,
  provenance, and migration authority; it does not accept host-written health
  truth.
- `area-1-role-review-2026-07-11.md` approved the three-kind model after
  requiring phased activation, separate least-privilege clients, fixture-only
  Channel shadow validation, schema-evolution rules, and cross-system audit
  correlation.
- Area 1 evidence targets are canonical exec approval tags 29-30, Teams Channel
  endpoint tags 12-13, and a compiled provider traffic-policy fixture.
- Area 2 starts with provider-request dispatch as the first deletion-bearing
  capability binding; secret resolution remains the strongest internal
  analogue and a later interface proof.
- Audit the exact provider-request dispatch seam, stream normalization,
  cancellation, retry ownership, limits, and current Lobster tags 1-5 before
  fixing the portable contract.
- Area 2's four leading capability families are secrets, request dispatch,
  publication, and telemetry. They share owner-defined binding selection and
  composition metadata, not one payload or invocation protocol.
- Area 2 is sufficient for Area 3 design, but its dispatcher evidence slice
  is now defined in `area-2-provider-dispatch-contract.md` and
  `area-2-provider-dispatch-evidence-slice.md`.
- The final seam is one redirect-disabled exchange inside OpenClaw's guarded
  fetch loop. OpenClaw retains redirect/header/retry/response semantics; the
  dispatcher enforces a fixed OpenClaw network-guard profile where it resolves
  DNS and connects.
- Hosted automatic redirect following is deliberately removed. This closes the
  current gap where Lobster's default `reqwest` client may follow a redirect
  after only the initial hostname passed the product allowlist.
- Local/hosted equivalence means the same guard profile produces the same
  decision. A managed binding may explicitly authorize named private
  origins/CIDRs that the local/default binding denies.
- V1 credential slots cover one origin-scoped header. Current CAPI, Substrate,
  IDP, Channel, and body-rewriting paths use separately registered
  owner-specific provider adapters plus credential-slot resolvers before
  ProxyPipe tags 1-5 can be deleted.
- The `lobster-host` bundle is the coherent supply surface for all three parts:
  provider adapters such as `lobster/capi`, credential resolvers such as
  `lobster/capi-token`, and the physical `lobster/egress` dispatcher. Typed
  owner config composes them; the dispatcher remains semantically empty.
- `provider-assembly-role-review-2026-07-11.md` completed the final
  `.craft/roles` pass. Its key correction is that provider adapters register
  with their actual semantic owner—CAPI/Substrate with model providers,
  Channel adapters with Channels—rather than through a universal
  `providerRequestAdapters` registry.
- Bundle declaration is validated as one immutable registration snapshot;
  owner activation remains independent. Credential use is the intersection of
  adapter declaration, owner config, resolver placement/origins, and
  traffic/network policy.
- B4 is published as fork draft PR 43. The `lobster/capi` owner contribution
  validates the endpoint template, tenant, model, body, metadata-header
  ownership, exact `lobster/capi-token` declaration, and successful SSE
  adaptation without acquiring credentials or selecting transport.
- B4 proof passed 119 focused tests, formatting, focused lint, core TypeScript,
  and final diff checks. Codex findings for spoofed headers, CR-only/mixed SSE
  boundaries, stale `Content-Length`, HTTPS bearer transport, and recovery
  after oversized SSE events were fixed. Immediate request-path wiring was
  rejected as a stack-boundary violation because D2a explicitly owns activation.
- B5 is published as fork draft PR 45. `host-integration-bundle/v1` validates a
  complete candidate and atomically replaces one process-wide immutable
  desired/resolved inventory only after all required contributions are present
  and exact-version compatible.
- B5 initially admits only the two real B3/B4 contribution types. It adds no
  config key, plugin-manifest field, runtime activation, or startup fallback;
  D1a owns registration of the first concrete `lobster-host` package after
  plugin and owner discovery.
- B5 proof passed 7 focused tests, formatting, focused lint, core TypeScript,
  and diff checks. Codex findings for raw validation errors, strict SemVer,
  single-slot publication, and cross-owner duplicate IDs were fixed. Automatic
  startup registration was rejected because no concrete host package exists
  before D1a.
- B6a is published as fork draft PR 46. `host-integration-status/v1` joins the
  current B5 desired/resolved bundle inventory with one atomic owner-evidence
  snapshot and projects it through `status --json` only when a bundle exists.
- B6a keeps bundle, owner, carrier, and carrier-incarnation generations
  separate. Owner evidence must name the bundle generation it observed;
  mismatches are reported as `stale` and cannot masquerade as current
  readiness. No probing, activation, config, or Doctor remediation was added.
- B6a proof passed 17 focused tests, formatting, focused lint, core TypeScript,
  and diff checks. Codex's disconnected-evidence and stale-generation findings
  were fixed; the final review was clean.
- B6b is published as fork draft PR 47. It registers
  `core/doctor/host-integration-bindings` through OpenClaw's existing structured
  health pipeline and projects only non-ready B6a inventory entries.
- B6b is read-only and emits no success finding. Required unavailable bindings
  are errors; degraded, stale, unresolved, and optional unavailable bindings
  are warnings with bounded remediation.
- B6b never copies owner messages and exposes only approved operational reason
  codes. Unknown reasons become generic owner-reported state causes, preserving
  secret redaction and owner authority.
- B6b proof passed 105 focused tests, formatting, focused lint, core TypeScript,
  and diff checks. Codex's contribution-versus-package remediation finding was
  fixed; the final review was clean.
- C1 is published as fork draft PR 48. `reverse-provider-dispatch/v1` is a
  closed provider-dispatch-only frame contract, strict parser, single-operation
  trace evaluator, and language-neutral fixture corpus.
- C1 carries connection incarnation, operation, owner generation, and host
  bundle generation on every frame. It defines byte credit, bounded chunks,
  half-close, advisory cancellation, dispatch certainty, terminal outcomes,
  explicit disconnect synthesis, and no automatic reconnect replay.
- C1 hardens the complete B2 network-guard profile for untrusted wire use,
  including exact nested shape, DNS-rebinding enforcement by resolution mode,
  target-consistent TLS posture, and allocation-free canonical Base64 length
  measurement.
- C1 proof passed 39 focused C1/B1/B2/B3 tests, formatting, focused lint, core
  source TypeScript, mode and diff checks. Codex findings for late/stale frame
  authority, nested guard validation, DNS/TLS invariants, Base64 allocation,
  and sequence-width frame limits were fixed; the final review was clean.
- C2 is published as fork draft PR 49. It adds a distinct `host-provider`
  Gateway role, signed process-scoped admission credentials, one hidden
  `host.provider.frame` method, and a bounded reverse-session registry.
- C2 host-provider sessions are excluded from operator/node methods, presence,
  generic broadcasts, advertised plugin surfaces, and snapshots. Non-core
  descriptors cannot claim the host-provider scope.
- C2 binds admission and every frame to peer identity, binding, interface and
  carrier versions, owner generation, bundle generation, and a fresh
  incarnation. Authority changes revoke connected sessions and settle active
  work at observed C1 dispatch certainty without replay.
- C2 proof passed 63 focused Gateway tests, 66 protocol/hosting tests, 8 Doctor
  tests, formatting, focused lint, core source TypeScript, mode and diff
  checks. Codex findings for trusted credential issuance, connected-session
  generation freshness, and non-core host-provider scope claims were fixed;
  the final direct review was clean.
- C3 is published as fork-only Lobster draft PR 2. The new inactive
  `lobster-host-provider` crate implements the C1 wire and C2 handshake,
  bounded actors, flow control, cancellation, certainty, deadline enforcement,
  generation fencing, reconnect lifecycle, credential slots, redirects-off
  dispatch, and pinned/proxy network-guard enforcement.
- C3 proof passed 12 standalone Rust tests, strict Clippy, locked workspace
  metadata, formatting, and final diff checks. Codex findings for WebSocket
  control frames, connect response shape, caller-owned DNS bypass, and permit
  lifetime across response streaming were fixed; the final review was clean.
- D1a is published as fork draft PR 50. The disabled-by-default bundled
  `lobster-host` plugin publishes one atomic five-part `lobster/host@1.0.0`
  inventory only during its startup-service lifetime and clears only the exact
  snapshot it registered.
- D1a adds a generic typed Plugin API registration seam rather than a
  Lobster-specific SDK helper. Core derives trusted plugin provenance; the
  package declares the CAPI adapter, credential resolver, traffic policy,
  dispatcher, and reverse carrier but does not select or activate any owner.
- D1a proof passed 11 focused bundle/registry/extension tests, 8 Plugin SDK
  contract and baseline tests, formatting, and diff checks. Direct Codex review
  found no actionable regressions. Broad Crabbox proof was blocked because
  Blacksmith was unauthenticated and no AWS broker login was configured, so the
  fork PR CI owns that remaining gate.
- D1b is published as fork-only Lobster draft PR 3. It adds a checked-in
  `lobster-host-deployment/v1` artifact that must match the complete D1a
  five-part inventory and remain disabled by default.
- D1b records startup predecessors, reconnect limits, dispatcher concurrency,
  and graceful-shutdown budget; exposes validated deployment-owned backoff to
  the C3 lifecycle; and projects redacted carrier status that is always
  non-authoritative.
- D1b deliberately does not wire live CAPI credentials or authority. D2b owns
  token/selection/canary/rollback, while E3b owns enterprise policy semantics.
  Proof passed 16 focused Rust tests, strict Clippy, formatting parity, locked
  Cargo metadata, diff checks, and a clean direct Codex review.
- E3b is published as fork-only Lobster draft PR 4 at `bd59ffa735`. It compiles
  `lobster/enterprise-egress` into E3a's exact
  `provider-request-traffic-policy/v1` registration and consumes the canonical
  cross-language fixture.
- E3b validates route/rule identity, exact origins, strict `llm`/`stream`
  scope, overlapping route conflicts, proxy credentials/private-proxy posture,
  TLS verification, hostname pins, safe provenance, generation freshness, and
  redacted readiness. Missing, stale, conflicting, malformed, or insecure
  policy remains non-ready.
- E3b proof passed 24 focused Rust tests, strict Clippy, rustfmt CI parity,
  locked Cargo metadata, fixture content parity, diff checks, and final
  full-access Codex review with no actionable findings. The one rejected review
  suggestion would have forbidden HTTP origins contrary to E3a's portable
  local/private-origin contract; guarded fetch and `allowPrivateNetwork` remain
  authoritative.
- F1 is published as fork-only Lobster draft PR 5 at `9ebedf42bb`. It adds an
  immutable `lobster-host-composition/v1` snapshot that selects the five D1b
  CAPI-wave contributions and classifies all owner readiness criteria through
  `lobster/managed`.
- F1 cross-checks selection kinds against the bundle inventory, compiles E3b's
  policy generation, fences configured owner generations, and makes
  unresolved, ambiguous, incompatible, disabled, stale, and non-ready states
  explicit. Owner evidence drives readiness; configuration cannot assert
  health.
- F1 always reports `authoritative: false`, keeps
  `legacy-proxy-pipe` effective, and records the exact `llm-default`,
  ECS-or-startup, `LOBSTER_CONTAINER_PROXY_ENABLED=true` rollback selection for
  D2b. Proof passed 33 focused Rust tests, strict Clippy, rustfmt CI parity,
  locked Cargo metadata, diff checks, and clean full-access Codex review.
- E3a is published as fork draft PR 51. It adds
  `provider-request-traffic-policy/v1`, a local immutable generation that can
  deny or narrow origins, private-network posture, timeout, route, proxy/TLS,
  and hostname pins before guarded dispatch.
- E3a exposes snapshot-scoped Plugin API registration bound to the owning
  plugin lifecycle. Inactive loads do not publish policy, failed activation
  rolls back, unrelated plugins cannot replace a same-ID generation, and
  explicit policy routing suppresses weaker environment-proxy fallback.
- E3a revalidates every redirect against the same compiled policy generation,
  route, dispatcher, timeout, and private-network decision. It also prevents a
  policy denial from retaining OpenClaw's implicit exact-origin trust for
  private custom/local endpoints.
- E3a V1 intentionally advertises only the enforced guarded streaming LLM
  surface. Other provider capabilities and transports require equivalent
  owner-path enforcement before the public contract expands.
- E3a proof passed 203 focused policy, Plugin API, guarded-fetch, transport, and
  bundle tests, core TypeScript, focused Oxlint/formatting, Plugin SDK baseline,
  and diff checks. Direct Codex review findings for lifecycle rollback,
  configured TLS/pin preservation, redirect bypass, snapshot mutability,
  over-broad transport claims, private-origin trust, and plugin ownership were
  fixed; the final direct review was clean.
- D2a is published as fork PR 52 at `aac68918149`. It resolves the exact CAPI
  adapter, credential slot, traffic policy, and dispatcher references from one
  immutable bundle snapshot, then injects the selected one-hop dispatcher into
  guarded fetch without activating Lobster or changing the local default path.
- D2a adapts C2 reverse operations into ordinary streaming `Response` objects,
  obeys byte-granular request credit, preserves dispatch certainty and
  unfollowed redirects, keeps redirect/SSRF policy in OpenClaw, captures config
  and dispatcher implementations immutably, and fences config, bundle, and
  owner generations independently.
- D2a proof passed 158 focused tests, core and test TypeScript, full core
  Oxlint, formatting, Plugin SDK baseline generation/check, and direct diff
  review. Review fixes covered partial-credit flow control, abort-listener
  lifetime, immutable implementation capture, binary body preservation, and
  combined-stack lint/type issues.
- D2b is published as fork-only Lobster draft PR 6 at `b7eb31865e`, stacked
  on F1. It prepares the exact `lobster/capi-token`, `lobster/managed` policy
  route, `lobster/egress` dispatcher, and C3 streaming carrier dependency,
  while reusing the existing runtime `CapiClient` through a narrow token
  resolver adapter.
- D2b adds a canary composition generation, single-writer authority
  reconciliation, readiness-loss and operator rollback, policy-generation
  fencing, bounded dispatcher resources, and redacted transition correlation.
  Validation-only remains legacy-authoritative and unchanged reconciliation
  emits no duplicate transition or replay.
- D2b proof passed 41 host-provider tests, 4,113 Lobster runtime library tests,
  strict Clippy across both affected crates, rustfmt, workspace metadata, and
  diff checks. Private Cargo feed access uses a process-local Azure CLI token
  with the required `Bearer ` prefix; no credential was persisted.
- D3a is published as fork draft PR 53 at `f58b0b24ee0`, stacked on D2a. It
  adds the typed `lobster/substrate-llmapi` model-owner adapter, exact
  `lobster/substrate-token` credential slot, immutable hosted binding, and the
  expanded `lobster/host@1.1.0` contribution inventory.
- D3a preserves request body bytes, endpoint path/query behavior, safe raw or
  mapped model selection, development/production taxonomy routing, protected
  owner headers, and origin-bound credential materialization. CAPI and
  Substrate now share one guarded policy/dispatcher path with redirect route
  stability and captured dispatcher identity.
- D3a proof passed 48 focused tests, core/core-test and
  extensions/extensions-test TypeScript, focused core and extension Oxlint,
  formatting, and diff checks. Direct review fixes covered mapped/default
  configuration error taxonomy, unreachable whitespace model-map keys,
  normalized-path traversal, and immutable route/dispatcher capture.
- `implementation-pr-series.md` splits delivery into contracts/readiness,
  OpenClaw owner surfaces, reverse carrier, Lobster semantic migrations, Area 1
  migrations, and final adoption/cleanup. Approvals, Teams endpoint, Hosting
  Profiles, traffic policy, and local dispatcher foundations can proceed in
  parallel. Upstream PRs are framed as independently useful OpenClaw
  factorings; Lobster-specific compatibility retirement remains downstream.
- `implementation-pr-series-role-review-2026-07-11.md` approved the wave map
  after strengthening the first milestone. It now spans Waves 1-4 and proves
  the complete CAPI path: bundle, model adapter, credential resolver, policy,
  reverse dispatcher, streaming, Hosting Profiles, Status, Doctor, canary
  authority, and rollback. Provider-neutral fixtures remain conformance only.
- `pr-plans/` now contains 37 execution briefs, each mapped to one repository
  PR. Cross-repository adoption is split into explicit OpenClaw-owner and
  Lobster-implementation PRs.
- `pr-plans-role-review-2026-07-11.md` records the final role pass. It required
  B6 Status/Doctor separation, repository-specific D2-D5 and E1-E3 plans,
  explicit runtime/security/version-skew gates, and F1 inactive preparation
  before D2b owns CAPI canary authority and rollback.
- The PR map now has an explicit four-area integration matrix. E1 approvals,
  E2 Teams, and E3 traffic policy must each update the same versioned
  `lobster-host` registration, typed owner selection, owner readiness, Hosting
  Profile posture, Status, and Doctor surfaces. Area 4 remains binding-specific:
  Gateway and Channel use native paths while hosted provider dispatch uses the
  narrow reverse carrier.
- `managed-configuration-alignment.md` defines the cross-project boundary:
  managed layers may exact-own hosted selection fields and publish them in one
  effective config generation, while bundle registration, owner resolution,
  activation, readiness, and carrier state remain outside config composition.
- Request and response streaming, bounds, credit, half-close, dispatch
  certainty, and advisory cancellation are V1. One-shot request bodies are not
  silently buffered for body-preserving redirects.
- `area-2-role-review-2026-07-11.md` approved the revised contract.
- Area 3 does not own a global binding plan. Owners validate and activate their
  own references, publish trusted evidence, and retain generation and
  single-writer migration authority.
- Hosting Profiles is the likely Area 3 foundation, not merely an analogue. Its
  live stack already supports trusted plugin criterion registration, advisory
  defaults, namespaced profiles that promote selected criteria to required,
  fail-closed `Unknown`, and `/ready`/health/status projection.
- The sharper Area 3 split is: owner configs select and configure bindings;
  owner registries validate, activate, and publish evidence; Hosting Profiles
  declares which conditions are required; readiness gates traffic; richer
  binding generation/incarnation/provenance remains status, not readiness.
- Avoid a duplicate `hosting.bindings` config tree or global activation DAG
  unless a concrete cross-owner dependency proves owner activation plus profile
  readiness is insufficient.
- OpenClaw capability-provider registries already implement the desired
  reference-and-registry pattern: config selects a provider ID, plugin
  registration supplies the implementation, and missing registration fails
  explicitly. Area 2 should reuse this where the capability is plugin-backed.
- .NET keyed services plus health checks validate separating implementation
  selection from readiness. Kubernetes readiness gates validate that a missing
  required criterion must keep the workload non-ready. Neither justifies a new
  OpenClaw DI container or controller loop.
- Area 3 is resolved as a Hosting Profiles integration, not a new composition
  subsystem. Owner config selects bindings; registries resolve them; every Area
  1/2 binding publishes trusted readiness evidence; named profiles promote
  selected criteria to required; status and Doctor provide richer detail.
- Area 4 must now evaluate direct HTTP/WebSocket, standard proxy/service mesh,
  dedicated reverse connections, Gateway peer machinery, and optional
  multiplexing against the concrete Area 1/2 bindings.
- Area 4 V1 is intentionally narrow:
  `area-4-provider-dispatch-reverse-carrier.md` defines one optional
  provider-dispatch-only reverse session for the case where a proxy/service
  mesh cannot work and the host must physically execute requests. It reuses
  Gateway admission/peer machinery where practical but isolates provider
  streaming from operator traffic and does not create a generic host bus.
- `host-integration-bundle.md` is now the cross-area answer. Lobster registers
  one namespaced bundle containing its attachment, capability-provider,
  carrier, and readiness contributions. Typed references remain in the owning
  OpenClaw config areas; `lobster/managed` Hosting Profiles requirements,
  status, and Doctor provide the central assembled contract and operational
  view.
- RFC 0020 now reflects the bundle-centered architecture, Hosting Profiles
  readiness, owner-local activation, native carriers, and the narrow
  provider-dispatch reverse carrier.
- RFC 0020 and the fork PR body now include explicit Area 1 and Area 2 scope
  tables: attachment/capability contracts, canonical owners, initial Lobster
  migrations, exclusions, and the exact traffic-policy-to-dispatcher handoff.
- The public RFC and PR body no longer use numbered area terminology. They use
  plain-language sections: host attachments, runtime capabilities,
  registration/readiness, and connection choices.
- `pr-body-role-review-2026-07-11.md` revised the fork PR pitch for executives,
  maintainers, operators, security, runtime, and new readers. The body now
  leads with business/operational value, compares today versus the proposal,
  preserves the full scope and diagram, explains delivery risk controls, and
  ends with the exact architecture decision requested.
- The RFC and PR body now explicitly answer why ProxyPipe could not simply use
  existing config: several owner-supported registration/binding seams do not
  exist. They separate those missing seams from the bundle, whose role is only
  coherent packaging, atomic registration validation, typed owner references,
  inventory, readiness, Status, and Doctor correlation.
- `bundle-centered-role-review-2026-07-11.md` completed the final runtime,
  operator, security, ecosystem, and simplicity review. It approved the model
  after clarifying load versus readiness, owner versus host bundle generation,
  dispatcher credential exposure, independent policy/dispatcher criteria, and
  advisory cancellation.
- Decide whether the reverse carrier reuses the Gateway WebSocket protocol, a
  dedicated Gateway-listener subprotocol, or only Gateway admission/identity
  machinery.
- Prove provider credential slots, dispatch certainty, and owner-generation
  binding for the selected carrier.
- Quantify removable ProxyPipe frames and Rust/TypeScript code.
- Design mixed-version migration with an explicit fallback expiry.
- B1 landed on the fork as draft PR 34. It extracts a typed
  `OneHopFetchDispatcher` around the existing local redirect-disabled exchange,
  requires `redirect: "manual"`, preserves response identity and transport
  errors, and leaves SSRF, DNS pinning, redirects, capture, timeout, and release
  ownership in guarded fetch.
- B1 proof: `pnpm tsgo:core`; 93 focused tests across
  `one-hop-fetch-dispatcher.test.ts` and `fetch-guard.ssrf.test.ts`; final
  full-access Codex autoreview reported no actionable regression.
- Autoreview rejected the first injectable draft because a remote
  implementation could ignore the non-portable Undici dispatcher and resolve
  DNS again. Runtime selection is therefore deferred until B2 carries an
  enforceable guard profile at the actual connection owner.
- B2 landed on the fork as draft PR 35. It adds a fixed
  `network-guard/v1` profile carrying the exact target, route and DNS owner,
  TLS posture, address policy, explicit private CIDRs, special-range posture,
  and DNS-rebinding requirement for every one-hop exchange.
- B2 distinguishes rebinding policy from proof:
  `local-pinned` requires a prepared local dispatcher,
  `connection-owner-required` assigns enforcement to the proxy/host that
  resolves and connects, and `not-enforced` accurately describes legacy
  caller-resolved execution.
- B2 publishes language-neutral fixtures for public, private, mixed-address,
  rebinding, exact-origin, link-local, redirect-origin, and RFC2544 behavior.
- B2 proof: focused format/lint; `pnpm tsgo:core`; 176 focused tests across
  profile, fixture, SSRF, pinning, dispatcher, and guarded-fetch suites; final
  `codex review --uncommitted` reported no accepted/actionable findings.
- B3 landed on the fork as draft PR 38. It adds fixed
  `credential-slot/v1` and `credential-slot-resolver/v1` contracts for one
  exact-origin header, plus immutable preparation and local one-hop
  materialization.
- B3 requests name only a prepared slot ID. Header, origin, resolver, version,
  and required posture are fixed before dispatch; missing, duplicate,
  ambiguous, incompatible, cross-origin, conflicting, unavailable, and expired
  states fail before provider send.
- B3 readiness reports only non-secret binding metadata and never invokes the
  resolver. Invalid request references are validated before any credential is
  acquired, and injected values remain below guarded-fetch capture and
  redirect state.
- B3 proof: focused format/lint; `pnpm tsgo:core`; 109 focused tests across
  credential slots, one-hop dispatch, network guard, and guarded-fetch
  redirects; final `codex review --uncommitted` reported no
  accepted/actionable findings.
  Package 4 is clean and published at `633e087a455`; PR 74 is a mergeable
  fork-only draft based on corrected package 3. It contains only provider-owned
  bindings and generic host selections.
  Package 5 is fully restacked and published at `bfc0e8fe5e3`. The ACF and
  Graph owners retain exact identity, credential, response, replay, and
  route-policy semantics while using package 3's bounded hosted-dispatch
  substrate and external-host contributions. PR 75 is tested, mergeable, and
  curated with explicit evidence and non-goals.
- The current read-only Status slice is OpenClaw fork draft PR 177 at
  `5bdb4354da1`, stacked on canonical runtime-inventory PR 175. It adds only the
  operator-read `hostIntegration.status` RPC and the optional non-empty
  `status --json` projection. The full build, 46 focused tests, core/core-test
  types, type-aware lint, formatting, and Codex review pass.
- The exact packaged Lobster live proof is fork draft PR 50 at `15bb845c56`,
  stacked on profile runtime-inventory PR 49. A real token-authenticated
  Gateway loads the packaged plugin and returns one `lobster/host` bundle with
  five honest `Unknown` readiness states from OpenClaw head `5bdb4354da1`.
- Lobster PR 50 is open, draft, mergeable, and clean with no fork checks
  attached. No ADO run was manually queued, no upstream Lobster PR was opened,
  and no OpenClaw issue or upstream PR was filed.
- The canonical Doctor recomposition is OpenClaw fork draft PR 178 at
  `2921def00df`, stacked directly on Status PR 177. It projects the existing
  inventory into structured findings, uses the CLI-scoped Gateway client,
  performs no activation or repair, and passed 121 focused tests, both core
  type graphs, type-aware lint, formatting, diff hygiene, and clean Codex
  review. Its lightweight fork checks are green except the expected fork-only
  Labeler and Auto response failures.
- Lobster fork draft PR 52 at `0cf67c2d05` is stacked directly on PR 50. Its
  live token-authenticated Gateway proof loaded the packaged plugin and showed
  all five honest inactive `Unknown` contributions become five redacted Doctor
  warnings at exact OpenClaw head `2921def00df`. Six plugin tests, script
  syntax, diff hygiene, live proof, and Codex review pass. The draft is clean
  and mergeable with no attached required Lobster contexts; ADO was not
  manually queued.
- The standalone carrier-session admission pair is now refreshed as fork-only
  drafts. OpenClaw PR 180 at `5459acdd52e` is stacked on corrected
  reverse-carrier contract PR 179 head `fa6f09737a8`; Lobster PR 54 at
  `58643569f1` is stacked on corrected conformance PR 53 head `6725e0b2b1`.
  Both remain draft and mergeable. No OpenClaw issue or upstream PR was filed.
- OpenClaw PR 180 adds only a pure caller-verified admission registry: exact
  binding/interface/carrier/owner/bundle/audience/peer-key checks, proof expiry,
  duplicate ownership rejection, immutable evidence, bounded inputs,
  constant-memory unique incarnation IDs, contained incarnation-source
  failures, incarnation-safe detach, and expiry.
  It adds no Gateway role, token issuer, socket, reconnect, dispatch,
  activation, readiness, Status, or Doctor behavior.
- Lobster PR 54 adds only
  `HostProviderDeclaration::session_declaration()` and its public V1 shape. The
  existing inactive handshake and package remain unchanged. Its production
  serializer is checked against the exact shared OpenClaw fixture.
- OpenClaw proof passed 19 focused tests, type-aware Oxlint, Oxfmt, diff
  hygiene, and final branch review. Lobster proof passed 19 package tests,
  strict Clippy, repository rustfmt, diff hygiene, and final branch review.
  Both copies pin fixture SHA-256
  `7f652424b4be83a34a065dbd6b3edb6d929117bcf55047911264086e69143a51`.
- OpenClaw PR 180's Real behavior proof, Workflow Sanity, and lightweight
  detection checks are green. Only the expected fork-only Labeler and Auto
  response jobs fail. Lobster PR 54 has no attached checks; no ADO pipeline was
  manually queued.
- O13 session-scoped operation ownership is published as OpenClaw fork draft
  PR 181 at `8a6590048fc`, stacked directly on O12. It adds one exact-current
  session identity seam plus a synchronous process-local registry: operation
  IDs are scoped to one incarnation, total active ownership is capped at 64,
  terminal frames release ownership, detach drains only the old incarnation,
  and late frames cannot attach to a replacement. It adds no socket, queue,
  timer, trace accumulation, dispatch, replay, Gateway role, persistence,
  activation, readiness, Status, or Doctor behavior.
- O13 proof passed 26 focused O12/O13 tests, type-aware Oxlint, Oxfmt, diff
  hygiene, and mandatory autoreview with no actionable findings. PR 181 is
  draft and mergeable. No OpenClaw issue, upstream PR, Lobster change, or ADO
  run was created.
- O14 connection ownership is published as OpenClaw fork draft PR 182 at
  `c3a2cd79ea45`, stacked directly on O13. It exposes the O11-O13 frame,
  session-admission, and operation-ownership contracts through one narrow
  Plugin SDK subpath and documents the existing plugin-authenticated WebSocket
  upgrade route as the owner of peer verification, the accepted socket, send
  scheduling, proof-of-possession credentials, and disconnect cleanup. It adds
  no Gateway role, listener, token issuer, socket manager, reconnect protocol,
  Status, or Doctor surface.
- O14 proof passed the SDK export/API-baseline checks, type-aware Oxlint, diff
  hygiene, all 53 focused O11-O13 tests, and mandatory autoreview with no
  actionable findings. Blacksmith and brokered Crabbox proof could not start
  because both remote auth paths require renewal; no lease was created. PR 182
  is draft and mergeable. Real behavior proof, actionlint, no-tabs, and dispatch
  are green; Labeler and Auto response fail only on the fork's missing OpenClaw
  GitHub App private key. No upstream issue/PR, Lobster change, or ADO run was
  created. The next implementation slice is the Lobster external-plugin
  connection-owner adopter against O14.
- The O14 Lobster adopter is published as fork draft PR 55 at `f01fa7d8ab43`,
  stacked on PR 54. It owns one exact plugin-authenticated upgrade route,
  proof-of-possession admission, O14 session/operation registries, serialized
  sends, handshake timeout, exact-incarnation drain/detach, and reconnect with
  no replay. The adapter is a separate lazy package export; the existing
  startup plugin remains inert until deployment provides the two required
  authority ports. `ws` is bundled with an ESM `createRequire` bridge and the
  deterministic bundles are hidden as generated review artifacts.
- PR 55 proof passed 20 Rust package tests including a real loopback WebSocket
  handshake, strict Clippy, repository rustfmt, 11 plugin lifecycle/packaging
  tests, exact O14 public-type compatibility, diff hygiene, and final
  full-access commit autoreview with no accepted/actionable findings. The
  draft is mergeable with no comments or reviews. No checks are attached on
  the personal fork and no ADO pipeline was manually queued. No upstream
  OpenClaw issue/PR or runtime activation was created.
- The deployment-authority follow-up is published as Lobster fork draft PR 56
  at `bb174d675a13`, stacked on PR 55. It implements the existing Rust
  credential-source port with a maximum-five-minute credential bound to the
  peer Ed25519 key fingerprint, audience, binding, owner generation, and bundle
  generation. The lazy plugin verifier checks the domain-separated HMAC token,
  canonical encoding, freshness, exact authority, and nonce-bound Ed25519 proof
  and returns verified peer plus authority atomically, closing the prior
  verifier/authority sampling race.
- PR 56 proof passed 22 Rust package tests, strict Clippy, repository rustfmt,
  17 plugin lifecycle/authority/packaging tests, deterministic bundle drift,
  diff hygiene, and final `codex review --uncommitted` with no actionable
  findings. The draft is mergeable with no comments, reviews, or attached
  checks. No ADO pipeline, runtime activation, upstream issue, or upstream PR
  was created. The next slice is explicit off-by-default deployment composition
  and paired live proof, not default activation.
- The deployment-composition follow-up is published as Lobster fork draft PR
  57 at `98b726c681e2`, stacked on PR 56. Its discriminated selector makes the
  disabled branch side-effect free and gives the selected branch only a
  credential-specific key plus immutable authority. A deterministic test-only
  fixture proves the exact Rust-issued credential through the production
  JavaScript authority and connection owner over a real WebSocket.
- PR 57 proof passed 22 Rust package tests, strict Clippy, repository rustfmt,
  20 plugin lifecycle/authority/composition/packaging tests, bundle drift,
  direct generated-module syntax checking, and diff hygiene. The first
  `codex review --uncommitted` found a duplicate `createRequire` import in the
  composed bundle; that P1 was reproduced, fixed, regression-tested, and the
  required second review passed with no actionable findings. The draft is
  mergeable and clean with no comments, reviews, or attached checks. No ADO
  pipeline, runtime activation, upstream issue, or upstream PR was created.
  The next bounded slice is deployment-owned credential-key projection and
  explicit selection, followed later by broader live Gateway/OpenClaw proof;
  it must remain off by default until its rollout and rollback gates exist.
- The deployment-selection follow-up is published as Lobster fork draft PR 58
  at `86edeaafc859`, stacked on PR 57. Disabled intent carries no authority and
  never invokes the credential-key resolver. Selected intent validates exact
  authority first, resolves one fixed-size domain-separated key, and returns
  one object containing the Rust issuer plus the plugin's directly serializable
  flat authority and credential-only key. JavaScript now consumes that projected
  fixture and no longer receives the fake broad deployment secret.
- PR 58 proof passed 26 Rust package tests, strict Clippy, repository rustfmt,
  20 plugin tests including real WebSocket admission, and diff hygiene. Two
  autoreview P2 findings were reproduced and fixed: authority now validates
  before key resolution, and the Rust authority projection now exactly matches
  the plugin's flat contract. The required third `codex review --uncommitted`
  passed with no actionable findings. The draft is mergeable and clean with no
  comments, reviews, or attached checks. No ADO pipeline, runtime activation,
  upstream issue, or upstream PR was created. The next slice should define the
  runtime peer lifecycle and real Gateway proof only after explicit owner- and
  bundle-generation sources are identified.
- `landing-ledger-2026-07-27.md` is now the canonical consolidation plan. It
  treats the fork portfolio as evidence, reduces the prospective OpenClaw queue
  to O1-O14, maps every hosted-integration implementation/proof draft to
  `LAND`, `EXTRACT`, `LOBSTER`, or `ARCHIVE`, and keeps Hosting Profiles and
  Continuity with their owning projects.
- The first eventual upstream issue candidates are O1 guarded one-hop dispatch,
  O2 exact-origin credential slots, and O4 manifest-first host bundles. No
  upstream issue or PR has been filed. The next operational step is to annotate
  replacement links and close only the ledger's `ARCHIVE` fork drafts without
  deleting their branches.
- The first disposition pass is applied. OpenClaw fork PRs #34, #35, #38,
  #45-#51, #72, #73, #156, #165, #166, #168, and #170 and Lobster fork PRs
  #30-#34, #40, #44, and #48 were commented with replacements and closed.
  Source branches were retained. OpenClaw extraction PRs #43, #52-#54, #59,
  #62, #63, #65, #71, #74, and #75 plus Lobster #8 were annotated but remain
  open. No upstream filing, draft promotion, branch deletion, or ADO queueing
  occurred.
- O2 owner-decision refresh on 2026-07-27: existing issue #104849 remains open
  and unassigned with only the ClawSweeper review. The `no-new-fix-pr`,
  product, security, and maintainer gates remain. Current main
  `8a2852bdfa2e` already exposes SecretRef-backed web-fetch provider ownership
  and guarded fetch through the Plugin SDK, while guarded fetch strips
  Authorization on cross-origin redirects unless retention is explicitly
  allowlisted. The 875-line core credential-slot branch remains evidence only;
  the recommended first consumer is now a Lobster-owned dedicated tool or
  `WebFetchProviderPlugin`. The owner-decision comment was posted at
  https://github.com/openclaw/openclaw/issues/104849#issuecomment-5098490057;
  its source text is `o2-104849-owner-decision-comment.md`.
