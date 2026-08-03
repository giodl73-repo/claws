# EnterpriseClaw Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `target-architecture.md`.
4. Read `../openclaw-design/SESSION.md` and its evidence-slice index before
   changing a target contract.
5. Check current source or fixture results before claiming feasibility.

## Baseline

- Area: EnterpriseClaw desired target architecture
- Primary repo: `claws-hapi` for design; OpenClaw worktrees for proof;
  `openclaw/rfcs` for future normative proposals
- Local worktree: `C:\src\claws-hapi`
- Current branch: `main`
- Main tracking file: `projects/enterpriseclaw/target-architecture.md`
- Skill to use: `project-session`; use `faces-development-loop` for target
  contract revisions and executable slices

## Current Session

- Last updated: 2026-08-03
- Last agent: GitHub Copilot CLI
- Current focus: PRE-001, BOOT-001, the 55-source quarantine inventory, the
  XPK-001 through XPK-009 Wave 0 definition gate, exact multi-commit source
  reconstruction, and B3 conflict-resolution authority are landed on
  protected `lobster/integration` through fork PRs #203-#207. EVID-001
  admission PR #208 is also landed there at
  `07f288dffef67723c4a0cd05624697346df28661` and carries exactly #107026,
  #104018, and #113421:
  52 source commits with 14 parent- and prefix-tree-bound B3 resolutions.
  The source inventory marks only those three ranges
  `evidence-only/admitted`; all retain authority `none`. Two independent
  reconstructions produced commit
  `1dc9e1fd0d8b5a6989fa1ca11e25a656ea80cc5c`, tree
  `8f0adcc0ba62a4309dc268f7bb4e04134ed2b639`, and result digest
  `5e95253de25c10dd0c6b9bd7a7d8e956372c6a713a6cc6eeff1d40832b4d6b17`.
  The implemented `lobster.exa.owner-projection.v1` fixture accepts the
  current configuration/readiness/release owner projection and rejects stale,
  omitted, and mixed-generation required owners. The runtime evidence branch
  is published as `lobster/evid-001-runtime-carry`; the integrated admission
  branch is `lobster/evid-001-carried-sources`. Meaningful current-head CI
  completed with 155 successful checks, including `openclaw/ci-gate`; the
  remaining failures were unavailable fork GitHub App tokens, and OpenGrep
  remained queued without an assigned Blacksmith runner. Next: stop for
  classification before admitting #113422, #114636, or any additional source.
