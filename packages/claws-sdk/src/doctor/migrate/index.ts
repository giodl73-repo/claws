/**
 * Migration module — schema version detection, migration runner,
 * and backup/restore for safe config evolution.
 *
 * @module claws-sdk/doctor/migrate
 */

export {
  runMigrations,
  detectVersion,
  findApplicable,
  CURRENT_SCHEMA_VERSION,
  type Migration,
  type MigrationResult,
  type MigrationRunOptions,
} from './runner.js';
export { createBackup, restoreBackup, type BackupResult } from './backup.js';
export { v1ToV2 } from './v1-to-v2.js';
