# OpenClaw Governance Contribution — Complete Upstream Specification

**Version**: 1.0.0-draft
**Authors**: Craftworks Team
**Target**: openclaw/openclaw (spec PR) + @openclaw/* packages (npm)
**License**: MIT

---

## Abstract

This document is the complete upstream contribution specification from Craftworks
to the OpenClaw ecosystem. It defines three things:

1. **GuardrailProvider** — a composable governance interface for the OC Gateway
2. **Approval Event Schema** — a transport-agnostic protocol for human-in-the-loop tool approval
3. **Six runtime packages** — standalone governance primitives under the `@openclaw/` scope

Everything in this document works without the claws compiler. No `@craftworks/*` or
`@claws/*` imports. These are genuine ecosystem contributions — runtime primitives
that any OC developer can use, any host can consume, and any tool author can build on.

---

## Quick Start

Three entry points depending on what you need:

- **"I want to add governance to my OC host"** — Read [GuardrailProvider Specification](#1-guardrailprovider-specification). Start with the Composition Model, then the TypeScript interfaces, then the ShellExecProvider reference implementation.
- **"I want portable approval UX"** — Read [Approval Event Schema](#2-approval-event-schema) and `npm install @openclaw/approval-events`.
- **"I want audit trails / budget controls / secret scanning"** — Jump to the package you need ([audit-chain](#3-openclawaudit-chain), [budget-meter](#4-openclawbudget-meter), [identity-bridge](#5-openclawidentity-bridge), [siem-emitter](#6-openclawsiem-emitter), [secret-scanner](#7-openclawsecret-scanner)). Each works standalone.

---

## Table of Contents

1. [GuardrailProvider Specification](#1-guardrailprovider-specification)
2. [Approval Event Schema](#2-approval-event-schema)
3. [Package: @openclaw/audit-chain](#3-openclawaudit-chain)
4. [Package: @openclaw/budget-meter](#4-openclawbudget-meter)
5. [Package: @openclaw/identity-bridge](#5-openclawidentity-bridge)
6. [Package: @openclaw/siem-emitter](#6-openclawsiem-emitter)
7. [Package: @openclaw/secret-scanner](#7-openclawsecret-scanner)
8. [Package: @openclaw/approval-events](#8-openclawapproval-events)
9. [Contribute/Keep Boundary](#9-contributekeep-boundary)
10. [Delivery Roadmap](#10-delivery-roadmap)
11. [Open Questions](#11-open-questions)

---

## 1. GuardrailProvider Specification

### Problem

OpenClaw's Gateway has a single enforcement point: `exec-approvals.json`, a static
allowlist that says "require approval: yes/no" per tool. This is binary — no risk
context, no audit trail, no composition with other governance systems. Hosts like
Aether bolt on their own approval logic, but there's no standard interface for
governance providers to plug into.

### Solution

A composable governance interface that any provider (claws, a custom policy engine,
a manual allowlist) can implement. The OC Gateway calls providers in a chain.
Providers compose — they don't conflict.

### Composition Model

How providers compose at the OC Gateway:

```
Tool call arrives at OC Gateway
        |
        v
  ProviderRegistry.preAuthorize(toolCall)
        |
        |-- Calls Provider A (e.g., ShellExecProvider)
        |-- Calls Provider B (e.g., claws gateway plugin)
        |-- Calls Provider C (e.g., custom corporate policy)
        |
        v
  Compose decisions (deny > review > modify > allow)
  R5 enforcement: if ANY provider reports riskLevel 5,
    requiresExternalApproval is forced to true.
        |
        |-- deny ------------------------------------------------> BLOCKED
        |
        |-- review ----------------------------------------------> HOST REVIEW GATE
        |
        |-- allow + requiresExternalApproval: true
        |         |
        |         v
        |   Host approval gate fires
        |   (ApprovalRequestEvent emitted -- see S2)
        |         |
        |         |-- User approves --> EXECUTE
        |         +-- User denies ----> BLOCKED
        |
        +-- allow + requiresExternalApproval: false -------------> EXECUTE
```

**Empty registry**: If no providers are registered, the registry returns
`{ decision: 'deny', reason: 'No governance providers registered' }`. A governance
system with no providers is fail-closed, not permissive.

### Fail-Mode Specification

When a provider throws an exception during `preAuthorize()`:

| Risk Level | Fail Mode | Behavior |
|------------|-----------|----------|
| R1-R2 | Fail-open | Tool proceeds (low risk, don't block on provider error) |
| R3-R4 | Configurable | Default: fail-closed. Fleet policy can override to fail-open. |
| R5 | Fail-closed | Tool blocked. **Non-negotiable, non-configurable.** |
| Unknown / Missing / Invalid | Fail-closed | No risk classification = treat as R5. **Non-negotiable.** |

The 100ms SLA on `preAuthorize()` exists because governance must not add perceptible
latency to tool execution. If a provider exceeds 100ms, the registry treats it as a
provider exception and applies the fail-mode table above.

### Migration Path

```
Phase 1: exec-approvals.json continues to work (ShellExecProvider wraps it)
Phase 2: New providers register alongside ShellExecProvider
Phase 3: ShellExecProvider deprecated once providers cover all tools
```

No breaking changes. Existing OC deployments that use `exec-approvals.json`
continue to work with zero modification. The `ShellExecProvider` is registered
automatically if `exec-approvals.json` exists and no other providers are configured.

### TypeScript Interface

```typescript
// === Core Types ==============================================================

/**
 * Risk levels for tool classification.
 *
 * R1: READ     -- pure computation, read-only filesystem access
 * R2: WRITE    -- local file writes, local database operations
 * R3: COMMUNICATE -- network access, external API calls
 * R4: EXECUTE  -- shell execution, code execution, production deploy
 * R5: TRANSACT -- on-behalf-of actions, credential forwarding
 */
type RiskLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Coupled risk level + label. Prevents mismatches like { level: 1, label: 'transact' }.
 */
type RiskClassification =
  | { level: 1; label: 'read' }
  | { level: 2; label: 'write' }
  | { level: 3; label: 'communicate' }
  | { level: 4; label: 'execute' }
  | { level: 5; label: 'transact' };

/**
 * A tool call entering the governance pipeline.
 */
interface ToolCall {
  /** MCP server name (e.g., "outlook", "sharepoint_onedrive"). */
  server: string;

  /** Tool name within the server (e.g., "send-email", "delete-file"). */
  tool: string;

  /** Tool input arguments. Providers MAY inspect but MUST NOT modify. */
  arguments: Record<string, unknown>;

  /** Typed context about the calling agent, session, and conversation. */
  context: {
    conversationId: string;
    agentId?: string;
    workspaceId?: string;
    /** Session ID (e.g., "main", "cron:daily-triage", "channel:design-team"). */
    sessionId?: string;
    /** Session type — providers may apply different policies per session type. */
    sessionType?: 'main' | 'cron' | 'channel' | 'agent';
  };

  /** Host-specific context. Consumers MUST ignore unknown keys. */
  extensions?: Record<string, unknown>;
}

// === Authorization Decision (Discriminated Union) ============================

/**
 * Authorization decisions are a discriminated union on the `decision` field.
 * Each variant carries only its valid fields -- invalid states are unrepresentable.
 */
type AuthorizationDecision =
  | AllowDecision
  | DenyDecision
  | ReviewDecision
  | ModifyDecision;

/**
 * Tool call proceeds. Provider may signal the host to gate it.
 */
interface AllowDecision {
  decision: 'allow';

  /**
   * Signals the host to gate this tool call through its approval UX.
   *
   * Default: false.
   * R5 tools: the ProviderRegistry forces this to true regardless of
   * what individual providers set. Non-negotiable.
   */
  requiresExternalApproval?: boolean;

  /** Risk classification (if the provider performs classification). */
  riskLevel?: RiskLevel;

  /** Provider-specific metadata. Consumers MUST ignore unknown keys. */
  metadata?: Record<string, unknown>;
}

/**
 * Tool call is blocked. Agent is informed.
 */
interface DenyDecision {
  decision: 'deny';

  /** Why the tool was blocked. Required for deny decisions. */
  reason: string;

  /** Machine-readable rule identifier. */
  ruleId?: string;

  /** Risk classification (if the provider performs classification). */
  riskLevel?: RiskLevel;

  /** Provider-specific metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Tool call is held for human review. Implicitly requires external approval.
 */
interface ReviewDecision {
  decision: 'review';

  /**
   * Always true for review decisions -- review inherently requires
   * external confirmation. This field is present for consistency
   * but cannot be set to false.
   */
  requiresExternalApproval: true;

  /** Why the tool needs review. */
  reason?: string;

  /** Risk classification (if the provider performs classification). */
  riskLevel?: RiskLevel;

  /** Provider-specific metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Tool call proceeds with modified arguments.
 */
interface ModifyDecision {
  decision: 'modify';

  /** The rewritten arguments. Required for modify decisions. */
  modifiedArguments: Record<string, unknown>;

  /** Signals the host to gate the modified call. */
  requiresExternalApproval?: boolean;

  /** Risk classification (if the provider performs classification). */
  riskLevel?: RiskLevel;

  /** Provider-specific metadata. */
  metadata?: Record<string, unknown>;
}

// === GuardrailProvider Interface =============================================

/**
 * A governance provider that the OC Gateway calls for every tool invocation.
 *
 * Providers implement compile-time, runtime, or hybrid governance.
 * Multiple providers compose via the ProviderRegistry.
 */
interface GuardrailProvider {
  /** Unique provider name (e.g., "claws", "exec-approvals", "custom-policy"). */
  readonly name: string;

  /**
   * Pre-authorize a tool call.
   *
   * Called BEFORE the tool executes. The provider inspects the tool call
   * and returns an authorization decision.
   *
   * MUST be deterministic for the same input (no random, no side effects).
   * MUST complete within 100ms (governance should not add perceptible latency).
   * MUST NOT call external services (use cached/compiled state only).
   *
   * If a provider exceeds 100ms, the registry treats it as a thrown exception
   * and applies the fail-mode table (R5 = fail-closed, R1-R2 = fail-open).
   */
  preAuthorize(toolCall: ToolCall): Promise<AuthorizationDecision>;

