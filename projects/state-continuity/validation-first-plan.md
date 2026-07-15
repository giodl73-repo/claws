# Runtime State Continuity Validation-First Plan

## Purpose

Start falsifying RFC 0021 against current OpenClaw and Lobster behavior before
Hosted Integration wiring lands. This track produces evidence for PRs 1 and 2;
it does not require a long-lived prerequisite branch or authorize product
implementation.

## Lane 1: Complete the state-surface inventory

Use current OpenClaw `main` to enumerate:

- global and per-agent SQLite databases;
- sessions, transcripts, and configuration;
- workspace and plugin-owned state;
- pairing and runtime-owned identity;
- caches, indexes, and reconstructable state; and
- host-injected credentials and external dependencies.

For each surface record owner, treatment, native online capture, closed-state
capture, compatibility identity, restore order, redaction, and CAPE
requirement.

**Gate:** no required surface is unclassified and no host-managed credential is
classified as captured.

## Lane 2: Prove current shutdown ordering

Trace and exercise existing Gateway, Channel, service, store, hook, adapter, and
sidecar shutdown behavior.

Inject:

- active root work;
- Channel delivery in flight;
- workspace write in flight;
- hook timeout or warning;
- sidecar write or disconnect; and
- process termination during teardown.

**Gate:** identify which outcomes permit a conventional clean shutdown, which
warnings invalidate final handoff, and which writable owners require an outer
drain or fence.

## Lane 3: Exercise a local recovery round trip

Using existing backup/snapshot primitives and disposable state:

1. create representative state across every captured core surface;
2. perform native online captures without a runtime-wide pause;
3. assemble a paper or test manifest with exact digests;
4. materialize into a clean destination;
5. restore in declared order;
6. reconstruct excluded generated state; and
7. compare user-visible sessions, config, workspace, plugin state, and identity.

**Gate:** every required surface is restored or reconstructed with explicit
provenance. Failure of one surface cannot be reported as a complete recovery
point.

## Lane 4: Establish capture budgets

Measure current snapshot/backup behavior over representative small, medium, and
large state sets:

- elapsed time;
- event-loop delay and user-visible latency;
- peak RSS;
- temporary disk;
- read/write I/O;
- cancellation latency; and
- concurrent-request behavior.

**Gate:** propose bounded concurrency, timeout, memory, disk, I/O, and
missed-RPO thresholds from measurements rather than guesses.

## Lane 5: Build the failure fixture matrix

Exercise or model:

- exact publication replay and digest conflict;
- timeout before and after acceptance;
- corrupt, missing, truncated, or oversized artifact;
- path traversal, unsafe link, duplicate target, and overwrite attempt;
- missing dependency or credential capability;
- incompatible runtime, schema, plugin, or identity;
- fallback to an older compatible point; and
- exhausted fallback lineage.

**Gate:** each case has one stable failure classification, operator action, and
readiness posture.

## Lane 6: Validate Lobster assumptions without new continuity wiring

Prove current behavior for:

- durable Teams retention while no container exists;
- one-container warmup and readiness-gated delivery;
- ingress deduplication and generation fencing;
- external cron wake scheduling;
- host/API request retention;
- credential injection and re-issuance; and
- cold-start phase timing from provisioning through user-visible readiness.

**Gate:** classify each wake source as already conforming, requiring bounded
adaptation, or blocking Elastic. Do not generalize beyond Teams, host/API, and
cron evidence.

## Lane 7: Baseline migration and deletion

Inventory every Lobster path discovery, copy/upload wrapper, restore-ordering
step, lifecycle frame, compatibility flag, and test that RFC 0021 could
replace.

**Gate:** every proposed deletion maps to a proven OpenClaw contract and has a
shadow-comparison, rollback, minimum-version, and expiry condition.

## Execution order

```text
inventory + shutdown trace
  -> local round trip + failure fixtures
  -> measured capture budgets
  -> Lobster wake/cold-start proof
  -> migration and deletion baseline
```

Lanes 1, 2, 4, 6, and 7 can run in parallel. Lane 3 depends on the first
inventory cut. Lane 5 grows alongside the round trip.

## Decision output

Each lane must update one of:

- RFC invariant remains supported;
- implementation hypothesis changes;
- CAPE requirement changes;
- initial Lobster scope narrows; or
- RFC 0021 is falsified for the affected surface.

Validation is useful only when it can change the design.
