/**
 * L0: @budget decorator — annotates handler with token budget limit.
 *
 * Tests:
 * 1. @budget(1000) annotates handler with token budget limit
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { budget } from '../../src/decorators/budget.js';
import { getGovernanceMetadata } from '../../src/types.js';

describe('@budget decorator', () => {
  it('@budget(1000) annotates handler with token budget limit', () => {
    const handler = skill('costly-tool', () => 'expensive');
    const annotated = budget(1000, handler);

    expect(annotated).toBe(handler);

    const meta = getGovernanceMetadata(annotated);
    expect(meta).toBeDefined();
    expect(meta!.tokenBudget).toBe(1000);
  });

  it('token budget is not set by default', () => {
    const handler = skill('free-tool', () => {});
    const meta = getGovernanceMetadata(handler);
    expect(meta!.tokenBudget).toBeUndefined();
  });

  it('accepts various positive token amounts', () => {
    const amounts = [1, 100, 5000, 1_000_000];
    for (const amount of amounts) {
      const handler = skill(`budget-${amount}`, () => {});
      budget(amount, handler);
      expect(getGovernanceMetadata(handler)!.tokenBudget).toBe(amount);
    }
  });

  it('rejects zero, negative, and non-finite values', () => {
    const handler1 = skill('bad-budget-zero', () => {});
    expect(() => budget(0, handler1)).toThrow('invalid token budget');

    const handler2 = skill('bad-budget-neg', () => {});
    expect(() => budget(-100, handler2)).toThrow('invalid token budget');

    const handler3 = skill('bad-budget-inf', () => {});
    expect(() => budget(Infinity, handler3)).toThrow('invalid token budget');

    const handler4 = skill('bad-budget-nan', () => {});
    expect(() => budget(NaN, handler4)).toThrow('invalid token budget');
  });
});