- Architecture context: The target architecture now has thirteen major swim
  lanes.
  Each lane records goals, responsibilities, conceptual pieces, contracts,
  quality attributes, dependencies, and an initial existing/new technology-fit
  inventory. The incremental Rust strategy starts from an upstream-compatible
  fork, proves Rust Node Mode first, and replaces owner components through
  conformance, shadow/canary operation, rollback, and TypeScript deletion. The
  initial implementation map now designates each lane capability as existing
  OpenClaw, fork plus focused RFC, or a new component. Omar's Scout September
  guidance is now complemented by an exact 35-contract implementation
  disposition: portable semantics and local behavior go upstream, bounded
  Scout adopters and migration shims stay in the fork, cross-tenant managed
  composition belongs in Lobster, and Rust replaces complete owner components
  behind public contracts. The fork is explicitly not a permanent semantic
  home. EC-026 Rust Node Mode is the first independent open-source Rust owner;
  protocol, supervisor, verification, scheduler, worker, and optional kernel
  replacements follow only through conformance, canary, rollback, and
  TypeScript deletion gates. The role review requires a mixed-release manifest,
  fork patch/deletion ledger, Lobster service inventory, and Rust component
  registry. Scout September priorities remain Claws, memory, mail
  authentication, memory ACL, Node/Rust, and SQL/Dolt after the current Scout
  runtime architecture is shared. A full `.craft/roles` review has now approved
  the four-track disposition model after correction. The 35 contracts are the
  EnterpriseClaw architecture portfolio, not 35 automatic upstream RFCs.
  Upstream work is the smallest portable owner delta; fork work is classified
  as B1 core incubation, B2 Scout adopter/plugin, or B3 compatibility/release;
  Lobster owns managed composition; and Rust replaces complete owners behind
  public contracts. Cross-cutting runtime, write-path, operator, security,
  release, ecosystem/repository, and fleet gates now precede area-level work.
  The next decomposition is thirteen area implementation packages containing
  final upstream asks, the fork patch/deletion ledger, Lobster services and
  adopters, Rust components, operator journeys, and repo-specific work items.
  The first package, operations/assurance/fleet, is now designed from a
  standalone fake-owner simulation. Ten tests cover partial rollout, immutable
  membership, durable parent/child acceptance, lost-ack reconciliation,
  targeted repair, compatibility-before-mutation, stale readiness,
  recovery-blocked quarantine, assurance separation, and containment
  uncertainty. The first run exposed a mutable-alias defect between the repair
  target and its eligibility receipt; the simulator and EC-033/EC-034 now
  require independent immutable values. EC-021/029/032 were also strengthened:
  checkpoint manifests bind source artifact and generation, rollback requires
  compatible code and state to become active and ready, and lifecycle children
  reconcile by identity rather than replay. The area package defines six local
  area RFC boundaries, five upstream workstreams, an eleven-item B1/B2/B3 fork
  ledger, eight Lobster capability boundaries, three Rust components, and a
  dependency-ordered work-item graph. A live delivery-portfolio reconciliation
  then showed that two workstreams must adopt existing upstream stacks:
  readiness/hosting is already #104018/#113421/#113422/#114636, and
  checkpoint/restore is already #112385/#112865/#112896 with Lobster #5481 and
  its proof stack. At most three residual asks remain: lifecycle receipts,
  mixed-component release/recovery truth, and shared assurance status. The
  supplied 36-PR snapshot is now 28 open, 7 merged, and 1 closed without merge;
  #113403 merged and #115323 closed while #115329 remains open. Lobster #5541
  is merged release-slot evidence. The earlier #5402 inventory recorded 21
  patches at `f807270d0b90`; live #5402 head `285efe4097b5` now states that 22
  patches apply cleanly. None directly implements this area's readiness,
  hosting-profile, recovery-point, or multi-unit fleet contract. Nothing new
  has been filed upstream.
  The second package, knowledge/context/continuity, is now reconciled against
  current OpenClaw source, the active memory decision stack, Lobster
  context-budget investments, continuity adoption, and the live patch
  baseline. It defines seven local planning boundaries and 35 dependency-
  ordered work items. The source audit found that session export already
  exists with malformed-row and backend-delegated omission warnings, so its
  residual upstream delta is stable source/export identity plus a structured
  omission manifest. The context-engine already exposes token estimates,
  projection, fallback/degraded state, and host requirements; merged
  #84676/#84830 plus Lobster #3371/#3379 show that context-budget policy should
  remain a downstream plugin. Memory list/delete/write work must adopt
  #115303/#115330/#115331/#115329/#116494, #116484/#116485, and
  #116499-#116501 rather than filing parallel APIs. EC-021 adopts
  #112385/#112865/#112896 and Lobster #5481. Workspace work reuses
  `agents.workspace.*`, narrow `agents.files.*`, sandbox bindings, and
  `@openclaw/fs-safe`; no universal filesystem owner is proposed.
  The third package, identity/authority/actions/effects/conversations/delivery,
  is now reconciled across EC-003/004/005/013/014/015/016. It defines eight
  local planning boundaries and 38 dependency-ordered work items. Current
  source already has process-local execution credential binding, canonical
  fail-closed approvals, generation-fenced node/device trust, effective tool
  inventory with schema quarantine, channel-native conversation resolution,
  and durable final delivery with queue intent, capability checks, receipts,
  suppression, and partial outcomes. Existing upstream work owns several
  residuals: #104849 exact-origin credential use, #113440 resolved pre-effect
  authorization, #113444 external approval presentation, #114782/#114783
  manifest-first host bundles, and #115408/#116013 hosted Control UI policy
  shaping/enforcement. New asks are conditional on bounded proof for
  restart-safe non-secret binding, exact approval correlation, stable
  run-surface identity, conversation route provenance, and cross-channel
  delivery operation/native-attempt identity. Lobster retains Entra/tenant
  federation, policy distribution, actor authorization, approval UX, managed
  routing, reconciliation, and audit retention. No upstream issue or PR was
  filed.
  The fourth package, runtime-fabric/nodes/Rust, is now reconciled across
  EC-022 through EC-026. It defines seven planning boundaries and 36
  dependency-ordered work items. Current Gateway, ACP, pairing, node registry,
  invocation, presence, wake, and pending-work owners remain the TypeScript
  compatibility oracle. #100960/#104158/#104159 are the command inventory,
  live-node observation, and prompt-projection stack and must be adopted rather
  than duplicated. Lobster #4297/#4648/#5460 remain the managed catalog,
  invocation, and recovery adopters. Reverse-carrier O11-O14/G1-G2 remains a
  separate plugin connection-owner proof gated on #114783 and explicit filing
  authorization. The current Rust Cargo validator and five fixtures are useful
  B1 evidence but remain untracked and prove no Gateway connection, execution,
  state, lifecycle, canary, release, or deletion. The next proof is a committed
  clean-install Rust artifact connecting to a disposable Gateway, followed by
  one bounded command profile, shared conformance, fenced state import,
  admission-time single authority, canary/release proof, and exact TypeScript
  owner and migration-adapter deletion. No upstream issue or PR was filed.
  The fifth package, configuration/activation, is now reconciled across
  EC-006, EC-007, and EC-010. It defines six planning boundaries and 38
  dependency-ordered work items. Current OpenClaw already owns configuration
  snapshots, transactional writes, reload, rollback, restart debt, and a
  durable Cron scheduler. RFC #34/#107026 should land as the bounded
  startup-only ordered-layer V1 before any accepted-generation/provenance
  extension is considered. RFC #33/#104018/#113421 and RFC
  #37/#113422/#114636 are the complete readiness/profile adoption stack.
  #77298, #113441, and #113443 already own exact Automation residuals. Lobster
  PR #12 remains the managed-config adopter; PRs #39/#46/#47/#51 plus
  bic/lobster#5481 remain payload-free retained-wake and host-acceptance proofs.
  The first concrete config deletion target is the allowed-origins overlay
  writer. The scheduling deletion targets are carried restart-status,
  hook-identity, and staged-publication patches plus source-specific cold-start
  races after accepted replacements exist. No upstream issue or PR was filed.
  The sixth package, agent-runtime/delegated-execution, is now reconciled
  across EC-008 and EC-009. It defines six planning boundaries and 36
  dependency-ordered work items. Current Gateway/channel admission, session
  targeting, prepared runtime, embedded attempts, tool lifecycle, terminal
  outcomes, spawn planning, subagent registry, scoped control, A2A delivery,
  restart reconciliation, and cleanup remain the TypeScript compatibility
  oracle. The residual EC-008 questions are a cross-entry run relationship and
  a stable whole-execution attempt distinct from provider, tool, child,
  schedule, reply, and delivery attempts. The residual EC-009 questions are
  process-local child admission, parent trust revocation, legacy lineage, and
  separate restart-safe cancel/terminal/delivery/cleanup settlement. Existing
  issues #50291, #101867, #104950, #90911, and #57404 own the main projection
  gaps. Fork PRs #148/#149 and managed-skill dispatch #114 remain B1 evidence,
  not an implementation stack. Lobster may own tenant admission, quotas,
  placement, retention, and operator projections but not run/subagent truth.
  A future Rust path starts with fixtures or one isolated child-worker profile,
  not a full agent-kernel rewrite. No upstream issue or PR was filed.
  The seventh package, models/provider-attempts/usage, is now reconciled across
  EC-011 and EC-012. It defines six planning boundaries and 38
  dependency-ordered work items. Current catalog, route, auth, prepared
  runtime, fallback, model-call, and run-total owners remain authoritative.
  The likely portable delta is one fallback candidate identity parenting
  existing `model.call` records, but only after a primary-failure/fallback
  fixture disproves current call-order evidence. #98968/#107937 are the active
  plugin-runtime usage path; fork #150 is evidence only and its duration field
  must not become agent-run latency. Merged #85882 prevents unpriced aggregate
  token use from appearing as confident zero. #90674 remains the owner
  decision for billed/estimated/free/unavailable/partial/unknown persisted cost
  provenance, while #13219/#90911/#57404 remain separate product/projection
  decisions. Lobster #3371/#3379 are the live read-only Budget plugin/UX.
  Historical claims that fork PRs #3/#4/#9 are live rate-card/attribution work
  are stale; current GHE shows unrelated host-provider PRs. No active Lobster
  rate-card or spend-attribution PR is claimed. No upstream issue or PR was
  filed.
  The eighth package, extensibility/artifact trust/release, is now reconciled
  across EC-027 through EC-029. It defines six planning boundaries and 44
  dependency-ordered work items. Current plugin manifests, merged #112773 Claw
  profile separation, plugin/Claw install records, package/git updater,
  target-owned Doctor migration, database downgrade refusal, detached service
  handoff, plugin convergence, publication checks, and fresh-install proof
  remain authoritative. #114782/#114783 are an inert plugin-family host-bundle
  exemplar, not a universal extension manifest. Signed publisher/build
  provenance, SBOM/transparency references, and portable revocation remain
  conditional on npm, ClawHub/plugin, and one unlike source proving compatible
  authority and digest semantics. EC-029 is scoped to one deployment unit and
  generates a compact component/evidence manifest from existing owners;
  Lobster #5541 owns Active/Previous/Candidate slots and #5402 remains the live
  promotion baseline with 22 applied patches. Draft #113836 is closed and the
  standalone Claws adapter remains independent public-CLI delegation evidence.
  Optional Rust work is bounded to a verifier or complete updater/supervisor
  owner with parity, canary, rollback, and exact TypeScript/adaptor deletion.
  No upstream issue or PR was filed.
  The ninth package, data governance/resource control, is now reconciled across
  EC-030 and EC-031. It defines seven planning boundaries and 47
  dependency-ordered work items. Current session export/delete/archive/index,
  memory source/index/backend, workspace, checkpoint, audit, limit, lane,
  queue, Cron admission, worktree lease, child admission, cooldown, disk,
  usage, and capacity owners remain authoritative. EC-030 starts with a
  bounded session copy graph and truthful complete/retained/deferred/external/
  unknown settlement; ordinary session deletion is archive-and-remove, not
  purge. Memory lifecycle waits for #116484/#116485 and #116499-#116501.
  EC-031 remains B-grade until one bounded resource persists, exhausts,
  restarts, fences stale holders, renews or expires, and settles by stable
  lease identity. #105466, #66187, #112086, #53023, and #8061 remain exact
  owner issues rather than one global quota stack. Lobster #3371/#3379/#3742
  already own Budget analysis/UX/evidence, while #5378, #5914, #5318, #556,
  #3912, #3913, #6428, and #98 track enterprise retention, licensing, and
  capacity. Optional Rust work is bounded to a content-free lifecycle
  coordinator or one complete lease owner with conformance, migration, single
  admission authority, rollback, and exact TypeScript/adaptor deletion. No
  upstream issue or PR was filed.
  The tenth and final package, experience/administration, is now reconciled
  across EC-001 and EC-002. It defines seven planning boundaries and 49
  dependency-ordered work items. Configuration, readiness, release, delivery,
  node, lifecycle, resource, Doctor, catalog, localization, Control UI, and
  policy owners remain authoritative. EC-001 first adapts configuration,
  readiness, and release through one versioned observation envelope while
  preserving opaque owner payloads; unavailable, stale, incompatible,
  mixed-version, audience, disclosure, cache, and lifecycle-copy cases precede
  any upstream ask. EC-002 preserves Doctor's structured findings, repair
  callbacks, dry-run effects, apply, and validation, adopting #99255 and
  #84472 while limiting the residual to durable plan/intent/preview/apply/
  authority/validation/rollback correlation after a two-owner fixture.
  #100361 is merged; #115408/#116013 remain the generic host policy/enforcement
  path. Lobster #6060/#6121 are merged hosted Control UI investments, #6116 is
  optional root cutover, and #3355/#3388/#3391 provide policy preview/baseline/
  UX foundations. Optional Rust work is bounded to projection validation,
  observation collection, or repair-plan coordination without owner mutation.
  All 35 EC contracts now map to one of ten reconciled implementation
  packages. No upstream issue or PR was filed.
  A concise area roadmap records which lanes should be replaced progressively,
  adapted in place, preserved
  carefully, or treated as replaceable projections behind stable contracts.
  The broad `.craft/roles` review added a Phase 0 operating baseline plus
  risk-tiered enforcement, deployment/performance, ecosystem, release, and
  policy/compliance acceptance gates. The raw 48 contract candidates are now
  consolidated into 34 focused contract scopes across all thirteen lanes.
  Wave 1 role review is complete and applied; EC-023 moved into Wave 1 as a
  required protocol dependency. Wave 2 role review is complete and applied;
  identity/runtime, provider/delivery, extension/artifact, and hosting
  boundaries are hardened. Wave 3 role review is complete and applied;
  scheduling, continuity, lifecycle, evidence, admission, and fleet contracts
  now have explicit owner boundaries and compatibility/failure behavior.
  EC-010 remains blocked on proving that activation scheduling is an
  independent owner rather than an EC-008 runtime relationship. All 34 scopes
  have required sections, valid references, unique wave membership, ASCII
  content, and a cycle-free hard-dependency graph. The final portfolio review
  keeps 33 scopes separate, conditionally folds EC-010 if its gate fails,
  renames EC-010/EC-033 to match their authority, and prioritizes September
  evidence around readiness, memory/ACL, mail auth/delivery, Node/Rust, and
  Claw/artifact compatibility. `contract-principles.md` now extracts the
  recurring design grammar across all scopes: owner first, relationship
  second, evidence third, projection last, with seventeen commandments and a
  reusable contract consistency checklist. `contract-interface-patterns.md`
  adds the shared mechanical layer: interface families, API rules, conceptual
  envelopes, reusable state machines, and language-neutral conformance cases.
  `contract-pitfalls.md` catalogs thirty-five recurring ownership, authority,
  lifecycle, effect, evidence, migration, compatibility, operational, and
  design-process failure modes with corrections. A cross-role review then
  strengthened the three-file meta-model with profile-based simplicity,
  authority/evidence envelopes, durable acceptance, atomic cutover, fan-out,
  sync causality, containment, runtime profiles, artifact autonomy, and
  governed break-glass semantics.
  All thirty-four contract scopes were then re-reviewed in wave order against
  the role-approved principles, interface/state-machine patterns, and
  pitfalls. Each now has a falsifiable disproof gate and aligned owner,
  generation, authority, lifecycle, evidence, compatibility, migration,
  local-profile, and operational semantics. The final semantic pass found no
  blocking or important cross-contract contradictions; EC-010 remains the one
  deliberate owner-boundary decision.
  The source-backed specialist program is now defined under
  `specialist-reviews/`. The EC-006/EC-007 pilot used configuration owner,
  readiness/hosting, security/evidence, and simplicity specialists. EC-006 now
  explicitly extends current configuration activation machinery; EC-007 is
  renamed Owner Readiness Observations and reduced to an optional owner-native
  observation contract. Their blocking boundary issues are resolved, but both
  remain not depth-ready pending named deletion targets and executable proof
  of remaining target semantics.
  Before continuing area panels, the specialist program was intentionally
  paused to establish a comparable evidence base for all 34 contracts.
  `evidence-base/evidence-ledger-2026-08-01.md` records the initial portfolio:
  The initial inventory found 8 A-grade, 20 B-grade, 6 C-grade, and no D-grade
  contracts. EC-015 and EC-016 were then grounded in the existing messaging
  source audit plus current conversation-resolution, route-projection,
  durable-delivery, retry, partial-effect, and receipt tests. Their contracts
  now distinguish provider conversation identity from routes/sessions and
  stable delivery operations from native attempts and optional replay keys.
  Both are B-grade and not yet evidence-ready. At that point the portfolio was 8 A,
  22 B, 4 C, and 0 D. EC-001 and EC-034 were then reviewed together to keep
  fleet convergence a projection over owner facts. EC-001 now defines a
  versioned, audience-bound projection envelope over owner-native results and
  moves to B based on current configuration, readiness, release, channel,
  node, and lifecycle evidence. At that stage EC-034 had precise immutable target-set,
  parent/child, targeted-repair, mixed-version, containment, and recovery
  mechanics, but remains C because only one bounded Lobster fleet analogue is
  proven. EC-010 then passed its owner-separation gate using current Cron
  source and schedule identity, restart catch-up, admission, cancellation,
  wake, and one-shot ABA tests. It now owns schedule generations,
  occurrences, activation acceptance/settlement, and optional payload-free
  host wake correlation while downstream runs and effects stay with their
  owners. EC-010 moves to A but remains short of evidence-ready on portable
  activation identity, lost acknowledgements, and mixed-version host proof.
  At that point the portfolio was 9 A, 23 B, 2 C, and 0 D. Evidence-ready remains
  separate from contract depth-ready. EC-026 was strengthened without
  inflating its evidence grade: the current TypeScript node runtime is now the
  explicit compatibility baseline, while Rust is a proposed bounded
  replacement that may become authoritative only after shared conformance,
  admission-time single-effect routing, canary, migration, operational,
  release, and exact TypeScript deletion proof. At that stage EC-026 remained
  C because no Rust artifact or executable proof existed.
  A formal portfolio closure audit then tested owner domains, relationship
  families, lifecycle/failure coverage, dependency closure, negative space,
  and ten end-to-end journeys. The original 34-contract set was not closed:
  workspace/filesystem was a first-class target owner with a strong current
  source audit but no EC scope. EC-035 Workspace and Filesystem Boundaries now
  covers workspace generations, sandbox bindings, path authority, local and
  remote copies, temporary/retained artifacts, containment, cleanup, and
  evidence without creating a universal filesystem. Two hard dependency
  cycles were also removed: evidence no longer depends on projection, and
  session continuity no longer hard-depends on channel conversation identity.
  The 35-contract portfolio is top-level contract-scope closed. The two
  remaining C-grade baselines are now complete. EC-026 has a real fork-only
  Rust Cargo artifact and five accepted/failure wire fixtures for a bounded
  protocol-v1 connect and `system.which` invocation profile. EC-034 has a
  second independent source-backed target family in OpenClaw Fleet tenant
  cells, distinct from Lobster version-slot rollout. Both move to B without
  claiming canary, migration, portable fan-out, or containment closure. The
  evidence inventory at that stage was 10 A, 25 B, 0 C, and 0 D. The portfolio is not
  evidence-closed or construction-closed.
  High-risk B-grade work has started with EC-003. Current source already
  fingerprints exact resolved credentials and opaque runtime owners,
  distinguishes stable OAuth principal refresh from owner replacement, fails
  closed on unresolved ownership, and carries successful-run auth bindings.
  `evidence-base/EC-003-evidence-packet.md` now records that proof and narrows
  the remaining target to durable non-secret operation binding, restart
  reconciliation, revocation settlement, and adoption beyond model/CLI
  execution. A strict portfolio-wide B-to-A audit then inspected all 25
  contracts against current source plus representative accepted/failure proof.
  Eighteen contracts moved to A: EC-002/003/004/005/011/012/013/014/015/016/
  017/018/019/020/023/024/025/028. Seven remain B without grade inflation:
  EC-001, EC-021, EC-022, EC-026, EC-027, EC-031, and EC-034. The current
  inventory is 28 A, 7 B, 0 C, and 0 D. The exact evidence, corrections, and
  cheapest decisive proofs are recorded in
  `evidence-base/portfolio-promotion-audit-2026-08-02.md`. A current
  competitive analysis then compared commercial agent platforms, open-source
  runtimes, and adjacent control-plane systems. EnterpriseClaw leads on owner
  boundaries, authority-to-effect semantics, copy lifecycle, evidence
  separation, and local autonomy, but trails on public simplicity, operator
  UX, hosted revisions, durable orchestration, fleet repair, restore
  composition, concrete SDKs, and executable cross-owner proof. The resulting
  corrections and three recommended golden journeys are recorded in
  `competitive-analysis-2026-08-02.md`. The first golden journey is now
  designed and role-reviewed under `operator-journeys/`: one protected
  outbound message presents human approval, rebinds edits, blocks stale
  authority before dispatch, shows provider acceptance precisely, and turns a
  post-dispatch timeout into a reconcile-before-retry attention state. Its
  standalone fork simulation now exists at
  `C:\src\openclaw-protected-effect-sim` on
  `user/giodl/ec-protected-effect-sim`. It uses Node built-ins only, performs
  no network/provider I/O, and passes six tests covering provider acceptance,
  changed intent, credential rotation, missing-generation fail-closed,
  attachment-order invalidation, and timeout-after-dispatch with retry
  withheld. Per operator direction, that slice is closed without OpenClaw
  integration. The second golden journey, durable conversation and delivery,
  is now designed, role-reviewed, and simulated in the same fork under
  `experiments/durable-delivery-simulation/`. Ten dependency-free tests cover
  durable queue acceptance, restart recovery, frozen route identity, fenced
  attempts, reconciliation before replay, late receipts, multipart partial
  effect, incompatible queue semantics, and retained provider/export copies
  after local deletion. The proof corrected EC-001, EC-015, EC-016, EC-017,
  and EC-023: portable delivery cannot promise external exactly once; `queued`
  requires durable acceptance; late receipts supersede uncertainty without
  rewriting history; and partial replay scope is per unsettled part. The
  architecture now also has a canonical executive entry point,
  `executive-overview.md`, which explains one OpenClaw work loop through five
  top-level boxes, thirteen capability lanes, and the retained 35-contract
  portfolio. `executive-competitive-landscape-2026-08-02.md` now maps those
  five boxes against Hermes Agent, OpenAI Agents SDK, LangGraph/LangSmith,
  Google ADK and Agent Runtime, Microsoft Agent Framework and Foundry, Amazon
  Bedrock AgentCore, CrewAI, OpenHands, Letta, and Temporal. It distinguishes
  local harnesses, SDKs, managed control planes, specialist agents, and durable
  execution substrates; records what EnterpriseClaw should borrow; and keeps
  target differentiation separate from shipped OpenClaw maturity.
  `presentation-materials/scout-hosting-openclaw.md` now provides the
  slide-ready Microsoft Scout positioning: OpenClaw owns the autonomous work
  runtime, Scout owns the enterprise operating environment, and versioned
  hosting contracts connect them without making Scout a second owner of
  sessions, memory, channels, effects, or workspace state.
