# Host preset — claws-service (STUB — one of N HostAdapter adapters)

The **claws-service preset** is the `ClawsServiceAdapter`
implementation of the `HostAdapter` contract (CL-07 amendment
§1a). It reserves the shape that clawc would expose if we ever offered
a direct hosted runtime to a customer — one who doesn't want to run
aether, doesn't want to operate cowork+lobster, and just wants clawc
itself to host their OC integration.

> **Stub in Horus — not production**. `readiness: 'reserved-stub'`.
> The adapter passes `ApprovalSinkConformance` and runs plan 5's
> behavioural suite end-to-end to prove the `HostAdapter`
> interface scales past aether-specific assumptions. It does NOT ship
> multi-tenant production storage, cross-pod routing, replication, or
> any operational affordance suitable for customer workloads. A later
> wave (not yet scheduled) builds the product if we decide to offer
> direct hosting.

## Why this adapter exists in the sim

The user's concern on the extensibility pivot: _"ideally this would
be an extensible way to run something for the service like claws for
openclaw and someone else can run a different http server for their
thing etc."_

If the `HostAdapter` contract were only exercised by aether +
lobster + openclaw-vanilla, it could accidentally encode assumptions
that don't generalize. Adding a fourth shipping adapter — even as a
stub — is the cheapest way to prove the contract is not secretly
aether-bound. If the stub can't implement the four interface methods
cleanly, the interface needs fixing; if it can (which it does), the
contract is genuinely adapter-agnostic.

## HostAdapter methods — claws-service mapping

| `HostAdapter` method           | `ClawsServiceAdapter` implementation                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extractIdentity(req)`         | Reads `X-Principal` (or `X-Session`) header → `{ sessionPrincipal, tenantId: null }`. Single-tenant by default; multi-tenant when `clawsService.multiTenant: true` is set (stub returns tenant from a second header `X-Tenant-Id`). |
| `routePolicy(ctx)`             | Local `.claws/policy-ir.json` by default. Multi-tenant mode looks up per-tenant artifact via a stub lookup table.                                                                                                                   |
| `getApprovalSink(ctx)`         | Returns `ClawsServiceJsonlSink` — fsync-append to `.claws/audit/{YYYY-MM-DD}.jsonl`. `read()` streams back with filter. Single-node, no replication.                                                                                |
| `shapeResponse(decision, ctx)` | Direct function return (in-process invocation). `transport: 'in-process'` in the `IncomingRequest`; no HTTP wire format.                                                                                                            |

## Preset config

```ts
const clawsServicePreset: HostPresetConfig = {
  name: "claws-service",
  decide: {
    providers: [/* fixtures */],
    mergerMode: "strict-oc7",
  },
  track: { mode: "off" }, // single-node; no sidecar
  enforceReview: { companionMode: "direct-function", signer: "claws-service-hmac" },
  workspace: { mount: "local-dir" },
  scope: "@bic/openclaw",
  clawsService: {
    identityHeader: "X-Principal",
    auditJsonlDir: ".claws/audit/",
    multiTenant: false,
  },
};
```

## What the claws-service stub proves (Horus scope)

1. The `HostAdapter` interface works for an in-process,
   non-HTTP-wire transport (`transport: 'in-process'`). This rules out
   any interface field that quietly assumes HTTP.
2. `ClawsServiceJsonlSink` is a conformant `ApprovalSink` — local
   JSONL + fsync, no network, no remote persistence. If a sink this
   simple passes `ApprovalSinkConformance`, the conformance suite is
   not secretly biased toward aether's async delivery shape.
3. The matrix dispatcher runs plan 5's suite under the stub adapter
   with the same skip rules as the other three. Any dispatcher drift
   toward aether-assumptions gets caught here.

## What the claws-service stub does NOT ship in Horus

- No production-grade multi-tenant storage (the stub's `multiTenant: true`
  path is a lookup table, not Redis / Postgres / Cosmos)
- No cross-pod routing (stub is single-node)
- No idempotency set (aether's `ApprovalIdempotencySet` equivalent) —
  retry handling is the caller's responsibility
- No deferred one-time permission path — caller synchronously waits
- No HTTP wire format whatsoever — a real clawc-service would likely
  add this; the stub uses direct function return to prove the
  non-HTTP path

See `testing--host-presets.md` for the matrix model and
`host-adapter-contract.md` for the interface all four adapters
implement.
