/**
 * L2 e2e test for uninstall round-trip.
 *
 * 1 test:
 *  init → uninstall → init produces same workspace state as fresh init
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { initWorkspace, uninstallWorkspace } from '@bic/claws-sdk/init';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '@bic/claws-sdk/types';

let tempDir: string;
let referenceDir: string;
let backupsDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-e2e-roundtrip-'));
  referenceDir = await mkdtemp(join(tmpdir(), 'claws-e2e-ref-'));
  backupsDir = await mkdtemp(join(tmpdir(), 'claws-e2e-backups-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  await rm(referenceDir, { recursive: true, force: true });
  await rm(backupsDir, { recursive: true, force: true });
});

describe('uninstall roundtrip e2e', () => {
  it('init → uninstall → init produces same workspace state as fresh init', async () => {
    const packageJson = JSON.stringify({ name: 'roundtrip-test', version: '1.0.0' });

    // Set up both workspaces identically
    await writeFile(join(tempDir, 'package.json'), packageJson, 'utf-8');
    await writeFile(join(referenceDir, 'package.json'), packageJson, 'utf-8');

    // Fresh init on reference
    const refResult = await initWorkspace(referenceDir);
    expect(refResult.exitCode).toBe(0);

    // init → uninstall → init on test workspace
    const firstInit = await initWorkspace(tempDir);
    expect(firstInit.exitCode).toBe(0);

    const uninstall = await uninstallWorkspace(tempDir, backupsDir);
    expect(uninstall.exitCode).toBe(0);
    expect(uninstall.status).toBe('uninstalled');

    const secondInit = await initWorkspace(tempDir);
    expect(secondInit.exitCode).toBe(0);

    // Compare: both workspaces should have the same structure

    // 1. claws.json should have same content (platform, trustTier, etc.)
    const testConfig = JSON.parse(await readFile(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8'));
    const refConfig = JSON.parse(await readFile(join(referenceDir, CLAWS_CONFIG_FILE), 'utf-8'));
    expect(testConfig.platform).toBe(refConfig.platform);
    expect(testConfig.trustTier).toBe(refConfig.trustTier);
    expect(testConfig.suppress).toEqual(refConfig.suppress);

    // 2. All 13 sidecar directories should exist
    const expectedDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    for (const dir of expectedDirs) {
      const testStat = await stat(join(tempDir, dir));
      const refStat = await stat(join(referenceDir, dir));
      expect(testStat.isDirectory()).toBe(true);
      expect(refStat.isDirectory()).toBe(true);
    }

    // 3. .gitignore should contain claws entries
    const testGitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    const refGitignore = await readFile(join(referenceDir, '.gitignore'), 'utf-8');
    expect(testGitignore).toContain('.claws/keys/');
    expect(testGitignore).toContain('.claws/secrets/');
    expect(refGitignore).toContain('.claws/keys/');
    expect(refGitignore).toContain('.claws/secrets/');
  });
});