- Package review: all ten implementation packages have now been reviewed with
  the eighteen `.craft/roles/claws` perspectives. The initial review graded the
  portfolio B: approved as the planning decomposition but not yet as an
  executable backlog. Its required corrections were shared-result ownership,
  the cross-package
  DAG, define common references, evidence integrity, managed mutation,
  deployment/risk profiles, and implementation cutover, make EAR the per-unit
  release owner, make EXA the presentation owner, correct Rust promotion order,
  and separate portable completion from optional managed composition.
- Package correction: the review blockers are now applied across all ten
  package graphs. `implementation-packages/cross-package-execution-contracts.md`
  defines XPK-001 through XPK-010 for ownership, references, evidence,
  managed mutation, deployment/risk profiles, cutover, fixtures,
  artifact/release trust, deletion, and pre-canary proof. EAR is the sole
  per-unit release-result owner, EXA is the presentation owner, conditional
  residuals allow a no-extension result, KCC/DGR and ARO/MPU ownership is
  one-way, and every Rust canary now follows current-owner release/recovery,
  exact deletion inventory, trusted published bytes, package-specific state
  migration, mixed-version, and rollback proof. The portfolio is ready to
  begin Wave 0; no upstream issue or PR has been filed. The fork execution
  plan is now recorded in `fork-execution-plan-2026-08-02.md` and has passed a
  full eighteen-role `.craft/roles` review after correction. The verified
  integration fork is `giodl73-repo/openclaw`; `giodl73-repo` has push/admin
  access while `giodl_microsoft` is read-only. Fork `main` remains an upstream
  mirror, evidence hypotheses use `lobster/evidence-*`, portable residuals use
  clean `candidate/*` branches, and `lobster/integration` is reconstructed from
  an ordered patch manifest rather than maintained by merges. Mutable RC branches are
  finalized only through signed tags, immutable manifests, published-byte
  proof, retained evidence, and independent verification. Phase 0 executes
  XPK-001 through XPK-009; XPK-010 remains the pre-canary gate. The first
  approved code-bearing slice is one read-only EXA three-owner projection after
  the exact vanilla baseline and queue reconstruction are established.
  `fork-pr-plan-2026-08-02.md` now makes the execution tangible and has passed
  a full eighteen-role review after correction. The original 49-row list is no
  longer treated as 49 executable PRs: upstream rows are hypotheses, release
  and canary rows are operations, and deletion rows require exact released
  replacements. The approved opening is PRE-001 to sync/protect the writable
  fork, BOOT-001 for the minimal reconstruction harness, and EVID-001 for the
  read-only owner projection, followed by a queue add/remove shrinkability
  proof. TRUST-001, POLICY-001, ASSURE-001, MUT-001, and HOST-001 now gate
  protected, managed, release, fleet, and Rust authority work.
  The delivery assumption has now changed explicitly: none of the 55 currently
  open OpenClaw PRs owned by `giodl73-repo` is assumed to merge for this
  program. A full eighteen-role review rejected treating the 55 as one active
  baseline but approved capturing every head as a quarantined source
  generation. `fork-carried-upstream-pr-ledger-2026-08-02.md` records all 55
  full heads and branches. `fork-carried-upstream-prs-2026-08-02.md` separates
  source capture, build/evidence admission, release eligibility, and runtime
  authority. Only #90708 when required, #107026, and the minimum readiness
  prefix may precede EVID-001; all other heads remain source-only until their
  individual trust, policy, evidence, ownership, migration, and deletion gates.
