/**
 * @bic/openclaw-guardrails — Default-export core types.
 *
 * Peer interfaces, decision vocabulary, supporting types. Interface-only:
 * no runtime body. Subpath-specific runtime implementations live under
 * /audit, /approvals, /budget, /identity, /siem, /secrets.
 */

// ---------------------------------------------------------------------------
// Risk + sensitivity
// ---------------------------------------------------------------------------

/**
 * Risk level on a 0–5 scale.
 *
 * R0: UNCLASSIFIED — never reached in production; sentinel for unclassified tools
 * R1: READ         — pure computation, read-only filesystem access
 * R2: WRITE        — local file writes, local database operations
 * R3: COMMUNICATE  — network access, external API calls
 * R4: EXECUTE      — shell execution, code execution, production deploy
 * R5: TRANSACT     — on-behalf-of actions, credential forwarding
 */
export type RiskLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Content sensitivity label (ISO 27001 / Microsoft Information Protection shape). */
export type Sensitivity = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** A tool call entering the governance pipeline. */
export interface ToolCallEvent {
  server: string;
  tool: string;
  arguments?: Record<string, unknown>;
  context: {
    conversationId: string;
    agentId?: string;
    workspaceId?: string;
    /**
     * Snapshot anchor for policy evaluation. Threaded from upstream's
     * `PluginHookToolContext.snapshotId` (v2 PolicyIR contract Ask §4)
     * through the adapter so providers can locate the active PolicyIR
     * for the turn. Absent in pre-v2 deployments; providers MUST treat
     * absence as "no snapshot anchor" (typically fail-closed).
     */
    snapshotId?: string;
  };
  extensions?: Record<string, unknown>;
}

/** A file-ingest event (chunk-assembler intake, snapshot promotion, etc.). */
export interface FileIngestEvent {
  path: string;
  contentHash: string;
  contentPreview?: string;
  byteLength: number;
  context: {
    conversationId: string;
    agentId?: string;
    workspaceId?: string;
  };
  extensions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Authorization decision (discriminated union)
// ---------------------------------------------------------------------------

export type AuthorizationDecision =
  | { decision: "allow"; riskLevel?: RiskLevel; requiresExternalApproval?: boolean }
  | { decision: "deny"; reason: string; riskLevel?: RiskLevel }
  | { decision: "review"; reason: string; approvalHandle?: string; riskLevel?: RiskLevel }
  | {
      decision: "modify";
      modifiedArguments: unknown;
      reason?: string;
      riskLevel?: RiskLevel;
      requiresExternalApproval?: boolean;
    };

// ---------------------------------------------------------------------------
// Ingest decision (discriminated union)
// ---------------------------------------------------------------------------

export type IngestDecision =
  | { decision: "allow"; sensitivity?: Sensitivity; requiresExternalApproval?: boolean }
  | { decision: "deny"; reason: string }
  | { decision: "review"; reason: string; approvalHandle?: string }
  | { decision: "modify"; modifiedContent: string; redirectPath?: string; reason?: string };

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface GuardrailCapabilities {
  description: string;
  version: string;
  riskClassification: boolean;
  auditTrail: boolean;
  externalApproval: boolean;
  argumentModification: boolean;
}

export interface FileIngestCapabilities {
  description: string;
  version: string;
  sensitivityLabeling: boolean;
  contentModification: boolean;
  externalApproval: boolean;
}

// ---------------------------------------------------------------------------
// Peer interfaces
// ---------------------------------------------------------------------------

export interface GuardrailProvider {
  readonly name: string;
  preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision>;
  postAudit(event: ToolCallEvent, decision: AuthorizationDecision): Promise<void>;
  getCapabilities(): GuardrailCapabilities;
}

export interface FileIngestProvider {
  readonly name: string;
  beforeIngest(event: FileIngestEvent): Promise<IngestDecision>;
  afterIngest(event: FileIngestEvent, decision: IngestDecision): Promise<void>;
  getCapabilities(): FileIngestCapabilities;
}

// ---------------------------------------------------------------------------
// Supporting types (5 named exports per gateway-eng M1)
// ---------------------------------------------------------------------------

/**
 * Minimal audit-sink contract injected into providers via HostContext.
 * The full implementation lives in /audit — this is the plugin-compilation
 * seam so a provider in /approvals can write audit entries without
 * importing the /audit subpath directly.
 */
export interface AuditSink {
  append(entry: AuditEntrySummary): Promise<{ entryHash: string }>;
  verify(range?: { from: string; to: string }): Promise<{ valid: boolean; brokenAt?: string }>;
}

/** Minimum shape required by AuditSink.append callers. The full AuditEvent lives in /audit. */
export interface AuditEntrySummary {
  id?: string;
  timestamp: string;
  source: string;
  actor?: string;
  action: string;
  target: string;
  scope: string;
  outcome: "pending" | "success" | "failed";
  reason?: string;
}

/**
 * Identity bridge contract — OIDC/SAML token validation and OBO exchange.
 * Full impl in /identity; this is the injected handle.
 */
export interface IdentityBridge {
  verify(token: string): Promise<AgentIdentity>;
  exchange(userToken: string, agentId: string): Promise<string>;
  revoke(principal: string): Promise<void>;
}

export interface AgentIdentity {
  agentId: string;
  tenantId: string;
  principal: string;
  claims: Record<string, unknown>;
  obo?: { issuedAt: string; expiresAt: string };
}

/**
 * Handle binding payload — fields that are HMAC-signed to produce the
 * approval handle. The signer is `HostContext.approvalHandleSigner`.
 * Full semantics (TTL, replay protection) live in /approvals.
 */
export interface HandleBinding {
  providerId: string;
  contentHash: string;
  sequenceNumber: number;
  approverPrincipal: string;
  keyId: string;
  ttlSeconds: number;
  nonce: string;
}

/**
 * Snapshot metadata passed to providers on `onSnapshotPromoted`.
 * Full snapshot lifecycle lives in the workspace/snap layer.
 */
export interface SnapshotMeta {
  id: string;
  policyIrPath: string;
  promotedAt: string;
  promotedBy: string;
}

/**
 * Minimal structured logger injected into providers. Intentionally narrow —
 * providers MUST NOT emit to stdout/stderr directly. This is the only seam
 * for host-visible logs; audit entries go through AuditSink.
 */
export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Host context + provider lifecycle
// ---------------------------------------------------------------------------

/**
 * Host-provided context injected into providers at `init`. Providers MUST
 * NOT construct these at module load — the host owns per-tenant keying
 * and wiring.
 */
export interface HostContext {
  auditSink: AuditSink;
  identityBridge: IdentityBridge;
  approvalHandleSigner: (binding: HandleBinding) => Promise<string>;
  snapshot: SnapshotMeta | null;
  stageMode: "on" | "off";
  logger: Logger;
}

export interface ProviderLifecycle {
  init?(ctx: HostContext): Promise<void>;
  shutdown?(): Promise<void>;
  onSnapshotPromoted?(meta: SnapshotMeta): Promise<void>;
  onStageModeChanged?(next: "on" | "off"): Promise<void>;
}
