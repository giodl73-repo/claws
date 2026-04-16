/**
 * L1: Cost pipeline integration — full cost estimation + ordering pipeline.
 *
 * 1 integration test:
 * 1. Full pipeline: estimate costs, optimize ordering, verify output within budget
 */

import { describe, it, expect } from 'vitest';
import { estimateGovernanceCost, type GovernanceRuleDescriptor } from '../../../src/optimize/pinch/governance-cost-estimator.js';
import { optimizeRuleOrdering } from '../../../src/optimize/pinch/rule-ordering-optimizer.js';
import { getProfileByLevel, getAllProfiles } from '../../../src/optimize/pinch/pinch-profile.js';

describe('Cost pipeline integration', () => {
  it('full pipeline: estimate + order produces valid output within profile budget', () => {
    // Realistic governance rule set matching claws rule categories
    const rules: GovernanceRuleDescriptor[] = [
      // G-CLASS rules — risk classification
      { id: 'G-CLASS-01', weight: 0.9, riskLevel: 4, oboDelegationDepth: 0, baseTokens: 45 },
      { id: 'G-CLASS-02', weight: 0.4, riskLevel: 2, oboDelegationDepth: 0, baseTokens: 30 },
      { id: 'G-CLASS-03', weight: 0.8, riskLevel: 5, oboDelegationDepth: 1, baseTokens: 50 },
      // G-PERM rule — permissions
      { id: 'G-PERM-01', weight: 0.7, riskLevel: 3, oboDelegationDepth: 0, baseTokens: 35 },
      // G-DATA rules — sensitivity
      { id: 'G-DATA-LABEL', weight: 0.6, riskLevel: 2, oboDelegationDepth: 0, baseTokens: 40 },
      { id: 'G-DATA-NOLABEL', weight: 0.3, riskLevel: 1, oboDelegationDepth: 0, baseTokens: 25 },
      // G-ELICIT rules — elicitation gates
      { id: 'G-ELICIT-GATE', weight: 1.0, riskLevel: 5, oboDelegationDepth: 2, baseTokens: 55 },
      { id: 'G-ELICIT-TIMEOUT', weight: 0.9, riskLevel: 5, oboDelegationDepth: 0, baseTokens: 40 },
      { id: 'G-ELICIT-CHAIN', weight: 0.8, riskLevel: 5, oboDelegationDepth: 3, baseTokens: 50 },
    ];

    // Step 1: Estimate raw costs
    const costSummary = estimateGovernanceCost(rules);
    expect(costSummary.ruleCount).toBe(9);
    expect(costSummary.totalTokens).toBeGreaterThan(0);
    expect(costSummary.rules).toHaveLength(9);

    // Every rule has a valid cost breakdown
    for (const estimate of costSummary.rules) {
      expect(estimate.baseTokens).toBeGreaterThan(0);
      expect(estimate.totalTokens).toBeGreaterThanOrEqual(estimate.baseTokens);
      expect(estimate.weightCost).toBeGreaterThanOrEqual(0);
      expect(estimate.riskCost).toBeGreaterThanOrEqual(0);
      expect(estimate.oboCost).toBeGreaterThanOrEqual(0);
      expect(estimate.totalTokens).toBe(
        estimate.baseTokens + estimate.weightCost + estimate.riskCost + estimate.oboCost,
      );
    }

    // Step 2: Optimize ordering with G3 profile (1600 budget)
    const g3 = getProfileByLevel(3)!;
    const orderingResult = optimizeRuleOrdering(rules, g3);

    // All rules preserved
    expect(orderingResult.orderedRuleIds).toHaveLength(9);
    const inputIds = new Set(rules.map((r) => r.id));
    const outputIds = new Set(orderingResult.orderedRuleIds);
    expect(outputIds).toEqual(inputIds);

    // Ordering achieves compression savings
    expect(orderingResult.compressionSavings).toBeGreaterThan(0);
    expect(orderingResult.estimatedTokens).toBeLessThan(costSummary.totalTokens);

    // Output fits within G3 budget
    expect(orderingResult.withinBudget).toBe(true);
    expect(orderingResult.estimatedTokens).toBeLessThanOrEqual(g3.tokenBudget);

    // Step 3: Verify ordering groups rules by risk level
    const orderedRisks = orderingResult.orderedRules.map((r) => r.riskLevel);
    for (let i = 1; i < orderedRisks.length; i++) {
      expect(orderedRisks[i]!).toBeGreaterThanOrEqual(orderedRisks[i - 1]!);
    }

    // Step 4: Verify determinism — run the full pipeline again
    const costSummary2 = estimateGovernanceCost(rules);
    const orderingResult2 = optimizeRuleOrdering(rules, g3);
    expect(costSummary2.totalTokens).toBe(costSummary.totalTokens);
    expect(orderingResult2.orderedRuleIds).toEqual(orderingResult.orderedRuleIds);
    expect(orderingResult2.estimatedTokens).toBe(orderingResult.estimatedTokens);

    // Step 5: Verify profile hierarchy — lower profiles are tighter budgets
    const profiles = getAllProfiles();
    for (const profile of profiles) {
      const result = optimizeRuleOrdering(rules, profile);
      expect(result.orderedRuleIds).toHaveLength(9);
      expect(result.tokenBudget).toBe(profile.tokenBudget);
      // All rules preserved regardless of budget
      expect(new Set(result.orderedRuleIds)).toEqual(inputIds);
    }
  });
});
