## Summary

Adds three optional, host-neutral lifecycle sidecars to the completed RFC 0013
SQLite snapshot contract:

- recovery-point component composition;
- portable final handoff; and
- restored admission.

Together they define the application-consistency proof a host needs before it
can safely replace a Gateway generation or remove idle compute. They do not
define a new snapshot implementation, pause API, storage provider, or wake
system.

This PR is stacked on [RFC PR #20](https://github.com/openclaw/rfcs/pull/20).
RFC 0013 and
[openclaw/openclaw#105718](https://github.com/openclaw/openclaw/pull/105718)
remain authoritative for one-database SQLite snapshot creation, verification,
local publication, and fresh-target restore.

## Why This Is Needed

Per-user and event-driven hosts can scale resident compute to zero only if they
can prove all of the following:

1. the retiring Gateway generation closed the complete owner-selected state;
2. the host durably accepted the exact required byte set;
3. source retirement was authorized for that exact generation; and
4. replacement admission remained closed until the same recovery point and
   required owner state were restored.

A verified SQLite snapshot proves none of those aggregate lifecycle facts by
itself. Without a shared contract, hosts must either keep idle Gateways warm or
maintain private shutdown, copying, restore-ordering, and readiness-inference
paths.

The motivating managed-host deployment already has durable ingress and cron
wake machinery. Its production issue cluster includes accepted work outliving
the compute that should process it, cold-start head-of-line blocking, cron wake
racing idle retirement, scheduler continuity failing after replacement, and
cold runtimes appearing ready before the required owner state is restored.
OpenClaw's broader state-ownership risk is also tracked in
[openclaw/openclaw#101290](https://github.com/openclaw/openclaw/issues/101290).
The complete user/operator case, including missed recurring work, competitor
scale-to-zero primitives, and Microsoft Scout's host-side composition, is
tracked in
[openclaw/openclaw#114145](https://github.com/openclaw/openclaw/issues/114145).

## Industry Baseline And OpenClaw's Missing Layer

Infrastructure and sandbox platforms already expose the compute primitives:

| Platform | Primitive |
| --- | --- |
| [Fly Machines](https://fly.io/docs/launch/autostop-autostart/) | Traffic-driven stop-to-zero and autostart |
| [E2B](https://e2b.dev/docs/sandbox/auto-resume) | Persistent pause and automatic resume |
| [Daytona](https://www.daytona.io/docs/en/persistence/) | Persistent stop/start, archive, and VM pause/resume |
| [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/scale-app) | Event-driven scale-to-zero |
| [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) | Hibernation with wakeable WebSocket delivery |

Those systems cannot infer OpenClaw's complete owner inventory, SQLite
invariants, scheduler state, or restored-readiness boundary. This addendum
defines that application-consistent layer. Retained ingress, wake registration,
compute placement, and external durability remain host responsibilities.

## What Changed From The Earlier Continuity Direction

The sidecars compose contracts already shipped on OpenClaw `main`:

- `openclaw backup sqlite` from
  [#105718](https://github.com/openclaw/openclaw/pull/105718); and
- `gateway.suspend.prepare|status|resume` from
  [#103618](https://github.com/openclaw/openclaw/pull/103618), including
  Vincent's validation repair in
  [#103925](https://github.com/openclaw/openclaw/pull/103925).

They replace the earlier broad continuity direction rather than adding another
SQLite capture path, Gateway pause API, provider framework, Lobster transport,
CAPE configuration surface, or Elastic wake mechanism.

The suspension contract remains a cooperative tracked-work fence, not full
process quiescence. The host still owns external ingress fencing, third-party
Channel transports, unregistered work, process supervision, encryption,
retention, placement, and wake.

## Closed Boundaries

- The runtime state owner supplies a canonical required-component inventory;
  missing and extra components fail closed, and the inventory is covered by
  the recovery-point identity.
- Ordinary RFC 0013 snapshots remain `host-protected`. They cannot be called
  credential-free portable without exact owner-authored portability receipts.
- Obligations use a closed kind/owner/treatment vocabulary and contain no
  secret values.
- Host acceptance binds canonical aggregate-manifest bytes plus every exact
  owner-manifest and artifact byte sequence. Packaging and paths remain
  host-owned.
- Restored admission binds the same acceptance-set identity through hold,
  restored-start, and ready evidence.
- Unknown outcomes hold or quarantine. Quarantine has no automatic exit.

## Observable Outcome Of The Complete Composition

- Idle resident compute may reach zero without treating raw live files as a
  recovery point.
- Accepted ingress remains retained until restored admission succeeds.
- Autonomous scheduled work can recover from absent compute without an
  unrelated user message.
- A source generation is never destroyed before exact durable acceptance.
- Replacement readiness identifies the accepted recovery point it restored.

These are system-level acceptance criteria. The three current OpenClaw PRs
prove only the owner-side recovery-point, final-capture, and restored-admission
slices; they do not claim to complete host acceptance, retained ingress, wake,
or destruction.

## One Contract, Two Directions

The lifecycle can be presented as one bidirectional host/runtime contract
without putting host lifecycle authority in OpenClaw. OpenClaw supplies the
running-source suspension methods, offline final-capture and accepted-restore
operations, and the restored-readiness fact. The host supplies durable
acceptance, compute generations, retained wake, placement, and destruction.

```text
SuspensionReady
  -> FinalRecoveryPointResult
  -> HostAcceptanceReceipt
  -> generation-scoped safeToDestroy
  -> retained wake cause
  -> RestoredAdmissionReadyRecord
  -> owner delivery and acknowledgement
```

This is a protocol boundary, not a generic base class or new callback
framework. A host may compose it behind `prepareHibernate`,
`ensureRuntimeReady`, and `inspectLifecycle`, but those remain host operations.
The existing `gateway.suspend.*`, scheduler hooks, recovery operations, and
admission fence are reused.

The RFC now recommends one concrete missing seam:

```ts
gateway.restore.status({ restoreOperationId })
  -> { status: "not-restored" }
   | { status: "held", reason, retryAfterMs, ...restoreIdentities }
   | { status: "ready", ...restoreIdentities, schedulerIdentity,
       ownerReadinessIdentity, readinessIdentity }
```

This follows Peter's `gateway.suspend.status` pattern: closed Gateway Protocol
schemas, `operator.read`, stable operation identity, no mutation, exact replay,
and typed conflict behavior. It projects PR 112896's existing durable ready
record rather than adding another journal or state machine. Offline restore
and quarantine do not become invented live phases. The method remains callable
only through an authenticated pre-admission control path while ordinary work
is held. There is no `gateway.restore.admit`; OpenClaw computes readiness and
opens its own admission.

## Implementation Evidence

- [openclaw/openclaw#112385](https://github.com/openclaw/openclaw/pull/112385)
  composes verified RFC 0013 snapshots into one deterministic host-protected
  recovery point and exact acceptance-byte inventory.
- [openclaw/openclaw#112865](https://github.com/openclaw/openclaw/pull/112865)
  is the final-capture PR stacked on #112385. It binds
  host-supplied closure evidence, creates final owner snapshots, and durably
  replays one committed recovery point.
- [openclaw/openclaw#112896](https://github.com/openclaw/openclaw/pull/112896)
  is the restored-admission PR stacked on #112865. It restores an exact
  accepted recovery point to fresh paths and reuses Gateway work admission to
  remain closed until scheduler reconciliation and required-owner readiness
  produce one durable ready record. It now also implements the proposed
  read-only `gateway.restore.status` projection as representative proof. The
  public Gateway Protocol addition remains an explicit owner-review decision
  before merge or ship.
- Fork-only Lobster drafts
  [#39](https://microsoft.ghe.com/giodl/lobster/pull/39),
  [#41](https://microsoft.ghe.com/giodl/lobster/pull/41),
  [#42](https://microsoft.ghe.com/giodl/lobster/pull/42),
  [#43](https://microsoft.ghe.com/giodl/lobster/pull/43), and
  [#45](https://microsoft.ghe.com/giodl/lobster/pull/45),
  [#46](https://microsoft.ghe.com/giodl/lobster/pull/46),
  [#47](https://microsoft.ghe.com/giodl/lobster/pull/47), and
  [#51](https://microsoft.ghe.com/giodl/lobster/pull/51) (Microsoft access
  required) demonstrate permanent cron projection, cancellation arbitration,
  Peter's shipped hook/proxy-pipe composition, and a default-off private
  Blob/per-user ECS/already-due sleep-veto boundary, followed by one permanent
  payload-free retained-wake authority that coalesces concurrent owner causes
  into an exact destination generation, production-backed metadata-only
  Teams/cron owner validation, and exact-readiness-gated per-cause delivery
  with durable crash replay.

The retained-wake drafts deliberately do not activate a production route or
cohort. Lobster still needs an owner-approved accepted-final-handoff lookup and
canonical mapping from opaque logical runtime identity to the Teams/cron
semantic owners before those call sites can be wired safely.

These PRs and fork drafts are non-normative feasibility and owner-review
evidence. None moves external ingress fencing, clean shutdown, host acceptance,
publication, wake, compute placement, or source destruction into OpenClaw.

If Vincent, Peter, Josh Lehman, or other maintainers prefer a smaller or
different implementation that meets the RFC and issue #114145 outcomes, please
use it. The fork stack is evidence for review, not a requirement to preserve
this exact decomposition.

## Review Request

Please review the ownership split and public status method before the
implementation stack is promoted:

1. RFC 0013 remains the completed SQLite owner primitive.
2. Current-main `gateway.suspend.*` remains the cooperative pause primitive.
3. The state owner, not aggregate composition, supplies the complete selected
   agent inventory.
4. Ordinary snapshots remain host-protected; portability requires owner proof.
5. Acceptance binds a closed logical byte set without standardizing a storage
   container.
6. The host owns ingress fencing, suspension orchestration, clean shutdown,
   wake, and compute lifecycle; final capture only binds supplied closure
   evidence.
