/**
 * @bic/claws-test — testing framework for claws-governed OC skills.
 *
 * Provides scenario replay and governance validation.
 *
 * @module @bic/claws-test
 */

// Types
export type {
  FindingSeverity,
  CheckFinding,
  CheckResult,
  ValidationResult,
  ParsedScenario,
  BehaviorDelta,
  ScenarioResult,
  GovernanceCheckInput,
  ToolCheckInput,
  AgentCheckInput,
  ReasoningLimits,
  GovernanceCheck,
} from './types.js';

// Scenario
export { parseScenarios } from './scenario/parser.js';
export {
  runScenario,
  runAllScenarios,
  parseDeclaredBehavior,
  compareBehavior,
} from './scenario/runner.js';
export type {
  HandlerResult,
  SkillHandlerAdapter,
  DeclaredBehavior,
} from './scenario/runner.js';

// Governance
export { validate, validateSubset } from './governance/validator.js';

// Security
export { scan, getAllRules } from './security/scanner.js';
export type { SecurityFinding, SecurityRule, ScanResult } from './security/scanner.js';

// Matchers
export { registerMatchers } from './matchers/index.js';
export {
  toPassGovernance,
  toHaveRiskLevel,
  toRequireElicitation,
  toPassSecurityScan,
} from './matchers/governance.js';
export type { ScanInput } from './matchers/governance.js';

// GatewaySim
export { GatewaySim } from './gateway-sim.js';
export type {
  AuditEntry,
  FireResult,
  GatewaySimOptions,
  ResetOptions,
} from './gateway-sim.js';

// Mock Governance Host
export { MockGovernanceHost } from './gateway-sim/mock-governance-host.js';
export type {
  GovernanceHost,
  MockGovernanceHostConfig,
  PolicyResult,
  RiskResolution,
  DiagnosticReport,
} from './gateway-sim/mock-governance-host.js';

// Tool Call Builder
export { ToolCallBuilder, toolCall } from './tool-call-builder.js';
export type { ToolCallPayload } from './tool-call-builder.js';

// SimReport
export { SimReport, hasRegressions, diffSeverity } from './gateway-sim/report.js';
export type {
  EnforcementEntry,
  EnforcementOutcome,
  WorkspaceMetadata,
  SiemEntry,
  SimReportJSON,
  ToolDiff,
  SimDiff,
  DiffSeverity,
} from './gateway-sim/report.js';

// Plugin Loader
export { PluginLoadError } from './gateway-sim/plugin-loader.js';
export type { PluginHooks } from './gateway-sim/plugin-loader.js';

// Timing
export type { TimingEntry, TimingBaseline } from './gateway-sim/timing.js';

// Gateway Matchers
export {
  toBlock,
  toAllow,
  toElicit,
  toHaveAuditEntries,
  toEnforceWithin,
  toHaveValidAuditChain,
} from './matchers/gateway.js';
