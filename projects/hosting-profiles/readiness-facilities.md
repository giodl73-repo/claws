# Readiness Facilities Program

## Thesis

RFC 0018 creates a canonical readiness result: bounded conditions attached to
subjects with explicit lifetimes. The next work should turn that result into
operator facilities, not introduce another framework.

The deletion target is the collection of private polling scripts, ad hoc JSON
diffs, profile-specific validation scripts, and support instructions that each
host otherwise builds around `/ready`.

## Ownership

| Track | Contract owner | First facilities |
| --- | --- | --- |
| Runtime operations | RFC 0018 | transition watch, condition inspection, startup wait, explanations |
| Profile conformance | RFC 0023 | profile list/inspect/validate, conformance report, packaged release gate |
| Diagnostics and operations | Existing Doctor, telemetry, and update surfaces | remediation, support bundle capture, transition telemetry, upgrade comparison |

Readiness remains observational. These facilities may inspect, wait, explain,
or package evidence; they must not mutate runtime configuration or silently
repair the deployment.

## Delivery Sequence

### 1. Observe transitions

- Add `openclaw ready --watch` as an explicit long-running mode.
- Poll sequentially with a timeout per evaluation and no overlapping calls.
- Emit the initial snapshot, then only semantic changes.
- Compare conditions by `(subjectRef, type)` and subjects by `ref`.
- Report subject replacement when `id`, `generation`, `kind`, or `parentRef`
  changes; ignore `evaluatedAtMs` churn.
- Continue through not-ready and temporarily unavailable results so recovery is
  observable. One-shot `openclaw ready` keeps its current exit behavior.
- Use versioned JSON Lines events for machine consumers.

This is a follow-up to the RFC 0018 implementation. It does not require or
modify a hosting profile.

### 2. Inspect and wait

- Add read-only condition/provider list and inspect commands once provider
  metadata is enumerable.
- Add a bounded `gateway start --wait-ready` convenience over the same result;
  do not create a second startup-health evaluator.
- Add concise reason and subject-lifetime explanations to human output.

### 3. Validate profiles

- Add `hosting profile list` and `hosting profile inspect` over built-in profile
  definitions.
- Add `hosting profile validate` against effective configuration and the live
  canonical readiness result.
- Produce one conformance artifact suitable for Docker, Kubernetes, OCC,
  Lobster, CI, and release qualification.
- Gate each built-in profile in package-installed release tests.

These are RFC 0023 facilities. They consume RFC 0018 but do not expand its core
contract.

### 4. Diagnose and operate

- Map stable readiness reasons to Doctor findings and explicit remediation.
- Capture canonical readiness snapshots and recent transitions in support
  bundles with secret-safe bounds.
- Emit transition telemetry keyed by subject identity and lifetime.
- Compare required conditions and profile conformance before and after an
  upgrade.

These integrations should extend their existing owner surfaces. Readiness is
the evidence spine, not a replacement for Doctor, telemetry, or update logic.

## First Slice Acceptance

The transition-watch PR is complete when tests prove:

- one-shot output and exit codes are unchanged;
- polling is sequential and bounded by the existing per-call timeout;
- unchanged evaluations do not emit transitions;
- required/advisory status changes are emitted;
- subject replacement and generation changes are emitted;
- Gateway unavailability and recovery are both observable;
- cancellation stops polling and releases signal listeners;
- JSON output is one complete, versioned event per line.

## Published First Slice

Fork [PR 167](https://github.com/giodl73-repo/openclaw/pull/167) implements the
transition-watch slice at head `94de0cf33f5b`, based directly on RFC 0018
implementation head `6dce3555a511`.

It adds semantic result diffing and `openclaw ready --watch`, including
producer changes, subject replacement, condition changes, unavailable/recovery
transitions, JSON Lines, sequential bounded polling, active-call cancellation,
and signal-listener cleanup. One-shot behavior is unchanged.

Validation covers 52 focused assertions, type-aware lint, formatting, and diff
checks. The final Codex review is clean after fixing two human-output defects:
availability loss now includes the Gateway error, and recovery now includes the
full canonical result so recovered-but-degraded cannot look healthy.

The local lockfile install was blocked by the configured Microsoft package
proxy returning `404` for `@agentclientprotocol/sdk@1.3.0`. Existing dependency
caches ran the transition and CLI suites directly; the ready-command suite used
a test-only alias to the matching checked-out `@openclaw/fs-safe/durability`
build. No dependency or alias change is present in the PR.

## Deferred

- Streaming readiness over a new Gateway protocol. Polling is sufficient for
  the first facility and preserves the existing contract.
- Automatic fixes. Doctor may recommend or explicitly apply repairs later.
- Arbitrary operator-defined hosting profiles. RFC 0023 first establishes the
  release-tested standard profile support promise.
- A new telemetry or support-bundle subsystem.
