# Wave 1 Contract Role Review - 2026-08-01

## Scope

Wave 1 was reviewed in three role panels:

1. configuration, activation, and release;
2. authority and memory; and
3. protocol, node trust, invocation, and Rust Node Mode.

The review used founder, new-hire, power-user, platform, Gateway, Aether
runtime, CISO, compliance, policy, release, and Lobster-container lenses.

These are architectural contract scopes. A focused RFC is the proposed
upstream adoption vehicle.

## Portfolio Changes

- Promoted EC-023 Streaming, Cancellation, and Replay into Wave 1 because
  EC-025 and EC-026 require it.
- Kept every Wave 1 contract separate; no merge was accepted.
- Narrowed overlapping readiness, convergence, release, memory, and node trust
  boundaries.
- Added migration, compatibility, evidence, and operational expectations that
  were missing from the initial scaffolds.

## Accepted Findings

### EC-006 Effective Configuration Generations

- Add rejected-generation and prior-generation preservation semantics.
- Add initial migration without long-lived dual writes.
- Make identity, provenance, time, and schema compatibility attestable.
- Preserve raw local configuration as the ordinary local source.

### EC-007 Activation, Readiness, and Convergence

- Limit this contract to one owner/deployment unit.
- Move fleet composition to EC-034.
- Consume host lifecycle/probe behavior from EC-032 instead of redefining it.
- Qualify recovery as owner-level recovery.

### EC-029 Release Activation and Recovery

- Own only the release-specific transition.
- Consume readiness and host lifecycle from EC-007 and EC-032.
- Add downgrade, partial-publication, and mixed-component compatibility.
- Keep patch disposition in Phase 0 rather than this contract.

### EC-014 Authorized External Effects

- Separate tool-runtime completion from external-effect certainty.
- Add stale policy/approval generation fencing before dispatch.
- Extend existing audit/evidence conventions instead of creating a parallel
  ledger.

### EC-019 Memory Scope and ACL

- Break the circular dependency with EC-020.
- Consume copy/index identity from EC-020 and classification obligations from
  EC-030.
- Distinguish provenance from enterprise classification.
- Name enforcement boundaries for retrieval and mutations.

### EC-020 Memory Corpus Lifecycle

- Keep LanceDB as a separate canonical owner.
- Add generation-conflict blocking before destructive mutation.
- Limit export scope to memory-owned derived copies.
- Use existing audit/evidence evolution rather than a parallel ledger.

### EC-022 Protocol Negotiation and Evolution

- Add Gateway hot-path latency and non-blocking operational budgets.
- Keep capability negotiation distinct from authorization.

### EC-023 Streaming, Cancellation, and Replay

- Promote into Wave 1 as a prerequisite.
- Keep replay authority, idempotency, and effect settlement owner-specific.

### EC-024 Node Pairing and Trust

- Define connection incarnation and trust; exclude invocation/result
  correlation owned by EC-025.

### EC-025 Remote Node Invocation

- Consume pairing/connection identity from EC-024.
- Add revocation and external-effect contract dependencies.
- Require explicit remote-effect certainty after timeout, cancellation, or
  disconnect.

### EC-026 Rust Node Runtime Profile

- Expand the deployment profile to startup, readiness, resources, exposure,
  drain, recovery, reconnect, initialization, and failure isolation.
- Prohibit dual TypeScript/Rust authority for the same external effect.
- Make EC-029 release proof a deletion prerequisite.

## Deferred Questions

- Exact Gateway negotiation and enforcement latency budgets.
- Exact memory authority verbs included in the first ACL version.
- Which existing audit schema becomes the shared evidence evolution base.
- The first Rust Node Mode capability profile and deployment environment.
- Mixed TypeScript/Rust artifact publication topology.

## Result

Wave 1 is coherent after the applied revisions. The next action is a second
scope pass over Wave 1 for naming, dependency ordering, and potential
September-versus-post-September prioritization before beginning Wave 2.
