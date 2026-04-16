/**
 * Optimize module — governance optimization passes (dead-code elimination,
 * redundant check merging, DataFrame materialization, pinch compression).
 *
 * @module claws-sdk/optimize
 */

// ── Pinch profiles ────────────────────────────────────────────────────
export {
  getProfileByName,
  getProfileByLevel,
  getAllProfiles,
  isStrictSuperset,
} from './pinch/pinch-profile.js';

export type {
  GovernanceLevel,
  PinchProfileName,
  FidelityTargets,
  RuleInclusionCriteria,
  PinchProfile,
} from './pinch/pinch-profile.js';

// ── Quality matrix ────────────────────────────────────────────────────
export {
  getThresholdsForLevel,
  scoreRuleCoverage,
  scoreRiskAccuracy,
  scoreOboPreservation,
  scoreTensionVisibility,
  scoreRemediationActionability,
  computeAggregate,
  scoreDimensions,
  checkThresholds,
  evaluateQualityMatrix,
  QUALITY_DIMENSIONS,
} from './pinch/risk-matrix.js';

export type {
  QualityDimension,
  DimensionScores,
  QualityMatrixResult,
  QualityViolation,
  DimensionThresholds,
  GovernanceRule,
  OboEntry,
  TensionAnnotation,
  OriginalGovernance,
  CompressedGovernance,
} from './pinch/risk-matrix.js';

// ── Governance cost estimator ─────────────────────────────────────────
export {
  estimateRuleCost,
  estimateGovernanceCost,
} from './pinch/governance-cost-estimator.js';

export type {
  GovernanceRuleDescriptor,
  RuleCostEstimate,
  GovernanceCostSummary,
} from './pinch/governance-cost-estimator.js';

// ── Rule ordering optimizer ───────────────────────────────────────────
export {
  optimizeRuleOrdering,
} from './pinch/rule-ordering-optimizer.js';

export type {
  OrderingResult,
} from './pinch/rule-ordering-optimizer.js';

// ── Dead-code elimination ─────────────────────────────────────────────
export {
  eliminateDeadCode,
} from './dead-code.js';

export type {
  DeadCodeOptions,
  DeadCodeResult,
} from './dead-code.js';

// ── Redundant check merging ───────────────────────────────────────────
export {
  mergeRedundantChecks,
} from './merge-checks.js';

export type {
  MergeChecksResult,
} from './merge-checks.js';

// ── DataFrame materialization ─────────────────────────────────────────
export {
  materializeDataFrames,
  serializeDataFrame,
} from './materialize.js';

export type {
  MaterializedEntry,
  MaterializedDataFrame,
  MaterializeResult,
} from './materialize.js';