- Active branch / PR: `giodl73-repo/openclaw` PR #208 is merged from
  `lobster/evid-001-carried-sources` to `lobster/integration` at
  `07f288dffef67723c4a0cd05624697346df28661`. Protected
  `lobster/integration` is at that exact fast-forwarded head.
- Known dirty state: The wider checkout contains unrelated user changes.
  Preserve them. `projects/openclaw-design/` and this area are coherent
  documentation additions. The fork-only EC-026 proof is in
  `C:\src\openclaw-rust-node` on
  `user/giodl/ec026-rust-node-evidence`. The protected-effect simulation is
  untracked in `C:\src\openclaw-protected-effect-sim` on
  `user/giodl/ec-protected-effect-sim`.
- Blocking question: EVID-001 is complete. The next decision is classification
  of #113422, #114636, or another quarantined source before any further
  admission.

## Resume Checklist

- Run: `git status --short -- projects/enterpriseclaw projects/openclaw-design CONTEXT.md WORKSPACE.md projects/README.md`
- Verify: Target claims remain clearly separated from current behavior.
- Review: Owner authority, generation fencing, failure semantics, local-mode
  removability, and evidence requirements.
- Update: `target-architecture.md`, this file, and the current-state audit only
  when source facts change.

## Guardrails

- Keep current behavior in `projects/openclaw-design/` and desired behavior
  here.
