/**
 * L0: @classify decorator — annotates handler with risk level.
 *
 * Tests:
 * 1. @classify('R3') annotates handler with risk level, rejects invalid levels (R0, R6)
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';
import { getGovernanceMetadata, type RiskLevelCode } from '../../src/types.js';

describe('@classify decorator', () => {
  it("@classify('R3') annotates handler with risk level readable via getGovernanceMetadata()", () => {
    const handler = skill('risky-tool', () => 'result');
    const annotated = classify('R3', handler);

    expect(annotated).toBe(handler);

    const meta = getGovernanceMetadata(annotated);
    expect(meta).toBeDefined();
    expect(meta!.riskLevel).toBe('R3');
    expect(meta!.riskLevelNumeric).toBe(3);
  });

  it('accepts all valid risk levels R1–R5', () => {
    const levels: RiskLevelCode[] = ['R1', 'R2', 'R3', 'R4', 'R5'];

    for (const level of levels) {
      const handler = skill(`test-${level.toLowerCase()}`, () => {});
      classify(level, handler);
      const meta = getGovernanceMetadata(handler)!;
      expect(meta.riskLevel).toBe(level);
      expect(meta.riskLevelNumeric).toBe(Number(level.slice(1)));
    }
  });

  it('rejects invalid risk levels (R0, R6)', () => {
    const handler1 = skill('bad-r0', () => {});
    expect(() => classify('R0' as RiskLevelCode, handler1)).toThrow('invalid risk level');

    const handler2 = skill('bad-r6', () => {});
    expect(() => classify('R6' as RiskLevelCode, handler2)).toThrow('invalid risk level');
  });

  it('rejects non-standard risk level strings', () => {
    const handler = skill('bad-level', () => {});
    expect(() => classify('high' as RiskLevelCode, handler)).toThrow('invalid risk level');
    expect(() => classify('' as RiskLevelCode, handler)).toThrow('invalid risk level');
  });
});
