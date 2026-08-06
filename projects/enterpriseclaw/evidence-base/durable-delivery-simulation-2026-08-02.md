# Durable Delivery Fork Simulation - 2026-08-02

## Result

A dependency-free fork simulation executes the second EnterpriseClaw golden
journey without using OpenClaw runtime code, channel plugins, provider
credentials, network I/O, or real external copies.

## Baseline

- Worktree: `C:\src\openclaw-protected-effect-sim`
- Branch: `user/giodl/ec-protected-effect-sim`
- Artifact: `experiments/durable-delivery-simulation/`
- Runtime: Node.js built-ins only
- Status: untracked fork-only experiment

The current TypeScript OpenClaw runtime remains authoritative.

## Simulated Contract Path

```text
frozen conversation/route/payload
  -> durable queue acceptance
  -> restart
  -> fenced native attempt
  -> fake provider receipt/failure/timeout
  -> reconciliation or late receipt
  -> immutable settlement revisions
  -> local/export/provider copy lifecycle
  -> human projection + redacted evidence
```

## Executed Cases

| Case | Result |
| --- | --- |
| Restart after durable queue acceptance | Preserves one operation and one later attempt |
| Unknown effect then reconciliation | Blocks replay until no effect is proven; retry uses a new attempt under the same operation |
| Blind retry while unknown | Rejected |
| Concurrent or stale attempt | Rejected by active-attempt and lease-generation fencing |
| Late provider receipt | Supersedes unknown with provider acceptance without creating a new attempt or deleting history |
| Multipart partial effect | Preserves accepted provider ID and forbids whole-operation replay |
| Local session delete | Reports retained export and provider copies |
| Incompatible required queue semantics | Fails before dispatch |
| Unproven durable acceptance | Does not project `queued`; requires reconciliation |
| Route change after queue acceptance | Preserves the accepted conversation and route generation |

The Node test suite reports ten passing tests.

## Findings That Changed the Contracts

1. External exactly-once delivery is not a portable guarantee.
2. `Queued` requires durable acceptance, not request receipt.
3. Delivery owners need one active attempt claim with stale-worker fencing.
4. Unknown settlement may be superseded by late owner proof without history
   mutation.
5. Multipart replay scope is per unsettled part.
6. Accepted delivery freezes target and route provenance across restart.
7. Export production and export delivery are separate operations.
8. Local delete requires an explicit retained-copy projection.

## Safety Proof

- Imports only Node filesystem, path, URL, assertion, and test modules.
- Contains no OpenClaw runtime imports.
- Contains no provider SDK, socket, HTTP, or credential access.
- Fake receipts use deterministic `fake-provider:` identifiers.
- Evidence explicitly reports `containsSecretMaterial=false`.

## Contract Contribution

The simulation contributes bounded evidence across EC-001, EC-015, EC-016,
EC-017, EC-023, EC-030, and EC-033.

It proves that the contracts can compose behind a small human surface while
retaining operation, attempt, receipt, reconciliation, route, and copy facts.

## Limits

This is not evidence that:

- current OpenClaw channels expose one portable operation/attempt envelope;
- current queue persistence uses the simulated acceptance rule;
- stale workers are fenced by a durable production claim;
- a real provider supports reconciliation or idempotency;
- exports and provider copies are enumerated by current deletion UX; or
- any external effect or deletion occurred.

## Cheapest Next Proof

Do not integrate this experiment into OpenClaw merely to increase realism.
The next architecture slice should either:

1. build the third standalone fleet-recovery simulation; or
2. when explicitly authorized, prove one portable operation/attempt fixture
   across two unlike owner implementations.

