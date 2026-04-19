/**
 * Types for R5 fail-closed enforcement in the claws free tier.
 *
 * FailClosedResult is a discriminated union: pass or fail.
 * FailClosedViolation captures per-rule details when enforcement denies compilation.
 * EnforcementConfig exists for future paid-tier extensibility but is
 * locked to fail-closed in the free tier.
 *
 * GovAnalysis and ConflictReport types are mirrored from src/ir/ so the
 * enforce module has zero dependencies outside compiler/. This ensures
 * extraction readiness — the enforce module can be lifted out without
 * pulling in the full IR package.
 *
 * @module claws-sdk/compiler/enforce/types
 */

// ── Governance analysis types (mirrored from src/ir/gov-analysis.ts) ──

/**
 * Rule severity level (1–5). Mirrors RuleLevel from src/ir/fail-mode.ts.
 */
export type EnforceRuleLevel = 1 | 2 | 3 | 4 | 5;

export interface FixSuggestion {
  readonly direction: 'tighten' | 'relax';
  readonly description: string;
  readonly target: string;
}

export interface ToolFuzzyMatch {
  readonly original: string;
  readonly suggestion: string;
  readonly score: number;
}

export interface GovViolation {
  readonly ruleId: string;
  readonly level: EnforceRuleLevel;
  readonly message: string;
  readonly target: string;
  readonly diagnosticCode: string;
  readonly fixSuggestions: readonly FixSuggestion[];
  readonly toolFuzzyMatches: readonly ToolFuzzyMatch[];
}

export interface GovWarning {
  readonly ruleId: string;
  readonly level: EnforceRuleLevel;
  readonly message: string;
  readonly subRuleDiagnosticCode: string;
  readonly category: string;
  readonly subRuleIndex: number;
}

export interface EffectiveR5Count {
  readonly derived: number;
  readonly overridden: number;
  readonly total: number;
}

export interface GovAnalysis {
  readonly violations: readonly GovViolation[];
  readonly warnings: readonly GovWarning[];
  readonly enforcementPlan: {
    readonly blockedTools: readonly string[];
    readonly requiredApprovals: readonly string[];
    readonly auditOnlyRules: readonly string[];
    readonly channelRedactions: readonly unknown[];
    readonly ruleSuppressions: readonly unknown[];
  };
  readonly reclassificationTable: readonly unknown[];
  readonly effectiveR5Count: EffectiveR5Count;
}

// ── Conflict report types (mirrored from src/ir/conflict-report.ts) ──

export type ConflictSeverity = 'error' | 'warning' | 'info';

export interface OboConflict {
  readonly toolName: string;
  readonly grantRuleId: string;
  readonly denyRuleId: string;
  readonly severity: ConflictSeverity;
  readonly grantLevel: EnforceRuleLevel;
  readonly denyLevel: EnforceRuleLevel;
  readonly description: string;
  readonly oboWithoutElicit: boolean;
}

export interface MultiConstraintConflict {
  readonly target: string;
  readonly ruleIds: readonly string[];
  readonly severity: ConflictSeverity;
  readonly description: string;
}

export interface ConflictReport {
  readonly oboConflicts: readonly OboConflict[];
  readonly multiConstraintConflicts: readonly MultiConstraintConflict[];
  readonly haltReason: string | null;
  readonly hasOboWithoutElicit: boolean;
  readonly totalConflicts: number;
}

/**
 * Severity levels for fail-closed violations.
 */
export type ViolationSeverity = 'critical' | 'high' | 'medium';

/**
 * A single fail-closed violation: one governance rule that could not
 * be definitively resolved.
 */
export interface FailClosedViolation {
  /** The governance rule ID that triggered the violation. */
  readonly rule: string;
  /** Human-readable context about what was ambiguous or conflicting. */
  readonly context: string;
  /** Severity of the violation. */
  readonly severity: ViolationSeverity;
  /** Human-readable explanation of why compilation was denied for this rule. */
  readonly explanation: string;
}

/**
 * R5 enforcement passed — all rules are definitively resolved.
 */
export interface FailClosedPass {
  readonly ok: true;
  /** Number of rules that were checked. */
  readonly rulesChecked: number;
}

/**
 * R5 enforcement failed — one or more rules could not be definitively resolved.
 */
export interface FailClosedFail {
  readonly ok: false;
  /** Number of rules that were checked. */
  readonly rulesChecked: number;
  /** All violations found during enforcement. */
  readonly violations: readonly FailClosedViolation[];
}

/**
 * Discriminated union: R5 enforcement either passes or fails.
 */
export type FailClosedResult = FailClosedPass | FailClosedFail;

/**
 * Enforcement configuration.
 *
 * In the free tier, `mode` is always `'fail-closed'` and cannot be changed.
 * This type exists for paid-tier extensibility but the free tier ignores it.
 */
export interface EnforcementConfig {
  /** Enforcement mode. Always 'fail-closed' in the free tier. */
  readonly mode: 'fail-closed';
}
