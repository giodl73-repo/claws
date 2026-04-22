# ApprovalSink Conformance Suite

CL-11 §3a executable contract. A sink implementation is conformant iff
`defineApprovalSinkConformance(label, factory, options)` passes under
`vitest run --project integration`.

## Usage

```ts
import { defineApprovalSinkConformance } from '#harness/approval-sink-conformance/suite';
import { MySink } from '../src/my-sink.js';

defineApprovalSinkConformance(
  'MySink',
  () => new MySink(),
  {
    // Sinks that don't persist (in-memory) opt out of durability:
    skipDurability: true,

    // Per-sink backing-store mutation helper (obligation 4):
    tamperHook: async (sink) => {
      // Mutate sink's storage however it's exposed.
    },
  },
);
```

## Six obligations

1. **Round-trip** — `writeDecision` then `query` returns the same entry.
2. **Ordering** — three writes in order produce reads in the same order, with monotonic sequence.
3. **Cross-link** — decision + approval sharing a `correlationId` read back as a coherent pair, with `prevHash` thread.
4. **Tamper detection** — mutation of the backing store (via `tamperHook`) is non-silent. Skipped if no `tamperHook` is provided.
5. **Concurrent emit** — `Promise.all([writeDecision, writeDecision])` produces two entries with no loss and distinct sequence numbers.
6. **Durability** — after `flush()` + optional `close()`, a new sink instance from the same factory reads back the same entries. Skipped if `skipDurability: true`.

## Adapter ID scoping

Each obligation uses a unique `adapterId` (e.g. `${label}-o1`, `${label}-o2`) so
sinks that share a backing store (durable JSONL, HTTP-backed) do not leak
cross-obligation state. The suite queries by `correlationId` (or `adapterId`
for the ordering obligation) to scope reads to just the obligation's writes.

## CP-7 consumers

Pulses 63–66 (`AetherToolApprovalSink`, `LobsterSupervisorHttpSink`,
`OpenClawStdinSink`, `ClawsServiceJsonlSink`) each wrap their constructor with
`defineApprovalSinkConformance`. A shipping sink that silently skips the
suite is a contract violation.
