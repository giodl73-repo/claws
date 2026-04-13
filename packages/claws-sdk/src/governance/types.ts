/**
 * Governance rule types — interfaces for the extensible rule registry.
 *
 * GovernanceRule defines the contract for any rule that can be registered.
 * Violation captures a policy breach with location, severity, and remediation.
 * RuleResult bundles violations from a single rule evaluation.
 *
 * @module claws-sdk/governance/types
 */

import type { CapabilityManifest } from '../ir/capability-manifest.js';

/**
 * Severity levels for governance violations.
 *
 * Ordered by impact: critical > high > medium > low.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * A single governance violation with file:line location and remediation.
 */
export interface Violation {
  /** Rule ID that produced this violation (e.g. "G-CLASS-01"). */
  readonly ruleId: string;
  /** Severity of the violation. */
  readonly severity: Severity;
  /** Source file path (relative to workspace root). */
  readonly file: string;
  /** 1-based line number in the source file. */
  readonly line: number;
  /** Human-readable violation message. */
  readonly message: string;
  /** Remediation guidance. */
  readonly remediation: string;
  /** Unix timestamp (ms) when the violation was produced. */
  readonly timestamp?: number;
  /** Policy version that produced this violation. */
  readonly policyVersion?: string;
}

/**
 * Result of evaluating a single governance rule against a manifest.
 */
export interface RuleResult {
  /** Rule ID that produced this result. */
  readonly ruleId: string;
  /** Whether the rule passed (no violations). */
  readonly passed: boolean;
  /** Violations found by this rule. */
  readonly violations: readonly Violation[];
}

/**
 * GovernanceRule — the contract for an extensible governance rule.
 *
 * Each rule is a function-per-rule: register a function, not a switch case.
 * Rules evaluate a CapabilityManifest and return violations.
 */
export interface GovernanceRule {
  /** Unique rule identifier (e.g. "G-CLASS-01"). */
  readonly id: string;
  /** Human-readable rule name. */
  readonly name: string;
  /** Rule description. */
  readonly description: string;
  /** Evaluate this rule against a capability manifest. */
  evaluate(manifest: CapabilityManifest): RuleResult;
}
