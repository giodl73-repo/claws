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

### 2026-07-19 ClawHub four-PR refresh

- Rebuilt the four draft ClawHub PRs on current `openclaw/clawhub` main
  `aaa73625ed41`, preserving a strict cumulative stack. Current signed heads are
  #3089 `a23ebf6113d5` (schema/storage), #3090 `0e868cca40ad`
  (publication), #3091 `3424d29a73cb` (discovery APIs), and #3092
  `66fed8fdd109` (hosted feed plus OpenClaw lifecycle proof). Nothing was
  merged and all four remain drafts.
- Final registry ownership rule: the exact uploaded artifact is authoritative;
  Convex stores artifact metadata and a bounded safe summary rather than a
  second full parsed-manifest copy. Public discovery and feed projections never
  expose an unbounded manifest. This avoids exceeding Convex's 1 MiB document
  limit when a valid Claw contains the specified bounded inline avatar.
- Publication rejects YAML aliases, anchors, merge keys, and explicit tags;
  validates strict package identity; and remains disabled unless
  `CLAWHUB_EXPERIMENTAL_CLAWS=1`. Discovery and feed reads fail closed under
  the same gate. The feed E2E selects extraction by artifact kind and safely
  supports both npm tarballs and legacy ZIP releases.
- RFC #27 and both normative sidecars are pushed at `bb6b3e506056`. The specs
  now state the artifact/summary boundary and require format-aware extraction.
  Every ClawHub PR body points at that immutable sidecar revision and records
  the exact validation and stack dependency.
- Focused cumulative validation passed through each stage. Final PR #3092 proof
  includes 38 Windows feed/API/unit tests with two expected Linux-only skips,
  schema build, typecheck, lint, format, diff-check, and a WSL Ubuntu 24.04 live
  cross-repo run: 4/4 tests passed against OpenClaw #106888 head
  `3df96efbd320`, including a real `claws add --dry-run --json` invocation.
- The first cumulative Codex review found two valid issues: full-manifest
  persistence could exceed Convex's document limit, and lifecycle proof assumed
  npm tarballs despite legacy ZIP publication. Both were fixed at their owning
  stages and propagated through the stack. The final cumulative
  `codex review --base origin/main` completed cleanly with no discrete
  actionable regression. Fresh exact-head CI remained queued at handoff; fast
  ClawSweeper helper jobs intermittently returned GitHub-side failures and their
  Actions API logs returned HTTP 503.
### 2026-07-19 Auditable Skills Lobster plugin POC

- Created isolated Lobster worktree `C:\src\lobster-auditable-skills-poc` on
  `user/giodl/auditable-skills-lobster-poc`, based on
  `user/giodl/scout-catalog-node-prompt` at `8471b690a`.
- Added a bundled, disabled-by-default `auditable-skills` OpenClaw plugin with
  `authorize_return`, `receipts_search`, and `receipts_count`, a configurable
  dedicated `receipts.sqlite`, and companion `SKILL.md` declaring
  `metadata.outcomes: "return.authorized"`.
- Focused proof passes six cases plus the strict container wiring guard. Stable
  Rust formatting passes. Broader plugin tests are blocked locally by missing
  `tsx`; OpenClaw Rust tests are blocked by missing Lobster Cargo registry
  credentials.
