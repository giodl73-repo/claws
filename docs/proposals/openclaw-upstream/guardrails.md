# `@openclaw/guardrails` — Package Spec

**Package**: `@openclaw/guardrails`
**Status**: Proposal (draft)
**Date**: 2026-04-18
**Companion to**: `openclaw-upstream-spec.md` (main spec, §1 + §2) · `openclaw-upstream-brief.md` (Peter-facing brief)

---

## Summary

`@openclaw/guardrails` is the single package holding OC governance interfaces plus the six runtime primitives every adopter hits. Top-level exports are the peer interfaces (`GuardrailProvider`, `FileIngestProvider`) and their supporting types. Runtime primitives ship as scoped subpaths so consumers can import only what they use.

One install, one version, one coordination point. Each subpath stands alone semantically — a host can import `@openclaw/guardrails/budget` without ever pulling `/siem`.

---

## Structure

```
@openclaw/guardrails
├── (default)   — GuardrailProvider + FileIngestProvider interfaces,
│                 shared composition rules, fail-closed defaults,
│                 decision vocabulary (allow / deny / review / modify)
├── /audit      — hash-chained, tamper-evident audit log
├── /approvals  — human-in-the-loop approval schema (handles, TTL, categories)
├── /budget     — token + cost controls with threshold alerts
├── /identity   — OIDC/SAML agent identity bridge
├── /siem       — CEF / NDJSON / syslog event formatters
└── /secrets    — pattern + entropy credential leak detection
```

---

## Interfaces (default export)

```ts
export interface GuardrailProvider {
  preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision>;
  postAudit(event: ToolCallEvent, decision: AuthorizationDecision): Promise<void>;
  getCapabilities(): GuardrailCapabilities;
}

export interface FileIngestProvider {
  beforeIngest(event: FileIngestEvent): Promise<IngestDecision>;
  afterIngest(event: FileIngestEvent, decision: IngestDecision): Promise<void>;
  getCapabilities(): FileIngestCapabilities;
}

export type AuthorizationDecision =
  | { decision: 'allow'; riskLevel?: RiskLevel; requiresExternalApproval?: boolean }
  | { decision: 'deny'; reason: string; riskLevel?: RiskLevel }
  | { decision: 'review'; reason: string; approvalHandle?: string; riskLevel?: RiskLevel }
  | { decision: 'modify'; modifiedArguments: unknown; reason?: string;
      riskLevel?: RiskLevel; requiresExternalApproval?: boolean };

// R5 invariant: any provider reporting `riskLevel: 5` forces
// `requiresExternalApproval: true` on the composed winner. Because a `modify`
// winner can compose with an allow-R5 peer, the flag is carried on the
// `modify` variant too — otherwise R5's force-external-approval contract
// would silently drop when `modify` beats `allow` in composition.

export type IngestDecision =
  | { decision: 'allow'; sensitivity?: Sensitivity; requiresExternalApproval?: boolean }
  | { decision: 'deny'; reason: string }
  | { decision: 'review'; reason: string; approvalHandle?: string }
  | { decision: 'modify'; modifiedContent: string; redirectPath?: string; reason?: string };

export type RiskLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type Sensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
```

Full event shapes and composition rules in main spec §1.

### Provider lifecycle (optional) — `ProviderLifecycle` + `HostContext`

Providers that need injected dependencies (audit sink, HMAC signer, identity bridge, current snapshot) MAY implement `ProviderLifecycle`. Hosts call these methods at well-defined points. Providers that don't need lifecycle hooks can omit the interface — the host treats them as stateless.

```ts
export interface HostContext {
  // Injection seams — the host fills these in at init time.
  auditSink: AuditSink;                 // per-tenant, already keyed
  identityBridge: IdentityBridge;        // resolves principals for events
  approvalHandleSigner: (binding: HandleBinding) => Promise<string>;
  snapshot: { id: string; policyIrPath: string } | null;   // current snapshot meta
  stageMode: 'on' | 'off';
  logger: Logger;
}

export interface ProviderLifecycle {
  init?(ctx: HostContext): Promise<void>;                 // called once at registration
  shutdown?(): Promise<void>;                             // called on graceful stop
  onSnapshotPromoted?(meta: SnapshotMeta): Promise<void>; // hot-reload signal
  onStageModeChanged?(next: 'on' | 'off'): Promise<void>; // staging toggle signal
}
```

**Host obligations** (per main spec §1.4a):
- `init(ctx)` is called exactly once per provider registration, before any `preAuthorize` / `beforeIngest` call. All injected dependencies (audit sink, HMAC signer, identity bridge) arrive via `ctx`; a provider MUST NOT construct these at module-load time.
- `onSnapshotPromoted` fires after `snap promote` commits, so providers using PolicyIR can reload.
- `onStageModeChanged` fires when a workspace toggles `stage on` / `off`; providers honor the current mode from this signal.

Subpaths that ship runtime primitives (`/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`) consume `HostContext` seams directly — e.g., `auditSink` is an `AuditSink` from `/audit`; `approvalHandleSigner` is the trusted-plane call-out paired with `/approvals`'s `GovernanceApprovalMetadata`.

---

## Subpaths

### `/audit` — hash-chained audit integrity

Augments OC's existing audit stream with tamper evidence. Each entry is hash-chained over the prior entry; `verify()` detects in-flight mutation. Canonicalization via `@openclaw/workspace/canonicalize` (one canonicalizer, byte-identical across consumers).

