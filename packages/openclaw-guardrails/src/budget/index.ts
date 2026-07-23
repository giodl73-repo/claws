/**
 * @bic/openclaw-guardrails/budget
 *
 * Token + cost controls with threshold alerts and onExhausted policy, per
 * guardrails.md §/budget.
 */

export type {
  BudgetDecision,
  BudgetEvent,
  BudgetPolicy,
  BudgetThreshold,
  BudgetWindow,
  CostRecord,
  OnExhausted,
  ThresholdAction,
  ThresholdAlert,
} from "./types.js";

export { createBudgetMeter, InMemoryBudgetMeter } from "./meter.js";
export type { BudgetMeter } from "./meter.js";
