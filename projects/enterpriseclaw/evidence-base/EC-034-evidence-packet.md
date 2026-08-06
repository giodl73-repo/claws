# EC-034 Fleet Convergence and Containment Evidence Packet

## Evidence Baseline

- Current OpenClaw source worktree: `C:\src\openclaw-design-audit`.
- Audited revision:
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Current Fleet implementation:
  `src/fleet/registry.ts`, `src/fleet/service.runtime.ts`,
  `src/fleet/backup.runtime.ts`, and their tests.
- Current Fleet contract:
  `docs/gateway/multi-tenant-hosting.md` and `docs/cli/fleet.md`.
- Independent Lobster analogue:
  `projects/promoteclaw/openclaw-dual-image-rollback.md`.
- Evidence grade: B.

## Two Independent Target Families

| Family | Owner-local identity | Lifecycle and recovery evidence | Limit |
| --- | --- | --- | --- |
| Lobster version slots | Stable physical PlexService plus role-map generation | Candidate validation, atomic Active/Previous rotation, quarantine, drain, rollback, and reclamation budgets | Product-specific release/routing model |
| OpenClaw Fleet cells | Tenant ID, cell owner ID, container name, host port, and exact attempt label | Durable registry, serialized operation lease, health-gated create/upgrade, previous-cell restoration, backup/restore, removal, and contained purge | Single-host per-cell supervisor, not multi-unit convergence |

The second family is not another release cohort. It manages complete,
tenant-isolated Gateway deployment units with separate state, credentials,
workspace, network, token, and lifecycle.

## Current Source Findings

- Fleet registry reservation and host-port allocation occur under one SQLite
  write transaction.
- Same-cell mutations use renewable expiring leases. An expired owner is
  fenced from its successor.
- Container and network ownership bind tenant, owner, and exact operation
  attempt labels.
- Started create and replacement operations are health-gated.
- Failed upgrades restore the immutable prior image and runtime profile.
- Unhealthy new creates remain inspectable rather than becoming
  success-shaped or being silently deleted.
- Backup requires a stopped cell, preserves separate state/auth roots, skips
  symlinks, and enforces byte/entry/path limits.
- Restore rejects tenant mismatch, running-cell mutation without explicit
  force, missing registered containers, and unsafe archive content.
- Purge requires explicit force and resolved-path containment; symlink and
  sibling-cell escapes fail before mutation.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| Unlike unit owners can preserve stable identity, operation generations, lifecycle, failure, and recovery. | Current source/proof | Lobster slot proof plus OpenClaw Fleet source/tests |
| Fleet-level state must remain a projection over unit-owner results. | Current source/model | Both families retain owner-local runtime and settlement |
| A portable multi-unit parent operation and immutable target-set receipt exist. | Target hypothesis | Not implemented |
| Failed or unknown children can be repaired without touching healthy units. | Target hypothesis | Only single-target rollback/repair exists |
| Multi-dimensional containment can preserve unknown external-effect certainty. | Target hypothesis | Not implemented |

## Role Evaluation

- **Platform operator:** the two target families justify a shared
  relationship, but a 47-unit command must expose every child result and
  repair only failed/unknown units.
- **Runtime/container owner:** the coordinator may request lifecycle changes;
  local health, refusal, restore, and settled runtime state remain
  authoritative.
- **CISO:** removal, purge, revocation, admission halt, and stopped external
  effects are distinct. No kill switch may infer all dimensions from container
  exit.
- **Simplicity/founder:** OpenClaw Fleet remains optional and single-host.
  Ordinary local installations must not enroll in a controller.

## Cheapest Next Proof

Compose three OpenClaw Fleet cells in a fork-only fixture:

1. freeze an immutable target set and child operation identity per cell;
2. upgrade two cells successfully and fail one replacement health gate;
3. preserve the failed child's restored prior state;
4. create a repair parent referencing only that child;
5. prove the two healthy cells receive no second mutation; and
6. project partial then converged results without becoming canonical cell
   state.

## Evidence-Ready Disposition

EC-034 moves from C to B. The second independent target family and
representative current proofs now exist. It remains not evidence-ready because
portable parent/child fan-out, immutable target-set recovery, targeted repair,
break-glass authority, and multi-owner containment certainty remain unproven.