  /**
   * Post-audit a tool call and its result.
   *
   * Called AFTER the tool executes (or after a deny/timeout).
   * Fire-and-forget -- failures are logged but do not block the pipeline.
   */
  postAudit(toolCall: ToolCall, result: AuditableResult): Promise<void>;

  /**
   * Describe this provider's capabilities.
   * Called once at Gateway startup for registration and diagnostics.
   */
  getCapabilities(): ProviderCapabilities;
}

/**
 * The result of a tool call, as seen by the audit provider.
 * Discriminated union on `executed`.
 */
type AuditableResult = ExecutedResult | BlockedResult;

interface ExecutedResult {
  executed: true;
  decision: AuthorizationDecision;
  /** The tool's return value (provider MAY redact). */
  output: unknown;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** ISO 8601 timestamp. */
  timestamp: string;
}

interface BlockedResult {
  executed: false;
  decision: AuthorizationDecision;
  /** Why the tool was blocked (deny, timeout, error). */
  blockReason: string;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** ISO 8601 timestamp. */
  timestamp: string;
}

/**
 * Provider capability metadata.
 */
interface ProviderCapabilities {
  /** Human-readable description. */
  description: string;

  /** Semantic version of the provider implementation. */
  version: string;

  /** Which governance capabilities this provider offers. */
  capabilities: {
    /** Provider performs risk classification (R1-R5). */
    riskClassification: boolean;
    /** Provider performs audit trail recording. */
    auditTrail: boolean;
    /** Provider sets requiresExternalApproval for host gating. */
    externalApproval: boolean;
    /** Provider can rewrite tool call arguments (modify decision). */
    argumentModification: boolean;
  };
}

// === Provider Registry (Chain of Responsibility) =============================

/**
 * Chains multiple GuardrailProviders with deterministic priority ordering.
 *
 * Priority: deny > review > modify > allow
 *
 * When multiple providers return different decisions for the same tool call:
 * - Any deny -> deny (strongest wins)
 * - No deny + any review -> review
 * - No deny/review + any modify -> modify (last modify wins)
 * - All allow -> allow
 *
 * R5 enforcement (hardcoded in composition logic, NOT configurable):
 * - If ANY provider in the chain reports riskLevel: 5 on a tool call,
 *   the composed decision has requiresExternalApproval forced to true.
 * - This is enforced by the registry, not by individual providers.
 * - A provider that omits requiresExternalApproval for an R5 tool
 *   is overridden by the registry.
 *
 * requiresExternalApproval is OR'd across all providers -- if ANY provider
 * sets it to true, the final decision carries it.
 *
 * Empty registry: returns { decision: 'deny', reason: 'No providers registered' }
 * and logs a WARNING. A governance system with no providers is fail-closed.
 */
interface ProviderRegistry {
  /**
   * Register a provider. Order of registration determines evaluation
   * order (first registered = first evaluated), but priority ordering
   * determines the final decision. Throws on duplicate name.
   */
  register(provider: GuardrailProvider): void;

  /** Remove a provider by name. */
  unregister(name: string): void;

  /**
   * Pre-authorize a tool call through all registered providers.
   * Returns the composed decision (deny > review > modify > allow).
   * All providers are called regardless of prior decisions.
   */
  preAuthorize(toolCall: ToolCall): Promise<AuthorizationDecision>;

  /** Post-audit to all registered providers. */
  postAudit(toolCall: ToolCall, result: AuditableResult): Promise<void>;

  /** List all registered providers and their capabilities. */
  listProviders(): ProviderCapabilities[];
}
```

### Reference Implementation: ShellExecProvider

Wraps the existing `exec-approvals.json` as a GuardrailProvider, providing a
migration path for current OC deployments.

```typescript
import { readFileSync } from 'node:fs';

/**
 * ShellExecProvider -- wraps exec-approvals.json as a GuardrailProvider.
 *
 * Reference implementation demonstrating how existing OC governance
 * mechanisms can be wrapped in the new interface without changing behavior.
 */
class ShellExecProvider implements GuardrailProvider {
  readonly name = 'exec-approvals';

  private readonly approvals: Map<string, boolean>;

  constructor(execApprovalsPath: string) {
    const doc = JSON.parse(readFileSync(execApprovalsPath, 'utf-8'));
    this.approvals = new Map();
    for (const entry of doc.tools) {
      this.approvals.set(entry.tool_name, entry.requires_approval);
    }
  }

  /**
   * ShellExecProvider only produces AllowDecision (with or without external
   * approval). This narrowed return type is valid -- covariant with the
   * GuardrailProvider.preAuthorize() signature which returns AuthorizationDecision.
   * Other providers may return any AuthorizationDecision variant.
   */
  async preAuthorize(toolCall: ToolCall): Promise<AllowDecision> {
    const requiresApproval = this.approvals.get(toolCall.tool);

    // Unknown tool -> fail-closed (require approval, classified as R5)
    if (requiresApproval === undefined) {
      return {
        decision: 'allow',
        requiresExternalApproval: true,
        riskLevel: 5,
      };
    }

    return {
      decision: 'allow',
      requiresExternalApproval: requiresApproval,
    };
  }