- Do not turn EnterpriseClaw into a universal resource model or service bus.
- Preserve owner-native storage, policy, retries, and effect semantics.
- Enterprise controls must be optional projections around a complete local
  runtime.
- Keep implementation work in an authorized OpenClaw worktree.
- Update this file at the end of meaningful work.
- Do not overwrite unrelated user changes.

## Open Threads

- Retain PRE-001 run `30773428781` as vanilla baseline evidence with its known
  `native-i18n` inventory-drift failure.
- Keep BOOT-001, the 55-source inventory, the Wave 0 definition gate, B3
  reconstruction authority, and EVID-001 synchronized at
  `07f288dffef67723c4a0cd05624697346df28661`.
- Preserve EVID-001's exact three admitted ranges, 14 B3 resolutions,
  deterministic reconstruction identities, owner-projection fixture, and
  evidence-only authority boundary.
- Stop for classification before admitting #113422, #114636, or any other
  carried head; EVID-001 remains evidence-only with no release/runtime
  authority.
- Review the target architecture through runtime-owner, hobbyist, enterprise
  operator, security, and skeptical-simplicity roles.
- Review lane boundaries and identify responsibilities that are duplicated,
  missing, or assigned to the wrong owner.
- Score candidate technologies as reuse, adapt, new, avoid, or assess only
  after owner and lifecycle fit is established.
