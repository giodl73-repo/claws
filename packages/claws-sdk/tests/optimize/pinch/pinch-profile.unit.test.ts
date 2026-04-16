/**
 * L0: Pinch profiles -- governance density profiles (G0-G3).
 *
 * 4 unit tests:
 * 1. G0 budget <= 400
 * 2. G2 budget <= 1100
 * 3. G3 is a strict superset of G2 content
 * 4. Profile registry lookup by name and level
 */

import { describe, it, expect } from 'vitest';
import {
  getProfileByName,
  getProfileByLevel,
  getAllProfiles,
  isStrictSuperset,
  type GovernanceLevel,
  type PinchProfile,
} from '../../../src/optimize/pinch/pinch-profile.js';

describe('PinchProfiles', () => {
  it('G0 budget <= 400', () => {
    const g0 = getProfileByLevel(0);
    expect(g0).toBeDefined();
    expect(g0!.tokenBudget).toBeLessThanOrEqual(400);
    expect(g0!.name).toBe('minimal');
    expect(g0!.level).toBe(0);
  });

  it('G2 budget <= 1100', () => {
    const g2 = getProfileByLevel(2);
    expect(g2).toBeDefined();
    expect(g2!.tokenBudget).toBeLessThanOrEqual(1100);
    expect(g2!.name).toBe('strict');
    expect(g2!.level).toBe(2);
  });

  it('G3 is a strict superset of G2 content', () => {
    const g2 = getProfileByLevel(2)!;
    const g3 = getProfileByLevel(3)!;

    expect(isStrictSuperset(g3, g2)).toBe(true);

    // G3 must have higher or equal token budget
    expect(g3.tokenBudget).toBeGreaterThanOrEqual(g2.tokenBudget);

    // G3 must include everything G2 includes (plus more)
    expect(g3.inclusion.includeObo).toBe(true);
    expect(g3.inclusion.includeRemediation).toBe(true);
    expect(g3.inclusion.includeTensions).toBe(true);

    // G3-exclusive features
    expect(g3.inclusion.includeAuditRefs).toBe(true);
    expect(g3.inclusion.includePolicyLinks).toBe(true);
    expect(g3.inclusion.includeHistoricalNotes).toBe(true);
    expect(g3.inclusion.includeRiskDecomposition).toBe(true);

    // Fidelity targets in G3 >= G2
    expect(g3.fidelity.riskLevel).toBeGreaterThanOrEqual(g2.fidelity.riskLevel);
    expect(g3.fidelity.ruleText).toBeGreaterThanOrEqual(g2.fidelity.ruleText);
    expect(g3.fidelity.remediation).toBeGreaterThanOrEqual(g2.fidelity.remediation);
    expect(g3.fidelity.oboChain).toBeGreaterThanOrEqual(g2.fidelity.oboChain);

    // Reverse direction fails: lower is not superset of higher
    expect(isStrictSuperset(g2, g3)).toBe(false);

    // isStrictSuperset fails when token budget is lower
    const lowBudget: PinchProfile = { ...g3, tokenBudget: 100 };
    expect(isStrictSuperset(lowBudget, g2)).toBe(false);

    // isStrictSuperset fails when minWeight is higher (more restrictive)
    const highWeight: PinchProfile = {
      ...g3,
      inclusion: { ...g3.inclusion, minWeight: 0.99 },
    };
    expect(isStrictSuperset(highWeight, g2)).toBe(false);

    // isStrictSuperset fails when a boolean flag is missing
    const missingFlag: PinchProfile = {
      ...g3,
      inclusion: { ...g3.inclusion, includeTensions: false },
    };
    expect(isStrictSuperset(missingFlag, g2)).toBe(false);

    // isStrictSuperset fails when fidelity target is lower
    const lowFidelity: PinchProfile = {
      ...g3,
      fidelity: { ...g3.fidelity, ruleText: 0.1 },
    };
    expect(isStrictSuperset(lowFidelity, g2)).toBe(false);
  });

  it('profile registry lookup by name and level', () => {
    const nameMap: Array<[string, number]> = [
      ['minimal', 0],
      ['standard', 1],
      ['strict', 2],
      ['paranoid', 3],
    ];

    for (const [name, level] of nameMap) {
      const byName = getProfileByName(name as 'minimal' | 'standard' | 'strict' | 'paranoid');
      const byLevel = getProfileByLevel(level as GovernanceLevel);

      expect(byName).toBeDefined();
      expect(byLevel).toBeDefined();
      expect(byName).toEqual(byLevel);
      expect(byName!.name).toBe(name);
      expect(byName!.level).toBe(level);
    }

    // getAllProfiles returns all 4 in ascending order
    const all = getAllProfiles();
    expect(all).toHaveLength(4);
    expect(all[0]!.level).toBe(0);
    expect(all[1]!.level).toBe(1);
    expect(all[2]!.level).toBe(2);
    expect(all[3]!.level).toBe(3);

    // Strict superset chain holds across all adjacent pairs
    for (let i = 1; i < all.length; i++) {
      expect(isStrictSuperset(all[i]!, all[i - 1]!)).toBe(true);
    }
  });
});
