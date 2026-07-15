# Hosted Integration Decision Package

## Thirty-Second Pitch

Managed OpenClaw deployments should not need a private reverse bus to supply
credentials, enterprise networking, Channel delivery, approvals, or lifecycle
control.

OpenClaw can instead:

1. use its existing Gateway, Channel, plugin, proxy, and lifecycle surfaces;
2. let each semantic owner prepare the exact operation and declare its required
   credentials and safety policy; and
3. delegate only the final physical network exchange when the host must execute
   it.

This keeps ordinary OpenClaw installations unchanged, gives managed hosts
explicit least-privilege integration points, and lets Lobster delete ProxyPipe
one capability at a time.

## The Decision

Approve the architecture direction, not the entire implementation stack:

> Native surfaces first, owner contracts for missing semantic seams, and one
> optional semantically empty hosted dispatcher for the residual network
> boundary.

The first implementation decision is narrower:

> Accept an additive local provider-dispatch seam and exact credential-slot
> contract while preserving current behavior.

The reverse carrier is not part of the first approval. It remains a later,
separately justified implementation choice.

## Why This Matters

### For OpenClaw

- Preserves the simple local installation and existing direct execution path.
- Produces reusable owner contracts rather than Lobster-specific APIs.
- Makes identity, credential, policy, readiness, and replay ownership explicit.
- Avoids turning Gateway or `OpenClawTransport` into a reverse service bus.
- Adds conformance points that other managed hosts can implement.

### For Lobster

- Replaces private runtime semantics with supported OpenClaw ownership.
- Keeps credentials and private network reachability in the trusted host.
- Enables capability-by-capability canary, rollback, and compatibility expiry.
- Deletes private framing, buffering, correlation, fallback, and patch
  maintenance after evidence gates pass.

### For Operators And Security Reviewers

- Every binding has an owner, exact credential slots, origin constraints,
  generations, readiness, provenance, and an authority state.
- Host policy may narrow OpenClaw authority but cannot widen it.
- Governed execution fails closed instead of silently falling back.
- Mixed-version rollout and old-path use are observable before deletion.

## Current And Proposed Models

| Today | Proposed |
| --- | --- |
| ProxyPipe multiplexes unrelated semantic operations over one private connection. | Existing native surfaces remain authoritative for Gateway, Channel, lifecycle, and transparent network concerns. |
| Lobster owns request preparation, credentials, policy, transport, retries, and compatibility for several OpenClaw operations. | Each OpenClaw owner prepares the operation and retains identity, response, retry, replay, activation, and readiness semantics. |
| The private pipe is both integration mechanism and semantic catalog. | A host bundle packages typed contributions but does not become a semantic owner or activation transaction. |
| Removing one path risks a broad transport migration. | Each capability has an owner/adopter pair, canary, rollback, observation window, expiry, and named deletion target. |

## Architecture In One Diagram

```text
semantic owner prepares exact operation
        |
        +-- existing native surface --------------------------+
        |                                                     |
        +-- local guarded dispatch                            |
        |                                                     v
        +-- exact credential slots + policy intersection -> operation result
                                  |
                                  +-- optional hosted physical dispatch
```

The optional dispatcher receives one already-authorized, redirect-disabled
exchange. It does not choose the provider, identity, credential scope, retry
policy, response meaning, or replay behavior.

## Evidence Already Built

The fork-only implementation series is not a paper architecture. It includes:

| Evidence | What it proves |
| --- | --- |
| Local provider-dispatch seam and network guard fixtures | Current local behavior can remain the default while physical execution becomes replaceable. |
| Exact credential-slot resolver | Hosted execution does not require arbitrary header mutation or exposing credential values to OpenClaw. |
| Bundle, readiness, Status, and Doctor slices | Registration, selection, compatibility, provenance, and health remain explicit and owner-local. |
| CAPI and Substrate owner/adopter slices | Complex model-provider request and streamed-response semantics stay with their owner. |
| WebIQ and Anthropic slices | The model extends to bounded web/API-key providers without creating a universal adapter. |
| ACF and Graph mail slices | Channel and mailbox identity remain owner-specific; routing input cannot choose trusted identity. |
| Restore-hold slice | Lifecycle authority composes through owner generations rather than a generic host callback. |
| CAPI mixed-version observer | Rollout can compare redacted fingerprints, authority, versions, old-path use, rollback, and expiry without duplicating live side effects. |

The code is intentionally fork-only. It demonstrates feasibility and exposes
the contracts for review; it is not a request to merge the full stack.

## What We Are Not Asking For

- No ClawBus or generic `{ interface, operation, payload }` host API.
- No universal provider-adapter registry.
- No mandatory sidecar or hosted path for normal installations.
- No provider traffic moved into Gateway control-plane queues.
- No reverse callbacks added to `OpenClawTransport`.
- No arbitrary credential or request mutation by the host.
- No big-bang ProxyPipe replacement.
- No deletion before real artifact, canary, observation, and expiry evidence.

