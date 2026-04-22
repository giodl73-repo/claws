# Host preset — aether (one of N HostAdapter adapters)

The **aether preset** is one concrete implementation of the
`HostAdapter` contract (CL-07 amendment §1a). It mirrors aether's
actual runtime model — `TenantIsolationMiddleware` +
`conversation_authz` for identity extraction, `ApprovalPolicyRegistry`
with `container_type_policies` for policy routing, `/v1/tool-approval`
for the approval sink, HTTP + SSE for response shaping.

> **Framing at the contract level**: plan 6 ships FOUR `HostAdapter`
> adapters — `AetherAdapter` (this guide), `LobsterAdapter`,
> `OpenClawVanillaAdapter`, and a `ClawsServiceAdapter` stub.
> The interface is host-agnostic; aether is one shape among many. A
> third-party OC host (different HTTP server, different identity model,
> different audit sink) ships their own adapter and inherits the
> contract. The aether adapter's job is to simulate aether's actual
> code so Wepwawet's real-integration plan is a drop-in replacement
> rather than a refactor.

> **Critical framing — aether specifics**: the aether adapter does
> NOT invent tenancy. It mirrors the tenancy aether already enforces
> via its middleware stack. If you start wiring a tenant-aware proxy
> or N snap instances per tenant, stop — that's not aether's
> architecture. Aether enforces tenancy at the HTTP layer
> (`TenantIsolationMiddleware` + `conversation_authz`) before the
> OpenClaw plugin runs; the plugin receives already-scoped requests.
> Snap stays tenancy-blind because it's downstream of a scope
> boundary, not because we designed it that way.

## HostAdapter methods — aether mapping

| `HostAdapter` method | `AetherAdapter` implementation |
|---|---|
| `extractIdentity(req)` | `TenantIsolationMiddleware.dispatch` populates `request.state.tenant_context` from JWT; `validate_conversation_access` validates composite `tenant:user:session` ownership. Returns `AuthorizationContext` with `sessionPrincipal`, `tenantId`, `correlationId`. |
| `routePolicy(ctx)` | `ApprovalPolicyRegistry.resolve` — union of proto_flag OR registry result, with `container_type_policies['openclaw']` override when `container_type === 'openclaw'`. Returns `PolicyArtifactRef` with snapshot + content hash. |
| `getApprovalSink(ctx)` | Returns `AetherToolApprovalSink` wrapping `/v1/tool-approval` submit_tool_approval (3-tier local → proxy → queue routing). |
| `shapeResponse(decision, ctx)` | HTTP 200/202 + SSE `tool_approval` event (for `decision: 'review'`); HTTP 200 + JSON body for allow/deny/modify. |

See `testing--host-presets.md` for the matrix model,
`host-adapter-contract.md` for the interface shared by all four
adapters, and the sibling guides `host-presets--openclaw.md`,
`host-presets--lobster.md`, `host-presets--claws-service.md` for
peer adapter shapes.

## What the aether preset proves

1. **Tenancy enforcement happens at HTTP middleware** — aether's
   `TenantIsolationMiddleware` populates `request.state.tenant_context` from
   JWT claims and rejects cross-tenant requests with
   `TENANT_ISOLATION_VIOLATION` (403) before the OpenClaw plugin runs. The
   sim's middleware stand-in asserts no raw tenant string reaches the plugin.
2. **Composite identity arrives pre-resolved** —
   `tenant_id:user_id:session_id` is bound at middleware time; the plugin's
   `AuthorizationContext` receives it on `ctx.principal` without parsing
   conversation IDs itself. The sim asserts the resolution chain matches
   aether (JWT → actor state → actor_id parse).
3. **Per-container-type policy overrides work** —
   `ApprovalPolicyRegistry` with `container_type_policies` applies
   `openclaw_policies` when `container_type === 'openclaw'` and default
   policies otherwise. The sim's registry stand-in asserts the resolve()
   contract: approval required = (proto_flag OR registry_result).
4. **Decision/approval round-trips through the aether sink** — the plugin's
   `DecisionEntry` flows to `/v1/tool-approval`, where aether's three-tier
   router delivers the user decision back to the container. The sim wires
   a `/v1/tool-approval` stand-in so our audit chain cross-links
   (`correlationId`) reach aether's existing sink shape, instead of
   inventing a parallel audit surface.

