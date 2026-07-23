/**
 * @bic/openclaw-guardrails/budget — BudgetMeter reference implementation.
 *
 * Rolling-window token / cost meter with threshold alerts. Per guardrails.md
 * §/budget:
 *   check()   returns a `BudgetDecision` for a prospective event.
 *   record()  accounts the actual cost of an executed event.
 *   window()  returns the current window's bounds + spend + limit.
 *
 * Each threshold fires at most once per window lifecycle. Records that push
 * spend past the limit are admitted but the next `check()` returns `exceeded`
 * and the host honors `policy.onExhausted`.
 */

import type {
  BudgetDecision,
  BudgetEvent,
  BudgetPolicy,
  BudgetThreshold,
  BudgetWindow,
  CostRecord,
  ThresholdAlert,
} from "./types.js";

/** The public meter contract per guardrails.md §/budget. */
export interface BudgetMeter {
  check(event: BudgetEvent): Promise<BudgetDecision>;
  record(event: BudgetEvent, actualCost: CostRecord): Promise<void>;
  window(): { start: string; end: string; spent: CostRecord; limit: CostRecord };
}

const WINDOW_MS: Record<BudgetWindow, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

/** Normalized CostRecord with both fields guaranteed present. */
interface Cost {
  tokens: number;
  costUsd: number;
}

function zero(): Cost {
  return { tokens: 0, costUsd: 0 };
}

function norm(c: CostRecord | undefined): Cost {
  return { tokens: c?.tokens ?? 0, costUsd: c?.costUsd ?? 0 };
}

function add(a: Cost, b: Cost): Cost {
  return { tokens: a.tokens + b.tokens, costUsd: a.costUsd + b.costUsd };
}

function subClamp(limit: Cost, spent: Cost): Cost {
  return {
    tokens: Math.max(0, limit.tokens - spent.tokens),
    costUsd: Math.max(0, limit.costUsd - spent.costUsd),
  };
}

function overage(limit: Cost, spent: Cost): Cost {
  return {
    tokens: Math.max(0, spent.tokens - limit.tokens),
    costUsd: Math.max(0, spent.costUsd - limit.costUsd),
  };
}

function fractionUsed(limit: Cost, spent: Cost): number {
  const tokensFrac = limit.tokens > 0 ? spent.tokens / limit.tokens : 0;
  const costFrac = limit.costUsd > 0 ? spent.costUsd / limit.costUsd : 0;
  return Math.max(tokensFrac, costFrac);
}

/** Extract any host-reported cost from the event's `extensions.cost` slot. */
function costOfEvent(event: BudgetEvent): Cost {
  const ext = event.extensions as { cost?: CostRecord } | undefined;
  return norm(ext?.cost);
}

/** In-memory reference `BudgetMeter`. Hosts wire their own stores in production. */
export class InMemoryBudgetMeter implements BudgetMeter {
  private readonly policy: BudgetPolicy;
  private readonly normLimits: Cost;
  private readonly clock: () => Date;

  private windowStart: Date;
  private spent: Cost = zero();
  private firedThresholds = new Set<number>();

  constructor(policy: BudgetPolicy, clock?: () => Date) {
    this.policy = policy;
    this.normLimits = norm(policy.limits);
    this.clock = clock ?? (() => new Date());
    this.windowStart = this.clock();
  }

  async check(event: BudgetEvent): Promise<BudgetDecision> {
    this.rolloverIfNeeded();
    const projectedSpent = add(this.spent, costOfEvent(event));
    const frac = fractionUsed(this.normLimits, projectedSpent);

    if (frac >= 1) {
      return {
        status: "exceeded",
        over: overage(this.normLimits, projectedSpent),
        onExhausted: this.policy.onExhausted,
      };
    }

    const threshold = this.pickFiringThreshold(frac);
    if (threshold !== null) {
      const alert: ThresholdAlert = {
        threshold: threshold.config,
        spent: projectedSpent,
        fractionUsed: frac,
      };
      return {
        status: "threshold",
        remaining: subClamp(this.normLimits, projectedSpent),
        alert,
      };
    }

    return {
      status: "ok",
      remaining: subClamp(this.normLimits, projectedSpent),
    };
  }

  async record(_event: BudgetEvent, actualCost: CostRecord): Promise<void> {
    this.rolloverIfNeeded();
    this.spent = add(this.spent, norm(actualCost));
  }

  window(): { start: string; end: string; spent: CostRecord; limit: CostRecord } {
    this.rolloverIfNeeded();
    const start = this.windowStart.toISOString();
    const end = new Date(this.windowStart.getTime() + WINDOW_MS[this.policy.window]).toISOString();
    return { start, end, spent: this.spent, limit: this.policy.limits };
  }

  private rolloverIfNeeded(): void {
    const now = this.clock();
    const elapsed = now.getTime() - this.windowStart.getTime();
    if (elapsed >= WINDOW_MS[this.policy.window]) {
      this.windowStart = now;
      this.spent = zero();
      this.firedThresholds = new Set();
    }
  }

  private pickFiringThreshold(frac: number): { index: number; config: BudgetThreshold } | null {
    const thresholds = this.policy.thresholds ?? [];
    for (let i = 0; i < thresholds.length; i++) {
      const t = thresholds[i]!;
      if (frac >= t.at && !this.firedThresholds.has(i)) {
        this.firedThresholds.add(i);
        return { index: i, config: t };
      }
    }
    return null;
  }
}

/**
 * Factory. Returns a `BudgetMeter` conforming to guardrails.md §/budget.
 * Clock injectable for deterministic tests.
 */
export function createBudgetMeter(policy: BudgetPolicy, clock?: () => Date): BudgetMeter {
  return new InMemoryBudgetMeter(policy, clock);
}
