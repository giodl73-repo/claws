/**
 * L0: Snapshot promote unit tests.
 *
 * Covers:
 * 1. Pinch gate enforced — promotion blocked on failing governance checks
 * 2. provenance.json contains all required fields
 * 3. Fleet registry write creates correct directory structure
 * 4. Version listing returns snapshots sorted by timestamp
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import { save } from '../../src/snapshot/save.js';
import { promote, PromotionError, computeBundleHash } from '../../src/snapshot/promote.js';
import { TamperError } from '../../src/snapshot/integrity.js';
import {
  listVersions,
  listNames,
  readProvenance,
  readRegistryManifest,
  registryVersionDir,
  nextVersion,
  storePromoted,
  verifyProvenance,
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

/** Set up workspace with governance files and a specific IR, then save a snapshot. */
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
    `claws-promote-unit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  fleetDir = join(
    tmpdir(),
    `claws-fleet-unit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
  await mkdir(fleetDir, { recursive: true });

  // Create minimal governance files
  await writeFile(join(testDir, 'claws.json'), '{"trustTier":2}', 'utf-8');
  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(join(testDir, '.claws/policies/default.json'), '{"name":"default"}', 'utf-8');
  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(join(testDir, '.claws/cache/hashes.json'), '{}', 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  await rm(fleetDir, { recursive: true, force: true });
});

describe('pinch gate enforcement', () => {
  it('blocks promotion when governance violations exist', async () => {
    const ir = makeIR({
      violations: [
        {
          ruleId: 'SEC-001',
          level: 5,
          message: 'Critical tool without approval gate',
          target: 'shell_exec',
          diagnosticCode: 'CLAWS-V001',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'SEC-002',
          level: 3,
          message: 'Network tool without redaction',
          target: 'http_fetch',
          diagnosticCode: 'CLAWS-V002',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
    });
    await saveSnapshotWithIR(testDir, 'failing-snap', ir);

    await expect(
      promote(testDir, 'failing-snap', fleetDir),
    ).rejects.toThrow(PromotionError);

    try {
      await promote(testDir, 'failing-snap', fleetDir);
    } catch (err) {
      expect(err).toBeInstanceOf(PromotionError);
      const promErr = err as PromotionError;
      expect(promErr.violations).toHaveLength(2);
      expect(promErr.violations[0]!.ruleId).toBe('SEC-001');
      expect(promErr.violations[1]!.ruleId).toBe('SEC-002');
      expect(promErr.message).toContain('pinch gate failed');
      expect(promErr.message).toContain('2 violation(s)');
    }
  });
});

describe('provenance fields', () => {
  it('provenance.json contains all required fields', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'clean-snap', ir);

    const result = await promote(testDir, 'clean-snap', fleetDir, { signer: 'test-user' });

    expect(result.provenance.clawsVersion).toBe('0.36.0');
    expect(result.provenance.workspaceHash).toBeTruthy();
    expect(result.provenance.timestamp).toBeTruthy();
    expect(result.provenance.signer).toBe('test-user');
    expect(result.provenance.bundleHash).toBeTruthy();

    // Verify the provenance.json is written to disk
    const diskProvenance = await readProvenance(fleetDir, 'clean-snap', result.version);
    expect(diskProvenance.clawsVersion).toBe(result.provenance.clawsVersion);
    expect(diskProvenance.workspaceHash).toBe(result.provenance.workspaceHash);
    expect(diskProvenance.timestamp).toBe(result.provenance.timestamp);
    expect(diskProvenance.signer).toBe(result.provenance.signer);
    expect(diskProvenance.bundleHash).toBe(result.provenance.bundleHash);
  });
});

describe('fleet registry directory structure', () => {
  it('creates correct directory structure with manifest and provenance', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'struct-snap', ir);

    const result = await promote(testDir, 'struct-snap', fleetDir);

    const versionDir = registryVersionDir(fleetDir, 'struct-snap', result.version);

    // Verify directory structure
    const manifestStat = await stat(join(versionDir, 'manifest.json'));
    expect(manifestStat.isFile()).toBe(true);

    const provenanceStat = await stat(join(versionDir, 'provenance.json'));
    expect(provenanceStat.isFile()).toBe(true);

    const filesDirStat = await stat(join(versionDir, 'files'));
    expect(filesDirStat.isDirectory()).toBe(true);

    // Verify manifest matches
    const manifest = JSON.parse(await readFile(join(versionDir, 'manifest.json'), 'utf-8'));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.clawsVersion).toBeTruthy();
    expect(manifest.files.length).toBeGreaterThan(0);

    // Verify files are copied
    const clawsJson = await readFile(
      join(versionDir, 'files/claws.json'),
      'utf-8',
    );
    expect(clawsJson).toBe('{"trustTier":2}');
  });
});