## Aether's real architecture — what the preset mirrors

### Tenant isolation at HTTP entry

```
    Client request (with JWT)
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  TenantIsolationMiddleware               │    tenant_isolation.py
    │  - reads jwt_claims.tenant_id/user_id    │
    │  - rejects missing claims → 403          │
    │  - populates request.state.tenant_context│
    └──────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  validate_conversation_access            │    conversation_authz.py
    │  (called in each /v1/* route)            │
    │  - parses tenant:user:session            │
    │  - rejects TENANT_MISMATCH → 403         │
    │  - rejects OWNERSHIP_REQUIRED → 403      │
    └──────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  OpenClaw plugin (GuardrailProvider)     │  ← plugin sees only the
    │  - receives AuthorizationContext with    │    already-scoped request
    │    tenant_id, user_id, session_id        │
    │  - decides allow/deny/review/modify      │
    └──────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  ApprovalPolicyRegistry.resolve          │    policy_registry.py
    │  - container_type lookup                 │
    │  - returns registry-required flag        │
    │  - union with proto_flag                 │
    └──────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  /v1/tool-approval (when review needed)  │    tool_approval.py
    │  - 3-tier routing: local → proxy → queue │
    │  - records decision/approval             │
    └──────────────────────────────────────────┘
```

### Composite identity format

Aether's conversation identity is the 3-tuple
`tenant_id:user_id:session_id`, parsed by `ConversationId.from_key`
and carried through:

- JWT claims populate middleware; middleware sets `request.state`
- Each `/v1/*` route validates via `validate_conversation_access`
- Fallback for simple IDs: JWT claims fill in tenant_id + user_id when
  only a session UUID is passed
- Actor-level reconnects resolve identity via
  `resolve_identity(ctx)` — JWT → actor state → actor_id parse

The sim's `composite-identity-propagation` scenario asserts this chain.

### Per-container-type policy overrides

`ApprovalPolicyRegistry` constructor:

```python
ApprovalPolicyRegistry(
  policies=[…default_policies…],
  container_type_policies={
    'openclaw': [
      {'server': 'filesystem', 'tool': 'write', 'requires_approval': True},
      {'server': '*', 'tool': '*', 'requires_approval': False},
    ],
  },
)
```

When a tool invocation comes in with `container_type === 'openclaw'`, the
registry uses the `openclaw_policies` set; otherwise it uses defaults.
The `resolve()` method unions the proto `requires_approval` flag with the
registry lookup: either says true → true.

The sim's `container-type-policy-override` scenario seeds both sets and
asserts the resolution matches aether's union contract.

### `/v1/tool-approval` sink

When a decision requires review, the plugin emits the tool_approval SSE
event; the client renders the dialog; the user submits the decision at
`POST /v1/tool-approval` with a `ToolApprovalSubmission` body:

```typescript
interface ToolApprovalSubmission {
  approval_id: string;
  approved: boolean;
  denial_reason?: string;
  conversation_id: string;   // composite tenant:user:session
  server_name?: string;
  tool_name?: string;
  edited_input?: object;
}
```

Aether routes this through three tiers:
1. **Local gRPC** (~1ms) — actor on this pod → direct send
2. **HTTP proxy** (~5-20ms) — actor on another pod → proxy via
   `/internal/tool-approval`
3. **Redis queue** (~100-500ms) — actor offline → queued via
   `ConversationService`

The sim's sink stand-in implements tier-1 + tier-3 (tier-2 requires
cross-pod topology irrelevant to the plugin contract). The
`tool-approval-sink-cross-link` scenario asserts our `DecisionEntry`
(with `correlationId`) and the corresponding aether `tool_approval`
submission are paired via `approval_id = correlationId`.

### Workspace blob naming (context, not tested by preset)

Aether's OpenClaw containers use `wuclaw-{hash(tenant_id|user_id)}` blob
prefix (vs `wu-{hash(tenant_id)}` for Claude containers). This naming is
an aether-internal concern handled in `grpc_stream_manager.py` and
`plex_session_hook.py` — it's not a plugin-contract concern, so the
sim does not simulate blob provisioning. Scenarios under aether preset
use the aether identity format so Wepwawet's real-integration plan can
add blob wiring without touching the plugin contract.

