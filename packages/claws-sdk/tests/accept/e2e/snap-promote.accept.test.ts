/**
 * L3 acceptance test for snapshot promote — S03.
 *
 * Validates the promotion pipeline:
 * - Promotion blocked when pinch gate fails
 * - Provenance.json has all required fields
 * - Registry stores versioned snapshots
 * - BundleHash matches actual content
 *
 * @module claws-sdk/tests/accept/e2e/snap-promote.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { save } from '../../../src/snapshot/save.js';
import { promote, computeBundleHash, PromotionError } from '../../../src/snapshot/promote.js';
import { readProvenance, listVersions, verifyProvenance } from '../../../src/snapshot/fleet-registry.js';
import { snapshotDir } from '../../../src/snapshot/storage.js';

let testDir: string;
let fleetRoot: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-promote-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  fleetRoot = join(
    tmpdir(),
    `claws-fleet-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
  await mkdir(fleetRoot, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  await rm(fleetRoot, { recursive: true, force: true });
});

/**
 * Write a full governance workspace with configurable violations.
 */
async function writeWorkspace(violations: Array<{
  ruleId: string;
  target: string;
  message: string;
}> = []): Promise<void> {
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({
      trustTier: 3,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    }, null, 2),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/policies/default.json'),
    JSON.stringify({ name: 'default', rules: ['g-perm', 'g-class', 'g-data'] }),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });

  const ir = {
    capabilities: {
      tools: [
        { name: 'read-file', description: 'Read', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'write-file', description: 'Write', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
      ],
      skills: [],
      agents: [],
    },
    analysis: {
      violations: violations.map((v) => ({
        ruleId: v.ruleId,
        level: 'R3',
        message: v.message,
        target: v.target,
        diagnosticCode: `${v.ruleId}-001`,
        fixSuggestions: [],
        toolFuzzyMatches: [],
      })),
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

describe('snapshot promote contract (S03)', () => {
  it('pinch gate blocks violations, provenance complete, registry versioned, bundleHash matches', async () => {
    // ── 1. Promotion blocked when pinch gate fails ────────────────────

    await writeWorkspace([
      { ruleId: 'G-CLASS', target: 'admin-panel', message: 'R4 tool exceeds T3 ceiling' },
    ]);
    await save(testDir, 'with-violations');

    try {
      await promote(testDir, 'with-violations', fleetRoot);
      expect.unreachable('should have thrown PromotionError');
    } catch (err) {
      expect(err).toBeInstanceOf(PromotionError);
      const promErr = err as PromotionError;
      expect(promErr.violations.length).toBe(1);
      expect(promErr.violations[0]!.ruleId).toBe('G-CLASS');
      expect(promErr.violations[0]!.target).toBe('admin-panel');
      expect(promErr.message).toContain('pinch gate failed');
      expect(promErr.message).toContain('G-CLASS');
    }

    // ── 2. Clean snapshot promotes successfully ────────────────────────

    await writeWorkspace([]); // zero violations
    await save(testDir, 'enterprise-v2.3');

    const result = await promote(testDir, 'enterprise-v2.3', fleetRoot, {
      signer: 'fleet-admin',
    });

    expect(result.name).toBe('enterprise-v2.3');
    expect(result.version).toBe(1);

    // ── 3. Provenance.json has all required fields ────────────────────

    const prov = result.provenance;
    expect(prov.clawsVersion).toBeTruthy();
    expect(prov.workspaceHash).toBeTruthy();
    expect(typeof prov.workspaceHash).toBe('string');
    expect(prov.workspaceHash.length).toBe(64); // SHA-256 hex
    expect(prov.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(prov.signer).toBe('fleet-admin');
    expect(prov.bundleHash).toBeTruthy();
    expect(typeof prov.bundleHash).toBe('string');
    expect(prov.bundleHash.length).toBe(64); // SHA-256 hex

    // Read back from registry
    const storedProv = await readProvenance(fleetRoot, 'enterprise-v2.3', 1);
    expect(storedProv.clawsVersion).toBe(prov.clawsVersion);
    expect(storedProv.workspaceHash).toBe(prov.workspaceHash);
    expect(storedProv.signer).toBe('fleet-admin');
    expect(storedProv.bundleHash).toBe(prov.bundleHash);

    // ── 4. Registry stores versioned snapshots ────────────────────────

    // Promote again — should create v2
    await save(testDir, 'enterprise-v2.3-r2');
    // Overwrite snapshot with same workspace content to get a clean one
    await writeWorkspace([]);
    await save(testDir, 'enterprise-v2.3');

    const result2 = await promote(testDir, 'enterprise-v2.3', fleetRoot, {
      signer: 'fleet-admin',
    });
    expect(result2.version).toBe(2);

    // List versions — should show both
    const versions = await listVersions(fleetRoot, 'enterprise-v2.3');
    expect(versions.length).toBe(2);
    expect(versions.some((v) => v.version === 1)).toBe(true);
    expect(versions.some((v) => v.version === 2)).toBe(true);

    // ── 5. BundleHash matches actual content ──────────────────────────

    const snapDir = snapshotDir(testDir, 'enterprise-v2.3');
    const actualBundleHash = await computeBundleHash(join(snapDir, 'files'));
    expect(result2.provenance.bundleHash).toBe(actualBundleHash);

    // Verify provenance chain through registry utility
    const valid = await verifyProvenance(fleetRoot, 'enterprise-v2.3', 2);
    expect(valid).toBe(true);
  });
});
