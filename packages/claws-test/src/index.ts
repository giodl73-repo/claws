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
