/**
 * L1: Snapshot save + restore integration tests.
 *
 * Covers:
 * 1. save+restore round-trip produces byte-identical files on reference workspace
 * 2. tamper detection fires on single modified file in snapshot
 * 3. save captures all expected governance files from reference workspace
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { save } from '../../src/snapshot/save.js';
import { restore } from '../../src/snapshot/restore.js';
import { TamperError } from '../../src/snapshot/integrity.js';

let testDir: string;

/**
 * Set up a workspace that resembles a real claws workspace:
 * claws.json, policies dir with multiple files, compiled IR, cache.
 */
async function setupWorkspace(root: string): Promise<void> {
  await writeFile(
    join(root, 'claws.json'),
    JSON.stringify({ trustTier: 2, suppressions: [], policySet: 'default' }, null, 2),
    'utf-8',
  );

  // Multiple policy files
  const policiesDir = join(root, '.claws/policies');
  await mkdir(policiesDir, { recursive: true });
  await writeFile(join(policiesDir, 'default.json'), '{"rules":["g-perm","g-class"]}', 'utf-8');
  await writeFile(join(policiesDir, 'strict.json'), '{"rules":["g-perm","g-class","g-data"]}', 'utf-8');

  // Nested policy subdirectory
  const customDir = join(policiesDir, 'custom');
  await mkdir(customDir, { recursive: true });
  await writeFile(join(customDir, 'team-a.json'), '{"team":"a"}', 'utf-8');

  // Compiled IR
  const compiledDir = join(root, '.claws/compiled');
  await mkdir(compiledDir, { recursive: true });
  await writeFile(
    join(compiledDir, 'governance-ir.json'),
    JSON.stringify({ compiler: { schemaVersion: 1, compilerVersion: '0.36.0' } }),
    'utf-8',
  );

  // Cache
  const cacheDir = join(root, '.claws/cache');
  await mkdir(cacheDir, { recursive: true });
  await writeFile(
    join(cacheDir, 'hashes.json'),
    JSON.stringify({ compositeHash: 'test-hash', sdkVersion: '0.36.0' }),
    'utf-8',
  );
}

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-int-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
  await setupWorkspace(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('save+restore round-trip', () => {
  it('produces byte-identical files', async () => {
    // Read original files
    const origClawsJson = await readFile(join(testDir, 'claws.json'));
    const origDefaultPolicy = await readFile(join(testDir, '.claws/policies/default.json'));
    const origStrictPolicy = await readFile(join(testDir, '.claws/policies/strict.json'));
    const origTeamA = await readFile(join(testDir, '.claws/policies/custom/team-a.json'));
    const origIR = await readFile(join(testDir, '.claws/compiled/governance-ir.json'));

    // Save snapshot
    const saveResult = await save(testDir, 'roundtrip');
    expect(saveResult.fileCount).toBe(6); // claws.json + 3 policies + IR + cache

    // Modify originals
    await writeFile(join(testDir, 'claws.json'), '{"modified":true}', 'utf-8');
    await writeFile(join(testDir, '.claws/policies/default.json'), '{}', 'utf-8');

    // Restore
    const restoreResult = await restore(testDir, 'roundtrip');
    expect(restoreResult.fileCount).toBe(6);

    // Verify byte-identical
    expect(await readFile(join(testDir, 'claws.json'))).toEqual(origClawsJson);
    expect(await readFile(join(testDir, '.claws/policies/default.json'))).toEqual(origDefaultPolicy);
    expect(await readFile(join(testDir, '.claws/policies/strict.json'))).toEqual(origStrictPolicy);
    expect(await readFile(join(testDir, '.claws/policies/custom/team-a.json'))).toEqual(origTeamA);
    expect(await readFile(join(testDir, '.claws/compiled/governance-ir.json'))).toEqual(origIR);
  });
});

describe('tamper detection', () => {
  it('fires on single modified file in snapshot', async () => {
    await save(testDir, 'tamper-test');

    // Tamper one file in the snapshot
    const tamperedPath = join(
      testDir,
      '.claws/snapshots/tamper-test/files/.claws/policies/default.json',
    );
    await writeFile(tamperedPath, '{"TAMPERED":true}', 'utf-8');

    try {
      await restore(testDir, 'tamper-test');
      expect.unreachable('should have thrown TamperError');
    } catch (err) {
      expect(err).toBeInstanceOf(TamperError);
      const tamperErr = err as TamperError;
      expect(tamperErr.failedFiles.length).toBe(1);
      expect(tamperErr.failedFiles[0]!.relativePath).toBe('.claws/policies/default.json');
    }
  });
});

describe('save captures all governance files', () => {
  it('captures claws.json, policies (nested), compiled IR, and cache', async () => {
    const result = await save(testDir, 'capture-test');

    const paths = result.manifest.files.map((f) => f.relativePath).sort();
    expect(paths).toContain('claws.json');
    expect(paths).toContain('.claws/policies/default.json');
    expect(paths).toContain('.claws/policies/strict.json');
    expect(paths).toContain('.claws/policies/custom/team-a.json');
    expect(paths).toContain('.claws/compiled/governance-ir.json');
    expect(paths).toContain('.claws/cache/hashes.json');
    expect(paths.length).toBe(6);
  });
});
