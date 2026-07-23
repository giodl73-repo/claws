# Concept — HostAdapter contract

The **`HostAdapter` contract** is the interface that sits between
an OpenClaw-integrating host and the plugin-side `GuardrailProvider` /
`FileIngestProvider` + `AuthorizationContext` + `HostContext` machinery
defined in CL-07. Hosts implement `HostAdapter`; plugins consume
what the adapter provides.

**Why it exists**: before this contract, integrating OpenClaw meant
"wire aether-specific middleware + policy-registry + sink endpoints".
That locked the plugin surface to aether's shape. The
`HostAdapter` interface separates WHERE the request comes from
(HTTP middleware, CLI argv, in-process function call, IPC message)
from WHAT the plugin decides. Any host that speaks the four interface
methods can plug in.

Spec authority:

- Interface definition: `CL-07-amendment-file-ingest-provider.md` §1a
  (in `specs/drafts/`, merges to `docs/specs/CL-07.md` at wave close)
- `ApprovalSink` companion interface: `CL-11-amendment-audit-cross-linking.md`
  §3a

## The four methods

```typescript
interface HostAdapter {
  readonly adapterId: string;

  // (1) Where requests come in.
  extractIdentity(req: IncomingRequest): Promise<AuthorizationContext>;

  // (2) Which compiled policy applies.
  routePolicy(ctx: AuthorizationContext): Promise<PolicyArtifactRef>;

  // (3) Where decisions + approvals land.
  getApprovalSink(ctx: AuthorizationContext): ApprovalSink;

  // (4) How decisions become caller-visible responses.
  shapeResponse(
    decision: AuthorizationDecision,
    ctx: AuthorizationContext,
  ): Promise<OutgoingResponse>;

  start?(): Promise<void>;
  stop?(): Promise<void>;
}
```

Each method is explained below with all four shipping-adapter
implementations so you can see how they compose.

### (1) `extractIdentity` — where requests come in

Given an incoming request, return an `AuthorizationContext` with
`sessionPrincipal`, `tenantId` (or `null` for single-tenant shapes),
`correlationId`, `snapshotId`, `policyArtifactSha256`, `clock`, etc.
(full type in CL-07 amendment §1a).

The adapter is authoritative here: once it returns a context, the
plugin trusts identity. If identity can be forged after this method,
the adapter has a security bug.

| Adapter                  | Implementation                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `AetherAdapter`          | `TenantIsolationMiddleware` + `conversation_authz` middleware chain; identity from JWT |
| `LobsterAdapter`         | `X-Session-Principal` header; single-tenant (`tenantId: null`)                         |
| `OpenClawVanillaAdapter` | `os.userInfo().username` or `--principal` CLI flag                                     |
| `ClawsServiceAdapter`    | `X-Principal` header (+ `X-Tenant-Id` when multi-tenant)                               |

### (2) `routePolicy` — which compiled policy applies

Given the extracted context, return a `PolicyArtifactRef` pointing at
the compiled policy artifact for this caller. The ref carries
`policyArtifactSha256` (content hash) + a lazy `loader()` so the host
controls storage.

Called twice with the same context MUST return the same
`policyArtifactSha256` unless a snapshot promote has occurred between
the calls (CL-07 non-uplift rule).

| Adapter                  | Implementation                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `AetherAdapter`          | `ApprovalPolicyRegistry.resolve` — union of proto_flag + registry, with `container_type_policies['openclaw']` override |
| `LobsterAdapter`         | `GET snap/v1/policy/current`; on sidecar-unreachable fallback to on-disk `.openclaw/policy/policy-ir.json`             |
| `OpenClawVanillaAdapter` | Single locally-compiled `.openclaw/policy/policy-ir.json`                                                              |
| `ClawsServiceAdapter`    | Local `.claws/policy-ir.json`; multi-tenant mode uses stub lookup table                                                |

### (3) `getApprovalSink` — where decisions + approvals land

