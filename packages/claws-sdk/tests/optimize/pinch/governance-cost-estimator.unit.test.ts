/**
 * L0: Governance cost estimator — token cost estimation with governance heuristics.
 *
 * 3 unit tests:
 * 1. Cost estimation accuracy — base + weight + risk + OBO components
 * 2. Cost estimation accuracy — deterministic for same input
 * 3. Governance heuristic weighting — high-risk OBO rules cost more than low-risk rules
 */

import { describe, it, expect } from 'vitest';
import {
  estimateRuleCost,
  estimateGovernanceCost,
  type GovernanceRuleDescriptor,
  type RuleCostEstimate,
} from '../../../src/optimize/pinch/governance-cost-estimator.js';

describe('GovernanceCostEstimator', () => {
  it('cost estimation accuracy — base + weight + risk + OBO components', () => {
    // R3 rule with moderate weight and no OBO
    const simpleRule: GovernanceRuleDescriptor = {
      id: 'G-TEST-01',
      weight: 0.6,
      riskLevel: 3,
      oboDelegationDepth: 0,
      baseTokens: 100,
    };

    const estimate = estimateRuleCost(simpleRule);

    // Verify structure
    expect(estimate.ruleId).toBe('G-TEST-01');
    expect(estimate.baseTokens).toBe(100);

    // Weight cost = round(100 * 0.6^2 * 0.5) = round(100 * 0.36 * 0.5) = round(18) = 18
    expect(estimate.weightCost).toBe(18);

    // Risk cost for R3 = 15
    expect(estimate.riskCost).toBe(15);

    // OBO cost = 0 * 25 = 0
    expect(estimate.oboCost).toBe(0);

    // Total = 100 + 18 + 15 + 0 = 133
    expect(estimate.totalTokens).toBe(133);

    // R5 OBO rule with high weight and deep delegation
    const oboRule: GovernanceRuleDescriptor = {
      id: 'G-ELICIT-GATE',
      weight: 1.0,
      riskLevel: 5,
      oboDelegationDepth: 3,
      baseTokens: 80,
    };

    const oboEstimate = estimateRuleCost(oboRule);

    // Weight cost = round(80 * 1.0^2 * 0.5) = round(40) = 40
    expect(oboEstimate.weightCost).toBe(40);

    // Risk cost for R5 = 80
    expect(oboEstimate.riskCost).toBe(80);

    // OBO cost = 3 * 25 = 75
    expect(oboEstimate.oboCost).toBe(75);

    // Total = 80 + 40 + 80 + 75 = 275
    expect(oboEstimate.totalTokens).toBe(275);

    // Aggregate estimation
    const summary = estimateGovernanceCost([simpleRule, oboRule]);
    expect(summary.ruleCount).toBe(2);
    expect(summary.totalTokens).toBe(133 + 275);
    expect(summary.rules).toHaveLength(2);
    expect(summary.rules[0]!.ruleId).toBe('G-TEST-01');
    expect(summary.rules[1]!.ruleId).toBe('G-ELICIT-GATE');
  });

  it('cost estimation accuracy — deterministic for same input', () => {
    const rules: GovernanceRuleDescriptor[] = [
      { id: 'G-A', weight: 0.5, riskLevel: 2, oboDelegationDepth: 0, baseTokens: 50 },
      { id: 'G-B', weight: 0.9, riskLevel: 4, oboDelegationDepth: 2, baseTokens: 120 },
      { id: 'G-C', weight: 0.1, riskLevel: 1, oboDelegationDepth: 0, baseTokens: 30 },
    ];

    const run1 = estimateGovernanceCost(rules);
    const run2 = estimateGovernanceCost(rules);
    const run3 = estimateGovernanceCost(rules);

    // All runs produce identical results
    expect(run1.totalTokens).toBe(run2.totalTokens);
    expect(run2.totalTokens).toBe(run3.totalTokens);

    // Per-rule estimates are identical
    for (let i = 0; i < rules.length; i++) {
      expect(run1.rules[i]).toEqual(run2.rules[i]);
      expect(run2.rules[i]).toEqual(run3.rules[i]);
    }

    // Verify individual values (no randomness)
    // G-A: base=50, weight=round(50*0.25*0.5)=6, risk=5, obo=0 => 61
    expect(run1.rules[0]!.totalTokens).toBe(61);
    // G-B: base=120, weight=round(120*0.81*0.5)=49, risk=40, obo=50 => 259
    expect(run1.rules[1]!.totalTokens).toBe(259);
    // G-C: base=30, weight=round(30*0.01*0.5)=0, risk=0, obo=0 => 30
    expect(run1.rules[2]!.totalTokens).toBe(30);

    expect(run1.totalTokens).toBe(61 + 259 + 30);

    // Empty input is deterministic too
    const empty1 = estimateGovernanceCost([]);
    const empty2 = estimateGovernanceCost([]);
    expect(empty1).toEqual(empty2);
    expect(empty1.totalTokens).toBe(0);
    expect(empty1.ruleCount).toBe(0);

    // Edge-case risk levels are clamped and deterministic
    const belowMin: GovernanceRuleDescriptor = {
      id: 'G-BELOW', weight: 0.5, riskLevel: 0, oboDelegationDepth: 0, baseTokens: 50,
    };
    const aboveMax: GovernanceRuleDescriptor = {
      id: 'G-ABOVE', weight: 0.5, riskLevel: 9, oboDelegationDepth: 0, baseTokens: 50,
    };
    const belowEst = estimateRuleCost(belowMin);
    const aboveEst = estimateRuleCost(aboveMax);
    // Risk level 0 clamps to R1 (surcharge 0)
    expect(belowEst.riskCost).toBe(0);
    // Risk level 9 clamps to R5 (surcharge 80)
    expect(aboveEst.riskCost).toBe(80);
    // Both are deterministic
    expect(estimateRuleCost(belowMin)).toEqual(belowEst);
    expect(estimateRuleCost(aboveMax)).toEqual(aboveEst);
  });

  it('governance heuristic weighting — high-risk OBO rules cost more', () => {
    // Low-risk, low-weight, no OBO
    const lowRule: GovernanceRuleDescriptor = {
      id: 'G-LOW',
      weight: 0.2,
      riskLevel: 1,
      oboDelegationDepth: 0,
      baseTokens: 50,
    };

    // High-risk, high-weight, deep OBO
    const highRule: GovernanceRuleDescriptor = {
      id: 'G-HIGH',
      weight: 1.0,
      riskLevel: 5,
      oboDelegationDepth: 4,
      baseTokens: 50,
    };

    const lowEstimate = estimateRuleCost(lowRule);
    const highEstimate = estimateRuleCost(highRule);

    // High-risk OBO rule must cost significantly more
    expect(highEstimate.totalTokens).toBeGreaterThan(lowEstimate.totalTokens);

    // Risk cost difference: R5 (80) vs R1 (0)
    expect(highEstimate.riskCost).toBeGreaterThan(lowEstimate.riskCost);
    expect(highEstimate.riskCost).toBe(80);
    expect(lowEstimate.riskCost).toBe(0);

    // OBO cost difference: depth 4 vs 0
    expect(highEstimate.oboCost).toBeGreaterThan(lowEstimate.oboCost);
    expect(highEstimate.oboCost).toBe(100);
    expect(lowEstimate.oboCost).toBe(0);

    // Weight cost difference: weight 1.0 vs 0.2 (same base)
    expect(highEstimate.weightCost).toBeGreaterThan(lowEstimate.weightCost);

    // Same base tokens, but vastly different totals
    expect(lowEstimate.baseTokens).toBe(highEstimate.baseTokens);
    expect(highEstimate.totalTokens).toBeGreaterThan(lowEstimate.totalTokens * 3);

    // Verify the three heuristics each contribute independently
    const onlyWeight: GovernanceRuleDescriptor = {
      id: 'G-WEIGHT-ONLY',
      weight: 1.0,
      riskLevel: 1,
      oboDelegationDepth: 0,
      baseTokens: 50,
    };
    const onlyRisk: GovernanceRuleDescriptor = {
      id: 'G-RISK-ONLY',
      weight: 0.0,
      riskLevel: 5,
      oboDelegationDepth: 0,
      baseTokens: 50,
    };
    const onlyObo: GovernanceRuleDescriptor = {
      id: 'G-OBO-ONLY',
      weight: 0.0,
      riskLevel: 1,
      oboDelegationDepth: 3,
      baseTokens: 50,
    };

    const wEst = estimateRuleCost(onlyWeight);
    const rEst = estimateRuleCost(onlyRisk);
    const oEst = estimateRuleCost(onlyObo);

    // Weight-only adds weight cost, no risk or OBO
    expect(wEst.weightCost).toBeGreaterThan(0);
    expect(wEst.riskCost).toBe(0);
    expect(wEst.oboCost).toBe(0);

    // Risk-only adds risk cost, no weight or OBO
    expect(rEst.weightCost).toBe(0);
    expect(rEst.riskCost).toBeGreaterThan(0);
    expect(rEst.oboCost).toBe(0);

    // OBO-only adds OBO cost, no weight or risk
    expect(oEst.weightCost).toBe(0);
    expect(oEst.riskCost).toBe(0);
    expect(oEst.oboCost).toBeGreaterThan(0);
  });
});
