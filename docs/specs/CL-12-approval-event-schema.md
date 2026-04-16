# Approval Event Schema -- OpenClaw Community Standard (Proposal)

**Status**: Draft -- proposed alongside GuardrailProvider spec (Pulse 49)

**Canonical spec**: `design/claws/specs/CL-11-upstream-governance.md` section 2

---

## Problem

When `GuardrailProvider` returns `{ decision: 'allow', requiresExternalApproval: true }`, the host must present an approval gate to the user before the tool invocation proceeds. Today, every host invents its own format:

| Host | Transport | Format |
|------|-----------|--------|
| Aether | SSE | Custom event with ad-hoc JSON payload |
| ClawPilot | IPC | Desktop-native message with proprietary schema |
| CLI | stdio | Plain-text prompt or structured JSON (varies by implementation) |

The result: **approval UX is not portable.** A guardrail provider that works with Aether cannot drive ClawPilot's approval dialog without a host-specific adapter. Tooling authors who build audit dashboards, policy managers, or compliance reporters must reverse-engineer each host's event format independently. Security teams cannot write a single SIEM integration that covers all hosts.

---

## Proposal

Standardize the **event schema** (JSON shapes for approval request and response) without mandating transport. Hosts choose their own transport layer (SSE, IPC, stdio, WebSocket) but emit and consume the same JSON structures. A guardrail provider emits one schema. A host renders one schema. An audit system ingests one schema.

---

## Flow

```
GuardrailProvider.preAuthorize(toolCall)
         │
         ├── { decision: 'deny' }
         │       └── BLOCKED. No approval event emitted.
         │
         ├── { decision: 'allow', requiresExternalApproval: false }
         │       └── ALLOWED. No approval event emitted.
         │
         └── { decision: 'allow', requiresExternalApproval: true }
                 │
                 ▼
          Emit ApprovalRequestEvent
                 │
                 ▼
          Host presents approval gate
                 │
                 ├── User approves  ──► Emit ApprovalResponseEvent (status: 'approved')
                 ├── User denies    ──► Emit ApprovalResponseEvent (status: 'denied')
                 └── Timeout        ──► Emit ApprovalResponseEvent (status: 'timeout')
                                             │
                                             ▼
                                      Apply failMode from
                                      ApprovalTimeoutPolicy
```

Only the third path -- `{ decision: 'allow', requiresExternalApproval: true }` -- produces approval events. The other two paths complete silently (logging is separate from the approval schema).

---

## Schema

### RiskLevel

```typescript
type RiskLevel = 1 | 2 | 3 | 4 | 5;
```

### RiskClassification

A mapped union that pairs each `RiskLevel` with its capability name:

```typescript
type RiskClassification =
  | { level: 1; capability: 'read' }
  | { level: 2; capability: 'write' }
  | { level: 3; capability: 'communicate' }
  | { level: 4; capability: 'execute' }
  | { level: 5; capability: 'transact' };
```

### ApprovalRequestEvent

Emitted by the host when `GuardrailProvider` returns `{ decision: 'allow', requiresExternalApproval: true }`.

```typescript
interface ApprovalRequestEvent {
  /** Always 1 for this version of the schema. */
  schemaVersion: 1;

  /** Discriminator for event routing. */
  type: 'approval_request';

  /** Unique identifier for this approval request. Correlates with the response. */
  requestId: string;

  /** ISO 8601 timestamp of when the request was emitted. */
  timestamp: string;

  /** The tool call that triggered the approval gate. */
  toolCall: {
    server: string;
    tool: string;
    arguments?: Record<string, unknown>;
  };

  /** Risk assessment from the guardrail provider. */
  risk: RiskClassification & {
    /** Human-readable explanation of why this risk level was assigned. */
    reason: string;
  };

  /** Governance metadata. */
  governance: {
    /** Name of the guardrail provider that produced the decision. */
    provider: string;
    /** Identifier of the rule that triggered the approval requirement, if applicable. */
    ruleId?: string;
    /** Whether fleet-level policy was applied to this decision. */
    fleetPolicyApplied: boolean;
  };

  /** Contextual identifiers for correlation and audit. */
  context: {
    conversationId: string;
    workspaceId?: string;
    agentId?: string;
    /** Session ID — tells the approver WHICH session triggered the request. */
    sessionId?: string;
    /** Session type — approval UX can render differently for cron vs main chat. */
    sessionType?: 'main' | 'cron' | 'channel' | 'agent';
  };

  /** Vendor-specific extensions. Hosts and providers may add fields here. */
  extensions?: Record<string, unknown>;
}
```

### ApprovalResponseEvent

Emitted by the host after the approval gate resolves (user decision or timeout).