### File ingest (delegated to aether, not sim concern)

`POST /v1/conversations/{cid}/files` handles file upload with parallel
container + blob upload and MIP sensitivity-label delegation. These are
aether-internal concerns. Plan 5's RESTRICTED file-ingest scenarios
dispatch under aether, but they assert plugin-level behaviour
(`FileIngestProvider.beforeIngest` decision, sensitivity propagation to
G-CHAIN) not aether's MIP layer.

## LayerConfig

```ts
const aetherPreset: HostPresetConfig = {
  name: 'aether',
  decide: {
    providers: [/* GuardrailProvider + FileIngestProvider fixtures */],
    mergerMode: 'strict-oc7',
  },
  track:         { mode: 'sidecar' },
  enforceReview: { companionMode: 'aether-sink', signer: 'aether-session-principal' },
  workspace:     { mount: 'snapshot-RO' },
  scope:         '@bic/openclaw',
  aether: {
    tenantIsolationMiddleware: 'enabled',
    conversationAuthz: 'require-ownership',
    containerPolicyOverrides: new Map([
      ['openclaw', [
        { server: 'filesystem', tool: 'write', requires_approval: true },
      ]],
    ]),
    toolApprovalSink: 'three-tier',
    compositeIdentityFormat: 'tenant:user:session',
  },
};
```

Key values:

- `track.mode: 'sidecar'` — aether uses a single snap instance (tenancy is
  a pre-plugin concern handled in middleware; snap doesn't need to be
  multi-instance)
- `companionMode: 'aether-sink'` — approvals flow to `/v1/tool-approval`
  (3-tier routing), not a generic HTTP companion
- `signer: 'aether-session-principal'` — approvals are authenticated by
  the session principal (JWT user_id on the incoming submission), same
  identity model aether enforces on every `/v1/*` route
