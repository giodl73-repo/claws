/**
 * Config backup and restore for migration safety.
 *
 * Creates a timestamped backup of claws.json before any migration runs
 * and restores the original on failure. The backup lives alongside the
 * config file as `claws.json.bak.{timestamp}`.
 *
 * @module claws-sdk/doctor/migrate/backup
 */

import { copyFile, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAWS_CONFIG_FILE } from '../../types/sidecar.js';

/**
 * Result of a backup operation.
 */
export interface BackupResult {
  /** Absolute path to the backup file. */
  readonly backupPath: string;
  /** Whether the backup was created successfully. */
  readonly success: boolean;
}

/**
 * Create a timestamped backup of claws.json.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns BackupResult with path to the backup file
 */
export async function createBackup(workspaceRoot: string): Promise<BackupResult> {
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);
  const timestamp = Date.now();
  const backupPath = join(workspaceRoot, `${CLAWS_CONFIG_FILE}.bak.${timestamp}`);

  try {
    await copyFile(configPath, backupPath);
    return { backupPath, success: true };
  } catch {
    return { backupPath, success: false };
  }
}

/**
 * Restore claws.json from a backup file.
 *
 * Reads the backup content and writes it back to claws.json, then
 * removes the backup file. This ensures the config is restored even
 * if the original was partially written during a failed migration.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param backupPath - Absolute path to the backup file
 * @returns true if restore succeeded, false otherwise
 */
export async function restoreBackup(
  workspaceRoot: string,
  backupPath: string,
): Promise<boolean> {
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);

  try {
    const content = await readFile(backupPath, 'utf-8');
    await writeFile(configPath, content, 'utf-8');
    await unlink(backupPath);
    return true;
  } catch {
    return false;
  }
}
