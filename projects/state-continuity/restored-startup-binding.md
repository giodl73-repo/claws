# Restored Startup Binding

## Frame

### Falsifiable thesis

Elastic restored startup can remain one existing Gateway start operation if
Lobster supplies exact immutable restore evidence through an adapter-owned
private startup descriptor and OpenClaw:

1. installs restored admission closed before accepting clients;
2. completes scheduler reconciliation and required readiness during startup;
3. durably authors `continuity-restore-complete/v1`;
4. consumes that exact record to open admission; and
5. emits the authored result before the existing `[gateway] ready` marker.

This is false if OpenClaw cannot evaluate scheduler, owner, and generic Gateway
readiness before the ready marker without accepting client work, or if the
adapter cannot return the exact OpenClaw-authored result without a second
resolve, allocation, process, or public endpoint.

### Boundary

V1 adds no fourth Elastic host method, post-start polling API, host-side
readiness synthesis, public Gateway method, sidecar, or new operator setting.
Ordinary startup remains byte-for-byte absent from the restored descriptor
path.

### Deletion target

Delete the need for:

- a Lobster-authored `readinessGeneration`;
- a second post-start completion command;
- a host polling loop that infers readiness from process health;
- a separate continuity sidecar or public Gateway endpoint.

## Audit

### Source-backed facts

- OpenClaw PR 124's `completeContinuityRestore` already owns static evidence
  validation, scheduler reconciliation, required owner readiness, generic
  Gateway readiness, durable canonical publication, replay, and typed
  disposition.
- Its success intentionally returns `admissionOpen: false`; the exact record
  must still pass `openRestoredAdmission`.
- The Gateway readiness checker already supports startup-pending reasons and
  returns not-ready while another startup component is pending.
- The Gateway child already has one service-authored readiness protocol:
  Lobster waits for the exact stdout tail `[gateway] ready`.
- Lobster's adapter already retains an exact `ContinuityStartAdmission`, binds
  restored start to the current adapter boot and committed receipt, and fences
  ordinary Gateway start.
- Lobster PR 21 now supplies preparation obligations and performs preparation
  plus E4d restore under one durable hold, strict allocation, and exact route.
- Generic `extra_env` is the wrong authority carrier: it is a broad runtime
  configuration surface, mutates adapter process environment, and has
  cross-start cleanup semantics unrelated to continuity evidence.

### Ordering constraint

Using the ordinary readiness checker unchanged from inside continuity
completion would be circular if continuity itself is represented as
`startupPending`. V1 must distinguish:

- **base Gateway readiness**: all existing startup dependencies and runtime
  health except the continuity admission gate; and
- **external admission readiness**: base readiness plus successful exact
  continuity-record consumption.

## Compare

### Internal analogues

| Analogue | Decision | Reason |
| --- | --- | --- |
| Existing `[gateway] ready` child protocol | Adapt | It is already the adapter's authoritative service-authored startup edge. |
| Gateway startup-pending/readiness state | Reuse | It already prevents readiness while initialization is incomplete; continuity must avoid self-dependency. |
| Health/readiness provider registries | Reuse | Owner readiness should be resolved through native owner registrations, not a continuity-specific provider bus. |
| Typed `GatewayStartBody` | Adapt | Add one restored-only typed descriptor; do not route evidence through generic `extra_env`. |
| E4d adapter execution-incarnation binding | Reuse | The startup descriptor and result must remain bound to the same adapter boot and exact route. |
| New post-start CLI or HTTP endpoint | Avoid | It creates a second race window after the process is already reachable. |

### External comparators

- Kubernetes startup probes suppress ordinary readiness/liveness progression
  until startup succeeds, and readiness controls traffic rather than merely
  proving that a process exists. The useful precedent is ordering, not a new
  probe API.
- `sd_notify(READY=1)` makes readiness service-authored and sends it only after
  startup is finished. The useful precedent is that the host consumes the
  service's ready assertion instead of reconstructing internal readiness.

The OpenClaw design is stricter than either comparator because the ready edge is
also bound to an immutable recovery point, restore receipt, preparation
identity, and canonical readiness generation.

## Evaluate

### Gateway owner

- Blocking: do not run continuity completion as a post-ready hook.
- Required simplification: startup-only work must add no steady-state message
  or tool-call latency.
- Required proof: ordinary startup emits the same marker and does not allocate,
  read, or parse a continuity descriptor.

### Lobster container owner

- Blocking: no second process or sidecar.
- Required simplification: one `/openclaw-gateway/start` request remains the
  whole container activation operation.
- Required proof: the restored completion budget fits inside the existing
  startup envelope. V1 should bound local completion to 30 seconds and fail
  with a typed hold rather than stretching Gateway start to the 15-minute
  preparation budget.

### Security owner

- Blocking: descriptor and result must be private, bounded, strict, and contain
  identities/evidence only, never restored credential bytes.
- Required proof: malformed, stale-boot, cross-owner, noncanonical, and
  conflicting replay inputs fail closed before admission opens.

### Skeptical maintainer

- Blocking: do not parse an arbitrary log substring as authority.
- Required shape: one exact versioned structured stdout line with a size bound,
  followed by the unchanged ready marker only after exact admission opens.
