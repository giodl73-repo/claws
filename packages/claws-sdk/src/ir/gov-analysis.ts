/**
 * GovAnalysis — governance analysis results from the compilation pass.
 *
 * @module claws-sdk/ir/gov-analysis
 */

import type { RuleLevel } from './fail-mode.js';

/**
 * A bidirectional fix suggestion — offers both a "tighten" and "relax"
 * direction so the operator can choose how to resolve a violation.
 */
export interface FixSuggestion {
  /** Direction: tighten the rule or relax the constraint. */
  readonly direction: 'tighten' | 'relax';
  /** Human-readable description of the suggested fix. */
  readonly description: string;
  /** The rule or config field to modify. */
  readonly target: string;
}

/**
 * A tool name fuzzy-match suggestion when a violation references
 * a tool that may be misspelled or renamed.
 */
export interface ToolFuzzyMatch {
  /** The original (possibly wrong) tool name from the rule. */
  readonly original: string;
  /** Suggested correct tool name. */
  readonly suggestion: string;
  /** Similarity score (0–1). */
  readonly score: number;
}

/**
 * A policy violation detected during compilation.
 */
export interface GovViolation {
  readonly ruleId: string;
  readonly level: RuleLevel;
  readonly message: string;
  readonly target: string;
  /** Diagnostic code for machine-readable identification. */
  readonly diagnosticCode: string;
  /** Bidirectional fix suggestions — both tighten and relax options. */
  readonly fixSuggestions: readonly FixSuggestion[];
  /** Fuzzy-match suggestions when the tool name may be wrong. */
  readonly toolFuzzyMatches: readonly ToolFuzzyMatch[];
}

/**
 * A warning that does not block compilation but should be surfaced.
 */
export interface GovWarning {
  readonly ruleId: string;
  readonly level: RuleLevel;
  readonly message: string;
  /** Sub-rule diagnostic code (e.g. G-INPUT-01, G-CONTEXT-02). */
  readonly subRuleDiagnosticCode: string;
  /** Category prefix for the sub-rule (e.g. "G-INPUT", "G-CONTEXT"). */
  readonly category: string;
  /** Numeric suffix within the category (1–99). */
  readonly subRuleIndex: number;
}

/**
 * Per-channel redaction configuration in the enforcement plan.
 */
export interface ChannelRedactionConfig {
  /** Channel name (e.g. "audit-log", "user-response", "siem-export"). */
  readonly channel: string;
  /** Fields to redact in this channel. */
  readonly redactedFields: readonly string[];
  /** Whether to fully suppress the event in this channel. */
  readonly suppress: boolean;
}

/**
 * A rule suppression marker — allows temporarily disabling a rule
 * with audit trail.
 */
export interface RuleSuppressionMarker {
  /** The suppressed rule ID. */
  readonly ruleId: string;
  /** Reason for suppression. */
  readonly reason: string;
  /** ISO 8601 expiration timestamp (empty string = no expiry). */
  readonly expiresAt: string;
  /** Who authorized the suppression. */
  readonly authorizedBy: string;
}

/**
 * The enforcement plan — what the runtime should do about analysis results.
 */
export interface EnforcementPlan {
  readonly blockedTools: readonly string[];
  readonly requiredApprovals: readonly string[];
  readonly auditOnlyRules: readonly string[];
  /** Per-channel redaction configuration. */
  readonly channelRedactions: readonly ChannelRedactionConfig[];
  /** Rule suppression markers with audit trail. */
  readonly ruleSuppressions: readonly RuleSuppressionMarker[];
}

/**
 * A reclassification table entry — documents when a tool's original
 * classification was overridden by policy.
 */
export interface ReclassificationEntry {
  /** Tool name. */
  readonly toolName: string;
  /** Original classification before override. */
  readonly originalLevel: RuleLevel;
  /** Overridden classification. */
  readonly overrideLevel: RuleLevel;
  /** Reason for the reclassification. */
  readonly reason: string;
}

/**
 * Effective R5 count — tracks derived vs overridden R5 reporting.
 */
export interface EffectiveR5Count {
  /** Number of R5 rules derived from policy. */
  readonly derived: number;
  /** Number of R5 rules from explicit overrides. */
  readonly overridden: number;
  /** Total effective R5 count. */
  readonly total: number;
}

/**
 * GovAnalysis — the governance analysis section of GovernanceIR.
 */
export interface GovAnalysis {
  readonly violations: readonly GovViolation[];
  readonly warnings: readonly GovWarning[];
  readonly enforcementPlan: EnforcementPlan;
  /** Tool reclassification table — original vs overridden levels. */
  readonly reclassificationTable: readonly ReclassificationEntry[];
  /** Effective R5 count with derived vs overridden breakdown. */
  readonly effectiveR5Count: EffectiveR5Count;
}
