/**
 * PRESS compression adapter — unified governance pipeline that wires
 * together all optimization components from P21-P25.
 *
 * Pipeline stages (ordered):
 * 1. Pinch Profile Selection — select G0-G3 profile from configuration
 * 2. Cost Estimation — estimate token cost per governance rule
 * 3. Dead-Code Elimination — remove rules for absent tools / disabled policies
 * 4. Redundant Check Merging — combine compatible governance checks
 * 5. PRESS Compression — compress governance output to fit within budget
 * 6. Quality Validation — score compressed output against 5-dimension matrix
 *
 * @module claws-sdk/context/context-press
 */

import type {
  GovernanceLevel,
  PinchProfile,
  PinchProfileName,
} from '../optimize/pinch/pinch-profile.js';
import {
  getProfileByName,
  getProfileByLevel,
} from '../optimize/pinch/pinch-profile.js';
import type {
  GovernanceRuleDescriptor,
  GovernanceCostSummary,
} from '../optimize/pinch/governance-cost-estimator.js';
import { estimateGovernanceCost } from '../optimize/pinch/governance-cost-estimator.js';
import type { OrderingResult } from '../optimize/pinch/rule-ordering-optimizer.js';
import { optimizeRuleOrdering } from '../optimize/pinch/rule-ordering-optimizer.js';
import type {
  QualityMatrixResult,
  OriginalGovernance,
  CompressedGovernance,
} from '../optimize/pinch/risk-matrix.js';
import { evaluateQualityMatrix } from '../optimize/pinch/risk-matrix.js';
import type { GovernanceIR } from '../ir/governance-ir.js';
import type { DeadCodeResult } from '../optimize/dead-code.js';
import { eliminateDeadCode } from '../optimize/dead-code.js';
import type { MergeChecksResult } from '../optimize/merge-checks.js';
import { mergeRedundantChecks } from '../optimize/merge-checks.js';
import type { DenyIntent, ElicitIntent } from '../ir/mechanical-intent.js';

// ── Types ──────────────────────────────────────────────────────────────

/** Configuration for the PRESS compression pipeline. */
export interface PressConfig {
  /** Governance level (0-3) for profile selection. */
  readonly level?: GovernanceLevel;
  /** Profile name for profile selection (overrides level if both given). */
  readonly profileName?: PinchProfileName;
  /** Skip dead-code elimination. Default: false. */
  readonly skipDeadCode?: boolean;
  /** Skip redundant check merging. Default: false. */
  readonly skipMerge?: boolean;
}

/** Metrics from each pipeline stage. */
export interface PressStageMetrics {
  /** Token cost estimate from cost estimation stage. */
  readonly costEstimate: GovernanceCostSummary;
  /** Dead-code elimination result. */
  readonly deadCode: DeadCodeResult;
  /** Redundant check merging result. */
  readonly mergeChecks: MergeChecksResult;
  /** Rule ordering optimization result. */
  readonly ordering: OrderingResult;
  /** Quality matrix evaluation against the profile. */
  readonly quality: QualityMatrixResult;
}

