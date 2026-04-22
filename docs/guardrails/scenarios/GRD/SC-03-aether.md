---
covers: [atom:GRD/4-adapters]
---

# SC-03 · GRD Aether adapter

**Series**: GRD · **Runner**: host-shape-sim

## Setup

Aether gateway (Workday-level enterprise governance) with the
`AetherAdapter` wired. Wire: HTTPS + gRPC.

## Input

An HTTPS request carrying an R4 tool call with enterprise identity
attestation.

## Run

`adapter.extractIdentity(req)` pulls principal from the mutual-TLS
certificate subject.
`adapter.routePolicy` looks up the Aether-published policy artifact.
`adapter.getApprovalSink()` returns a gRPC streaming sink.
`adapter.shapeResponse` shapes into an HTTPS response with standard
Aether error codes.

## Expected

Reviews escalate through the Aether supervisor pool. The approval
channel is gRPC streaming — the companion subscribes, the runtime
pushes approval requests, responses flow back.

## Proves

Enterprise gateway integration works. mTLS-based identity extraction
is supported.
