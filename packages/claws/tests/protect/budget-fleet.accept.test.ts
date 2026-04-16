/**
 * L3: CLI acceptance — `claws protect budget --fleet` on reference fleet root.
 *
 * Verifies the CLI surface prints aggregated spend, per-workspace rows
 * sorted by usage%, and exits 0. Uses a temp fleet root with known
 * workspace budget data.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { signAuditEntry } from '@bic/claws-sdk/compliance/artifact-signer';
import { claws } from '../accept/helpers.js';

const HMAC_KEY = Buffer.alloc(32, 'c');
const KEY_ID = 'cli-fleet-v1';

/** Create a signed TOKEN_USAGE audit entry. */
function tokenUsageEntry(seq: number, tokens: number, timestamp: string) {
  return signAuditEntry(
    {
      seq,
      timestamp,
      eventType: 'TOKEN_USAGE',
      actor: 'cli-fleet-test',
      target: String(tokens),
      action: 'consume',
      outcome: 'allow',
      ruleId: 'budget-cli-fleet',
      severity: 1,
      policyVersion: '1.0.0',
    },
    HMAC_KEY,
    KEY_ID,
  );
}

/** Scaffold a governed workspace with token usage. */
async function createWorkspace(
  basePath: string,
  name: string,
  tokens: number[],
  monthlyLimit: number,
): Promise<void> {
  const wsPath = join(basePath, name);
  const auditDir = join(wsPath, '.claws', 'audit');
  const policiesDir = join(wsPath, '.claws', 'policies');
  await mkdir(auditDir, { recursive: true });
  await mkdir(policiesDir, { recursive: true });

  await writeFile(join(wsPath, 'CLAUDE.md'), `# ${name}`);
  await writeFile(
    join(wsPath, 'claws.json'),
    JSON.stringify({
      trustTier: 2,
      budgetConfig: { daily: 50_000, monthly: monthlyLimit, enforcement: 'warn' },
    }),
  );
  await writeFile(join(policiesDir, 'default.yaml'), 'name: default\nversion: 1');

  const entries = tokens.map((t, i) =>
    tokenUsageEntry(i, t, `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
  );
  if (entries.length > 0) {
    const chain = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chain, 'utf-8');
  }
}

describe('CLI acceptance: claws protect budget --fleet', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prints aggregated spend, per-workspace rows sorted by usage%, and exits 0', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-fleet-'));

    // High usage: 90% (45k / 50k)
    await createWorkspace(tempDir, 'ws-high', [25_000, 20_000], 50_000);
    // Low usage: 20% (10k / 50k)
    await createWorkspace(tempDir, 'ws-low', [5_000, 5_000], 50_000);

    const result = await claws(['protect', 'budget', '--fleet'], {
      cwd: tempDir,
    });

    expect(result.exitCode).toBe(0);

    // Output should contain fleet summary
    expect(result.stdout).toContain('Fleet Budget:');
    expect(result.stdout).toContain('2 workspaces');
    expect(result.stdout).toContain('total tokens');

    // Output should contain percentage rows (90% before 20%)
    expect(result.stdout).toContain('90%');
    expect(result.stdout).toContain('20%');

    // 90% should appear before 20% in the output (descending sort)
    const idx90 = result.stdout.indexOf('90%');
    const idx20 = result.stdout.indexOf('20%');
    expect(idx90).toBeLessThan(idx20);
  });

  it('outputs JSON when --json flag is set', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-fleet-json-'));

    await createWorkspace(tempDir, 'ws-only', [10_000], 100_000);

    const result = await claws(['--json', 'protect', 'budget', '--fleet'], {
      cwd: tempDir,
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('workspaces');
    expect(parsed).toHaveProperty('totalSpend');
    expect(parsed).toHaveProperty('sortedByUsage');
    expect(Array.isArray(parsed.workspaces)).toBe(true);
    expect(parsed.totalSpend).toBe(10_000);
  });
});
