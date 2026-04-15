/**
 * L0: Snapshot save + restore unit tests.
 *
 * Covers:
 * 1. save creates manifest with correct SHA-256 hashes
 * 2. restore verifies integrity (passes on clean snapshot)
 * 3. tamper detected on modified file
 * 4. tamper detected on missing file
 * 5. list returns snapshots sorted by timestamp
 * 6. delete removes snapshot
 * 7. idempotent save overwrites cleanly
 * 8. workspaceHash is composite of all file hashes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { save } from '../../src/snapshot/save.js';
import { restore } from '../../src/snapshot/restore.js';
import { list, remove, exists } from '../../src/snapshot/storage.js';
import { TamperError, computeWorkspaceHash, hashBuffer } from '../../src/snapshot/integrity.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });

  // Create minimal governance files
  await writeFile(join(testDir, 'claws.json'), '{"trustTier":2}', 'utf-8');
  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/policies/default.json'),
    '{"name":"default"}',
    'utf-8',
  );
  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/compiled/governance-ir.json'),
    '{"compiler":{"schemaVersion":1}}',
    'utf-8',
  );
  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/cache/hashes.json'),
    '{"compositeHash":"abc"}',
    'utf-8',
  );
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('snapshot save', () => {
  it('creates manifest with correct SHA-256 hashes', async () => {
    const result = await save(testDir, 'test-snap');

    expect(result.name).toBe('test-snap');
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.manifest.schemaVersion).toBe(1);
    expect(result.manifest.clawsVersion).toBeTruthy();
    expect(result.manifest.timestamp).toBeTruthy();

    // Verify each file hash matches content
    for (const entry of result.manifest.files) {
      const filePath = join(testDir, '.claws/snapshots/test-snap/files', entry.relativePath);
      const data = await readFile(filePath);
      const expectedHash = hashBuffer(data);
      expect(entry.sha256).toBe(expectedHash);
    }
  });

  it('idempotent save overwrites cleanly', async () => {
    await save(testDir, 'idem');
    // Modify a file between saves
    await writeFile(join(testDir, 'claws.json'), '{"trustTier":3}', 'utf-8');
    const result2 = await save(testDir, 'idem');

    // Should succeed and have new content
    const manifestPath = join(testDir, '.claws/snapshots/idem/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
    expect(manifest.files.length).toBe(result2.fileCount);

    // The claws.json hash should reflect the new content
    const clawsEntry = manifest.files.find(
      (f: { relativePath: string }) => f.relativePath === 'claws.json',
    );
    expect(clawsEntry).toBeDefined();
    const newData = await readFile(join(testDir, '.claws/snapshots/idem/files/claws.json'));
    expect(hashBuffer(newData)).toBe(clawsEntry.sha256);
  });
});

describe('snapshot restore', () => {
  it('verifies integrity and restores files', async () => {
    await save(testDir, 'clean');

    // Modify original file
    await writeFile(join(testDir, 'claws.json'), '{"changed":true}', 'utf-8');

    // Restore should bring back original
    const result = await restore(testDir, 'clean');
    expect(result.fileCount).toBeGreaterThan(0);

    const restored = await readFile(join(testDir, 'claws.json'), 'utf-8');
    expect(restored).toBe('{"trustTier":2}');
  });

  it('throws TamperError on modified file', async () => {
    await save(testDir, 'tampered');

    // Tamper with a file in the snapshot
    const tamperedPath = join(
      testDir,
      '.claws/snapshots/tampered/files/claws.json',
    );
    await writeFile(tamperedPath, '{"TAMPERED":true}', 'utf-8');

    await expect(restore(testDir, 'tampered')).rejects.toThrow(TamperError);

    try {
      await restore(testDir, 'tampered');
    } catch (err) {
      expect(err).toBeInstanceOf(TamperError);
      const tamperErr = err as TamperError;
      expect(tamperErr.failedFiles.length).toBe(1);
      expect(tamperErr.failedFiles[0]!.relativePath).toBe('claws.json');
      expect(tamperErr.failedFiles[0]!.reason).toBe('hash mismatch');
    }
  });

  it('throws TamperError on missing file', async () => {
    await save(testDir, 'missing');

    // Remove a file from the snapshot
    await rm(join(testDir, '.claws/snapshots/missing/files/claws.json'));

    try {
      await restore(testDir, 'missing');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TamperError);
      const tamperErr = err as TamperError;
      const failed = tamperErr.failedFiles.find(
        (f) => f.relativePath === 'claws.json',
      );
      expect(failed).toBeDefined();
      expect(failed!.reason).toBe('file missing');
      expect(failed!.actual).toBeNull();
    }
  });
});

describe('snapshot list', () => {
  it('returns snapshots sorted by timestamp', async () => {
    await save(testDir, 'snap-a');
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 50));
    await save(testDir, 'snap-b');

    const snapshots = await list(testDir);
    expect(snapshots.length).toBe(2);
    // Newest first
    expect(snapshots[0]!.name).toBe('snap-b');
    expect(snapshots[1]!.name).toBe('snap-a');
    expect(snapshots[0]!.fileCount).toBeGreaterThan(0);
    expect(snapshots[0]!.timestamp).toBeTruthy();
  });
});

describe('snapshot delete', () => {
  it('removes snapshot directory', async () => {
    await save(testDir, 'to-delete');
    expect(await exists(testDir, 'to-delete')).toBe(true);

    await remove(testDir, 'to-delete');
    expect(await exists(testDir, 'to-delete')).toBe(false);
  });
});

describe('snapshot save — branch coverage', () => {
  it('captures files from nested subdirectories within policies', async () => {
    // Create a subdirectory inside policies to exercise the recursive
    // collectFiles path (line 63-64 of save.ts)
    await mkdir(join(testDir, '.claws/policies/nested'), { recursive: true });
    await writeFile(
      join(testDir, '.claws/policies/nested/custom.json'),
      '{"name":"custom"}',
      'utf-8',
    );

    const result = await save(testDir, 'nested-snap');

    // Should include both default.json and nested/custom.json
    const paths = result.manifest.files.map((f) => f.relativePath);
    expect(paths).toContain('.claws/policies/default.json');
    expect(paths).toContain('.claws/policies/nested/custom.json');
  });

  it('handles save when a governance source file is missing', async () => {
    // Remove claws.json — resolveGovernanceFiles should skip it
    await rm(join(testDir, 'claws.json'));

    const result = await save(testDir, 'missing-source');

    // Should still succeed but without claws.json in the manifest
    const paths = result.manifest.files.map((f) => f.relativePath);
    expect(paths).not.toContain('claws.json');
    expect(result.fileCount).toBeGreaterThan(0); // other files still captured
  });
});

describe('workspaceHash', () => {
  it('is composite of all file hashes', async () => {
    const result = await save(testDir, 'hash-test');
    const expected = computeWorkspaceHash(result.manifest.files);
    expect(result.manifest.workspaceHash).toBe(expected);
  });
});
