/**
 * L0: Snapshot diff unit tests.
 *
 * Covers:
 * 1. diff detects tool risk escalation (high→critical) as regression
 * 2. diff detects tool risk de-escalation (critical→low) as improvement
 * 3. diff detects new violation as regression
 * 4. diff detects resolved violation as improvement
 * 5. diff detects policy addition/removal
 * 6. diff detects trust tier shift (classification, obo, blocked tools)
 * 7. diff errors when snapshot lacks governance-ir.json
 * 8. diff renderer renders all sections correctly
 * 9. diff between identical snapshots is empty
 * 10. obo flag removal is improvement, blocked tool unblocked is improvement
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import { save } from '../../src/snapshot/save.js';
import { diff } from '../../src/snapshot/diff.js';
import { renderDiff, renderDiffJson } from '../../src/snapshot/diff-renderer.js';
import { TamperError } from '../../src/snapshot/integrity.js';

let testDir: string;

/** Build a minimal GovernanceIR for testing. */
function makeIR(overrides: Partial<{
  tools: GovernanceIR['capabilities']['tools'];
  violations: GovernanceIR['analysis']['violations'];
  delegationMap: GovernanceIR['delegationMap'];
  blockedTools: string[];
}>): GovernanceIR {
  return {
    capabilities: {
      tools: overrides.tools ?? [
        {
          name: 'shell_exec',
          description: 'Execute shell commands',
          riskLevel: 'high',
          oboFlag: false,
          classification: 'execution',
        },
      ],
      skills: [],
      agents: [],
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
    delegationMap: overrides.delegationMap ?? [],
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

/** Set up a workspace with governance files and a specific IR, then save a snapshot. */
async function saveSnapshotWithIR(
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
    `claws-diff-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('snapshot diff — tool risk', () => {
  it('detects tool risk escalation (high→critical) as regression', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'high',
        oboFlag: false,
        classification: 'execution',
      }],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'critical',
        oboFlag: false,
        classification: 'execution',
      }],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    expect(result.empty).toBe(false);
    expect(result.toolRiskChanges).toHaveLength(1);
    expect(result.toolRiskChanges[0]!.toolName).toBe('shell_exec');
    expect(result.toolRiskChanges[0]!.oldRisk).toBe('high');
    expect(result.toolRiskChanges[0]!.newRisk).toBe('critical');
    expect(result.toolRiskChanges[0]!.direction).toBe('regression');
    expect(result.summary.regressions).toBeGreaterThanOrEqual(1);
  });
});

describe('snapshot diff — violations', () => {
  it('detects new violation as regression', async () => {
    const baseIR = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      violations: [{
        ruleId: 'SEC-001',
        level: 5,
        message: 'Critical tool without approval gate',
        target: 'shell_exec',
        diagnosticCode: 'CLAWS-V001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    expect(result.violationChanges).toHaveLength(1);
    expect(result.violationChanges[0]!.action).toBe('new');
    expect(result.violationChanges[0]!.direction).toBe('regression');
    expect(result.violationChanges[0]!.ruleId).toBe('SEC-001');
    expect(result.summary.regressions).toBeGreaterThanOrEqual(1);
  });

  it('detects resolved violation as improvement', async () => {
    const baseIR = makeIR({
      violations: [{
        ruleId: 'SEC-002',
        level: 3,
        message: 'Network tool without redaction',
        target: 'http_fetch',
        diagnosticCode: 'CLAWS-V002',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    expect(result.violationChanges).toHaveLength(1);
    expect(result.violationChanges[0]!.action).toBe('resolved');
    expect(result.violationChanges[0]!.direction).toBe('improvement');
    expect(result.summary.improvements).toBeGreaterThanOrEqual(1);
  });
});

describe('snapshot diff — policies', () => {
  it('detects policy addition and removal', async () => {
    const baseIR = makeIR({
      delegationMap: [
        { ruleId: 'POL-001', mechanism: 'hook', target: 'before_tool_call' },
      ],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      delegationMap: [
        { ruleId: 'POL-002', mechanism: 'approval', target: 'shell_exec' },
      ],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    expect(result.policyChanges).toHaveLength(2);

    const added = result.policyChanges.find((c) => c.action === 'added');
    const removed = result.policyChanges.find((c) => c.action === 'removed');

    expect(added).toBeDefined();
    expect(added!.ruleId).toBe('POL-002');
    expect(removed).toBeDefined();
    expect(removed!.ruleId).toBe('POL-001');
  });
});

describe('snapshot diff — trust tier shifts', () => {
  it('detects classification change and blocked tool shift', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'data_read',
        description: 'Read data',
        riskLevel: 'low',
        oboFlag: false,
        classification: 'data',
      }],
      blockedTools: [],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [{
        name: 'data_read',
        description: 'Read data',
        riskLevel: 'low',
        oboFlag: true,
        classification: 'network',
      }],
      blockedTools: ['data_read'],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    expect(result.trustTierShifts.length).toBeGreaterThanOrEqual(2);

    const classChange = result.trustTierShifts.find(
      (s) => s.field === 'classification',
    );
    expect(classChange).toBeDefined();
    expect(classChange!.oldValue).toBe('data');
    expect(classChange!.newValue).toBe('network');
    expect(classChange!.direction).toBe('neutral');

    const oboChange = result.trustTierShifts.find((s) => s.field === 'oboFlag');
    expect(oboChange).toBeDefined();
    expect(oboChange!.direction).toBe('regression');

    const blockChange = result.trustTierShifts.find(
      (s) => s.field === 'blockedTools',
    );
    expect(blockChange).toBeDefined();
    expect(blockChange!.newValue).toBe('blocked');
    expect(blockChange!.direction).toBe('regression');
  });

  it('detects obo flag removal as improvement and blocked tool unblocked', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'http_fetch',
        description: 'HTTP requests',
        riskLevel: 'medium',
        oboFlag: true,
        classification: 'network',
      }],
      blockedTools: ['http_fetch'],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [{
        name: 'http_fetch',
        description: 'HTTP requests',
        riskLevel: 'medium',
        oboFlag: false,
        classification: 'network',
      }],
      blockedTools: [],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    const oboShift = result.trustTierShifts.find((s) => s.field === 'oboFlag');
    expect(oboShift).toBeDefined();
    expect(oboShift!.direction).toBe('improvement');

    const blockShift = result.trustTierShifts.find((s) => s.field === 'blockedTools');
    expect(blockShift).toBeDefined();
    expect(blockShift!.oldValue).toBe('blocked');
    expect(blockShift!.newValue).toBe('unblocked');
    expect(blockShift!.direction).toBe('improvement');
    expect(result.summary.improvements).toBeGreaterThanOrEqual(2);
  });
});

describe('snapshot diff — tool risk de-escalation', () => {
  it('detects tool risk de-escalation (critical→low) as improvement', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'critical',
        oboFlag: false,
        classification: 'execution',
      }],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'low',
        oboFlag: false,
        classification: 'execution',
      }],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    expect(result.toolRiskChanges).toHaveLength(1);
    expect(result.toolRiskChanges[0]!.direction).toBe('improvement');
    expect(result.toolRiskChanges[0]!.oldRisk).toBe('critical');
    expect(result.toolRiskChanges[0]!.newRisk).toBe('low');
    expect(result.summary.improvements).toBeGreaterThanOrEqual(1);
  });
});

describe('snapshot diff — error cases', () => {
  it('errors when base snapshot lacks governance-ir.json', async () => {
    // Save a snapshot without governance-ir.json
    await rm(join(testDir, '.claws/compiled/governance-ir.json'), { force: true });
    await save(testDir, 'no-ir');

    // Save a valid snapshot
    const ir = makeIR({});
    await saveSnapshotWithIR(testDir, 'with-ir', ir);

    await expect(diff(testDir, 'no-ir', 'with-ir')).rejects.toThrow(
      'does not contain governance-ir.json',
    );
  });

  it('errors when target snapshot lacks governance-ir.json', async () => {
    const ir = makeIR({});
    await saveSnapshotWithIR(testDir, 'with-ir', ir);

    await rm(join(testDir, '.claws/compiled/governance-ir.json'), { force: true });
    await save(testDir, 'no-ir');

    await expect(diff(testDir, 'with-ir', 'no-ir')).rejects.toThrow(
      'does not contain governance-ir.json',
    );
  });
});

describe('snapshot diff — identical snapshots', () => {
  it('produces empty diff with no changes', async () => {
    const ir = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'high',
        oboFlag: false,
        classification: 'execution',
      }],
      violations: [{
        ruleId: 'SEC-001',
        level: 3,
        message: 'Test violation',
        target: 'shell_exec',
        diagnosticCode: 'CLAWS-V001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
      delegationMap: [
        { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: '*' },
      ],
    });
    await saveSnapshotWithIR(testDir, 'snap-a', ir);
    await saveSnapshotWithIR(testDir, 'snap-b', ir);

    const result = await diff(testDir, 'snap-a', 'snap-b');

    expect(result.empty).toBe(true);
    expect(result.summary.totalChanges).toBe(0);
    expect(result.summary.regressions).toBe(0);
    expect(result.summary.improvements).toBe(0);
    expect(result.summary.neutral).toBe(0);
  });
});

describe('diff renderer', () => {
  it('renders empty diff with no-changes message', async () => {
    const ir = makeIR({});
    await saveSnapshotWithIR(testDir, 'a', ir);
    await saveSnapshotWithIR(testDir, 'b', ir);

    const result = await diff(testDir, 'a', 'b');
    const lines = renderDiff(result);
    const output = lines.join('\n');

    expect(output).toContain('No governance changes detected');
    expect(output).toContain('a');
    expect(output).toContain('b');
  });

  it('renders all change categories with color labels', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'medium',
        oboFlag: false,
        classification: 'execution',
      }],
      violations: [],
      delegationMap: [
        { ruleId: 'OLD-001', mechanism: 'hook', target: 'before_tool_call' },
      ],
      blockedTools: [],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'critical',
        oboFlag: true,
        classification: 'network',
      }],
      violations: [{
        ruleId: 'SEC-001',
        level: 5,
        message: 'No approval gate',
        target: 'shell_exec',
        diagnosticCode: 'CLAWS-V001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
      delegationMap: [
        { ruleId: 'NEW-001', mechanism: 'approval', target: 'shell_exec' },
      ],
      blockedTools: ['shell_exec'],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');
    const lines = renderDiff(result);
    const output = lines.join('\n');

    expect(output).toContain('Tool Risk Changes');
    expect(output).toContain('REGRESSION');
    expect(output).toContain('Policy Changes');
    expect(output).toContain('Violation Changes');
    expect(output).toContain('Trust Tier Shifts');
    expect(output).toContain('Summary');
    expect(output).toContain('shell_exec');
  });

  it('renders JSON output with correct structure', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'test',
        riskLevel: 'low',
        oboFlag: false,
        classification: 'execution',
      }],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [{
        name: 'shell_exec',
        description: 'test',
        riskLevel: 'high',
        oboFlag: false,
        classification: 'execution',
      }],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');
    const json = renderDiffJson(result) as Record<string, unknown>;

    expect(json.status).toBe('ok');
    expect(json.baseName).toBe('base');
    expect(json.targetName).toBe('target');
    expect(json.empty).toBe(false);
    expect(json.summary).toBeDefined();
    expect(json.toolRiskChanges).toBeDefined();
    expect(json.policyChanges).toBeDefined();
    expect(json.violationChanges).toBeDefined();
    expect(json.trustTierShifts).toBeDefined();
    expect(json.baseTimestamp).toBeTruthy();
    expect(json.targetTimestamp).toBeTruthy();
  });

  it('renders improvement lines in green', async () => {
    const baseIR = makeIR({
      violations: [{
        ruleId: 'SEC-001',
        level: 3,
        message: 'Resolved issue',
        target: 'shell_exec',
        diagnosticCode: 'CLAWS-V001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');
    const lines = renderDiff(result);
    const output = lines.join('\n');

    expect(output).toContain('IMPROVEMENT');
    expect(output).toContain('Improvements:');
  });
});

describe('snapshot diff — tamper detection', () => {
  it('throws TamperError when a snapshot file is tampered', async () => {
    const ir = makeIR({});
    await saveSnapshotWithIR(testDir, 'tampered', ir);
    await saveSnapshotWithIR(testDir, 'clean', ir);

    // Tamper with a file in the first snapshot
    const tamperedPath = join(
      testDir,
      '.claws/snapshots/tampered/files/claws.json',
    );
    await writeFile(tamperedPath, '{"TAMPERED":true}', 'utf-8');

    await expect(diff(testDir, 'tampered', 'clean')).rejects.toThrow(TamperError);
  });
});

describe('snapshot diff — tool only in target (new tool)', () => {
  it('ignores tools only present in target for risk comparison', async () => {
    const baseIR = makeIR({
      tools: [{
        name: 'old_tool',
        description: 'Old tool',
        riskLevel: 'low',
        oboFlag: false,
        classification: 'data',
      }],
    });
    await saveSnapshotWithIR(testDir, 'base', baseIR);

    const targetIR = makeIR({
      tools: [
        {
          name: 'old_tool',
          description: 'Old tool',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'data',
        },
        {
          name: 'new_tool',
          description: 'New tool',
          riskLevel: 'high',
          oboFlag: false,
          classification: 'execution',
        },
      ],
    });
    await saveSnapshotWithIR(testDir, 'target', targetIR);

    const result = await diff(testDir, 'base', 'target');

    // new_tool has no base counterpart, so no risk change
    expect(result.toolRiskChanges).toHaveLength(0);
    // Also no trust tier shift for new_tool (only compares existing tools)
    const newToolShifts = result.trustTierShifts.filter(
      (s) => s.toolName === 'new_tool',
    );
    expect(newToolShifts).toHaveLength(0);
  });
});
