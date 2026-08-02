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

- Last updated: 2026-08-01
- Last agent: GitHub Copilot CLI
- Current focus: The target architecture now has thirteen major swim lanes.
  Each lane records goals, responsibilities, conceptual pieces, contracts,
  quality attributes, dependencies, and an initial existing/new technology-fit
  inventory. The incremental Rust strategy starts from an upstream-compatible
  fork, proves Rust Node Mode first, and replaces owner components through
  conformance, shadow/canary operation, rollback, and TypeScript deletion. The
  initial implementation map now designates each lane capability as existing
  OpenClaw, fork plus focused RFC, or a new component. Omar's Scout September
  guidance adds immediate alignment priorities: Claws, memory, mail
  authentication, memory ACL, Node/Rust, and SQL/Dolt after the current Scout
  runtime architecture is shared. A concise area roadmap now records which
  lanes should be replaced progressively, adapted in place, preserved
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
  8 A-grade contracts with audited source and representative proof, 20
  B-grade contracts with source-backed current behavior but incomplete target
  proof, 6 C-grade contracts needing dedicated owner/source proof, and no
  D-grade unresolved-owner contracts. Evidence-ready is now a separate gate
  from contract depth-ready. The next work starts with EC-001, EC-010,
  EC-015, EC-016, EC-026, and EC-034 before resuming specialist panels.
- Active branch / PR: Local notebook only
- Known dirty state: The wider checkout contains unrelated user changes.
  Preserve them. `projects/openclaw-design/` and this area are coherent
  documentation additions.
- Blocking question: Does EC-010 pass its owner-separation gate, or should its
  activation semantics fold into EC-008?

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

- Review the target architecture through runtime-owner, hobbyist, enterprise
  operator, security, and skeptical-simplicity roles.
- Review lane boundaries and identify responsibilities that are duplicated,
  missing, or assigned to the wrong owner.
- Score candidate technologies as reuse, adapt, new, avoid, or assess only
  after owner and lifecycle fit is established.
- Align Rust Node Mode with the first replacement slice: protocol, trust,
  lifecycle, evidence, compatibility, and deletion gates.
- Keep the committed new-component set small: Rust Node Mode and the
  cross-language conformance suite first; supervisor and control projections
  follow only after bounded proof.
- Facilitate a current-state Scout architecture session before designating SQL
  or Dolt; capture deployment, state ownership, trust, patch/LTS, and recovery
  constraints first.
- Name the enterprise RFC portfolio by focused owner contract, starting from
  the area roadmap rather than an umbrella EnterpriseClaw proposal. Initial
  names and scope boundaries now live under `rfcs/`.
- Complete the evidence-ready baseline for all 34 contracts before resuming
  specialist panels. Start with the six C-grade contracts, then high-risk
  B-grade authority/effect/recovery relationships. The EC-006/EC-007 pilot is
  complete and remains the reference packet.
- Resolve the role-review open decisions: Scout operational budgets,
  protected authority classes, connector validation ownership,
  JavaScript/TypeScript compatibility hosting, and mixed-artifact release
  topology.
- Define architectural decision criteria without turning this area into an RFC
  or implementation backlog.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`. Keep this file
as the concise canonical resume snapshot.