  async postAudit(): Promise<void> {
    // exec-approvals.json has no audit capability -- no-op
  }

  getCapabilities(): ProviderCapabilities {
    return {
      description: 'Wraps exec-approvals.json as a GuardrailProvider',
      version: '1.0.0',
      capabilities: {
        riskClassification: false,
        auditTrail: false,
        externalApproval: true,
        argumentModification: false,
      },
    };
  }
}
```

---

## 2. Approval Event Schema

### Problem

When `preAuthorize()` returns `{ decision: 'allow', requiresExternalApproval: true }`,
the host must present an approval gate to the user. Today each host invents its own
event format. Approval UX is not portable.

### Solution

Standardize the **event schema** — the JSON shapes for an approval request and
response — without mandating the transport.

### ApprovalRequestEvent

Emitted by the host when a tool call requires human approval.

```typescript
interface ApprovalRequestEvent {
  /** Schema version. Consumers MUST handle unknown versions gracefully. */
  schemaVersion: number;

  /** Fixed discriminator. */
  type: 'approval_request';

  /** Unique ID for correlation with the response. */
  requestId: string;

  /** ISO 8601 timestamp. */
  timestamp: string;

  /** The gated tool call. */
  toolCall: {
    /** MCP server name. */
    server: string;
    /** Tool name. */
    tool: string;
    /** Tool arguments. Hosts MAY redact sensitive fields. */
    arguments?: Record<string, unknown>;
  };

  /** Risk context from the governance provider. */
  risk: RiskClassification & {
    /** Why this tool is gated. */
    reason: string;
  };

  /** Which provider flagged this tool for approval. */
  governance: {
    /** Provider name (e.g., "claws", "exec-approvals"). */
    provider: string;
    /** Rule that triggered the gate. */
    ruleId?: string;
    /** Whether fleet policy was consulted. */
    fleetPolicyApplied: boolean;
  };

  /** Session context for multi-tenant hosts. */
  context: {
    conversationId: string;
    workspaceId?: string;
    agentId?: string;
  };

  /**
   * Host-specific extension fields. Consumers MUST ignore unknown keys.
   * MUST NOT exceed 4KB serialized. MUST NOT contain credentials, tokens, or PII.
   */
  extensions?: Record<string, unknown>;
}
```

**Version negotiation**: `schemaVersion` is `number`, not a literal. Consumers
check the version and handle unknown versions gracefully (skip or use a type guard
like `isV1(event): event is ApprovalRequestEventV1`). When v2 ships, the type
becomes `ApprovalRequestEvent = ApprovalRequestEventV1 | ApprovalRequestEventV2`
with pattern matching on `schemaVersion`.

### ApprovalResponseEvent

Emitted after the user resolves the approval request.

```typescript
interface ApprovalResponseEvent {
  /** Schema version. */
  schemaVersion: number;

  /** Fixed discriminator. */
  type: 'approval_response';

  /** Correlates with ApprovalRequestEvent.requestId. */
  requestId: string;

  /** ISO 8601 timestamp. */
  timestamp: string;

  /** The decision. */
  decision: {
    /** Outcome. */
    status: 'approved' | 'denied' | 'timeout';

    /** Who decided. */
    decidedBy: {
      /** Human, automated policy, or system timeout. */
      type: 'user' | 'policy' | 'system';
      /** Principal identity (optional). */
      identity?: string;
    };

    /** Reason (especially useful for denials). */
    reason?: string;

    /** Time-to-decision in milliseconds (SLA monitoring). */
    durationMs?: number;
  };

  /**
   * Host-specific extension fields. Consumers MUST ignore unknown keys.
   * MUST NOT exceed 4KB serialized. MUST NOT contain credentials, tokens, or PII.
   */
  extensions?: Record<string, unknown>;
}
```

### ApprovalTimeoutPolicy

```typescript
interface ApprovalTimeoutPolicy {
  /** Timeout in milliseconds. Default: 300000 (5 minutes). */
  readonly timeoutMs: number;

  /** What happens on timeout. */
  readonly failMode: 'deny' | 'allow';

