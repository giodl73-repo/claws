/**
 * L0: Migration module — unit tests for v1→v2 migration, unknown field
 * preservation, backup creation, and restore on failure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { v1ToV2 } from '../../src/doctor/migrate/v1-to-v2.js';
import { createBackup, restoreBackup } from '../../src/doctor/migrate/backup.js';
import { detectVersion, runMigrations, findApplicable, CURRENT_SCHEMA_VERSION } from '../../src/doctor/migrate/runner.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-migrate-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ── v1-to-v2 migration ──────────────────────────────────────────────

describe('v1ToV2', () => {
  it('renames deprecated v1 fields to v2 names', () => {
    const v1Config: Record<string, unknown> = {
      trust: 3,
      suppress: ['P-001'],
      output: 'json',
      policy: 'strict',
      audit: 'summary',
    };

    const result = v1ToV2.apply(v1Config);

    expect(result['trustTier']).toBe(3);
    expect(result['suppressions']).toEqual(['P-001']);
    expect(result['format']).toBe('json');
    expect(result['policySet']).toBe('strict');
    expect(result['auditLevel']).toBe('summary');
    expect(result['schemaVersion']).toBe(2);

    // Old field names should be gone
    expect('trust' in result).toBe(false);
    expect('suppress' in result).toBe(false);
    expect('output' in result).toBe(false);
    expect('policy' in result).toBe(false);
    expect('audit' in result).toBe(false);
  });

  it('adds failMode and fleet defaults for fields not present', () => {
    const v1Config: Record<string, unknown> = { trust: 2 };

    const result = v1ToV2.apply(v1Config);

    expect(result['failMode']).toEqual({
      R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed',
    });
    expect(result['fleet']).toEqual({ allowBypass: false });
  });

  it('preserves unknown fields through migration (forward compatibility)', () => {
    const v1Config: Record<string, unknown> = {
      trust: 2,
      customField: 'my-value',
      experimental: { nested: true },
    };

    const result = v1ToV2.apply(v1Config);

    expect(result['customField']).toBe('my-value');
    expect(result['experimental']).toEqual({ nested: true });
    expect(result['trustTier']).toBe(2);
  });

  it('does not overwrite v2 fields that already exist', () => {
    const config: Record<string, unknown> = {
      trust: 2,
      trustTier: 4,        // Already has the v2 name
      failMode: { R1: 'closed', R2: 'closed', R3: 'closed', R4: 'closed', R5: 'closed' },
    };

    const result = v1ToV2.apply(config);

    // Existing v2 field should not be overwritten by rename
    expect(result['trustTier']).toBe(4);
    // trust should remain since trustTier already exists
    expect(result['trust']).toBe(2);
    // failMode should keep its custom value
    expect(result['failMode']).toEqual({
      R1: 'closed', R2: 'closed', R3: 'closed', R4: 'closed', R5: 'closed',
    });
  });
});

// ── detectVersion ────────────────────────────────────────────────────

describe('detectVersion', () => {
  it('returns explicit schemaVersion when present', () => {
    expect(detectVersion({ schemaVersion: 3 })).toBe(3);
  });

  it('defaults to v1 when no schemaVersion is set', () => {
    expect(detectVersion({ trust: 2 })).toBe(1);
  });

  it('defaults to v1 when schemaVersion is not a number', () => {
    expect(detectVersion({ schemaVersion: 'two' })).toBe(1);
  });
});

// ── backup ───────────────────────────────────────────────────────────

describe('createBackup', () => {
  it('creates a backup copy of claws.json', async () => {
    const original = JSON.stringify({ trust: 2 });
    await writeFile(join(tmpDir, 'claws.json'), original);

    const result = await createBackup(tmpDir);

    expect(result.success).toBe(true);
    expect(result.backupPath).toContain('claws.json.bak.');

    const backupContent = await readFile(result.backupPath, 'utf-8');
    expect(backupContent).toBe(original);
  });

  it('fails when claws.json does not exist', async () => {
    const result = await createBackup(tmpDir);
    expect(result.success).toBe(false);
  });
});

// ── restore ──────────────────────────────────────────────────────────

describe('restoreBackup', () => {
  it('restores claws.json from backup and removes backup file', async () => {
    const original = JSON.stringify({ trust: 2 });
    await writeFile(join(tmpDir, 'claws.json'), original);

    // Create a backup
    const backup = await createBackup(tmpDir);
    expect(backup.success).toBe(true);

    // Corrupt the config
    await writeFile(join(tmpDir, 'claws.json'), 'corrupted');

    // Restore
    const restored = await restoreBackup(tmpDir, backup.backupPath);
    expect(restored).toBe(true);

    // Config should be restored
    const restoredContent = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    expect(restoredContent).toBe(original);

    // Backup file should be removed
    await expect(access(backup.backupPath)).rejects.toThrow();
  });

  it('fails when backup file does not exist', async () => {
    await writeFile(join(tmpDir, 'claws.json'), '{}');
    const restored = await restoreBackup(tmpDir, join(tmpDir, 'nonexistent.bak'));
    expect(restored).toBe(false);
  });
});

// ── runMigrations error branches ─────────────────────────────────────

describe('runMigrations', () => {
  it('returns error when claws.json does not exist', async () => {
    const result = await runMigrations(tmpDir);
    expect(result.migrated).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error when claws.json contains invalid JSON', async () => {
    await writeFile(join(tmpDir, 'claws.json'), '{ broken json }');
    const result = await runMigrations(tmpDir);
    expect(result.migrated).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('is a no-op when config version >= CURRENT_SCHEMA_VERSION', async () => {
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION }),
    );
    const result = await runMigrations(tmpDir);
    expect(result.migrated).toBe(false);
    expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.error).toBeNull();
  });

  it('successfully applies v1→v2 migration', async () => {
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ trust: 3 }),
    );
    const result = await runMigrations(tmpDir);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);
    expect(result.applied).toHaveLength(1);
    expect(result.backupPath).toBeTruthy();
    expect(result.error).toBeNull();

    // Verify the file was written
    const updated = JSON.parse(await readFile(join(tmpDir, 'claws.json'), 'utf-8'));
    expect(updated.trustTier).toBe(3);
    expect(updated.schemaVersion).toBe(2);
  });

  it('returns error when no migrations match the current version', async () => {
    // Write a v1 config but pass an empty migrations list
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ trust: 2 }),
    );
    const result = await runMigrations(tmpDir, { migrations: [] });
    expect(result.migrated).toBe(false);
    expect(result.error).toContain('No migrations found');
  });

  it('returns error when backup creation fails', async () => {
    await writeFile(join(tmpDir, 'claws.json'), JSON.stringify({ trust: 2 }));

    const result = await runMigrations(tmpDir, {
      createBackup: async () => ({
        backupPath: join(tmpDir, 'claws.json.bak.fake'),
        success: false,
      }),
    });

    expect(result.migrated).toBe(false);
    expect(result.error).toContain('Failed to create backup');
  });

  it('restores backup and returns error when migration apply throws', async () => {
    const original = JSON.stringify({ trust: 2 });
    await writeFile(join(tmpDir, 'claws.json'), original);

    const throwingMigration = {
      fromVersion: 1,
      toVersion: 2,
      description: 'throws on purpose',
      apply(): Record<string, unknown> {
        throw new Error('intentional failure');
      },
    };

    const result = await runMigrations(tmpDir, { migrations: [throwingMigration] });
    expect(result.migrated).toBe(false);
    expect(result.error).toContain('intentional failure');

    // Original config should be restored
    const restored = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    expect(restored).toBe(original);
  });
});

// ── findApplicable ───────────────────────────────────────────────────

describe('findApplicable', () => {
  it('returns v1ToV2 for version 1', () => {
    const applicable = findApplicable(1);
    expect(applicable).toHaveLength(1);
    expect(applicable[0]!.fromVersion).toBe(1);
  });

  it('returns empty array for current version', () => {
    const applicable = findApplicable(CURRENT_SCHEMA_VERSION);
    expect(applicable).toHaveLength(0);
  });
});
