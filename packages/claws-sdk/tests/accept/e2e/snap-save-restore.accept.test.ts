/**
 * L3: Snapshot integrity contract acceptance test.
 *
 * Validates the core snapshot contract:
 * - save captures all governance files
 * - manifest hashes are correct
 * - restore is byte-identical
 * - tamper detection fires on single modified byte
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { save } from '../../../src/snapshot/save.js';
import { restore } from '../../../src/snapshot/restore.js';
import { TamperError, hashBuffer, computeWorkspaceHash } from '../../../src/snapshot/integrity.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });

  // Full governance workspace
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({
      trustTier: 2,
      suppressions: [],
      policySet: 'default',
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
  await writeFile(
    join(testDir, '.claws/compiled/governance-ir.json'),
    JSON.stringify({
      capabilities: {},
      analysis: { violations: [] },
      intents: [],
      delegationMap: [],
      conflicts: { conflicts: [], errorCount: 0, warningCount: 0 },
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-13T00:00:00Z', schemaVersion: 1 },
    }, null, 2),
    'utf-8',
  );

  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/cache/hashes.json'),
    JSON.stringify({ compositeHash: 'accept-test', sdkVersion: '0.36.0', storedAt: '2026-04-13T00:00:00Z' }),
    'utf-8',
  );
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('snapshot integrity contract', () => {
  it('save captures all governance files, hashes are correct, restore is byte-identical, tamper detection on single byte', async () => {
    // ── 1. Save captures all governance files ──
    const saveResult = await save(testDir, 'contract');
    const paths = saveResult.manifest.files.map((f) => f.relativePath).sort();
    expect(paths).toContain('claws.json');
    expect(paths).toContain('.claws/policies/default.json');
    expect(paths).toContain('.claws/compiled/governance-ir.json');
    expect(paths).toContain('.claws/cache/hashes.json');

    // ── 2. Manifest hashes are correct ──
    expect(saveResult.manifest.schemaVersion).toBe(1);
    expect(saveResult.manifest.clawsVersion).toBeTruthy();
    expect(saveResult.manifest.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    for (const entry of saveResult.manifest.files) {
      const filePath = join(testDir, '.claws/snapshots/contract/files', entry.relativePath);
      const data = await readFile(filePath);
      expect(entry.sha256).toBe(hashBuffer(data));
      expect(entry.size).toBe(data.length);
    }

    // workspaceHash is the composite
    expect(saveResult.manifest.workspaceHash).toBe(
      computeWorkspaceHash(saveResult.manifest.files),
    );

    // ── 3. Restore is byte-identical ──
    // Save originals for comparison
    const originals = new Map<string, Buffer>();
    for (const entry of saveResult.manifest.files) {
      originals.set(entry.relativePath, await readFile(join(testDir, entry.relativePath)));
    }

    // Modify workspace
    await writeFile(join(testDir, 'claws.json'), '{"modified":true}', 'utf-8');
    await writeFile(join(testDir, '.claws/policies/default.json'), '{}', 'utf-8');

    // Restore
    await restore(testDir, 'contract');

    // Verify byte-identical
    for (const [relPath, origData] of originals) {
      const restored = await readFile(join(testDir, relPath));
      expect(restored).toEqual(origData);
    }

    // ── 4. Tamper detection on single modified byte ──
    // Save a fresh snapshot to tamper
    await save(testDir, 'tamper-contract');

    // Modify exactly one byte in a snapshot file
    const targetFile = join(
      testDir,
      '.claws/snapshots/tamper-contract/files/claws.json',
    );
    const data = await readFile(targetFile);
    const tampered = Buffer.from(data);
    // Flip one byte (change first '{' to '[')
    tampered[0] = 0x5b; // '['
    await writeFile(targetFile, tampered);

    try {
      await restore(testDir, 'tamper-contract');
      expect.unreachable('should have thrown TamperError');
    } catch (err) {
      expect(err).toBeInstanceOf(TamperError);
      const tamperErr = err as TamperError;
      expect(tamperErr.failedFiles.length).toBeGreaterThanOrEqual(1);
      const clawsFail = tamperErr.failedFiles.find(
        (f) => f.relativePath === 'claws.json',
      );
      expect(clawsFail).toBeDefined();
      expect(clawsFail!.pass).toBe(false);
      expect(clawsFail!.reason).toBe('hash mismatch');
    }
  });
});