- `workspace.mount: 'snapshot-RO'` — workspace materialized from a
  snapshot + mounted read-only; promotes rehydrate (stricter than
  lobster's `container-RO`)
- `aether.tenantIsolationMiddleware: 'enabled'` — real aether default;
  required for tenant-bound scenarios
- `aether.conversationAuthz: 'require-ownership'` — matches
  `validate_conversation_access(require_ownership=True)` default
- `aether.containerPolicyOverrides` — populated with `openclaw_policies`
  per scenario fixtures

## Preset-specific scenarios (5)

### `middleware-enforced-tenant-isolation`

The structural guarantee. Wires the `TenantIsolationMiddleware` stand-in
in front of the plugin; fires a request with JWT claims for tenant A;
asserts that the `AuthorizationContext` reaching the plugin is bound to
tenant A with no raw tenant field reachable via the request body or
headers (only via `ctx.principal.tenantId` after middleware resolution).
Fires a second request with mismatched claims (composite conversation ID
for tenant B, JWT claims for tenant A); asserts the request is rejected
at middleware with `TENANT_ISOLATION_VIOLATION` before the plugin runs.

Mirrors `tenant_isolation.py::dispatch` exhaustively.

### `container-type-policy-override`

Seeds `ApprovalPolicyRegistry` with a default policy set (e.g.,
`[{server: 'filesystem', tool: 'write', requires_approval: false}]`) AND
an `openclaw_policies` override
(`[{server: 'filesystem', tool: 'write', requires_approval: true}]`).
Fires tool invocations with each `container_type` in turn; asserts
resolution: `container_type === 'openclaw'` → requires_approval=true
(override wins); `container_type === 'claude'` → requires_approval=false
(default). Additionally asserts `resolve()` = union: when proto_flag=true
overrides registry_false to produce requires_approval=true.

Mirrors `policy_registry.py::resolve` union contract.

### `tenant-scoped-onSnapshotPromoted`

Two agent sessions, distinct composite identities; each session has an
active plugin with registry N. Snapshot promote for tenant B's session
fires `onSnapshotPromoted` on B's plugin; **does not fire** on A's
plugin. The scoping is a consequence of per-request tenant_context
being bound at middleware time: each plugin instance is request-scoped;
promotes destined for a different tenant are delivered to that tenant's
live plugin instances only.

This is isolation invariant (iv) from the R1 split, reframed to
aether's actual per-request scoping model.

### `tool-approval-sink-cross-link`

Plugin emits a `DecisionEntry` with `decision: 'review'` and
`correlationId: <uuid>`. The sim's `/v1/tool-approval` stand-in receives
a `ToolApprovalSubmission` with `approval_id = correlationId`; scenario
asserts `approval_id` on the submission matches `correlationId` on the
decision entry 1:1. On approval, the corresponding `ApprovalEntry` is
paired via `correlationId`; `claws policy verify` walks the pair.

No `CrossTenantAccessDeniedEntry` is written — cross-tenant attempts
are rejected at middleware before the plugin runs (see
`middleware-enforced-tenant-isolation`). The sink scenario asserts the
normal decision → approval round-trip specifically, not tenant denial.

Mirrors `tool_approval.py::submit_tool_approval` as the audit surface.

### `composite-identity-propagation`

Simulated middleware populates `AuthorizationContext.principal` with
`{ tenantId, userId, sessionId }` parsed from the simulated JWT.
Scenario asserts:

1. Primary path: `ctx.principal` matches JWT claims directly
2. Reconnect-style fallback: `ctx.principal` is populated from actor
   state when request_context is unavailable (simulates gRPC reconnect)
3. Brand-new conversation: identity is parsed from `actor_id`
   (`tenant:user:session` format) when neither JWT nor actor state has
   it — matches aether's last-resort parse

Each branch maps to
`aether_runtime/src/adapter/actors/actor_context.py::resolve_identity`.

## RESTRICTED file-ingest scenarios run here

Plan 5 owns the RESTRICTED file-ingest behavioural suite. Those scenarios
run under aether via the dispatcher because aether's identity model
supplies the session principal that the review flow depends on.
openclaw's stdin HITL and lobster's cowork-supervisor don't model the
aether session-principal shape — skip rules in plan 5's suite metadata
declare this.

The `/v1/conversations/{cid}/files` endpoint delegates to MIP for
sensitivity labeling; this is aether-internal and not simulated.
Scenarios assert plugin-level behaviour
(`FileIngestProvider.beforeIngest` decision + G-CHAIN sensitivity
propagation), not aether's MIP layer.

See `governance--file-ingest-review.md` for the full flow.

## Snapshot-switch semantics — non-uplift rule

The non-uplift rule (in-flight calls complete against registry N, next
calls use N+1) is asserted by `mid-session-promote-snapshot-semantics`
under aether's dispatcher row. `CL-07-amendment-snapshot-switch-semantics.md`
§1a defines the four-rule semantics. The aether preset exercises Rule 4
specifically — session-principal mid-session promote cannot uplift an
in-flight call's registry.

See `specs/CL-07-deep-integration.md` §1a for
the normative four-rule form.

## Scope-flip runs here too

The cross-preset parity gate (`scope-flip-byte-identical.e2e.test.ts`)
compiles the fixture under both scopes and asserts byte-identical
artifacts. Running under aether catches aether-specific scope embedding
bugs (e.g., a JWT-claims or composite-identity field that accidentally
leaks a scope string into the aether middleware serialization).

## Cross-references

- `testing--host-presets.md` — matrix model
- `host-presets--openclaw.md` — Layer 1+3 purity (no middleware)
- `host-presets--lobster.md` — single-tenant sidecar shape (no middleware)
- `testing--e2e-harness.md` — harness middleware chain for aether preset
- `governance--approval-flow.md` — session-principal signer + handle binding
- `governance--file-ingest-review.md` — RESTRICTED review flow (primary
  aether dispatch target)
- `openclaw-upstream-spec.md` §5.9 (tenancy at host, not snap) and
  §5 property 6 (content-addressable snapshots)
- `claws-sim-host-presets.md` H3 — authoritative scenario list
- Aether source references (mirror-targets for the preset stand-ins):
  - `aether_runtime/src/adapter/api/middleware/tenant_isolation.py`
  - `aether_runtime/src/adapter/api/middleware/conversation_authz.py`
  - `aether_runtime/src/adapter/domain/approval/policy_registry.py`
  - `aether_runtime/src/adapter/api/v1/tool_approval.py`
  - `aether_runtime/src/adapter/actors/actor_context.py` (for
    `resolve_identity` fallback chain)