describe('version listing', () => {
  it('returns promoted snapshots sorted by timestamp (newest first)', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'multi-snap', ir);

    // Promote twice — should create v1 and v2
    await promote(testDir, 'multi-snap', fleetDir, { signer: 'user-a' });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 50));
    await promote(testDir, 'multi-snap', fleetDir, { signer: 'user-b' });

    const versions = await listVersions(fleetDir, 'multi-snap');
    expect(versions).toHaveLength(2);
    // Newest first
    expect(versions[0]!.version).toBe(2);
    expect(versions[0]!.signer).toBe('user-b');
    expect(versions[1]!.version).toBe(1);
    expect(versions[1]!.signer).toBe('user-a');
    // Timestamps are descending
    expect(versions[0]!.timestamp >= versions[1]!.timestamp).toBe(true);
  });
});

describe('edge cases — promote error paths', () => {
  it('throws TamperError when snapshot files are tampered', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'tamper-snap', ir);

    // Tamper with a file in the snapshot
    await writeFile(
      join(testDir, '.claws/snapshots/tamper-snap/files/claws.json'),
      '{"TAMPERED":true}',
      'utf-8',
    );

    await expect(
      promote(testDir, 'tamper-snap', fleetDir),
    ).rejects.toThrow(TamperError);
  });

  it('throws Error when snapshot lacks governance-ir.json', async () => {
    // Remove governance-ir.json before saving
    await rm(join(testDir, '.claws/compiled/governance-ir.json'), { force: true });
    await save(testDir, 'no-ir-snap');

    await expect(
      promote(testDir, 'no-ir-snap', fleetDir),
    ).rejects.toThrow('does not contain governance-ir.json');
  });

  it('uses default signer "local" when no signer specified', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'default-signer', ir);

    const result = await promote(testDir, 'default-signer', fleetDir);
    expect(result.provenance.signer).toBe('local');
  });
});

describe('edge cases — fleet registry', () => {
  it('nextVersion returns 1 for non-existent name directory', async () => {
    const version = await nextVersion(fleetDir, 'nonexistent');
    expect(version).toBe(1);
  });

  it('listVersions returns empty array for non-existent name', async () => {
    const versions = await listVersions(fleetDir, 'nonexistent');
    expect(versions).toHaveLength(0);
  });

  it('listNames returns empty array when registry dir does not exist', async () => {
    const names = await listNames(fleetDir);
    expect(names).toHaveLength(0);
  });

  it('listNames only includes directories, not files', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'names-test', ir);
    await promote(testDir, 'names-test', fleetDir);

    // Create a stray file in the registry dir
    await writeFile(
      join(fleetDir, '.claws/fleet-registry/stray-file.txt'),
      'not a directory',
      'utf-8',
    );

    const names = await listNames(fleetDir);
    expect(names).toContain('names-test');
    expect(names).not.toContain('stray-file.txt');
  });

  it('nextVersion skips non-version directories', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'skip-snap', ir);
    await promote(testDir, 'skip-snap', fleetDir);

    // Create a non-version directory
    const { registryNameDir } = await import('../../src/snapshot/fleet-registry.js');
    await mkdir(join(registryNameDir(fleetDir, 'skip-snap'), 'notaversion'), { recursive: true });

    const version = await nextVersion(fleetDir, 'skip-snap');
    expect(version).toBe(2); // Only v1 is valid, next is v2
  });

  it('nextVersion returns 1 when directory exists but has no version entries', async () => {
    // Create name directory with no v* subdirectories, just stray files
    const { registryNameDir } = await import('../../src/snapshot/fleet-registry.js');
    const nameDir = registryNameDir(fleetDir, 'empty-name');
    await mkdir(nameDir, { recursive: true });
    await writeFile(join(nameDir, 'readme.txt'), 'stray file', 'utf-8');

    const version = await nextVersion(fleetDir, 'empty-name');
    expect(version).toBe(1);
  });

  it('listVersions skips versions with invalid provenance', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'bad-prov', ir);
    await promote(testDir, 'bad-prov', fleetDir);

    // Create a v2 directory with no provenance.json
    const v2Dir = registryVersionDir(fleetDir, 'bad-prov', 2);
    await mkdir(v2Dir, { recursive: true });

    const versions = await listVersions(fleetDir, 'bad-prov');
    // Only v1 should be listed (v2 has no provenance)
    expect(versions).toHaveLength(1);
    expect(versions[0]!.version).toBe(1);
  });
});

describe('verifyProvenance', () => {
  it('returns true for untampered promoted snapshot', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'verify-snap', ir);
    const result = await promote(testDir, 'verify-snap', fleetDir);

    const valid = await verifyProvenance(fleetDir, 'verify-snap', result.version);
    expect(valid).toBe(true);
  });

  it('returns false when files have been tampered', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'tamper-verify', ir);
    const result = await promote(testDir, 'tamper-verify', fleetDir);

    // Tamper with a file in the registry
    const versionDir = registryVersionDir(fleetDir, 'tamper-verify', result.version);
    await writeFile(join(versionDir, 'files/claws.json'), '{"TAMPERED":true}', 'utf-8');

    const valid = await verifyProvenance(fleetDir, 'tamper-verify', result.version);
    expect(valid).toBe(false);
  });
});

