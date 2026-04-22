---
covers: [atom:GRD/4-adapters]
---

# SC-01 · GRD OpenClaw adapter

**Series**: GRD · **Runner**: host-shape-sim

## Setup

In-process OpenClaw host with the `OpenClawAdapter` wired.

## Input

A `HostRequest` carrying an R3 tool call in OpenClaw's in-process
shape (direct hook handoff, no serialization).

## Run

`adapter.extractIdentity(req)` → `Principal`.
`adapter.routePolicy(req, workspace)` → `PolicyIR`.
`enforce(ctx, policy, providers)` → `HookResult`.
`adapter.shapeResponse(result, req)` → in-process return value.

## Expected

All 4 methods run synchronously in-process. No MCP, no HTTP, no SSE
overhead. `ApprovalSink` is the in-process `InMemorySink`.

## Proves

The in-process shape is fully supported; the harness can exercise the
core flow without any wire-protocol overhead.
