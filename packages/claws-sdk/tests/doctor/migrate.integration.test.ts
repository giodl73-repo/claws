/**
 * L1: Migration integration — tests that run the full migration pipeline
 * on realistic workspace fixtures.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runMigrations, CURRENT_SCHEMA_VERSION } from '../../src/doctor/migrate/runner.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-migrate-int-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('runMigrations() — full pipeline', () => {
  it('applies v1→v2 migration on a v1 config and writes updated file', async () => {
    // Write a v1 config with deprecated field names + unknown fields
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({
        trust: 3,
        suppress: ['P-001'],
        output: 'sarif',
        customExtension: { team: 'platform' },
      }),
    );

    const result = await runMigrations(tmpDir);

    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]!.fromVersion).toBe(1);
    expect(result.applied[0]!.toVersion).toBe(2);
    expect(result.backupPath).toBeTruthy();
    expect(result.error).toBeNull();

    // Read the updated config and verify
    const updated = JSON.parse(await readFile(join(tmpDir, 'claws.json'), 'utf-8'));
    expect(updated.trustTier).toBe(3);
    expect(updated.suppressions).toEqual(['P-001']);
    expect(updated.format).toBe('sarif');
    expect(updated.schemaVersion).toBe(2);
    expect(updated.failMode).toBeDefined();
    expect(updated.fleet).toBeDefined();

    // Unknown fields preserved
    expect(updated.customExtension).toEqual({ team: 'platform' });

    // Old field names should be gone
    expect(updated.trust).toBeUndefined();
    expect(updated.suppress).toBeUndefined();
    expect(updated.output).toBeUndefined();
  });

  it('is a no-op when config is already at current schema version', async () => {
    // Write a v2 config (already current)
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        trustTier: 2,
        failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
        fleet: { allowBypass: false },
      }),
    );

    const result = await runMigrations(tmpDir);

    expect(result.migrated).toBe(false);
    expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.applied).toHaveLength(0);
    expect(result.backupPath).toBeNull();
    expect(result.error).toBeNull();
  });
});
