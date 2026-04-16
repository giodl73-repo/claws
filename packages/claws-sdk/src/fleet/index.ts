/**
 * Fleet workspace discovery, classification, drift detection, and broadcast.
 *
 * @module claws-sdk/fleet
 */

export { scanFleet, findMarkers, discoverWorkspacePaths } from './scan.js';
export { classifyWorkspace } from './classify.js';
export { runParallel } from './runner.js';
export { computeGovernanceHash, detectDrift } from './drift.js';
export { establishBaseline, loadBaseline, loadAllBaselines } from './baseline.js';
export { classifySeverity } from './severity.js';
export { matchException, loadExceptions, saveExceptions, addException, purgeExpiredExceptions } from './exception.js';
export {
  broadcastPolicy,
  validatePolicyFile,
  atomicWritePolicy,
  recoverOrphanedStaging,
} from './broadcast.js';
export { checkTrustCompat, checkFleetTrustCompat } from './trust-compat.js';
export { generateFleetReport, buildComplianceMatrix } from './report.js';
export {
  countByStatus,
  getComplianceStatus,
  getFailingWorkspaces,
  overallComplianceRate,
} from './compliance-matrix.js';
export { formatReport, formatCsv, formatJson, formatTable } from './report-format.js';
export { activateKill, readSentinel, checkSentinelBlock } from './kill.js';
export { recordKillAuditEvent } from './kill-audit.js';
export { recordBroadcastAuditEvent } from './broadcast-audit.js';
export { guardedKill, isSentinelStale } from './double-kill.js';
export { killFleet } from './kill-fleet.js';
export type {
  KillPath,
  KillSentinel,
  KillResult,
} from './kill.js';
export type {
  GuardedKillOptions,
  GuardedKillResult,
} from './double-kill.js';
export type {
  FleetKillResult,
  FleetKillOptions,
} from './kill-fleet.js';
export type {
  ClassificationState,
  WorkspaceInfo,
  FleetConfig,
  ScanResult,
  ScanStats,
  ScanError,
  ProgressEvent,
  ProgressCallback,
} from './types.js';
export type {
  DriftSeverity,
  DriftStatus,
  DriftResult,
  FleetBaseline,
  FleetManifest,
  FleetException,
  FleetExceptionRegistry,
} from './drift-types.js';
export type {
  BroadcastOptions,
  BroadcastResult,
  BroadcastManifest,
  WorkspaceBroadcastResult,
  WorkspaceBroadcastPreview,
} from './broadcast.js';
export type {
  TrustCompatResult,
  FleetTrustCompatResult,
  PublishRestriction,
} from './trust-compat.js';
export type {
  ComplianceStatus,
  ComplianceCell,
  ComplianceRow,
  ComplianceMatrix,
  WorkspaceDetail,
  FleetReportSummary,
  FleetReport,
  FleetReportOptions,
} from './report.js';
export type {
  ReportFormat,
} from './report-format.js';
export { OC_MARKER_FILES, DEFAULT_EXCLUDE_DIRS, defaultFleetConfig } from './types.js';