```typescript
interface ApprovalResponseEvent {
  /** Always 1 for this version of the schema. */
  schemaVersion: 1;

  /** Discriminator for event routing. */
  type: 'approval_response';

  /** Matches the requestId from the corresponding ApprovalRequestEvent. */
  requestId: string;

  /** ISO 8601 timestamp of when the decision was recorded. */
  timestamp: string;

  /** The outcome of the approval gate. */
  decision: {
    /** Whether the tool call was approved, denied, or timed out. */
    status: 'approved' | 'denied' | 'timeout';

    /** Who or what made the decision. */
    decidedBy: {
      type: 'user' | 'policy' | 'system';
      identity?: string;
    };

    /** Human-readable explanation of the decision, if provided. */
    reason?: string;

    /** Elapsed time in milliseconds from request to decision. */
    durationMs?: number;
  };

  /** Vendor-specific extensions. Hosts and providers may add fields here. */
  extensions?: Record<string, unknown>;
}
```

### ApprovalTimeoutPolicy

Controls behavior when an approval request is not resolved within the allotted time.

```typescript
interface ApprovalTimeoutPolicy {
  /** Maximum time in milliseconds to wait for a decision before applying failMode. */
  readonly timeoutMs: number;

  /** What happens when the timeout expires. */
  readonly failMode: 'deny' | 'allow';

  /**
   * Risk levels that are always denied on timeout, regardless of failMode.
   * R5 (transact) MUST always be present in this array and cannot be removed.
   * A conforming implementation MUST reject any configuration that omits RiskLevel 5.
   */
  readonly alwaysDenyRiskLevels: readonly RiskLevel[];
}
```

**Invariant**: `alwaysDenyRiskLevels` MUST contain `5`. A host that accepts a timeout policy without `5` in this array is non-conforming. This ensures that transact-level operations (R5) can never slip through on timeout, even when `failMode` is `'allow'`. The rationale: R5 tools act as the user externally (send email, process payment, call API with user credentials). Allowing them by default on timeout is an unacceptable security posture.

---

## Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Transport-Agnostic** | The schema defines JSON shapes, not delivery mechanisms. Hosts choose SSE, IPC, stdio, WebSocket, or any future transport. The schema remains identical across all of them. |
| **Correlatable** | Every `ApprovalRequestEvent` carries a `requestId`. The corresponding `ApprovalResponseEvent` echoes it. Audit systems join on `requestId` without relying on timestamps or ordering heuristics. |
| **Auditable** | Every event includes `timestamp`, `context.conversationId`, and `governance.provider`. A SIEM integration can reconstruct the full approval chain from events alone, without access to host-internal state. |
| **Extensible** | The `extensions` field on both events allows vendors to attach host-specific metadata without forking the schema. Extensions are opaque to the core schema; hosts that do not recognize them pass them through unchanged. |
| **Vendor-Neutral** | No field references a specific host, product, or company. The schema works for Aether, ClawPilot, third-party CLI tools, and hosts that do not exist yet. |

---

## Transport Mapping

The schema is transport-agnostic, but hosts need concrete guidance on how to carry these events over their chosen transport. The following table maps the standard transports:

| Host | Transport | Mapping |
|------|-----------|---------|
| Aether | SSE | New `'ta'` event type. The `data` field contains the JSON-serialized `ApprovalRequestEvent` or `ApprovalResponseEvent`. |
| ClawPilot | IPC | Native IPC message. The message payload is the JSON-serialized event. Message type discriminator uses the event's `type` field. |
| CLI | stdio | One JSON object per line on stdout. The host reads `type` to distinguish approval events from other output. |
| Custom | WebSocket | JSON message frame. The `type` field serves as the message discriminator within the WebSocket channel. |

Hosts that support multiple transports (e.g., Aether with both SSE and WebSocket) emit the same JSON on each transport. The schema does not change; only the framing does.

---

## Relationship to Existing Specs

```
  ┌──────────────────────────────┐
  │     GuardrailProvider        │
  │  (openclaw-governance-spec)  │
  │                              │
  │  preAuthorize() returns:     │
  │    { decision: 'allow',      │
  │      requiresExternalApproval│
  │      : true }                │
  └──────────────┬───────────────┘
                 │
                 │  triggers
                 ▼
  ┌──────────────────────────────┐
  │   Approval Event Schema      │
  │   (this document)            │
  │                              │
  │  ApprovalRequestEvent        │
  │  ApprovalResponseEvent       │
  │  ApprovalTimeoutPolicy       │
  └──────────────┬───────────────┘
                 │
                 │  consumed by
                 ▼
  ┌──────────────────────────────┐
  │  host-approval-policies.json │
  │  (per-host configuration)    │
  │                              │
  │  Timeout durations           │
  │  Fail modes per risk level   │
  │  UI presentation hints       │
  └──────────────────────────────┘
```

