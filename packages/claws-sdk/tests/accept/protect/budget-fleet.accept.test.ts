/**
 * L3: SDK acceptance — budgetFleet().
 *
 * Consumer-facing test: calls budgetFleet() on a multi-workspace fleet
 * root and validates BudgetFleetReport shape, per-workspace breakdown,
 * and descending sort order without internal implementation knowledge.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { signAuditEntry } from '../../../src/compliance/artifact-signer.js';

// Public API imports only — what an SDK consumer would use
import { budgetFleet } from '../../../src/protect/budget-fleet.js';
import type { BudgetFleetReport, WorkspaceBudgetEntry } from '../../../src/protect/types.js';

const HMAC_KEY = Buffer.alloc(32, 'a');
const KEY_ID = 'accept-v1';

/** Create a signed TOKEN_USAGE audit entry. */
function tokenUsageEntry(seq: number, tokens: number, timestamp: string) {
  return signAuditEntry(
    {
      seq,
      timestamp,
      eventType: 'TOKEN_USAGE',
      actor: 'accept-agent',
      target: String(tokens),
      action: 'consume',
      outcome: 'allow',
      ruleId: 'budget-accept',
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

describe('SDK acceptance: budgetFleet() on multi-workspace fleet root', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('validates BudgetFleetReport shape, per-workspace breakdown, and descending sort order', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-accept-'));

    // Create 3 workspaces with distinct usage levels
    await createWorkspace(tempDir, 'high-use', [40_000, 10_000], 100_000);   // 50%
    await createWorkspace(tempDir, 'mid-use', [15_000, 5_000], 100_000);     // 20%
    await createWorkspace(tempDir, 'low-use', [3_000], 100_000);             // 3%

    // ── Call public API ───────────────────────────────────────────────
    const report: BudgetFleetReport = await budgetFleet(tempDir, { maxDepth: 2 });

    // ── Validate BudgetFleetReport shape ──────────────────────────────
    expect(report).toHaveProperty('workspaces');
    expect(report).toHaveProperty('totalSpend');
    expect(report).toHaveProperty('sortedByUsage');
    expect(Array.isArray(report.workspaces)).toBe(true);
    expect(Array.isArray(report.sortedByUsage)).toBe(true);
    expect(typeof report.totalSpend).toBe('number');

    // ── Per-workspace breakdown ────────────────────────────────────────
    expect(report.workspaces).toHaveLength(3);
    for (const ws of report.workspaces) {
      const e = ws as WorkspaceBudgetEntry;
      // M-01: workspace identity fields present
      expect(e).toHaveProperty('workspacePath');
      expect(e).toHaveProperty('workspaceName');
      expect(typeof e.workspacePath).toBe('string');
      expect(typeof e.workspaceName).toBe('string');
      expect(e.workspacePath.length).toBeGreaterThan(0);
      expect(e.workspaceName.length).toBeGreaterThan(0);
      // Budget report nested under .report
      expect(e).toHaveProperty('report');
      expect(e.report).toHaveProperty('tokenCount');
      expect(e.report).toHaveProperty('limit');
      expect(e.report).toHaveProperty('percentage');
      expect(e.report).toHaveProperty('period');
      expect(typeof e.report.tokenCount).toBe('number');
      expect(typeof e.report.limit).toBe('number');
      expect(typeof e.report.percentage).toBe('number');
      expect(e.report.period).toBe('monthly');
    }

    // ── Totals ─────────────────────────────────────────────────────────
    // 50000 + 20000 + 3000 = 73000
    expect(report.totalSpend).toBe(73_000);

    // ── Descending sort order ──────────────────────────────────────────
    expect(report.sortedByUsage).toHaveLength(3);
    for (let i = 1; i < report.sortedByUsage.length; i++) {
      expect(report.sortedByUsage[i - 1]!.report.percentage).toBeGreaterThanOrEqual(
        report.sortedByUsage[i]!.report.percentage,
      );
    }

    // Highest spender first
    expect(report.sortedByUsage[0]!.report.percentage).toBe(50);
    expect(report.sortedByUsage[0]!.report.tokenCount).toBe(50_000);

    // Lowest spender last
    expect(report.sortedByUsage[2]!.report.percentage).toBe(3);
    expect(report.sortedByUsage[2]!.report.tokenCount).toBe(3_000);
  });

  it('returns zero-valued report for empty fleet root', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-accept-empty-'));

    const report = await budgetFleet(tempDir, { maxDepth: 2 });

    expect(report.workspaces).toHaveLength(0);
    expect(report.totalSpend).toBe(0);
    expect(report.sortedByUsage).toHaveLength(0);
  });
});
