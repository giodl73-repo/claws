/**
 * L3 acceptance test for snapshot with violations — S04.
 *
 * Validates governance-neutral save vs governance-gated promote:
 * - Save is governance-neutral (succeeds even with violations)
 * - Promote is governance-gated (blocked with violations)
 * - Saved snapshot with violations can be restored for debugging
 * - Promote error reports which governance checks failed
 *
 * @module claws-sdk/tests/accept/e2e/snap-violations.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { save } from '../../../src/snapshot/save.js';
import { restore } from '../../../src/snapshot/restore.js';
import { promote, PromotionError } from '../../../src/snapshot/promote.js';

let testDir: string;
let fleetRoot: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-violations-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  fleetRoot = join(
    tmpdir(),
    `claws-fleet-violations-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
  await mkdir(fleetRoot, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  await rm(fleetRoot, { recursive: true, force: true });
});

/**
 * Write a workspace with specific violations and warnings in its IR.
 */
async function writeWorkspace(opts: {
  violations: Array<{ ruleId: string; target: string; message: string }>;
  warnings: Array<{ ruleId: string; message: string }>;
}): Promise<void> {
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({
      trustTier: 2,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    }, null, 2),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/policies/default.json'),
    JSON.stringify({ name: 'default', rules: ['g-perm', 'g-class'] }),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });

  const ir = {
    capabilities: {
      tools: [
        { name: 'admin-panel', description: 'Admin tool', riskLevel: 'high', oboFlag: false, classification: 'execution' },
        { name: 'send-email', description: 'Email tool', riskLevel: 'medium', oboFlag: true, classification: 'communication' },
      ],
      skills: [],
      agents: [],
    },
    analysis: {
      violations: opts.violations.map((v) => ({
        ruleId: v.ruleId,
        level: 'R4',
        message: v.message,
        target: v.target,
        diagnosticCode: `${v.ruleId}-001`,
        fixSuggestions: [],
        toolFuzzyMatches: [],
      })),
      warnings: opts.warnings.map((w) => ({
        ruleId: w.ruleId,
        level: 'R2',
        message: w.message,
        subRuleDiagnosticCode: `${w.ruleId}-001`,
        category: w.ruleId.split('-').slice(0, 2).join('-'),
        subRuleIndex: 1,
      })),
      enforcementPlan: {
        blockedTools: opts.violations.map((v) => v.target),
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
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

describe('snapshot with violations contract (S04)', () => {
  it('save is governance-neutral, promote is governance-gated, restore recovers violations, promote error details', async () => {
    // ── 1. Save is governance-neutral (succeeds with violations) ──────

    await writeWorkspace({
      violations: [
        { ruleId: 'G-CLASS', target: 'admin-panel', message: 'R4 tool in T2 workspace' },
      ],
      warnings: [
        { ruleId: 'OBO-WITHOUT-ELICIT', message: 'send-email has no elicitation policy' },
      ],
    });

    const saveResult = await save(testDir, 'known-state-with-warnings');

    // Save succeeds despite violations
    expect(saveResult.name).toBe('known-state-with-warnings');
    expect(saveResult.fileCount).toBeGreaterThan(0);
    expect(saveResult.manifest.files.length).toBeGreaterThan(0);

    // The governance-ir.json was captured in the snapshot
    const irEntry = saveResult.manifest.files.find(
      (f) => f.relativePath === '.claws/compiled/governance-ir.json',
    );
    expect(irEntry).toBeDefined();

    // ── 2. Promote is governance-gated (blocked with violations) ──────

    try {
      await promote(testDir, 'known-state-with-warnings', fleetRoot);
      expect.unreachable('should have thrown PromotionError');
    } catch (err) {
      expect(err).toBeInstanceOf(PromotionError);
      const promErr = err as PromotionError;

      // ── 4. Promote error reports which checks failed ────────────────
      expect(promErr.violations.length).toBe(1);
      expect(promErr.violations[0]!.ruleId).toBe('G-CLASS');
      expect(promErr.violations[0]!.target).toBe('admin-panel');
      expect(promErr.violations[0]!.message).toContain('R4 tool');
      expect(promErr.message).toContain('pinch gate failed');
      expect(promErr.message).toContain('1 violation');
      expect(promErr.message).toContain('G-CLASS');
    }

    // ── 3. Saved snapshot with violations can be restored ─────────────

    // First, modify workspace to create additional violations
    await writeWorkspace({
      violations: [
        { ruleId: 'G-CLASS', target: 'admin-panel', message: 'R4 tool in T2 workspace' },
        { ruleId: 'G-PERM', target: 'send-email', message: 'Missing permission grant' },
        { ruleId: 'G-DATA', target: 'data-export', message: 'Unclassified data flow' },
      ],
      warnings: [],
    });

    // Read the modified IR to confirm it's different
    const modifiedIR = JSON.parse(
      await readFile(join(testDir, '.claws/compiled/governance-ir.json'), 'utf-8'),
    );
    expect(modifiedIR.analysis.violations.length).toBe(3);

    // Restore the original snapshot — should bring back 1 violation, 1 warning
    const restoreResult = await restore(testDir, 'known-state-with-warnings');
    expect(restoreResult.name).toBe('known-state-with-warnings');
    expect(restoreResult.fileCount).toBeGreaterThan(0);

    // Read the restored IR — should have the original 1 violation
    const restoredIR = JSON.parse(
      await readFile(join(testDir, '.claws/compiled/governance-ir.json'), 'utf-8'),
    );
    expect(restoredIR.analysis.violations.length).toBe(1);
    expect(restoredIR.analysis.violations[0].ruleId).toBe('G-CLASS');
    expect(restoredIR.analysis.violations[0].target).toBe('admin-panel');

    // Warnings are also preserved
    expect(restoredIR.analysis.warnings.length).toBe(1);
    expect(restoredIR.analysis.warnings[0].ruleId).toBe('OBO-WITHOUT-ELICIT');

    // ── 5. Save is neutral for multiple violations too ────────────────

    await writeWorkspace({
      violations: [
        { ruleId: 'G-CLASS', target: 'admin-panel', message: 'R4 tool' },
        { ruleId: 'G-PERM', target: 'deploy', message: 'Missing perm' },
      ],
      warnings: [
        { ruleId: 'OBO-WITHOUT-ELICIT', message: 'No elicit policy' },
        { ruleId: 'G-INPUT-01', message: 'Untrusted input' },
      ],
    });

    const saveResult2 = await save(testDir, 'multi-violation-state');
    expect(saveResult2.name).toBe('multi-violation-state');
    expect(saveResult2.fileCount).toBeGreaterThan(0);

    // Promote of multi-violation also blocked
    try {
      await promote(testDir, 'multi-violation-state', fleetRoot);
      expect.unreachable('should have thrown PromotionError');
    } catch (err) {
      expect(err).toBeInstanceOf(PromotionError);
      const promErr = err as PromotionError;
      expect(promErr.violations.length).toBe(2);
      expect(promErr.violations.map((v) => v.ruleId).sort()).toEqual(['G-CLASS', 'G-PERM']);
    }
  });
});
