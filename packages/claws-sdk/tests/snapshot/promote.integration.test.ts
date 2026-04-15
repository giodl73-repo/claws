/**
 * L1: Snapshot promote integration tests.
 *
 * Covers:
 * 1. End-to-end promote from reference workspace with provenance chain verification
 * 2. Promotion blocked when governance checks fail with clear error report
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import { save } from '../../src/snapshot/save.js';
import { promote, PromotionError, computeBundleHash } from '../../src/snapshot/promote.js';
import {
  readProvenance,
  readRegistryManifest,
  verifyProvenance,
  registryVersionDir,
  listVersions,
  listNames,
} from '../../src/snapshot/fleet-registry.js';

let testDir: string;
let fleetDir: string;

/** Build a minimal GovernanceIR for testing. */
function makeIR(overrides: Partial<{
  violations: GovernanceIR['analysis']['violations'];
}>): GovernanceIR {
  return {
    capabilities: {
      tools: [{
        name: 'shell_exec',
        description: 'Execute shell commands',
        riskLevel: 'high',
        oboFlag: false,
        classification: 'execution',
      }],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: overrides.violations ?? [],
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

async function setupWorkspace(root: string, ir: GovernanceIR): Promise<void> {
  await writeFile(join(root, 'claws.json'), '{"trustTier":2}', 'utf-8');
  await mkdir(join(root, '.claws/policies'), { recursive: true });
  await writeFile(join(root, '.claws/policies/default.json'), '{"name":"default"}', 'utf-8');
  await mkdir(join(root, '.claws/compiled'), { recursive: true });
  await writeFile(
    join(root, '.claws/compiled/governance-ir.json'),
    JSON.stringify(ir, null, 2),
    'utf-8',
  );
  await mkdir(join(root, '.claws/cache'), { recursive: true });
  await writeFile(join(root, '.claws/cache/hashes.json'), '{}', 'utf-8');
}

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-promote-int-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  fleetDir = join(
    tmpdir(),
    `claws-fleet-int-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
  await mkdir(fleetDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  await rm(fleetDir, { recursive: true, force: true });
});

describe('end-to-end promote with provenance chain verification', () => {
  it('promotes snapshot and verifies full provenance chain', async () => {
    const ir = makeIR({ violations: [] });
    await setupWorkspace(testDir, ir);
    await save(testDir, 'prod-snap');

    const result = await promote(testDir, 'prod-snap', fleetDir, {
      signer: 'ci-pipeline',
    });

    expect(result.name).toBe('prod-snap');
    expect(result.version).toBe(1);

    // Verify provenance on disk matches returned provenance
    const diskProvenance = await readProvenance(fleetDir, 'prod-snap', 1);
    expect(diskProvenance.clawsVersion).toBe(result.provenance.clawsVersion);
    expect(diskProvenance.signer).toBe('ci-pipeline');
    expect(diskProvenance.bundleHash).toBe(result.provenance.bundleHash);
    expect(diskProvenance.workspaceHash).toBe(result.provenance.workspaceHash);

    // Verify manifest on disk matches original snapshot manifest
    const registryManifest = await readRegistryManifest(fleetDir, 'prod-snap', 1);
    expect(registryManifest.schemaVersion).toBe(1);
    expect(registryManifest.files.length).toBeGreaterThan(0);

    // Verify provenance chain: bundleHash must match actual content
    const provenanceValid = await verifyProvenance(fleetDir, 'prod-snap', 1);
    expect(provenanceValid).toBe(true);

    // Verify fleet registry lists the name
    const names = await listNames(fleetDir);
    expect(names).toContain('prod-snap');

    // Verify version listing
    const versions = await listVersions(fleetDir, 'prod-snap');
    expect(versions).toHaveLength(1);
    expect(versions[0]!.signer).toBe('ci-pipeline');

    // Promote again — should create v2
    await new Promise((r) => setTimeout(r, 50));
    const result2 = await promote(testDir, 'prod-snap', fleetDir, {
      signer: 'ci-pipeline-v2',
    });
    expect(result2.version).toBe(2);

    const versions2 = await listVersions(fleetDir, 'prod-snap');
    expect(versions2).toHaveLength(2);
    // Newest first
    expect(versions2[0]!.version).toBe(2);
    expect(versions2[1]!.version).toBe(1);
  });
});

describe('promotion blocked with clear error report', () => {
  it('rejects promotion with detailed violation report when governance fails', async () => {
    const ir = makeIR({
      violations: [
        {
          ruleId: 'SEC-CRITICAL-001',
          level: 5,
          message: 'R5 fail-closed violation: tool can bypass approval',
          target: 'shell_exec',
          diagnosticCode: 'CLAWS-FC-001',
          fixSuggestions: [
            {
              direction: 'tighten',
              description: 'Add approval gate for shell_exec',
              target: 'shell_exec',
            },
          ],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'SEC-AUDIT-002',
          level: 4,
          message: 'Audit trail missing for OBO action',
          target: 'email_send',
          diagnosticCode: 'CLAWS-AT-002',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'POL-DRIFT-003',
          level: 3,
          message: 'Policy drift detected from baseline',
          target: 'default.json',
          diagnosticCode: 'CLAWS-PD-003',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
    });
    await setupWorkspace(testDir, ir);
    await save(testDir, 'failing-snap');

    try {
      await promote(testDir, 'failing-snap', fleetDir);
      expect.unreachable('should have thrown PromotionError');
    } catch (err) {
      expect(err).toBeInstanceOf(PromotionError);
      const promErr = err as PromotionError;

      // All 3 violations reported
      expect(promErr.violations).toHaveLength(3);

      // Error message contains rule IDs
      expect(promErr.message).toContain('SEC-CRITICAL-001');
      expect(promErr.message).toContain('SEC-AUDIT-002');
      expect(promErr.message).toContain('POL-DRIFT-003');
      expect(promErr.message).toContain('3 violation(s)');

      // Violations retain full structure
      expect(promErr.violations[0]!.target).toBe('shell_exec');
      expect(promErr.violations[0]!.diagnosticCode).toBe('CLAWS-FC-001');
      expect(promErr.violations[1]!.message).toContain('Audit trail');
      expect(promErr.violations[2]!.level).toBe(3);
    }

    // Verify nothing was written to fleet registry
    const names = await listNames(fleetDir);
    expect(names).toHaveLength(0);
  });
});
