/**
 * ConflictReport — per-tool OBO conflicts, halt-reason for EMIT-blocking
 * conflicts, and multi-constraint aggregated conflict support.
 *
 * Type ownership: this is the ONLY location for ConflictReport.
 * P12 (cross-file conflicts) imports from ir/, does NOT define its own.
 *
 * @module claws-sdk/ir/conflict-report
 */

import type { RuleLevel } from './fail-mode.js';

/**
 * Severity of a conflict — determines whether it blocks EMIT.
 */
export type ConflictSeverity = 'error' | 'warning' | 'info';

/**
 * A per-tool OBO conflict — NOT aggregated across tools.
 * Each conflict instance identifies a specific tool and the
 * conflicting constraints.
 */
export interface OboConflict {
  /** The specific tool with conflicting OBO constraints. */
  readonly toolName: string;
  /** Rule that grants OBO permission. */
  readonly grantRuleId: string;
  /** Rule that restricts or denies OBO permission. */
  readonly denyRuleId: string;
  /** Severity of this conflict. */
  readonly severity: ConflictSeverity;
  /** Rule levels of the conflicting rules. */
  readonly grantLevel: RuleLevel;
  readonly denyLevel: RuleLevel;
  /** Human-readable description of the conflict. */
  readonly description: string;
  /**
   * OBO-WITHOUT-ELICIT breaking change annotation.
   * True when OBO is granted without a corresponding elicit gate,
   * which is a breaking change that must be surfaced.
   */
  readonly oboWithoutElicit: boolean;
}

/**
 * A multi-constraint aggregated conflict — when 3+ rules create
 * a conflict that cannot be resolved pairwise.
 */
export interface MultiConstraintConflict {
  /** The tool or resource at the center of the conflict. */
  readonly target: string;
  /** All rule IDs involved in the conflict. */
  readonly ruleIds: readonly string[];
  /** Severity of the aggregated conflict. */
  readonly severity: ConflictSeverity;
  /** Human-readable summary. */
  readonly description: string;
}

/**
 * ConflictReport — the complete conflict analysis for a governance compilation.
 *
 * Per-tool granularity (not aggregates): each OboConflict identifies
 * exactly one tool. Downstream phases use this to decide per-tool behavior.
 */
export interface ConflictReport {
  /** Per-tool OBO conflicts. */
  readonly oboConflicts: readonly OboConflict[];
  /** Multi-constraint aggregated conflicts. */
  readonly multiConstraintConflicts: readonly MultiConstraintConflict[];
  /**
   * Halt-reason — present when at least one error-severity conflict
   * prevents the EMIT phase from proceeding. Null when EMIT can proceed.
   */
  readonly haltReason: string | null;
  /** Whether any OBO-WITHOUT-ELICIT annotations are present. */
  readonly hasOboWithoutElicit: boolean;
  /** Total number of conflicts across all categories. */
  readonly totalConflicts: number;
}
