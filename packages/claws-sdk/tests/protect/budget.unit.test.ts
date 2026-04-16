/**
 * L0: PROTECT budget — usage calculation, threshold detection, limit enforcement,
 * and the main budget() function via mocked audit chain / config reads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkThresholds, evaluateEnforcement, budget } from '../../src/protect/budget.js';
import type { BudgetLimit } from '../../src/protect/types.js';
import type { AuditChainEntry } from '../../src/compliance/artifact-signer.js';

// Mock the audit chain reader and fs readFile
vi.mock('../../src/compliance/audit-chain.js', () => ({
  readAuditChain: vi.fn().mockResolvedValue([]),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
}));

// Get the mocked functions for test control
const { readAuditChain } = await import('../../src/compliance/audit-chain.js');
const { readFile } = await import('node:fs/promises');

const mockedReadAuditChain = vi.mocked(readAuditChain);
const mockedReadFile = vi.mocked(readFile);

describe('usage percentage calculation from raw token counts', () => {
  it('computes correct percentage for various usage levels', () => {
    // 10k of 50k = 20%
    const alerts20 = checkThresholds(20);
    expect(alerts20).toHaveLength(3);
    expect(alerts20.every((a) => !a.triggered)).toBe(true);

    // 40k of 50k = 80% — triggers 80% threshold
    const alerts80 = checkThresholds(80);
    expect(alerts80[0]!.level).toBe(80);
    expect(alerts80[0]!.triggered).toBe(true);
    expect(alerts80[1]!.triggered).toBe(false);
    expect(alerts80[2]!.triggered).toBe(false);

    // 48k of 50k = 96% — triggers 80% and 95%
    const alerts96 = checkThresholds(96);
    expect(alerts96[0]!.triggered).toBe(true);
    expect(alerts96[1]!.triggered).toBe(true);
    expect(alerts96[2]!.triggered).toBe(false);

    // 50k of 50k = 100% — triggers all three
    const alerts100 = checkThresholds(100);
    expect(alerts100.every((a) => a.triggered)).toBe(true);
  });
});

describe('usage calculation with zero tokens returns 0%', () => {
  it('returns no triggered alerts at 0%', () => {
    const alerts = checkThresholds(0);
    expect(alerts).toHaveLength(3);
    expect(alerts.every((a) => !a.triggered)).toBe(true);
    expect(alerts[0]!.message).toContain('0%');
  });
});

describe('threshold detection at 80/95/100% boundaries', () => {
  it('fires alerts exactly at boundary values', () => {
    // Just below 80%
    const below80 = checkThresholds(79.9);
    expect(below80[0]!.triggered).toBe(false);

    // Exactly 80%
    const at80 = checkThresholds(80);
    expect(at80[0]!.triggered).toBe(true);
    expect(at80[0]!.message).toContain('80% threshold breached');
    expect(at80[1]!.triggered).toBe(false);

    // Just below 95%
    const below95 = checkThresholds(94.9);
    expect(below95[0]!.triggered).toBe(true);
    expect(below95[1]!.triggered).toBe(false);

    // Exactly 95%
    const at95 = checkThresholds(95);
    expect(at95[0]!.triggered).toBe(true);
    expect(at95[1]!.triggered).toBe(true);
    expect(at95[1]!.message).toContain('95% threshold breached');
    expect(at95[2]!.triggered).toBe(false);

    // Exactly 100%
    const at100 = checkThresholds(100);
    expect(at100[2]!.triggered).toBe(true);
    expect(at100[2]!.message).toContain('100% threshold breached');

    // Above 100% (over-budget)
    const over = checkThresholds(120);
    expect(over.every((a) => a.triggered)).toBe(true);
  });
});

describe('daily/monthly limit enforcement modes', () => {
  it('evaluates warn and block modes for daily and monthly limits', () => {
    const warnLimits: BudgetLimit = { daily: 10_000, weekly: 0, monthly: 300_000, enforcement: 'warn' };
    const blockLimits: BudgetLimit = { daily: 10_000, weekly: 0, monthly: 300_000, enforcement: 'block' };

    // Under both limits — warn mode
    const underWarn = evaluateEnforcement(5_000, 100_000, warnLimits);
    expect(underWarn).toHaveLength(2);
    expect(underWarn[0]!.period).toBe('daily');
    expect(underWarn[0]!.exceeded).toBe(false);
    expect(underWarn[0]!.action).toBe('warn');
    expect(underWarn[1]!.period).toBe('monthly');
    expect(underWarn[1]!.exceeded).toBe(false);

    // Daily exceeded — warn mode
    const dailyExceededWarn = evaluateEnforcement(10_000, 100_000, warnLimits);
    expect(dailyExceededWarn[0]!.exceeded).toBe(true);
    expect(dailyExceededWarn[0]!.action).toBe('warn');
    expect(dailyExceededWarn[0]!.message).toContain('Daily limit exceeded');
    expect(dailyExceededWarn[0]!.message).toContain('warn');

    // Monthly exceeded — block mode
    const monthlyExceededBlock = evaluateEnforcement(5_000, 300_000, blockLimits);
    expect(monthlyExceededBlock[1]!.exceeded).toBe(true);
    expect(monthlyExceededBlock[1]!.action).toBe('block');
    expect(monthlyExceededBlock[1]!.message).toContain('Monthly limit exceeded');
    expect(monthlyExceededBlock[1]!.message).toContain('block');

    // Zero limit means unlimited — never exceeded
    const zeroLimits: BudgetLimit = { daily: 0, weekly: 0, monthly: 0, enforcement: 'block' };
    const zeroResult = evaluateEnforcement(999_999, 999_999, zeroLimits);
    expect(zeroResult[0]!.exceeded).toBe(false);
    expect(zeroResult[1]!.exceeded).toBe(false);
  });
});

// ── budget() function tests (mocked I/O) ──────────────────────────────

function makeAuditEntry(
  tokenCount: number,
  timestamp: string,
): AuditChainEntry {
  return {
    seq: 0,
    timestamp,
    eventType: 'TOKEN_USAGE',
    actor: 'test',
    target: String(tokenCount),
    action: 'consume',
    outcome: 'ok',
    ruleId: 'r-1',
    severity: 1,
    policyVersion: '1.0',
    hmacSignature: 'abc',
    keyId: 'k-1',
    algorithm: 'sha256',
  };
}

describe('budget() with mocked audit chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReadFile.mockRejectedValue(new Error('ENOENT'));
    mockedReadAuditChain.mockResolvedValue([]);
  });

  it('returns zero usage when audit chain is empty', async () => {
    const limits: BudgetLimit = { daily: 10_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { limits });

    expect(result.report.tokenCount).toBe(0);
    expect(result.report.percentage).toBe(0);
    expect(result.report.period).toBe('monthly');
    expect(result.alerts).toHaveLength(3);
    expect(result.alerts.every((a) => !a.triggered)).toBe(true);
    expect(result.enforcement).toHaveLength(2);
  });

  it('sums TOKEN_USAGE events within the monthly period', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(5000, '2026-04-10T08:00:00Z'),
      makeAuditEntry(3000, '2026-04-12T10:00:00Z'),
      // Old event outside month — March
      makeAuditEntry(99999, '2026-03-01T01:00:00Z'),
    ]);

    const limits: BudgetLimit = { daily: 50_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'monthly', limits, now });

    // 5000 + 3000 = 8000 in April
    expect(result.report.tokenCount).toBe(8000);
    expect(result.report.limit).toBe(100_000);
    expect(result.report.percentage).toBe(8);
  });

  it('filters by daily period', async () => {
    const now = new Date('2026-04-14T18:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(1000, '2026-04-14T02:00:00Z'), // today
      makeAuditEntry(2000, '2026-04-14T10:00:00Z'), // today
      makeAuditEntry(9999, '2026-04-13T23:00:00Z'), // yesterday
    ]);

    const limits: BudgetLimit = { daily: 10_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'daily', limits, now });

    expect(result.report.tokenCount).toBe(3000);
    expect(result.report.period).toBe('daily');
    expect(result.report.limit).toBe(10_000);
    expect(result.report.percentage).toBe(30);
  });

  it('filters by weekly period', async () => {
    // 2026-04-14 is a Tuesday. Week starts Sunday Apr 12.
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(1000, '2026-04-12T01:00:00Z'), // Sunday — in week
      makeAuditEntry(2000, '2026-04-13T12:00:00Z'), // Monday — in week
      makeAuditEntry(500, '2026-04-11T23:00:00Z'),  // Saturday — prior week
    ]);

    const limits: BudgetLimit = { daily: 5_000, weekly: 35_000, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'weekly', limits, now });

    expect(result.report.tokenCount).toBe(3000);
    expect(result.report.period).toBe('weekly');
    expect(result.report.limit).toBe(35_000);
  });

  it('weekly period falls back to daily*7 when weekly limit is 0', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(7000, '2026-04-13T12:00:00Z'),
    ]);

    const limits: BudgetLimit = { daily: 5_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'weekly', limits, now });

    // weekly limit = daily * 7 = 35000
    expect(result.report.limit).toBe(35_000);
  });

  it('ignores non-TOKEN_USAGE events', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(5000, '2026-04-14T08:00:00Z'),
      {
        seq: 1,
        timestamp: '2026-04-14T09:00:00Z',
        eventType: 'BYPASS_ACTIVATED',
        actor: 'test',
        target: '99999',
        action: 'bypass',
        outcome: 'ok',
        ruleId: 'r-2',
        severity: 3,
        policyVersion: '1.0',
        hmacSignature: 'def',
        keyId: 'k-1',
        algorithm: 'sha256' as const,
      },
    ]);

    const limits: BudgetLimit = { daily: 50_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'monthly', limits, now });

    expect(result.report.tokenCount).toBe(5000);
  });

  it('handles non-numeric target values by treating them as 0', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(1000, '2026-04-14T08:00:00Z'),
      {
        seq: 1,
        timestamp: '2026-04-14T09:00:00Z',
        eventType: 'TOKEN_USAGE',
        actor: 'test',
        target: 'not-a-number',
        action: 'consume',
        outcome: 'ok',
        ruleId: 'r-1',
        severity: 1,
        policyVersion: '1.0',
        hmacSignature: 'abc',
        keyId: 'k-1',
        algorithm: 'sha256' as const,
      },
      {
        seq: 2,
        timestamp: '2026-04-14T10:00:00Z',
        eventType: 'TOKEN_USAGE',
        actor: 'test',
        target: '-500',
        action: 'consume',
        outcome: 'ok',
        ruleId: 'r-1',
        severity: 1,
        policyVersion: '1.0',
        hmacSignature: 'abc',
        keyId: 'k-1',
        algorithm: 'sha256' as const,
      },
    ]);

    const limits: BudgetLimit = { daily: 50_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'monthly', limits, now });

    // 1000 + 0 (NaN) + 0 (negative) = 1000
    expect(result.report.tokenCount).toBe(1000);
  });

  it('reads budget config from claws.json when no limits supplied', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(5000, '2026-04-14T08:00:00Z'),
    ]);
    mockedReadFile.mockResolvedValue(JSON.stringify({
      budgetConfig: {
        daily: 20_000,
        monthly: 500_000,
        enforcement: 'block',
      },
    }) as never);

    const result = await budget('/ws', { now });

    expect(result.report.limit).toBe(500_000);
    expect(result.enforcement[0]!.action).toBe('block');
  });

  it('reads weekly from claws.json budgetConfig', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([]);
    mockedReadFile.mockResolvedValue(JSON.stringify({
      budgetConfig: {
        daily: 10_000,
        weekly: 70_000,
        monthly: 300_000,
        enforcement: 'warn',
      },
    }) as never);

    const result = await budget('/ws', { period: 'weekly', now });
    expect(result.report.limit).toBe(70_000);
  });

  it('falls back to zero limits when claws.json missing', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      makeAuditEntry(5000, '2026-04-14T08:00:00Z'),
    ]);
    mockedReadFile.mockRejectedValue(new Error('ENOENT'));

    const result = await budget('/ws', { now });

    expect(result.report.limit).toBe(0);
    expect(result.report.percentage).toBe(0);
  });

  it('falls back to zero limits when budgetConfig is malformed', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([]);
    mockedReadFile.mockResolvedValue(JSON.stringify({
      budgetConfig: { daily: 'not-a-number', monthly: true },
    }) as never);

    const result = await budget('/ws', { now });
    expect(result.report.limit).toBe(0);
  });

  it('normalizes enforcement to warn for unknown values in config', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([]);
    mockedReadFile.mockResolvedValue(JSON.stringify({
      budgetConfig: {
        daily: 10_000,
        monthly: 100_000,
        enforcement: 'kill',
      },
    }) as never);

    const result = await budget('/ws', { now });
    expect(result.enforcement[0]!.action).toBe('warn');
  });

  it('defaults to monthly period when not specified', async () => {
    mockedReadAuditChain.mockResolvedValue([]);
    const limits: BudgetLimit = { daily: 10_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };

    const result = await budget('/ws', { limits });

    expect(result.report.period).toBe('monthly');
  });

  it('returns fractional token counts floored', async () => {
    const now = new Date('2026-04-14T12:00:00Z');
    mockedReadAuditChain.mockResolvedValue([
      {
        seq: 0,
        timestamp: '2026-04-14T08:00:00Z',
        eventType: 'TOKEN_USAGE',
        actor: 'test',
        target: '1500.7',
        action: 'consume',
        outcome: 'ok',
        ruleId: 'r-1',
        severity: 1,
        policyVersion: '1.0',
        hmacSignature: 'abc',
        keyId: 'k-1',
        algorithm: 'sha256' as const,
      },
    ]);

    const limits: BudgetLimit = { daily: 50_000, weekly: 0, monthly: 100_000, enforcement: 'warn' };
    const result = await budget('/ws', { period: 'monthly', limits, now });

    expect(result.report.tokenCount).toBe(1500);
  });
});
