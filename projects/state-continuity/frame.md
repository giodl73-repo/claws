# Runtime State Continuity Frame

## Thesis

OpenClaw can support recovery portability and scale from zero without changing
how live state is stored:

```text
existing state owners and clean shutdown
  -> online or final closed-state checkpoint
  -> exact host publication receipt
  -> restored startup on fresh compute
  -> optional hibernate and wake
```

Hosted Integration supplies bundle registration, typed owner references,
binding activation, Hosting Profiles readiness, Status, Doctor, generations,
and carriers. Continuity adds only checkpoint, publication, restore, handoff,
hibernate, and wake semantics.

This thesis is false if fresh-compute restore requires changing canonical store
formats or write acknowledgement, a global consistency protocol, a generic host
bus, or credential backup.

## Problem And Users

OpenClaw persists state across independent SQLite and file-backed owners, but
does not expose one recovery point that a host can publish, retrieve, validate,
and restore on fresh compute. Hosts therefore cannot safely automate
replacement or remove all compute while retaining message and cron behavior.

Affected users are self-hosters who want backup, managed hosts that replace
compute, and fleet operators who want idle scale-to-zero.

## Current Workaround And Cost

Lobster currently:

- rehydrates and checkpoints the workspace through git;
- reconstructs host-managed credentials at startup and request time;
- mirrors the earliest cron wake;
- retains Teams ingress in a durable host inbox;
- carries a passport hint; and
- emits a private `shutdown_ready` signal before final workspace publication.

The result is partial recovery, duplicated restore ordering, private lifecycle
semantics, stale-state wake failures, and no exact recovery-point receipt.

## V1 Invariants

- Existing stores, schemas, writers, transactions, and acknowledgement
  semantics remain unchanged.
- Recurring checkpoints use each component's native online capture semantics;
  there is no runtime-wide pause or global mutation generation.
- Planned handoff closes admission, drains work, completes clean shutdown, then
  captures closed persisted state.
- Host publication accepts an exact immutable manifest and returns a receipt
  bound to runtime, generation, checkpoint, digest, durability, and wake intent.
- Restored startup on fresh compute remains unready until artifacts,
  compatibility, dependency closure, identity, and scheduler state validate.
- Host-managed credentials are re-issued or re-resolved, never checkpointed.
- Elastic ingress remains with its Channel/API owner and is delivered only
  after readiness to the current generation.

## Operator Model

CAPE is one operator-facing guarantee setting, not the implementation
architecture:

```text
Conventional -> existing startup and clean shutdown
Archived     -> checkpoint, publication, and explicit restore
Portable     -> final handoff and restored startup on fresh compute
Elastic      -> hibernate, wake, and retained ingress
```

The RFC specifies the underlying features independently and projects their
conformance into CAPE.

## V1 Boundaries

- RFC 0020 Hosted Integration is an implementation prerequisite.
- V1 inventories core-owned state surfaces; third-party capture contribution
  registration is deferred until a concrete plugin proves the seam.
- Continuity owns the publication interface semantics; Hosted Integration owns
  registration, binding, readiness, status, Doctor, and carriers.
- Lobster Elastic scope begins with durable Teams, host/API requests, and cron.
- Sleep that retains the same process or compute is host-specific and outside
  recovery portability.
- No `/synced`, global dirty bit, distributed transaction, canonical remote
  store, credential export API, generic ingress method, or generic host bus.

## Deletion Target

After conformance and mixed-version migration proof, delete Lobster's private
`shutdown_ready` inference, inert `checkpoint_unmount` scaffold, duplicated
path-copy and restore ordering, stale cron restore paths, and equivalent
private lifecycle coordination.

## Disproof Evidence

- A required state surface cannot be captured or reconstructed without changing
  its live storage contract.
- The same recovery point cannot restore on fresh compute with host-managed
  credentials re-issued through existing owner bindings.
- Hosted Integration cannot express a specific continuity publication or
  dependency binding without a second composition framework.
- An Elastic ingress cannot retain and redeliver work across absent compute.
- Planned handoff cannot distinguish successful clean shutdown and exact
  publication from warning-only best effort.