## Incremental Approval Path

The current fork review implementation is packaged as:

1. [guarded dispatch core](https://github.com/giodl73-repo/openclaw/pull/71);
2. [CAPI owner composition and operations](https://github.com/giodl73-repo/openclaw/pull/72);
3. [hosted CAPI execution](https://github.com/giodl73-repo/openclaw/pull/73);
4. [additional provider owners](https://github.com/giodl73-repo/openclaw/pull/74); and
5. [Microsoft interactions](https://github.com/giodl73-repo/openclaw/pull/75).

Packages 4 and 5 are parallel children of package 3. Exact branches, sizes,
source PRs, and Lobster evidence are recorded in `fork-review-stack.md`.

### Decision 1: Architecture

Review RFC 0020 for:

- native surfaces as the first choice;
- semantic ownership;
- exact credential declarations;
- local/hosted parity;
- fail-closed activation; and
- deletion-gated migration.

Exit: agreement on boundaries and the first proof, not final API spelling.

### Decision 2: Additive Local Seams

Review the smallest independently useful OpenClaw changes:

1. one local provider-dispatch seam with no behavior change;
2. one fixed network guard profile;
3. one origin-bound credential-slot resolver; and
4. one CAPI owner adapter.

Exit: local conformance passes and no hosted carrier exists.

### Decision 3: Composition And Operations

Review bundle packaging, typed owner references, readiness, Status, and Doctor.

Exit: inactive support can land without activating or requiring a host.

### Decision 4: Hosted Physical Proof

Only after the earlier contracts are accepted, review a bounded reverse carrier
for provider dispatch.

Exit: the CAPI owner/adopter pair proves exact semantics, overload, stale
generations, uncertain outcomes, canary authority, and rollback.

### Decision 5: Adoption And Deletion

Move each remaining capability through:

```text
owner support
  -> inactive adopter support
  -> explicit canary
  -> new authority
  -> zero old-path evidence
  -> compatibility expiry
  -> private-path deletion
```

Exit: deletion is measured in Lobster code removed, not registrations added.

## Likely Objections

### "This sounds like a service bus."

It is deliberately not one. Native product surfaces stay native, semantic
owners remain independent, and only provider dispatch may use the first reverse
carrier. There is no shared host method catalog.

### "Why not use Gateway for everything?"

Gateway already owns application and operator requests. Provider streams need
different authority, flow control, scheduling, credential posture, and failure
semantics. Reusing Gateway admission machinery does not require sharing its
semantic API or queues.

### "Why not use a proxy or service mesh?"

Use one when transparent routing is sufficient. Hosted dispatch exists only
when the host must materialize credentials, resolve managed-private
destinations, or perform a governed exchange that a transparent proxy cannot
express safely.

### "Why does OpenClaw need this?"

The reusable value is explicit owner binding: local and managed deployments can
select implementations without moving semantics out of OpenClaw. Lobster is
the first adopter and deletion proof, not the owner of the architecture.

### "Is this too much API surface?"

The implementation work showed that the smaller surface is the owner contract,
not a universal framework. The approval path begins with local seams and one
real owner. Carrier and broader adoption are deferred until justified.

### "How do we know the migration is safe?"

Every adopter has explicit authority, generation fencing, readiness, canary,
rollback, mixed-version observation, compatibility expiry, and a named deletion
target. Side-effecting requests are not mirrored.

## Suggested Review Meeting

1. **Problem, 5 minutes:** show how ProxyPipe accumulated unrelated ownership.
2. **Decision tree, 5 minutes:** native surface, owner contract, optional
   physical dispatch.
3. **CAPI proof, 10 minutes:** exact request, credential slot, policy,
   dispatch, streamed response, readiness, and rollback.
4. **Graph proof, 5 minutes:** trusted mailbox identity and exact origins.
5. **Migration, 5 minutes:** mixed-version evidence and deletion ledger.
6. **Decision, 5 minutes:** approve the architecture boundary and first local
   seam review.

Do not lead with the full branch graph or reverse-carrier wire details. Use
those only to answer implementation and feasibility questions.

## Reviewer Entry Points

| Need | Start here |
| --- | --- |
| Executive and architecture decision | This document, then RFC 0020 |
| Exact proposal | Fork RFC PR 2 and `rfcs/0020-hosted-integration-and-capability-bindings.md` |
| Implementation sequence | `implementation-pr-series.md` |
| Source and competitor evidence | `source-audit-2026-07-11.md` and `comparison-matrix.md` |
| Security/runtime/operator review | `role-review-2026-07-11.md` |
| Exact PR scopes | `pr-plans/README.md` |
| Deletion proof | `../layering-contracts/lobster-deletion-ledger.md` |
| Mixed-version rollout | `f2-capi-observation-slice.md` |
