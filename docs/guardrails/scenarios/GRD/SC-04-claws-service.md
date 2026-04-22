---
covers: [atom:GRD/4-adapters]
---

# SC-04 · GRD claws-service adapter

**Series**: GRD · **Runner**: host-shape-sim

## Setup

claws-service standalone HTTP daemon with the `ClawsServiceAdapter`
wired. Wire: HTTP + SSE.

## Input

An HTTP POST to `/call` carrying an R3 tool invocation.

## Run

`adapter.extractIdentity(req)` pulls principal from a session cookie
or bearer token.
`adapter.routePolicy` looks up the daemon's active policy artifact.
`adapter.getApprovalSink()` returns an SSE sink backed by
`/approvals/subscribe`.
`adapter.shapeResponse` returns a `200 { result }` or `202
{ handleId }` for review-pending.

## Expected

Reviews escalate through the SSE channel. The companion UI
(claws-ui-companion) subscribes to `/approvals/subscribe` and renders
each request.

## Proves

Standalone daemon deployment pattern works; SSE is a viable review
channel for web-companion integrations.
