/**
 * L0: Rule ordering optimizer — cost-based ordering for governance content.
 *
 * 2 unit tests:
 * 1. Cost-based ordering — groups by risk level, exploits adjacency discounts
 * 2. Ordering preserves all rules — no rules are dropped
 */

import { describe, it, expect } from 'vitest';
import { optimizeRuleOrdering } from '../../../src/optimize/pinch/rule-ordering-optimizer.js';
import { estimateGovernanceCost, type GovernanceRuleDescriptor } from '../../../src/optimize/pinch/governance-cost-estimator.js';
import { getProfileByLevel, type PinchProfile } from '../../../src/optimize/pinch/pinch-profile.js';

describe('RuleOrderingOptimizer', () => {
  const G3 = getProfileByLevel(3)!;

  it('cost-based ordering — groups by risk level, exploits adjacency discounts', () => {
    // Rules deliberately out of order (risk levels jumbled)
    const rules: GovernanceRuleDescriptor[] = [
      { id: 'G-R5-A', weight: 0.9, riskLevel: 5, oboDelegationDepth: 2, baseTokens: 60 },
      { id: 'G-R1-A', weight: 0.3, riskLevel: 1, oboDelegationDepth: 0, baseTokens: 40 },
      { id: 'G-R3-A', weight: 0.7, riskLevel: 3, oboDelegationDepth: 0, baseTokens: 50 },
      { id: 'G-R5-B', weight: 0.8, riskLevel: 5, oboDelegationDepth: 3, baseTokens: 70 },
      { id: 'G-R3-B', weight: 0.5, riskLevel: 3, oboDelegationDepth: 1, baseTokens: 45 },
      { id: 'G-R1-B', weight: 0.2, riskLevel: 1, oboDelegationDepth: 0, baseTokens: 30 },
    ];

    const result = optimizeRuleOrdering(rules, G3);

    // Ordering: risk ascending, then OBO depth descending, then weight descending
    // R1 group: G-R1-A (obo=0, w=0.3), G-R1-B (obo=0, w=0.2)
    // R3 group: G-R3-B (obo=1, w=0.5), G-R3-A (obo=0, w=0.7)
    // R5 group: G-R5-B (obo=3, w=0.8), G-R5-A (obo=2, w=0.9)
    expect(result.orderedRuleIds).toEqual([
      'G-R1-A', 'G-R1-B',
      'G-R3-B', 'G-R3-A',
      'G-R5-B', 'G-R5-A',
    ]);

    // Compression savings should be positive (same-risk adjacency + OBO adjacency)
    expect(result.compressionSavings).toBeGreaterThan(0);

    // Estimated tokens should be less than raw (unordered) total
    const rawCost = estimateGovernanceCost(rules);
    expect(result.estimatedTokens).toBeLessThan(rawCost.totalTokens);

    // All rules preserved
    expect(result.orderedRules).toHaveLength(6);

    // Empty input
    const emptyResult = optimizeRuleOrdering([], G3);
    expect(emptyResult.orderedRuleIds).toHaveLength(0);
    expect(emptyResult.estimatedTokens).toBe(0);
    expect(emptyResult.withinBudget).toBe(true);
    expect(emptyResult.compressionSavings).toBe(0);
  });

  it('ordering preserves all rules — no rules are dropped', () => {
    // 8 rules with varied properties
    const rules: GovernanceRuleDescriptor[] = [
      { id: 'G-A', weight: 1.0, riskLevel: 5, oboDelegationDepth: 4, baseTokens: 100 },
      { id: 'G-B', weight: 0.0, riskLevel: 1, oboDelegationDepth: 0, baseTokens: 10 },
      { id: 'G-C', weight: 0.5, riskLevel: 3, oboDelegationDepth: 1, baseTokens: 60 },
      { id: 'G-D', weight: 0.8, riskLevel: 4, oboDelegationDepth: 0, baseTokens: 80 },
      { id: 'G-E', weight: 0.3, riskLevel: 2, oboDelegationDepth: 0, baseTokens: 35 },
      { id: 'G-F', weight: 0.9, riskLevel: 5, oboDelegationDepth: 2, baseTokens: 90 },
      { id: 'G-G', weight: 0.1, riskLevel: 1, oboDelegationDepth: 0, baseTokens: 20 },
      { id: 'G-H', weight: 0.6, riskLevel: 3, oboDelegationDepth: 2, baseTokens: 55 },
    ];

    const result = optimizeRuleOrdering(rules, G3);

    // All 8 rules present
    expect(result.orderedRuleIds).toHaveLength(8);
    expect(result.orderedRules).toHaveLength(8);

    // Every input rule ID appears exactly once in output
    const inputIds = new Set(rules.map((r) => r.id));
    const outputIds = new Set(result.orderedRuleIds);
    expect(outputIds).toEqual(inputIds);

    // Verify each input rule descriptor is in output
    for (const rule of rules) {
      const found = result.orderedRules.find((r) => r.id === rule.id);
      expect(found).toBeDefined();
      expect(found).toEqual(rule);
    }

    // Budget tracking
    expect(result.tokenBudget).toBe(G3.tokenBudget);
    expect(typeof result.withinBudget).toBe('boolean');
    expect(result.estimatedTokens).toBeGreaterThan(0);

    // Ordering is deterministic
    const result2 = optimizeRuleOrdering(rules, G3);
    expect(result2.orderedRuleIds).toEqual(result.orderedRuleIds);
    expect(result2.estimatedTokens).toBe(result.estimatedTokens);
    expect(result2.compressionSavings).toBe(result.compressionSavings);

    // Even with a tiny budget, no rules are dropped
    const tinyProfile: PinchProfile = { ...G3, tokenBudget: 10 };
    const tinyResult = optimizeRuleOrdering(rules, tinyProfile);
    expect(tinyResult.orderedRuleIds).toHaveLength(8);
    expect(tinyResult.withinBudget).toBe(false);
    expect(tinyResult.tokenBudget).toBe(10);
  });
});
