/**
 * Core types for @bic/claws-test — scenario results, validation results,
 * check results, and security findings.
 *
 * @module @bic/claws-test/types
 */

/**
 * Severity levels for governance check findings.
 */
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * A single governance check finding.
 */
export interface CheckFinding {
  /** Check that produced this finding. */
  readonly checkName: string;
  /** Severity of the finding. */
  readonly severity: FindingSeverity;
  /** Human-readable description of the issue. */
  readonly message: string;
  /** Actionable remediation hint. */
  readonly remediation: string;
  /** The governance target that triggered the finding (tool name, agent, etc.). */
  readonly target: string;
}

/**
 * Result of a single governance check.
 */
export interface CheckResult {
  /** Check name (e.g. 'risk-level', 'obo-boundary'). */
  readonly name: string;
  /** Whether the check passed. */
  readonly pass: boolean;
  /** Findings produced by the check (empty if pass). */
  readonly findings: readonly CheckFinding[];
}

/**
 * Aggregated result of all governance checks.
 */
export interface ValidationResult {
  /** Whether all checks passed. */
  readonly pass: boolean;
  /** Total number of checks run. */
  readonly totalChecks: number;
  /** Number of checks that passed. */
  readonly passedChecks: number;
  /** Number of checks that failed. */
  readonly failedChecks: number;
  /** Individual check results. */
  readonly checks: readonly CheckResult[];
  /** All findings from all checks. */
  readonly findings: readonly CheckFinding[];
}

/**
 * A parsed scenario from SKILL.md ## Scenarios section.
 */
export interface ParsedScenario {
  /** Scenario name/title. */
  readonly name: string;
  /** Given preconditions. */
  readonly given: string;
  /** When action/trigger. */
  readonly when: string;
  /** Then expected behavior. */
  readonly then: string;
}

/**
 * A behavior delta between declared and actual behavior.
 */
export interface BehaviorDelta {
  /** Field that differs. */
  readonly field: string;
  /** Declared value. */
  readonly declared: string;
  /** Actual value observed. */
  readonly actual: string;
}

/**
 * Result of a scenario replay.
 */
export interface ScenarioResult {
  /** Scenario name. */
  readonly name: string;
  /** Whether the scenario matched declared behavior. */
  readonly pass: boolean;
  /** Behavior deltas found during replay. */
  readonly deltas: readonly BehaviorDelta[];
  /** Error message if the scenario failed to execute. */
  readonly error?: string;
  /** Warnings emitted during scenario execution (e.g. unparseable then-clauses). */
  readonly warnings?: readonly string[];
}

/**
 * Input context for governance checks.
 */
export interface GovernanceCheckInput {
  /** Tools declared in the workspace. */
  readonly tools: readonly ToolCheckInput[];
  /** Agents declared in the workspace. */
  readonly agents: readonly AgentCheckInput[];
  /** Declared risk level code (e.g. 'R3'). */
  readonly declaredRiskLevel?: string;
  /** Declared OBO boundaries. */
  readonly declaredOboBoundaries?: readonly string[];
  /** Declared data labels. */
  readonly declaredDataLabels?: readonly string[];
  /** Declared fail mode. */
  readonly failMode?: 'open' | 'closed';
  /** Whether input validation is present. */
  readonly hasInputValidation?: boolean;
  /** Whether output guards are present. */
  readonly hasOutputGuards?: boolean;
  /** Whether elicitation gates are configured for R5 tools. */
  readonly hasElicitationGate?: boolean;
  /** Whether audit trail is configured. */
  readonly hasAuditTrail?: boolean;
  /** Whether supply chain signatures are present. */
  readonly hasSupplyChainSignature?: boolean;
  /** Bounded reasoning limits. */
  readonly reasoningLimits?: ReasoningLimits;
}

/**
 * Tool input for governance checks.
 */
export interface ToolCheckInput {
  readonly name: string;
  readonly riskLevel: string;
  readonly oboFlag: boolean;
  readonly classification: string;
  readonly dataLabels?: readonly string[];
  readonly trustLabels?: readonly string[];
}

/**
 * Agent input for governance checks.
 */
export interface AgentCheckInput {
  readonly name: string;
  readonly delegatesTo: readonly string[];
  readonly hasTrustBoundary: boolean;
}

/**
 * Bounded reasoning limits.
 */
export interface ReasoningLimits {
  readonly maxSteps?: number;
  readonly maxToolCalls?: number;
  readonly tokenBudget?: number;
  readonly maxRecursionDepth?: number;
}

/**
 * Standard check function signature.
 */
export type GovernanceCheck = (input: GovernanceCheckInput) => CheckResult;