  /**
   * Risk levels where failMode 'allow' is prohibited.
   *
   * INVARIANT: R5 (value 5) MUST always be present in this array.
   * It cannot be removed. The JSON Schema enforces this via
   * `contains: { const: 5 }`. Hosts MUST NOT override this.
   *
   * Default: [5].
   */
  readonly alwaysDenyRiskLevels: readonly RiskLevel[];
}
```

### Transport Mapping

The schema is transport-agnostic. Reference mappings for known hosts:

| Host | Transport | Carry Method |
|------|-----------|-------------|
| Aether | SSE | New event type `ta` alongside existing `ts`/`tx` |
| ClawPilot | Electron IPC | `ipcRenderer.send('approval-request', event)` |
| CLI host | stdio | JSON line on stdout, response JSON on stdin |
| Custom | WebSocket | `ws.send(JSON.stringify(event))` |

### End-to-End Sequence

```
    Provider              Gateway              Host              User
       |                    |                   |                  |
       |  preAuthorize()    |                   |                  |
       |<-------------------|                   |                  |
       |                    |                   |                  |
       |  AllowDecision {   |                   |                  |
       |    decision:'allow'|                   |                  |
       |    requiresExt-    |                   |                  |
       |    ernalApproval:  |                   |                  |
       |    true,           |                   |                  |
       |    riskLevel: 5 }  |                   |                  |
       |------------------->|                   |                  |
       |                    |                   |                  |
       |                    |  ApprovalRequest  |                  |
       |                    |  Event            |                  |
       |                    |------------------>|                  |
       |                    |                   |  "Allow send-    |
       |                    |                   |   email?"        |
       |                    |                   |----------------->|
       |                    |                   |                  |
       |                    |                   |  [Deny]          |
       |                    |                   |<-----------------|
       |                    |                   |                  |
       |                    |  ApprovalResponse |                  |
       |                    |  Event            |                  |
       |                    |<------------------|                  |
       |                    |                   |                  |
       |                    |  BLOCKED          |                  |
       |                    |                   |                  |
       |  postAudit()       |                   |                  |
       |<-------------------|                   |                  |
       |  (deny recorded)   |                   |                  |
```

---

## 3. @openclaw/audit-chain

**Hash-chained JSONL audit trails with tamper detection.**

~20KB | MIT | Zero dependencies

`@openclaw/audit-chain` provides chain integrity and multi-format export. The export
functionality covers historical chain data (full trail replay). For live event
streaming to SIEM systems, see `@openclaw/siem-emitter` (Section 6) which handles
real-time event dispatch with batching and buffering.

### API

```typescript
import { AuditChain } from '@openclaw/audit-chain';

// Create a chain (persisted to JSONL file)
const chain = await AuditChain.open('./audit/chain.jsonl', {
  algorithm: 'HMAC-SHA256',    // default
  secret: process.env.AUDIT_SECRET,
});
// Also supports: algorithm: 'Ed25519' with publicKey/privateKey config
// Ed25519 provides non-repudiation (verifier cannot forge entries).
// Use Ed25519 when the verifier is a separate trust boundary (SIEM, fleet manager).

// Append an event
const entry = await chain.append({
  type: 'tool_call',
  tool: 'send-email',
  decision: 'denied',
  reason: 'R5 timeout',
  timestamp: new Date().toISOString(),
});
// entry.hash: 'a3f2...', entry.prevHash: '0000...'

// Verify chain integrity
const result = await chain.verify();
if (!result.intact) {
  console.error(`Chain broken at entry ${result.brokenAt}: ${result.brokenReason}`);
  // Remediation: quarantine the chain file, alert the operator,
  // start a new chain from the last verified entry.
}

// Query events
const denials = await chain.query({ type: 'tool_call', decision: 'denied' });

// Export to standard formats (historical chain data)
const sarif  = await chain.export('sarif');   // SARIF 2.1.0
const cef    = await chain.export('cef');     // ArcSight CEF
const ndjson = await chain.export('ndjson');  // Newline-delimited JSON
const json   = await chain.export('json');    // Flat JSON array
const syslog = await chain.export('syslog');  // RFC 5424

// Prune old entries (keeps integrity -- inserts tombstone)
await chain.prune({ olderThan: '30d' });
```

### Types

```typescript
/**
 * AuditEvent is intentionally loose -- the chain is a generic storage layer
 * that does not constrain event shapes. Consumers SHOULD define their own
 * event unions and use type guards when reading from the chain.
 *
 * Example: type MyEvent = AuditEvent<'tool_call'> | AuditEvent<'approval'>;
 */
interface AuditEvent<T extends string = string> {
  type: T;
  [key: string]: unknown;
}

interface ChainEntry {
  index: number;
  hash: string;
  prevHash: string;
  timestamp: string;
  event: AuditEvent;
}

interface VerifyResult {
  intact: boolean;
  entries: number;
  firstHash: string;
  lastHash: string;
  brokenAt?: number;
  brokenReason?: string;
}

/** Shared across audit-chain (export) and siem-emitter (live dispatch). */
type ExportFormat = 'sarif' | 'cef' | 'json' | 'ndjson' | 'syslog';
```

### Write-Ahead Log (WAL)

Crash recovery via WAL ensures no audit events are lost:

```typescript
// WAL is transparent -- enabled by default
const chain = await AuditChain.open('./chain.jsonl', { wal: true });

// If the process crashes mid-append, recovery is automatic on next open
// WAL is flushed after successful append + fsync
```

### Threat Model

HMAC-SHA256 provides tamper detection against log modification by non-key-holders
(e.g., an agent writing to the log file that doesn't hold the HMAC key). For
protection against a compromised verifier (who holds the symmetric key and could
forge entries), use Ed25519 asymmetric signing where only the writer holds the
private key and verifiers get the public key. Ed25519 is recommended for any
deployment where the verifier is a separate trust boundary.

---

## 4. @openclaw/budget-meter

**Token and cost controls with threshold alerts and throttle enforcement.**

~8KB | MIT | Zero dependencies

### API

```typescript
import { BudgetMeter } from '@openclaw/budget-meter';

const meter = new BudgetMeter({
  maxTokens: 50_000,
  thresholds: [
    { at: 0.80, action: 'warn' },
    { at: 0.95, action: 'warn' },
    { at: 1.00, action: 'throttle' },
  ],
});

// Record token usage
meter.record({ tokens: 1200, cost: 0.012 });

// Check budget status
const status = meter.status();
// { used: 12400, limit: 50000, percent: 0.248, throttled: false }

// Listen for threshold events
meter.on('threshold', (event) => {
  // event: { threshold: 0.80, used: 40200, limit: 50000, action: 'warn' }
});

// Check if a proposed call would exceed budget
const canProceed = meter.canAfford(3000); // true/false

// Handle throttled state
if (status.throttled) {
  // Options: wait for reset, alert the user, or degrade gracefully.
  // meter.reset() clears usage and un-throttles.
}

// Reset (e.g., new conversation turn)
meter.reset();
```

### Types

```typescript
interface BudgetConfig {
  maxTokens: number;
  maxCost?: number;
  thresholds: ThresholdConfig[];
}

interface ThresholdConfig {
  at: number;                  // 0.0 - 1.0
  action: 'warn' | 'throttle';
}

interface ThresholdEvent {
  threshold: number;
  used: number;
  limit: number;
  action: 'warn' | 'throttle';
  timestamp: string;
}

interface BudgetStatus {
  used: number;
  limit: number;
  percent: number;
  throttled: boolean;
}
```

---

## 5. @openclaw/identity-bridge

**Enterprise SSO integration (OIDC/SAML) for OC agent authentication with RBAC.**

~3KB | MIT | Zero dependencies

Token validation is signature-check only using pre-loaded keys. The bridge does NOT
fetch JWKS endpoints at runtime -- keys are provided at construction time via the
`signingKeys` config, either loaded from a local file or pre-fetched during
application startup. This keeps the bridge deterministic and safe for use inside a
`GuardrailProvider.preAuthorize()` path (no network calls).

### API

```typescript
import { IdentityBridge } from '@openclaw/identity-bridge';

const bridge = new IdentityBridge({
  provider: 'oidc',
  issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
  signingKeys: preloadedJwks,  // JWKS loaded at app startup, not at runtime
  roleMapping: {
    'SG-AI-Admins': 'admin',
    'SG-AI-Devs': 'editor',
    'SG-AI-Viewers': 'viewer',
  },
});

// Validate a token and extract identity
const identity = await bridge.validate(bearerToken);
// identity: { sub: '...', roles: ['admin'], groups: ['SG-AI-Admins'] }

// Check RBAC permission
const allowed = bridge.checkPermission(identity, 'build');
// true (admin has build permission)

// Handle validation failure
try {
  const id = await bridge.validate(expiredToken);
} catch (err) {
  // err.code: 'TOKEN_EXPIRED' | 'INVALID_SIGNATURE' | 'MISSING_CLAIMS'
  // Reject the request -- do not fall through to a default identity.
}
```

### Types

```typescript
interface Identity {
  sub: string;
  name?: string;
  email?: string;
  roles: string[];
  groups: string[];
  claims: Record<string, unknown>;
}

interface Role {
  name: string;
  permissions: string[];
}

interface Permission {
  action: string;
  resource?: string;
}
```

---

## 6. @openclaw/siem-emitter

**SOC integration — emit audit events in 5 standard formats.**

~5KB | MIT | Zero dependencies

Handles **live event dispatch** with batching and buffering. For historical chain
export, see `@openclaw/audit-chain`. Both packages share the `ExportFormat` type.

### API

```typescript
import { SiemEmitter } from '@openclaw/siem-emitter';

const emitter = new SiemEmitter({
  format: 'cef',           // 'cef' | 'ndjson' | 'syslog' | 'sarif' | 'json'
  destination: './siem/',
  batchSize: 100,
});

// Emit a governance event
await emitter.emit({
  type: 'tool_blocked',
  tool: 'send-email',
  risk: 5,
  reason: 'R5 timeout denial',
  agent: 'email-drafter',
  timestamp: new Date().toISOString(),
});

// Flush pending events
await emitter.flush();

// Handle emit failure
emitter.on('error', (err) => {
  // err: { event, reason } -- the event that failed to emit and why.
  // Remediation: retry, log to fallback, or alert.
});
```

### Format Examples

**CEF** (ArcSight Common Event Format):
```
CEF:0|OpenClaw|GovernanceAudit|1.0|tool_blocked|Tool Blocked|8|
  src=email-drafter dst=send-email cs1=R5 cs1Label=RiskLevel
  msg=R5 timeout denial
```

**NDJSON** (Newline-Delimited JSON):
```json
{"type":"tool_blocked","tool":"send-email","risk":5,"reason":"R5 timeout denial","agent":"email-drafter","timestamp":"2026-04-15T10:30:00Z"}
```

**Syslog** (RFC 5424):
```
<134>1 2026-04-15T10:30:00Z agent email-drafter GovernanceAudit - -
  tool_blocked: send-email (R5) R5 timeout denial
```

**SARIF** (Static Analysis Results Interchange Format 2.1.0):
```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": { "driver": { "name": "OpenClaw GovernanceAudit", "version": "1.0.0" } },
    "results": [{
      "ruleId": "tool_blocked",
      "level": "error",
      "message": { "text": "send-email blocked: R5 timeout denial" }
    }]
  }]
}
```

---

## 7. @openclaw/secret-scanner

**Credential leak detection for agent workspaces.**

~4KB | MIT | Zero dependencies

### API

```typescript
import { SecretScanner } from '@openclaw/secret-scanner';

