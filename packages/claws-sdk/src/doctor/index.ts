/**
 * Doctor module — workspace health diagnostics.
 *
 * @module claws-sdk/doctor
 */

export {
  runDoctor,
  createDefaultChecks,
  type DiagnosticSeverity,
  type Diagnostic,
  type CheckResult,
  type DoctorReport,
  type DoctorCheck,
  type DoctorOptions,
} from './orchestrator.js';
export {
  checkConfigSchema,
  checkArtifactCompat,
  checkDependencyAlignment,
  checkPolicySyntax,
  checkVaultKdf,
} from './checks/index.js';
export {
  runMigrations,
  detectVersion,
  findApplicable,
  createBackup,
  restoreBackup,
  CURRENT_SCHEMA_VERSION,
  v1ToV2,
  type Migration,
  type MigrationResult,
  type MigrationRunOptions,
  type BackupResult,
} from './migrate/index.js';
