/**
 * Workspace-scoped budget tracking for the PROTECT command group.
 *
 * Reads token usage from the audit chain, reads budget limits from
 * claws.json budgetConfig (or a supplied BudgetLimit), computes usage
 * percentage against configured limits, and checks three threshold
 * levels (80%, 95%, 100%) to fire alerts.
 *
 * @module claws-sdk/protect/budget
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readAuditChain } from '../compliance/audit-chain.js';
import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';
import type {
  BudgetReport,
  BudgetPeriod,
  ThresholdAlert,
  ThresholdLevel,
  BudgetLimit,
  EnforcementMode,
} from './types.js';
import { THRESHOLD_LEVELS } from './types.js';

// ── Token extraction from audit chain ─────────────────────────────────

/**
 * Event type marker for token-usage audit entries.
 * Audit entries with this eventType carry a token count in the `target`
 * field as a stringified integer (e.g. "1500").
 */
const TOKEN_USAGE_EVENT = 'TOKEN_USAGE';

/**
 * Extract token count from an audit chain entry's target field.
 * Returns 0 for non-numeric or missing values.
 */
function parseTokenCount(target: string): number {
  const n = Number(target);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

// ── Budget config from claws.json ─────────────────────────────────────

/**
 * Shape of the `budgetConfig` section in claws.json.
 */
export interface BudgetConfigJson {
  readonly daily: number;
  readonly weekly?: number;
  readonly monthly: number;
  readonly enforcement: EnforcementMode;
}

/**
 * Read budget limits from claws.json's `budgetConfig` field.
 * Returns undefined if the file doesn't exist or has no budgetConfig.
 */
async function readBudgetConfig(workspacePath: string): Promise<BudgetLimit | undefined> {
  try {
    const raw = await readFile(join(workspacePath, CLAWS_CONFIG_FILE), 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    const bc = config['budgetConfig'] as BudgetConfigJson | undefined;
    if (!bc || typeof bc.daily !== 'number' || typeof bc.monthly !== 'number') {
      return undefined;
    }
    const enforcement = bc.enforcement === 'block' ? 'block' : 'warn';
    const weekly = typeof bc.weekly === 'number' ? bc.weekly : 0;
    return { daily: bc.daily, weekly, monthly: bc.monthly, enforcement };
  } catch {
    return undefined;
  }
}

// ── Period filtering ──────────────────────────────────────────────────

/**
 * Return the start-of-period Date for a given period and reference time.
 */
function periodStart(period: BudgetPeriod, now: Date): Date {
  const start = new Date(now);
  if (period === 'daily') {
    start.setUTCHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - day);
    start.setUTCHours(0, 0, 0, 0);
  } else {
    // monthly
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  return start;
}

// ── Threshold checking ────────────────────────────────────────────────

/**
 * Check which thresholds (80%, 95%, 100%) have been triggered.
 */
export function checkThresholds(percentage: number): ThresholdAlert[] {
  return THRESHOLD_LEVELS.map((level: ThresholdLevel) => ({
    level,
    triggered: percentage >= level,
    message: percentage >= level
      ? `Budget at ${percentage.toFixed(0)}% — ${level}% threshold breached`
      : `${level}% threshold not reached (current: ${percentage.toFixed(0)}%)`,
  }));
}

// ── Limit enforcement ─────────────────────────────────────────────────

/**
 * Result of enforcement evaluation.
 */
export interface EnforcementResult {
  /** The period that was checked. */
  readonly period: BudgetPeriod;
  /** Whether the limit was exceeded. */
  readonly exceeded: boolean;
  /** What the enforcement mode dictates: 'warn' or 'block'. */
  readonly action: EnforcementMode;
  /** Human-readable message. */
  readonly message: string;
}

/**
 * Evaluate daily and monthly limit enforcement.
 */
export function evaluateEnforcement(
  dailyUsage: number,
  monthlyUsage: number,
  limits: BudgetLimit,
): EnforcementResult[] {
  const results: EnforcementResult[] = [];

  const dailyExceeded = limits.daily > 0 && dailyUsage >= limits.daily;
  results.push({
    period: 'daily',
    exceeded: dailyExceeded,
    action: limits.enforcement,
    message: dailyExceeded
      ? `Daily limit exceeded: ${dailyUsage}/${limits.daily} tokens (${limits.enforcement})`
      : `Daily usage: ${dailyUsage}/${limits.daily} tokens`,
  });

  const monthlyExceeded = limits.monthly > 0 && monthlyUsage >= limits.monthly;
  results.push({
    period: 'monthly',
    exceeded: monthlyExceeded,
    action: limits.enforcement,
    message: monthlyExceeded
      ? `Monthly limit exceeded: ${monthlyUsage}/${limits.monthly} tokens (${limits.enforcement})`
      : `Monthly usage: ${monthlyUsage}/${limits.monthly} tokens`,
  });

  return results;
}

// ── Main budget function ──────────────────────────────────────────────

/**
 * Full budget result with period breakdown and enforcement.
 */
export interface FullBudgetResult {
  /** Primary report for the requested period. */
  readonly report: BudgetReport;
  /** Threshold alerts for the requested period. */
  readonly alerts: readonly ThresholdAlert[];
  /** Enforcement results (daily + monthly). */
  readonly enforcement: readonly EnforcementResult[];
}

/**
 * Compute workspace budget from audit chain and configured limits.
 *
 * @param workspacePath - Absolute path to workspace root
 * @param options - Optional overrides for period, limits, and reference time
 * @returns Full budget result with report, alerts, and enforcement
 */
export async function budget(
  workspacePath: string,
  options?: {
    period?: BudgetPeriod;
    limits?: BudgetLimit;
    now?: Date;
  },
): Promise<FullBudgetResult> {
  const period = options?.period ?? 'monthly';
  const now = options?.now ?? new Date();

  // Read limits from options or claws.json
  const limits = options?.limits ?? (await readBudgetConfig(workspacePath));
  const effectiveLimits: BudgetLimit = limits ?? { daily: 0, weekly: 0, monthly: 0, enforcement: 'warn' };

  // Read audit chain and filter to TOKEN_USAGE events
  const chain = await readAuditChain(workspacePath);
  const tokenEvents = chain.filter((e) => e.eventType === TOKEN_USAGE_EVENT);

  // Compute period-scoped usage
  const cutoff = periodStart(period, now);
  const periodEvents = tokenEvents.filter((e) => new Date(e.timestamp) >= cutoff);
  const periodUsage = periodEvents.reduce((sum, e) => sum + parseTokenCount(e.target), 0);

  // Compute daily usage (for enforcement)
  const dailyCutoff = periodStart('daily', now);
  const dailyEvents = tokenEvents.filter((e) => new Date(e.timestamp) >= dailyCutoff);
  const dailyUsage = dailyEvents.reduce((sum, e) => sum + parseTokenCount(e.target), 0);

  // Compute monthly usage (for enforcement)
  const monthlyCutoff = periodStart('monthly', now);
  const monthlyEvents = tokenEvents.filter((e) => new Date(e.timestamp) >= monthlyCutoff);
  const monthlyUsage = monthlyEvents.reduce((sum, e) => sum + parseTokenCount(e.target), 0);

  // Choose limit based on period — weekly falls back to daily*7 if not explicitly configured
  const periodLimit =
    period === 'daily'
      ? effectiveLimits.daily
      : period === 'weekly'
        ? (effectiveLimits.weekly > 0 ? effectiveLimits.weekly : effectiveLimits.daily * 7)
        : effectiveLimits.monthly;
  const percentage = periodLimit > 0 ? (periodUsage / periodLimit) * 100 : 0;

  const report: BudgetReport = {
    tokenCount: periodUsage,
    limit: periodLimit,
    percentage,
    period,
  };

  const alerts = checkThresholds(percentage);
  const enforcement = evaluateEnforcement(dailyUsage, monthlyUsage, effectiveLimits);

  return { report, alerts, enforcement };
}
