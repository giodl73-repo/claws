# Delegated Execution Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

Delegated execution is a real Agent Execution child facility, not merely a
recursive agent call. It owns explicit spawn planning, child session creation,
run registration, concurrency admission, bounded authority, cancellation,
restart reconciliation, completion delivery, and retention cleanup.

Its most important design fact is that **lineage, control, and result delivery
are separate relationships**:

- `parentSessionKey` describes parent/thread/fork lineage;
- `controllerSessionKey` owns cancel and steer authority; and
- `completionRequesterSessionKey` owns completion delivery.

They may identify different sessions.

## Current Architecture

```text
requester session
      |
      v
spawn plan + capability/depth/child-slot admission
      |
      v
child session creation
  lineage + controller + completion owner + workspace + policy
      |
      v
subagent run registry + task runtime + lanes
      |
      +--> steer / cancel / kill
      +--> restart reconciliation
      +--> A2A messages
      |
      v
terminal completion + announce/delivery + archive/cleanup
```

## Objects and Lifetimes

| Object | Owner | Lifetime |
| ------ | ----- | -------- |
| Spawn request/plan | Sessions spawn tool | One validated delegation request. |
| Requester session | Delegation ownership resolver | Session that requested the child work. |
| Controller session | Subagent control owner | Session authorized to cancel or steer the child. |
| Completion owner | Completion delivery owner | Session that receives or suppresses the terminal result. |
| Parent session | Session lineage owner | UI/thread/fork lineage; not automatically control authority. |
| Child session key | Session registry | Logical child continuity scope. |
| Child session ID | Session/transcript owner | Current storage incarnation of the child session. |
| Spawn depth | Session registry/depth policy | Persisted lineage depth for spawn-owned children. |
| Subagent run | Subagent registry | One run generation for a child session. |
| Task/swarm/scheduler identifiers | Runtime owners | Related execution/admission identities, not aliases for the run ID. |
| Completion record | Subagent registry | Terminal state plus delivery/announcement progress. |
| Tombstone/cleanup state | Registry/session runtime | Retained until kill, archive, delivery, and reconciliation settle. |

## Spawn and Admission

Visible spawn is explicit. The spawn path derives:

- requester;
- controller;
- completion requester;
- `parentSessionKey`;
- `spawnDepth`;
- child role and control scope;
- workspace/CWD;
- tool policy; and
- delivery mode.

See:

- `src/agents/tools/sessions-spawn-tool.ts:265-516`;
- `src/agents/tools/sessions-spawn-visible.ts:88-389`;
- `src/agents/spawn-plan.ts:281-376`;
- `src/agents/subagent-spawn-ownership.ts:21-52`; and
- `src/agents/subagent-spawn-session-patch.ts:103-170`.

Visible-child slots are reserved before session creation. The cap is
process-local. Session lifecycle admission revalidates work at the writer
barrier (`src/sessions/session-lifecycle-admission.ts:169-573`).

## Child Session Persistence

The Gateway session-create service persists:

- `spawnDepth`;
- `parentSessionKey`;
- `spawnedBy`;
- `completionOwnerSessionKey`;
- `subagentRole`;
- `subagentControlScope`;
- spawned workspace/CWD; and
- creation metadata.

See `src/gateway/session-create-service.ts:272-1205` and
`packages/gateway-protocol/src/schema/sessions-create.ts:14-32`.

`spawnedBy` is depth lineage. `parentSessionKey` is a UI/thread/fork
relationship and must not be used as a substitute for persisted spawn depth.

## Run Registry

Live delegated work is indexed independently by:

- `runId`;
- `childSessionKey`; and
- optional collector group.

The run record keeps separate controller/requester identities, task and swarm
IDs, scheduler slot, spawn mode, completion expectation, delivery state,
terminal completion, and cleanup/retention facts
(`src/agents/subagent-registry-memory.ts:1-105`,
`src/agents/subagent-registry-run-manager.ts:801-1367`).

One child session may have multiple run generations.

## Authority, Control, and Visibility

Cross-agent access is gated by:

- agent-to-agent enablement;
- configured session visibility;
- subagent tool policy;
- caller tree relationship; and
- child `subagentControlScope`.

Leaf subagents with `controlScope=none` may cancel their own task but not
control siblings or ancestors
(`src/agents/subagent-capabilities.ts:154-185`,
`src/plugin-sdk/session-visibility.ts:209-497`).

