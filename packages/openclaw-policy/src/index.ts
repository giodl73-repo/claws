/**
 * @bic/openclaw-policy — generator + operational helpers for OpenClaw policy.
 *
 * Top-level exports:
 *   - generate, check, watch, diff      — generator lifecycle
 *   - generateInMemory, finalizeIR      — in-process helpers
 *   - emitPolicyIR, emitPluginCode,
 *     emitAuditManifest                 — policy-level emitters (P51)
 *   - analyze                           — Analyze phase entry
 *   - PolicyIR + per-field types        — re-exported for convenience
 *
 * Subpaths:
 *   - /runtime  — locked ABI for emitted plugins
 *   - /types    — IR type-only imports
 *
 * @module @bic/openclaw-policy
 */

export {
  generate,
  check,
  watch,
  diff,
  generateInMemory,
  finalizeIR,
} from './generator.js';
export type {
  InMemoryArtifacts,
  InMemoryGenerateInput,
  ScopePrefix,
} from './generator.js';

export {
  emitPolicyIR,
  emitPluginCode,
  emitAuditManifest,
  verifyNoForbiddenImports,
  parseScopeArg,
  SCOPE_CHOICES,
  DEFAULT_SCOPE_PREFIX,
} from './emit/index.js';
export type { AuditManifest, EmitPluginOptions } from './emit/index.js';

export {
  analyze,
  canonicalize,
  canonicalHash,
  computePolicyId,
  CANONICALIZER_VERSION,
  parseWorkspaceFile,
  extractTools,
  extractDenyRules,
  buildGovernanceAst,
} from './compile/index.js';
export type {
  ParsedFile,
  WorkspaceAst,
  WorkspaceFileKind,
  GovernanceAst,
} from './compile/index.js';

export type {
  AuthorityBound,
  Boundary,
  Capability,
  CheckResult,
  DenyRule,
  Diagnostic,
  DiffResult,
  Edge,
  GenerateOptions,
  GenerateResult,
  GovernanceRule,
  PolicyIR,
  ProvenanceSource,
  RiskLevel,
  Sensitivity,
  SkillSpec,
  ToolSpec,
  WatchHandle,
} from './types/index.js';

// ── Operational helpers (P52) ────────────────────────────────────────────
export {
  evaluateCompliance,
  renderReport,
  verifyAudit,
  runScenarios,
  startMockGateway,
  parseScenarioYaml,
} from './ops/index.js';
export type {
  ComplianceReport,
  ComplianceRequirementResult,
  ComplianceSummary,
  ComplianceSignature,
  ComplianceEvidenceRef,
  ComplianceEvaluationInput,
  EvaluateComplianceOptions,
  AuditManifestSummary,
  AuditEventSummary,
  Rubric,
  RubricRequirement,
  RubricCheckKind,
  RubricStatus,
  RenderFormat,
  RenderInput,
  ScenarioCase,
  ScenarioCaseResult,
  ScenarioRunOptions,
  ScenarioRunResult,
  ScenarioGiven,
  ScenarioToolCall,
  ScenarioExpect,
  ScenarioExpectAudit,
  MockGatewayOptions,
  MockGatewayHandle,
  AuditEntry,
  VerifyAuditOptions,
  VerifyResult,
} from './ops/index.js';
export {
  loadRubric,
  parseRubricYaml,
  isBuiltInRubricId,
  BUILT_IN_RUBRIC_IDS,
  type BuiltInRubricId,
} from './compliance/index.js';
export {
  applyRules,
  type ApplyResult,
  type GovernanceDecision,
  type GovernanceEvent,
  type GovernanceViolation,
  type ProvenanceTrace,
} from './governance/index.js';
