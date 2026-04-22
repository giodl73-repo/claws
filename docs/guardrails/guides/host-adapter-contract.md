---
covers: [atom:GRD, atom:GRD/4-adapters]
---

# HostAdapter contract (package view)

The authoritative treatment of the `HostAdapter` interface, the 4
concrete adapters, and their shape matrix lives at
[../../concepts/host-adapter-contract.md](../../concepts/host-adapter-contract.md).
This page is a package-scoped summary for host implementors.

## 4 methods, no more

```ts
interface HostAdapter {
  extractIdentity(req: HostRequest): Principal;
  routePolicy(req: HostRequest, workspace: WorkspaceAST): PolicyIR;
  getApprovalSink(): ApprovalSink;
  shapeResponse(result: ExecutionResult, req: HostRequest): HostResponse;
}
```

Any host that implements these 4 methods can drive the guardrails
core. See [GRD § Method semantics](../specs/GRD-host-adapter.md).

## 4 concrete adapters

| Adapter | Host | Wire |
|---------|------|------|
| `OpenClawAdapter` | OpenClaw core | in-process |
| `LobsterAdapter` | Lobster editor MCP | MCP over stdio |
| `AetherAdapter` | Aether gateway | HTTPS / gRPC |
| `ClawsServiceAdapter` | claws-service | HTTP + SSE |

Scenarios for each adapter live in [../scenarios/GRD/](../scenarios/GRD/).

## Writing a new adapter

If you're wiring a 5th host:

1. Implement the 4 methods against your host's request/response shape
2. Pick an `ApprovalSink` (or write a new one if your host has a
   bespoke companion channel)
3. Land a `GRD/{adapter-name}` scenario that proves the 4-method
   wiring against the in-process harness
4. Reference-use: read [`GRD-host-adapter.md`](../specs/GRD-host-adapter.md)
   for the semantic contract

## Cross-references

- [../specs/GRD-host-adapter.md](../specs/GRD-host-adapter.md) —
  full interface spec
- [../../concepts/host-adapter-contract.md](../../concepts/host-adapter-contract.md) —
  conceptual walkthrough
