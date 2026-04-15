/**
 * L2: Snapshot save + restore e2e test.
 *
 * Full pipeline: save on reference workspace → tamper one file →
 * restore fails with TamperError → restore clean snapshot succeeds byte-identical.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { save } from '../../src/snapshot/save.js';
import { restore } from '../../src/snapshot/restore.js';
import { TamperError } from '../../src/snapshot/integrity.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-snap-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });

  // Set up a reference workspace
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({ trustTier: 3, suppressions: ['g-context'] }, null, 2),
    'utf-8',
  );
  await mkdir(join(testDir, '.claws/policies'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/policies/soc2.json'),
    '{"compliance":"soc2","rules":["g-perm","g-data","g-output"]}',
    'utf-8',
  );
  await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/compiled/governance-ir.json'),
    '{"compiler":{"schemaVersion":1,"compilerVersion":"0.36.0","compiledAt":"2026-04-13T00:00:00Z"}}',
    'utf-8',
  );
  await mkdir(join(testDir, '.claws/cache'), { recursive: true });
  await writeFile(
    join(testDir, '.claws/cache/hashes.json'),
    '{"compositeHash":"e2e-hash","sdkVersion":"0.36.0","storedAt":"2026-04-13T00:00:00Z"}',
    'utf-8',
  );
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('snapshot e2e pipeline', () => {
  it('save → tamper → restore fails → clean restore succeeds byte-identical', async () => {
    // Save original state
    const origClawsJson = await readFile(join(testDir, 'claws.json'));
    const origPolicy = await readFile(join(testDir, '.claws/policies/soc2.json'));
    const origIR = await readFile(join(testDir, '.claws/compiled/governance-ir.json'));

    // ── Phase 1: Save two snapshots ──
    const saveResult = await save(testDir, 'clean-snap');
    expect(saveResult.fileCount).toBe(4);

    await save(testDir, 'tampered-snap');

    // ── Phase 2: Tamper one file in tampered-snap ──
    const tamperedFile = join(
      testDir,
      '.claws/snapshots/tampered-snap/files/.claws/policies/soc2.json',
    );
    await writeFile(tamperedFile, '{"TAMPERED":"yes"}', 'utf-8');

    // ── Phase 3: Restore tampered snapshot → should fail ──
    try {
      await restore(testDir, 'tampered-snap');
      expect.unreachable('tampered restore should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TamperError);
      const tamperErr = err as TamperError;
      expect(tamperErr.failedFiles.length).toBe(1);
      expect(tamperErr.failedFiles[0]!.relativePath).toBe('.claws/policies/soc2.json');
    }

    // ── Phase 4: Modify workspace originals ──
    await writeFile(join(testDir, 'claws.json'), '{"MODIFIED":true}', 'utf-8');
    await writeFile(join(testDir, '.claws/policies/soc2.json'), '{}', 'utf-8');

    // ── Phase 5: Restore clean snapshot → should succeed byte-identical ──
    const restoreResult = await restore(testDir, 'clean-snap');
    expect(restoreResult.fileCount).toBe(4);

    expect(await readFile(join(testDir, 'claws.json'))).toEqual(origClawsJson);
    expect(await readFile(join(testDir, '.claws/policies/soc2.json'))).toEqual(origPolicy);
    expect(await readFile(join(testDir, '.claws/compiled/governance-ir.json'))).toEqual(origIR);
  });
});
