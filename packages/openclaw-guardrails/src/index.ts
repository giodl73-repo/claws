/**
 * @bic/openclaw-guardrails — Default export.
 *
 * Peer interfaces, decision vocabulary, supporting types, and the
 * ShellExecProvider reference implementation. Runtime primitives for each
 * governance concern live as subpath exports:
 *
 *   @bic/openclaw-guardrails/audit      — hash-chained audit log
 *   @bic/openclaw-guardrails/approvals  — human-in-the-loop schema
 *   @bic/openclaw-guardrails/budget     — token + cost controls
 *   @bic/openclaw-guardrails/identity   — OIDC/SAML + RBAC
 *   @bic/openclaw-guardrails/siem       — CEF/NDJSON/syslog formatters
 *   @bic/openclaw-guardrails/secrets    — credential leak detection
 */

// Peer interfaces + decision types + capabilities
export type {
  AuthorizationDecision,
  FileIngestCapabilities,
  FileIngestEvent,
  FileIngestProvider,
  GuardrailCapabilities,
  GuardrailProvider,
  IngestDecision,
  RiskLevel,
  Sensitivity,
  ToolCallEvent,
} from './types.js';

// Provider lifecycle + host context
export type { HostContext, ProviderLifecycle } from './types.js';

// 5 supporting types (gateway-eng M1 closure)
export type {
  AgentIdentity,
  AuditEntrySummary,
  AuditSink,
  HandleBinding,
  IdentityBridge,
  Logger,
  SnapshotMeta,
} from './types.js';

// Composition engine (guardrails.md §Summary — "shared composition rules")
export { ProviderRegistryImpl, composeDecisions } from './registry.js';

// Reference implementation
export { ShellExecProvider } from './shell-exec-provider.js';
