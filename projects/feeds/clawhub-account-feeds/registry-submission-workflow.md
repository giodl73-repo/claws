# Registry Submission Workflow

## Goal

Define the ClawHub workflow for submitting publisher entries to downstream
registry review and scanning without treating submission as approval.

## Product Behavior

- Eligible publisher entries can be queued for downstream registry review.
- Submission is idempotent by entry, feed revision, and destination registry.
- Failed submissions can be retried.
- Submitted entries can be withdrawn or resubmitted when source facts change.
- Operators can inspect submission state and failure reasons.
- Authors can see actionable failure reasons when the fix belongs to them.

## Workflow States

Suggested states:

- `not_eligible`
- `eligible`
- `queued`
- `submitted`
- `withdrawn`
- `rejected`
- `accepted`

## Submission Facts

Suggested facts:

- Submission id.
- Destination registry id.
- ClawHub feed id and revision.
- Account id and publisher id.
- Entry id, package source, version, artifact digest, and provenance.
- Actor or automation id.
- Created, submitted, retried, withdrawn, and completed timestamps.
- Last failure category and retry count.
- Idempotency key and source evidence references.

## Boundaries

- Submission is not approval.
- Registry acceptance is not the same as ClawHub official state.
- Registry review and scan decisions should be reflected back as separate facts.
- Submission automation must not bypass source-profile trust, feed verification,
  package integrity, scan, or local policy gates.

## Acceptance Criteria

- Ordinary publishing does not require registry submission.
- Eligibility is derived from explicit ClawHub facts.
- Queue operations are idempotent and retryable.
- Submission failures have actionable reasons when authors can fix them.
- State transitions record actor, reason, prior state, and new state.

## Open Questions

- Which destination registry receives the first submission workflow?
- Is submission operator-driven, author-driven, automatic, or mixed?
- What evidence is required before an entry becomes eligible?
- Who can withdraw or resubmit an entry?
- Which failures are author-actionable versus operator-only?
