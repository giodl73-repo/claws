/**
 * @bic/openclaw-guardrails — Default export.
 *
 * Peer interfaces, decision vocabulary, supporting types, the upstream
 * adapter (`toTrustedToolPolicy`), and the policy-plugin runtime
 * (`policy-runtime/`). Runtime primitives for each governance concern
 * live as subpath exports:
 *
 *   @bic/openclaw-guardrails/audit            — hash-chained audit log
 *   @bic/openclaw-guardrails/approvals        — human-in-the-loop schema
 *   @bic/openclaw-guardrails/budget           — token + cost controls
 *   @bic/openclaw-guardrails/identity         — OIDC/SAML + RBAC
 *   @bic/openclaw-guardrails/siem             — CEF/NDJSON/syslog formatters
 *   @bic/openclaw-guardrails/secrets          — credential leak detection
 *   @bic/openclaw-guardrails/openclaw-adapter — Decision → upstream PluginToolPolicyDecision
 *   @bic/openclaw-guardrails/policy-runtime   — listening piece (cache + lifecycle)
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

// Upstream adapter — translates GuardrailProvider → upstream's
// PluginTrustedToolPolicyRegistration (vocabulary translation, stateless).
// Per .craft/out/proposals/guardrails-adapter.md.
export { toTrustedToolPolicy } from './openclaw-adapter.js';
export type {
  UpstreamPluginHookBeforeToolCallEvent,
  UpstreamPluginHookToolContext,
  UpstreamPluginToolPolicyDecision,
  UpstreamPluginTrustedToolPolicyRegistration,
} from './openclaw-adapter.js';

// Handle-binding validator (CL-07 §1a + CL-11 §3a first-failing order)
export {
  validateHandle,
  EVALUATION_ORDER,
} from './handle-binding/index.js';
export type {
  ApprovalHandle,
  InvalidReason,
  ValidationContext,
  ValidationDeps,
  ValidationResult,
} from './handle-binding/index.js';