- Align Rust Node Mode with the first replacement slice: protocol, trust,
  lifecycle, evidence, compatibility, and deletion gates.
- Convert the 35-contract disposition into a fork patch/deletion ledger,
  Lobster service inventory, Rust component registry, and mixed-release
  compatibility manifest.
- Continue decomposing the portfolio into thirteen area implementation
  packages rather than one project per EC contract. Operations, assurance, and
  fleet is the completed first design package.
- Audit the three residual operations/assurance/fleet upstream gaps against
  current OpenClaw head, track the two existing upstream stacks, inventory
  actual fork proofs as B1/B2/B3, and run the next bounded proof against three
  disposable OpenClaw Fleet cells. Do not file upstream until each residual ask
  names its exact current owner seam and deletion target.
- Keep the committed new-component set small: Rust Node Mode and the
  cross-language conformance suite first; supervisor and control projections
  follow only after bounded proof.
- Facilitate a current-state Scout architecture session before designating SQL
  or Dolt; capture deployment, state ownership, trust, patch/LTS, and recovery
  constraints first.
- Name the enterprise RFC portfolio by focused owner contract, starting from
  the area roadmap rather than an umbrella EnterpriseClaw proposal. Initial
  names and scope boundaries now live under `rfcs/`.
- Complete the evidence-ready baseline for all 35 contracts before resuming
  specialist panels. Close the seven remaining B-grade decisive slices, then
  address target, migration, deletion, mixed-version, and disproof gaps across
  the 28 A-grade contracts. The EC-006/EC-007 pilot remains the reference
  packet.
- Resolve the role-review open decisions: Scout operational budgets,
  protected authority classes, connector validation ownership,
  JavaScript/TypeScript compatibility hosting, and mixed-artifact release
  topology.
- Define architectural decision criteria without turning this area into an RFC
  or implementation backlog.
- Keep the six machine-contract concepts as implementation plumbing, not the
  operator experience. Design the human surface around what is running,
  whether it works, what it is doing, what needs attention, and which
  approve/repair/retry/rollback/restore action is available. Prove the
  protected-effect, durable-delivery, and fleet-recovery golden journeys
  before adding more architectural breadth. Preserve all 35 RFC scopes as the
  durable contract portfolio; achieve simplicity through audience and product
  projection layers rather than contract removal.
- Run the standalone fleet rollout and recovery simulation to challenge
  EC-021 owner checkpoints/restore and EC-034 fleet convergence/containment.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`. Keep this file
as the concise canonical resume snapshot.
