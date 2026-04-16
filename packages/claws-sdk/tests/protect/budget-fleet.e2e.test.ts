/**
 * L2: PROTECT budget-fleet — full fleet budget on fixture workspace set.
 *
 * Sets up a complete fleet with realistic token distributions across
 * multiple workspaces, each with audit chains, claws.json, keys, and
 * sidecar layout. Validates the entire pipeline from fleet scan through
 * budget aggregation to sorted fleet report.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { budgetFleet } from '../../src/protect/budget-fleet.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

const HMAC_KEY = Buffer.alloc(32, 'e');
const KEY_ID = 'e2e-fleet-v1';

/** Create a signed audit entry. */
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
      actor: 'e2e-fleet-agent',
      target,
      action: eventType === 'TOKEN_USAGE' ? 'consume' : 'check',
      outcome: 'allow',
      ruleId: 'fleet-e2e',
      severity: 1,
      policyVersion: '2.0.0',
    },
    HMAC_KEY,
    KEY_ID,
  );
}

/** Scaffold a full governed workspace with realistic sidecar layout. */
async function createFullWorkspace(
  basePath: string,
  name: string,
  entries: Array<{ eventType: string; target: string; timestamp: string }>,
  monthlyLimit: number,
): Promise<string> {
  const wsPath = join(basePath, name);
  const auditDir = join(wsPath, '.claws', 'audit');
  const keysDir = join(wsPath, '.claws', 'keys');
  const policiesDir = join(wsPath, '.claws', 'policies');
  await mkdir(auditDir, { recursive: true });
  await mkdir(keysDir, { recursive: true });
  await mkdir(policiesDir, { recursive: true });

  // OC markers
  await writeFile(join(wsPath, 'CLAUDE.md'), `# ${name} E2E`);

  // claws.json
  await writeFile(
    join(wsPath, 'claws.json'),
    JSON.stringify({
      trustTier: 2,
      policySet: 'default',
      budgetConfig: {
        daily: 25_000,
        monthly: monthlyLimit,
        enforcement: 'warn',
      },
    }),
  );

  // HMAC key
  await writeFile(join(keysDir, 'hmac.key'), HMAC_KEY.toString('hex') + '\n', 'utf-8');

  // Policy
  await writeFile(join(policiesDir, 'default.yaml'), 'name: default\nversion: 1');

  // Audit chain with mixed events
  const auditEntries = entries.map((e, i) => makeEntry(i, e.eventType, e.target, e.timestamp));
  if (auditEntries.length > 0) {
    const chainContent = auditEntries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(join(auditDir, 'chain.jsonl'), chainContent, 'utf-8');
  }

  return wsPath;
}

describe('full fleet budget on fixture workspace set with realistic token distributions', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('aggregates budget from workspaces with mixed audit events and realistic token patterns', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-budget-e2e-'));

    // Team-alpha: heavy user — 50k tokens, some non-token events
    // Monthly limit: 100k → 50%
    await createFullWorkspace(tempDir, 'team-alpha', [
      { eventType: 'TOKEN_USAGE', target: '20000', timestamp: '2026-04-01T09:00:00Z' },
      { eventType: 'POLICY_CHECK', target: 'compile', timestamp: '2026-04-02T10:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '15000', timestamp: '2026-04-05T11:00:00Z' },
      { eventType: 'BYPASS_ACTIVATED', target: 'workspace', timestamp: '2026-04-06T08:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '15000', timestamp: '2026-04-10T14:00:00Z' },
    ], 100_000);

    // Team-beta: moderate user — 30k tokens
    // Monthly limit: 100k → 30%
    await createFullWorkspace(tempDir, 'team-beta', [
      { eventType: 'TOKEN_USAGE', target: '10000', timestamp: '2026-04-03T08:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '10000', timestamp: '2026-04-08T09:00:00Z' },
      { eventType: 'POLICY_CHECK', target: 'review', timestamp: '2026-04-09T10:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '10000', timestamp: '2026-04-12T11:00:00Z' },
    ], 100_000);

    // Team-gamma: light user — 5k tokens
    // Monthly limit: 100k → 5%
    await createFullWorkspace(tempDir, 'team-gamma', [
      { eventType: 'TOKEN_USAGE', target: '3000', timestamp: '2026-04-04T09:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '2000', timestamp: '2026-04-11T10:00:00Z' },
    ], 100_000);

    // Team-delta: over-budget — 95k tokens
    // Monthly limit: 100k → 95%
    await createFullWorkspace(tempDir, 'team-delta', [
      { eventType: 'TOKEN_USAGE', target: '40000', timestamp: '2026-04-01T08:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '30000', timestamp: '2026-04-07T09:00:00Z' },
      { eventType: 'TOKEN_USAGE', target: '25000', timestamp: '2026-04-14T14:00:00Z' },
    ], 100_000);

    const result = await budgetFleet(tempDir, { maxDepth: 2 });

    // All 4 workspaces discovered
    expect(result.workspaces).toHaveLength(4);

    // Total spend: 50000 + 30000 + 5000 + 95000 = 180000
    expect(result.totalSpend).toBe(180_000);

    // Sorted by usage% descending: delta(95%), alpha(50%), beta(30%), gamma(5%)
    expect(result.sortedByUsage).toHaveLength(4);
    expect(result.sortedByUsage[0]!.report.percentage).toBe(95);
    expect(result.sortedByUsage[0]!.report.tokenCount).toBe(95_000);
    expect(result.sortedByUsage[1]!.report.percentage).toBe(50);
    expect(result.sortedByUsage[1]!.report.tokenCount).toBe(50_000);
    expect(result.sortedByUsage[2]!.report.percentage).toBe(30);
    expect(result.sortedByUsage[2]!.report.tokenCount).toBe(30_000);
    expect(result.sortedByUsage[3]!.report.percentage).toBe(5);
    expect(result.sortedByUsage[3]!.report.tokenCount).toBe(5_000);

    // Non-token events should NOT contribute to token counts
    // alpha: 20k + 15k + 15k = 50k (not 50k + non-token events)
    const alphaEntry = result.sortedByUsage.find((r) => r.report.tokenCount === 50_000);
    expect(alphaEntry).toBeDefined();
    expect(alphaEntry!.report.limit).toBe(100_000);
    expect(alphaEntry!.workspaceName).toBe('team-alpha');

    // Workspace with 95% usage appears before workspace with 5% usage
    const firstIdx = result.sortedByUsage.findIndex((r) => r.report.percentage === 95);
    const lastIdx = result.sortedByUsage.findIndex((r) => r.report.percentage === 5);
    expect(firstIdx).toBeLessThan(lastIdx);
  });
});