```ts
export interface AuditSink {
  append(entry: AuditEntry): Promise<{ entryHash: string }>;
  verify(range?: { from: string; to: string }): Promise<VerifyResult>;
}
export function jsonlExport(iter: AsyncIterable<AuditEntry>): AsyncIterable<string>;
export function cefExport(iter: AsyncIterable<AuditEntry>): AsyncIterable<string>;
export function syslogExport(iter: AsyncIterable<AuditEntry>): AsyncIterable<string>;
```

### `/approvals` — human-in-the-loop schema

Extends OC-core's `ExecApprovalRequest` / `PluginApprovalRequest` with governance metadata. No new wire format — rides in OC's existing `metadata` extension slot.

```ts
export interface GovernanceApprovalMetadata {
  approvalHandle: string;      // signed HMAC — see Semantics below
  contentHash: string;         // binds approval to exact content
  riskLevel?: RiskLevel;
  sensitivity?: Sensitivity;
  category?: 'tool_call' | 'file_ingest' | 'snapshot_promote' | 'policy_generate';
}

export interface ApprovalTimeoutPolicy {
  defaultTtlSeconds: number;   // default 86400 (24h)
  onTimeout: 'deny' | 'escalate';
  escalationTargets?: string[];
}
```

Handle binds `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}`. Response must re-present the same handle; `contentHash` must still match; `sequenceNumber` closes replay-across-handles; `keyId` supports rotation. Fail-closed on TTL expiry unless policy opts into `escalate`.

### `/budget` — token + cost controls

```ts
export interface BudgetMeter {
  check(event: ToolCallEvent | FileIngestEvent): Promise<BudgetDecision>;
  record(event: ToolCallEvent | FileIngestEvent, actualCost: CostRecord): Promise<void>;
  window(): { start: string; end: string; spent: CostRecord; limit: CostRecord };
}
export type BudgetDecision =
  | { status: 'ok'; remaining: CostRecord }
  | { status: 'threshold'; remaining: CostRecord; alert: ThresholdAlert }
  | { status: 'exceeded'; over: CostRecord };
export interface BudgetPolicy {
  window: 'hour' | 'day' | 'month';
  limits: CostRecord;
  thresholds?: Array<{ at: number /* 0..1 */; action: 'alert' | 'throttle' | 'deny' }>;
  onExhausted: 'deny' | 'throttle' | 'alert-only';
}
```

### `/identity` — enterprise SSO

```ts
export interface IdentityBridge {
  verify(token: string): Promise<AgentIdentity>;
  exchange(userToken: string, agentId: string): Promise<string>; // OBO token
  revoke(principal: string): Promise<void>;
}
export interface AgentIdentity {
  agentId: string;
  tenantId: string;
  principal: string;       // sub from OIDC, user from SAML
  claims: Record<string, unknown>;
  obo?: { issuedAt: string; expiresAt: string };
}
```

OIDC + SAML conformance. Revocation checks via introspection endpoint or local CRL cache.

### `/siem` — SIEM event formatters

```ts
export function toCef(entry: AuditEntry): string;
export function toNdjson(entry: AuditEntry): string;
export function toSyslog(entry: AuditEntry, opts?: SyslogOpts): string;
```

Maps `AuditEntry` fields to ArcSight / Splunk / Sentinel / Elastic expected fields. `oc://` URIs pass through unmodified.

### `/secrets` — credential leak detection

```ts
export interface SecretScanner {
  scan(content: string, opts?: ScanOpts): ScanResult;
  registerPattern(pattern: SecretPattern): void;
}
export interface ScanResult {
  findings: SecretFinding[];
  entropy: number;
}
export interface SecretFinding {
  ruleId: string;
  span: { start: number; end: number };
  preview: string;   // masked
  confidence: 'low' | 'medium' | 'high';
}
```

Default rules: AWS / GCP / Azure keys, GitHub / GitLab tokens, private keys (RSA/ED25519/PGP), JWTs, common DB connection strings. Custom pattern registration is an admin-trust-boundary operation.

---

## Dependencies

- `@openclaw/workspace/canonicalize` — peer dep (audit hash input, approval handle binding)
- `@openclaw/workspace/path` — peer dep (SIEM export uses `oc://` URIs; audit entries reference workspace content)

Zero `@microsoft/*` imports. CI-enforced.

---

## Versioning

Semver across the whole package. Additive fields on subpath types are minor bumps; removing subpaths, renaming top-level interfaces, or changing handle-binding algorithms are major bumps.

---

## Testing

- **L0 unit** — each subpath independently. Interface round-trips, composition rules, fail-closed defaults.
- **L1 integration** — subpath pairs (audit + approvals, identity + budget, siem + audit).
- **L2 E2E** — mock OC gateway with a host wiring all subpaths: a tool call exercises `/identity` → `/budget` → `GuardrailProvider` → `/approvals` → `/audit` → `/siem` export.

---

## Open items

- Whether `ApprovalTimeoutPolicy` belongs in `/approvals` or in a sibling config package alongside `/budget` policy shapes.
- Extension slot for custom SIEM formatters (Sentinel-specific schema vs. CEF baseline).
- Binary / base64 / gzip handling in `/secrets` — out of scope for 0.1; documented gap.
