/**
 * L1: PROTECT fleet-killswitch — fleet budget aggregation with kill-switch
 * threshold breach detection.
 *
 * Integration test covering THOTH-INTEGRATION-COVERAGE: verifies that
 * fleet budget aggregation detects workspaces exceeding 100% budget,
 * and that the kill switch can be activated on those workspaces.
 *
 * Uses 3 fixture workspaces: 1 at 100%+ budget (kill-switch territory),
 * 1 at moderate usage, 1 at low usage.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { budgetFleet } from '../../src/protect/budget-fleet.js';
import { budget } from '../../src/protect/budget.js';
import { guardedKill } from '../../src/fleet/double-kill.js';
import { readSentinel } from '../../src/fleet/kill.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

const HMAC_KEY = Buffer.alloc(32, 'k');
const KEY_ID = 'killswitch-test-v1';

/** Create a signed TOKEN_USAGE audit entry. */
function tokenUsageEntry(seq: number, tokens: number, timestamp: string) {
  return signAuditEntry(
    {
      seq,
      timestamp,
      eventType: 'TOKEN_USAGE',
      actor: 'killswitch-test',
      target: String(tokens),
      action: 'consume',
      outcome: 'allow',
      ruleId: 'budget-kill-test',
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
  enforcement: 'warn' | 'block' = 'block',
): Promise<string> {
  const wsPath = join(basePath, name);
  const auditDir = join(wsPath, '.claws', 'audit');
  const policiesDir = join(wsPath, '.claws', 'policies');
  await mkdir(auditDir, { recursive: true });
  await mkdir(policiesDir, { recursive: true });

  await writeFile(join(wsPath, 'CLAUDE.md'), `# ${name}`);
  await writeFile(
    join(wsPath, 'claws.json'),
    JSON.stringify({
      trustTier: 3,
      budgetConfig: {
        daily: 100_000,
        monthly: monthlyLimit,
        enforcement,
      },
    }),
  );
  await writeFile(join(policiesDir, 'default.yaml'), 'name: default\nversion: 1');

  const entries = tokenEntries.map((e, i) => tokenUsageEntry(i, e.tokens, e.timestamp));
  if (entries.length > 0) {
    const chainContent = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chainContent, 'utf-8');
  }

  return wsPath;
}

describe('fleet budget aggregation with kill-switch threshold breach', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('detects over-budget workspace and activates kill-switch on it', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-kill-int-'));

    // Workspace A: 120% usage (60k / 50k) — over budget, kill-switch territory
    const wsOver = await createWorkspace(tempDir, 'ws-over-budget', [
      { tokens: 30_000, timestamp: '2026-04-01T08:00:00Z' },
      { tokens: 30_000, timestamp: '2026-04-10T10:00:00Z' },
    ], 50_000);

    // Workspace B: 40% usage (20k / 50k) — moderate
    await createWorkspace(tempDir, 'ws-moderate', [
      { tokens: 10_000, timestamp: '2026-04-05T09:00:00Z' },
      { tokens: 10_000, timestamp: '2026-04-12T11:00:00Z' },
    ], 50_000);

    // Workspace C: 10% usage (5k / 50k) — low
    await createWorkspace(tempDir, 'ws-low', [
      { tokens: 5_000, timestamp: '2026-04-07T08:00:00Z' },
    ], 50_000);

    // Step 1: Fleet budget aggregation
    const fleetResult = await budgetFleet(tempDir, { maxDepth: 2 });
    expect(fleetResult.workspaces.length).toBeGreaterThanOrEqual(3);
    expect(fleetResult.totalSpend).toBe(85_000);

    // Step 2: Identify workspace(s) at or over 100%
    const overBudget = fleetResult.sortedByUsage.filter((r) => r.report.percentage >= 100);
    expect(overBudget).toHaveLength(1);
    expect(overBudget[0]!.report.percentage).toBe(120);

    // Step 3: Check per-workspace enforcement on over-budget workspace
    const overResult = await budget(wsOver, { period: 'monthly' });
    expect(overResult.enforcement[1]!.exceeded).toBe(true);
    expect(overResult.enforcement[1]!.action).toBe('block');

    // Step 4: Activate kill switch on the over-budget workspace
    const killResult = await guardedKill({
      workspacePath: wsOver,
      reason: 'Budget exceeded — fleet kill-switch activated',
      actor: 'fleet-budget-guard',
    });

    expect(killResult.activated).toBe(true);

    // Step 5: Verify sentinel file was created
    const sentinel = await readSentinel(wsOver);
    expect(sentinel).not.toBeNull();
    expect(sentinel!.reason).toContain('Budget exceeded');
    expect(sentinel!.actor).toBe('fleet-budget-guard');
  });
});
