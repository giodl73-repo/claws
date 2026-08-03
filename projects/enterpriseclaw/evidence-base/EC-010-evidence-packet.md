# EC-010 Scheduled Activation Evidence Packet

## Evidence Baseline

- OpenClaw source worktree: `C:\src\openclaw-design-audit`.
- Audited revision: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Current source area: `src/cron/`.
- Current execution comparison:
  `projects/openclaw-design/source-audit-agent-execution-2026-08-01.md`.
- Host/fork evidence:
  `projects/state-continuity/cron-projection-cancellation-boundary-2026-07-26.md`,
  `pr6b-retained-wake-authority-frame-2026-07-26.md`, and
  `pr-plans/05-hibernate-and-wake.md`.
- Proposal status: EC-010 is a local scoped draft. Host wake/projection work is
  fork/proposal evidence and is not described as accepted generic behavior.
- Evidence grade after this packet: A.

## Separation Gate Result

**Pass.**

The scheduling owner has independent identity, durable state, failure,
recovery, and deletion value:

- jobs and schedule state persist without a live run;
- schedule identity and occurrence slots exist before execution;
- queued/running/catch-up state has restart behavior;
- manual and scheduled occurrences are independently owned;
- replacement jobs are protected from stale completion; and
- downstream agent, command, script, delivery, and effect lifecycles remain
  separate.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| Cron persists jobs, schedules, next occurrences, queued/running markers, and prior outcomes. | Current source | `src/cron/types.ts`, service state/store |
| Scheduling inputs have normalized stable identity. | Current proof | `schedule-identity.test.ts` |
| Restart reconciles interrupted and overdue jobs. | Current proof | restart catch-up tests |
| Manual execution does not consume a future scheduled one-shot. | Current proof | one-shot schedule ownership tests |
| Old completion cannot finalize into a removed/recreated job. | Current proof | one-shot ABA/replacement tests |
| Active-run tracking and suspension visibility remain distinct. | Current proof | active-run cancellation tests |
| A portable occurrence/activation identity is exposed across all paths. | Target hypothesis | Current identities are owner-native and not yet one portable contract |
| Absent-compute wake projection is generic current OpenClaw behavior. | Fork/host hypothesis | State-continuity/Lobster evidence only |

## Current Objects and Lifetimes

| Object | Current owner | Identity/lifetime |
| --- | --- | --- |
| Cron job | Cron store/service | Stable job ID and persisted definition |
| Schedule | Cron job | `at`, `every`, cron expression, on-exit, or stream |
| Schedule identity | Cron scheduler | Normalized effective scheduling inputs |
| Schedule state | Cron scheduler | Next run, activation boundary, catch-up, pacing, queued/running, prior result |
| Manual request | Cron service | Distinct requested occurrence |
| Scheduled occurrence | Cron scheduler | Due slot computed from schedule state |
| Queued reservation | Cron admission | Durable marker before shared admission |
| Active run tracking | Cron/runtime relationship | Process/runtime settlement tracking |
| Downstream run | Agent/command/script owner | Separate execution and effect lifecycle |
| Delivery result | Channel/delivery owner | Separate from execution outcome |
| Host wake cause | Retaining source/host | Proposed bounded identity without payload |

## Current State and Failure Evidence

Current tests cover:

- stable normalized schedule identity;
- schedule-edit and activation timing;
- one-shot consumption only by the scheduled occurrence;
- concurrent queued manual runs without schedule loss;
- interrupted restart classification;
- overdue catch-up and missed-work staggering;
- schedule removal/recreation while prior work settles;
- shared run admission;
- active-run cancellation and bounded tracking retirement;
- wake target validation; and
- separate execution and delivery outcomes.

The current source does not expose one uniform portable activation identity
across due, manual, on-exit, stream, command, script, heartbeat, and agent-turn
paths.

## Host/Absent-Compute Evidence

The state-continuity work demonstrates a bounded owner-preserving composition:

- OpenClaw retains cron definitions, due decisions, catch-up, and dedupe;
- host projection carries only job identity, enabled state, deadline,
  projection attempt, and accepted revision;
- permanent prepare/commit/abort arbitration prevents stale projection commit;
- retained Teams/API/cron/operator causes can join one destination generation;
- wake payloads and credentials stay with their semantic owners; and
- readiness gates delivery after provisioning.

This evidence supports the target contract but does not make host wake
projection mandatory or current upstream behavior.

## Target Contribution

EC-010 contributes:

- stable schedule generation and occurrence identity;
- durable activation acceptance and reconciliation;
- reservation/lease settlement distinct from resource admission;
- explicit missed/catch-up/backoff policy;
- correlation to, but non-ownership of, downstream operations; and
- an optional payload-free host wake relationship for absent compute.

## Representative Fixtures

1. **Scheduled occurrence**: one due occurrence creates one downstream
   operation and settles activation separately.
2. **Manual versus scheduled**: a manual run completes while the future
   scheduled one-shot remains.
3. **ABA replacement**: an old run settles after job removal/recreation and
   cannot mutate the replacement.
4. **Restart catch-up**: an interrupted occurrence is classified and an
   overdue valid occurrence is caught up once.
5. **Stale generation**: a queued occurrence encounters a changed schedule
   generation and is superseded or retained by explicit policy.
6. **Lost acknowledgement**: activation acceptance is inspected by operation
   identity instead of dispatching again.
7. **Absent compute**: concurrent retained causes coalesce into one destination
   generation and delivery waits for readiness.
8. **Cancellation**: future occurrences stop while in-flight downstream
   execution/effects settle independently.

## Operational and Security Constraints

- Schedule authority records authenticated owner/requester provenance.
- Wake projection carries bounded identity and deadline only, never prompts,
  commands, credentials, or caller-selected recovery state.
- Missed-work catch-up is bounded by concurrency, staggering, and maximum
  restart load.
- Invalid or incompatible jobs are isolated/quarantined.
- Unknown activation or provisioning outcomes retain the occurrence/cause and
  fail closed.
- Cancellation and suspension do not prove downstream effects stopped.

## Migration, Deletion, and Disproof

- Adapt current Cron job/store/service ownership.
- Add portable identity and generation without creating a workflow engine.
- Keep host wake projection optional and default-off.
- Delete ad hoc timers, run-status inference, and source-specific cold-start
  races.
- Disprove EC-010 only if schedule/occurrence/reservation/restart state no
  longer exists independently of downstream execution.

## Unproven Normative Claims

| Target claim | Required proof | Status |
| --- | --- | --- |
| One portable occurrence/activation identity spans all trigger kinds. | Cross-trigger conformance fixture | Planned |
| Lost activation acknowledgement is recoverable without duplicate dispatch. | Durable acceptance fixture | Planned |
| Schedule generations fence queued occurrences consistently. | Schedule-edit race fixture | Planned |
| Host wake protocol remains compatible across old/new versions. | Mixed-version host fixture | Planned |
| Absence-to-ready timing and overload budgets are explicit. | Operational budget proof | Planned |

## Evidence-Ready Disposition

EC-010 is A-grade but not evidence-ready. The independent current owner and
representative restart, schedule, cancellation, admission, and ABA proofs are
strong. Portable activation identity, lost-ack reconciliation, and
mixed-version host proof remain.