The delegate tool is hidden from sandboxed and system-agent runs
(`src/agents/tools/openclaw-delegate-tool.ts:37-64`).

`subagents cancel`, kill, and steer are scoped to the caller's authorized tree.
Kill writes tombstones, clears queued/lane state, and reconciles runtime,
registry, task, and session state
(`src/agents/subagent-control.ts:123-853`,
`src/agents/subagent-registry-sweep-kill.ts:108-780`).

## Completion and A2A Delivery

Agent-to-agent messaging is bounded ping-pong followed by an announcement
phase. Same-session delivery may bypass the response decider; otherwise
`ANNOUNCE_SKIP`, `REPLY_SKIP`, and silent tokens prevent duplicate user-visible
messages. Baseline snapshots prevent stale delayed replies.

See:

- `src/agents/tools/sessions-send-tool.ts:875-950`;
- `src/agents/tools/sessions-send-tool.a2a.ts:1-255`;
- `src/agents/tools/sessions-send-helpers.ts:76-120`; and
- `src/agents/tools/sessions-send-tokens.ts:1-37`.

## Restart and Recovery

Registry startup restores orphaned runs, retries incomplete wait/announce
cleanup, and reconciles completion from session-store state when process
restart or lag prevented an in-memory registry update
(`src/agents/subagent-registry.ts:102-573`,
`src/agents/subagent-session-reconciliation.ts:131-270`).

## Evidence

- Spawn ownership, depth, child caps, session creation, and lifecycle:
  `src/agents/tools/sessions-spawn-tool.test.ts`,
  `src/gateway/server.sessions.create.test.ts`.
- Visibility and cross-agent access:
  `src/agents/tools/sessions-access.test.ts`.
- A2A ping-pong, skip tokens, stale reply suppression, and delivery:
  `src/agents/tools/sessions-send-tool.a2a.test.ts`.
- Exclusive lifecycle admission and writer-barrier revalidation:
  `src/sessions/session-lifecycle-admission.test.ts`.
- Scoped cancellation and control:
  `src/agents/tools/subagents-tool.test.ts`.
- Restart, completion, kill, announce, and cleanup reconciliation:
  `src/agents/subagent-registry.test.ts`.

## What Is Covered Well

- Spawn is an admitted plan, not an implicit recursive call.
- Parent, requester, controller, and completion-owner identities are distinct.
- Child lineage and run state are persisted separately.
- Spawn depth and control scope are explicit.
- Session lifecycle admission protects child creation against concurrent reset,
  archive, or deletion.
- Cross-agent visibility and control are policy-gated.
- Restart recovery reconciles run registry and session state.
- A2A completion has duplicate-suppression and stale-reply protection.

## Weak or Monolithic

- Visible-child slot reservations are process-local and reset after restart.
- Older rows with only `parentSessionKey` can be reclassified as root sessions
  because spawn depth follows `spawnedBy`.
- Completion suppression uses parent/owned-child heuristics in places rather
  than one first-class completion-owner contract.
- Terminal state spans session row, subagent registry, task runtime, delivery,
  and detached cleanup. Settlement remains best-effort across those stores.
- "Subagent", "delegated run", "child session", "A2A", "collector", and
  "swarm" are related but not interchangeable.

## Separation Decision

Keep Delegated Execution as an Agent Execution child contract with these
subcontracts:

1. spawn planning and capability admission;
2. child session and lineage persistence;
3. controller and completion-owner authority;
4. run registration and concurrency;
5. steer/cancel/kill;
6. A2A/result delivery;
7. restart reconciliation; and
8. archive and cleanup.

The core invariant should be:

> `controllerSessionKey` controls the child,
> `completionRequesterSessionKey` receives its result, and
> `parentSessionKey` describes lineage only.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Concrete owners exist across spawn, registry, session, control, and delivery. |
| Object model | 4 | Requester/controller/completion/parent, child session, run, depth, and cleanup objects are explicit. |
| Contract completeness | 3 | Strong lifecycle; atomic terminal settlement and completion ownership need work. |
| Separation/cohesion | 2 | State and settlement span several registries and runtimes. |
| Evidence | 4 | Extensive spawn, access, lifecycle, A2A, restart, and cleanup tests. |
| Evolution/operations | 3 | Restart reconciliation is strong; legacy depth and process-local caps remain gaps. |

**Total: 19/24 (B), high confidence for the audited core.**
