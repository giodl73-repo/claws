# Area 2 Provider-Dispatch Evidence Slice

## Purpose

Prove the one-hop dispatcher boundary on paper before implementation. The slice
uses one provider-neutral fixture and records the exact evidence required from
both local TypeScript and hosted Rust bindings.

It does not claim that every current Lobster provider behavior already fits the
V1 dispatcher.

## Fixture Topology

```text
OpenClaw guarded-fetch test owner
  -> traffic-policy fixture
  -> local dispatcher
  -> provider-neutral HTTPS fixture

OpenClaw guarded-fetch test owner
  -> traffic-policy fixture
  -> lobster/egress hosted dispatcher
  -> reverse-provider carrier
  -> provider-neutral HTTPS fixture
```

Fixture origins:

| Origin | Behavior |
| --- | --- |
| `https://api.dispatch.test` | Records request head/chunks and streams a bounded response |
| `https://redirect.dispatch.test` | Returns configurable `302`, `307`, and `308` responses |
| `https://private.dispatch.test` | Resolves to a fixture-private address |
| `https://rebind.dispatch.test` | Resolves to an allowed address, then a loopback/private address |

No production provider credentials or endpoints participate.

## Guard Profiles

### Public restrictive

```text
scheme: https
origins:
  - https://api.dispatch.test
  - https://redirect.dispatch.test
privateCidrs: none
blockLoopback: true
blockLinkLocal: true
dnsRebinding: reject
```

### Managed private route

```text
scheme: https
origins:
  - https://private.dispatch.test
privateCidrs:
  - fixture-private-cidr
blockLoopback: true
blockLinkLocal: true
dnsRebinding: reject
routeProfile: lobster/managed-private
```

Equivalence is evaluated with the same profile. Different profiles are allowed
to authorize different networks.

## Contract Cases

| Case | Expected dispatcher observation | Expected OpenClaw result |
| --- | --- | --- |
| Public streamed request | One invocation; two request chunks; one half-close | Same response status, headers, and two response chunks |
| First-hop policy denial | Zero invocations | `denied`, `not-started` |
| Hosted `302` | One invocation; no second host request | OpenClaw receives `302` and evaluates `Location` |
| Redirect to denied private origin | First hop only | Second hop rejected before dispatcher |
| Rebinding hostname | Connection not opened to private/loopback address | `denied`, `not-started` |
| Managed private origin | One invocation only under managed-private profile | Normal response |
| Cross-origin redirect | Second hop lacks stripped protected headers/slots | Normal response or policy denial |
| Declared credential slot | Exact configured header at allowed origin | Normal response; secret absent from evidence output |
| Undeclared credential slot | Zero provider sends | `protocol-violation` or configuration failure, `not-started` |
| Saturated dispatcher | Zero provider sends | `overloaded`, `not-started`; readiness remains true |
| Disconnect after send | One send may have reached fixture | `connection-lost`, `started-unconfirmed` |
| Advisory cancellation after send | Cancellation observed; no replay | `cancelled` with current certainty |
| Stale owner generation | Zero provider sends | `stale-generation`, `not-started` |
| Stale host bundle generation | Zero provider sends | `stale-generation`, `not-started` |
| One-shot body plus `307`/`308` | No replay dispatch | non-replayable redirect failure |
| Response limit exceeded | Response stream terminated | `response-limit-exceeded`; no truncated success |

## Observable Proof

The fixture records:

- dispatcher invocation count;
- logical origin and selected route profile;
- redacted selected-address class;
- request method and header names;
- credential slot IDs without values;
- request and response chunk sizes;
- half-close and cancellation events;
- terminal response or dispatch failure;
- dispatch certainty;
- owner generation, host bundle generation, and carrier incarnation; and
- whether a retry or reconnect replay occurred.

Readiness/status proof records:

- `provider.request.policy`;
- `provider.request.dispatcher`;
- current `True`/`False`/`Unknown` readiness;
- independent `Degraded` capacity status;
- binding and bundle IDs; and
- a Doctor finding for unresolved or incompatible dispatcher registration.

## Local And Hosted Assertions

The two implementations must share:

