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

## Industry Baseline And OpenClaw's Missing Layer

Infrastructure and sandbox platforms already expose the compute primitives:

| Platform                                                                                                   | Primitive                                           |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Fly Machines](https://fly.io/docs/launch/autostop-autostart/)                                             | Traffic-driven stop-to-zero and autostart           |
| [E2B](https://e2b.dev/docs/sandbox/auto-resume)                                                            | Persistent pause and automatic resume               |
| [Daytona](https://www.daytona.io/docs/en/persistence/)                                                     | Persistent stop/start, archive, and VM pause/resume |
| [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/scale-app)                         | Event-driven scale-to-zero                          |
| [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) | Hibernation with wakeable WebSocket delivery        |

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

These are system-level acceptance criteria. The two current OpenClaw drafts
prove only the owner-side recovery-point and final-capture slices; they do not
claim to complete host acceptance, retained ingress, wake, destruction, or
restored-start integration.

## Implementation Evidence

- [openclaw/openclaw#112385](https://github.com/openclaw/openclaw/pull/112385)
  composes verified RFC 0013 snapshots into one deterministic host-protected
  recovery point and exact acceptance-byte inventory.
- [openclaw/openclaw#112865](https://github.com/openclaw/openclaw/pull/112865)
  is the final-capture draft stacked on #112385. It binds
  host-supplied closure evidence, creates final owner snapshots, and durably
  replays one committed recovery point.

These drafts are non-normative feasibility and owner-review evidence. Neither
moves Gateway suspension, external ingress fencing, clean shutdown, host
acceptance, publication, restored admission, or source destruction into
OpenClaw.

## Review Request

Please review the ownership split before either implementation draft is
promoted:

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
