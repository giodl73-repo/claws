/**
 * L0: Branch coverage gaps in emit/loss-matrix.ts.
 *
 * Targets:
 * - Line 224: canEnforceAtL2 returns false when cell is undefined
 *   (featureLoss returns undefined for unknown platform/feature combo)
 * - Statement coverage for featureLoss and canEnforceAtL2 edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  buildLossMatrix,
  platformLossScore,
  featureLoss,
  canEnforceAtL2,
  type LossMatrix,
  type GovernanceFeature,
} from '../../src/emit/loss-matrix.js';
import type { Platform } from '../../src/types/platform.js';

describe('emit/loss-matrix branch coverage', () => {
  it('featureLoss returns undefined for unknown platform', () => {
    const matrix = buildLossMatrix();
    // Cast to Platform to bypass type checking — simulates runtime mismatch
    const cell = featureLoss(matrix, 'unknown-platform' as Platform, 'tool-deny');
    expect(cell).toBeUndefined();
  });

  it('featureLoss returns undefined for unknown feature', () => {
    const matrix = buildLossMatrix();
    const cell = featureLoss(matrix, 'openclaw', 'unknown-feature' as GovernanceFeature);
    expect(cell).toBeUndefined();
  });

  it('canEnforceAtL2 returns false for unknown platform (cell undefined branch)', () => {
    const matrix = buildLossMatrix();
    const result = canEnforceAtL2(matrix, 'nonexistent' as Platform, 'tool-deny');
    expect(result).toBe(false);
  });

  it('canEnforceAtL2 returns false for unknown feature (cell undefined branch)', () => {
    const matrix = buildLossMatrix();
    const result = canEnforceAtL2(matrix, 'openclaw', 'nonexistent' as GovernanceFeature);
    expect(result).toBe(false);
  });

  it('canEnforceAtL2 returns false for advisory enforcement', () => {
    const matrix = buildLossMatrix();
    // Cursor has advisory enforcement for tool-deny
    const result = canEnforceAtL2(matrix, 'cursor', 'tool-deny');
    expect(result).toBe(false);
  });

  it('canEnforceAtL2 returns false for none enforcement', () => {
    const matrix = buildLossMatrix();
    // Cursor has none enforcement for trust-tier
    const result = canEnforceAtL2(matrix, 'cursor', 'trust-tier');
    expect(result).toBe(false);
  });

  it('canEnforceAtL2 returns true for partial enforcement (bedrock tool-deny)', () => {
    const matrix = buildLossMatrix();
    const result = canEnforceAtL2(matrix, 'bedrock', 'tool-deny');
    expect(result).toBe(true);
  });

  it('platformLossScore returns nonzero for advisory platforms', () => {
    const matrix = buildLossMatrix();
    const cursorScore = platformLossScore(matrix, 'cursor');
    expect(cursorScore).toBeGreaterThan(0);
  });

  it('platformLossScore returns zero for unknown platform', () => {
    const matrix = buildLossMatrix();
    const score = platformLossScore(matrix, 'nonexistent' as Platform);
    expect(score).toBe(0);
  });

  it('buildLossMatrix includes all 7 platforms and 7 features', () => {
    const matrix = buildLossMatrix();
    expect(matrix.platforms).toHaveLength(7);
    expect(matrix.features).toHaveLength(7);
    expect(matrix.cells).toHaveLength(49); // 7 * 7
  });

  it('canEnforceAtL2 with empty matrix returns false', () => {
    const emptyMatrix: LossMatrix = {
      cells: [],
      platforms: [],
      features: [],
    };
    const result = canEnforceAtL2(emptyMatrix, 'openclaw', 'tool-deny');
    expect(result).toBe(false);
  });
});
