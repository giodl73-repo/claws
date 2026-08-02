# Delegated Execution Facility

## Boundary

Delegated Execution creates and supervises child agent work with explicit
lineage, control authority, completion ownership, persistence, cancellation,
recovery, and result delivery.

It is an Agent Execution child facility. It does not redefine session
continuity, tool policy, scheduling, or messaging.

## Core Objects

- spawn request and admitted spawn plan;
- requester session;
- controller session;
- completion-owner session;
- parent/lineage session;
- child session key and session ID;
- spawn depth and control scope;
- subagent run and related task/swarm/scheduler identities;
- completion, delivery, tombstone, archive, and cleanup state.

## Core Invariant

- `controllerSessionKey` owns cancel and steer authority.
- `completionRequesterSessionKey` owns terminal result delivery.
- `parentSessionKey` describes lineage only.

These identities may differ.

## Current Guarantees

- Spawn depth, child role, control scope, workspace, and lineage are persisted.
- Child creation revalidates session lifecycle state at the writer barrier.
- Cross-agent visibility and control are policy-gated.
- Leaf children cannot control siblings or ancestors.
- One child session may have multiple run generations.
- Kill and cancel clear queued work and reconcile runtime/session state.
- Registry startup recovers orphaned runs and incomplete announcements.
- A2A delivery suppresses duplicate and stale completion messages.

## Open Gaps

- Durable child-slot admission across restart.
- Migration of legacy parent-only lineage.
- First-class completion-owner semantics across every announcement path.
- Atomic or explicitly compensating settlement across registry, task runtime,
  session state, delivery, and cleanup.
- Clear vocabulary and compatibility for collector and swarm variants.

Source audit: `../source-audit-delegated-execution-2026-08-01.md`.