describe('readRegistryManifest', () => {
  it('reads manifest.json from a promoted version', async () => {
    const ir = makeIR({ violations: [] });
    await saveSnapshotWithIR(testDir, 'manifest-read', ir);
    const result = await promote(testDir, 'manifest-read', fleetDir);

    const manifest = await readRegistryManifest(fleetDir, 'manifest-read', result.version);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.clawsVersion).toBeTruthy();
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(manifest.workspaceHash).toBeTruthy();
  });
});

describe('edge cases — computeBundleHash', () => {
  it('handles empty directory gracefully', async () => {
    const emptyDir = join(testDir, 'empty-bundle');
    await mkdir(emptyDir, { recursive: true });

    const hash = await computeBundleHash(emptyDir);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64); // SHA-256 hex
  });

  it('returns consistent hash for same content', async () => {
    const dir1 = join(testDir, 'hash-1');
    const dir2 = join(testDir, 'hash-2');
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir1, 'a.txt'), 'hello', 'utf-8');
    await writeFile(join(dir2, 'a.txt'), 'hello', 'utf-8');

    const hash1 = await computeBundleHash(dir1);
    const hash2 = await computeBundleHash(dir2);
    expect(hash1).toBe(hash2);
  });

  it('handles non-existent directory gracefully', async () => {
    const noDir = join(testDir, 'does-not-exist');
    const hash = await computeBundleHash(noDir);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);
  });

  it('hashes nested directories recursively', async () => {
    const dir = join(testDir, 'nested-bundle');
    await mkdir(join(dir, 'sub', 'deep'), { recursive: true });
    await writeFile(join(dir, 'root.txt'), 'root', 'utf-8');
    await writeFile(join(dir, 'sub', 'mid.txt'), 'mid', 'utf-8');
    await writeFile(join(dir, 'sub', 'deep', 'leaf.txt'), 'leaf', 'utf-8');

    const hash = await computeBundleHash(dir);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);
  });

  it('produces different hash for different content', async () => {
    const dir1 = join(testDir, 'diff-1');
    const dir2 = join(testDir, 'diff-2');
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir1, 'a.txt'), 'hello', 'utf-8');
    await writeFile(join(dir2, 'a.txt'), 'world', 'utf-8');

    const hash1 = await computeBundleHash(dir1);
    const hash2 = await computeBundleHash(dir2);
    expect(hash1).not.toBe(hash2);
  });

  it('sorts files deterministically (multiple files exercise all sort branches)', async () => {
    const dir = join(testDir, 'sort-test');
    await mkdir(dir, { recursive: true });
    // Create files that will sort in a, b, c order
    await writeFile(join(dir, 'alpha.txt'), 'a', 'utf-8');
    await writeFile(join(dir, 'beta.txt'), 'b', 'utf-8');
    await writeFile(join(dir, 'gamma.txt'), 'c', 'utf-8');

    const hash = await computeBundleHash(dir);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);

    // Same files in reverse should produce same hash (sort is deterministic)
    const dir2 = join(testDir, 'sort-test-2');
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir2, 'gamma.txt'), 'c', 'utf-8');
    await writeFile(join(dir2, 'beta.txt'), 'b', 'utf-8');
    await writeFile(join(dir2, 'alpha.txt'), 'a', 'utf-8');

    const hash2 = await computeBundleHash(dir2);
    expect(hash).toBe(hash2);
  });
});

describe('edge cases — storePromoted with missing files dir', () => {
  it('creates empty files dir when source has no files/ subdirectory', async () => {
    // Create a snapshot dir with no files/ subdirectory
    const fakeSnapDir = join(testDir, 'fake-snap-no-files');
    await mkdir(fakeSnapDir, { recursive: true });

    const manifest = {
      schemaVersion: 1,
      clawsVersion: '0.36.0',
      timestamp: new Date().toISOString(),
      workspaceHash: 'abc123',
      files: [],
    };
    const provenance = {
      clawsVersion: '0.36.0',
      workspaceHash: 'abc123',
      timestamp: new Date().toISOString(),
      signer: 'test',
      bundleHash: 'def456',
    };

    const version = await storePromoted(fleetDir, 'no-files', fakeSnapDir, manifest, provenance);
    expect(version).toBe(1);

    // Verify files/ dir was created even though source had none
    const filesDir = join(registryVersionDir(fleetDir, 'no-files', 1), 'files');
    const s = await stat(filesDir);
    expect(s.isDirectory()).toBe(true);
  });
});
