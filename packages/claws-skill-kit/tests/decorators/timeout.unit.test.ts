/**
 * L0: @timeout decorator — annotates handler with execution timeout.
 *
 * Tests:
 * 1. @timeout(300) annotates handler with execution timeout in seconds
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { timeout } from '../../src/decorators/timeout.js';
import { getGovernanceMetadata } from '../../src/types.js';

describe('@timeout decorator', () => {
  it('@timeout(300) annotates handler with execution timeout in seconds', () => {
    const handler = skill('slow-tool', () => 'eventually');
    const annotated = timeout(300, handler);

    expect(annotated).toBe(handler);

    const meta = getGovernanceMetadata(annotated);
    expect(meta).toBeDefined();
    expect(meta!.timeoutSeconds).toBe(300);
  });

  it('timeout is not set by default', () => {
    const handler = skill('fast-tool', () => {});
    const meta = getGovernanceMetadata(handler);
    expect(meta!.timeoutSeconds).toBeUndefined();
  });

  it('accepts various positive timeout values', () => {
    const values = [1, 30, 60, 300, 3600];
    for (const secs of values) {
      const handler = skill(`timeout-${secs}`, () => {});
      timeout(secs, handler);
      expect(getGovernanceMetadata(handler)!.timeoutSeconds).toBe(secs);
    }
  });

  it('rejects zero, negative, and non-finite values', () => {
    const handler1 = skill('bad-timeout-zero', () => {});
    expect(() => timeout(0, handler1)).toThrow('invalid timeout');

    const handler2 = skill('bad-timeout-neg', () => {});
    expect(() => timeout(-60, handler2)).toThrow('invalid timeout');

    const handler3 = skill('bad-timeout-inf', () => {});
    expect(() => timeout(Infinity, handler3)).toThrow('invalid timeout');

    const handler4 = skill('bad-timeout-nan', () => {});
    expect(() => timeout(NaN, handler4)).toThrow('invalid timeout');
  });
});
