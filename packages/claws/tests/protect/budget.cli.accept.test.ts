/**
 * L3: CLI acceptance — `claws protect budget` on reference workspace.
 *
 * Verifies the CLI surface renders budget usage percentage, threshold
 * alerts, and exits 0. Uses a temp workspace with known audit data.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { signAuditEntry } from '@bic/claws-sdk/compliance/artifact-signer';
import { claws } from '../accept/helpers.js';

describe('CLI acceptance: claws protect budget', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prints usage percentage, threshold alerts, and exits 0', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-budget-'));

    // Set up audit chain with token usage
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    const key = Buffer.alloc(32, 'c');
    const makeEntry = (seq: number, tokens: number, ts: string) =>
      signAuditEntry(
        {
          seq,
          timestamp: ts,
          eventType: 'TOKEN_USAGE',
          actor: 'cli-test',
          target: String(tokens),
          action: 'consume',
          outcome: 'allow',
          ruleId: 'budget-cli',
          severity: 1,
          policyVersion: '1.0.0',
        },
        key,
        'cli-key-v1',
      );

    // 40k tokens — 80% of 50k monthly limit
    const entries = [
      makeEntry(0, 20_000, '2026-04-01T09:00:00Z'),
      makeEntry(1, 20_000, '2026-04-10T10:00:00Z'),
    ];
    const chain = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chain, 'utf-8');

    // Write claws.json with budget config
    await writeFile(
      join(tempDir, 'claws.json'),
      JSON.stringify({
        trustTier: 2,
        budgetConfig: { daily: 50_000, monthly: 50_000, enforcement: 'warn' },
      }),
      'utf-8',
    );

    // Run claws protect budget
    const result = await claws(['protect', 'budget', '--period', 'monthly'], {
      cwd: tempDir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('80%');
    expect(result.stdout).toContain('Budget:');
  });

  it('outputs JSON when --json flag is set', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-budget-json-'));

    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    // Empty chain — 0% usage
    await writeFile(join(auditDir, 'chain.jsonl'), '', 'utf-8');
    await writeFile(
      join(tempDir, 'claws.json'),
      JSON.stringify({
        trustTier: 2,
        budgetConfig: { daily: 10_000, monthly: 100_000, enforcement: 'block' },
      }),
      'utf-8',
    );

    const result = await claws(['--json', 'protect', 'budget'], {
      cwd: tempDir,
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('report');
    expect(parsed).toHaveProperty('alerts');
    expect(parsed).toHaveProperty('enforcement');
    expect(parsed.report.percentage).toBe(0);
    expect(parsed.report.period).toBe('monthly');
  });
});
