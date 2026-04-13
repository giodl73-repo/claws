/**
 * Loss matrix data — Spec 108 governance feature x platform loss scores.
 *
 * Single source of truth for loss-matrix data consumed by the platform router.
 * Imports shared types from claws-sdk/types/loss-matrix.ts (R1 amendment C03).
 *
 * Each entry maps a governance feature to a platform's enforcement capability
 * and a numeric fidelity loss score (0 = full fidelity, higher = more loss).
 *
 * @module claws-sdk/emit/loss-matrix
 */

import type { Platform } from '../types/platform.js';
import type { EnforcementCapabilityVector, LossMatrixEntry } from '../types/loss-matrix.js';

/**
 * Governance feature that the loss matrix tracks across platforms.
 */
export type GovernanceFeature =
  | 'tool-deny'
  | 'trust-tier'
  | 'audit-log'
  | 'elicitation-gate'
  | 'a2a-firewall'
  | 'workflow-inversion'
  | 'exec-approvals';

/**
 * A single cell in the Spec 108 loss matrix.
 */
export interface LossMatrixCell {
  /** The governance feature. */
  readonly feature: GovernanceFeature;
  /** The target platform. */
  readonly platform: Platform;
  /** Fidelity loss score: 0 = full, 1 = partial, 2 = advisory-only, 3 = unavailable. */
  readonly lossScore: number;
  /** Available enforcement layer on this platform for this feature. */
  readonly enforcement: 'full' | 'partial' | 'advisory' | 'none';
}

/**
 * Complete loss matrix for a set of platforms.
 */
export interface LossMatrix {
  /** All cells in the matrix. */
  readonly cells: readonly LossMatrixCell[];
  /** Platforms included in this matrix. */
  readonly platforms: readonly Platform[];
  /** Features tracked in this matrix. */
  readonly features: readonly GovernanceFeature[];
}

/**
 * All 7 governance features tracked by the loss matrix.
 */
const ALL_FEATURES: readonly GovernanceFeature[] = [
  'tool-deny',
  'trust-tier',
  'audit-log',
  'elicitation-gate',
  'a2a-firewall',
  'workflow-inversion',
  'exec-approvals',
];

/**
 * All 7 supported platforms.
 */
const ALL_PLATFORMS: readonly Platform[] = [
  'openclaw',
  'cursor',
  'claude-code',
  'github-copilot',
  'bedrock',
  'langgraph',
  'crewai',
];

/**
 * Per-platform enforcement capability data from Spec 108.
 *
 * openclaw: Full enforcement — hooks, deny, trust tiers, audit, all artifact types.
 * cursor: Rules file + .cursorrules — advisory enforcement, no hooks.
 * claude-code: CLAUDE.md + hooks — partial enforcement, no trust tiers.
 * github-copilot: .github/copilot-instructions.md — advisory only.
 * bedrock: Guardrails API — partial enforcement, no workflow inversion.
 * langgraph: Python decorators — partial enforcement, no trust tiers.
 * crewai: YAML config — advisory only, no hooks.
 */
