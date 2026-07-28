# Reverse Carrier Contract Review

## Frame

Working owner system: OpenClaw already prepares and policy-checks one redirect-disabled provider request, materializes exact-origin credentials, and selects a lifecycle-owned dispatcher.

Missing capability: a portable, bounded contract for a host-initiated connection to physically execute that prepared request when direct HTTP, a proxy, or a service mesh is insufficient.

Deletion target: ProxyPipe `BeginRequest`, `RequestChunk`, `BeginResponse`, `ResponseChunk`, `RequestCancelled`, and its pipe-local HTTP inflight/body queues after a later authoritative adopter migration.

Disproof: reject the design if it needs provider semantics, credential resolution, general host invocation, transparent replay, or shared operator/control traffic.

## Audit And Comparison

- Reused the existing `network-guard/v1`, provider dispatcher, and credential-materialization boundaries.
- Recomposed the prior carrier work directly onto Package 1's guarded-dispatch
  core; credential materialization, traffic policy, dispatch bindings, host
  bundles, readiness, Status, and Doctor are not dependencies.
- Kept Package 1's network-guard validator as the only production import and
  removed credential-slot references from the carrier boundary.
- HTTP/2 flow control supports explicit per-stream bounded credit; WebSocket framing alone does not provide semantic backpressure; gRPC retry commitment reinforces explicit dispatch certainty rather than reconnect replay.
- Primary references: [RFC 9113](https://www.rfc-editor.org/rfc/rfc9113.html), [RFC 6455](https://www.rfc-editor.org/rfc/rfc6455.html), and [gRPC retry guidance](https://grpc.io/docs/guides/retry/).

## Evaluation

- Gateway runtime: accepted because the slice is a pure validator/evaluator with no I/O, global state, endpoint, or hot-path wiring.
- Lobster operator: accepted because disconnect produces an explicit certainty state and reconnect never resumes or replays an operation.
- Security: required binding-ID admission fencing, removal of credential references, a fixed wire-frame ceiling, case-insensitive header uniqueness, and complete Node-compatible HTTP field-value validation.
- Skeptical maintainer: kept the result to four files and rejected Status, Doctor, readiness, endpoint, and multipurpose carrier scope.

## Slice

Fork draft PR 179 is based directly on Package 1 at `c85d52bfff5`. It contains
`reverse-provider-dispatch/v1`, a deterministic trace evaluator, and a 16-case
language-neutral fixture corpus. Fifty-five focused assertions, core/core-test
type graphs, lint, formatting, diff hygiene, and final Codex review pass at
`b155d1797f3`. The fixture SHA-256 is
`4aeb54ae0c6261267acfb0a6d19df0e8a6ddc67b1a80b7119f711dfa2f2f7d1b`.

Lobster fork draft PR 53 now supplies the exact-byte and production-path proof.
A live reverse session remains a later package.
