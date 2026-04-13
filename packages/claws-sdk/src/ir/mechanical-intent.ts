/**
 * Mechanical intent types — the 5 governance actions the compiler can emit.
 *
 * Each intent represents a discrete governance enforcement that maps to
 * a concrete runtime action in the OC Gateway.
 *
 * @module claws-sdk/ir/mechanical-intent
 */

import type { RuleLevel } from './fail-mode.js';

/**
 * Base fields shared by all mechanical intents.
 */
export interface IntentBase {
  /** Unique identifier for this intent instance. */
  readonly id: string;
  /** Rule ID that produced this intent (e.g. "SEC-001"). */
  readonly ruleId: string;
  /** Severity level of the originating rule. */
  readonly level: RuleLevel;
  /** Human-readable description of what the intent enforces. */
  readonly description: string;
  /** Estimated latency in milliseconds for applying this intent at runtime. */
  readonly estimatedLatencyMs?: number;
}

/**
 * DenyIntent — blocks a tool call or action outright.
 */
export interface DenyIntent extends IntentBase {
  readonly kind: 'deny';
  /** The tool or action pattern to deny (glob). */
  readonly target: string;
  /** Reason shown to the user when denied. */
  readonly reason: string;
}

/**
 * ElicitIntent — requires user confirmation before proceeding.
 */
export interface ElicitIntent extends IntentBase {
  readonly kind: 'elicit';
  /** The tool or action pattern requiring confirmation. */
  readonly target: string;
  /** Prompt shown to the user for confirmation. */
  readonly prompt: string;
}

/**
 * RequireIntent — mandates a precondition before tool execution.
 */
export interface RequireIntent extends IntentBase {
  readonly kind: 'require';
  /** The precondition that must hold (expression or check name). */
  readonly condition: string;
  /** Message when the precondition fails. */
  readonly failMessage: string;
}

/**
 * LimitIntent — constrains a numeric or enumerable property.
 */
export interface LimitIntent extends IntentBase {
  readonly kind: 'limit';
  /** The property or metric being limited. */
  readonly property: string;
  /** Maximum allowed value. */
  readonly max: number;
  /** Unit of measurement (e.g. "calls/hour", "bytes"). */
  readonly unit: string;
}

/**
 * LabelIntent — attaches metadata/tags for audit trail purposes.
 */
export interface LabelIntent extends IntentBase {
  readonly kind: 'label';
  /** The label key. */
  readonly key: string;
  /** The label value. */
  readonly value: string;
}

/**
 * Union of all 5 mechanical intent types.
 */
export type MechanicalIntent =
  | DenyIntent
  | ElicitIntent
  | RequireIntent
  | LimitIntent
  | LabelIntent;