- Required proof: duplicate, missing, malformed, oversized, out-of-order, and
  post-ready result lines are rejected.

## Revised V1 Contract

### Private input carrier

`GatewayStartBody` gains one optional restored-only descriptor. The adapter
strictly validates it, writes it atomically to an adapter-owned `0600` file,
and passes only that file path through a dedicated child-only environment
variable. The path is not caller-selected and is not part of generic
`extra_env`.

The descriptor contains the existing
`ContinuityRestoreCompleteEvidence` fields plus the adapter-owned journal root.
It is retained for same-adapter health-recovery respawns so OpenClaw can replay
the durable winner. Ordinary starts omit the descriptor and child variable.

### OpenClaw startup sequence

```text
parse restored descriptor before listener admission
  -> install restored admission closed
  -> initialize config, plugins, scheduler, and existing startup services
  -> wait for existing startup-pending work
  -> evaluate base Gateway readiness (excluding only continuity's own gate)
  -> completeContinuityRestore
  -> openRestoredAdmission against the exact durable record
  -> emit exact structured completion result
  -> emit existing [gateway] ready marker
```

On typed failure, OpenClaw emits the exact failure result and exits without the
ready marker. The adapter returns the typed failure; Lobster leaves or
quarantines the durable hold according to the OpenClaw disposition.

### Private result protocol

Use one exact prefix and canonical bounded JSON payload:

```text
[gateway] continuity-restored-startup-result/v1 <canonical outcome JSON>
[gateway] ready
```

The adapter accepts exactly one result before the ready marker, independently
validates the complete record against the dispatched descriptor and committed
restore identities, and returns it in the existing start response. It does not
compute `readinessGeneration`.

## Smallest Evidence Slice

1. Add a restored-start descriptor fixture to OpenClaw Gateway startup tests.
2. Install a closed in-process admission gate before startup work.
3. Adapt native scheduler/readiness dependencies into
   `completeContinuityRestore`.
4. Emit one strict success result followed by the existing ready marker.
5. Prove one typed hold result exits without a ready marker.
6. Prove ordinary startup is unchanged.
7. Add adapter parser tests for malformed, duplicate, oversized, out-of-order,
   and mismatched results.

Do not wire the production `ElasticRuntimeProvisioner` until this slice proves
that the exact OpenClaw-authored record reaches Lobster through the same start
operation.

## Slice Evidence

The first OpenClaw fork slice now proves the callable boundary without claiming
live Gateway integration:

- a dedicated `OPENCLAW_CONTINUITY_RESTORED_STARTUP_FILE` carrier loads one
  absolute, bounded, private, no-follow descriptor;
- the descriptor is strict and delegates nested archive-obligation parsing to
  the existing owner parser;
- restored startup calls `completeContinuityRestore`, consumes the exact durable
  record through `openRestoredAdmission`, and emits one canonical bounded result;
- a typed owner-readiness hold emits a failure result and no ready marker;
- absent restored-startup input performs no descriptor I/O and emits no result;
- focused tests demonstrate the result-before-ready ordering; and
- the full TypeScript project check accepts the slice.

The audit also disproved one implementation hypothesis: PR 124 does not yet
contain native plugin, secret, and auth-profile readiness adapters. The callable
seam therefore keeps scheduler, owner-readiness, and base-Gateway-readiness
dependencies injected. Live `server.impl.ts` wiring remains blocked until those
native adapters and the base-readiness split are selected; the slice does not
invent a continuity-specific readiness registry.

The cheapest next proof is the Lobster parser against this exact result prefix:
accept one matching canonical result before `[gateway] ready`, and reject
missing, duplicate, malformed, oversized, out-of-order, or mismatched evidence.

That proof is now published in Lobster PR 21. The adapter owns a strict
`ContinuityRestoredStartupProtocolTracker` on the real Gateway stdout forwarder.
It:

- requires the result line to start with the exact protocol prefix rather than
  accepting a timestamped or embedded log substring;
- accepts only canonical JSON payloads at or below 64 KiB;
- rejects unknown fields, duplicate results, missing results, late results, and
  a ready marker after typed failure;
- validates every durable completion identity against the dispatched
  expectation; and
- leaves ordinary production startup unarmed and unchanged.

That private input and same-start response slice is now published in Lobster PR
21 at `8c41ea2890`. It:

- carries full exact restore/preparation/publication evidence on the existing
  restored-only `GatewayStartBody` field;
- reduces that input to OpenClaw's strict descriptor shape, excluding
  caller-selected receipt paths and other executor-only fields;
- atomically writes the adapter-owned `0600` descriptor and passes only its
  fixed path to a fresh restored child;
- requires the exact OpenClaw-authored success before `[gateway] ready` and
  before the durable restore hold becomes runnable;
- returns typed hold/quarantine failure without ready, retries
  `retry-same-incarnation` with the exact same request and admission, and
  preserves a winning result across identical request replay; and
- leaves ordinary startup unarmed and clears stale restored state on a genuine
  ordinary start.

The same-start round trip is therefore proven without Lobster synthesizing
readiness. The next smallest slice is selecting native OpenClaw scheduler,
owner-readiness, and base-Gateway-readiness adapters for live `server.impl.ts`
wiring. Production `ElasticRuntimeProvisioner` remains promotion-gated.
