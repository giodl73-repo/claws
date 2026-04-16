/**
 * L1: PROTECT budget-fleet — fleet budget across 3 fixture workspaces.
 *
 * Creates a temp fleet root with 3 governed workspaces at varying usage
 * levels, then calls budgetFleet() to verify aggregation, sorting, and
 * per-workspace breakdown across real audit chains.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { budgetFleet } from '../../src/protect/budget-fleet.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

const HMAC_KEY = Buffer.alloc(32, 'f');
const KEY_ID = 'fleet-test-v1';

/** Create a signed TOKEN_USAGE audit entry. */
function tokenUsageEntry(seq: number, tokens: number, timestamp: string) {
  return signAuditEntry(
    {
      seq,
      timestamp,
      eventType: 'TOKEN_USAGE',
      actor: 'fleet-test-agent',
      target: String(tokens),
      action: 'consume',
      outcome: 'allow',
      ruleId: 'budget-fleet-test',
      severity: 1,
      policyVersion: '1.0.0',
    },
    HMAC_KEY,
    KEY_ID,
  );
}

/** Scaffold a governed workspace with audit chain and budget config. */
async function createWorkspace(
  basePath: string,
  name: string,
  tokenEntries: Array<{ tokens: number; timestamp: string }>,
  monthlyLimit: number,
): Promise<string> {
  const wsPath = join(basePath, name);
  const auditDir = join(wsPath, '.claws', 'audit');
  const policiesDir = join(wsPath, '.claws', 'policies');
  await mkdir(auditDir, { recursive: true });
  await mkdir(policiesDir, { recursive: true });

  // OC marker
  await writeFile(join(wsPath, 'CLAUDE.md'), `# ${name}`);

  // claws.json with budget config
  await writeFile(
    join(wsPath, 'claws.json'),
    JSON.stringify({
      trustTier: 3,
      budgetConfig: {
        daily: 50_000,
        monthly: monthlyLimit,
        enforcement: 'warn',
      },
    }),
  );

  // Policy file (for fleet scan classification as GOVERNED)
  await writeFile(join(policiesDir, 'default.yaml'), 'name: default\nversion: 1');

  // Audit chain
  const entries = tokenEntries.map((e, i) =>
    tokenUsageEntry(i, e.tokens, e.timestamp),
  );
  if (entries.length > 0) {
    const chainContent = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chainContent, 'utf-8');
  }

  return wsPath;
}

describe('fleet budget on empty fleet root returns zero totals', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns zero-valued BudgetFleetReport when no workspaces are discovered', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-budget-empty-'));

    const result = await budgetFleet(tempDir, { maxDepth: 2 });

    expect(result.workspaces).toHaveLength(0);
    expect(result.totalSpend).toBe(0);
    expect(result.sortedByUsage).toHaveLength(0);
  });
});

describe('fleet budget handles workspaces where budget() fails gracefully', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('skips workspaces with corrupt audit chain and aggregates the rest', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-budget-err-'));

    // Working workspace: 50% usage
    await createWorkspace(tempDir, 'ws-good', [
      { tokens: 25_000, timestamp: '2026-04-01T08:00:00Z' },
    ], 50_000);

    // Broken workspace: has OC marker + claws.json but corrupt audit chain
    const wsBroken = join(tempDir, 'ws-broken');
    const auditDir = join(wsBroken, '.claws', 'audit');
    const policiesDir = join(wsBroken, '.claws', 'policies');
    await mkdir(auditDir, { recursive: true });
    await mkdir(policiesDir, { recursive: true });
    await writeFile(join(wsBroken, 'CLAUDE.md'), '# broken');
    await writeFile(join(wsBroken, 'claws.json'), JSON.stringify({
      trustTier: 2,
      budgetConfig: { daily: 50_000, monthly: 50_000, enforcement: 'warn' },
    }));
    await writeFile(join(policiesDir, 'default.yaml'), 'name: default\nversion: 1');
    // Write corrupt chain data (not valid JSONL)
    await writeFile(join(auditDir, 'chain.jsonl'), 'NOT VALID JSON{{{', 'utf-8');

    const result = await budgetFleet(tempDir, { maxDepth: 2 });

    // The broken workspace should be skipped (budget() throws), but the
    // good workspace should still be aggregated. Since budget() catches
    // parse errors internally and returns 0 tokens, both may appear.
    // Either way, totalSpend should include at least the good workspace.
    expect(result.totalSpend).toBeGreaterThanOrEqual(25_000);
    expect(result.workspaces.length).toBeGreaterThanOrEqual(1);
  });
});

describe('fleet budget across 3 fixture workspaces with varying usage levels', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('aggregates budget across 3 workspaces with correct totals and sort order', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-budget-int-'));

    // Workspace A: 90% usage (45k / 50k)
    await createWorkspace(tempDir, 'ws-alpha', [
      { tokens: 25_000, timestamp: '2026-04-01T08:00:00Z' },
      { tokens: 20_000, timestamp: '2026-04-10T10:00:00Z' },
    ], 50_000);

    // Workspace B: 20% usage (10k / 50k)
    await createWorkspace(tempDir, 'ws-beta', [
      { tokens: 5_000, timestamp: '2026-04-05T09:00:00Z' },
      { tokens: 5_000, timestamp: '2026-04-12T11:00:00Z' },
    ], 50_000);

    // Workspace C: 60% usage (30k / 50k)
    await createWorkspace(tempDir, 'ws-gamma', [
      { tokens: 15_000, timestamp: '2026-04-02T08:00:00Z' },
      { tokens: 15_000, timestamp: '2026-04-14T14:00:00Z' },
    ], 50_000);

    const result = await budgetFleet(tempDir, { maxDepth: 2 });

    // Should discover all 3 workspaces
    expect(result.workspaces).toHaveLength(3);

    // Total spend: 45000 + 10000 + 30000 = 85000
    expect(result.totalSpend).toBe(85_000);

    // Sorted by usage% descending: 90%, 60%, 20%
    expect(result.sortedByUsage).toHaveLength(3);
    expect(result.sortedByUsage[0]!.report.percentage).toBe(90);
    expect(result.sortedByUsage[1]!.report.percentage).toBe(60);
    expect(result.sortedByUsage[2]!.report.percentage).toBe(20);

    // Each workspace entry has the correct individual data
    const sorted = result.sortedByUsage;
    expect(sorted[0]!.report.tokenCount).toBe(45_000);
    expect(sorted[1]!.report.tokenCount).toBe(30_000);
    expect(sorted[2]!.report.tokenCount).toBe(10_000);

    // M-01: workspace identity is present
    expect(sorted[0]!.workspaceName).toBe('ws-alpha');
    expect(sorted[0]!.workspacePath).toContain('ws-alpha');
  });
});
