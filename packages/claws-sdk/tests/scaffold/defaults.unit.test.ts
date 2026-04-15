/**
 * L0 unit tests for scaffold defaults — trust tier to risk mapping.
 *
 * 4 tests:
 *  1. T1 maps to R1
 *  2. T2 maps to R3
 *  3. T3 maps to R4
 *  4. T4 maps to R5
 *  5. T2 blocks R4+ (risk cap enforcement)
 *  6. Invalid tier throws
 */

import { describe, it, expect } from 'vitest';

import {
  maxRiskForTier,
  isRiskPermitted,
  defaultRiskForTemplateTier,
} from '@bic/claws-sdk/scaffold';

describe('maxRiskForTier', () => {
  it('T1 maps to R1', () => {
    expect(maxRiskForTier(1)).toBe(1);
  });

  it('T2 maps to R3', () => {
    expect(maxRiskForTier(2)).toBe(3);
  });

  it('T3 maps to R4', () => {
    expect(maxRiskForTier(3)).toBe(4);
  });

  it('T4 maps to R5', () => {
    expect(maxRiskForTier(4)).toBe(5);
  });

  it('throws for invalid tier', () => {
    expect(() => maxRiskForTier(0)).toThrow('Invalid trust tier');
    expect(() => maxRiskForTier(5)).toThrow('Invalid trust tier');
    expect(() => maxRiskForTier(2.5)).toThrow('Invalid trust tier');
  });
});

describe('isRiskPermitted', () => {
  it('T2 permits R1-R3', () => {
    expect(isRiskPermitted(2, 1)).toBe(true);
    expect(isRiskPermitted(2, 2)).toBe(true);
    expect(isRiskPermitted(2, 3)).toBe(true);
  });

  it('T2 blocks R4 and R5', () => {
    expect(isRiskPermitted(2, 4)).toBe(false);
    expect(isRiskPermitted(2, 5)).toBe(false);
  });

  it('T1 blocks R2+', () => {
    expect(isRiskPermitted(1, 1)).toBe(true);
    expect(isRiskPermitted(1, 2)).toBe(false);
  });

  it('T4 permits all risk levels', () => {
    expect(isRiskPermitted(4, 1)).toBe(true);
    expect(isRiskPermitted(4, 5)).toBe(true);
  });
});

describe('defaultRiskForTemplateTier', () => {
  it('declared = R1', () => {
    expect(defaultRiskForTemplateTier('declared')).toBe(1);
  });

  it('typed = R2', () => {
    expect(defaultRiskForTemplateTier('typed')).toBe(2);
  });

  it('verified = R3', () => {
    expect(defaultRiskForTemplateTier('verified')).toBe(3);
  });
});
