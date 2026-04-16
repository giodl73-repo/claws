/**
 * L1: PROTECT budget — integration tests with fixture audit chain data.
 *
 * Creates temp workspaces with realistic audit chain entries and claws.json
 * config to verify the budget function reads and aggregates correctly.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { budget } from '../../src/protect/budget.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

/** Create a signed TOKEN_USAGE audit entry. */
function tokenUsageEntry(seq: number, tokens: number, timestamp: string) {
  const unsigned = {
    seq,
    timestamp,
    eventType: 'TOKEN_USAGE',
    actor: 'test-agent',
    target: String(tokens),
    action: 'consume',
    outcome: 'allow',
    ruleId: 'budget-track',
    severity: 1,
    policyVersion: '1.0.0',
  };
  return signAuditEntry(unsigned, Buffer.alloc(32, 'a'), 'test-key-v1');
}

describe('budget read from fixture audit chain with realistic token entries', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('reads token usage from audit chain and computes correct totals', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-budget-int-'));

    // Set up .claws/audit directory with chain.jsonl
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    // Write realistic token usage entries — all in same month
    const entries = [
      tokenUsageEntry(0, 5000, '2026-04-14T08:00:00Z'),
      tokenUsageEntry(1, 3000, '2026-04-14T10:00:00Z'),
      tokenUsageEntry(2, 2000, '2026-04-14T14:00:00Z'),
    ];
    const chainContent = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chainContent, 'utf-8');

    // Write claws.json with budget config
    const config = {
      trustTier: 2,
      budgetConfig: {
        daily: 50_000,
        monthly: 500_000,
        enforcement: 'warn',
      },
    };
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify(config), 'utf-8');

    // Run budget for the same day
    const result = await budget(tempDir, {
      period: 'monthly',
      now: new Date('2026-04-14T16:00:00Z'),
    });

    // 5000 + 3000 + 2000 = 10000 tokens
    expect(result.report.tokenCount).toBe(10_000);
    expect(result.report.limit).toBe(500_000);
    expect(result.report.percentage).toBeCloseTo(2, 0);
    expect(result.report.period).toBe('monthly');

    // No threshold alerts at 2%
    expect(result.alerts.every((a) => !a.triggered)).toBe(true);

    // Enforcement: neither daily nor monthly exceeded
    expect(result.enforcement[0]!.exceeded).toBe(false);
    expect(result.enforcement[1]!.exceeded).toBe(false);
  });
});

describe('budget + threshold alert pipeline end-to-end', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('triggers threshold alerts when usage crosses 80% and 95%', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-budget-alert-'));

    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    // Write entries totaling 48000 tokens (96% of 50k monthly limit)
    const entries = [
      tokenUsageEntry(0, 20_000, '2026-04-01T08:00:00Z'),
      tokenUsageEntry(1, 15_000, '2026-04-07T10:00:00Z'),
      tokenUsageEntry(2, 13_000, '2026-04-14T14:00:00Z'),
    ];
    const chainContent = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chainContent, 'utf-8');

    const config = {
      trustTier: 2,
      budgetConfig: {
        daily: 20_000,
        monthly: 50_000,
        enforcement: 'block',
      },
    };
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify(config), 'utf-8');

    const result = await budget(tempDir, {
      period: 'monthly',
      now: new Date('2026-04-14T16:00:00Z'),
    });

    // 20000 + 15000 + 13000 = 48000 / 50000 = 96%
    expect(result.report.tokenCount).toBe(48_000);
    expect(result.report.percentage).toBeCloseTo(96, 0);

    // 80% and 95% alerts triggered, 100% not
    expect(result.alerts[0]!.level).toBe(80);
    expect(result.alerts[0]!.triggered).toBe(true);
    expect(result.alerts[1]!.level).toBe(95);
    expect(result.alerts[1]!.triggered).toBe(true);
    expect(result.alerts[2]!.level).toBe(100);
    expect(result.alerts[2]!.triggered).toBe(false);

    // Daily enforcement: only 13000 today, under 20k daily limit
    expect(result.enforcement[0]!.exceeded).toBe(false);
    // Monthly enforcement: 48000 >= 50000 is false (48k < 50k)
    expect(result.enforcement[1]!.exceeded).toBe(false);
  });
});