/** Result of the full PRESS compression pipeline. */
export interface PressResult {
  /** The selected pinch profile. */
  readonly profile: PinchProfile;
  /** The optimized GovernanceIR after dead-code and merge passes. */
  readonly optimizedIR: GovernanceIR;
  /** Compressed governance output for quality validation. */
  readonly compressed: CompressedGovernance;
  /** Original governance snapshot for quality comparison. */
  readonly original: OriginalGovernance;
  /** Estimated output tokens after compression. */
  readonly outputTokens: number;
  /** Whether output fits within the profile token budget. */
  readonly withinBudget: boolean;
  /** Whether quality validation passed on all dimensions. */
  readonly qualityPassed: boolean;
  /** Per-stage metrics for diagnostics. */
  readonly stages: PressStageMetrics;
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert GovernanceIR intents to GovernanceRuleDescriptors for cost
 * estimation and rule ordering.
 */
function irToRuleDescriptors(ir: GovernanceIR): GovernanceRuleDescriptor[] {
  return ir.intents.map((intent) => {
    const numericLevel = typeof intent.level === 'number'
      ? intent.level
      : levelToNumeric(intent.level);

    // Estimate OBO delegation depth from delegation map
    const delegation = ir.delegationMap.find((d) => d.ruleId === intent.ruleId);
    const oboDelegationDepth = delegation && delegation.mechanism === 'approval' ? 1 : 0;

    // Estimate base tokens from description + reason/prompt length
    let textLength = intent.description.length;
    if (intent.kind === 'deny') textLength += (intent as DenyIntent).reason.length;
    if (intent.kind === 'elicit') textLength += (intent as ElicitIntent).prompt.length;
    const baseTokens = Math.max(10, Math.ceil(textLength / 4));

    return {
      id: intent.ruleId,
      weight: numericLevel / 5,
      riskLevel: numericLevel,
      oboDelegationDepth,
      baseTokens,
    };
  });
}

/**
 * Convert a string rule level to a numeric level (1-5).
 */
function levelToNumeric(level: string | number): number {
  if (typeof level === 'number') return level;
  const map: Record<string, number> = {
    info: 1,
    warning: 2,
    error: 3,
    critical: 4,
    fatal: 5,
  };
  return map[level] ?? 3;
}

/**
 * Extract OriginalGovernance from a GovernanceIR for quality scoring.
 */
function irToOriginalGovernance(ir: GovernanceIR): OriginalGovernance {
  const rules = ir.intents.map((intent) => {
    const base: { id: string; weight: number; riskLevel: string; remediation?: string } = {
      id: intent.ruleId,
      weight: (typeof intent.level === 'number' ? intent.level : levelToNumeric(intent.level)) / 5,
      riskLevel: String(intent.level),
    };
    if (intent.kind === 'deny') {
      base.remediation = (intent as DenyIntent).reason;
    }
    return base;
  });

  const oboChain = ir.delegationMap
    .filter((d) => d.mechanism === 'approval')
    .map((d) => ({
      actor: d.target,
      action: `enforce:${d.ruleId}`,
    }));

  const tensions = ir.conflicts.multiConstraintConflicts.map((c, i) => ({
    pair: `conflict-${i}`,
    description: typeof c === 'string' ? c : JSON.stringify(c),
  }));

  const remediations = ir.intents
    .filter((i) => i.kind === 'deny')
    .map((i) => (i as DenyIntent).reason);

  const riskLevel = ir.analysis.effectiveR5Count.total > 0 ? 'R5' : 'standard';

  return { rules, oboChain, tensions, remediations, riskLevel };
}

/**
 * Build CompressedGovernance from the optimized IR, applying profile
 * inclusion criteria to filter rules.
 */
function buildCompressedGovernance(
  ir: GovernanceIR,
  profile: PinchProfile,
  ordering: OrderingResult,
): CompressedGovernance {
  // Use ordered rule IDs from the optimizer to determine which rules survived
  const orderedIds = new Set(ordering.orderedRuleIds);

  const rules = ir.intents
    .filter((intent) => orderedIds.has(intent.ruleId))
    .map((intent) => {
      const base: { id: string; weight: number; riskLevel: string; remediation?: string } = {
        id: intent.ruleId,
        weight: (typeof intent.level === 'number' ? intent.level : levelToNumeric(intent.level)) / 5,
        riskLevel: String(intent.level),
      };
      if (intent.kind === 'deny') {
        base.remediation = (intent as DenyIntent).reason;
      }
      return base;
    });

  // OBO chain — always included (all profiles set includeObo: true)
  const oboChain = ir.delegationMap
    .filter((d) => d.mechanism === 'approval')
    .map((d) => ({
      actor: d.target,
      action: `enforce:${d.ruleId}`,
    }));

  // Tensions — include only if profile criteria allows
  const tensions = profile.inclusion.includeTensions
    ? ir.conflicts.multiConstraintConflicts.map((c, i) => ({
        pair: `conflict-${i}`,
        description: typeof c === 'string' ? c : JSON.stringify(c),
      }))
    : [];

  // Remediations — include only if profile criteria allows
  const remediations = profile.inclusion.includeRemediation
    ? ir.intents
        .filter((i) => i.kind === 'deny')
        .map((i) => (i as DenyIntent).reason)
    : [];

  const riskLevel = ir.analysis.effectiveR5Count.total > 0 ? 'R5' : 'standard';

  return { rules, oboChain, tensions, remediations, riskLevel };
}

// ── Pipeline ──────────────────────────────────────────────────────────

/**
 * Execute the full PRESS compression pipeline.
 *
 * Stage 1: Profile Selection — resolve G0-G3 profile
 * Stage 2: Cost Estimation — estimate tokens per rule
 * Stage 3: Dead-Code Elimination — remove inapplicable rules
 * Stage 4: Redundant Check Merging — combine compatible checks
 * Stage 5: PRESS Compression — order + compress to budget
 * Stage 6: Quality Validation — score against 5-dimension matrix
 *
 * @param ir - The compiled GovernanceIR to compress
 * @param config - Pipeline configuration
 * @returns Full PRESS result with metrics
 */
export function press(ir: GovernanceIR, config: PressConfig = {}): PressResult {
  // Stage 1: Profile Selection
  const profile = resolveProfile(config);

  // Snapshot original governance for quality comparison
  const original = irToOriginalGovernance(ir);

  // Stage 2: Cost Estimation (on original IR)
  const ruleDescriptors = irToRuleDescriptors(ir);
  const costEstimate = estimateGovernanceCost(ruleDescriptors);

  // Stage 3: Dead-Code Elimination
  const deadCode = config.skipDeadCode
    ? { ir, removedAbsentToolIntents: 0, removedDisabledIntents: 0, totalRemoved: 0, r5GuardedCount: 0, r5Warnings: [] as readonly string[] }
    : eliminateDeadCode(ir);

  // Stage 4: Redundant Check Merging
  const mergeChecks = config.skipMerge
    ? { ir: deadCode.ir, mergeCount: 0, preservedIncompatible: 0 }
    : mergeRedundantChecks(deadCode.ir);

  const optimizedIR = mergeChecks.ir;

  // Stage 5: PRESS Compression — rule ordering + budget fitting
  const optimizedDescriptors = irToRuleDescriptors(optimizedIR);
  const ordering = optimizeRuleOrdering(optimizedDescriptors, profile);

  // Build compressed governance from optimized IR
  const compressed = buildCompressedGovernance(optimizedIR, profile, ordering);

  // Stage 6: Quality Validation
  const quality = evaluateQualityMatrix(original, compressed, profile);

  const outputTokens = ordering.estimatedTokens;
  const withinBudget = ordering.withinBudget;
  const qualityPassed = quality.passed;

  return {
    profile,
    optimizedIR,
    compressed,
    original,
    outputTokens,
    withinBudget,
    qualityPassed,
    stages: {
      costEstimate,
      deadCode,
      mergeChecks,
      ordering,
      quality,
    },
  };
}

/**
 * Resolve the pinch profile from configuration.
 * Profile name takes precedence over level if both are specified.
 * Defaults to G2 (strict) if neither is given.
 */
function resolveProfile(config: PressConfig): PinchProfile {
  if (config.profileName) {
    return getProfileByName(config.profileName) ?? getProfileByLevel(2)!;
  }
  if (config.level !== undefined) {
    return getProfileByLevel(config.level) ?? getProfileByLevel(2)!;
  }
  return getProfileByLevel(2)!;
}
