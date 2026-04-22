# GRD — `HostAdapter` interface

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md) · **Absorbs**: CL-07 §1a

## Interface

```ts
interface HostAdapter {
  readonly id: string;
  extractIdentity(req: HostRequest): Principal;
  routePolicy(req: HostRequest, workspace: WorkspaceAST): PolicyIR;
  getApprovalSink(): ApprovalSink;
  shapeResponse(result: ExecutionResult, req: HostRequest): HostResponse;
}
```

Four methods, no more. The host (OpenClaw core, Lobster, Aether,
claws-service) implements these to wire into guardrails. Any host that
implements these four methods can drive the governance core.

## Method semantics

### `extractIdentity(req)`

Pull the caller principal from the host-specific request shape.
Different hosts carry identity in different places (headers, session,
MCP bearer). This method normalises them into a single `Principal`
type the rest of guardrails sees.

### `routePolicy(req, workspace)`

Select which compiled `PolicyIR` applies to this request. The typical
implementation: look up the policy artifact by `req.snapshotId` and
return the pre-compiled IR. No business logic here — just lookup.

### `getApprovalSink()`

Return the `ApprovalSink` (see [GRA](./GRA-audit-chain.md)) the host
uses to dispatch review escalations. Different hosts wire different
companion channels: OpenClaw uses SSE, claws-service uses HTTP, tests
use the in-memory sink.

### `shapeResponse(result, req)`

Convert the runtime's `ExecutionResult` into the host's response
shape. For HTTP hosts: translate to an HTTP response. For CLI hosts:
format as stdout/stderr. For MCP: wrap in an MCP response envelope.

## 4 concrete adapters

| Adapter | Host | Shape |
|---------|------|-------|
| `OpenClawAdapter` | OpenClaw core (direct in-process) | in-process hook flow |
| `LobsterAdapter` | Lobster editor MCP | MCP over stdio |
| `AetherAdapter` | Aether (Workday-level gateway) | HTTPS / gRPC gateway |
| `ClawsServiceAdapter` | claws-service (standalone HTTP) | HTTP + SSE |

Each is covered by scenario series in [../scenarios/GRD/](../scenarios/GRD/).

See [../guides/host-adapter-contract.md](../guides/host-adapter-contract.md)
for the normative walkthrough and the 4-adapter shape matrix.