const PLATFORM_LOSS: Record<Platform, Record<GovernanceFeature, { loss: number; enforcement: LossMatrixCell['enforcement'] }>> = {
  openclaw: {
    'tool-deny': { loss: 0, enforcement: 'full' },
    'trust-tier': { loss: 0, enforcement: 'full' },
    'audit-log': { loss: 0, enforcement: 'full' },
    'elicitation-gate': { loss: 0, enforcement: 'full' },
    'a2a-firewall': { loss: 0, enforcement: 'full' },
    'workflow-inversion': { loss: 0, enforcement: 'full' },
    'exec-approvals': { loss: 0, enforcement: 'full' },
  },
  cursor: {
    'tool-deny': { loss: 2, enforcement: 'advisory' },
    'trust-tier': { loss: 3, enforcement: 'none' },
    'audit-log': { loss: 2, enforcement: 'advisory' },
    'elicitation-gate': { loss: 2, enforcement: 'advisory' },
    'a2a-firewall': { loss: 3, enforcement: 'none' },
    'workflow-inversion': { loss: 3, enforcement: 'none' },
    'exec-approvals': { loss: 2, enforcement: 'advisory' },
  },
  'claude-code': {
    'tool-deny': { loss: 1, enforcement: 'partial' },
    'trust-tier': { loss: 2, enforcement: 'advisory' },
    'audit-log': { loss: 1, enforcement: 'partial' },
    'elicitation-gate': { loss: 1, enforcement: 'partial' },
    'a2a-firewall': { loss: 2, enforcement: 'advisory' },
    'workflow-inversion': { loss: 1, enforcement: 'partial' },
    'exec-approvals': { loss: 1, enforcement: 'partial' },
  },
  'github-copilot': {
    'tool-deny': { loss: 2, enforcement: 'advisory' },
    'trust-tier': { loss: 3, enforcement: 'none' },
    'audit-log': { loss: 3, enforcement: 'none' },
    'elicitation-gate': { loss: 2, enforcement: 'advisory' },
    'a2a-firewall': { loss: 3, enforcement: 'none' },
    'workflow-inversion': { loss: 3, enforcement: 'none' },
    'exec-approvals': { loss: 2, enforcement: 'advisory' },
  },
  bedrock: {
    'tool-deny': { loss: 1, enforcement: 'partial' },
    'trust-tier': { loss: 1, enforcement: 'partial' },
    'audit-log': { loss: 0, enforcement: 'full' },
    'elicitation-gate': { loss: 1, enforcement: 'partial' },
    'a2a-firewall': { loss: 2, enforcement: 'advisory' },
    'workflow-inversion': { loss: 3, enforcement: 'none' },
    'exec-approvals': { loss: 1, enforcement: 'partial' },
  },
  langgraph: {
    'tool-deny': { loss: 1, enforcement: 'partial' },
    'trust-tier': { loss: 3, enforcement: 'none' },
    'audit-log': { loss: 1, enforcement: 'partial' },
    'elicitation-gate': { loss: 1, enforcement: 'partial' },
    'a2a-firewall': { loss: 2, enforcement: 'advisory' },
    'workflow-inversion': { loss: 1, enforcement: 'partial' },
    'exec-approvals': { loss: 2, enforcement: 'advisory' },
  },
  crewai: {
    'tool-deny': { loss: 2, enforcement: 'advisory' },
    'trust-tier': { loss: 3, enforcement: 'none' },
    'audit-log': { loss: 2, enforcement: 'advisory' },
    'elicitation-gate': { loss: 2, enforcement: 'advisory' },
    'a2a-firewall': { loss: 3, enforcement: 'none' },
    'workflow-inversion': { loss: 3, enforcement: 'none' },
    'exec-approvals': { loss: 2, enforcement: 'advisory' },
  },
};

/**
 * Build the complete Spec 108 loss matrix for all 7 platforms.
 *
 * @returns The complete loss matrix with all cells populated.
 */
export function buildLossMatrix(): LossMatrix {
  const cells: LossMatrixCell[] = [];

  for (const platform of ALL_PLATFORMS) {
    const platformData = PLATFORM_LOSS[platform];
    for (const feature of ALL_FEATURES) {
      const data = platformData[feature];
      cells.push({
        feature,
        platform,
        lossScore: data.loss,
        enforcement: data.enforcement,
      });
    }
  }

  return {
    cells,
    platforms: ALL_PLATFORMS,
    features: ALL_FEATURES,
  };
}

/**
 * Get the total loss score for a specific platform across all features.
 *
 * @param matrix - The loss matrix
 * @param platform - The platform to score
 * @returns Total loss score (0 = perfect fidelity)
 */
export function platformLossScore(matrix: LossMatrix, platform: Platform): number {
  return matrix.cells
    .filter((c) => c.platform === platform)
    .reduce((sum, c) => sum + c.lossScore, 0);
}

/**
 * Get the loss score for a specific feature on a specific platform.
 *
 * @param matrix - The loss matrix
 * @param platform - The target platform
 * @param feature - The governance feature
 * @returns The loss matrix cell, or undefined if not found
 */
export function featureLoss(
  matrix: LossMatrix,
  platform: Platform,
  feature: GovernanceFeature,
): LossMatrixCell | undefined {
  return matrix.cells.find((c) => c.platform === platform && c.feature === feature);
}

/**
 * Check whether a platform can enforce a feature at L2+ (non-advisory).
 * Returns true if enforcement is 'full' or 'partial'.
 */
export function canEnforceAtL2(
  matrix: LossMatrix,
  platform: Platform,
  feature: GovernanceFeature,
): boolean {
  const cell = featureLoss(matrix, platform, feature);
  if (!cell) return false;
  return cell.enforcement === 'full' || cell.enforcement === 'partial';
}
