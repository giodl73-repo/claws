# GRA — Audit chain

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md) · **Absorbs**: CL-11 Amendment, CL-12

## Entry types (10)

| Type               | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `ProducerEntry`    | Records which policy artifact + snapshot is active           |
| `DecisionEntry`    | A `preAuthorize` or `beforeIngest` outcome                   |
| `ApprovalEntry`    | A supervisor/companion response to a `review` decision       |
| `ExecutionEntry`   | The actual tool call or file ingest that executed            |
| `RollbackEntry`    | A snap rollback from one snapshot to a prior one             |
| `TrustReloadEntry` | A trust-set reload (success or failure)                      |
| `TimeoutEntry`     | An approval that expired without a response                  |
| `DrainEntry`       | A snap promote drain window boundary                         |
| `ReplayEntry`      | A detected nonce replay attempt                              |
| `InvalidEntry`     | A chain-integrity violation (synthetic, written by verifier) |

Every entry carries: `sequenceNumber` (per-chain monotonic),
`correlationId` (cross-entry cluster), `policyArtifactSha256` (which
policy was active), `timestamp`, `prevHash`, `hash`.

## Cross-linking schema

The chain is cross-linked through three fields:

1. **`policyArtifactSha256`** — which compiled policy produced the
   decision. Lets a verifier confirm the policy in effect at decision
   time matches the policy the companion signed.
2. **`correlationId`** — groups `DecisionEntry` → `ApprovalEntry` →
   `ExecutionEntry` for one call. Cross-link failures (an approval
   references an absent decision) are `correlation-mismatch` findings.
3. **`sequenceNumber`** — strictly monotonic. Gaps indicate tampering
   (`chain-gap` finding). Duplicates indicate concurrent writers
   (verifier raises `concurrent-writer`).

## ApprovalSink + 4 adapters

`ApprovalSink` is the 3-method interface the companion app implements
to receive review escalations:

```ts
interface ApprovalSink {
  emit(envelope: ApprovalEnvelope): Promise<void>;
  read(handle: string): Promise<ApprovalResponse | null>;
  close(): Promise<void>;
}
```

Four reference adapters live at `packages/openclaw-guardrails/src/approval/`:
`fs-sink`, `http-sink`, `in-memory-sink`, `sse-sink`. All pass the
conformance suite at `test/e2e/harness/sink-conformance.ts`.

## Sequence counter

Per-chain monotonic counter that the writer bumps on every append. The
reader asserts `entries[i].sequenceNumber === entries[i-1].sequenceNumber + 1`
on every pair — any gap is a `chain-gap` finding.

## Nonce scope

Each `ApprovalHandle` carries a nonce (see
[GRH-approval-handle.md](./GRH-approval-handle.md)). The audit chain
MUST reject any `ApprovalEntry` whose handle nonce has already been
consumed. See [../pitfalls/path-and-binding.md § P-05 nonce replay](../pitfalls/path-and-binding.md).

## Corruption detection

The verifier (`verifyChain`) returns findings with 3 granular
`invalidReason` codes:

- `correlation-mismatch` — an entry references a correlationId that
  does not resolve to a producing entry
- `chain-gap` — sequenceNumber discontinuity
- `hash-mismatch` — `entry.hash !== sha256(canonicalize(body))`

All three are detected independently; a corrupted entry can produce
multiple findings.

See
[../guides/approval-flow.md](../guides/approval-flow.md) for the flow
these entries record.