Returns an `ApprovalSink` (CL-11 amendment §3a) the plugin uses for
`DecisionEntry`, `ApprovalEntry`, and other audit entries. The sink
MAY be per-context — aether routes different tenants to different
audit streams.

Every `ApprovalSink` MUST pass `ApprovalSinkConformance`. The suite
covers emit ordering, correlation matching, hash-chain integrity,
idempotency, and shutdown flush.

| Adapter                  | Sink                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `AetherAdapter`          | `AetherToolApprovalSink` (wraps `/v1/tool-approval` + 3-tier routing) |
| `LobsterAdapter`         | `LobsterSupervisorHttpSink` (HMAC POST + local write-behind)          |
| `OpenClawVanillaAdapter` | `OpenClawStdinSink` (stdout JSON + stdin readline; ephemeral)         |
| `ClawsServiceAdapter`    | `ClawsServiceJsonlSink` (fsync-append JSONL)                          |

### (4) `shapeResponse` — how decisions reach the caller

Given the plugin's decision + context, return an `OutgoingResponse`.
Transport-specific.

| Adapter                  | Response shape                                     |
| ------------------------ | -------------------------------------------------- |
| `AetherAdapter`          | HTTP 200/202 + SSE `tool_approval` event           |
| `LobsterAdapter`         | HTTP status + optional `Approval-Redirect` header  |
| `OpenClawVanillaAdapter` | Process stdout (JSON) + exit code (0/1/75)         |
| `ClawsServiceAdapter`    | Direct function return (`transport: 'in-process'`) |

## Host obligations

- **Identity is authoritative post-`extractIdentity`.** Plugin MUST
  NOT re-validate identity; if forgery is possible after this method,
  the adapter has a bug.
- **`routePolicy` is deterministic** under identical context (modulo
  snapshot promotes).
- **Sinks are per-context.** `getApprovalSink(ctx)` MAY return
  different sinks for different contexts; the plugin doesn't
  construct sinks itself.
- **Response shaping is transport-specific.** The plugin emits a
  decision shape; the adapter renders it.
- **No adapter-specific fields on `AuthorizationContext`.**
  Adapter-local state is keyed by `ctx.correlationId`, not on `ctx`
  itself. Cross-adapter scenarios assert only on fields defined in
  the interface.

## Writing a new adapter

A third-party OC host (different HTTP server, different identity
model, different sink persistence) ships a new adapter by:

1. Implementing `HostAdapter` per CL-07 amendment §1a
2. Implementing `ApprovalSink` per CL-11 amendment §3a
3. Passing `ApprovalSinkConformance` (non-negotiable shipping gate)
4. Optionally contributing the adapter to the repo or keeping it in
   the host's own tree
5. Writing a preset config + one or more preset-specific scenarios
   (shape-of-adapter invariants) + running plan 5's behavioural
   suite under the adapter via the matrix dispatcher

The four Horus-shipping adapters (aether, lobster, openclaw-vanilla,
claws-service stub) are reference implementations. None of them is
"the real" adapter; they're four peers of the contract.

## Upstream implication

`@openclaw/host-adapter` is a candidate 5th package for the
upstream contribution wave. When it ships, third-party OC hosts
inherit `HostAdapter` + `ApprovalSink` from upstream and plug
their own adapter implementation into the OC runtime. This is the
architectural realization of the user's extensibility ask:
_"someone else can run a different http server for their thing."_

## Cross-references

- `testing--host-presets.md` — matrix model + dispatcher
- `host-presets--aether.md` — adapter 1 (aether real runtime mirror)
- `host-presets--lobster.md` — adapter 2 (sidecar-snap shape)
- `host-presets--openclaw.md` — adapter 3 (zero-infra CLI shape)
- `host-presets--claws-service.md` — adapter 4 (stub, proves
  non-HTTP / in-process / direct-return shape)
- CL-07 amendment §1a — `HostAdapter` interface (spec authority)
- CL-11 amendment §3a — `ApprovalSink` interface + conformance suite