const scanner = new SecretScanner({
  patterns: 'default',
  entropyThreshold: 4.5,
  ignoreFiles: ['*.test.ts'],
});

// Scan workspace files
const results = await scanner.scan('./workspace/');
// results.findings: [
//   { file: 'TOOLS.md', line: 42, type: 'api_key', severity: 'high' },
// ]

// Handle findings
if (results.findings.length > 0) {
  for (const f of results.findings) {
    console.warn(`${f.severity}: ${f.type} in ${f.file}:${f.line}`);
  }
}

// Check a single string
const suspicious = scanner.check('sk-ant-api03-abc123...');
// { isSecret: true, type: 'api_key', entropy: 5.1 }
```

### Built-in Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `api_key` | API keys (sk-, pk-, key-) | `sk-ant-api03-...` |
| `bearer_token` | Bearer/JWT tokens | `eyJhbGciOiJ...` |
| `aws_key` | AWS access keys | `AKIA...` |
| `azure_key` | Azure keys and connection strings | `DefaultEndpointsProtocol=...` |
| `github_token` | GitHub PAT/fine-grained tokens | `ghp_...`, `github_pat_...` |
| `password` | Password assignments | `password=`, `passwd:` |
| `private_key` | PEM private keys | `-----BEGIN RSA PRIVATE KEY-----` |
| `connection_string` | Database connection strings | `mongodb://user:pass@...` |

