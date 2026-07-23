# Slice 5: subagent terminal telemetry

## Candidate

- Evidence: [openclaw/openclaw#101867](https://github.com/openclaw/openclaw/issues/101867)
- Fork PR: [giodl73-repo/openclaw#149](https://github.com/giodl73-repo/openclaw/pull/149)
- Revision: `a614815a4ce`
- Owner: subagent lifecycle
- Projection owner: diagnostics-otel

## Authoritative boundary

The subagent registry already owns a durable, exactly-once `subagent_ended`
hook with target kind, run identity, terminal timestamp, bounded outcome, and
stable lifecycle reason.

The slice registers diagnostics-otel on that existing hook. While the exporter
service is active, it projects one `openclaw.subagent.ended` counter observation
and one terminal span. It does not emit a second diagnostic lifecycle event or
reuse `run.completed`.

## Conformance evidence

- Accepted: normal completion and killed termination retain their owner outcome
  and reason in both telemetry projections.
- Other lifecycle owners: reset and delete remain distinct rather than
  collapsing to unknown.
- Unknown: unrecognized outcome, reason, or target kind becomes `unknown`.
- Exactly once: the registry's persisted `endedHookEmittedAt` and in-flight
  guard remain authoritative; the exporter performs one projection per hook.
- Activation: hooks before service start or after service stop produce no
  telemetry.
- Privacy: target session keys, run IDs, account IDs, task text, and raw errors
  are not exported; metric labels contain only bounded values.
- Correlation: the hook carries no authoritative trace context, so the
  terminal span remains a root rather than fabricating a parent.
- Compatibility: the existing hook and zero-argument
  `createDiagnosticsOtelService` contract remain intact.

## Deliberate exclusions

- a new subagent diagnostic event family;
- a duplicate `run.completed` artifact;
- session, task, or error text in telemetry;
- run IDs or session keys in metric labels or span attributes;
- inferred parent spans or requester-run hierarchy; and
- changes to restart, recovery, or lifecycle persistence.

## Deletion target

Operators no longer need missing output, stale timestamps, or silence to detect
terminal subagent outcomes when diagnostics-otel is enabled.

## Proof

- 113 diagnostics-otel service tests.
- 13 plugin boundary contract tests.
- 16 subagent registry completion test executions.
- Plugin SDK API baseline check.
- Formal Codex review: three findings fixed; final pass clean.
- The dedicated runtime-API guard test was updated but could not collect
  locally because the available dependency install lacks authenticated access
  to `@earendil-works/pi-tui`, leaving `@openclaw/fs-safe/config` unlinked.
