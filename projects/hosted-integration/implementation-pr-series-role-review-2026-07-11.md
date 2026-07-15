# Implementation PR Series Role Review

## Scope

Review the six-wave implementation map and the requirement that the first
milestone prove the complete hosted provider assembly, not a reduced transport
demo.

## Gateway Engineer

The PR boundaries keep hot-path changes incremental:

- local dispatcher first;
- immutable prepared binding before hosted transport;
- registry discovery outside requests; and
- provider streams isolated from Gateway control queues.

The local seam and guard extraction may merge as one PR if separating them
would create a temporary abstraction that immediately changes.

**Verdict: proceed.**

## Lobster Container Engineer

A provider-neutral fixture is necessary conformance but insufficient product
proof. The first hosted milestone must include a real adapter, token source,
network route, streaming provider response, reconnect behavior, and readiness.

CAPI is the right proof because it exercises:

- URL and query preparation;
- body inspection;
- non-secret metadata headers;
- host token acquisition;
- streamed response transformation;
- private host routing; and
- meaningful operational diagnostics.

**Verdict: proceed with CAPI as the first full vertical proof.**

## CISO And Enforcement Owner

The CAPI milestone must demonstrate the full authority chain:

```text
trusted model adapter
  intersect owner configuration
  intersect credential resolver grant
  intersect traffic/network policy
  intersect current dispatcher generations
```

Required proof includes denied private destinations, allowed managed-private
routes, redirect re-evaluation, credential origin restriction, stale
generation rejection, redaction, and no weaker fallback.

**Verdict: proceed with fail-closed conformance as a merge gate.**

## Platform Engineer

The wave plan supports parallel work without requiring cross-repository atomic
merge. OpenClaw support lands inactive before Lobster selects it.

The first milestone must also include:

- bundle and contribution versions;
- required Hosting Profile criteria;
- desired versus resolved inventory;
- Status and Doctor;
- canary authority and rollback; and
- mixed-version visibility.

Without these, a successful request would not prove fleet operability.

**Verdict: proceed.**

## Lorant Reviewer

Do not accept a registry-only or synthetic-only milestone as proof of the
architecture. Every foundation PR should name the CAPI vertical acceptance
case it enables.

Required revisions:

- make the wave map explicit;
- state that the first milestone spans Waves 1-4;
- replace the simple-provider milestone with full CAPI assembly;
- include readiness, Status, Doctor, policy, and rollback in acceptance; and
- retain provider-neutral fixtures as conformance, not the product proof.

**Verdict: approve after these revisions.**

## Final Decision

The revised map is approved.

The first implementation milestone is a complete CAPI vertical slice through:

- central bundle registration;
- model-owner adapter selection;
- credential-slot resolution;
- traffic and network policy;
- local and hosted dispatchers;
- reverse carrier;
- bounded streaming and dispatch certainty;
- Hosting Profiles readiness;
- Status and Doctor; and
- canary authority with rollback.

Substrate, simple-key providers, Channel, and Graph then reuse the proven
factorings in parallel tracks.

No implementation or upstream PR is authorized by this review.
