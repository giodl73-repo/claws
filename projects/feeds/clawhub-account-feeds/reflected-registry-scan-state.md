# Reflected Registry And Scan State

## Goal

Persist and display downstream registry, scan, review, inclusion, and local
approval facts in ClawHub without mutating ClawHub official state.

## Product Behavior

- Downstream systems can report review, scan, registry inclusion, and local
  approval states back to ClawHub.
- ClawHub stores current reflected state plus status history.
- Public and operator surfaces display reflected states only when the reporting
  system provided explicit facts.
- Reflected state changes can trigger profile updates and follower
  notifications when appropriate.
- Reflected state imports record freshness and conflict decisions.

## State Categories

Suggested categories:

- Registry review state.
- Security scan state.
- Registry inclusion state.
- Local approval state.
- Rejection, suspension, revocation, or stale evidence state.

## Reflected Facts

Suggested facts:

- Reporting system id.
- Entry id, package id, version, source, and artifact digest.
- State category and value.
- Evidence id or report reference.
- Status history with actor/system, reason, prior state, new state, and time.
- Expiry, freshness, or stale-after timestamp when applicable.
- Import idempotency key.

## Boundaries

- Reflected registry state is not ClawHub official state.
- Reflected scan state is useful evidence, not a blanket scan bypass.
- Local approval is deployment-specific and should not be shown as global
  OpenClaw approval.
- Absence of reflected state should render as unknown or not reported, not as
  approved or denied.
- Conflicting reflected states should not silently become approved.

## Acceptance Criteria

- Reflected statuses help explain review posture without hiding community work.
- Labels distinguish not reported, pending, passed, failed, stale, and withdrawn
  states in plain language.
- State history links back to the reporting system and evidence reference.
- Imports are idempotent and reject stale reports.
- Conflicts are visible enough for operators to resolve.

## Open Questions

- Which reporting systems are authoritative for the first reflected states?
- How should conflicting reports be displayed?
- How long should ClawHub retain reflected status history?
- Should reflected state be included in account-feed JSON immediately or after
  display surfaces prove the labels?