`GuardrailProvider` defines the decision interface. This schema defines the events that flow after the decision. `host-approval-policies.json` configures host-specific behavior (timeouts, fail modes, presentation) that is outside the scope of the event schema itself.

---

## Upstream Contribution Path

The approval event schema ships as the `@openclaw/approval-events` package:

- **Size**: ~2KB (TypeScript type definitions + JSON Schema files)
- **Repository**: Lives in the `openclaw-governance` monorepo alongside `GuardrailProvider` types
- **Contents**: TypeScript interfaces, JSON Schema for runtime validation, and a small set of utility functions (`isApprovalRequest`, `isApprovalResponse`, `validateTimeoutPolicy`)
- **No runtime dependencies**: The package is types and validators only

The contribution sequence:

1. This design rationale document is reviewed within the claws team
2. Draft PR opened against `openclaw/openclaw-governance` with the TypeScript types
3. JSON Schema files generated from the TypeScript types
4. `@openclaw/approval-events` published to npm as a prerelease
5. Aether and CLI hosts adopt the prerelease; ClawPilot follows
6. Stable 1.0 release after two hosts have shipped with it in production

---

## What Aether Changes

Aether currently uses a proprietary SSE event format for tool approval flows. With this schema:

- **New SSE event type**: `'ta'` (tool approval). The `data` field carries the JSON-serialized `ApprovalRequestEvent` or `ApprovalResponseEvent`.
- **Existing events unchanged**: All current SSE event types (`'ce'`, `'me'`, etc.) continue to work as before. The `'ta'` event is additive.
- **Migration**: Aether emits both the legacy format and the `'ta'` event during a transition period. Consumers that understand `'ta'` use it; others fall back to the legacy format. After two release cycles, the legacy format is deprecated.

---

## What Cowork Changes

Cowork (the VS Code extension) listens for Aether's SSE stream. With this schema:

- **Listen for `'ta'` events**: Cowork registers a handler for the `'ta'` SSE event type and deserializes the payload as `ApprovalRequestEvent` or `ApprovalResponseEvent`.
- **Render approval UI**: On `ApprovalRequestEvent`, Cowork presents the approval gate using VS Code's native notification or webview API. The `risk` field drives the severity indicator. The `toolCall` field drives the description.
- **Emit response**: When the user approves or denies, Cowork sends the `ApprovalResponseEvent` back to Aether over the existing response channel.
- **Timeout handling**: Cowork applies the `ApprovalTimeoutPolicy` from the host configuration. If the user does not respond within `timeoutMs`, Cowork emits a response with `status: 'timeout'` and applies `failMode`.

---

## Value to Community

| Audience | Benefit |
|----------|---------|
| **Host implementors** | Build approval gates once against a stable schema instead of reverse-engineering each guardrail provider's proprietary format. New hosts get approval UX for free by implementing the event contract. |
| **Tooling authors** | Audit dashboards, policy managers, and compliance reporters consume one schema across all hosts. No host-specific adapters. |
| **Security teams** | Write a single SIEM integration that ingests approval events from any conforming host. Correlate across Aether, ClawPilot, and CLI deployments with one parser. |
| **Ecosystem** | Guardrail providers that emit the standard schema work on every host without modification. The approval layer becomes a platform feature, not a host-specific implementation detail. |

---

## Open Questions

| Question | Context |
|----------|---------|
| **Argument redaction** | Should `toolCall.arguments` be redacted by default in the `ApprovalRequestEvent`? Arguments may contain sensitive data (file paths, credentials, PII). Redaction would improve privacy but reduce auditability. A middle ground: redact by default, allow hosts to opt into full arguments via policy. |
| **Modify decision** | Should there be a fourth `status` value (`'modified'`) for cases where the user approves but changes the tool arguments? This is relevant for hosts that allow argument editing in the approval dialog. Adding it now is forward-compatible; omitting it means a future schema version bump. |
| **Batch approval** | Should the schema support batch approval (one response covering multiple requests)? Some UIs present "approve all R1-R2 tools" as a convenience. Batch approval could be modeled as multiple individual responses or as a new `ApprovalBatchResponseEvent`. Neither approach is clearly better. |
| **i18n** | The `reason` fields on `risk` and `decision` are free-text strings. Should the schema define a locale field or require machine-readable reason codes alongside human-readable text? Reason codes would enable localized UIs without parsing English strings. |
| **npm scope** | The `@openclaw` scope on npm is not yet registered. The contribution path assumes it will be available. If the scope is taken, alternatives include `@openclaw-governance` or publishing under the `openclaw-` prefix without a scope. |
