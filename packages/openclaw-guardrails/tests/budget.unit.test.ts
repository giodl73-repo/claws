/**
 * /budget — BudgetMeter.check/record/window per guardrails.md §/budget.
 */

import { describe, expect, test } from "vitest";
import { createBudgetMeter, InMemoryBudgetMeter } from "../src/budget/index.js";
import type { BudgetEvent, BudgetMeter, BudgetPolicy, CostRecord } from "../src/budget/index.js";

function policy(limits: CostRecord, overrides: Partial<BudgetPolicy> = {}): BudgetPolicy {
  return {
    window: "day",
    limits,
    onExhausted: "deny",
    ...overrides,
  };
}

function evt(cost: CostRecord): BudgetEvent {
  return {
    server: "s",
    tool: "t",
    context: { conversationId: "c-1" },
    extensions: { cost },
  };
}

describe("/budget — BudgetMeter (spec shape)", () => {
  test("check() on an empty meter returns ok with full remaining", async () => {
    const meter: BudgetMeter = createBudgetMeter(policy({ tokens: 1000 }));
    const decision = await meter.check(evt({ tokens: 100 }));
    expect(decision.status).toBe("ok");
    if (decision.status === "ok") {
      expect(decision.remaining.tokens).toBe(900);
    }
  });

  test("record() accumulates and subsequent check() sees the spend", async () => {
    const meter = createBudgetMeter(policy({ tokens: 100 }));
    await meter.record(evt({ tokens: 0 }), { tokens: 40 });
    const d = await meter.check(evt({ tokens: 10 }));
    expect(d.status).toBe("ok");
    if (d.status === "ok") {
      expect(d.remaining.tokens).toBe(50);
    }
  });

  test("check() returns threshold with alert once threshold is crossed", async () => {
    const meter = createBudgetMeter(
      policy(
        { tokens: 100 },
        {
          thresholds: [
            { at: 0.5, action: "alert" },
            { at: 0.9, action: "deny" },
          ],
        },
      ),
    );
    await meter.record(evt({ tokens: 0 }), { tokens: 60 });
    const d = await meter.check(evt({ tokens: 0 }));
    expect(d.status).toBe("threshold");
    if (d.status === "threshold") {
      expect(d.alert.threshold.at).toBe(0.5);
      expect(d.alert.fractionUsed).toBeCloseTo(0.6, 5);
    }
  });

  test("thresholds fire at-most-once per window", async () => {
    const meter = createBudgetMeter(
      policy({ tokens: 100 }, { thresholds: [{ at: 0.5, action: "alert" }] }),
    );
    await meter.record(evt({ tokens: 0 }), { tokens: 60 });
    const a = await meter.check(evt({ tokens: 0 }));
    expect(a.status).toBe("threshold");
    const b = await meter.check(evt({ tokens: 0 }));
    expect(b.status).toBe("ok"); // threshold already fired
  });

  test("check() returns exceeded with onExhausted when at-or-over the limit", async () => {
    const meter = createBudgetMeter(policy({ tokens: 10 }, { onExhausted: "throttle" }));
    await meter.record(evt({ tokens: 0 }), { tokens: 10 });
    const d = await meter.check(evt({ tokens: 0 }));
    expect(d.status).toBe("exceeded");
    if (d.status === "exceeded") {
      expect(d.onExhausted).toBe("throttle");
    }
  });

  test("window() returns start/end/spent/limit for the current window", async () => {
    const start = new Date("2026-04-18T00:00:00Z");
    let now = start;
    const meter = createBudgetMeter(policy({ tokens: 100 }), () => now);
    await meter.record(evt({ tokens: 0 }), { tokens: 25 });
    const w = meter.window();
    expect(w.start).toBe(start.toISOString());
    expect(w.limit.tokens).toBe(100);
    expect(w.spent.tokens).toBe(25);
    // end = start + 24h for 'day'
    expect(new Date(w.end).getTime() - new Date(w.start).getTime()).toBe(24 * 60 * 60 * 1000);
  });

  test("rollover resets spend + thresholds when window elapses", async () => {
    let now = new Date("2026-04-18T00:00:00Z");
    const meter = createBudgetMeter(
      policy({ tokens: 100 }, { thresholds: [{ at: 0.5, action: "alert" }] }),
      () => now,
    );
    await meter.record(evt({ tokens: 0 }), { tokens: 80 });
    const prev = await meter.check(evt({ tokens: 0 }));
    expect(prev.status).toBe("threshold");

    // advance 25h — past the day window
    now = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const after = await meter.check(evt({ tokens: 0 }));
    expect(after.status).toBe("ok");
  });

  test("InMemoryBudgetMeter is exported as the reference class", async () => {
    const meter = new InMemoryBudgetMeter(policy({ costUsd: 5 }));
    const d = await meter.check(evt({ costUsd: 1 }));
    expect(d.status).toBe("ok");
  });

  test("events with no extensions.cost default to zero cost", async () => {
    const meter = createBudgetMeter(policy({ tokens: 100 }));
    // event with no extensions at all
    const d = await meter.check({
      server: "s",
      tool: "t",
      context: { conversationId: "c-1" },
    });
    expect(d.status).toBe("ok");
  });

  test("policy without tokens limit ignores token spend in fraction calculation", async () => {
    const meter = createBudgetMeter(policy({ costUsd: 10 }));
    await meter.record(evt({}), { tokens: 1_000_000 });
    const d = await meter.check(evt({ tokens: 0 }));
    // tokens not limited — fraction driven only by costUsd
    expect(d.status).toBe("ok");
  });

  test("policy without costUsd ignores cost in fraction calculation", async () => {
    const meter = createBudgetMeter(policy({ tokens: 10 }));
    await meter.record(evt({}), { costUsd: 1_000_000 });
    const d = await meter.check(evt({ costUsd: 0 }));
    expect(d.status).toBe("ok");
  });

  test("hour window rolls over after 60+ minutes", async () => {
    let now = new Date("2026-04-18T00:00:00Z");
    const meter = createBudgetMeter(policy({ tokens: 100 }, { window: "hour" }), () => now);
    await meter.record(evt({}), { tokens: 90 });
    now = new Date(now.getTime() + 61 * 60 * 1000);
    const after = meter.window();
    expect(after.spent.tokens).toBe(0);
  });

  test("month window rolls over after 31+ days", async () => {
    let now = new Date("2026-04-18T00:00:00Z");
    const meter = createBudgetMeter(policy({ tokens: 100 }, { window: "month" }), () => now);
    await meter.record(evt({}), { tokens: 90 });
    now = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
    const after = meter.window();
    expect(after.spent.tokens).toBe(0);
  });

  test("policy with only tokens (no costUsd) + actualCost recording only tokens", async () => {
    const meter = createBudgetMeter({
      window: "day",
      limits: { tokens: 100 },
      onExhausted: "deny",
    });
    await meter.record(evt({}), { tokens: 50 });
    const w = meter.window();
    expect(w.spent.tokens).toBe(50);
    const d = await meter.check({
      server: "s",
      tool: "t",
      context: { conversationId: "c" },
      extensions: { cost: { tokens: 30 } },
    });
    expect(d.status).toBe("ok");
  });

  test("policy with only costUsd (no tokens) + actualCost recording only costUsd", async () => {
    const meter = createBudgetMeter({
      window: "day",
      limits: { costUsd: 10 },
      onExhausted: "deny",
    });
    await meter.record(evt({}), { costUsd: 5 });
    const w = meter.window();
    expect(w.spent.costUsd).toBe(5);
  });

  test("exceeded returns overage only for the dimension that was over", async () => {
    const meter = createBudgetMeter(
      policy({ tokens: 10, costUsd: 1000 }, { onExhausted: "alert-only" }),
    );
    // push tokens over, leave costUsd well under
    await meter.record(evt({}), { tokens: 20 });
    const d = await meter.check(evt({}));
    expect(d.status).toBe("exceeded");
    if (d.status === "exceeded") {
      expect(d.over.tokens).toBeGreaterThan(0);
      expect(d.over.costUsd).toBe(0);
    }
  });

  test("multiple thresholds: first-not-yet-fired wins", async () => {
    const meter = createBudgetMeter(
      policy(
        { tokens: 100 },
        {
          thresholds: [
            { at: 0.5, action: "alert" },
            { at: 0.75, action: "throttle" },
            { at: 0.9, action: "deny" },
          ],
        },
      ),
    );
    await meter.record(evt({}), { tokens: 80 });
    // crosses 0.5 + 0.75 — first-fire wins = 0.5
    const first = await meter.check(evt({}));
    expect(first.status).toBe("threshold");
    if (first.status === "threshold") expect(first.alert.threshold.at).toBe(0.5);
    // next call fires 0.75
    const second = await meter.check(evt({}));
    expect(second.status).toBe("threshold");
    if (second.status === "threshold") expect(second.alert.threshold.at).toBe(0.75);
  });
});
