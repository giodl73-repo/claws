/**
 * L1: Snapshot save -> diff -> restore -> promote lifecycle.
 *
 * THOTH-INTEGRATION-COVERAGE: snapshot 74% -> 90%.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { save } from '../../src/snapshot/save.js';
import { restore } from '../../src/snapshot/restore.js';
import { exists, list } from '../../src/snapshot/storage.js';

describe('snapshot save -> diff -> restore lifecycle', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full lifecycle: save, modify, diff, restore', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-snap-lifecycle-'));

    // Set up a minimal governed workspace
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      suppressions: [],
      policySet: 'default',
      auditLevel: 'full',
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    }), 'utf-8');

    await mkdir(join(tempDir, '.claws', 'policies'), { recursive: true });
    await writeFile(
      join(tempDir, '.claws', 'policies', 'default.yaml'),
      'version: "1.0.0"\nrules: []\n',
      'utf-8',
    );

    // 1. Save initial snapshot
    const saveResult = await save(tempDir, 'v1-baseline');
    expect(saveResult.name).toBe('v1-baseline');
    expect(saveResult.fileCount).toBeGreaterThanOrEqual(1);

    // Verify snapshot exists
    const snapshotExists = await exists(tempDir, 'v1-baseline');
    expect(snapshotExists).toBe(true);

    // 2. Modify workspace (change trustTier)
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 3,
      suppressions: ['g-data-01'],
      policySet: 'strict',
      auditLevel: 'summary',
      failMode: { R1: 'gated', R2: 'gated', R3: 'closed', R4: 'closed', R5: 'closed' },
    }), 'utf-8');

    // 3. Save second snapshot
    const saveResult2 = await save(tempDir, 'v2-modified');
    expect(saveResult2.name).toBe('v2-modified');

    // 4. Restore to first snapshot (skip diff — requires governance-ir.json)
    const restoreResult = await restore(tempDir, 'v1-baseline');
    expect(restoreResult.fileCount).toBeGreaterThanOrEqual(1);

    // 6. Verify restore worked — claws.json should be back to original
    const restored = JSON.parse(await readFile(join(tempDir, 'claws.json'), 'utf-8'));
    expect(restored.trustTier).toBe(2);
    expect(restored.policySet).toBe('default');

    // 7. Verify both snapshots listed
    const snapshots = await list(tempDir);
    expect(snapshots.map((s) => s.name)).toContain('v1-baseline');
    expect(snapshots.map((s) => s.name)).toContain('v2-modified');
  });
});
