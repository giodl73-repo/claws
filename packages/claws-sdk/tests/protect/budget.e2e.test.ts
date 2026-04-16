/**
 * L2: PROTECT budget — full workspace e2e.
 *
 * Sets up a complete fixture workspace with audit chain, claws.json,
 * keys, and sidecar layout, then runs budget() to validate the entire
 * pipeline produces correct usage percentage and threshold state.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { budget } from '../../src/protect/budget.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

/** Create a signed audit entry (TOKEN_USAGE or other types). */
function makeEntry(
  seq: number,
  eventType: string,
  target: string,
  timestamp: string,
) {
  return signAuditEntry(
    {
      seq,
      timestamp,
      eventType,
      actor: 'e2e-agent',
      target,
      action: eventType === 'TOKEN_USAGE' ? 'consume' : 'check',
      outcome: 'allow',
      ruleId: 'budget-e2e',
      severity: 1,
      policyVersion: '2.0.0',
    },
    Buffer.alloc(32, 'e'),
    'e2e-key-v1',
  );
}

describe('full budget on fixture workspace', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('shows correct usage percentage and threshold state across mixed audit events', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-budget-e2e-'));

    // Scaffold sidecar layout
    const auditDir = join(tempDir, '.claws', 'audit');
    const keysDir = join(tempDir, '.claws', 'keys');
    await mkdir(auditDir, { recursive: true });
    await mkdir(keysDir, { recursive: true });

    // Write HMAC key (budget doesn't verify signatures, but the chain is realistic)
    await writeFile(join(keysDir, 'hmac.key'), Buffer.alloc(32, 'e').toString('hex') + '\n', 'utf-8');

    // Write a mixed audit chain: TOKEN_USAGE + non-token events
    // Only TOKEN_USAGE events should contribute to the budget
    const entries = [
      makeEntry(0, 'TOKEN_USAGE', '10000', '2026-04-01T09:00:00Z'),
      makeEntry(1, 'POLICY_CHECK', 'compile', '2026-04-02T10:00:00Z'),
      makeEntry(2, 'TOKEN_USAGE', '15000', '2026-04-05T11:00:00Z'),
      makeEntry(3, 'BYPASS_ACTIVATED', 'workspace', '2026-04-06T08:00:00Z'),
      makeEntry(4, 'TOKEN_USAGE', '15000', '2026-04-10T14:00:00Z'),
      makeEntry(5, 'TOKEN_USAGE', '10000', '2026-04-14T16:00:00Z'),
    ];
    const chainContent = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chainContent, 'utf-8');

    // Write claws.json with budget config
    const config = {
      trustTier: 2,
      policySet: 'default',
      budgetConfig: {
        daily: 25_000,
        monthly: 50_000,
        enforcement: 'warn',
      },
    };
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify(config), 'utf-8');

    // Run budget at end of April 14
    const result = await budget(tempDir, {
      period: 'monthly',
      now: new Date('2026-04-14T20:00:00Z'),
    });

    // Token usage: 10000 + 15000 + 15000 + 10000 = 50000 (non-token events excluded)
    expect(result.report.tokenCount).toBe(50_000);
    expect(result.report.limit).toBe(50_000);
    expect(result.report.percentage).toBeCloseTo(100, 0);
    expect(result.report.period).toBe('monthly');

    // All three thresholds should be triggered at 100%
    expect(result.alerts[0]!.level).toBe(80);
    expect(result.alerts[0]!.triggered).toBe(true);
    expect(result.alerts[1]!.level).toBe(95);
    expect(result.alerts[1]!.triggered).toBe(true);
    expect(result.alerts[2]!.level).toBe(100);
    expect(result.alerts[2]!.triggered).toBe(true);

    // Daily enforcement: only 10000 today, under 25k daily limit
    expect(result.enforcement[0]!.period).toBe('daily');
    expect(result.enforcement[0]!.exceeded).toBe(false);

    // Monthly enforcement: 50000 >= 50000
    expect(result.enforcement[1]!.period).toBe('monthly');
    expect(result.enforcement[1]!.exceeded).toBe(true);
    expect(result.enforcement[1]!.action).toBe('warn');

    // Verify report shape
    expect(result).toHaveProperty('report');
    expect(result).toHaveProperty('alerts');
    expect(result).toHaveProperty('enforcement');
  });
});