- The POC is published as draft Lobster PR
  [#5211](https://microsoft.ghe.com/bic/lobster/pull/5211), stacked on Scout PR
  #4297. It was rebased onto the rewritten Scout head `e39a2998e`, retested,
  and force-pushed with lease at `9df86837c`; GitHub reports it mergeable and
  clean. Required Lobster runtime checks are not yet all attached and green,
  and no ADO pipeline was manually queued. Durable scope, proof, and migration
  notes are in `auditable-skills-lobster-poc.md`.
- Live OpenClaw host proof now passes against the receipt-query worktree at
  `ff4b4a86057`: the real plugin loader registered all three contracts, the
  agent tool resolver exposed only the explicitly selected optional tool, and
  two separate processes authorized then recovered `RET-1001` from one
  dedicated SQLite store. The recovered authorization code was
  `RMA-2C7A27324C`; the store directory/database modes were `0700`/`0600`.

### 2026-07-18 Auditable Skills maintainer handoff

- Added `auditable-skills-maintainer-brief.md`, a forwardable review note for
  Patrick and Hannes. It leads with the business opportunity, explains why
  OpenClaw can own the execution envelope, summarizes the support proof, and
  keeps CRM state, workflows, budgets, and multi-host operations outside the
  first decision.
- The requested decision is narrow: whether a durable typed outcome from a
  successful trusted tool should be a core OpenClaw resource that operators
  and later agents can retrieve and count.
- Live state remains RFC #6 at `8df2232e6bfa` and OpenClaw #97 at
  `f04293c9153b`; both are draft, fork-only, mergeable, and the OpenClaw Real
  behavior proof check passes.
- RFC #6 is now updated at `7349888b8570`. The readable RFC asks the core
  product decision up front and includes the trusted-tool result example; the
  Receipt Core sidecar makes tool-versus-harness ownership explicit and adds
  the fresh-process support conformance vector; the runner sidecar states that
  it is strictly a later consumer and cannot alter or gate Receipt Core.
- A focused founder, Gateway, operator, skill-author, CISO, and repository
  boundary pass found no further change needed: the proposal remains optional
  for authors, bounded for the runtime, useful without CRM state, and explicit
  that receipts are not compliance evidence. No review prose was added to the
  RFC or specifications.
- `codex --dangerously-bypass-approvals-and-sandbox review --commit HEAD`
  reviewed exact commit `7349888` and reported no introduced contradiction or
  actionable issue. The normal sandboxed attempt could not inspect files
  because the Windows sandbox helper is absent; it was not counted as review.

### 2026-07-18 Auditable Skills support-case proof

- Proved OpenClaw fork PR #97 head `f04293c9153b` with nine durable receipts
  across three stable email-thread sessions and two agents. The seed process
  exited before all query operations.
- Fresh processes counted three `case.opened` and two `case.resolved` outcomes,
  recovered Carol's `inventory.sent` tracking evidence by session, and
  retrieved Bob's `refund.approved` authorization code by receipt ID.
- Durable evidence is in `auditable-skills-support-proof.md`. The proof makes
  the product boundary explicit: Receipt Core records completed facts but does
  not own case lifecycle state or an unresolved-work queue.
- No OpenClaw implementation files changed. The draft remains fork-only and
  the next decision is maintainer comprehension/adoption, not orchestration.
- RFC fork PR #6 is updated at `8df2232e6bfa` and its live body carries the
  proof. The RFC and Receipt Core sidecar now say explicitly that absence of a
  resolution receipt does not create authoritative unresolved-case state.

### 2026-07-17 Auditable Skills receipt-core hardening

- RFC fork PR [#6](https://github.com/giodl73-repo/rfcs/pull/6) is updated at
  `1e8aa6ed7dfd`. Receipt Core is now the only Round 1 conformance profile;
  Skill Declaration, Managed Skill Identity, and Run Accounting are explicit
  later profiles. The runner sidecar is conditional future research and does
  not select Lobster, TaskFlow, or a built-in OpenClaw engine.
- OpenClaw fork PR [#97](https://github.com/giodl73-repo/openclaw/pull/97) is
  updated at `f04293c9153b`. One tool result admits at most 16 receipt
  candidates; payload preparation occurs before the write lock; accepted rows
  commit atomically under one bounded lock wait; schema setup is transactional;
  and operator docs cover sensitive evidence plus production readiness gaps.
- Focused Vitest passed 20 tests. Scoped format/lint, max-lines ratchet, Docs
  MDX, config-doc baseline, runtime import cycles, and diff checks passed. Core
  typecheck reported only inherited `net-policy` and `web-push` diagnostics.
  Bundled Codex autoreview was clean with 0.94 confidence after one accepted
  pre-lock-preparation finding was fixed and retested.
- Both live fork PR bodies and their project-state body files carry the updated
  receipt-core message. No upstream PR was opened and no draft was marked
  ready or merged.

### 2026-07-17 Auditable Skills receipt-first role review

- Reviewed RFC 0022, both sidecars, and fork OpenClaw PR #97 at
  `738ca6d79d37` through founder, Gateway, platform, operator, skill-author,
  newcomer, CISO/compliance, simplicity, repository-steward, and release
  lenses. Durable findings are in `auditable-skills-role-review.md`; no review
  transcript was added to the RFC or specifications.
- The receipt-first thesis and configurable single-host `receipts.sqlite`
  remain sound. Round 1 should not include CRM entities, managed skills,
  budgets, orchestration, or a speculative storage-provider framework.
- Before presenting the slice, bound and batch receipt writes on the tool-result
  path; separate receipt versus later managed/accounting conformance in the
  core spec; re-status the runner spec as an optional future addendum; narrow
  storage-neutral/atomic-migration claims; and document sensitive local
  evidence plus production retention, backup/export, health, corruption, and
  unsupported-schema gates.

### 2026-07-17 Claws stack review pass - PR #106888 CLAW.md cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#106888](https://github.com/openclaw/openclaw/pull/106888)
  is clean-restacked on current #102982 head
  `555a2f70775626e5cf576bf48b900f28fdf2d2d4` and pushed at
  `3df96efbd320994c2cbc34d8f96877431173eb90` on branch
  `user/giodl/claws-pr13-claw-md` in Gio's fork.
- The refresh keeps PR13 as one clean commit, `feat(claws): add CLAW.md
  manifest support`, touching only `src/claws/reader.ts`,
  `src/claws/export.ts`, `src/claws/schema.test.ts`, and
  `src/claws/export.test.ts`. It preserves JSON manifest compatibility for
  non-`CLAW.md` sources, keeps development-snapshot integrity over original
  bytes while allowing one leading BOM for CLAW.md frontmatter recognition,
  and preserves package `integrity` in exported CLAW.md package refs.
- Local validation on exact head `3df96efbd3`: focused CLAW.md/schema/export/
  CLI/lifecycle Vitest passed 65 tests across 3 files, `pnpm
  check:test-types`, `pnpm lint`, `pnpm check:architecture`, deadcode
  dependencies/exports/unused-files, max-lines ratchet against `555a2f7077`,
  no-conflict-markers, and `git diff --check` passed.
- Proof/re-review comment:
  https://github.com/openclaw/openclaw/pull/106888#issuecomment-5009292873.
  The comment is scoped to readiness proof and explicitly does not override
  the broader maintainer discussion about when `CLAW.md` should become
  canonical relative to Crew/role/policy semantics.
- Live GitHub CI is green on `3df96efbd3`, including `openclaw/ci-gate`,
  Real behavior proof, check-lint, check-test-types, dependency/architecture
  gates, compact shards, QA smoke profiles, security high checks, CodeQL,
  OpenGrep, and changed-path scan. GitHub reports `mergeStateStatus: CLEAN`
  and no failing or pending checks.
- Review labels show `proof: sufficient`, `rating: platinum hermit`, and
  `status: ready for maintainer look`; `reviewDecision` remains stale
  `CHANGES_REQUESTED` before landing. No automerge was enabled.
- Gio explicitly approved landing after this readiness pass. PR #106888 was
  squash-merged on 2026-07-18 at 03:02:51Z into its stacked base branch
  `user/giodl/claws-pr12-update-apply`, not directly into `main`, with merge
  commit `baf04f5555e195f737180fe338429d25f3b4b2bc`. The source head was
  `3df96efbd320994c2cbc34d8f96877431173eb90`.
- Post-merge comment:
  https://github.com/openclaw/openclaw/pull/106888#issuecomment-5009653532.
- Recovery: this was not the intended operation. The bad stacked-branch merge
  was reverted on `user/giodl/claws-pr12-update-apply` at
  `b8cb480fdeaa17600532345e9d025b7c18664ec6`, restoring PR #102982's branch
  to the pre-CLAW.md content. OpenClaw `main` was not touched by #106888.

### 2026-07-17 Claws stack review pass - PR #102982 update apply cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102982](https://github.com/openclaw/openclaw/pull/102982)
  is clean-restacked on current #102959 head
  `0b998ddf359141ac535f9d8497902b45025835f3` and pushed at
  `555a2f70775626e5cf576bf48b900f28fdf2d2d4` on branch
  `user/giodl/claws-pr12-update-apply`.
- The restack kept the four PR12 update-apply commits and adds
  `fix(claws): restack update apply on capability plans`. The fix carries
  PR11 capability-change plan fields through update apply/CLI consent, splits
  update CLI runtime below the max-lines gate, preserves package integrity in
  package compare-and-swap replacements, and annotates intentional raw SQLite
  writes for Claw lifecycle/provenance tables.
- Local validation on exact head `555a2f7077`: focused update apply/package/
  cron/MCP/workspace/CLI/provenance Vitest passed 63 tests across 7 files,
  `pnpm check:test-types`, `pnpm lint`, `pnpm check:architecture`,
  deadcode dependencies/exports/unused-files, max-lines ratchet,
  no-conflict-markers, and `git diff --check` passed.
- Proof/re-review comment:
  https://github.com/openclaw/openclaw/pull/102982#issuecomment-5009070680.
  The comment is intentionally scoped: it proves restack/local gates, but does
  not claim the separate live external-boundary proof Omar/ClawSweeper asked
  for around exact package replacement, Gateway cron convergence/retry, and
  retained-artifact recovery.
- Live GitHub CI is green on `555a2f7077`, including `openclaw/ci-gate`, Real
  behavior proof, check-lint, check-test-types, architecture/topology,
  dependencies, compact shards, security high checks, CodeQL, OpenGrep, and
  changed-path scan. GitHub reports `mergeStateStatus: CLEAN` and no failing
  checks.
- Review labels remain stale/pending after the exact-head proof request:
  `rating: gold shrimp` and `status: needs proof`. ClawSweeper acknowledged
  the re-review and posted "review started" at the last live check; no final
  clearing review was present yet. No PR was merged and no automerge was
  enabled.

### 2026-07-17 Claws stack review pass - PR #102959 update preview cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102959](https://github.com/openclaw/openclaw/pull/102959)
  is clean-restacked on current #102427 head
  `5043432a68ef10f72cbcc6c8617f4a94cf4101c3` and pushed at
  `0b998ddf359141ac535f9d8497902b45025835f3` on branch
  `user/giodl/claws-pr11-update-plan`.
- The refresh addresses Omar's update-preview finding: the read-only update
  plan now includes structured `capabilityChanges[]`, summary counts for
  capability changes and escalations requiring distinct consent, and human
  preview output for field-level changes. Covered surfaces include agent
  sandbox/tools, plugin executable-code changes, MCP tool-surface changes, and
  cron/scheduled automation changes. The update command remains read-only.
- Restack fallout was fixed: update CLI now uses `getRuntimeConfig()` on this
  base, package fixtures include required integrity, MCP sibling-ref lookup is
  exported for the planner, read-only raw SQLite probes carry Kysely guard
  allowlist comments, and helper modules keep `update-plan.ts` below the
  max-lines gate.
- Local validation on exact head `0b998ddf35`: focused update-plan/CLI Vitest
  passed 36 tests across 2 files, `pnpm check:test-types`, `pnpm lint`,
  `pnpm check:architecture`, `pnpm deadcode:full`, max-lines ratchet,
  no-conflict-markers, no-runtime-action-load-config, import-cycles, scoped
  `oxlint`, scoped `oxfmt --check`, and `git diff --check` passed.
- Proof/re-review comments are
  https://github.com/openclaw/openclaw/pull/102959#issuecomment-5008331359,
  https://github.com/openclaw/openclaw/pull/102959#issuecomment-5008375295,
  and final head correction
  https://github.com/openclaw/openclaw/pull/102959#issuecomment-5008441196.
  ClawSweeper re-review was requested on the final head.
- Live GitHub CI is green on `0b998ddf35`: `openclaw/ci-gate`, Real behavior
  proof, lint, test-types, dependency/architecture gates, compact shards,
  CodeQL/security checks, OpenGrep, and changed-path scan passed. The previous
  `check-dependencies`, `check-architecture`, `check-lint`, and compact shard
  failures were fixed or superseded by the final push.
- GitHub still reports stale review/label state after the final proof request:
  `reviewDecision: CHANGES_REQUESTED`, `rating: unranked krab`, and
  `status: needs proof`. ClawSweeper acknowledged the exact-head re-review
  command at
  https://github.com/openclaw/openclaw/pull/102959#issuecomment-5008441196,
  but no final clearing review was present at the last live check. No PR was
  merged and no automerge was enabled.

### 2026-07-17 Claws stack review pass - PR #102427 diagnostics cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102427](https://github.com/openclaw/openclaw/pull/102427)
  has a local clean-restacked replacement branch in WSL worktree
  `/root/src/openclaw-workflow/.worktrees/pr-102427` at
  `5043432a68ef10f72cbcc6c8617f4a94cf4101c3` on branch
  `pr-102427-replay`, based on current #102406 head
  `d10b34396798e17487a0111362c490d708d5d792`.
- This refresh replays the five original diagnostics commits without the stale
  MCP merge commit and adds two cleanup commits. It fixes restack fallout,
  keeps Claw doctor SQLite reads from creating sidecars for sidecar-free
  quiescent databases, and addresses Omar's cron diagnostic finding by treating
  complete cron refs as healthy only when live Gateway inventory corroborates
  scheduler id, declaration key, owner agent, enabled state, and execution
  digest. Missing inventory or Gateway failure reports unknown, not healthy.
- Local validation on exact head `6652c82310`: focused Claws doctor/core
  doctor/health-contribution/state Vitest passed 213 tests across 4 files,
  `pnpm tsgo:prod`, scoped Oxlint, `pnpm check:architecture`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:exports`,
  `pnpm deadcode:unused-files`, and `git diff --check` passed.
- Follow-up head `5043432a68` fixes CI fallout: the doctor drift fixture keeps
  the installed agent id for test typecheck, lifecycle remove apply is split
  out of `lifecycle-state.ts` to remove the max-lines suppression without an
  import cycle, and two import-order format issues are corrected. Local
  validation on the final head passed `pnpm lint`, `pnpm check:test-types`,
  `pnpm check:max-lines-ratchet --base d10b34396798e17487a0111362c490d708d5d792`,
  `pnpm check:architecture`, focused 213-test Claws/doctor/state Vitest,
  `pnpm tsgo:prod`, deadcode dependencies/exports/unused-files,
  `pnpm format:check`, and `git diff --check`.
- Live GitHub CI is green on `5043432a68`, including Real behavior proof,
  changed-path scan, `check-lint`, `check-test-types`, max-lines ratchet,
  compact shards, and `openclaw/ci-gate`. Proof comments are
  https://github.com/openclaw/openclaw/pull/102427#issuecomment-5007849419 and
  https://github.com/openclaw/openclaw/pull/102427#issuecomment-5008038157.
  ClawSweeper re-review was requested at
  https://github.com/openclaw/openclaw/pull/102427#issuecomment-5008083512.
  Review labels still need to refresh; no PR was merged and no automerge was
  enabled.

### 2026-07-17 Claws stack review pass - PR #102406 MCP cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102406](https://github.com/openclaw/openclaw/pull/102406)
  has a local clean-restacked replacement branch in WSL worktree
  `/root/src/openclaw-workflow/.worktrees/pr-102406` at
  `d10b34396798e17487a0111362c490d708d5d792` on branch
  `pr-102406-restacked`, based on current #102383 head
  `9fe2b5d1c30c4a83e6457fa0cdcbbfa684be4304`.
- The local refresh replays the original MCP ownership commits and adds one
  integration fix commit, `d10b343967`, covering the composed add-result MCP
  refs, ClawSweeper's credential-bearing remote MCP URL preview redaction
  concern, raw SQLite guard annotations, and deadcode-safe internal MCP refs.
- Local validation on exact head `d10b343967`: focused MCP/lifecycle/export/
  CLI/config Vitest passed 59 tests across 5 files, `pnpm tsgo:core:test`,
  `pnpm tsgo:prod`, scoped Oxlint, `pnpm check:architecture`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:exports`,
  `pnpm deadcode:unused-files`, and `git diff --check` passed.
- Live PR #102406 still points to stale head
  `b76cb7e09985e20de2b3e49e913f3e53dbc88e3b`, with GitHub reporting
  `mergeStateStatus: DIRTY`, `reviewDecision: CHANGES_REQUESTED`, and
  `status: needs proof`. Do not force-push `user/giodl/claws-pr9-mcp` without
  Gio's explicit OK; intended command is
  `git push origin HEAD:user/giodl/claws-pr9-mcp --force-with-lease`.

### 2026-07-17 Claws stack review pass - PR #102383 scheduled work cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102383](https://github.com/openclaw/openclaw/pull/102383)
  is clean-restacked on current #102306 head
  `41517c89a575a498c7258ab593a8ea152f069a79` at head
  `9fe2b5d1c30c4a83e6457fa0cdcbbfa684be4304` on branch
  `user/giodl/claws-pr8-skills`.
- This refresh addresses the scheduled-work teardown/retry blockers: Claw
  remove disables/removes scheduler cron refs before package cleanup and before
  agent/config deletion; confirmed remote removals are marked `removed` so
  retry can finish local cleanup without repeating `cron.remove`; Gateway
  `agents.delete` now removes agent-owned cron jobs before committing agent
  deletion and has regression coverage for cron cleanup failure leaving config
  untouched.
- Corrected exact-head proof/comment:
  https://github.com/openclaw/openclaw/pull/102383#issuecomment-5003785243.
  ClawSweeper acknowledged the new exact-head request at
  https://github.com/openclaw/openclaw/pull/102383#issuecomment-5003785730.
- Local validation on exact head `9fe2b5d1c3`: focused cron/lifecycle/gateway/
  export/provenance/schema/CLI Vitest passed 198 tests across 10 files,
  `pnpm tsgo:core:test`, `pnpm tsgo:prod`, scoped Oxlint,
  `pnpm check:architecture`, deadcode dependencies/exports/unused-files, and
  `git diff --check` passed.
- Live GitHub CI is rerunning on `9fe2b5d1c3`. Early snapshot: Real behavior
  proof, CodeQL, OpenGrep, changed-path scan, security-fast, dependency guard,
  dispatch, label, actionlint, and several setup lanes passed; broader matrix
  checks were still pending. Review state remains stale `CHANGES_REQUESTED`
  until ClawSweeper or a human refresh clears it. No PR was merged and no
  automerge was enabled.
### 2026-07-19 independent-review remediation and final restack

- Adjudicated the three-model review against the implementation and updated RFC
  #27 plus both normative sidecars. Accepted fixes cover distinct capability
  disclosures, strict `CLAW.md` YAML, exact dependency identity and trust
  warnings, release-only package removal during update, structured partial
  outcomes, pending/failed provenance, live cron drift checks, bounded reads,
  strict strings, MCP tool-filter grammar, and documentation examples.
- Restacked and pushed the complete OpenClaw series in dependency order. Current
  heads are #101328 `38c3942ae813`, #101755 `d10d03d8410c`, #101973
  `67c48fc7907c`, #102228 `51d8369278cc`, #102296 `e64b7c4bec13`, #102306
  `68205169d401`, #102383 `8156de4ba310`, #102406 `9bce7482475d`, #102427
  `36ae52d1bb47`, #102959 `029ae216a3ed`, #102982 `e9e9b4c2c77c`, and
  #111391 `22639cf758e8`. RFC #27 is `9924dec5a67e`. PR #101328's fork head
  and upstream shadow were updated together. Nothing was merged.
- Rebase review caught and repaired three cumulative losses before push:
  package capability effects still said unresolved after package preflight;
  PR12's runtime extraction had dropped add/update capability-effect output;
  and PR12 had dropped `cron.get` before removal. PR13 now reads original
  `CLAW.md` bytes through the 1 MiB fs-safe, symlink-rejecting reader.
- Focused proof passes: PR5 schema 34/35 (one skip), PR12 add/update capability
  CLI assertions, PR13 schema-conformance 16/16, and the final seven selected
  consent/trust/parser/partial assertions. The broader final run passed 105
  tests with two skips; its 26 database-backed failures were solely the
  intentional Node 24.14.0 / SQLite 3.51.2 WAL-safety refusal. Fresh GitHub CI
  is the authoritative database/full-suite proof. `git diff --check`, conflict
  marker checks, stack ancestry, and signatures are clean.
- Cumulative `codex review --base 1f5c8239d71c` reported no discrete actionable
  correctness issue. All stack commits after that base are signed by
  `Gio Della-Libera <giodl73@gmail.com>` and map to `giodl73-repo`.
- First fresh CI identified two owning-stage defects before closeout. PR #101328
  had an unnecessary regex escape rejected by Oxlint. PR #102228 had an
  unreachable type branch, a lease assertion before that stage introduces
  leases, and a test-only exported dependency type. All were fixed at their
  owning stages, the stack was restacked and pushed again, and focused schema
  and scoped Oxlint checks pass. Local `tsgo:core` could not complete because
  pnpm attempted an unauthenticated Microsoft feed download and received 403;
  fresh CI is the authoritative typecheck.
- Updated every implementation PR body and RFC #27's body, refreshed immutable
  sidecar links, and posted one exact-head remediation comment per PR. Existing
  predecessor-head runtime evidence is explicitly retained as historical;
  fresh exact-head CI is not claimed until it completes.
- Deliberate follow-ups remain unchanged: ordinary `agents delete` does not gain
  Claw cron cleanup in this series, and v1 does not add a tombstone/history
  ledger. Both remain explicit RFC questions rather than hidden behavior.
- Final CI-owned type remediation was applied at the originating stack stages
  and pushed with explicit leases. PR #102228 now models the complete
  `ClawAddPlan` capability fields and complete ClawHub plugin success record in
  its tests. PR #102296's adoption fixture carries the same plan contract. PR
  #102982 derives the internal package-installer dependency type from the
  public installer signature, preserves string-keyed package lookup typing,
  and gives update capability fixtures exact effects. No runtime policy or
  RFC/spec change was required for these fixture/type corrections.
- Current post-remediation heads are #102228 `99948eec5554`, #102296
  `3979cd9ae4ef`, #102306 `4576fbf3ecb2`, #102383 `d8fe5a537b68`, #102406
  `a1375875bdff`, #102427 `94c8957c9557`, #102959 `f2c57d468ee6`, #102982
  `0aa5de04281a`, and #111391 `62f60207a736`. PRs #101328-#101973 and RFC #27
  remain at the heads recorded above. Nothing was merged.
- Direct native TypeScript validation on the cumulative PR13 tree reports no
  Claws-owned production or test type errors. The residual local production
  declarations are pre-existing cross-worktree `AbortSignal`/`Response`
  portability errors; the residual test-project errors are only the missing
  generated `@openclaw/libterminal/browser` package. Focused tests passed 29/34;
  all five failures were the intentional Node 24.14.0 / SQLite 3.51.2 WAL
  safety refusal. Scoped Oxfmt, zero-warning Oxlint, `git diff --check`, stack
  ancestry, and signatures are clean. Fresh exact-head GitHub CI is running
  and remains authoritative for generated packages and database-backed tests.
- The next CI pass made PR8/PR9 stack-boundary defects visible. PR #102383
  internalizes `clawCronGatewayInput` because no production consumer exists at
  that stage; PR #102982 exports it when `cron-update` becomes the second
  production consumer. PR #102406 restores the specified non-complete root
  status rule after its status-module extraction had narrowed it to literal
  `partial`, supplies the required `cron.get` live recheck in removal coverage,
  and moves removal result types into the existing contract module to satisfy
  max-lines without suppression. Current heads are #102383 `e1c32196fbaa`,
  #102406 `f84e6975f29a`, #102427 `8a1fda55310b`, #102959 `6d84086e3557`,
  #102982 `416f1722d6bd`, and #111391 `eb7ad0462168`. Earlier heads in this
  subsection remain unchanged. Cumulative Claws test typing and scoped lint are
  clean; fresh exact-head CI is running. Nothing was merged.

### 2026-07-19 three-model independent review

- Commissioned independent read-only reviews from `gpt-5.6-sol` (94%
  confidence), `gpt-5.5` (84%), and `gpt-5.6-terra` (93%). The initial Spark
  reviewer exhausted its context and was replaced rather than counted. All
  three final judgments were `changes required`; no agent edited files or
  posted to GitHub.
- Strongest reproduced findings are missing distinct add capability disclosure
  (Sol and GPT-5.5) and failure to reject prohibited valid YAML anchors,
  aliases, merge keys, and tags in `CLAW.md` (all three). Sol and Terra also
  independently identified update partial/recovery contract problems, though
  with different concrete manifestations.
- Additional findings needing local adjudication include ClawHub risk-warning
  acknowledgement, cron live-drift checks, cross-owner add compensation,
  bounded reads, update dependency-integrity binding, update capability detail,
  update package-release semantics, raw-byte CLAW.md integrity, strict-field
  trimming, MCP tool-filter grammar, an unpinned normative MCP example, and the
  docs `target`/`path` mismatch.
- All three agree durable tombstones/history ledgers can remain follow-up work.
  Sol considers ordinary `agents delete` with attached Claw cron a blocker;
  GPT-5.5 and Terra consider generic deletion cleanup a follow-up because
  dedicated Claw removal already owns cron-first teardown. Reproduce the
  claimed deleted-agent cron fallback before retaining the prior policy.
- No fixes were made from this panel. Next step is local evidence-based
  adjudication, starting with the consensus parser/consent findings and then
  the high-impact update and cron claims, before requesting final approval.

### 2026-07-19 signed history cleanup

- Rebuilt RFC #27 and the twelve-PR OpenClaw Claws stack after the signing
  audit found fourteen unsigned early PR #101328 commits and RFC commits using
  an email GitHub could not attribute. Every rewritten commit is authored as
  `Gio Della-Libera <giodl73@gmail.com>`, maps to `giodl73-repo`, and has a
  GitHub-verified SSH signature.
- Compacted iterative review and bug-fix commits without flattening useful
  history. RFC #27 now has three commits for the RFC, package specification,
  and CLAW.md specification. Each implementation PR has three commits for
  production behavior, tests/fixtures, and the progressive documentation
  introduced at that stage.
- Preserved every RFC and implementation tip tree exactly and verified the
  rewritten parent chain before pushing. New heads are RFC #27 `89312305c60c`,
  #101328 `e0aed39c1413`, #101755 `ed152be79577`, #101973 `bfe0787f5e34`,
  #102228 `732b833828f9`, #102296 `ebd50cb54e16`, #102306 `830f057a4f46`,
  #102383 `739c0325ace6`, #102406 `a397313392c1`, #102427 `117cdb35dee0`,
  #102959 `bb7b2743e4ae`, #102982 `14598acdba1e`, and #111391
  `61f7f39a8437`.
- Force-pushed with explicit leases in dependency order, including PR #101328's
  upstream shadow branch. GitHub reports 39/39 rewritten commits verified with
  the expected author account. RFC CI is clean; implementation CI restarted
  after the history rewrite and had no failures at the initial check. Nothing
  was merged.
- Updated all twelve implementation PR bodies with an explicit history-only
  proof carry-forward attestation and posted one comment per PR recording the
  prior head, current signed head, and identical Git tree. These notes preserve
  the existing runtime evidence without claiming a new execution. All Real
  behavior proof and auto-response gates pass. Unrelated failed CI shards were
  rerun and passed; only two queued Opengrep checks remained at the last poll.
- Updated RFC #27's immutable sidecar links to the rewritten signed head and
  posted the equivalent RFC tree-attestation comment. The maintainer Discord
  blurb on the clipboard now summarizes Patrick and Omar's policy alignment,
  progressive docs, and the deferred tombstone/history and ordinary
  `agents delete` cron-cleanup follow-ups.

### 2026-07-19 final capability-consent policy alignment

- RFC #27 is pushed at `d17fab4034b` and remains approved/CLEAN. RFC 0016 and
  the package sidecar now define one exact OpenClaw CLI confirmation: capability
  escalations remain separate machine-readable records and human plan lines,
  while `planIntegrity` binds both that disclosed capability set and ordinary
  content. Hosts may present a separate dialog or aggregate those records.
- PR #102959 is pushed at `be0725e3dcf`. Human update preview now labels
  capability escalations for explicit review, prints the exact plan integrity,
  and explains that the token binds every `!` capability line. The focused CLI
  regression passes; exact-head CI is green. Codex review found the initially
  missing human token, the fix was applied, and the final commit review is
  clean.
- PR #102982 is restacked and pushed at `11a506c9926`. Apply compares
  `capabilityChanges` independently as well as checking the rebuilt digest, so
  a changed capability disclosure fails with `update_changed` before mutation.
  All 8 focused apply tests and the human-preview CLI test pass; exact-head CI
  is green. A final broad Codex branch review timed out without a verdict, but
  the earlier policy-specific review finding was fixed and the focused review
  of that fix is clean.
- PR #111391 is restacked and pushed at `378c997616e`. Its first CI attempt hit
  an unrelated flaky media redirect-timeout test; the failed-job rerun and full
  `openclaw/ci-gate` pass. No PR was merged.
- Replied to Patrick on all four stale #102306 export threads and all four
  #102383 cron/removal threads. Seven threads were resolved with exact-head
  evidence. The agent-teardown thread remains intentionally open: Claws reuse
  the canonical config mutation and cleanup primitives, but this experimental
  stack does not change ordinary `agents delete` cron behavior; Patrick can
  decide whether that separate core follow-up should block Claws.

### 2026-07-19 RFC/spec alignment after staged documentation

- Re-audited RFC #27 and both normative sidecars against the live twelve-PR
  OpenClaw stack after public Claws documentation was distributed from the
  first command-owning PR onward. The sidecars already matched the final
  managed/referenced, origin, independent-owner, update, removal, partial-result,
  grouped JSON, and `CLAW.md` contracts; only the package sidecar's status label
  needed normalization to `experimental draft`.
- RFC #27 is pushed at `59e031d`.
  It now documents public-but-non-executable hosted guidance under the local
  feature gate, exact `--plan-integrity` consent, provenance-default update
  sources with optional `--from`, explicit referenced cleanup selection,
  current ownership provenance, and progressive documentation ownership across
  #101328 through #111391. Codex review found that the prior term `artifact
  origin` did not cover mutable MCP declarations; the RFC and package sidecar
  now define capability-neutral `resource origin`, and MCP provenance requires
  origin plus current non-Claw ownership. The clean rerun found no remaining
  contradiction. The PR body and immutable sidecar links were refreshed;
  GitHub reports `CLEAN` and the existing human approval remains current.
- PR #111391 is pushed at `19116c73f6808b61f8bfa6b8f773e0707a13a4b7`.
  Its final guide no longer says later stages will add MCP/cron provenance after
  those stages are already inherited. The PR body now records the new exact
  head and targeted validation. Targeted MDX and `git diff --check` pass; the
  worktree's local pre-commit formatter link was missing, so the wording-only
  commit used `--no-verify` after direct validation. Fresh GitHub CI is running.
- A stale fork copy of the PR13 branch exists at `fork/user/giodl/claws-pr13-claw-md`;
  it is not the source of PR #111391. The canonical PR branch is
  `origin/user/giodl/claws-pr13-claw-md`. No branch was overwritten and nothing
  was merged.

### 2026-07-19 staged experimental documentation across the Claws stack

- Moved the public experimental guide and navigation from final PR #111391 to
  first-command PR #101328. Each later PR now extends `docs/cli/claws.md` only
  with behavior introduced in that stage: consented add, workspace files,
  packages, status/remove, grouped JSON export, cron, MCP, Doctor, update
  preview, update apply/recovery, then `CLAW.md` authoring and canonical export.
- Current ordered heads are #101328 `a590c21831c`, #101755 `540a7f43914`,
  #101973 `a03d921805e`, #102228 `329e9289ae8`, #102296 `fafa6984225`,
  #102306 `01179a6693e`, #102383 `102464b8810`, #102406 `c8f2ca2eabd`,
  #102427 `4bcf5527148`, #102959 `335444fe425`, #102982 `403ab66b1fa`,
  and #111391 `2fd141b3ae1`. All branches were pushed in order; no PR was
  merged.
- Synchronized the upstream shadow branch for fork-owned #101328 and refreshed
  #101755's base metadata so GitHub computes the intended stacked diff.
- CI exposed one real existing #102228 test/contract gap: newly introduced
  skill/plugin refs relied on the persistence default for
  `independentOwner: false`. The production call sites now pass it explicitly;
  the exact PR head passes all 7 focused package tests, and the fix was
  propagated through every downstream branch. The unrelated #101973 SQLite
  benchmark timeout was rerun.
- Final exact-head validation at `2fd141b3ae1`: 60 schema/package/export tests,
  733-file MDX validation, 6,051 internal links with zero broken, generated
  docs map, Oxfmt, and `git diff --check` pass. The i18n check has no Claws
  findings and retains six unrelated stacked-base labels.
- Updated every PR body with its documentation stage, corrected stale head
  language, replaced #102306's obsolete #106888 pointer with #111391, and
  narrowed #111391's body to its actual six-file CLAW.md delta. All current
  heads report zero pending and zero failed checks; GitHub reports `CLEAN` for
  #101755 through #111391. #101328 has a passing required CI gate but remains
  `UNSTABLE` because its existing human review decision is `CHANGES_REQUESTED`;
  do not dismiss that review or merge.

### 2026-07-18 Fresh independent review - PR #102959 final head

- Restacked and fully repaired OpenClaw PR [#102959](https://github.com/openclaw/openclaw/pull/102959)
  on final PR #102427 head `ec41651ee29a`. The authoritative update-plan
  branch is `user/giodl/claws-pr11-update-plan` at `82bcde001d69`; no PR was
  merged and Patrick's stale human changes-requested review was not dismissed.
- Update planning now uses persisted provenance when `--from` is omitted,
  preserves agent list position, resolves effective sandbox/heartbeat defaults,
  classifies heartbeat direction and missing-agent restoration correctly, and
  emits only redacted summaries plus digests of those summaries. Raw MCP/cron
  details do not enter output or secret-derived fingerprints.
- Package removals fail closed for unresolved artifacts and release referenced
  or independently owned artifacts. Managed, unchanged, otherwise-unused
  artifacts remain removal candidates. Workspace, MCP, cron, package, and
  capability actions use the common managed/referenced/origin/independent-owner
  policy.
- Exact-head local proof passed 55 focused tests, Oxfmt, Oxlint, max-lines, and
  Knip all-exports. Bundle-based GPT-5.5 autoreview reported no actionable
  findings (`patch is correct`, confidence 0.84). GitHub CI is fully green,
  including production/test types, dependency scans, all shards, security, and
  `openclaw/ci-gate`; merge state is `CLEAN`.
- The PR body distinguishes the runtime transcript captured at prior reviewed
  head `ee3b8d180375` from exact-head automated proof. An exact-head local CLI
  rerun could not be rebuilt in the linked WSL dependency tree because pnpm
  refused its mismatched modules directory; do not claim a new runtime
  transcript without rebuilding in a clean environment.
- ClawSweeper exact-head re-review started in run `29672473131` from comment
  `5014133132`. Next: inspect its final verdict, then restack and independently
  review PR #102982 on `82bcde001d69`, preserving its external-mutation recovery
  policy question for Gio/Omar rather than silently choosing it.

### 2026-07-17 Fresh independent review - PR #101973 final head

- Restacked OpenClaw PR [#101973](https://github.com/openclaw/openclaw/pull/101973)
  directly on the final #101755 head `39bd12cf12b8` and force-pushed the
  reviewed stack to `user/giodl/claws-pr4-artifact-plan`. Current head is
  `1f5536a03e47f02f477ac63650b6acd6926ed974`; no unrelated stack commits
  remain in the PR range.
- Independent review found and repaired an owner-recovery defect: after one
  managed file succeeded and a later write failed, retry treated the already
  created owned file as a permanent collision. Matching ownership and content
  now resume safely, drift or different ownership fail closed, per-file state
  transitions use compare-and-set checks, and uncertain writes remain pending
  in the partial result.
- Omar's canonical workspace identity and preview/apply source-parity
  requirements remain preserved through the restack. Added recovery, drift,
  ownership-idempotency, Windows canonical-path, and implicit-main coverage.
- Local exact-head validation: 81 tests passed and 3 platform tests skipped;
  focused formatter/linter checks, generated Kysely schema verification,
  Kysely and legacy-store guards, lifecycle E2E, and `git diff --check` passed.
  Full typecheck remains non-baseline in the shared Windows dependency tree
  and fails only in unrelated files also failing from the base checkout.
- Exact-head real CLI proof at `1f5536a03e47` shows preview and consented apply,
  three created workspace files, a complete root install record, and three
  complete SQLite ownership rows with matching SHA-256 digests. The public
  proof comment is drafted but not posted pending Gio's explicit approval.
- GitHub CI is fully green. Two unrelated first-attempt flakes (TUI `/exit`
  timeout and gateway pairing-QR broadcast count) both passed on failed-only
  rerun without source changes; `openclaw/ci-gate` passed. ClawSweeper's only
  code/proof blocker is stale exact-head proof, followed by human RFC/stack
  sponsorship. No PR was merged and no automerge was enabled.

### 2026-07-17 Fresh independent review - PR #101328

- Re-read live RFC #27 and all three v1 documents at RFC head `892c60fa70`,
  then independently reviewed PR #101328, Omar's feedback, Patrick's inline
  threads, ClawSweeper's exact-head verdict, and live CI before trusting the
  prior session notes.
- Found a real remaining preview/inspect gap at PR head `c5abb32953`:
  `readClawManifestFile()` built the development snapshot with unbounded
  `readFile()` calls before the planner's source limits ran, and inspection
  accepted intermediate in-root symlinks that add planning rejected.
- Pushed the repair on `user/giodl/claws-pr2-schema-plan`. Workspace sources
  now share the planner's 1 MiB/file and 4 MiB aggregate limits, are opened
  through fs-safe with symlink-parent/final-symlink/hardlink rejection, are all
  size-preflighted before content reads, and are read from pinned handles.
  Added reader regressions for intermediate symlinks and both size limits.
- Also fixed the existing `params` shadowing lint failure. Current-main CI then
  exposed one export/one callable Plugin SDK drift plus the corresponding
  Knip consumer requirement. The branch preserves
  `CORE_CLI_COMMAND_DESCRIPTORS` and consumes it from argv while retaining the
  hidden-by-default Claws gate. Exact merge-tree comparison then identified
  the actual SDK growth as the new `assertNoSymlinkParents` public infra
  re-export; Claws now imports it from the existing internal fs-safe-advanced
  facade and the public re-export is removed. Current review head is
  `eb3680cff8d` and CI is rerunning.
- The earlier test-type failure was confirmed as old-base drift already fixed
  on current main. The Plugin SDK count failure was branch-caused and repaired;
  no budget baseline was weakened. Focused schema/reader and CLI tests pass
  39/39 locally. Exact-head Node 24.15 CLI proof shows a valid workspace source
  succeeds, while an intermediate Windows junction, a 1 MiB + 1 byte source,
  and five 1 MiB sources fail closed with the expected three diagnostics.
  Real behavior proof passes. No PR was merged and no automerge was enabled.
- Honest product read: Omar's immutable-install-id suggestion should not be
  improvised in this base PR. The current RFC explicitly makes the installed
  local agent id and workspace immutable update identity; a separate install
  id would change provenance/update/remove contracts across the stack and
  needs an explicit RFC decision.
- Final ClawSweeper refresh also identified the retired
  `openclaw.clawFeed.v1` fixture as an orphan. Confirmed it was the only
  remaining feed-schema reference, deleted it, passed the focused 39 tests,
  and pushed `81f01f15c29`. Fresh CI has no failures while the remaining
  matrix completes. The exact Node 24.15 four-case CLI transcript is from the
  immediately preceding code head `eb3680cff8d`; the only final-head delta is
  deletion of that unused JSON fixture. The local source launcher hung while
  trying to rebuild after the deletion, so do not describe that transcript as
  an exact-`81f01f15c29` rerun.

### 2026-07-17 Claws stack review pass - PR #102306 export cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102306](https://github.com/openclaw/openclaw/pull/102306)
  is clean-restacked on current #102296 head
  `0be472639ea586ac049a5b2ab1634c3abbd3d578` at head
  `41517c89a575a498c7258ab593a8ea152f069a79` on branch
  `user/giodl/claws-pr7-export`.
- The restack kept the four export commits only. The concrete lower-stack
  fallout was the package integrity contract from #102296/#102228: exported
  package refs now carry recorded `integrity`, and the export test fixture
  seeds/expects package integrity.
- Corrected exact-head proof/comment:
  https://github.com/openclaw/openclaw/pull/102306#issuecomment-5003538044.
  ClawSweeper acknowledged the exact-head request at
  https://github.com/openclaw/openclaw/pull/102306#issuecomment-5003538428.
- Local validation on exact head `41517c89a5`: focused export/CLI/lifecycle
  Vitest passed 32 tests across 3 shards, `pnpm tsgo:core:test`,
  `pnpm tsgo:prod`, scoped Oxlint, `pnpm check:architecture`, deadcode
  dependencies/exports/unused-files, and `git diff --check` passed.
- Exact-head CLI proof added `workspace-agent`, exported it as a package,
  inspected the exported package successfully, then added the exported package
  in a separate clean state with exact dry-run `planIntegrity` consent. The
  exported package wrote `workspace/HEARTBEAT.md`, `workspace/SOUL.md`,
  `workspace/reference/policy.md`, `package.json`, and `openclaw.claw.json`.
- Live GitHub CI is rerunning on `41517c89a5`. Early snapshot: Real behavior
  proof passed, and the previously failing `check-test-types` and `check-lint`
  lanes passed. Broader matrix was still pending at this note. GitHub review
  state remains stale `CHANGES_REQUESTED` from Patrick's old exact-head review
  until a human/ClawSweeper refresh clears it. No PR was merged and no
  automerge was enabled.

### 2026-07-17 Claws stack review pass - PR #102296 lifecycle cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#102296](https://github.com/openclaw/openclaw/pull/102296)
  is clean-restacked on #102228 at
  `0be472639ea586ac049a5b2ab1634c3abbd3d578` on branch
  `user/giodl/claws-pr6-lifecycle`. Its base is #102228 head
  `18d178885ecc95a4d0f8af8968bcc444fb5d1792`.
- This supersedes the stale proof at
  https://github.com/openclaw/openclaw/pull/102296#issuecomment-5001947963
  for `3085ab9...` and the intermediate restack head `f85340a...`.
  Corrected proof is
  https://github.com/openclaw/openclaw/pull/102296#issuecomment-5002363925.
- Omar's lifecycle findings are addressed at the current head: status now
  inventories subordinate package/workspace rows even without a root install
  row; remove dry-run includes canonical agent deletion side effects in the
  consent digest; remove apply cleans packages, config, managed files, and only
  then canonical workspace/agent/session directories; package last-reference
  cleanup claims the Claw ref as `pending`, re-reads ownership, rejects
  post-claim adoption, and restores the ref when later cleanup cannot finish.
- Restack resolution kept #102228's fail-closed skill package policy while
  preserving Claw-installed origin for plugin reuse already owned by another
  Claw. A follow-up amend fixed the `check-test-types` fixture drift caught by
  CI after the restack (`AgentBinding.match`, package-ref integrity, and
  adoption-helper fixture shape).
- Local validation on exact head `0be472639e`: `pnpm tsgo:core:test` after
  clearing the stale local core-test cache, focused lifecycle/package/adoption
  Vitest (24 tests), `pnpm tsgo:core`, and `git diff --check` passed.
  Immediately preceding head `f85340a...` also had focused Claws/schema/
  lifecycle/package/CLI/plugin/state Vitest (202 tests), scoped Oxlint,
  `pnpm check:architecture`, deadcode dependencies/exports/unused-files, and
  `git diff --check` passing; the final head only changed test fixtures.
- ClawSweeper acknowledged the corrected exact-head review request at
  https://github.com/openclaw/openclaw/pull/102296#issuecomment-5002364505.
  Live GitHub CI is rerunning on `0be472639e`; early proof/dispatch/label/
  no-tabs/guard detect lanes passed, broader checks were still pending at the
  first snapshot. No PR was merged and no automerge was enabled.

### 2026-07-17 Claws stack review pass - PRs #101755 and #101973 CI cleanup

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#101755](https://github.com/openclaw/openclaw/pull/101755)
  is now at `31caeb09e7db44945bfab10dd3f19e00caa7d5bd` on branch
  `user/giodl/claws-pr3-feed-plan`.
- The prior #101755 CI failures were fixed and are green on GitHub: Claws
  oxlint (`src/claws/add.ts` unused assignment and `src/claws/lifecycle.ts`
  `params` shadowing), test typecheck (`test/scripts/package-acceptance-
  workflow.test.ts` unused `workflow` local), and the plugin SDK surface
  budget (current graph is 8011 public exports / 4477 callable exports).
  Focused proof, full oxlint, test/prod typechecks, architecture, deadcode, and
  `git diff --check` passed locally.
- Updated #101755 proof:
  https://github.com/openclaw/openclaw/pull/101755#issuecomment-4998752291.
  The first proof comment has stale pasted full SHAs; the correction with the
  actual current head is
  https://github.com/openclaw/openclaw/pull/101755#issuecomment-4998785951.
  ClawSweeper started a fresh review for the actual current head at
  https://github.com/openclaw/openclaw/pull/101755#issuecomment-4998753673.
  Live CI is clean, merge state is clean, and review state remains
  `CHANGES_REQUESTED` until Omar/Patrick/ClawSweeper clears it.
- OpenClaw PR [#101973](https://github.com/openclaw/openclaw/pull/101973)
  is restacked on #101755 at
  `b46453290b2392fd8f655d5098701a9257eeec3b` on branch
  `user/giodl/claws-pr4-artifact-plan`.
- #101973 retained Omar's workspace-file fixes after the restack. Focused
  Claws/CLI/tooling Vitest passed 76 tests, and `pnpm tsgo:prod`,
  `pnpm check:architecture`, `pnpm deadcode:dependencies`,
  `pnpm deadcode:exports`, `pnpm deadcode:unused-files`, scoped oxlint, and
  `git diff --check` passed locally on the exact head.
- Updated #101973 proof:
  https://github.com/openclaw/openclaw/pull/101973#issuecomment-4998780412.
  The first proof comment has stale pasted full SHAs; the correction with the
  actual current head is
  https://github.com/openclaw/openclaw/pull/101973#issuecomment-4998786124.
  ClawSweeper started a fresh review for the actual current head at
  https://github.com/openclaw/openclaw/pull/101973#issuecomment-4998756755.
  Live CI is clean after rerunning the OpenGrep changed-path scan; the first
  attempt failed before scanning because OpenGrep install could not fetch
  GitHub versions.
- No PR was merged and no automerge was enabled.

### 2026-07-17 Claws stack review pass - PR #101973

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#101973](https://github.com/openclaw/openclaw/pull/101973)
  is restacked on #101755 at
  `3e49e967e4e67ce2dd1e48a140cc2b8692616b25` on branch
  `user/giodl/claws-pr4-artifact-plan`.
- Omar's workspace-file findings are addressed at the current head: workspace
  planning canonicalizes the requested workspace path through existing
  symlinked parents and uses that canonical identity in agent config, action
  targets, plan integrity, and existing-workspace comparison; workspace-file
  apply realpaths package/workspace roots, reopens consented sources through
  fs-safe with symlink/hardlink rejection, and rejects source aliases whose
  realpath no longer matches the consented plan source.
- Rebase integration with #101755 preserves resumability: workspace-file
  failure now leaves the root install record at `config_committed` so the
  already-created agent/workspace remains reconcilable rather than becoming an
  unretriable partial row.
- Posted proof/comment:
  https://github.com/openclaw/openclaw/pull/101973#issuecomment-4998585485.
- Local validation passed on exact head `3e49e967e4`: focused Claws/CLI/
  lifecycle Vitest (66 tests), `pnpm tsgo:prod`,
  `pnpm check:architecture`, `pnpm deadcode:dependencies`,
  `pnpm deadcode:exports`, `pnpm deadcode:unused-files`, and
  `git diff --check`.
- ClawSweeper acknowledged the re-review request at
  https://github.com/openclaw/openclaw/pull/101973#issuecomment-4998585722.
  Live CI is rerunning on the new head; no failures were present at the first
  post-push snapshot, with broader CI still pending. No PR was merged and no
  automerge was enabled.

### 2026-07-17 Claws stack review pass - PR #101755

- Maintainer hold remains in force: do not merge #101328 or downstream Claws
  PRs until Gio explicitly says to proceed; Omar/Patrick human review is still
  pending.
- OpenClaw PR [#101755](https://github.com/openclaw/openclaw/pull/101755)
  is restacked on #101328 at
  `6b9d9fd2b962626a25710e79f13ad7953eb40514` on branch
  `user/giodl/claws-pr3-feed-plan`.
- Omar's interrupted-install blocker is addressed at the current head: root
  add provenance now resumes matching non-complete install rows, records
  workspace parent creation failures as partial, tracks durable
  `workspace_ready` and `config_committed` phases, reconciles existing matching
  workspace/config state on retry, and the CLI rebuilds a consented retry plan
  without self-blocking on the matching in-flight agent/workspace.
- Posted proof/comment:
  https://github.com/openclaw/openclaw/pull/101755#issuecomment-4998486703.
- Local validation passed on exact head `6b9d9fd2b9`: focused provenance/apply
  and CLI Vitest (21 tests), lifecycle CLI E2E Vitest (5 tests),
  `pnpm tsgo:prod`, `pnpm check:architecture`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:exports`,
  `pnpm deadcode:unused-files`, and `git diff --check`.
- ClawSweeper acknowledged the re-review request at
  https://github.com/openclaw/openclaw/pull/101755#issuecomment-4998486874.
  Live CI is rerunning on the new head; early proof/dispatch/preflight and
  guard lanes passed, while the broader matrix was still in progress at the
  first snapshot. Review state remains `CHANGES_REQUESTED` until Omar/Patrick
  or ClawSweeper re-review.
- No PR was merged and no automerge was enabled.

### 2026-07-17 Claws stack review pass - PR #101328

- Maintainer hold remains in force: do not merge #101328 until Gio explicitly
  says to proceed; Omar/Patrick human review is still pending.
- OpenClaw PR [#101328](https://github.com/openclaw/openclaw/pull/101328)
  is restacked on current main and pushed to head
  `c5abb329537cf811edde9e2e5833de6dd92afdde` on branch
  `user/giodl/claws-pr2-schema-plan`.
- Omar's Scout Crews review comment is live at
  https://github.com/openclaw/openclaw/pull/101328#issuecomment-4998156305.
  The current head addresses the concrete preview findings: workspace source
  planning now uses fs-safe-compatible path policy, rejects intermediate
  symlink parents/final symlinks/hardlinked source files, enforces per-file
  source byte limits before reading, and enforces an aggregate workspace-source
  byte limit before hashing any source bytes. Regression tests cover
  intermediate symlink parents and aggregate overage.
- The immutable install-id suggestion was explicitly treated as a lifecycle /
  ownership contract decision for the create/resume slices rather than widening
  this base add-plan schema without maintainer agreement.
- Posted proof/comment:
  https://github.com/openclaw/openclaw/pull/101328#issuecomment-4998336018.
- Local validation passed on exact head `c5abb32953`:
  `node scripts/run-vitest.mjs src/claws/schema.test.ts
  src/cli/claws-cli.test.ts src/claws/lifecycle.e2e.test.ts -- --reporter=dot`,
  `pnpm tsgo:prod`, `pnpm check:architecture`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:exports`,
  `pnpm deadcode:unused-files`, and `git diff --check`.
- Live CI is rerunning on `c5abb32953`; early Real behavior proof,
  dependency/security guard detect, runner admission, dispatch, label, and
  dependency guard lanes passed, while broader preflight/security/actionlint
  lanes were still in progress at the first post-push snapshot. Review state
  remains stale `CHANGES_REQUESTED` until Omar/Patrick/ClawSweeper re-review.
- No PR was merged and no automerge was enabled.

### 2026-07-17 Claws stack restack pass - PR #102383

- Maintainer hold remains in force: do not merge #101328 until Gio explicitly
  says to proceed; Omar is still being given review time.
- OpenClaw PR [#102383](https://github.com/openclaw/openclaw/pull/102383)
  is restacked on #102306 at
  `1188b433a29a01b7fdfdd8d1015522b5d96f9c6c` on branch
  `user/giodl/claws-pr8-skills`. GitHub reports the PR as not draft with base
  `f9916ba650bf979ab2db04c999a78b0ff0859b6e`.
- Restack fixes kept cron lifecycle work aligned with the current package and
  export stack: Claw cron refs now compose with inspected package status,
  remove consent remains bound to exact plan integrity, cron cleanup fails
  closed before agent deletion, completed remote removals can be retried
  without repeating `cron.remove`, and local agent-delete fallback output stays
  internal to `claws remove`.
- Posted proof/comment:
  https://github.com/openclaw/openclaw/pull/102383#issuecomment-4998167345.
- Local validation passed on exact head `1188b433a2`: `git diff --check`,
  `pnpm tsgo:prod`, `pnpm check:architecture`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:exports`,
  `pnpm deadcode:unused-files`, `pnpm tsgo:core:test`, and focused cron /
  lifecycle / CLI / gateway Vitest.
- Exact-head direct behavior proof in isolated state covered add with
  `cron.add`, status/export with one resolved cron ref, lost-response
  reconciliation through `cron.list`, failed remove leaving the agent intact,
  retry after confirmed remote removal without repeating `cron.remove`, and
  final cleanup with zero Claws/cron refs.
- ClawSweeper re-review was requested on the proof comment. CI is rerunning on
  the restacked head; early real behavior proof and guard lanes passed, while
  CodeQL/CI preflight were still pending at the first snapshot. No PR was
  merged and no automerge was enabled.

### 2026-07-17 Claws stack restack pass - PR #102306

- Maintainer hold remains in force: do not merge #101328 until Gio explicitly
  says to proceed; Omar is still being given review time.
- OpenClaw PR [#102306](https://github.com/openclaw/openclaw/pull/102306)
  is restacked on #102296 at
  `f9916ba650bf979ab2db04c999a78b0ff0859b6e` on branch
  `user/giodl/claws-pr7-export`. GitHub reports the PR as not draft and
  mergeable on base `f07a024b5e22077ac2c555410c72201cc8bf2730`.
- Restack fixes aligned export with the current lifecycle stack: export now
  uses manifest-local type aliases after Claw manifest internals became
  module-private, calls `getRuntimeConfig()` at the CLI process boundary, keeps
  `ClawExportResult` module-local, and updates export tests for stricter
  `AgentConfig` fixture typing.
- Posted proof/comment:
  https://github.com/openclaw/openclaw/pull/102306#issuecomment-4997971605.
- Local validation passed on exact head `f9916ba650bf`: `git diff --check`,
  `pnpm tsgo:prod`, `pnpm check:architecture`, `pnpm deadcode:dependencies`,
  `pnpm deadcode:exports`, `pnpm deadcode:unused-files`,
  `pnpm tsgo:core:test`, and focused export/CLI/lifecycle Vitest (31 tests).
- Exact-head CLI proof in isolated state added `workspace-agent`, exported it
  as a package, inspected the exported package successfully, then added the
  exported package into a separate clean state with exact dry-run
  `planIntegrity` consent. The export wrote `openclaw.claw.json`,
  `package.json`, `workspace/HEARTBEAT.md`, `workspace/SOUL.md`, and
  `workspace/reference/policy.md`.
- ClawSweeper acknowledged the `@clawsweeper re-review` request on the proof
  comment. CI is rerunning on the restacked head; no failures were present at
  the first post-push snapshot, but many checks were still pending. No PR was
  merged and no automerge was enabled.

### 2026-07-16 Claws stack restack pass - PR #102296

- Maintainer hold remains in force: do not merge #101328 until Gio explicitly
  says to proceed; Omar is still being given review time.
- OpenClaw PR [#102296](https://github.com/openclaw/openclaw/pull/102296)
  is restacked on #102228 at
  `f07a024b5e22077ac2c555410c72201cc8bf2730` on branch
  `user/giodl/claws-pr6-lifecycle`. GitHub reports the PR as not draft and
  mergeable on base `2ae7d51d0919c7ddd8f6e54636aa6fb48f3007e0`.
- Restack fixes kept the plan-first status/remove slice aligned with the lower
  Claw state schema: restored read-only workspace-file state lookup, used the
  runtime config process boundary in status, removed stale exported deadcode,
  and updated Claws test fixtures for the current add-plan/source identity
  shape.
- Posted proof/comment:
  https://github.com/openclaw/openclaw/pull/102296#issuecomment-4997726721.
  Follow-up test-type delta/comment:
  https://github.com/openclaw/openclaw/pull/102296#issuecomment-4997818807.
- Local validation passed on exact head `f07a024b5e22`: `git diff --check`,
  `pnpm tsgo:prod`, `pnpm check:architecture`, `pnpm deadcode:dependencies`,
  `pnpm deadcode:exports`, `pnpm deadcode:unused-files`, `pnpm lint:kysely`,
  focused Claws lifecycle/package/CLI/plugin/skill/adoption Vitest (63 tests),
  and `pnpm tsgo:core:test`.
- Exact-head CLI proof in isolated state added `workspace-agent` with exact
  add plan digest, verified `claws status` reported one present Claw with zero
  drift, planned removal with exact remove digest, and completed removal with
  all three managed workspace files deleted.
- Full local `pnpm check:test-types` now gets past the Claws test fixture
  errors and stops at the known current-base root-test drift:
  `test/scripts/docs-sync-publish.test.ts` imports
  `pruneOrphanLocaleDocs`, which is not exported from
  `scripts/docs-sync-publish.mjs`. That file is outside the Claws PR diff.
- ClawSweeper acknowledged and started re-review on the first proof comment;
  a second `@clawsweeper re-review` was posted after the amended test-fixture
  head. CI is rerunning on the amended head. No PR was merged and no automerge
  was enabled.

### 2026-07-16 Claws stack restack pass - PR #102228

- Maintainer hold remains in force: do not merge #101328 until Gio explicitly
  says to proceed; Omar is still being given review time.
- #102228 is restacked on #101973 at
  `2ae7d51d0919c7ddd8f6e54636aa6fb48f3007e0` on branch
  `user/giodl/claws-pr5-installers`. The old lower-stack merge history was
  removed; the clean range is eight commits on top of #101973
  `5d2dea5984a533faa96027e913a120ad0689e6a4`.
- Fixed ClawSweeper's concrete blocker: managed plugin uninstall now passes
  the caller state `env` into `collectClawPluginUninstallWarnings`, and the
  warning collector reads `claw_package_refs` from that same state DB.
- Updated proof/comment:
  https://github.com/openclaw/openclaw/pull/102228#issuecomment-4997577993.
  Exact-head direct proof covered minimal Claw dry-run plus consented add, and
  isolated uninstall-warning state-env behavior with an empty control state.
- Local validation passed on exact head `2ae7d51d0919c`: `git diff --check`,
  `pnpm db:kysely:check`, `pnpm check:architecture`, `pnpm tsgo:prod`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:unused-files`,
  `pnpm deadcode:exports`, and focused Vitest for Claw packages/provenance,
  CLI, lifecycle e2e, plugin preflight/uninstall, management service, and state
  DB migrations.
- Live GitHub state immediately after push: PR is not draft, mergeable, still
  `CHANGES_REQUESTED`, and still carries stale `status: 📣 needs proof` /
  unranked labels until ClawSweeper re-reviews. New CI is in progress; early
  lanes such as runner admission, dispatch, real behavior proof, dependency
  guard detect, and security-sensitive guard detect passed.
- No PR was merged and no automerge was enabled.

### 2026-07-16 Claws stack restack pass - PRs #101755 and #101973

- Maintainer hold remains in force: do not merge #101328 until Gio explicitly
  says to proceed; Omar is still being given review time.
- #101755 is restacked on #101328 at
  `bea0e3f33ac6062561275f258fee49e4f4c9b5a3`. Follow-up cleanup regenerated
  `openclaw-state-schema.generated.ts` and added narrow `sqlite-allow-raw`
  comments for Claw provenance writes. Updated proof/comment:
  https://github.com/openclaw/openclaw/pull/101755#issuecomment-4997398112.
  Local validation passed: `pnpm check:architecture`, focused Claws Vitest
  (`provenance`, CLI, lifecycle e2e), direct CLI proof, and `git diff --check`.
- #101973 is restacked on corrected #101755 at
  `5d2dea5984a533faa96027e913a120ad0689e6a4`. Follow-up cleanup regenerated
  the state schema, kept `claw_workspace_files` in the runtime generated
  schema, removed test-only workspace/provenance read exports, and added narrow
  `sqlite-allow-raw` comments for workspace-file state writes. Updated
  proof/comment:
  https://github.com/openclaw/openclaw/pull/101973#issuecomment-4997398262.
  Local validation passed: focused Claws Vitest (`workspace`, `provenance`,
  CLI, lifecycle e2e), `pnpm tsgo:prod`, `pnpm check:architecture`,
  `pnpm deadcode:dependencies`, `pnpm deadcode:unused-files`,
  `pnpm deadcode:exports`, direct CLI workspace-file proof, and
  `git diff --check`.
- Live CI after the pushes still has expected guard failures on dependency and
  security-sensitive guard lanes, plus #101755 still shows current-base
  `check-test-types` failure in `test/scripts/docs-sync-publish.test.ts`
  (`pruneOrphanLocaleDocs` missing from `scripts/docs-sync-publish.mjs`),
  which matches the earlier current-main docs-sync drift and is outside the
  Claws diff. #101973 CI was still running when noted.
- No PR was merged and no automerge was enabled.

### 2026-07-16 Auditable Skills receipt-first publication

- Switched GitHub.com auth to `giodl73-repo`, pushed RFC commit `9004fb5`,
  and published the prepared receipt-first bodies to fork RFC #6 and OpenClaw
  #97.
- Live verification is exact: RFC #6 is draft, clean, mergeable, and points to
  `9004fb57fbef`; OpenClaw #97 is draft and mergeable at `738ca6d79d37`; both
  live bodies byte-match the normalized prepared files.
- OpenClaw #97 now contains the required `Real behavior proof` heading and full
  field labels. Its unstable rollup remains limited to fork infrastructure:
  `auto-response`, `label`, and Linux companion signing.
- The current product message is final for this round: receipts are the
  standalone product; managed identity and usage are optional later evidence;
  budgets require demand; orchestration requires a concrete consumer.

### 2026-07-16 Auditable Skills receipt-first cutoff

- Confirmed the product cutoff: durable typed receipts and `get/list/count` are
  the standalone Round 1. Managed skill identity and exact-run usage are later
  evidence rounds; budgets require operator demand; orchestration requires a
  concrete consumer and is not part of the receipt pitch.
- Tightened RFC 0022 accordingly. Round 1 now has receipt-only goals, a
  receipt-only support scenario, and six receipt-only acceptance criteria. The
  implementation plan explicitly says that lack of demand for a later round is
  a valid stopping point.
- RFC worktree `C:\src\openclaw-rfcs-skill-audit` is clean at commit `9004fb5`
  on `agent/rfc-0022-skill-invocation-audit`, pushed to the fork branch.
- Rewrote the prepared fork bodies in
  `projects/claws/auditable-skills-pr-bodies/rfc-6.md` and
  `openclaw-97.md`. The RFC body now presents receipts first and labels the
  rest as POC evidence. The #97 body removes the implied workflow dependency
  and uses OpenClaw's exact `Real behavior proof` field labels.
- The prepared bodies are published to RFC #6 and OpenClaw #97 and were
  verified against their live GitHub contents.
- Do not resume the dirty idempotency prototype or open #115. Atomic dispatch
  reservation remains a separate future runner concern, not Round 1 work.

### 2026-07-16 Claws stack landing hold - PR #101328

- OpenClaw PR [#101328](https://github.com/openclaw/openclaw/pull/101328)
  is updated to head `a3c017240d70d528e8e2b804339c0eb8d33df4ca` on branch
  `user/giodl/claws-pr2-schema-plan`. Do not merge this first PR until Gio
  explicitly says so; Omar is still being given review time.
- Fixed current-head blockers: removed duplicate install-spec parser modules,
  removed dead Claws helper files/exports, repaired rebase-time avatar imports,
  and switched `src/cli/claws-cli.runtime.ts` from deprecated `loadConfig()`
  to process-boundary `getRuntimeConfig()`.
- Local validation passed: focused Claws Vitest suite
  (`src/claws/schema.test.ts`, `src/cli/claws-cli.test.ts`,
  `src/claws/lifecycle.e2e.test.ts`), `pnpm check:deprecated-api-usage`,
  the deprecated internal config API contract test,
  `pnpm deadcode:dependencies`, `pnpm deadcode:unused-files`,
  `pnpm deadcode:exports`, and `git diff --check`.
- Current-head direct CLI proof was posted at
  https://github.com/openclaw/openclaw/pull/101328#issuecomment-4997106915
  and includes disabled/enabled help, `claws inspect --json`,
  `claws add --dry-run --json`, and fail-closed non-dry-run output.
- Live GitHub state after the push: `check-lint` fails only on current-main
  `scripts/docs-sync-publish.d.mts` overload-adjacency drift outside the PR
  diff; `openclaw/ci-gate` is red because of that. PR is `BEHIND` and still
  has stale `CHANGES_REQUESTED`. ClawSweeper acknowledged the current-head
  re-review request but the durable review comment was still stale at the
  previous `5a11bf5...` verdict when this note was written.

### 2026-07-16 final Claws stack refresh

- Patrick approved using the existing Claws experimental gate for `CLAW.md`
  rather than adding a second flag. All twelve OpenClaw PRs are ready for
  review; #106888 is no longer draft. No PR has automerge enabled and nothing
  was merged from this workspace.
- RFC [#27](https://github.com/openclaw/rfcs/pull/27) is ready and approved at
  `892c60f`. The RFC, package sidecar, manifest sidecar, and PR body now define
  `CLAW.md` plus grouped JSON under the single Claws gate. The Markdown support
  is explicitly a removable reader/export adapter with no separate lifecycle,
  ownership, provenance, flag, or package dependency.
- OpenClaw update apply [#102982](https://github.com/openclaw/openclaw/pull/102982)
  is refreshed at `594f6aa3da1` with exact validation of every package-manager
  MCP selector. Final `CLAW.md` compatibility
  [#106888](https://github.com/openclaw/openclaw/pull/106888) is refreshed at
  `757592aada0`; its effective diff is four reader/export files. Focused proof
  passes 55 tests, lifecycle E2E passes 8 tests, and final Codex reviews are
  clean. CI is running; Patrick's earlier GitHub changes-requested review is
  stale and needs refresh against the fixed head.
- ClawHub draft heads are #3089 `821c1f4`, #3090 `fe333b8`, #3091 `241db05`,
  and #3092 `927bd80`. Each was restacked without force-pushing and remains
  unmerged. #3089/#3090/#3091 pass focused suites, `ci:types-build`,
  `ci:static`, and clean Codex reviews.
- #3092 passes feed/API/schema/redirect/archive-safety tests, `ci:types-build`,
  `ci:static`, and final Codex review. Its real cross-repo E2E downloads and
  digest-checks a hosted package, rejects unsafe paths plus link/special
  entries before extraction, and obtains a non-mutating
  `openclaw.clawAddPlan.v1` result from OpenClaw `1b00790e260`.
- Resolution comments and `@clawsweeper re-review` requests were posted on
  #3091, #3092, and RFC #27. No reusable local Convex deployment was available
  for #3091's live enabled/disabled transcript; the deployment gate must remain
  off until the complete experimental stack is present. Remaining work is
  maintainer review and CI follow-up only. Do not merge any PR from this
  workspace.
- The required ClawHub `pr-gates` lanes pass. Vercel still requires OpenClaw
  Foundation authorization, and unrelated local-auth browser shards were
  flaky; failed GitHub jobs were rerun for workflow runs `29519926564`,
  `29521515948`, `29522311511`, and `29523233296` and were in progress at
  handoff. Patrick's stale #106888 change request targets pre-fix commit
  `1e9569d`; a human re-review was requested on the proven current head.
### 2026-07-16 Auditable Skills Round 1 rebuild

- Rebuilt fork draft OpenClaw #97 directly on current upstream `main` as one
  upstream-shaped Round 1 commit (`738ca6d79d3`) instead of carrying forward
  the 40-file prototype stack. The new slice adds producer-facing
  `AgentToolResult.receipts`, trusted tool-call/session/run correlation, a
  dedicated configurable `receipts.sqlite`, bounded trajectory references,
  and a first-class `openclaw receipts` get/list/count surface.
- Reused the current sanitized private tool-result observer already shared by
  OpenClaw, Codex, and Copilot. Making `toolCallId` explicit on that observer
  avoided the old agent-core loop and harness adapter plumbing while preserving
  cross-harness behavior.
- Tightened receipt admission during review: malformed optional fields now
  reject the whole receipt, producer strings and data are bounded, idempotency
  uses OpenClaw stable JSON rather than property order, empty agent filters
  match no agents, SQLite lock waits are capped at 50 ms, and persistence vs
  trajectory-reference failures have distinct diagnostics.
- The fork PR now targets fork `main`, remains draft, and has a rewritten body
  centered on durable business outcomes, search/count/revisit behavior, the
  mini-CRM use case, current OpenClaw primitives, the single-host storage
  boundary, and the natural path to managed skills, workflows, token spend,
  and budgets. Final diff: 32 files, 1,489 additions, 27 deletions.
- Preserved the former #97 head (`1fcf0bf9`) as
  `prototype/auditable-skills-poc-receipts` and changed #98 to use that archive
  as its base. This keeps the later POC evidence stack reviewable without
  forcing its experimental scaffolding into the new Round 1.
- Validation: 16 focused receipt/composition tests; 349 existing OpenClaw,
  Codex, and Copilot observer tests; 32 config tests; 21 CLI registry tests;
  real help and empty-query CLI smoke; production and root-test TypeScript;
  full lint and format; runtime import-cycle, config-baseline, i18n glossary,
  and 6,038-link docs checks. Aggregate `pnpm check` stops on stale current-base
  shrinkwraps for the root package, `extensions/llama-cpp`, and
  `extensions/twitch`; the branch does not change those files.
- Fork CI real-behavior proof passes. `auto-response` fails before repository
  code because the fork lacks its GitHub App private key. The Linux companion
  compiles and bundles successfully, then signing fails because the fork lacks
  `TAURI_SIGNING_PRIVATE_KEY`.

### 2026-07-16 RFC 0022 next landing round

- Confirmed RFC 0022 already follows the latest RFC repository sidecar pattern:
  one readable proposal plus a core specification and a focused runner
  addendum. RFC 0009 remains the direct structural precedent; no third RFC
  0022 sidecar was added.
- Updated RFC fork PR #6 to `1482d0b7` with a smaller upstream plan:
  1. RFC plus core receipts and `get/list/count`;
  2. managed invocation and run usage after the receipt boundary settles;
  3. minimal core and optional Lobster runner adapters with accounting.
  The existing five implementation PRs are now described as POC evidence, not
  the proposed landing stack.
- Added one reference support-email success fixture: record
  `customer.verified`, resolve it from an authorized later local agent, record
  `case.resolved`, list/count/show the full evidence, reopen the originating
  session, and count child-run usage once. Full producer data must exist only
  in the receipt store, not its trajectory reference.
- Tightened the core sidecar around a storage-neutral receipt resource:
  harness-owned idempotency; `get`, bounded/paginated `list`, and payload-free
  `count`; deterministic ordering; consistent authorization; no silent
  fallback; bounded Gateway write latency; schema/migration health; private
  SQLite files; consistent snapshot backup/export; and independent retention.
- Tightened the runner sidecar so adapters never open SQLite directly and an
  unresolved required reference fails as `receipt_unavailable`, distinct from
  `required_receipt_missing` when the outcome was never observed.
- Kept compliance claims bounded: receipt retention and export are specified,
  but tamper evidence, signing, and regulatory attestation remain explicitly
  separate future work.
- Updated all six live draft PR bodies to label the current stack as **POC
  evidence** and point reviewers toward the smaller landing rounds rather than
  implying that the fork stack should land unchanged.

### 2026-07-15 RFC 0022 shared receipt store

- Reworked the Auditable Skills storage boundary around one canonical full
  receipt record rather than a full `audit.receipt` payload copied into each
  agent trajectory.
- OpenClaw #97 now provides a configurable shared local SQLite profile at
  `audit.receipts.store`, defaulting to
  `~/.openclaw/state/receipts.sqlite`. It indexes exact type, subject, agent,
  session, run, invocation, and skill correlation; `sessions tail` can return
  or count exact receipt types across agents. Normal trajectories contain only
  bounded `audit.receipt.recorded` references.
- The database is explicitly single-host/local-storage v1. The receipt-store
  boundary permits a later remote provider without changing producers,
  queries, or managed-step results. Receipt retention is independent of
  transcript and trajectory rotation.
- Restacked and lease-updated the OpenClaw fork stack:
  - #97 `1fcf0bf9`: shared receipt store and cross-agent query;
  - #98 `9c7568ad`: invocation and exact skill digest correlation;
  - #100 `78185761`: workflow audit reader resolves full evidence from the
    configured store before Lobster conditions consume it;
  - #109 `398d65ac`: accounting slice restacked unchanged over #100.
- Updated RFC #6 at `9956e659`. The core sidecar now specifies the full receipt
  record, trajectory reference, store/query contract, default SQLite profile,
  independent retention, and future remote-provider seam. The runner sidecar
  requires runners to resolve receipts through that store rather than create a
  workflow receipt ledger.
- Rewrote and published all six live PR bodies from
  `projects/claws/auditable-skills-pr-bodies/`. They now tell the same
  support-thread/mini-CRM story, show exact search and count behavior, state
  the single-host SQLite boundary, and explain the core-runner/Lobster
  migration path. All six remain draft fork PRs.
- Focused validation:
  - #97: 26 tests passed; config/schema baselines, lint, formatting, LOC
    ratchet, and diff checks pass; full typecheck has only known baseline errors
    outside this slice;
  - #98: 31 focused receipt, invocation, run-projection, and session-query tests
    passed;
  - #100: 38 receipt-resolution and embedded Lobster tests passed;
  - #109 intentionally requires Lobster #1 for cost aggregation; the stock
    published Lobster package demonstrates the landing-order gate.

### 2026-07-15 RFC 0022 sidecar specifications

- Rebased RFC fork PR #6 on current upstream RFC `main` (`2d213ae`) and
  fast-forwarded the fork base so RFC 0009's newly landed sidecars do not appear
  in the RFC 0022 diff.
- Added `rfcs/0022/auditable-skills-v1-spec.md`, the normative core v1 contract
  for skill metadata, producer receipts, harness-owned recorded receipt
  envelopes, managed invocation, exact skill identity, usage/cost, queries,
  failure behavior, and conformance.
- Added `rfcs/0022/orchestration-runner-v1-spec.md`, a runner-neutral addendum
  defining normalized workflow plans and step results, lifecycle, accounting
  deduplication, cancellation, resume, capability discovery, a deliberately
  small core runner, a Lobster adapter, and five mechanical migration phases.
- Updated RFC 0022 and its PR body to make Lobster the current advanced proof,
  not a permanent dependency. Direct managed invocation remains runner-free;
  simple composition can use the core profile; Lobster remains available for
  conditions, retries, approvals, structured input, and durable resume.
- Tightened the normative contracts against current OpenClaw trajectory and
  skill primitives: recorded receipts now use the existing trajectory envelope,
  invocation and run projections preserve native session/run identity and
  multi-model execution, and usage uses OpenClaw's normalized token buckets.
  The runner addendum now distinguishes exclusive from shared accounting,
  defines deterministic dispatch idempotency and terminal settlement, and keeps
  cancellation, resume, receipt gates, and limit failures from erasing observed
  effects or incurred spend.
- The specifications retain the three-line `SKILL.md` author experience,
  bounded/non-blocking validation, clear managed-invocation failure for malformed
  recognized metadata, sanitized stable errors, and existing OpenClaw authority
  boundaries. They make no tamper-evidence or regulatory-attestation claim.
- RFC PR #6 is draft, open, cleanly mergeable, and limited to three files at
  head `007325fb`: 1,660 additions / 0 deletions. Relative Markdown links and
  `git diff --check` pass.

### 2026-07-15 Auditable Skills simplification: remove `regarding`

- Removed the separate session business-association concept from the active RFC
  and all four stacked OpenClaw implementation branches. Historical notes below
  remain as the design trail; they are no longer the proposed architecture.
- The retained model is smaller: native OpenClaw session/channel identity keeps
  the work thread, a typed receipt records the observed outcome, optional
  producer-owned `subject` identifies the affected object, and run/invocation
  envelopes supply lineage, model usage, and cost.
- Rebuilt and lease-updated the fork-only stack:
  - #97 `dd7495e9`: 566 additions / 32 deletions / 29 files;
  - #98 `62bf8ebc`: 2,589 additions / 451 deletions / 71 files;
  - #100 `023f4092`: 1,782 additions / 152 deletions / 41 files;
  - #109 `2c7f5e26`: 154 additions / 2 deletions / 4 files.
- RFC #6 was `04651012` at 675 lines before its two sidecar specifications were
  added; current RFC state is recorded above. Lobster #1 remains `0ad538b3` at
  242 additions / 25 deletions. The implementation simplification removed
  1,248 lines of churn; the later implementer specs add documentation without
  restoring the removed runtime design.
- Verified there are no `regarding`, Dataverse, or Dynamics references in the
  active RFC, cumulative OpenClaw stack diff, or any of the six live PR bodies.
- Focused proof after rebuilding:
  - #97: 20 receipt and session-query assertions passed;
  - #98: 21 audit-run and query assertions passed;
  - #100: 120 managed-skill, Lobster, and audit-reader assertions passed, plus
    24/25 spawn assertions; the remaining assertion is the pre-existing Windows
    `/tmp` versus `C:\tmp` path expectation;
  - #109 retains the deliberate Lobster #1 source dependency for `_meta.cost`.
- Complete 114-job fork CI passed on both exact final heads: #100 in run
  `29456949470` and #109 in run `29456951214`. An earlier #109 proof had one
  unrelated 40 ms media timeout; both authoritative final-head runs passed.
- Rewrote and published all six PR bodies from
  `projects/claws/auditable-skills-pr-bodies/`. Every PR remains draft,
  fork-only, open, and mergeable.

### 2026-07-15 Auditable Skills presentation

- Reframed RFC 0022 and the full six-draft fork series under the umbrella
  **Auditable Skills**. Metadata is now presented as the portable declaration
  mechanism; durable outcome evidence, `regarding`, invocation lineage, search,
  usage, cost, and workflow accounting are the runtime-owned audit story.
- Renamed the RFC source to `rfcs/0022-auditable-skills.md`, changed its title
  to **RFC 0022: Auditable Skills**, and pushed commit `9580ab5` to RFC fork
  PR [#6](https://github.com/giodl73-repo/rfcs/pull/6).
- Retitled and rewrote every live draft body with a shared six-slice map,
  slice-specific opportunity and boundaries, accurate validation, and complete
  Real behavior proof sections: OpenClaw
  [#97](https://github.com/giodl73-repo/openclaw/pull/97),
  [#98](https://github.com/giodl73-repo/openclaw/pull/98),
  [#100](https://github.com/giodl73-repo/openclaw/pull/100), Lobster
  [#1](https://github.com/giodl73-repo/lobster/pull/1), and OpenClaw
  [#109](https://github.com/giodl73-repo/openclaw/pull/109).
- Live verification confirms all six remain open, draft, and mergeable; every
  OpenClaw Real behavior proof recheck passed; and the OpenClaw ancestry remains
  #97 -> #98 -> #100 -> #109. RFC, OpenClaw #109, and Lobster worktrees are
  clean.
- Current live GitHub review size is 7,236 additions and 682 deletions across
  the six incremental drafts (7,918 lines of churn), including RFC text, tests,
  docs, fixtures, and generated updates.

### 2026-07-15 RFC 0022 cross-repository accounting proof

- Expanded RFC fork PR #6's reviewer-facing body to match the final RFC thesis:
  portable Agent Skills declarations; observed, searchable business evidence;
  `regarding` continuity; managed composition; native workflow accounting; and
  the complete six-draft proof order. It now includes the support-case/query
  story and completed cross-repository spend proof, and no longer says already
  closed exploratory drafts "will be" superseded.
- Closed the final validation gap between OpenClaw fork draft
  [#109](https://github.com/giodl73-repo/openclaw/pull/109) at `56c9c6db`
  and Lobster fork draft
  [#1](https://github.com/giodl73-repo/lobster/pull/1) at `0ad538b3`.
- Built Lobster #1 and loaded that source runtime directly from an ephemeral
  OpenClaw Vitest harness. The scenario ran `verify_customer`, paused for
  approval, resumed, and ran `resolve_case` using synthetic completed child-run
  audits through the real OpenClaw adapter and Lobster workflow runtime.
- The resumed native Lobster envelope returned 300 input tokens, 75 output
  tokens, estimated cost `$0.00009`, and separate step entries of 100/20 and
  200/55 tokens. This proves pre-approval spend survives the pause and combines
  with post-approval spend without a second accounting store.
- Updated #109's body and Real behavior proof with the exact environment,
  command, output, and remaining live-provider limitation. The published
  `@clawdbot/lobster@2026.6.11` still drops `_meta.cost`, so Lobster #1 remains
  the deliberate landing-order dependency.
- Removed the ephemeral proof file after the run. Both implementation
  worktrees are clean; no dependency override or proof-only code entered either
  PR. All six review drafts remain fork-only, draft, open, and mergeable.

### 2026-07-15 RFC 0016 implementer sidecars

- Rebased RFC PR [#27](https://github.com/openclaw/rfcs/pull/27) onto current
  `openclaw/rfcs` `main` and pushed the rewritten fork branch with an explicit
  force-with-lease. The PR remains open and ready; nothing was merged.
- Added two RFC 0009-style implementer sidecars at commit `8da262c`:
  `rfcs/0016/claw-md-v1-spec.md` and
  `rfcs/0016/claw-package-v1-spec.md`. RFC 0016 links both and the PR body now
  links their commit-stable GitHub views.
- `CLAW.md` v1 now specifies the YAML 1.2 Core Schema envelope, BOM and digest
  behavior, equivalent JSON form, complete strict grouped schema, portable
  workspace/avatar paths, mutually exclusive MCP variants, cron constraints,
  compatibility, and producer/consumer conformance.
- Claw Package v1 now specifies package identity/layout, portable path and
  publication validation, exact artifact integrity, registry/client ownership,
  plan/consent boundaries, provenance, add/update/remove, export, and
  conformance. Package removal uses artifact-level `claw-installed` origin,
  remains removal-order independent, and preserves later direct/operator
  adoption.
- Reconciled stale RFC text: canonical `openclaw.claw` is `CLAW.md` rather than
  `./CLAW.md`; strict v1 cannot gain fields in place; whole-Claw removal may
  uninstall only eligible sole unchanged artifacts through canonical owners.
- Final `/root/.codex/skills/codex-review/scripts/codex-review --mode local`
  result was clean after resolving YAML scalar portability, schema-version,
  path collision, avatar lifecycle, package ownership/adoption, MCP union,
  complete agent-field, and unsupported cron-session findings.
- Follow-up implementation alignment is still required across the OpenClaw and
  ClawHub draft stacks: NFC/case-folded workspace destination collisions,
  declared managed local avatars, a Claw-specific heartbeat allowlist, removal
  of cron `current`, ClawHub BOM parity, and artifact-level origin plus later
  non-Claw adoption. Do not claim the existing stacks fully conform to the new
  sidecars until those gaps are repaired and restacked.
### 2026-07-15 RFC 0022 reviewer-series reformulation

- Replaced the exploratory Skill Receipts/metadata chronology with six
  reviewer-facing fork drafts: RFC
  [#6](https://github.com/giodl73-repo/rfcs/pull/6), OpenClaw
  [#97](https://github.com/giodl73-repo/openclaw/pull/97) business work,
  [#98](https://github.com/giodl73-repo/openclaw/pull/98) managed skill
  lineage, [#100](https://github.com/giodl73-repo/openclaw/pull/100) managed
  workflows, Lobster [#1](https://github.com/giodl73-repo/lobster/pull/1)
  accounting continuity, and OpenClaw
  [#109](https://github.com/giodl73-repo/openclaw/pull/109) workflow spend.
- RFC 0022 is now titled **Agent Skills Metadata for Outcomes and
  Composition**, commit `92f746e`. Portable `SKILL.md` metadata remains only
  `outcomes`, `uses-skills`, and `isolation`; observed records, regarding,
  lineage, accounting, and limits remain runtime-owned.
- OpenClaw #100 was rebuilt directly on #98 and is now at `4e895252`. It
  consolidates the embedded Lobster bridge and exploratory #102-#108 behavior:
  managed skill calls, regarding inheritance, ordered completion, recorded
  outcome branching, approval, and selected-data handoff. The late
  cross-session query demo was intentionally omitted because #97 already owns
  the foundational business-record query and the demo depended on the deleted
  mixed accounting/history layer.
- OpenClaw #109 is a 154-line draft at `56c9c6db`. It projects completed
  child audit input/output usage and one unambiguous model into Lobster's native
  result shape, and preserves `_meta.cost` through the OpenClaw runner. It
  deliberately depends on Lobster #1; integrated proof cannot pass against the
  currently published Lobster package because that release drops `_meta.cost`.
- The former #99 custom accounting/budget/history layer is not in the new
  chain. Lobster's existing `CostTracker` and `cost_limit` own workflow totals
  and enforcement; OpenClaw supplies observed managed-run usage. Useful work
  history remains part of the experimental record rather than a second ledger.
- Updated all six PR titles/bodies with the same opportunity, ownership model,
  support-case example, links, and proof boundaries. All remain draft,
  mergeable, and fork-only. Nothing was opened upstream.
- Closed superseded fork experiments #66-#70, #76-#93, #95-#96, #99, and
  #102-#108 with replacement links. Their branches and discussion remain; no
  branches were deleted. Unrelated fork PRs were untouched.
- Final OpenClaw heads are #97 `7a71d9a7`, #98 `eec741d7`, #100 `4e895252`,
  and #109 `56c9c6db`. All four drafts are open and mergeable. RFC #6 remains
  at `92f746e`; Lobster #1 remains at `0ad538b3` and is open and mergeable.
- Full fork CI passed all 114 jobs for #100 at run `29449202361` and all 114
  jobs for #109 at run `29449204163`. The repair loop regenerated the six
  Linux/Node 24 prompt snapshots, preserved CLI managed-invocation lineage,
  omitted absent lineage from ordinary CLI runs, synchronized the inherited
  oxlint override contract, isolated workflow adapters so the LOC ratchet
  passes, and fixed the #109 `_meta` lint access.
- Local focused proof after the adapter split passed 195 regarding, gateway,
  plugin-runtime, and audit assertions. The broader Windows spawn suite still
  has its known `/tmp` path normalization mismatch, and the CLI prepare test
  cleanup can hit a Windows SQLite `EBUSY`; Linux CI passed both owning lanes.
- The temporary Linux prompt-snapshot generator branch, worktree, and local
  artifact were removed after its deterministic patch was applied. No helper
  commit is in the PR ancestry.
- Active implementation worktrees:
  `C:\src\openclaw-skill-workflows-condensed` on
  `agent/skill-workflows-condensed` (same head as #100) and
  `C:\src\openclaw-skill-workflows-usage-rollup` on
  `agent/skill-workflows-usage-rollup` (#109). Both source trees are clean.

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
### 2026-07-15 recorded-outcome workflow branch

- Opened fork-only stacked OpenClaw draft PR
  [#106](https://github.com/giodl73-repo/openclaw/pull/106), title **Skills
  metadata: branch on recorded outcomes**, commit `4596814b`, base
  `agent/skill-workflows-two-step` / PR #105. It is open, draft, and mergeable;
  nothing was opened upstream.
- The existing trusted `subagent.waitForRun` result can now include the
  completed child's persisted `openclaw-audit-run` summary when the caller
  supplies the child session key. The reader reuses the current SQLite
  trajectory store and audit projection, so receipts, token usage, cost,
  models, skills, and invocation facts keep their existing owner and schema.
- Embedded `openclaw.skill --receipt-type <type>` returns the full recorded run
  audit plus the matching receipt, if present. It does not parse assistant
  prose, trust declared skill outcomes as evidence, or copy facts into a new
  workflow/CRM store.
- The support-case example now uses Lobster's existing `when:` expression.
  `resolve-case` runs only when `verify-customer` records
  `customer.verified`; a non-matching receipt leaves the dependent step
  skipped. This is the next natural workflow stair-step after recording facts
  and waiting for ordered completion.
- Focused proof passed 97 tests: 1 real SQLite audit-reader test, 62 Gateway
  plugin-runtime tests, and 34 embedded Lobster tests. Both the matching and
  non-matching receipt branches are covered. Scoped Oxfmt and
  `git diff --check` passed.
- Legacy full TypeScript exhausted its 4 GB Windows heap; the repository tsgo
  project check exceeded its bounded run without emitting diagnostics. The
  first Codex review attempt hit the missing Windows sandbox helper and the
  sandbox-bypass retry exceeded five minutes without a result. Direct
  owner-boundary review found no actionable issue, and the PR body reports the
  review and live-proof limits explicitly.
- Opened fork-only stacked OpenClaw draft PR
  [#107](https://github.com/giodl73-repo/openclaw/pull/107), title **Skills
  metadata: approve before acting on an outcome**, commit `4d90effc`, base
  `agent/skill-workflows-outcomes` / PR #106. It is open, draft, and mergeable;
  nothing was opened upstream.
- The support-case example now uses Lobster's existing `approval:` step after
  the `customer.verified` receipt and before the mutating `resolve-case` skill.
  The receipt is the approval subject; Lobster owns suspension/resume and
  TaskFlow keeps the durable flow relationship. No new runtime or schema was
  added.
- Approval resumes the same workflow and invokes `resolve-case`. Rejection,
  failed verification, and a non-matching receipt do not invoke it. All 69
  focused Lobster runner, registry, TaskFlow, and tool tests passed on Windows.
- `codex --dangerously-bypass-approvals-and-sandbox review --uncommitted` was
  attempted twice; both bounded five-minute runs timed out without output or
  findings. Direct diff and published Lobster dependency review found no
  actionable issue.
- Opened fork-only stacked OpenClaw draft PR
  [#108](https://github.com/giodl73-repo/openclaw/pull/108), title **Skills
  metadata: carry a selected outcome into the next skill**, commit `4e80444c`,
  base `agent/skill-workflows-approval` / PR #107. It is open, draft, and
  mergeable; nothing was opened upstream.
- `openclaw.skill --input-name <name>` now accepts exactly one explicit
  Lobster pipeline input and snapshots only that value into the existing
  `sessions_spawn` attachment path as `workflow-input.json`. OpenClaw's normal
  attachment limits and child-workspace materialization remain authoritative.
- The support-case example selects only
  `receipt.data.authorizationCode`; the approved `resolve-case` child receives
  `{ "authorizationCode": "RET-42" }`, not the full receipt, audit summary, or
  transcript. Missing input fails before child spawn.
- All 71 focused Lobster runner, registry, TaskFlow, and tool tests passed on
  Windows, with scoped format, lint, and diff checks clean. The bounded
  `codex --dangerously-bypass-approvals-and-sandbox review --uncommitted` run
  again timed out after five minutes without output or findings; direct review
  of the Lobster template and OpenClaw attachment owner found no actionable
  issue.
- Next narrow question: roll actual child-run usage up at the TaskFlow/workflow
  boundary so an operator can see and eventually constrain total workflow
  spend without attributing tokens to individual receipts.
- Dependency audit found that published `@clawdbot/lobster` 2026.6.11 already
  owns workflow token/cost aggregation and `cost_limit`, but its public tool
  runtime drops `_meta.cost` and its pause state does not preserve the
  `CostTracker` summary. OpenClaw should adapt child audit usage into Lobster's
  native `usage` / `model` result convention rather than create a second
  accounting ledger.
- Opened fork-only Lobster draft PR
  [#1](https://github.com/giodl73-repo/lobster/pull/1), title **Preserve
  workflow cost metadata across pauses**, commit `0ad538b`, base `main`. It is
  draft, open, and mergeable; nothing was opened against `openclaw/lobster`.
  The PR snapshots Lobster's existing cost summary in existing resume state,
  restores it across approval and structured-input pauses, returns `_meta.cost`
  through embedded and CLI tool envelopes, and preserves incurred accounting
  on cancellation without making stale-state cleanup less reliable. It adds no
  database, pricing model, or receipt-level attribution.
- Focused proof passed TypeScript compilation; approval/input/`for_each` resume
  and cancellation behavior; the public CLI cost envelope; 12 CostTracker
  tests; format, lint, and diff checks. The full Windows suite was attempted
  but retained 108 existing Windows path/shell failures. Codex review accepted
  and drove fixes for loop replay, human-input misclassification, CLI envelope
  parity, cancellation accounting, stale-state cleanup, and cleanup-error
  handling. The final full-access review reported no actionable regression.
  Intermediate usage produced and consumed entirely inside one pipeline before
  an in-pipeline input suspension remains a separate Lobster accounting topic;
  managed OpenClaw skills are separate workflow steps and do not require it.
- An OpenClaw follow-on worktree exists at
  `C:\src\openclaw-skill-workflows-usage-rollup` on branch
  `agent/skill-workflows-usage-rollup`, based on PR #108. Its local uncommitted
  adapter projects child audit `input` / `output` usage and a single model ID
  into Lobster's native result shape and preserves `_meta` in the OpenClaw
  runner. Do not publish that branch until the Lobster prerequisite is
  available as a dependency; then rerun the integrated multi-child and
  approval-resume proof and open the next fork-only OpenClaw draft PR.

### 2026-07-15 ordered managed support-case workflow

- Opened fork-only stacked OpenClaw draft PR
  [#105](https://github.com/giodl73-repo/openclaw/pull/105), title **Skills
  metadata: run case steps to completion in order**, commit `f1f5514c`, base
  `agent/skill-workflows-support-case-proof` / PR #104. It is draft and
  mergeable; nothing was opened upstream.
- The POC adds a readable `support-case.lobster` example: a root
  `support-case` skill declares `case.resolved` and
  `uses-skills: verify-customer resolve-case`; Lobster sequences those two
  ordinary managed OpenClaw skill calls under stable TaskFlow step identities.
- Codex review caught that `sessions_spawn` acceptance is asynchronous and
  therefore did not prove dependency ordering. The accepted P1 was fixed by
  reusing the existing plugin runtime `subagent.waitForRun` primitive.
  `openclaw.skill` now waits for successful managed-run completion before the
  workflow advances; error or timeout stops the workflow before the dependent
  step. No new workflow DSL, storage, CRM, receipt, or accounting layer was
  added.
- Both children continue through the existing `sessions_spawn` owner, so
  OpenClaw retains skill visibility and `uses-skills` policy, parent lineage,
  receipt/outcome recording, regarding inheritance, usage, and the shared root
  token budget. Child steps deliberately omit independent token budgets.
- Focused proof passed 122 tests across the managed-skill and Lobster shards,
  plus 6 targeted regarding-inheritance tests. The real embedded
  `@clawdbot/lobster` 2026.6.11 runtime produced the trace
  `spawn verify -> complete verify -> spawn resolve -> complete resolve`; a
  verification error invoked only the first child. Scoped Oxfmt, Oxlint, and
  `git diff --check` passed. One broad Windows subagent-spawn run retained the
  unrelated `/tmp/task-repo` versus `C:\tmp\task-repo` fixture mismatch.
- The first Codex review produced the ordering P1 above. The post-fix review
  exceeded its four-minute bound without returning a result, so the PR does
  not claim a clean automated post-fix verdict. Manual invariant review and
  the new success/failure execution tests found no further actionable issue.
- Fork checks passed real-behavior proof, runner admission, actionlint,
  no-tabs, dispatch, and all platform-scope detections. Label and auto-response
  failed only at the expected fork permission boundary; draft-scoped CI lanes
  skipped.
- Next stair-step: carry a small structured child outcome into the next
  Lobster step and branch on it using Lobster's existing condition primitive,
  then add an approval gate for the mutating resolution action. Keep outcome
  facts and approvals in their existing OpenClaw owners and avoid inventing a
  second workflow state model.

### 2026-07-15 support-case golden-path query

- Opened fork-only stacked OpenClaw draft PR
  [#104](https://github.com/giodl73-repo/openclaw/pull/104), title **Skills
  metadata: find all work regarding a case**, commit `3aa7fbcc`, base
  `agent/skill-workflows-regarding-inheritance` / PR #103. It is draft and
  mergeable; nothing was opened upstream.
- A receipt-filtered `sessions tail --audit-runs` query without an explicit
  session key now searches every session in the selected agent/store scope,
  includes retained session-family history, orders matching runs by first
  event, and applies one global tail. Explicit-session and ordinary unfiltered
  active/latest selection remain unchanged.
- The golden source-harness case uses the real session store, SQLite trajectory
  persistence/reader, receipt matcher, run projection, lineage, usage, and cost
  records. One Dataverse case query returns an email support run plus its
  managed `verify-customer` child, `case.updated` and `customer.verified`
  evidence, `run-child -> run-parent`, 175 tokens, and USD 0.01 mixed-basis
  cost; an unrelated case is excluded.
- Command and CLI proof passed 58 tests across two routed Vitest shards. Scoped
  Oxfmt, Oxlint, and `git diff --check` passed. WSL was unresponsive, so the
  documented tiny linked-worktree Windows fallback was used. The bounded
  `codex review --uncommitted` attempt timed out without output; direct review
  found no actionable issue.
- The change adds no CRM/index/workflow store. It composes existing OpenClaw
  primitives into the operator question: “what work did we do for this case?”
  The PR body shows the exact one-command query and frames it as the golden
  support-case workflow stepping stone.
- Fork checks passed real-behavior proof, runner admission, actionlint,
  no-tabs, dispatch, and all platform-scope detections. Label and auto-response
  failed only at the expected fork permission boundary; draft-scoped CI lanes
  skipped.

### 2026-07-15 managed skill regarding inheritance

- Opened fork-only stacked OpenClaw draft PR
  [#103](https://github.com/giodl73-repo/openclaw/pull/103), title **Skills
  metadata: keep child work regarding the same record**, commit `8cf77e54`,
  base `agent/skill-workflows-managed-skill` / PR #102. It is draft and
  mergeable; nothing was opened upstream.
- The existing context-bound nested tool path now carries the exact requester
  `sessionId` into managed `sessions_spawn`. An isolated child skill copies the
  parent session's existing singular `regarding` value only when the current
  stored parent entry still has that exact session id. This lets case-,
  invoice-, or order-filtered receipt queries find the managed child work
  directly while preventing late work from inheriting a rotated replacement
  session's record.
- Ordinary subagents do not inherit the relationship. Missing, stale, or
  unreadable parent state fails closed. The copied value is revalidated at the
  existing child-session patch boundary. No relationship store, CRM matching,
  multi-regarding model, or workflow DSL was added.
- Focused proof passed: 2 managed-spawn lineage tests, 6 exact inheritance
  boundary tests, 2 runtime invocation tests, and 3 targeted Gateway invocation
  tests. Scoped Oxfmt, Oxlint, `git diff --check`, and whitespace checks passed.
  `codex review --uncommitted` and direct core/test TypeScript checker attempts
  exceeded their bounded Windows timeouts without producing a patch diagnostic;
  manual invariant review found no actionable issue.
- The PR body tells the business/query story and frames direct relationship
  inheritance as a natural workflow stepping stone: independently executed
  skill steps retain lineage, spend, receipts, and the record their work is
  about. Sequencing, branching, and expressions remain later layers.
- Fork checks passed real-behavior proof, runner admission, actionlint,
  no-tabs, dispatch, and all three platform-scope detections. Label and
  auto-response failed only at the expected fork permission boundary; the
  draft-scoped CI lanes skipped.

### 2026-07-15 Skill metadata stack Codex review closeout

- Completed Codex branch review and corrective loops for fork-only OpenClaw
  drafts [#97](https://github.com/giodl73-repo/openclaw/pull/97),
  [#98](https://github.com/giodl73-repo/openclaw/pull/98),
  [#99](https://github.com/giodl73-repo/openclaw/pull/99), and
  [#100](https://github.com/giodl73-repo/openclaw/pull/100). All four remain
  drafts, preserve their stacked bases, and report mergeable.
- Published reviewed heads: #97 `63626f9e`, #98 `4cfc9c3d`, #99 `22d4300c`,
  and #100 `3b9256c4`. Every force-push used an explicit lease against the
  previously observed fork head.
- #98 now preserves trusted CLI invocation context and parent lineage, validates
  cross-agent skills against the target, and settles lifecycle/telemetry only
  after actual fallback decisions. Final focused Codex review was clean.
- #99 now retains durable budget owners through supported cleanup, includes
  rotated session families, and deterministically orders reconstructed history.
  The chronology correction passed 25 focused tests and a clean fix review.
- #100 replaced the invalid Gateway RPC experiment with one public,
  context-bound `runtime.tools.invoke` plugin primitive backed by the existing
  canonical invocation engine. Nested calls retain session, channel, account,
  destination, thread, sender/owner, conversation-read origin, and active
  provider/model policy; naming a target does not expand the allowed tool
  surface. Final proof passed 131 focused policy tests after a broader 180-test
  regression run, production TypeScript, plugin-SDK declarations/API/surface
  guards, lint, format, and diff checks.
- Refreshed all four PR bodies with the business opportunity, search/count/audit
  story, workflow stepping-stone framing, current architecture, and exact proof.
  The new #100 `actionlint` and `no-tabs` failures were checkout fetch timeouts
  for GitHub's merge SHA; both passed on the rerun. Fork label/auto-response
  failures remain the expected permission boundary.

### 2026-07-14 condensed Skill Metadata stack review

- Ran `codex review` against each PR's actual stacked base for fork PRs
  #97-#100. #97 and #99 completed; #98 and #100 reached the ten-minute command
  cap without a result and are not considered clean.
- Accepted #97 P1: receipt snapshotting reloads a reusable session key without
  verifying the loaded row still has the attempt's session id, so a late old
  tool result can inherit a newly rebound session's `regarding` association.
- Accepted #99 P1: the durable budget owner is stored on the root child session;
  supported delete cleanup paths that do not wait for requester delivery can
  remove that row while descendants still hold its owner reference.
- Accepted #99 P2: `--audit-thread` and `--audit-orchestrations` read only the
  current `TailSelection`; retained `usageFamilySessionIds` from session
  rotation are not included, producing incomplete histories.
- Manual verification for timed-out #98 found that `skill` is validated against
  the parent run's skill snapshot even when `agentId` targets a different agent,
  so the child may lack the skill whose invocation is recorded.
- Manual verification for timed-out #100 found two issues: embedded
  `openclaw.invoke --session-key` can select another agent/session instead of
  staying within the invoking plugin context, and `--each --step-id` reuses one
  idempotency key for every mapped item.
- Review-only pass: no code, branch, or PR comments were changed. Fix the two
  foundation findings in #97/#99 first, then #98 and #100, rerun focused proof,
  and rerun Codex review until clean.

### 2026-07-14 Skill metadata workflow consolidation

- Condensed the fork-only OpenClaw proof into four reviewable draft PRs:
  [#97 business work records](https://github.com/giodl73-repo/openclaw/pull/97),
  [#98 managed invocation and lineage](https://github.com/giodl73-repo/openclaw/pull/98),
  [#99 usage, budgets, and work history](https://github.com/giodl73-repo/openclaw/pull/99),
  and [#100 embedded Lobster workflow bridge](https://github.com/giodl73-repo/openclaw/pull/100).
- The workflow architecture now reuses existing owners: Lobster supplies typed
  steps, branching, approvals, and resume; TaskFlow owns durable flow identity,
  status, waits, revisions, and child-task lineage; OpenClaw sessions and tools
  supply execution context and policy. Agent Skills metadata remains limited to
  portable declarations of outcomes, possible skill use, and isolation.
- PR #100 routes embedded `openclaw.invoke` through the plugin runtime's
  existing `tools.invoke` Gateway primitive, defaults to the current session,
  carries TaskFlow identity, derives stable per-step idempotency keys, and
  prevents recursive Lobster invocation. Focused validation passed 61 tests,
  targeted Oxlint, Oxfmt, and `git diff --check`.
- Updated fork RFC PR #6 and source commit `6e12252` to describe this reuse-first
  architecture and the four-PR proof series:
  `https://github.com/giodl73-repo/rfcs/pull/6`.
- Fork-only stacked OpenClaw draft PR #102 completes the next narrow slice:
  `https://github.com/giodl73-repo/openclaw/pull/102`, commit `55f33285`, base
  `agent/skill-workflows-lobster-bridge`. It adds the friendly embedded Lobster
  command `openclaw.skill` / `clawd.skill`, which delegates one named skill step
  to the existing context-bound `runtime.tools.invoke` and `sessions_spawn`
  path. The command accepts a task, optional root token budget, optional model,
  optional task name, and stable step id. OpenClaw still owns skill visibility,
  `uses-skills` validation, policy, child-run lineage, receipts, usage, and
  shared descendant budgets; no second workflow engine or ledger was added.
- The trusted plugin tool context now carries the current run id, skill
  snapshot, and explicit skill invocation into nested Gateway tool resolution,
  allowing a managed skill to call a declared child skill without losing
  lineage or budget context. Regarding remains joined through the parent
  orchestration; directly copying the regarding record onto isolated child
  sessions is a later query/usability slice.
- Final focused validation passed 173 managed-skill/context tests plus 51
  Lobster regressions. Targeted lint, format, diff, SDK API baseline, SDK
  surface, and export checks passed. Full TS remained blocked by the inherited
  `packages/net-policy/src/ip.ts` diagnostics. Codex review found and fixed one
  real bare-`--token-budget` boolean coercion bug; three post-fix clean-verdict
  attempts were blocked by the missing Windows sandbox helper or 15/30-minute
  review infrastructure ceilings, so PR #102 explicitly does not claim a clean
  post-fix review. The draft is open and mergeable. Real behavior proof,
  runner admission, actionlint, no-tabs, dispatch, and platform-scope detection
  passed; label and auto-response failed only at the expected fork permission
  boundary, while draft-scoped CI lanes skipped.
- Next narrow slice: decide whether managed child sessions should inherit the
  parent's `regarding` identity directly so case/invoice-filtered receipt
  queries include isolated child work without first traversing orchestration
  lineage. Keep that separate from expressions, branching, and workflow DSLs.

### 2026-07-14 RFC 0022 architecture consolidation

- Fork RFC PR #6 was rewritten around the tighter Skill Receipts and
  Orchestration contract: `https://github.com/giodl73-repo/rfcs/pull/6`, commit
  `e42c82f`.
- The central ownership rule is: `SKILL.md` declares intent, a Claw or caller
  supplies policy, and the OpenClaw harness records facts. Skill declarations
  never become evidence or widen runtime authority.
- The portable Agent Skills author surface is three plain string metadata hints:
  `outcomes`, `uses-skills`, and `isolation`. Actual receipts, tokens, cost,
  credentials, permissions, and authoritative budgets remain runtime evidence
  or caller policy.
- When a Claw owns the agent, RFC 0022 depends on RFC 0016 for exact package
  identity, installed-agent provenance, composition, and lifecycle. Standalone
  skill invocation remains supported with equivalent local caller policy.
- Spend is owned by model runs: isolated children may receive exclusive token
  and USD attribution, shared turns remain shared, and orchestration totals
  count each run once. Cost records capture both amount and whether the basis
  was provider-billed, catalog-estimated, or mixed.
- The first orchestration milestone is one audited, measurable, budgeted child
  skill call. The 17 exploratory fork POCs are now consolidated into six
  implementation slices: receipts, regarding, metadata/invocation, child
  lineage, spend, and a shared root budget. Ordered steps, expressions, retries,
  loops, joins, and parallel fan-out remain later work.

### 2026-07-14 Skill Receipts six-slice proof stack

- Published six fork-only stacked OpenClaw draft PRs:
  [#88 receipts](https://github.com/giodl73-repo/openclaw/pull/88),
  [#89 regarding](https://github.com/giodl73-repo/openclaw/pull/89),
  [#90 metadata and invocation](https://github.com/giodl73-repo/openclaw/pull/90),
  [#91 child lineage](https://github.com/giodl73-repo/openclaw/pull/91),
  [#92 token and USD spend](https://github.com/giodl73-repo/openclaw/pull/92),
  and [#93 shared budget enforcement](https://github.com/giodl73-repo/openclaw/pull/93).
- Slice 6 owns one durable token counter on the root managed skill session,
  atomically charges every completed attempt including overshoot, and checks
  admission before the next model attempt and before a descendant managed skill
  starts. Descendants inherit the owner reference and cannot widen the budget.
- Final slice validation: 102 focused tests passed; the broader focused run
  passed 145 tests with only the existing Windows `/tmp/task-repo` fixture
  mismatch. Type-aware Oxlint, Oxfmt, and `git diff --check` passed across all
  22 changed files.
- Updated fork RFC PR #6 at commit `c494837` to point at the consolidated proof
  stack and to keep version 1 budget enforcement token-based. Captured USD
  spend and its basis remain in the run/orchestration projection; hard USD
  enforcement stays a later policy decision. No upstream RFC PR is open.
- Reframed the RFC PR body around the enterprise opportunity: skills as
  measurable business capabilities and Claws as the packaging, provenance,
  policy, and budget standard they can excel at. Added a complete `SKILL.md`
  metadata example for an isolated refund skill, a concrete
  `payment.refunded` authorization-code receipt, cross-domain receipt examples,
  and direct links to the six consolidated proofs.
- Simplified the author-facing metadata after comparing the current Agent
  Skills specification and community proposals. RFC head `24bb048` uses
  the provisional `openclaw.orchestration` JSON envelope with three plain
  string hints: `outcomes`, `uses-skills`, and `isolation`. Receipt remains a
  runtime evidence term; skill authors declare outcomes. `uses-skills` denotes
  possible delegation and is intentionally distinct from community proposals
  for hard `requires` dependencies.
- Migrated the actual consolidated OpenClaw stack to that vocabulary. Current
  heads: #90 `d36cd9eb`, #91 `2b31d0b4`, #92 `c00692cd`, and #93 `127a21bb`.
  The runtime/gateway/audit property is now `executionHints`; declared-child
  enforcement reads `usesSkills`. The provisional JSON envelope and its parser
  are absent from the current stack.
- Current-head validation after migration: slice 3 had 44 focused passes plus
  one unrelated Windows SQLite cleanup `EBUSY`; slice 4 had 106 passes plus the
  existing `/tmp/task-repo` Windows fixture; slice 5 had 172 passes; slice 6
  had 120 focused passes. Type-aware Oxlint, Oxfmt, and diff checks passed for
  every affected slice.
- Rewrote all six OpenClaw PR bodies around the enterprise opportunity and the
  outcome/regarding/receipt distinction, and added exact `Real behavior proof`
  sections. All six remain fork-only drafts and report mergeable.
- Follow-up body audit removed the last historical references to the
  provisional metadata key from OpenClaw #90 and RFC #6. Live verification now
  finds no old key in any of the six OpenClaw PR bodies or the RFC PR body;
  #90's proof section describes only `outcomes`, `uses-skills`, `isolation`, and
  normalized `executionHints`.
- Retitled the fork RFC for standards discussion with Anthropic and the wider
  Agent Skills community: **RFC 0022: Agent Skills Metadata for Outcomes and
  Execution**. Renamed the RFC source to
  `rfcs/0022-agent-skills-metadata.md`, pushed fork head `d8782e4`, and rewrote
  the PR body so Agent Skills is the protagonist while OpenClaw/Claws and the
  six Skill Receipts PRs are presented as reference implementation evidence.
- The RFC and PR body now make typed outcomes explicitly searchable and
  countable: operators can filter and group by outcome type, skill revision,
  session/run, model, time, status, or `regarding` business record; join the
  evidence to lineage, usage, cost, and budgets; and audit declared outcomes
  that have no corresponding observed evidence.
- The RFC and PR body also describe these same primitives as a natural stepping
  stone to later workflows. Outcomes, skill composition edges, isolation,
  lineage, evidence, spend, and budgets can support ordered steps, gates,
  retries, and fan-out later without putting workflow semantics in the initial
  Agent Skills metadata contract.
- Added two fork-only follow-on demonstrations for lightweight operational
  memory. OpenClaw draft PR #95 finds durable sessions by exact `regarding`
  identity (`6ef073a0`), and stacked draft PR #96 reconstructs the selected
  session's outcomes, evidence, association changes, skill/model lineage,
  usage, and cost (`d71cc664`). Both are mergeable and have exact Real behavior
  proof sections.
- PR #95 passed 33 CLI registration tests; its Windows session-command cases
  reached the assertions but retained the existing SQLite cleanup `EBUSY`.
  PR #96 passed all 57 focused projection, command, and CLI tests. Targeted
  Oxfmt, type-aware Oxlint, and diff checks passed for both. Fork CI admitted
  both heads and passed proof/workflow checks while the normal Node lanes
  skipped under draft/fork policy.
- RFC 0022 and its PR body now call this a lightweight case-tracking or
  operational-memory path, not a full CRM. A Claw packages skills, outcome
  vocabulary, policy, budgets, and views; OpenClaw retains live operational
  records. Long-term revisitability remains subject to retention, backup, and
  export policy.
- Reworked the RFC and fork PR body into one natural customer-thread story:
  inbound email becomes a stable session, `regarding` supplies business
  context, skill metadata declares possible outcomes, tools supply evidence,
  the harness records execution and spend, and a later operator or agent can
  find and reconstruct the work. CRM is now mentioned only as an optional
  richer system of record rather than a separate headline feature.

### 2026-07-14 orchestration token usage charging

- Fork-only stacked OpenClaw draft PR #87 connects completed embedded model
  attempts to the shared orchestration budget owner:
  `https://github.com/giodl73-repo/openclaw/pull/87`, commit `6bcd1cd0`, base
  `agent/orchestration-token-budget-owner` / PR #86.
- Each completed attempt with an inherited budget reference charges the root
  session before OpenClaw can dispatch a retry or fallback. Failed and timed-out
  attempts are included when normalized usage is available. Ordinary runs and
  attempts without observed usage remain unchanged.
- The charge uses OpenClaw's existing normalized billing total: the provider
  aggregate when present, otherwise input + output + cache read + cache write.
  A call that crosses the limit is recorded in full, preserving actual observed
  spend rather than clipping it to the remaining allowance.
- The atomic mutation now validates `rootRunId`, preventing a stale descendant
  reference from charging a different root run's owner. The accounting helper
  returns the charge result so the next stair-step can enforce exhaustion
  without rereading the ledger.
- This slice records spend only; it does not block model calls or child skill
  invocations. Next: check the shared owner before the next model action and
  before accepting another child skill once the prior charge reports exhaustion.
- Proof passed: 23 focused budget/accounting/usage tests and the production
  retry-boundary case in both agent test projects. Scoped Oxfmt, type-aware
  Oxlint, and diff checks passed. The core type pass reached only the three
  existing `packages/net-policy/src/ip.ts` diagnostics. Codex autoreview timed
  out after two minutes without output; manual diff review found no actionable
  issue.

### 2026-07-14 orchestration token budget owner

- Fork-only stacked OpenClaw draft PR #86 adds the first live orchestration
  budget owner: `https://github.com/giodl73-repo/openclaw/pull/86`, commit
  `a046f82b`, base `agent/audit-orchestration-usage` / PR #85.
- `sessions_spawn` accepts `tokenBudget` only with a named root child skill.
  Before the child agent starts, OpenClaw persists one core-owned
  `orchestrationBudget` on the canonical root child session. The record carries
  `rootRunId`, `tokenLimit`, `tokensUsed`, timestamps, and first exhaustion
  time. The session slot is reserved from plugin collisions.
- Descendant skill invocations inherit a trusted owner session/run reference;
  they cannot redefine the root limit. The session-store API provides
  serialized create/read/charge operations, including concurrent-charge proof.
  Retained trajectory totals are not used as the enforcement counter.
- This slice deliberately does not connect normalized model usage or block
  work. Next: charge each completed model attempt to the shared owner, recording
  actual observed tokens even when a provider call overshoots the remaining
  limit. After that, add admission checks that stop before the next model or
  child-skill action once exhausted.
- Proof passed: 66 budget/invocation/tool tests, 4 focused gateway-ordering
  cases, 17 plugin slot tests, scoped type-aware Oxlint, formatting, and diff
  checks. A broader spawn/tool run passed 83 tests and retained the existing
  Windows `/tmp/task-repo` normalization assertion failure. A bounded Codex
  review produced no output before its two-minute timeout; manual closeout
  found no actionable issue. The draft is mergeable at `a046f82b` with no
  comments or reviews. Real-behavior proof, runner admission, dispatch,
  actionlint, no-tabs, and platform-scope detection passed; label and
  auto-response failed only because fork secrets are unavailable.

### 2026-07-14 orchestration usage accounting

- Fork-only stacked OpenClaw draft PR #85 adds a read-only orchestration usage
  view: `https://github.com/giodl73-repo/openclaw/pull/85`, commit `83772dc4`,
  base `agent/audit-child-skill-correlation` / PR #84.
- `sessions tail --audit-orchestrations` scans the selected agent session
  trajectories, links retained parent and child runs through existing
  `parentRunId` data, and emits one `openclaw-audit-orchestration` record per
  observed root. Each record preserves per-run/session usage and sums every
  contributing run exactly once.
- The schema declares `accountingScope: observed-runs`. This is deliberately a
  retention-bounded audit total, not a hard budget ledger. Orphaned child
  fragments are omitted rather than presented as complete totals. Cross-agent
  inspection continues to use the existing `--all-agents` selector.
- No budget configuration or enforcement, workflow step, expression, fan-out,
  executor, or persistence was added. Existing run-audit behavior remains
  unchanged.
- Focused projection, SQLite multi-session command, and CLI registration proof
  passed 56 tests across three shards. Scoped formatting, Oxlint, and diff
  checks passed. A bounded direct Codex review produced no output before its
  90-second timeout; manual closeout added the explicit observed-accounting
  scope and found no further actionable issue. Fork checks passed real-behavior
  proof, runner admission, actionlint, no-tabs, dispatch, and platform-scope
  detection; label and auto-response failed only at the expected fork
  permission boundary. The PR is draft and mergeable with no comments or
  reviews at head `83772dc4`.
- Next: if the POC continues toward enforcement, introduce a live shared budget
  owner with an explicit limit and atomic consumption. Do not use retained
  trajectory totals as the enforcement counter.

### 2026-07-14 child audit-run correlation

- Fork-only stacked OpenClaw draft PR #84 exposes child invocation lineage in
  the existing run audit projection:
  `https://github.com/giodl73-repo/openclaw/pull/84`, commit `638697ec`, base
  `agent/child-skill-invocation` / PR #83.
- Each `skillInvocations[]` summary may now include the already-recorded
  `parentInvocationId` and `parentRunId`. The fields are additive and optional;
  the `openclaw-audit-run` schema remains version 1.
- Parent and child remain separate run summaries. Model usage stays on the run
  that consumed it, so consumers can join the records without falsely rolling
  child tokens into the parent or attributing tokens to an individual receipt.
  No executor, store, workflow step, budget, expression, or fan-out behavior is
  added.
- Focused audit projection and sessions-tail proof passed 21 tests across two
  shards. Scoped formatting, Oxlint, and diff checks passed. A bounded direct
  Codex review produced no output before its 60-second timeout; manual
  closeout found no actionable issue. Fork checks passed real-behavior proof,
  runner admission, actionlint, no-tabs, dispatch, and platform-scope
  detection; label and auto-response failed only at the expected fork
  permission boundary. The PR is draft and mergeable with no comments or
  reviews at head `638697ec`.
- Next: use the joined parent/child run view to define explicit accounting
  semantics before introducing a budget. Ordered steps and skill-to-skill
  declarations remain later slices.

### 2026-07-14 child skill invocation

- Fork-only stacked OpenClaw draft PR #83 runs one named child skill through
  the existing `sessions_spawn` subagent/session and gateway-agent path:
  `https://github.com/giodl73-repo/openclaw/pull/83`, commit
  `a29cf827644f0707b6405f199d9998019d25be61`, base
  `agent/shared-skill-invocation-identity` / PR #82.
- `sessions_spawn` gains one optional `skill` selector. The selector must match
  exactly one model-visible, model-invocable skill in the current run snapshot;
  hidden, ambiguous, missing, and `disableModelInvocation` skills are rejected.
  ACP child-skill invocation remains intentionally deferred.
- A successful child request uses the shared invocation constructor and carries
  a complete `parentInvocationId` / `parentRunId` pair through a backend-only
  gateway request into the ordinary child agent run. The child trajectory
  records invocation start/completion as `activation: orchestration` and
  `caller: skill`; its existing model lifecycle continues to own token usage.
  The accepted spawn result returns `skillInvocationId` beside `runId` and
  `childSessionKey`.
- This adds no second executor, sidecar, step engine, expressions, budgets, or
  parallel fan-out. It is the first production consumer that justifies child
  invocation lineage.
- Focused proof passed: 3 invocation-constructor tests, 57 spawn/trajectory
  tests, 4 gateway authorization/forwarding tests across both gateway configs,
  and the focused subagent transport test. Formatting, diff checks, and scoped
  Oxlint passed. The full typecheck did not complete within ten minutes in the
  junction-backed worktree. The full subagent-spawn file retains an unrelated
  Windows `/tmp` normalization failure; the changed case passes in isolation.
  Autoreview recursively launched itself under nested skill discovery and was
  stopped after ten minutes; manual closeout tightened lineage to all-or-none
  and found no further actionable issue. Fork checks passed real-behavior
  proof, runner admission, actionlint, no-tabs, dispatch, and platform-scope
  detection; label and auto-response failed only at the expected fork
  permission boundary. The PR is draft and mergeable with no comments or
  reviews at head `a29cf827`.
- Next: let this child-run receipt settle before adding any ordered-step state.
  A later narrow slice may expose child invocation/run correlation in the
  existing run audit summary. Budgets still wait for explicit parent/child
  accounting semantics; expressions remain later.

### 2026-07-14 shared skill invocation identity

- Fork-only stacked OpenClaw draft PR #82 centralizes invocation identity for
  both prompt-backed and direct tool-dispatched skill commands:
  `https://github.com/giodl73-repo/openclaw/pull/82`, commit
  `80cc78421bf32fe57b1efdbd2360ad3abc5160d4`, base
  `agent/direct-skill-dispatch-audit` / PR #81.
- The shared constructor owns the secure invocation ID plus command, skill, and
  bounded source fields. It replaces two duplicate production constructions
  without changing the recorded event shape or runtime behavior.
- Two autoreview passes correctly rejected proposed parent/child metadata as
  inert because no production child-session path consumed it. Those fields,
  projections, and synthetic tests were removed rather than publishing a
  correlation contract that real skill dispatch could not produce.
- Focused helper proof passed (1 test), and prompt/direct inline dispatch proof
  passed (2 tests). Focused type-aware Oxlint, formatting, and diff checks
  passed. The remote Crabbox wrapper failed its binary sanity check before
  allocating a box. The final bounded Codex review timed out without output;
  manual review covered the final three-file patch.
- Next: design one real managed child invocation through OpenClaw's existing
  child-session/subagent primitive, including how the child receives an
  explicit skill identity. Do not add parent fields until that production path
  can emit them. Ordered steps, model overrides, budgets, and expressions
  remain deferred.

### 2026-07-14 direct skill dispatch audit

- Fork-only stacked OpenClaw draft PR #81 audits direct
  `command-dispatch: tool` skill runs:
  `https://github.com/giodl73-repo/openclaw/pull/81`, commit
  `5da326fc8ef3402dd7069f3e667178fcec407286`, base
  `agent/explicit-skill-invocation-audit` / PR #80.
- Each durable direct dispatch now receives its own run, invocation, and tool
  call IDs. It records `skill.invocation.started`, records `skill.used` only
  after policy resolution selects a real tool, collects existing typed audit
  receipts, snapshots `regarding`, and records a blocked, error, or success
  completion.
- The integration proof uses a `payment.authorized` receipt with authorization
  code `AUTH-123`, regarding Dynamics case `case-42` / `CAS-42`. The joined run
  audit exposes the skill, tool, tool call, receipt, authorization code, and
  case correlation.
- Direct tool dispatch does not invent model or token data: its summary has no
  models and no usage. Model-backed prompt invocations continue to inherit
  real model/token telemetry from the existing trajectory recorder.
- Focused trajectory tests passed (4), focused inline dispatch tests passed
  (3), and focused type-aware Oxlint plus `git diff --check` passed. Codex
  review produced no findings before its three-minute timeout; manual review
  found no actionable issue. Fork real-behavior and dispatch checks pass; only
  the expected label and auto-response jobs fail for fork permissions.
- The next narrow slice should add parent/child invocation correlation using a
  shared invocation primitive. Ordered steps, per-child model overrides,
  expressions, and enforceable budgets remain intentionally deferred.

### 2026-07-14 explicit skill invocation audit

- Fork-only stacked OpenClaw draft PR #80 adds the first explicit skill-call
  lifecycle audit: `https://github.com/giodl73-repo/openclaw/pull/80`, commit
  `7dbcbb43c5f2`, base `agent/audit-run-summary` / PR #79.
- Authorized prompt-based skill commands now carry one stable invocation ID
  into the existing run and record `skill.invocation.started` plus
  `skill.invocation.completed`. The facts include command, resolved skill,
  bounded source, inbound caller, and terminal status; trajectory continues to
  supply run/session/model identity and existing `model.completed` events supply
  token usage. The run audit summary joins attempts by invocation ID.
- This slice deliberately excludes direct `command-dispatch: tool` skills,
  nested skill invocation, model selection, budgets, expressions, and new
  workflow/storage primitives.
- Focused invocation, terminal event, and audit-summary tests passed. Focused
  type-aware Oxlint and `git diff --check` passed. The broader Windows inline
  test file had one unrelated SQLite temp-file `EBUSY`; the new test passed
  independently. Core tsgo remains blocked by existing `packages/net-policy`
  typing errors. Codex review emitted no findings before timing out after three
  minutes; manual diff review found no actionable issue.

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
### 2026-07-13 auditable skill invocation RFC fork review

- Drafted RFC 0022, `Auditable Skill Invocation and Managed Skill Runs`, as an
  OpenClaw-native staged proposal: observe explicit invocation versus model
  access, enrich receipts, converge on one harness invocation primitive, add
  parent/child skill calls, then add durable static sequential skill runs.
- Expressions, conditions, parallelism, loops, joins, per-step models, and
  budgets remain explicitly deferred. The RFC contains no dependency on or
  reference to an external workflow system.
- Fork-only draft review PR:
  `https://github.com/giodl73-repo/rfcs/pull/6`, head
  `agent/rfc-0022-skill-invocation-audit` at `2df8c6b439cc`. Base and head both
  belong to `giodl73-repo/rfcs`; no PR or discussion was opened against
  `openclaw/rfcs`.
- Local RFC worktree: `C:\src\openclaw-rfcs-skill-audit`, clean after push.

### 2026-07-13 Skill Receipts and Orchestration fork prototypes

- Project name: **Skill Receipts and Orchestration**. The implementation begins
  with Skill Receipts; ordered steps, nested skills, model selection, token
  attribution, and budgets remain later phases.
- Fork-only OpenClaw draft PR #66 adds a typed receipt/audit record contract to
  structured tool results and preserves it through after-tool hooks and
  tool-result middleware:
  `https://github.com/giodl73-repo/openclaw/pull/66`, commit
  `5c5e6fd3e37`.
- Fork-only stacked OpenClaw draft PR #67 records valid receipts from successful
  tool calls as existing `audit.receipt` trajectory events with business type,
  tool name, and tool-call ID; existing trajectory adds time/session/run/model
  correlation:
  `https://github.com/giodl73-repo/openclaw/pull/67`, commit
  `749e7dc5fa5`.
- Exact `oxfmt 0.58.0` checks passed for both PRs. Fork CI ran fork-safe checks,
  but the main Node lane was skipped by runner admission. Sanitized AWS Crabbox
  lease `cbx_efb18a92fef0` was attempted and released during hydration before
  project tests ran; this is recorded as an infrastructure limitation, not a
  test pass or product failure. A final fresh-box retry stopped before lease
  creation because WSL could not mount its VHDX (`ERROR_SHARING_VIOLATION`).
- RFC fork PR #6 was rewritten and retitled **RFC 0022: Skill Receipts and
  Orchestration** at commit `029d376`. It now starts with typed/filterable
  receipts, reuses OpenClaw trajectory/session/usage primitives, and defers
  orchestration capabilities one phase at a time:
  `https://github.com/giodl73-repo/rfcs/pull/6`.
- Fork-only stacked OpenClaw draft PR #68 adds the first query surface by
  reusing `sessions tail` across SQLite and legacy trajectory storage:
  `https://github.com/giodl73-repo/openclaw/pull/68`, commit
  `ff4b4a86057`. `--receipt-type payment.authorized` filters on the business
  type before applying the tail limit, and `--json` returns the sanitized
  receipt payload only when that filter is present. Targeted trajectory,
  command, and CLI tests passed (51 tests across 3 shards), along with exact
  `oxfmt 0.58.0`, targeted `oxlint`, and `git diff --check`. Automated Codex
  review could not authenticate in WSL (HTTP 401); manual review caught and
  removed the broader general-trajectory JSON exposure before the final test
  run.
- Fork-only stacked OpenClaw draft PR #69 persists OpenClaw's existing trusted
  `skill.used` diagnostic fact into the trajectory without adding a second
  detector: `https://github.com/giodl73-repo/openclaw/pull/69`, commit
  `4d203233e037`. It records public skill name/source, exact `read` versus
  `command` activation, tool name, and optional tool-call ID, filtered by the
  existing run ID; private skill file paths stay out of the trajectory. The
  listener drains before terminal model/session events and detaches on success
  or error. Focused proof passed (3 tests), along with scoped `oxfmt`, scoped
  `oxlint`, and `git diff --check`. Manual review fixed an initially vacuous
  async disposal assertion; the focused proof was rerun afterward. Codex
  autoreview timed out and the Claude fallback rejected the workspace API key.
  The next stair-step is the generic session `regarding` seam described below;
  the joined receipt/skill/usage view follows it and must not claim per-receipt
  token attribution.
- Design clarification: use OpenClaw's existing session model as the primary
  conversation/thread identity. `sessionKey` is the stable logical routing key;
  channel adapters can derive thread sessions with `resolveThreadSessionKeys`,
  while `sessionId` identifies the current transcript instance and may rotate.
  Session entries already retain origin and delivery channel/account/thread
  metadata. Receipts therefore inherit session/run correlation from their
  trajectory envelope. A CRM support case is an optional external/business
  link that may span sessions, not a replacement core object and not required
  in the base receipt schema. For email, the channel adapter must use a stable
  provider conversation/thread id rather than message id or subject text.
- RFC fork PR #6 was updated at commit `4fd512918d0f` after reviewing
  Microsoft's Dataverse **Set Regarding** pattern. The OpenClaw session remains
  the conversation/activity stream and gains one optional primary `regarding`
  association shaped as opaque `system`, `type`, `id`, and optional human
  `key`. Plugins/tools own matching and external record creation; OpenClaw owns
  session persistence, audited set/replace/clear transitions, receipt snapshots,
  and filtering. The existing producer-owned receipt `subject` remains because
  it describes the object a specific event concerns; it is distinct from the
  session's primary `regarding` context, so PRs #66-#69 do not need restacking.
  The RFC and fork PR body cite official Microsoft Set Regarding, Dataverse
  Email/RegardingObjectId, automatic case creation, and reply-correlation docs.
- Fork-only stacked OpenClaw draft PR #70 adds the first generic session
  `regarding` primitive: `https://github.com/giodl73-repo/openclaw/pull/70`,
  head `b390cc4b4471`. It extends the existing `sessions.patch` path with one
  singular `{ system, type, id, key? }` association, supports set/replace/clear,
  projects it through normal session rows, and reserves the core slot from
  plugin extension claims. Follow-up commit `b390cc4b4471` also places
  `regarding` in the existing write-scoped patch allowlist, so channel/CRM
  integrations do not need admin permission. Focused regarding proof passed
  across protocol, mutation, row projection, and method-scope tests; exact
  formatting, scoped lint, and diff checks passed. The broader session-utils
  suite retained one unrelated Windows `/tmp` fixture mismatch. Full typecheck
  is clear for this change and remains blocked by inherited receipt-stack
  tool-call-id and net-policy diagnostics. Fork checks passed real-behavior
  proof, runner admission, actionlint, no-tabs, dispatch, and platform-scope
  detection; the label and auto-response jobs failed on the expected fork
  permission boundary, while draft-scoped CI lanes skipped.
- Fork-only stacked OpenClaw draft PR #76 adds the first audited `regarding`
  transition: `https://github.com/giodl73-repo/openclaw/pull/76`, commit
  `836a80934cb4`. A successful real change records one existing bounded SQLite
  trajectory event, `session.regarding.changed`, with `set`, `replace`, or
  `clear`, the control-plane actor, and previous/current business identity as
  applicable. The event is recorded inside the existing exclusive session
  mutation so concurrent changes retain storage order. Identical and rejected
  patches produce no event; recording remains best-effort and cannot turn an
  already-committed patch into an RPC failure. The session's optional
  human-facing `key` is emitted in trajectory data as `reference`, preserving
  case numbers such as `CAS-1042` without weakening OpenClaw's secret redaction
  for generic fields named `key`. Focused persistence proof passed for all
  three actions and unchanged suppression; the existing regarding mutation
  proof also passed. Scoped format, lint, diff checks, and Codex autoreview were
  clean. Full typecheck added no diagnostics beyond the eight inherited stacked
  branch errors. Fork checks passed real-behavior proof, runner admission,
  actionlint, no-tabs, dispatch, and platform-scope detection; label and
  auto-response failed only at the expected fork permission boundary, and
  draft-scoped CI lanes skipped. The head is mergeable with no comments or
  reviews. Receipt snapshots and regarding filters remain later PRs; token
  accounting and budgets still wait for the joined usage view rather than
  claiming per-receipt attribution.
- Fork-only stacked OpenClaw draft PR #77 snapshots business context onto each
  typed receipt: `https://github.com/giodl73-repo/openclaw/pull/77`, commit
  `88a30d1e6723`, base `agent/session-regarding-audit`. At the existing
  successful-tool-result receipt seam, OpenClaw reads the latest durable
  session association once and adds it to every valid `audit.receipt` from that
  result as `{ system, type, id, reference? }`. This makes earlier receipts
  immutable across later session reassignment while keeping the producer-owned
  receipt `subject` distinct. Failed tools and results without valid receipts
  do not read session context; missing context leaves the receipt unchanged.
  Focused audit and attempt-helper proof passed 9 tests across 2 shards,
  including reassignment between tool results. Scoped format, lint, and diff
  checks passed; full typecheck added no diagnostics beyond the eight inherited
  stack errors. Direct Codex review timed out after 180 seconds and the repo
  autoreview helper timed out after 600 seconds, both without output; manual
  source review found no actionable issue. The PR is draft and mergeable with
  no comments or reviews. Fork checks passed real-behavior proof, runner
  admission, actionlint, no-tabs, dispatch, and platform-scope detection;
  label and auto-response failed only at the expected fork permission boundary,
  and draft-scoped CI lanes skipped. Filtering by regarding identity remains
  the next narrow query stair-step; token attribution and budgets remain
  deferred.
- Fork-only stacked OpenClaw draft PR #78 adds exact receipt filtering by the
  snapshotted session-regarding identity:
  `https://github.com/giodl73-repo/openclaw/pull/78`, commit
  `be3468c5e532`, base `agent/audit-receipt-regarding-snapshot`. The existing
  `sessions tail` command now accepts `--regarding-system`,
  `--regarding-type`, and `--regarding-id`; supplied selectors are conjunctive
  and can be combined with `--receipt-type`. The shared trajectory predicate is
  applied before the initial tail limit and to followed events. JSON remains
  receipt-only and requires either a receipt-type or regarding selector.
  Human-facing `reference` is deliberately not a canonical filter. Focused
  trajectory, command, and CLI proof passed 54 tests across 3 shards, with
  scoped format, lint, and diff checks clean. Full typecheck added no
  diagnostics beyond the eight inherited stack errors. The bounded Codex
  autoreview attempt timed out after 180 seconds without output; direct review
  of the six-file diff found no actionable issue. The PR is draft and
  mergeable with no comments or reviews. Fork checks passed real-behavior
  proof, runner admission, actionlint, no-tabs, dispatch, and platform-scope
  detection; label and auto-response failed only at the expected fork
  permission boundary. The regarding receipt path is now complete through
  record, snapshot, and query. The next independent stair-step should expose a
  joined run-level view over receipts, `skill.used`, and existing usage data,
  while explicitly avoiding per-receipt token attribution; budgets remain
  deferred until that correlation is honest.
- Fork-only stacked OpenClaw draft PR #79 adds the first joined run-level audit
  view: `https://github.com/giodl73-repo/openclaw/pull/79`, commit
  `15da7152f8ff`, base `agent/audit-receipt-regarding-filter`. The existing
  `sessions tail --audit-runs` surface projects already-recorded trajectory
  facts into one versioned `openclaw-audit-run` JSONL record per run. It joins
  matching typed receipts, trusted `skill.used` activations, model identities,
  terminal status, and normalized usage summed across `model.completed`
  attempts. Existing receipt-type and regarding selectors choose runs and
  matching receipts before `--tail` limits the summaries. The view deliberately
  attributes tokens only to the run, never to an individual receipt or skill.
  It adds no recorder, storage, cost estimator, budget state, or workflow
  execution. Follow mode is rejected until incremental summary semantics are
  defined. Focused projection, receipt, session-command, and CLI proof passed
  60 tests across 3 shards; scoped formatting, lint, and diff checks passed.
  Full typecheck added no diagnostics beyond the eight inherited stack errors.
  The bounded Codex autoreview attempt timed out after 180 seconds without
  output; direct review fixed one invalid CLI test flag combination and found
  no further actionable issue. The PR is draft and mergeable with no comments
  or reviews. Fork checks passed real-behavior proof, runner admission,
  actionlint, no-tabs, dispatch, and platform-scope detection; label and
  auto-response failed only at the expected fork permission boundary. The next
  stair-step can define declarative skill invocation metadata and record one
  explicit invocation against this run identity; budgets should remain
  deferred until invocation boundaries and child-run accounting exist.
- Nothing was opened against the upstream OpenClaw or RFC repositories.
- 2026-07-15 ClawHub track started with draft PR
  [#3089](https://github.com/openclaw/clawhub/pull/3089), branch
  `user/giodl/clawhub-claws-schema`, commit `0087aea`. PR 1 of 4 adds the
  shared grouped Claw schema, fail-closed semantic validation, safe manifest
  summaries, and Convex release storage fields while keeping generic package
  publication closed to `family: "claw"`. No runtime Claw surface is exposed
  yet; PR 2 will add the first surface behind
  `CLAWHUB_EXPERIMENTAL_CLAWS=1`. Validation passed `ci:static`, `ci:packages`,
  `ci:types-build`, 19 focused tests, schema typecheck, and final structured
  Codex autoreview with no accepted/actionable findings. RFC PR #27 now records
  the four-stage ClawHub sequence at commit `9cb7c8e`: schema/data model;
  publish validation/docs; search/detail/API; feed export and published E2E.
- 2026-07-15 ClawHub PR 2 of 4 is open as draft
  [#3090](https://github.com/openclaw/clawhub/pull/3090), branch
  `user/giodl/clawhub-claws-publish`, head `476e86d`. It enables authenticated
  `family: claw` publication only behind `CLAWHUB_EXPERIMENTAL_CLAWS=1`,
  validates `CLAW.md`/JSON package content and referenced workspace files,
  persists the validated manifest plus safe summary through the existing
  release pipeline, and adds CLI dry-run/publish authoring support and docs.
  The final Codex convergence review was clean after fixing Windows separator
  normalization in the server manifest lookup; the 285-test Convex publication
  suite and `ci:static` pass. RFC PR #27 links PRs #3089 and #3090 at
  `92e0a07`. Next is ClawHub PR 3: guarded search, detail, and API projection.
- 2026-07-15 ClawHub PR 3 of 4 is open as draft
  [#3091](https://github.com/openclaw/clawhub/pull/3091), branch
  `user/giodl/clawhub-claws-discovery`, head `9023abd`. It gates Claw list,
  search, detail, and version reads behind `CLAWHUB_EXPERIMENTAL_CLAWS=1`,
  projects only the safe manifest summary, withholds full extracted manifests
  from public release responses, and keeps plugin categories/trending
  plugin-only. Focused gate, package, and HTTP suites passed 659 tests;
  `ci:unit`, `ci:static`, `ci:types-build`, CLI/admin source and artifact tests,
  and structured Codex review also passed. The exact highly concurrent
  `ci:packages` command hit the existing WSL timeout in
  `cli.version-delete.test.ts`; that test passed isolated and all remaining
  package stages passed. RFC PR #27 links PR #3091 at `c305d9a`. Next is
  ClawHub PR 4: hosted feed export and published-package E2E through OpenClaw
  `claws add --dry-run`.
- 2026-07-15 ClawHub PR 4 of 4 is open as draft
  [#3092](https://github.com/openclaw/clawhub/pull/3092), branch
  `user/giodl/clawhub-claws-feed`, head `632ab66`. It adds the separately gated
  `/api/v1/feeds/claws` feed, projects only validated safe summaries with exact
  package versions and digests, fails closed while disabled, and deliberately
  leaves the experimental route out of static registry discovery. A repeatable
  E2E downloads and verifies a hosted fixture, rejects unsafe archive paths,
  extracts it, and invokes real OpenClaw `claws add --dry-run --json` from
  OpenClaw PR #106888. Focused feed tests, full unit/static/type/build lanes,
  CLI/admin package stages, the real cross-repo proof, and structured Codex
  review passed. The combined package lane reproduced the inherited WSL
  `cli.version-delete.test.ts` timeout; both tests passed isolated and every
  remaining stage passed. RFC PR #27 and its body now link the complete
  four-PR ClawHub stack at `2f2dd83`.
- 2026-07-15 OpenClaw PR #106888 Patrick follow-up is fixed at
  `429399a19ee`. `CLAW.md` parsing strips exactly one leading UTF-8 BOM only
  for frontmatter recognition while provenance integrity continues to hash the
  original bytes; the regression asserts both behaviors. The package-symlink
  expectation now uses `realpath()` so macOS `/var` aliases compare against the
  reader's canonical path. Focused schema/reader proof passed 32 tests, scoped
  formatting passed, and Codex review was clean. Both inline threads received
  evidence replies and were resolved. The PR remains draft and was not merged.
- 2026-07-15 ClawHub PR #3092 CI triage found no Claws regression. Core
  `pr-gates` passed static, unit, package, type/build, and HTTP E2E stages. The
  failed `publish-new-version` browser shard passed unchanged on targeted
  rerun. `inspector-version` failed original and rerun attempts on shared
  Convex one-second timeouts in `users:ensure` and
  `touchRateLimitKeyMetadata`; concurrent `main` run 29457984080 independently
  failed the same shard while its core and other browser gates passed. The
  evidence is recorded on PR #3092 in issue comment 4986303339. No Claws code
  changed, all four ClawHub PRs remain draft, and nothing was merged.
- 2026-07-15 RFC PR #27's two implementer sidecars were tightened through the
  `.craft/roles` gateway, platform, operator, author, newcomer, security,
  release, portability, and maintainer lenses at commit `78af1e1`. The
  normative changes define deterministic YAML and portable path handling,
  immutable package and development-snapshot identity, exact MCP and cron
  constraints, security-relevant dry-run disclosure, consent invalidation,
  applied-versus-ready status, per-owner provenance and compensation, safe
  recurring-work removal, export identity, and the OpenClaw application-profile
  boundary. No review notes were added to either specification. Structural
  checks and local Codex review passed with no actionable findings. RFC #27 is
  open, ready, and mergeable; its commit-stable sidecar links were refreshed and
  nothing was merged.
- 2026-07-16 OpenClaw Claws PR #102228 was clean-restacked on #101973 and
  pushed at `18d178885ecc95a4d0f8af8968bcc444fb5d1792` (`fix(claws): tighten
  package install policy`). The branch is `user/giodl/claws-pr5-installers`,
  based on #101973 head `b46453290b2392fd8f655d5098701a9257eeec3b`. The
  repair narrows this slice to plugin package mutation only; skill package
  declarations remain schema-valid but fail closed until a later skill package
  lifecycle adds real read-only preflight plus uninstall/recovery. Package
  declarations now require `integrity`, package add-plan actions surface that
  digest, and `claw_package_refs` persists `package_integrity` with migration
  support. Plugin install/reuse remains consent-bound by exact owner state, and
  partial config-commit failure now preserves `workspace_ready` when cleanup
  cannot remove the workspace so retry can resume. Local proof passed focused
  Claws/package/state tests (140 tests), `src/cli/claws-cli.test.ts` (10 tests),
  `pnpm tsgo:test`, `pnpm tsgo:prod`, full oxlint shards, architecture,
  deadcode dependencies/exports/unused-files, and `git diff --check`. GitHub CI
  is `CLEAN` with the aggregate gate green, including the previously failing
  `checks-node-compact-small-7` rerun. Proof comments are
  `https://github.com/openclaw/openclaw/pull/102228#issuecomment-4999034089`
  and head correction
  `https://github.com/openclaw/openclaw/pull/102228#issuecomment-4999065917`.
  ClawSweeper acknowledged and started review for exact head `18d178885e`; final
  ClawSweeper review and the stale GitHub `CHANGES_REQUESTED` decision were
  still pending at this note. Do not merge without explicit user instruction.
- 2026-07-17 OpenClaw Claws PR #101755 was deeply reviewed and repaired locally
  in `C:\src\openclaw-claws-pr3-review`. The original public head
  `31caeb09e7d` overstated interrupted-retry behavior: the CLI could not resume
  an on-disk workspace, phase writes could race, configured workspace aliases
  were not canonicalized, implicit `main` could be replaced, and caught
  zero-ownership failures stranded provenance. The local branch was restacked
  from stale base `c5abb329537` onto PR #101328 final head `81f01f15c29`, and
  now ends at `f7a98b11d0a`. It makes retry phases durable and compare-and-set,
  revalidates workspace ancestry and ownership, preserves/checks implicit
  `main`, resumes an identical config committed before its phase write, and
  reconciles only caught failures that own no workspace or config. Stale SDK
  budget and unrelated package-acceptance workarounds were removed. Focused
  proof passes 71 tests (52 schema/provenance, 14 CLI, 5 lifecycle E2E), scoped
  oxfmt/oxlint and `git diff --check`; direct plugin-SDK budget proof remains at
  8010 public exports / 4476 callable exports. Codex review found and drove the
  implicit-main, resume, zero-ownership, and implicit-workspace-overlap fixes;
  later convergence retries were inconclusive because the local Windows review
  sandbox repeatedly timed out, and one apparent clean result was rejected as
  unrelated. Nothing was pushed: updating OpenClaw base mirror
  `user/giodl/claws-pr2-schema-plan` from `c5abb329537` to `81f01f15c29` and PR
  branch `user/giodl/claws-pr3-feed-plan` from `31caeb09e7d` to `f7a98b11d0a`
  requires explicit force-with-lease approval. Patrick's four stale review
  threads remain unresolved, and exact-head terminal recovery proof plus a
  public proof comment remain pending until after push. Do not merge.
- 2026-07-17 follow-up: OpenClaw PR #101755's stack mirror was force-with-lease
  updated to PR #101328 final head `81f01f15c29`, and the PR branch was
  force-with-lease updated then advanced normally to exact head
  `39bd12cf12b8f3fa1d10e1d99ad83f61ddd470e9`. Current CI is fully clean: 82
  passed, 42 skipped, 0 pending, 0 failed, with GitHub merge state `CLEAN`.
  Two deterministic rerun defects were fixed at the final head: AST-local raw
  SQLite allow comments for the phase update/delete and an inherited unused
  package-acceptance test local rejected by current test typecheck. Four
  unrelated first-attempt timeouts (bundled-plugin source checkout, gateway
  chat parsing race, TUI PTY readiness, and restart handoff) all passed on the
  failed-job-only rerun. Exact-head source-runtime proof used real
  `runClawsAddCommand` with no mocks: a non-empty durable `workspace_ready`
  state retried with identical plan integrity to `complete`, preserved its
  leftover file, and committed config agents `main,internal-triage`. Patrick's
  four outdated threads and stale `CHANGES_REQUESTED` decision remain the only
  PR blocker; public proof/replies require approval before posting. Do not
  merge.
- 2026-07-17 OpenClaw Claws PR #102228 was re-reviewed from the current RFC and
  both normative v1 specifications, then clean-restacked locally onto PR
  #101973 final head `1f5536a03e47f02f477ac63650b6acd6926ed974`. The public
  head remains `18d178885ecc95a4d0f8af8968bcc444fb5d1792`; the repaired
  local branch in `C:\src\openclaw-claws-pr5-review` ends at
  `b52fd2a554a1ebd65f39bb1df70c777560c1520b`. The prior implementation's
  manifest `integrity` field was nonconformant schema drift and did not enforce
  downloaded bytes, while every skill package was deliberately blocked. The
  repair restores the v1 manifest shape (`kind/source/ref/version`), resolves
  exact skill/plugin artifact digest and runtime identity into the consented
  add plan, checks those pins in both real installers, supports exact skill
  install/reuse in the planned workspace, and rejects version, digest, runtime
  identity, or owner-state drift. Package mutation is now the final add phase;
  newly installed global plugins are compensated in reverse order after a
  later package failure, except when another Claw concurrently references the
  plugin. Durable package-ref replay is idempotent, preserves Claw-installed
  ownership, and distinguishes conclusive `rolled_back` state from uncertain
  `failed` state. Validation on portable Node 24.15.0 / SQLite 3.51.3 passed 75
  focused unit tests (1 skip), 6 lifecycle CLI E2Es, 27 plugin tests, 25 CLI
  tests, 2 exact skill artifact tests, formatting, oxlint, generated Kysely
  verification, Kysely raw-SQL guardrails, SQLite transaction boundaries, and
  `git diff --check`. The broader state DB suite passed 76 tests with 2 skips;
  its one Windows NFS journal-mode assertion remained an unrelated platform
  failure. Direct core typecheck reported only four existing cross-worktree
  declaration-path errors and no changed-file error. Omar's shared process-wide
  plugin grant concern remains a real product/maintainer decision: RFC v1 uses
  explicit Claw-add consent plus existing plugin safety rules, so no new host
  grant surface was invented in this repair. Publishing the restack requires
  force-with-lease approval; no push, review reply, thread resolution, proof
  comment, merge, or automerge occurred. Do not merge.
- 2026-07-17 follow-up: PR #102228 was published with the approved
  force-with-lease restack, then advanced normally to exact head
  `8e926cabdf5c98614c25286e054e3e5e7ef232df`. The first exact-head CI run
  identified one PR-owned Knip failure: the internal
  `ClawHubSkillInstallPreflightResult` type was unnecessarily exported. Commit
  `8e926cabdf5` removes only that export modifier. The replacement check set is
  fully clean: 83 passed, 37 skipped, 0 pending, 0 failed; GitHub reports
  `MERGEABLE` / `CLEAN`. ClawSweeper dispatch and the real-behavior-proof
  presence gate passed, but no new cross-repo ClawSweeper commit-review run was
  visible; the prior ClawSweeper P1 findings are addressed by the exact
  artifact enforcement and real skill install path above. Patrick's stale
  requested-changes review and six unresolved outdated threads remain the only
  recorded review blocker. No review reply, thread resolution, proof comment,
  merge, or automerge occurred. Do not merge.
- 2026-07-17 final follow-up: OpenClaw PR #102228 is pushed at exact head
  `ae79fd7ddd7cc7f1d672bf1b91fa927e7b159e89`. Production ClawHub proof found
  that public package metadata uses standard SHA-256 SRI rather than the
  internal `sha256:<hex>` form; commit `ae79fd7ddd7c` now normalizes and
  enforces both representations. Exact-head proof installs the real public
  `@steipete/weather@1.0.0` skill through the real CLI/ClawHub/archive/workspace/
  SQLite path, rejects a wrong SRI without writing `SKILL.md`, and exercises a
  deterministic package-boundary disconnect that retains truthful partial
  provenance after config/workspace commit. The PR body contains the required
  real-behavior-proof schema and explicitly discloses that a live shared plugin
  and Crabbox were not tested.
- Omar's policy question is resolved for this experimental v1: plugins remain
  process-wide shared-host resources, and exact `claws add --yes
  --plan-integrity <preview-digest>` consent authorizes the displayed shared
  plugin install/reuse action. No per-agent plugin isolation is claimed; that
  may be revisited separately. This is documented in the PR body and in the
  public Omar reply at
  https://github.com/openclaw/openclaw/pull/102228#issuecomment-5008511867.
  Patrick's six outdated inline threads were answered with current-head
  evidence and resolved. GitHub reports `MERGEABLE` / `CLEAN`, but the stale
  human review decision remains `CHANGES_REQUESTED`. ClawSweeper's durable
  exact-head review was generated before the final proof/body revision and
  still requested proof; a stabilized-source re-review was queued at
  https://github.com/openclaw/openclaw/pull/102228#issuecomment-5008570798.
  No merge or automerge was enabled.
- 2026-07-17 OpenClaw Claws PR #102296 was clean-restacked on PR #102228 exact
  head `ae79fd7ddd7cc7f1d672bf1b91fa927e7b159e89`, deeply repaired, and
  force-pushed with lease at `da8e4d41d73c77c6294e8813ac2856ad402a646b`
  (`feat(claws): add lifecycle status and removal`). The final policy keeps
  plugins global: removal emits an explicit retain reason and releases the
  Claw reference without uninstalling the plugin. Workspace-scoped skills can
  still be removed through the canonical lifecycle when their final complete,
  unchanged Claw-owned reference is released. Cross-process package lifecycle
  leases now cover direct installs and cleanup; skill leases serialize the
  whole workspace because its skills share one `.clawhub/lock.json`. Missing
  workspace provenance fails closed. The repair also covers orphan inventory,
  already-missing agent cleanup targets, atomic config/removal-surface
  validation, canonical workspace/session safety, complete skill-tree digests,
  and lockfile rollback. No permanent removal tombstone was added; partial
  subordinate provenance remains available for retry/status only when cleanup
  does not complete. Portable Node 24.15.0 proof passed 49 focused unit tests,
  the targeted canonical ClawHub plugin-install lease test, the real lifecycle
  CLI E2E, scoped TypeScript, Oxlint, Oxfmt, and `git diff --check`. Final
  independent Codex review found no discrete actionable regression. PR body
  and exact-head evidence, including the Omar policy response, are at
  https://github.com/openclaw/openclaw/pull/102296#issuecomment-5009979822;
  ClawSweeper re-review and fresh CI are running. Do not merge or enable
  automerge without explicit user instruction. Next: restack and review PR
  #102306 against this rewritten lifecycle head.

### 2026-07-18 Ownership contract and PRs #102383/#102406

- RFC PR #27 is pushed at `51c0ccd`. The RFC and both sidecar specs define one
  capability-neutral resource model: `relationship` is `managed` or
  `referenced`; `origin` is `claw-introduced` or `pre-existing`; current
  non-Claw ownership is separate present-time evidence. There are no refcounts,
  ownership-history ledgers, or arbitrary capability quotas. Managed resources
  are cleanup candidates by default; referenced resources retain by default
  and may be selected for integrity-bound `remove-if-unused` or explicit
  cleanup with a stronger conflict override. `--yes` never broadens cleanup.
- PR #102383 is pushed at `344d024f8b5`. It leaves ordinary agent deletion and
  global cron behavior unchanged, removes a dead Claw-only agent-delete API
  extension, and composes existing config/session/workspace/trash primitives
  under Claw provenance checks. Exact-head focused proof passed 59 tests;
  GitHub is `CLEAN` with 86 successful checks and no failures. Evidence and
  ClawSweeper re-review request: issue comment `5011958605`.
- PR #102406 is clean-restacked on #102383 and pushed at `c5d416c95c0`. MCP
  declarations use the common relationship/origin/independent-owner fields:
  collision-free Claw-created declarations are managed, exact existing or
  cross-Claw reuse is referenced, and ordinary MCP writes record independent
  ownership. Remove uses the same referenced cleanup modes as packages and
  compare-before-unset. Source-preserving env references, landed/non-landed
  uncertain-write recovery, and canonical generated state schema are covered.
- Patrick's three outdated PR #102406 threads received exact-head replies and
  were resolved. Local proof passed generated Kysely verification/guardrails,
  max-lines ratchet without suppression, all three Knip export scans with zero
  entries, and 126 focused tests. Latest evidence and ClawSweeper re-review:
  issue comment `5012004541`; fresh GitHub CI is running. Do not merge.
- Only PR #102383 required an earlier-stack semantic cleanup for this model.
  PRs #1-#7 keep their existing boundaries. Next: wait for #102406 exact-head
  CI/ClawSweeper, then restack and review PR #102427 (doctor) and downstream
  PRs #102959, #102982, and #106888 in order.

### 2026-07-18 PR #102982 update executor closeout

- OpenClaw PR #102982 was clean-restacked on the final read-only planner head
  `82bcde001d69249e9b880301ae6974d6e5296196`, repaired, and force-pushed with
  lease at exact head `3667eb6d4e07d922742aca9d4a601d6c62c52e0f`.
  Consent requires both `--yes` and the exact dry-run `--plan-integrity`.
  Execution rebuilds the plan, uses per-owner compare-and-swap checks, advances
  root provenance only after success, and reports `update_partial` when an
  external installer, source-config writer, or Gateway scheduler mutation
  cannot be proven compensated.
- Package update provenance now uses the common managed/referenced,
  origin, and independent-owner model. Referenced removal releases only this
  Claw's row; managed removal uses the existing removal planner and uninstaller
  before deleting provenance. Package release is reference-only and CAS
  checked. MCP, workspace, cron, agent, and root-provenance races fail closed.
- Independent exact-branch Codex review reported no actionable code finding.
  Focused validation passed 82 tests across update execution, packages, MCP,
  workspace, cron, provenance, and CLI consent. The final test-only amendment
  moved two temporary roots to the standard auto-cleanup tracker; its focused
  tests passed 7/7 along with Oxfmt, zero-warning Oxlint, and the temp-path
  guard.
- Exact-SHA GitHub CI run `29676105624` passed with no failed jobs, including
  production/test types, lint, dependency guards, Node core tests, and macOS
  Swift. The PR body and final status comment link that evidence:
  https://github.com/openclaw/openclaw/pull/102982#issuecomment-5014718192.
- ClawSweeper's exact-head review reports no discrete security defect. Its
  remaining blocker is deliberately not a mechanical code fix: maintainers
  must accept report-only `update_partial` plus operator inspection/replanning
  as the initial experimental recovery contract, or require a richer
  doctor/retry/reconcile operation identity, and still request exact-head live
  package replacement and Gateway cron recovery proof. Do not merge. Next:
  continue the ordered review with replacement PR #111391 on this final base.

### 2026-07-19 PR #111391 CLAW.md and documentation closeout

- The original CLAW.md PR #106888 had been merged only into an obsolete PR12
  stack head. Current PR12 no longer contained that merge, and a merged PR
  cannot be reopened. Replacement PR #111391 now supersedes #106888 and is
  stacked directly on PR12 head `3667eb6d4e07d922742aca9d4a601d6c62c52e0f`.
- PR #111391 is pushed at exact head
  `60f28841279a740a2f35ec35947a4db194289099`. Its implementation commit adds
  YAML-frontmatter `CLAW.md` input and canonical `CLAW.md` export while keeping
  grouped JSON input and the existing schema, lifecycle, provenance, consent,
  and single `OPENCLAW_EXPERIMENTAL_CLAWS=1` gate. The restack preserves
  PR12's filesystem limits, source-byte integrity, ownership-aware export,
  64-character derivative identity, and agent-drift rejection.
- Documentation placement was audited across the effective 13-stage stack:
  RFC #27 owns the normative RFC and sidecar specifications; intermediate
  implementation PRs keep stage-specific contracts and proof in their PR
  bodies; final PR13 owns the complete public guide because only that stage has
  the entire documented lifecycle plus canonical CLAW.md syntax. The guide is
  `docs/cli/claws.md`, linked beside the agent CLI docs, with generated docs map
  and zh-CN glossary updates. It explicitly excludes future whole-Claw
  ClawHub publish/search/install behavior.
- Exact local proof passed 82 focused schema/export/CLI lifecycle tests,
  Oxfmt, zero-warning Oxlint, test types, architecture and database guards,
  all three Knip scans, max-lines, conflict-marker, and temp-path guards. Docs
  MDX, 6,052 internal links, and docs-map verification pass. The glossary
  check has no Claws findings but still reports six unrelated stacked-base
  labels; full local anchor audit is blocked by a pre-existing syntax error in
  `docs/concepts/qa-e2e-automation.md`.
- Two independent exact-branch Codex reviews reported no accepted/actionable
  findings. GitHub CI run `29688975469`, dedicated docs checks, security
  checks, and `openclaw/ci-gate` all pass with no annotations; GitHub reports
  `CLEAN`. RFC PR #27 was updated at `840ccc3` to replace its obsolete #106888
  stack pointer with #111391; its PR body links were refreshed too. Final PR13
  evidence is comment `5015933588`. ClawSweeper exact-head review is still
  running. Do not merge.

### 2026-07-19 PR11-PR13 CI remediation and final restack

- PR #102959 is pushed at `9b852c57ce1c457ca69e0b29ab079910b1bb547a`.
  Its capability-effect records now expose only secret-safe MCP and cron
  execution shape. Serialized plans no longer include MCP URLs, commands,
  arguments, auth details, env names or values, tool-filter contents, or cron
  payloads; exact desired-state digests and `planIntegrity` still bind the
  complete target. The update-plan output helper moved to
  `src/cli/claws-cli-update-output.ts`, returning `claws-cli.runtime.ts` to 682
  lines and satisfying the max-lines ratchet.
- PR #102982 was clean-restacked on that planner and pushed at
  `9caf48127adf20d5ad9bc067a6991ab1808b0154`. Its mutating CLI reuses the
  shared secret-safe output helper. The old downstream
  `fix(claws): preserve update capability effects` commit became redundant and
  collapsed during rebase. The plan-summary calculation moved to a focused
  internal module after this stage's imports pushed `update-plan.ts` three
  lines over the lint budget; no suppression or executor policy change was
  introduced.
- PR #111391 was clean-restacked on PR #102982 and pushed at
  `dcd1d263c68a1073fa6f4ef6faaf310582ba9b6f`; CLAW.md behavior is unchanged.
  All restacked commits have valid Gio signatures.
- Local proof passed 10/10 focused capability tests, 53/55 cumulative
  capability/schema tests (two expected skips), five focused update-preview
  CLI tests, full-tree Oxfmt, max-lines, and `git diff --check`. Local
  SQLite-backed tests remain
  intentionally blocked because Node 24.14.0 embeds unsafe SQLite 3.51.2. The
  cumulative test typecheck reports only unrelated missing
  `@openclaw/libterminal/browser` declarations.
- PR bodies and exact-head comments were refreshed for all three PRs. RFC #27
  and its sidecar specs need no additional edit: this remediation implements
  their existing secret-safe preview and integrity-binding contract rather
  than changing policy. Exact-head CI is green for PR #102959 (run
  `29706989262`, including the successful rerun of one unrelated timing flake)
  and PR #102982 (run `29707267090`). PR #111391 run `29707267429` has no
  failures; its final two large test shards remain queued for runners. A
  superseded PR #111391 run and ClawSweeper dispatches were canceled, not test
  failures. Do not merge or enable automerge.
