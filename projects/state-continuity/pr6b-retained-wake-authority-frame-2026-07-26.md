# PR 6B retained wake authority: frame and source audit

## Frame

**Thesis:** Lobster can make absent-compute wake lossless without a new
OpenClaw API by adding one payload-free, permanent activation journal around
the owner systems that already work: the native Teams durable inbox, the cron
wake projection/scheduler, final-handoff lifecycle CAS, and Peter's shared
managed Gateway start path.

The coordinator accepts only identities already retained by their semantic
owner. It selects accepted recovery authority internally, atomically revokes
the existing destruction/sleep authority, grants one destination generation,
and makes concurrent Teams, API, cron, and operator causes join that same
idempotent provisioning operation. Payloads, acknowledgement, alarms,
placement, delivery, and retry policy remain with their current owners.

**Deletion target:** delete independent source-specific cold-start races and
the need to infer wake success from a transient queue hint or one caller's
request lifetime. Do not delete the native inbox, Redis cron mirror, managed
start path, or owner delivery state machines.

**V1 non-goals:** no generic OpenClaw wake API, no payload or credential in the
lifecycle journal, no cron expression parsing, no caller-selected recovery
point/readiness/generation, no new container process, and no delivery or
acknowledgement completion in PR 6B.

**Disproof:** reject this slice if current Lobster cannot supply an authoritative
accepted-recovery lookup without trusting wake callers, if one generation
cannot be made idempotent through the shared managed start path, or if cause
validation requires copying payloads into central lifecycle state.

## Current-source audit

- `NativeTeamsInboxRepo::enqueue_with_wake` persists the activity before it
  publishes a bounded Redis wake hint. The hint is advisory; periodic durable
  inbox reconciliation remains the recovery path.
- `native_inbox_wake` already CAS-claims one owner/sequence warm operation,
  renews it while `EnsureContainerReady` runs, and lets the delivery consumer
  consume the completed warm result.
- `DialerEnsureContainerReady` delegates to the existing
  `PlexColdStartDialer`, which uses the shared managed Gateway start path and
  its operator-owned resolve/start retry budgets.
- `SchedulerService::tick_once` durably claims due Redis mirror entries,
  dispatches through managed `gateway_start`, classifies proxy-pipe readiness,
  and requeues unknown/not-ready results.
- PRs 39-45 add permanent cron authority, cancellable projection, trusted
  loopback wiring, private Blob provisioning, default-off per-user activation,
  pooled reset, and already-due tracked retry/sleep veto.
- `FinalHandoffJournal::revoke_destruction` already races retained work against
  generation-scoped destruction in the same permanent Blob CAS state.

The missing seam is therefore not another inbox, scheduler, or provisioner. It
is a permanent payload-free activation operation that validates owner-retained
cause IDs, obtains recovery authority from a trusted host lookup, invokes the
existing revocation race, and grants exactly one destination generation for
all concurrent causes.

## Internal analogue classification

| Existing mechanism | Classification | Use in PR 6B |
| --- | --- | --- |
| Native inbox enqueue + wake hint | Reuse | Teams retains payload and acknowledgement; expose only retained activity identity. |
| Native warm claim | Adapt | Preserve fast source-local coalescing, but join the permanent cross-source generation. |
| Cron scheduler in-flight lease | Reuse | Cron owns alarm claim/requeue; pass only the accepted projection/deadline cause identity. |
| Final-handoff lifecycle CAS | Reuse | Retained cause revokes destruction atomically; never create a parallel sleep authority. |
| Shared managed Gateway start | Reuse | Provision the coordinator-granted generation idempotently. |
| Deprecated RFC 0021 `continuity_elastic` | Avoid as code; adapt invariants | Keep cause validation, one granted generation, unknown-as-pending, and exact readiness binding; discard its parallel Plex hold model and broad 1,300+ LOC surface. |

## Role findings

- **Lobster container owner:** no new sidecar or boot path. Provisioning must use
  the shared managed start seam, remain retryable, and expose pending rather
  than guessing readiness.
- **Gateway owner:** the coordinator is host-side and payload-free. It adds no
  Gateway hook or per-message synchronous work inside OpenClaw.
- **Security/skeptic:** cause IDs must be bounded and validated by the owner;
  callers cannot submit payloads, credentials, recovery points, destination
  generations, or readiness. Unknown permanent or provisioning outcomes retain
  causes and fail closed.

## Smallest evidence slice

1. A closed `TeamsInbox | ApiInbox | CronDeadline | Operator` cause vocabulary.
2. An injected semantic-owner validator and trusted accepted-recovery lookup.
3. A permanent Blob ETag-CAS activation journal containing only identities,
   one recovery point, one destination generation, and pending/ready evidence.
4. An idempotent provisioner seam using the coordinator-granted generation.
5. Tests for a Teams cause racing destruction, a deadline with no resident
   process, concurrent causes joining one generation, and unknown provisioning
   retaining every cause for replay.

Production owner adapters and readiness-gated delivery remain separately
reviewable wiring, and may become PR 6B follow-ups or PR 6C depending on the
size of the resulting diff.
