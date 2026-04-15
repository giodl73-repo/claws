/**
 * L2: Snapshot diff e2e test.
 *
 * Full lifecycle: save snap1 on reference workspace → modify policy
 * (escalate tool risk, add violation) → save snap2 → diff →
 * verify categorized output shows escalation as regression and new
 * violation in categorized output.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import { save } from '../../src/snapshot/save.js';
import { diff } from '../../src/snapshot/diff.js';
import { renderDiff, renderDiffJson } from '../../src/snapshot/diff-renderer.js';

let testDir: string;

function makeGovernanceIR(overrides: {
  toolRisk: 'low' | 'medium' | 'high' | 'critical';
  violations: GovernanceIR['analysis']['violations'];
  delegationMap: GovernanceIR['delegationMap'];
}): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'shell_exec',
          description: 'Execute shell commands',
          riskLevel: overrides.toolRisk,
          oboFlag: false,
          classification: 'execution',
        },
        {
          name: 'file_write',
          description: 'Write files to disk',
          riskLevel: 'medium',
          oboFlag: false,
          classification: 'filesystem',
        },
        {
          name: 'http_fetch',
          description: 'HTTP requests',
          riskLevel: 'medium',
          oboFlag: true,
          classification: 'network',
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
          description: 'Main assistant agent',
          delegations: [],
          maxAutonomousLevel: 3,
        },
      ],
      workflows: [
        {
          name: 'ci-pipeline',
          description: 'CI/CD pipeline',
          steps: ['build', 'test', 'deploy'],
          requiresApproval: true,
        },
      ],
    },
    analysis: {
      violations: overrides.violations,
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: overrides.delegationMap,
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-diff-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });

  // Create reference workspace
  await writeFile(join(testDir, 'claws.json'), '{"trustTier":3}', 'utf-8');
  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/policies/base-policy.json'),
    JSON.stringify({ name: 'base-policy', rules: ['AUDIT-001'] }),
    'utf-8',
  );
  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(join(testDir, '.claws/cache/hashes.json'), '{}', 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('snapshot diff e2e', () => {
  it('full lifecycle: save → modify → save → diff → verify', async () => {
    // Step 1: Write baseline GovernanceIR and save snap1
    const baselineIR = makeGovernanceIR({
      toolRisk: 'high',
      violations: [],
      delegationMap: [
        { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: '*' },
      ],
    });
    await writeFile(
      join(testDir, '.claws/compiled/governance-ir.json'),
      JSON.stringify(baselineIR, null, 2),
      'utf-8',
    );
    await save(testDir, 'snap1');

    // Step 2: Modify — escalate shell_exec from high→critical, add violation
    const modifiedIR = makeGovernanceIR({
      toolRisk: 'critical',
      violations: [{
        ruleId: 'SEC-CRITICAL-001',
        level: 5,
        message: 'Critical tool shell_exec has no approval gate',
        target: 'shell_exec',
        diagnosticCode: 'CLAWS-V500',
        fixSuggestions: [
          { direction: 'tighten', description: 'Add approval gate', target: 'shell_exec' },
          { direction: 'relax', description: 'Downgrade to R4', target: 'SEC-CRITICAL-001' },
        ],
        toolFuzzyMatches: [],
      }],
      delegationMap: [
        { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: '*' },
        { ruleId: 'SEC-CRITICAL-001', mechanism: 'approval', target: 'shell_exec' },
      ],
    });
    await writeFile(
      join(testDir, '.claws/compiled/governance-ir.json'),
      JSON.stringify(modifiedIR, null, 2),
      'utf-8',
    );
    await save(testDir, 'snap2');

    // Step 3: Run diff
    const result = await diff(testDir, 'snap1', 'snap2');

    // Step 4: Verify categorized output
    expect(result.empty).toBe(false);
    expect(result.baseName).toBe('snap1');
    expect(result.targetName).toBe('snap2');

    // Verify escalation detected as regression
    const escalation = result.toolRiskChanges.find(
      (c) => c.toolName === 'shell_exec',
    );
    expect(escalation).toBeDefined();
    expect(escalation!.oldRisk).toBe('high');
    expect(escalation!.newRisk).toBe('critical');
    expect(escalation!.direction).toBe('regression');

    // Verify new violation detected as regression
    const newViolation = result.violationChanges.find(
      (c) => c.ruleId === 'SEC-CRITICAL-001',
    );
    expect(newViolation).toBeDefined();
    expect(newViolation!.action).toBe('new');
    expect(newViolation!.direction).toBe('regression');

    // Verify policy addition
    const policyAdd = result.policyChanges.find(
      (c) => c.ruleId === 'SEC-CRITICAL-001',
    );
    expect(policyAdd).toBeDefined();
    expect(policyAdd!.action).toBe('added');

    // Verify summary counts
    expect(result.summary.regressions).toBeGreaterThanOrEqual(2);
    expect(result.summary.totalChanges).toBeGreaterThanOrEqual(3);

    // Step 5: Verify renderer produces output
    const lines = renderDiff(result);
    expect(lines.length).toBeGreaterThan(0);
    const fullOutput = lines.join('\n');
    expect(fullOutput).toContain('shell_exec');
    expect(fullOutput).toContain('REGRESSION');

    // Step 6: Verify JSON renderer
    const jsonObj = renderDiffJson(result) as Record<string, unknown>;
    expect(jsonObj.status).toBe('ok');
    expect(jsonObj.empty).toBe(false);
    expect(jsonObj.baseName).toBe('snap1');
    expect(jsonObj.targetName).toBe('snap2');
  });
});
