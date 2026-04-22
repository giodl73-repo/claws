---
covers: [atom:GRD/4-adapters]
---

# SC-02 · GRD Lobster adapter

**Series**: GRD · **Runner**: host-shape-sim

## Setup

Lobster editor MCP host with the `LobsterAdapter` wired. MCP channel
over stdio.

## Input

An MCP tool-call request carrying an R3 tool plus session state.

## Run

`adapter.extractIdentity(req)` pulls principal from the MCP session.
`adapter.routePolicy` looks up the workspace-scoped policy artifact.
`adapter.getApprovalSink()` returns a bespoke MCP-channel sink.
`adapter.shapeResponse` wraps the result in an MCP response envelope.

## Expected

Review escalations surface through the Lobster UI via the MCP channel.
Approval responses come back the same way.

## Proves

The MCP-over-stdio shape works end-to-end; the editor can drive the
governance core.
