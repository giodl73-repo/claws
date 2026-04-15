/**
 * L3 acceptance test for snapshot diff — S02.
 *
 * Validates governance-aware semantic diffing:
 * - Semantic governance diff (not file diff)
 * - Tool risk escalation detected as regression
 * - Policy addition/removal detected
 * - Identical snapshots produce empty diff
 * - Trust tier shift prominently reported
 *
 * @module claws-sdk/tests/accept/e2e/snap-diff.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { diff } from '../../../src/snapshot/diff.js';
import { save } from '../../../src/snapshot/save.js';
import { renderDiff, renderDiffJson } from '../../../src/snapshot/diff-renderer.js';
import { TamperError } from '../../../src/snapshot/integrity.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-diff-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

/**
 * Write a full governance workspace with configurable IR.
 */
async function writeWorkspace(opts: {
  trustTier: number;
  tools: Array<{
    name: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    oboFlag?: boolean;
    classification?: string;
  }>;
  violations?: Array<{
    ruleId: string;
    target: string;
    message: string;
  }>;
  delegationMap?: Array<{
    ruleId: string;
    mechanism: string;
    target: string;
  }>;
  blockedTools?: string[];
}): Promise<void> {
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({ trustTier: opts.trustTier }, null, 2),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/policies/default.json'),
    JSON.stringify({ name: 'default', rules: ['g-perm', 'g-class'] }),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });

  const tools = opts.tools.map((t) => ({
    name: t.name,
    description: `Tool: ${t.name}`,
    riskLevel: t.riskLevel,
    oboFlag: t.oboFlag ?? false,
    classification: t.classification ?? 'execution',
  }));

  const violations = (opts.violations ?? []).map((v) => ({
    ruleId: v.ruleId,
    level: 'R3' as const,
    message: v.message,
    target: v.target,
    diagnosticCode: `${v.ruleId}-001`,
    fixSuggestions: [],
    toolFuzzyMatches: [],
  }));

  const delegationMap = (opts.delegationMap ?? []).map((d) => ({
    ruleId: d.ruleId,
    mechanism: d.mechanism,
    target: d.target,
  }));

  const ir = {
    capabilities: { tools, skills: [], agents: [] },
    analysis: {
      violations,
      warnings: [],
      enforcementPlan: {
        blockedTools: opts.blockedTools ?? [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap,
    conflicts: { conflicts: [], errorCount: 0, warningCount: 0 },
    compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-13T00:00:00Z', schemaVersion: 1 },
  };

  await writeFile(
    join(testDir, '.claws/compiled/governance-ir.json'),
    JSON.stringify(ir, null, 2),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/cache/hashes.json'),
    JSON.stringify({ compositeHash: 'test', sdkVersion: '0.36.0', storedAt: '2026-04-13T00:00:00Z' }),
    'utf-8',
  );
}

describe('snapshot diff governance contract (S02)', () => {
  it('semantic diff, risk escalation, policy changes, empty diff, trust tier shifts', async () => {
    // ── 1. Create "pre-expansion" snapshot (T2, 3 tools at R1-R3) ─────

    await writeWorkspace({
      trustTier: 2,
      tools: [
        { name: 'read-file', riskLevel: 'low' },
        { name: 'write-file', riskLevel: 'medium' },
        { name: 'http-fetch', riskLevel: 'high' },
      ],
      violations: [],
      delegationMap: [
        { ruleId: 'G-PERM', mechanism: 'hook', target: 'write-file' },
      ],
      blockedTools: [],
    });

    await save(testDir, 'pre-expansion');

    // ── 2. Create "post-expansion" snapshot (T2, 5 tools + escalation) ─

    await writeWorkspace({
      trustTier: 2,
      tools: [
        { name: 'read-file', riskLevel: 'low' },
        { name: 'write-file', riskLevel: 'high' }, // escalated medium→high
        { name: 'http-fetch', riskLevel: 'high' },
        { name: 'deploy-staging', riskLevel: 'high' },
        { name: 'deploy-prod', riskLevel: 'critical' },
      ],
      violations: [
        { ruleId: 'G-CLASS', target: 'deploy-prod', message: 'R5 tool exceeds T2 ceiling' },
      ],
      delegationMap: [
        { ruleId: 'G-PERM', mechanism: 'hook', target: 'write-file' },
        { ruleId: 'G-DATA', mechanism: 'audit-only', target: 'deploy-staging' },
      ],
      blockedTools: ['deploy-prod'],
    });

    await save(testDir, 'post-expansion');

    // ── 3. Compute diff ───────────────────────────────────────────────

    const result = await diff(testDir, 'pre-expansion', 'post-expansion');

    // Not empty — changes detected
    expect(result.empty).toBe(false);
    expect(result.baseName).toBe('pre-expansion');
    expect(result.targetName).toBe('post-expansion');
    expect(result.baseTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.targetTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // ── 4. Tool risk escalation detected as regression ────────────────

    const writeFileRisk = result.toolRiskChanges.find(
      (c) => c.toolName === 'write-file',
    );
    expect(writeFileRisk).toBeDefined();
    expect(writeFileRisk!.oldRisk).toBe('medium');
    expect(writeFileRisk!.newRisk).toBe('high');
    expect(writeFileRisk!.direction).toBe('regression');

    // ── 5. Policy addition/removal detected ───────────────────────────

    const addedPolicy = result.policyChanges.find(
      (c) => c.ruleId === 'G-DATA' && c.action === 'added',
    );
    expect(addedPolicy).toBeDefined();
    expect(addedPolicy!.mechanism).toBe('audit-only');

    // ── 6. New violation detected as regression ───────────────────────

    const newViolation = result.violationChanges.find(
      (c) => c.ruleId === 'G-CLASS' && c.action === 'new',
    );
    expect(newViolation).toBeDefined();
    expect(newViolation!.direction).toBe('regression');
    expect(newViolation!.target).toBe('deploy-prod');

    // ── 7. Trust tier shift: blocked tool prominently reported ────────

    const blockedShift = result.trustTierShifts.find(
      (c) => c.toolName === 'deploy-prod' && c.field === 'blockedTools',
    );
    expect(blockedShift).toBeDefined();
    expect(blockedShift!.oldValue).toBe('unblocked');
    expect(blockedShift!.newValue).toBe('blocked');
    expect(blockedShift!.direction).toBe('regression');

    // Summary counts
    expect(result.summary.totalChanges).toBeGreaterThanOrEqual(3);
    expect(result.summary.regressions).toBeGreaterThanOrEqual(2);

    // ── 8. Identical snapshots produce empty diff ─────────────────────

    const emptyResult = await diff(testDir, 'pre-expansion', 'pre-expansion');
    expect(emptyResult.empty).toBe(true);
    expect(emptyResult.summary.totalChanges).toBe(0);
    expect(emptyResult.toolRiskChanges.length).toBe(0);
    expect(emptyResult.policyChanges.length).toBe(0);
    expect(emptyResult.violationChanges.length).toBe(0);
    expect(emptyResult.trustTierShifts.length).toBe(0);

    // ── 9. Renderer produces output for both formats ──────────────────

    const terminalLines = renderDiff(result);
    expect(terminalLines.length).toBeGreaterThan(0);
    expect(terminalLines.some((l) => l.includes('pre-expansion'))).toBe(true);
    expect(terminalLines.some((l) => l.includes('REGRESSION'))).toBe(true);

    const emptyLines = renderDiff(emptyResult);
    expect(emptyLines.some((l) => l.includes('No governance changes'))).toBe(true);

    const jsonOutput = renderDiffJson(result) as Record<string, unknown>;
    expect(jsonOutput['status']).toBe('ok');
    expect(jsonOutput['empty']).toBe(false);
    expect((jsonOutput['toolRiskChanges'] as unknown[]).length).toBeGreaterThan(0);
  });
});