### Entropy Analysis

High-entropy strings (Shannon entropy > threshold) are flagged even if they don't
match a known pattern. This catches custom secrets, hex-encoded tokens, and
base64-encoded credentials that pattern matching alone would miss.

---

## 8. @openclaw/approval-events

**Transport-agnostic approval event helpers for the Approval Event Schema (S2).**

~2KB | MIT | Zero dependencies

### API

```typescript
import {
  createApprovalRequest,
  validateApprovalResponse,
  isTimedOut,
} from '@openclaw/approval-events';

// Build a well-formed request from a tool call + authorization decision
const request = createApprovalRequest({
  toolCall: { server: 'outlook', tool: 'send-email', arguments: { to: '...' } },
  decision: { decision: 'allow', requiresExternalApproval: true, riskLevel: 5 },
  provider: 'claws',
  ruleId: 'G-CLASS-R5',
  conversationId: 'conv-123',
});

// Validate a response conforms to the schema
const validation = validateApprovalResponse(responseEvent);
// { valid: true } or { valid: false, errors: ['missing requestId'] }

// Check if a pending request has timed out
const timedOut = isTimedOut(request, {
  timeoutMs: 300_000,
  failMode: 'deny',
  alwaysDenyRiskLevels: [5],
});
// { expired: true, failMode: 'deny' }
```

### JSON Schema

The package includes JSON Schema files for cross-language validation. These are
generated from the TypeScript types using `typescript-json-schema` with the
`RiskClassification` constraint, `extensions` size limit, and the
`alwaysDenyRiskLevels` invariant (`contains: { const: 5 }`) baked into the schema.

```
packages/approval-events/
  src/types.ts                  # TypeScript definitions (source of truth)
  src/helpers.ts                # createApprovalRequest, validate, isTimedOut
  src/schema-gen.ts             # Generates JSON Schema from TS types
  schema/approval-request.json  # Generated JSON Schema for ApprovalRequestEvent
  schema/approval-response.json # Generated JSON Schema for ApprovalResponseEvent
  schema/timeout-policy.json    # Generated JSON Schema for ApprovalTimeoutPolicy
```

Any language that can validate JSON Schema can use the approval event protocol.
The JSON Schema files are the cross-language contract; the TypeScript types are
the source of truth from which they are generated.

---

## 8b. @openclaw/oc-path

**Universal addressing for OpenClaw workspace files.**

~1KB | MIT | Zero dependencies

Any OC tool (IDE extensions, governance compilers, admin UIs, CLI tools) needs to
reference specific pieces of a workspace: a tool in TOOLS.md, a deny rule in SOUL.md,
a cron job in HEARTBEAT.md. The `oc://` path syntax provides a canonical addressing
scheme.

### API

```typescript
import { parseOcPath, formatOcPath, type OcPath } from '@openclaw/oc-path';

const path = parseOcPath('oc://TOOLS.md/Tools/send-email/risk');
// { file: 'TOOLS.md', section: 'Tools', item: 'send-email', field: 'risk' }

const uri = formatOcPath({ file: 'SOUL.md', section: 'Boundaries' });
// 'oc://SOUL.md/Boundaries'

// Session-scoped
const scoped = parseOcPath('oc://TOOLS.md/Tools/send-email?session=cron:daily');
// { file: 'TOOLS.md', section: 'Tools', item: 'send-email', session: 'cron:daily' }

// Lobster workflow
const step = parseOcPath('oc://lobster.yaml/steps/triage/tools');
// { file: 'lobster.yaml', section: 'steps', item: 'triage', field: 'tools' }

// Skills
const skill = parseOcPath('oc://skills/email-drafter/SKILL.md');
// { file: 'skills', item: 'email-drafter', field: 'SKILL.md' }
```

