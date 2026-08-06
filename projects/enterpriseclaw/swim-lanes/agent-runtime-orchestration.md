# Agent Runtime and Orchestration

## Architectural Goal

Execute bounded autonomous work with explicit lineage, resource scope,
cancellation, recovery, and terminal settlement.

## Responsibilities

- Own runs, attempts, turn boundaries, and terminal outcomes.
- Assemble owner-provided capabilities for one execution scope.
- Spawn and supervise delegated work with independent identity and lifecycle.
- Coordinate cancellation, timeout, retry, and recovery.
- Correlate model, tool, channel, memory, and node activity to a run.

## Explicit Non-Ownership

- The runtime does not own transcript continuity, memory corpora, provider
  request semantics, tool effects, or channel delivery.
- Parent lineage does not grant control after authority or ownership changes.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Run | Bounded unit of autonomous work | Stable correlation and settlement |
| Attempt | One execution try under fixed bindings | Records generations and retry reason |
| Capability surface | Run-scoped available actions | Derived from owner declarations and authority |
| Delegation | Parent/child work relationship | Separate control and evidence |
| Cancellation intent | Request work to stop | Distinct from proven settlement |
| Terminal result | Completed, failed, cancelled, partial, or unknown | Links owner results |

## Core Contracts

- Each attempt binds exact context, model, credential, policy, tool, and runtime
  generations.
- Retries create distinguishable attempts.
- Cancellation propagates but does not overclaim external-effect settlement.
- Child completion and cleanup remain visible after parent termination.

## Quality Attributes

- Deterministic correlation and bounded concurrency.
- Graceful degradation and recoverable restart.
- Fair resource admission.
- No hidden authority escalation through delegation.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Core runs | Current agent execution | Reuse/adapt | Explicit binding and terminal evidence |
| Delegation | Current subagent runtime | Adapt | Durable settlement and cleanup |
| Scheduling | Background-work concepts | Assess | Leases, retries, and restart ownership |
| Resource admission | Current local guards | Adapt | Scoped allocation and evidence |
| Workflow orchestration | External workflow engines | Avoid/assess | Must not replace agent/session owners |

## Cross-Lane Dependencies

- Depends on identity, configuration, context, models, tools, and protocols.
- Serves conversational and scheduled experiences.
- Must not become a universal workflow engine.
