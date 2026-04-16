/**
 * L3: SDK acceptance — budget().
 *
 * Consumer-facing test: calls budget() on a reference workspace and
 * validates BudgetReport shape, threshold alerts, and period breakdown
 * without any internal knowledge of implementation details.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { signAuditEntry } from '../../../src/compliance/artifact-signer.js';

// Public API imports only — what an SDK consumer would use
import { budget } from '../../../src/protect/budget.js';
import type { FullBudgetResult } from '../../../src/protect/budget.js';
import type {
  BudgetReport,
  ThresholdAlert,
  BudgetPeriod,
  ThresholdLevel,
} from '../../../src/protect/types.js';

describe('SDK acceptance: budget() on reference workspace', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('validates BudgetReport shape, threshold alerts, and period breakdown', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-budget-accept-'));

    // Set up a reference workspace with known data
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    const key = Buffer.alloc(32, 'x');
    const makeEntry = (seq: number, tokens: number, ts: string) =>
      signAuditEntry(
        {
          seq,
          timestamp: ts,
          eventType: 'TOKEN_USAGE',
          actor: 'accept-agent',
          target: String(tokens),
          action: 'consume',
          outcome: 'allow',
          ruleId: 'budget-accept',
          severity: 1,
          policyVersion: '1.0.0',
        },
        key,
        'accept-key-v1',
      );

    // 40k tokens in April (80% of 50k limit)
    const entries = [
      makeEntry(0, 10_000, '2026-04-01T09:00:00Z'),
      makeEntry(1, 10_000, '2026-04-05T10:00:00Z'),
      makeEntry(2, 10_000, '2026-04-10T11:00:00Z'),
      makeEntry(3, 10_000, '2026-04-14T12:00:00Z'),
    ];
    const chain = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chain, 'utf-8');

    await writeFile(
      join(tempDir, 'claws.json'),
      JSON.stringify({
        trustTier: 2,
        budgetConfig: { daily: 20_000, monthly: 50_000, enforcement: 'warn' },
      }),
      'utf-8',
    );

    // ── Call public API ───────────────────────────────────────────────
    const result: FullBudgetResult = await budget(tempDir, {
      period: 'monthly',
      now: new Date('2026-04-14T18:00:00Z'),
    });

    // ── Validate BudgetReport shape ───────────────────────────────────
    const report: BudgetReport = result.report;
    expect(report).toHaveProperty('tokenCount');
    expect(report).toHaveProperty('limit');
    expect(report).toHaveProperty('percentage');
    expect(report).toHaveProperty('period');
    expect(typeof report.tokenCount).toBe('number');
    expect(typeof report.limit).toBe('number');
    expect(typeof report.percentage).toBe('number');
    expect(report.period satisfies BudgetPeriod).toBe('monthly');
    expect(report.tokenCount).toBe(40_000);
    expect(report.limit).toBe(50_000);
    expect(report.percentage).toBe(80);

    // ── Validate ThresholdAlerts ──────────────────────────────────────
    expect(result.alerts).toHaveLength(3);
    for (const alert of result.alerts) {
      const a = alert as ThresholdAlert;
      expect(a).toHaveProperty('level');
      expect(a).toHaveProperty('triggered');
      expect(a).toHaveProperty('message');
      expect(typeof a.level).toBe('number');
      expect(typeof a.triggered).toBe('boolean');
      expect(typeof a.message).toBe('string');
      expect([80, 95, 100] satisfies ThresholdLevel[]).toContain(a.level);
    }

    // At 80%: 80% triggered, 95% and 100% not
    expect(result.alerts[0]!.triggered).toBe(true);
    expect(result.alerts[1]!.triggered).toBe(false);
    expect(result.alerts[2]!.triggered).toBe(false);

    // ── Validate enforcement / period breakdown ──────────────────────
    expect(result.enforcement).toHaveLength(2);
    expect(result.enforcement[0]!.period).toBe('daily');
    expect(result.enforcement[1]!.period).toBe('monthly');
    for (const e of result.enforcement) {
      expect(e).toHaveProperty('exceeded');
      expect(e).toHaveProperty('action');
      expect(e).toHaveProperty('message');
      expect(typeof e.exceeded).toBe('boolean');
      expect(['warn', 'block']).toContain(e.action);
    }

    // Daily: only 10k today, under 20k limit
    expect(result.enforcement[0]!.exceeded).toBe(false);
    // Monthly: 40k < 50k, not exceeded
    expect(result.enforcement[1]!.exceeded).toBe(false);
  });
});
