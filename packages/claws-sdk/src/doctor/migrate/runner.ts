/**
 * Migration runner — detect current schema version, find applicable
 * migrations, and apply them in sequence.
 *
 * The runner reads claws.json, determines its schema version, finds
 * all migrations that need to be applied, and executes them in order.
 * It creates a backup before starting and restores on failure.
 *
 * @module claws-sdk/doctor/migrate/runner
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAWS_CONFIG_FILE } from '../../types/sidecar.js';
import {
  createBackup as defaultCreateBackup,
  restoreBackup as defaultRestoreBackup,
  type BackupResult,
} from './backup.js';
import { v1ToV2 } from './v1-to-v2.js';

/**
 * A migration transform from one schema version to the next.
 */
export interface Migration {
  /** Schema version this migration reads from. */
  readonly fromVersion: number;
  /** Schema version this migration produces. */
  readonly toVersion: number;
  /** Human-readable description of what changed. */
  readonly description: string;
  /** Apply the migration to a raw config object. */
  apply(config: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Result of running the migration pipeline.
 */
export interface MigrationResult {
  /** Whether any migrations were applied. */
  readonly migrated: boolean;
  /** Original schema version before migration. */
  readonly fromVersion: number;
  /** Final schema version after migration. */
  readonly toVersion: number;
  /** Migrations that were applied, in order. */
  readonly applied: readonly Migration[];
  /** Path to backup file (if created). */
  readonly backupPath: string | null;
  /** Error message if migration failed. */
  readonly error: string | null;
}

/**
 * The current schema version that claws expects.
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * All registered migrations, in order.
 */
const MIGRATIONS: readonly Migration[] = [v1ToV2];

/**
 * Detect the schema version of a raw config object.
 *
 * If `schemaVersion` is present and a number, use it.
 * Otherwise, infer v1 from the presence of deprecated field names,
 * or default to v1 for any config without an explicit version.
 */
export function detectVersion(config: Record<string, unknown>): number {
  if (typeof config['schemaVersion'] === 'number') {
    return config['schemaVersion'];
  }
  // No explicit version — assume v1
  return 1;
}

/**
 * Find migrations that need to be applied to go from `currentVersion`
 * to `CURRENT_SCHEMA_VERSION`.
 */
export function findApplicable(currentVersion: number): readonly Migration[] {
  return MIGRATIONS.filter(
    (m) => m.fromVersion >= currentVersion && m.toVersion <= CURRENT_SCHEMA_VERSION,
  );
}

/**
 * Options for runMigrations — allows overriding the migration list for testing.
 */
export interface MigrationRunOptions {
  /** Override the registered migrations list. */
  readonly migrations?: readonly Migration[];
  /** Override the backup function (for testing). */
  readonly createBackup?: (root: string) => Promise<BackupResult>;
  /** Override the restore function (for testing). */
  readonly restoreBackup?: (root: string, backupPath: string) => Promise<boolean>;
}

/**
 * Run all applicable migrations on a workspace's claws.json.
 *
 * 1. Reads the config file
 * 2. Detects the current schema version
 * 3. If already current, returns early (no-op)
 * 4. Creates a backup
 * 5. Applies migrations in sequence
 * 6. Writes the updated config
 * 7. On failure, restores from backup
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Optional overrides (e.g. custom migration list)
 * @returns MigrationResult describing what happened
 */
export async function runMigrations(
  workspaceRoot: string,
  options: MigrationRunOptions = {},
): Promise<MigrationResult> {
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);

  // Read config
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    return {
      migrated: false,
      fromVersion: 0,
      toVersion: 0,
      applied: [],
      backupPath: null,
      error: `${CLAWS_CONFIG_FILE} not found`,
    };
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {
      migrated: false,
      fromVersion: 0,
      toVersion: 0,
      applied: [],
      backupPath: null,
      error: `Invalid JSON in ${CLAWS_CONFIG_FILE}`,
    };
  }

  const currentVersion = detectVersion(config);

  // Already current — no-op
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return {
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      applied: [],
      backupPath: null,
      error: null,
    };
  }

  const migrationsList = options.migrations ?? MIGRATIONS;
  const applicable = migrationsList.filter(
    (m) => m.fromVersion >= currentVersion && m.toVersion <= CURRENT_SCHEMA_VERSION,
  );
  if (applicable.length === 0) {
    return {
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      applied: [],
      backupPath: null,
      error: `No migrations found for version ${currentVersion}`,
    };
  }

  // Create backup
  const backupFn = options.createBackup ?? defaultCreateBackup;
  const backup = await backupFn(workspaceRoot);
  if (!backup.success) {
    return {
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      applied: [],
      backupPath: null,
      error: 'Failed to create backup before migration',
    };
  }

  // Apply migrations in sequence
  const applied: Migration[] = [];
  let current = config;

  try {
    for (const migration of applicable) {
      current = migration.apply(current);
      applied.push(migration);
    }

    // Write updated config
    await writeFile(configPath, JSON.stringify(current, null, 2) + '\n', 'utf-8');

    return {
      migrated: true,
      fromVersion: currentVersion,
      toVersion: detectVersion(current),
      applied,
      backupPath: backup.backupPath,
      error: null,
    };
  } catch (err) {
    // Restore from backup on failure
    const restoreFn = options.restoreBackup ?? defaultRestoreBackup;
    await restoreFn(workspaceRoot, backup.backupPath);

    return {
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      applied: [],
      backupPath: null,
      error: `Migration failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
