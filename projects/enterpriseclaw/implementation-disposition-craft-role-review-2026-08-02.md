# Implementation Disposition `.craft/roles` Review - 2026-08-02

## Scope

This review challenges `implementation-disposition-35-contracts.md` before the
portfolio is decomposed into area RFCs and repo-specific work items.

Roles used:

- `gateway-eng` - runtime latency, stability, and failure posture;
- `power-user` - operational control and removal of manual work;
- `founder` - community trust, simplicity, and upstream legitimacy;
- `ciso` - enforcement, durable evidence, revocation, and containment;
- `lorant-reviewer` - partial conversions, duplicate paths, and proof quality;
- `claws-release-eng` - mixed release, installability, and rollback;
- `lobster-container-eng` - process lifecycle, cold start, health, and resource
  budgets;
- `platform-eng` - fleet convergence and partial failure;
- `m365-connector-eng` - write-path validation, retries, and sync conflicts; and
- `claws-repo-steward` - repository boundaries and independent component
  integrity.

## Verdict

**Approved after correction as the portfolio-level disposition model.**

It is ready to govern the next decomposition level. It is not itself an
implementation backlog, and its 35 contracts must not be converted mechanically
into 35 upstream RFCs.

## Blocking Findings and Applied Corrections

### 1. The original wording over-promoted all 35 contracts upstream

**Roles:** founder, lorant-reviewer, claws-repo-steward.

The architecture contracts include enterprise composition such as federation,
fleet convergence, legal obligations, durable compliance, and managed restore.
Those are valid EnterpriseClaw contracts but not automatically appropriate
OpenClaw RFCs.

**Correction:** all 35 remain architecture contracts; upstream receives only
the smallest portable owner-facing deltas. Enterprise composition remains in
Lobster or EnterpriseClaw specifications.

### 2. "Fork integration" was too broad to manage

**Roles:** lorant-reviewer, founder, claws-release-eng.

A core semantic patch, a private Scout plugin, and a temporary release
compatibility patch have different risks and exit paths.

**Correction:** divide fork work into:

- B1 core incubation patches;
- B2 Scout adopters/plugins; and
- B3 compatibility, migration, release, and canary patches.

Every patch must be recorded in a ledger with a current base revision and one
mechanical exit.

### 3. Runtime and managed-policy calls lacked explicit budgets

**Roles:** gateway-eng, lobster-container-eng.

The plan could be read as permission to place synchronous enterprise services
on every Gateway path or add Rust sidecars without accounting for startup,
memory, crash recovery, and initialization order.

**Correction:** add runtime and deployment-profile gates. No unbounded remote
call belongs on the Gateway hot path. Every Rust process must declare ready-time,
resource, exposure, health, recovery, install, and rollback behavior.

### 4. Managed policy was not explicitly tied to local enforcement

**Roles:** ciso, lorant-reviewer.

Lobster may distribute policy and approvals, but a cloud record cannot prove
that the authoritative owner admitted the same normalized operation.

**Correction:** managed authority must be enforced at the OpenClaw or Rust
owner boundary and correlated through exact target, generation, invocation,
effect, and settlement evidence. High-risk operations fail closed.

### 5. Connector adoption needed one write-path invariant

**Roles:** m365-connector-eng, ciso, lorant-reviewer.

Without an explicit rule, Loop, Graph, Cowork, CLI, and managed configuration
could acquire parallel mutation paths with different validation.

**Correction:** every write traverses the same owner validation and activation
path. Direct connector writes to canonical files or stores are prohibited.
Retries, idempotency, conflict, and sync loops are part of each adopter
contract.

### 6. The four-track model risked leaking into operator UX

**Roles:** power-user, founder, platform-eng.

Operators should not diagnose whether behavior came from upstream, a fork
patch, Lobster, or Rust. They need one answer about state, readiness, findings,
and safe action.

**Correction:** add an operator gate. Managed capability must replace manual
work, preserve raw local OpenClaw operation, and project owner truth without
implementation-track vocabulary.

### 7. The release manifest needed a stronger product contract

**Roles:** claws-release-eng, platform-eng, lobster-container-eng.

A version list alone does not prove that a mixed TypeScript/Rust/Lobster release
installs, upgrades, downgrades, or recovers.

**Correction:** require a supported component tuple, upgrade order, fresh
installation, partial-activation recovery, downgrade, rollback, and
current-head proof.

### 8. Rust independence needed a repository and ecosystem gate

**Roles:** founder, claws-repo-steward, claws-release-eng.

A Rust component is not broadly reusable if it imports private Scout
dependencies, requires the EnterpriseClaw fork, or forces skills and plugins to
be rewritten.

**Correction:** Rust owners require public protocols, standalone artifacts,
clean repository dependencies, ordinary OpenClaw compatibility, and a named
TypeScript owner deletion target. Existing JavaScript/TypeScript extensions
remain supported.

### 9. Fleet control needed explicit partial settlement

**Roles:** platform-eng, ciso, power-user.

Fleet operations cannot report success because the control plane accepted a
request. Operators need exact unit outcomes and targeted recovery.

**Correction:** preserve desired, observed, converged, quarantined, failed, and
unknown states per unit. Repair only affected units and retain immutable
history.

## Strong Parts of the Plan

- Portable semantics are separated from enterprise hosting decisions.
- Lobster is prevented from becoming a second OpenClaw state database.
- The fork is an incubation and adoption layer rather than a permanent product
  fork.
- Rust migration is based on authoritative owner replacement and TypeScript
  deletion.
- Local OpenClaw remains complete without Scout.
- Sessions, memory, channels, effects, workspaces, and plugins retain
  owner-native semantics.
- Fleet projection is separated from per-unit truth.

## Remaining Decisions Before Work-Item Decomposition

These do not invalidate the portfolio model, but each area package must resolve
them:

1. Current OpenClaw source seam and owner for every proposed upstream delta.
2. Exact risk classes and latency/failure budget for runtime enforcement.
3. Current Scout deployment topology, cold-start, memory, and recovery budgets.
4. Final repository location and release ownership for each Rust component.
5. Existing fork patch inventory and the current upstream/LTS base.
6. Whether each Scout integration can be a plugin or requires a temporary core
   patch.
7. Supported mixed-component release tuple and upgrade order.

## Required Shape of the Next Level

Create thirteen area implementation packages rather than 35 isolated project
plans. Each area package then produces the smallest necessary artifacts:

| Artifact | Question answered |
| --- | --- |
| Upstream ask set | What exact portable behavior should OpenClaw accept? |
| Fork ledger | What do we carry now, why, and how does it disappear? |
| Lobster service/adopter set | What managed composition must Scout operate? |
| Rust component set | Which complete owners can be replaced independently? |
| Work-item graph | Which repo, owner, dependency, proof, and release gate delivers it? |

The first package should be **operations, assurance, and fleet**, using the
fleet rollout/recovery simulation to challenge EC-021, EC-029, EC-032, EC-033,
and EC-034 before implementation work is filed.

