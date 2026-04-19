/**
 * Validate module — 12-check free-tier validator for compiled workspaces.
 *
 * Zero imports from `@craftworks`-scoped packages. Replaces the full rubric /
 * assertions / judge evaluation engine for the free tier with a fixed,
 * lightweight set of checks.
 *
 * @module claws-sdk/compiler/validate
 */

export type {
  CheckId,
  CheckResult,
  CheckSeverity,
  EmitResultShape,
  ValidationCheck,
  ValidationReport,
} from './types.js';

export {
  ALL_CHECKS,
  checkAuditChain,
  checkCircularDeps,
  checkEmitTarget,
  checkHandlerTypes,
  checkOutputHash,
  checkPlatformAlignment,
  checkR5FailClosed,
  checkRequiredFields,
  checkRuleCoverage,
  checkSchemaConformance,
  checkSidecarVersion,
  checkTrustLevels,
} from './checks.js';

export { validate } from './validator.js';

export { formatReportJson, formatReportText } from './formatter.js';