### Why Upstream

The `oc://` scheme is vendor-neutral — it addresses OC workspace structure, not
claws-specific concepts. Any tool that reads or writes OC workspace files benefits:
- IDE extensions: map `oc://` paths to file:line locations for diagnostics
- Admin UIs: reference specific settings in error messages
- Audit systems: record what was changed using canonical paths
- Governance providers: reference tools and rules in AuthorizationDecision metadata

---

## 9. Contribute/Keep Boundary

The architectural boundary is: contribute **runtime** governance primitives that
anyone could build; keep **compile-time** enforcement that only Craftworks can build.

```
CONTRIBUTE (@openclaw/*)                 KEEP (claws compiler)
----------------------------             ---------------------
Audit chain (hash-chained)               Policy compiler (YAML -> PolicySet)
Budget enforcement                       Guard passes G1-G6
Identity bridge (OIDC/SAML/RBAC)         RELAX governance evaluator
SIEM event emission (5 formats)          Cross-format compilation (7 targets)
Secret detection (patterns + entropy)    CGR emitter
Approval event schema                    Risk classification engine
GuardrailProvider interface              Expression policy enforcement
ShellExecProvider reference impl         claws CLI surface
```

**The moat**: guard passes analyzing skill IR, RELAX-evaluated policies at zero
token cost, cross-compilation to 7 target platforms, and CGR emission integrated
with the full compilation pipeline.

**The contribution**: runtime primitives that make the entire OC ecosystem safer,
whether or not any developer ever installs the claws compiler.

---

## 10. Delivery Roadmap

### Wave 1: Foundation (Weeks 1-4)

| Deliverable | Target |
|-------------|--------|
| GuardrailProvider spec PR -> openclaw/openclaw | Week 1 |
| Approval Event Schema RFC (companion to spec PR) | Week 1 |
| `@openclaw/approval-events` | Week 2 |
| `@openclaw/identity-bridge` | Week 2 |
| `@openclaw/budget-meter` | Week 3 |
| `@openclaw/audit-chain` | Week 4 |

**Gate**: Each package passes its own test suite with >= 90% coverage.
All packages compile standalone with zero `@craftworks/*` imports.

### Wave 2: Ecosystem (Weeks 5-8)

| Deliverable | Target |
|-------------|--------|
| `@openclaw/siem-emitter` | Week 5 |
| `@openclaw/secret-scanner` | Week 6 |
| Policy templates (SOC2, HIPAA, EU AI Act, Minimal) | Week 7 |
| Audit chain format spec (docs) | Week 8 |

### Wave 3: Enterprise (Weeks 9-16)

| Deliverable | Target |
|-------------|--------|
| Community feedback integration | Weeks 9-12 |
| Enterprise extensions (fleet, signing) | Weeks 13-14 |
| Documentation site contributions | Weeks 15-16 |

### Validation

```bash
# Every package, every wave
grep -r '@craftworks' packages/ # -> zero matches
grep -r '@claws' packages/      # -> zero matches
npm run test                     # -> all pass, >= 90% coverage
npm run build                    # -> all compile
```

---

## 11. Open Questions

1. **@openclaw npm scope**: Registration requires OpenClaw foundation agreement.
   Fallback: `@craftworks-oc/` scope.
   *Context*: Without the `@openclaw/` scope, the packages lose the "official ecosystem" signal.
   *Option A*: Negotiate scope access before Wave 1. *Option B*: Publish under `@craftworks-oc/` and migrate later.
   *The community should weigh*: Does the scope matter for adoption, or is the content sufficient?

2. **Tool argument redaction**: Should `ApprovalRequestEvent.toolCall.arguments`
   be required or optional? Hosts may need to redact PII before emitting.
   *Recommended default*: optional. Hosts that can safely include arguments should; others omit.

3. **Batch approval**: "Approve all R3 tools from server X for this session."
   *Option A*: Include in v1 schema. *Option B*: Defer to v2.
   *The community should weigh*: Does batch approval create a "click-through fatigue" bypass for R3 tools, or is it a necessary UX improvement?

4. **Modify decision in approval**: Should users be able to modify tool arguments
   through the approval UX, or just approve/deny?
   *Recommended default*: approve/deny only. Modification is a provider concern, not a user UX concern.

5. **i18n for risk reasons**: `risk.reason` is English. Should there be a
   `risk.reasonKey` for localization?
   *Recommended default*: defer. Reasons are for logs and developer tools, not end-user UX copy.

6. **Standing approvals**: "Always approve read-file from sharepoint."
   *Option A*: Add to the approval event schema. *Option B*: Leave as a host-level feature.
   *The community should weigh*: Standing approvals reduce friction but create a "set and forget" risk surface.

7. **Telemetry**: Anonymous, opt-in install + daily active workspace counts.
   *The community should weigh*: Is telemetry in governance packages acceptable, or does it conflict with the security-first positioning?