- one dispatcher interface version;
- one fixed network-guard profile schema;
- one credential-slot schema;
- one portable failure and certainty taxonomy;
- one stream/credit/half-close state machine; and
- one conformance fixture set.

They need not share:

- DNS resolver implementation;
- physical route;
- credential store;
- carrier;
- connection incarnation; or
- destinations not authorized by the profile under test.

## Current Lobster Provider Inventory

The current forwarding core contains preparation semantics that must not be
hidden inside the generic dispatcher:

| Current path | Credential shape | Other preparation | V1 implication |
| --- | --- | --- | --- |
| Anthropic direct | `x-api-key` | Buffers and rewrites attachment markers in the JSON body | Register an Anthropic provider adapter plus key slot resolver |
| WebIQ | `x-apikey` | Target policy and product routing | Register the owner adapter/policy plus key slot resolver |
| Entra/dev token targets | `Authorization` bearer | Scope selection and user assertion exchange | Register an origin/scope-bound bearer slot resolver |
| Teams/Bot Framework ACF | `Authorization` bearer | Per-user agent identity and Channel semantics | Channel owner prepares the request and selects an ACF bearer slot |
| Graph agentic-user | `Authorization` bearer | Per-user Graph identity and feature gates | Graph/Channel owner prepares the request and selects an agentic-user bearer slot |
| CAPI | Bearer plus several metadata headers | URL/query rewrite, model/stream inspection, buffered body, response SSE transformation | Register `lobster/capi` adapter for semantics and `lobster/capi-token` for the bearer slot |
| Substrate LLM API | Bearer plus many routing/taxonomy headers | Endpoint rewrite, model inspection/mapping, buffered body | Register `lobster/substrate-llmapi` adapter and `lobster/substrate-token` bearer slot |
| IDP registry handlers | Potentially provider-defined credential mutation | Provider-specific identity policy | Register typed owner adapters and slot resolvers; arbitrary mutation does not enter the dispatcher |

The first conformance slice therefore proves the dispatcher mechanism. Full
ProxyPipe tag deletion waits for every active brokered path either to:

1. select registered provider adapters that produce a fully prepared one-hop
   request plus supported credential slots;
2. move to a proxy/service mesh or native direct binding;
3. move to its semantic owner, such as a Channel adapter; or
4. be explicitly retired.

## Exact ProxyPipe Mapping

| Current source | Replacement evidence | Deletion condition |
| --- | --- | --- |
| `proto/proxy_pipe.proto` tags 1-5 | Dispatcher and reverse-carrier schemas | All brokered request families migrated |
| `openclaw_container/src/proxy_pipe_bridge.rs` body buffering, request IDs, inflight waiters, response channels | OpenClaw dispatcher client and carrier streams | No forward/refresh caller uses the bridge |
| `openclaw_container/src/adapter_state.rs` `proxy_pipe_inflight` and request ID allocator | Dispatcher-owned operation registry | Bridge removed |
| `lobster_runtime/src/proxy_pipe/request_registry.rs` HTTP active bodies, cancellation, and chunk routing | Reverse-carrier stream state machine | No tag 1-5 decoding |
| `lobster_runtime/src/proxy_pipe/response_sender.rs` HTTP response frame helpers | Reverse-carrier response stream | No tag 3-5 encoding |
| `lobster_runtime/src/proxy_pipe/handler.rs` HTTP dispatch permits and frame branches | Dispatcher admission and per-operation credit | No tag 1-5 handling |
| 100 MiB gRPC message allowances | Bounded carrier chunks | Single-message request packaging removed |
| Pipe refresh compatibility | Binding-owned credential/session renewal | No refresh call over tags 1-5 |

The 10 MiB buffering in `container_proxy/forward.rs` is reviewed separately.
Buffering used only to package ProxyPipe requests is deleted. Buffering required
by surviving approval, provider preparation, or body transformation remains
with its owner until that behavior moves or is retired.

## Proof Decision

The evidence slice is sufficiently bounded to authorize an isolated fork
prototype later:

- one neutral fixture;
- one local seam;
- one hosted seam;
- accepted and structured failure outcomes;
- readiness/status/Doctor evidence; and
- an explicit deletion ledger.

No prototype, production change, or upstream submission is authorized by this
paper slice.
