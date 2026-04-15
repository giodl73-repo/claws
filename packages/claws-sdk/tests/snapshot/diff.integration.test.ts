/**
 * L1: Snapshot diff integration tests.
 *
 * Covers:
 * 1. diff between two snapshots with known governance changes produces expected categorized output
 * 2. diff between identical snapshots produces empty diff
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import { save } from '../../src/snapshot/save.js';
import { diff } from '../../src/snapshot/diff.js';

let testDir: string;

function makeFullIR(overrides: {
  toolRisk?: 'low' | 'medium' | 'high' | 'critical';
  violations?: GovernanceIR['analysis']['violations'];
  delegationMap?: GovernanceIR['delegationMap'];
  blockedTools?: string[];
  oboFlag?: boolean;
}): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'shell_exec',
          description: 'Execute shell commands',
          riskLevel: overrides.toolRisk ?? 'medium',
          oboFlag: overrides.oboFlag ?? false,
          classification: 'execution',
        },
        {
          name: 'file_read',
          description: 'Read files',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'filesystem',
        },
      ],
      skills: [
        {
          name: 'deploy',
          description: 'Deploy to production',
          requiredTools: ['shell_exec'],
          governanceLevel: 4,
        },
      ],
      agents: [
        {
          name: 'assistant',
          description: 'Main assistant',
          delegations: [],
          maxAutonomousLevel: 3,
        },
      ],
      workflows: [],
    },
    analysis: {
      violations: overrides.violations ?? [],
      warnings: [],
      enforcementPlan: {
        blockedTools: overrides.blockedTools ?? [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: overrides.delegationMap ?? [
      { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: '*' },
    ],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-13T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

async function saveWithIR(
  root: string,
  name: string,
  ir: GovernanceIR,
): Promise<void> {
  await writeFile(
    join(root, '.claws/compiled/governance-ir.json'),
    JSON.stringify(ir, null, 2),
    'utf-8',
  );
  await save(root, name);
}

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-diff-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
  await writeFile(join(testDir, 'claws.json'), '{"trustTier":2}', 'utf-8');
  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(join(testDir, '.claws/policies/default.json'), '{"name":"default"}', 'utf-8');
  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(join(testDir, '.claws/cache/hashes.json'), '{}', 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('snapshot diff integration', () => {
  it('produces categorized output for known governance changes', async () => {
    // Base: medium risk, no violations, one policy
    const baseIR = makeFullIR({
      toolRisk: 'medium',
      violations: [],
      delegationMap: [
        { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: '*' },
      ],
      blockedTools: [],
    });
    await saveWithIR(testDir, 'snap-before', baseIR);

    // Target: critical risk (escalation), new violation, added policy, blocked tool
    const targetIR = makeFullIR({
      toolRisk: 'critical',
      violations: [{
        ruleId: 'SEC-CRIT-01',
        level: 5,
        message: 'Critical tool running without approval',
        target: 'shell_exec',
        diagnosticCode: 'CLAWS-V100',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
      delegationMap: [
        { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: '*' },
        { ruleId: 'SEC-CRIT-01', mechanism: 'approval', target: 'shell_exec' },
      ],
      blockedTools: ['shell_exec'],
    });
    await saveWithIR(testDir, 'snap-after', targetIR);

    const result = await diff(testDir, 'snap-before', 'snap-after');

    // Tool risk escalation
    expect(result.toolRiskChanges).toHaveLength(1);
    expect(result.toolRiskChanges[0]!.direction).toBe('regression');
    expect(result.toolRiskChanges[0]!.oldRisk).toBe('medium');
    expect(result.toolRiskChanges[0]!.newRisk).toBe('critical');

    // New violation
    expect(result.violationChanges).toHaveLength(1);
    expect(result.violationChanges[0]!.action).toBe('new');
    expect(result.violationChanges[0]!.direction).toBe('regression');

    // Policy addition
    expect(result.policyChanges).toHaveLength(1);
    expect(result.policyChanges[0]!.action).toBe('added');
    expect(result.policyChanges[0]!.ruleId).toBe('SEC-CRIT-01');

    // Blocked tool shift
    const blockShift = result.trustTierShifts.find(
      (s) => s.field === 'blockedTools',
    );
    expect(blockShift).toBeDefined();
    expect(blockShift!.direction).toBe('regression');

    // Summary
    expect(result.empty).toBe(false);
    expect(result.summary.totalChanges).toBeGreaterThanOrEqual(3);
    expect(result.summary.regressions).toBeGreaterThanOrEqual(2);
  });

  it('produces empty diff between identical snapshots', async () => {
    const ir = makeFullIR({});
    await saveWithIR(testDir, 'snap-a', ir);

    // Re-save the exact same IR as a second snapshot
    await saveWithIR(testDir, 'snap-b', ir);

    const result = await diff(testDir, 'snap-a', 'snap-b');

    expect(result.empty).toBe(true);
    expect(result.summary.totalChanges).toBe(0);
    expect(result.toolRiskChanges).toHaveLength(0);
    expect(result.policyChanges).toHaveLength(0);
    expect(result.violationChanges).toHaveLength(0);
    expect(result.trustTierShifts).toHaveLength(0);
  });
});
