/**
 * @bic/openclaw-guardrails/budget — Core types per guardrails.md §/budget.
 *
 * The spec shape is `BudgetMeter.check/record/window` + `BudgetDecision`
 * discriminated union + `BudgetPolicy` with `onExhausted` and threshold
 * actions. `CostRecord` is the unit of metering (tokens + USD cost).
 */

import type { FileIngestEvent, ToolCallEvent } from '../types.js';

/** Unit of metering: token counts + USD cost. Either field is optional. */
export interface CostRecord {
  /** Total token count (prompt + completion) consumed by this operation. */
  tokens?: number;
  /** USD cost (floating-point) of this operation. */
  costUsd?: number;
}

/** Budget window — hour, day, or calendar-month rolling. */
export type BudgetWindow = 'hour' | 'day' | 'month';

/** Action to take at a threshold boundary. */
export type ThresholdAction = 'alert' | 'throttle' | 'deny';

/** Action to take once the budget is exhausted. */
export type OnExhausted = 'deny' | 'throttle' | 'alert-only';

/** Threshold configuration: fraction 0..1 of the limit + action. */
export interface BudgetThreshold {
  /** Fraction of the limit at which this threshold fires. 0..1. */
  at: number;
  action: ThresholdAction;
}

/** Threshold alert emitted when `check()` returns status=threshold. */
export interface ThresholdAlert {
  /** Which threshold fired. */
  threshold: BudgetThreshold;
  /** Absolute spend at the moment the alert fired. */
  spent: CostRecord;
  /** Fraction of limit consumed at the moment the alert fired. 0..1. */
  fractionUsed: number;
}

/** Operator-configured budget policy. */
export interface BudgetPolicy {
  window: BudgetWindow;
  limits: CostRecord;
  thresholds?: readonly BudgetThreshold[];
  onExhausted: OnExhausted;
  /** Optional human label for dashboards. */
  label?: string;
}

/** Decision returned by `BudgetMeter.check()` for a prospective operation. */
export type BudgetDecision =
  | { status: 'ok'; remaining: CostRecord }
  | { status: 'threshold'; remaining: CostRecord; alert: ThresholdAlert }
  | { status: 'exceeded'; over: CostRecord; onExhausted: OnExhausted };

/** Event type the meter accepts for both `check()` and `record()`. */
export type BudgetEvent = ToolCallEvent | FileIngestEvent;
