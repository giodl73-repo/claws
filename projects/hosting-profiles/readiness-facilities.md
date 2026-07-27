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

- Add read-only condition/provider list and inspect commands over one active
  config/plugin-registry snapshot. Enumeration never invokes providers.
- Add `openclaw ready --wait [duration]` as the host-agnostic bounded startup
  gate over the canonical result. Docker, Kubernetes, systemd, OCC, and other
  launchers can invoke it after startup without owning another evaluator.
- A future `gateway start --wait-ready` shorthand may delegate to this command;
  it must not define another deadline or readiness model.
- Add concise reason and subject-lifetime explanations to human output.

### 3. Validate profiles

- Add `hosting profiles list` and `hosting profiles inspect` over built-in profile
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
transition-watch slice at head `3d59eebb8ea2`, based directly on RFC 0018
implementation head `6dce3555a511`.

It adds semantic result diffing and `openclaw ready --watch`, including
producer changes, subject replacement, condition changes, unavailable/recovery
transitions, JSON Lines, sequential bounded polling, active-call cancellation,
and signal-listener cleanup. One-shot behavior is unchanged.

Validation covers 52 focused assertions, type-aware lint, formatting, and diff
checks. The final Codex review is clean after fixing two human-output defects:
availability loss now includes the Gateway error, and recovery now includes the
full canonical result so recovered-but-degraded cannot look healthy.

Exact-head focused Gateway/RPC tests and package-installed Docker transition
proof pass in
[run 30224900928](https://github.com/giodl73-repo/openclaw/actions/runs/30224900928).

The local lockfile install was blocked by the configured Microsoft package
proxy returning `404` for `@agentclientprotocol/sdk@1.3.0`. Existing dependency
caches ran the transition and CLI suites directly; the ready-command suite used
a test-only alias to the matching checked-out `@openclaw/fs-safe/durability`
build. No dependency or alias change is present in the PR.

## Published Second Slice

Fork [PR 169](https://github.com/giodl73-repo/openclaw/pull/169) implements the
criterion-catalog slice on top of PR 167. The `readiness.catalog` RPC and
`openclaw ready criteria list|inspect` expose core/plugin ownership, current
selection, and selected-but-missing IDs from one activation-pinned snapshot.
The catalog is usable without a Hosting Profile and never runs a readiness
evaluation or provider callback.

The implementation adds 78 focused local assertions. The clean GitHub lane runs
82 assertions, including an authenticated RPC against a real started Gateway,
and passes formatting and type-aware lint in
[run 30227102643](https://github.com/giodl73-repo/openclaw/actions/runs/30227102643)
at exact implementation head `e0a826996730`. That proof found and fixed the
initial missing lazy-handler route before publication.

## Published Third Slice

Fork [PR 171](https://github.com/giodl73-repo/openclaw/pull/171) implements the
bounded startup-wait slice on top of PR 169 at exact implementation head
`5201c5558cd7`. `openclaw ready --wait [duration]` repeatedly invokes the
canonical `ready` RPC until it succeeds or the total startup budget expires.

Attempts are sequential and non-overlapping. The outer deadline covers local
config, credential, TLS, connection, and RPC setup as well as the request
itself; each request timeout is capped by the remaining total budget. The
command emits only the final observation, preserves canonical result JSON when
one was observed, and returns structured `GatewayReadinessTimeout` output when
the Gateway was never reachable. `--watch` and `--wait` are mutually exclusive.

Formatting, 59 focused assertions, and type-aware lint pass against the
immutable implementation parent in
[run 30246240331](https://github.com/giodl73-repo/openclaw/actions/runs/30246240331).
The final Codex review is clean after adding the independent deadline that
prevents pre-request setup from stalling the host startup gate.

## Published Fourth Slice

Fork [PR 172](https://github.com/giodl73-repo/openclaw/pull/172) completes the
human diagnostic projection on top of PR 171 at exact implementation head
`3010730e9f6a`. When a condition is `False` or `Unknown`, `openclaw ready`
reports the existing kind, lifetime ID, generation, and parent reference for
its primary and related subjects.

This is derived entirely from the canonical identity package. It adds no
evaluator, RPC, config, or JSON schema; healthy human output and machine output
remain unchanged. Formatting, 61 focused assertions, and type-aware lint pass
against the immutable implementation parent in
[run 30268030672](https://github.com/giodl73-repo/openclaw/actions/runs/30268030672).
The final Codex review reports no actionable findings.

## Published RFC 0023 Catalog Slice

Fork [PR 173](https://github.com/giodl73-repo/openclaw/pull/173) implements the
first profile facility directly on profile implementation head `e9c1988c5e59`.
At exact head `99449434cb4c`, `openclaw hosting profiles list|inspect` exposes
immutable standard-profile descriptors with human output and versioned JSON.

The descriptor contains profile-owned conditions plus required and advisory
RFC 0018 criteria. A test compares those condition names with the runtime
condition builder, preventing the release/support catalog from drifting from
evaluation. Inspection stays local and inert; active selection and runtime
truth remain canonical Gateway readiness data.

[Run 30273004269](https://github.com/giodl73-repo/openclaw/actions/runs/30273004269)
passes immutable-parent verification, formatting, 35 focused assertions,
type-aware lint, and core type checking. The final Codex review reports no
actionable findings.

## Published RFC 0023 Validation Slice

Fork [PR 174](https://github.com/giodl73-repo/openclaw/pull/174) implements live
profile validation on top of catalog PR 173. At exact head `84227d246d00`,
`openclaw hosting profiles validate [profile]` calls canonical readiness once
and verifies exact active identity, readiness and profile contract versions,
and one required row for every profile-owned condition.

The versioned JSON artifact reports structural `conformant` separately from
serving `ready` and embeds the source readiness result. Both false states exit
nonzero. Gateway errors, malformed results, profile mismatches, and missing,
duplicate, or non-required profile conditions fail closed without invoking a
second evaluator.

[Run 30275850209](https://github.com/giodl73-repo/openclaw/actions/runs/30275850209)
passes immutable-parent verification, formatting, 51 focused assertions,
type-aware lint, and core type checking. Codex review prompted three accepted
resilience fixes and the final review reports no actionable correctness defects.

## Deferred

- Streaming readiness over a new Gateway protocol. Polling is sufficient for
  the first facility and preserves the existing contract.
- Automatic fixes. Doctor may recommend or explicitly apply repairs later.
- Arbitrary operator-defined hosting profiles. RFC 0023 first establishes the
  release-tested standard profile support promise.
- A new telemetry or support-bundle subsystem.
