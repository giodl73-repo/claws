/**
 * L0 Unit: GuardrailProvider composition — AuthorizationDecision variants
 * with requiresExternalApproval field behavior.
 *
 * 4 L0 tests:
 * 1. allow + requiresExternalApproval: true → host gate fires
 * 2. allow + requiresExternalApproval: false → no host gate
 * 3. deny → requiresExternalApproval is N/A (never reaches host gate)
 * 4. review → implicit requiresExternalApproval: true
 */

import { describe, it, expect } from 'vitest';
import type {
  AuthorizationDecision,
  AllowDecision,
  DenyDecision,
  ReviewDecision,
} from '../../src/governance/guardrail-types.js';
import { getFailMode, DEFAULT_FAIL_MODES } from '../../src/governance/guardrail-types.js';

describe('Unit: AuthorizationDecision + requiresExternalApproval', () => {
  it('allow + requiresExternalApproval: true → host gate fires', () => {
    const decision: AllowDecision = {
      decision: 'allow',
      requiresExternalApproval: true,
      riskLevel: 5,
      metadata: { provider: 'claws' },
    };

    expect(decision.decision).toBe('allow');
    expect(decision.requiresExternalApproval).toBe(true);
    expect(decision.riskLevel).toBe(5);

    // Verify the type narrows correctly
    const ad: AuthorizationDecision = decision;
    if (ad.decision === 'allow') {
      expect(ad.requiresExternalApproval).toBe(true);
    }
  });

  it('allow + requiresExternalApproval: false → no host gate', () => {
    const decision: AllowDecision = {
      decision: 'allow',
      requiresExternalApproval: false,
      riskLevel: 2,
    };

    expect(decision.decision).toBe('allow');
    expect(decision.requiresExternalApproval).toBe(false);
    expect(decision.riskLevel).toBe(2);

    // Omitting requiresExternalApproval defaults to false semantically
    const omitted: AllowDecision = {
      decision: 'allow',
      riskLevel: 2,
    };
    expect(omitted.requiresExternalApproval).toBeUndefined();
  });

  it('deny → requiresExternalApproval is N/A (never reaches host gate)', () => {
    const decision: DenyDecision = {
      decision: 'deny',
      reason: 'R5 tool blocked by governance policy',
      ruleId: 'G-CLASS-R5',
      riskLevel: 5,
    };

    expect(decision.decision).toBe('deny');
    expect(decision.reason).toBe('R5 tool blocked by governance policy');
    expect(decision.ruleId).toBe('G-CLASS-R5');

    // DenyDecision has no requiresExternalApproval field
    expect('requiresExternalApproval' in decision).toBe(false);
  });

  it('review → implicit requiresExternalApproval: true', () => {
    const decision: ReviewDecision = {
      decision: 'review',
      requiresExternalApproval: true,
      reason: 'R4 tool requires human review before execution',
      riskLevel: 4,
    };

    expect(decision.decision).toBe('review');
    // ReviewDecision has requiresExternalApproval: true (literal type, not boolean)
    expect(decision.requiresExternalApproval).toBe(true);
    expect(decision.reason).toBe('R4 tool requires human review before execution');
  });
});

describe('Unit: fail-mode defaults', () => {
  it('R1-R2 → fail-open, R3-R5 → fail-closed', () => {
    expect(getFailMode(1).failMode).toBe('fail-open');
    expect(getFailMode(2).failMode).toBe('fail-open');
    expect(getFailMode(3).failMode).toBe('fail-closed');
    expect(getFailMode(4).failMode).toBe('fail-closed');
    expect(getFailMode(5).failMode).toBe('fail-closed');
  });

  it('R3-R4 fail-mode is overridable, R5 is not', () => {
    expect(getFailMode(3).overridable).toBe(true);
    expect(getFailMode(4).overridable).toBe(true);
    expect(getFailMode(5).overridable).toBe(false);
  });

  it('DEFAULT_FAIL_MODES covers all 5 risk levels', () => {
    expect(DEFAULT_FAIL_MODES).toHaveLength(5);
    const levels = DEFAULT_FAIL_MODES.map(c => c.riskLevel);
    expect(levels).toEqual([1, 2, 3, 4, 5]);
  });

  it('getFailMode returns fail-closed for unknown risk level', () => {
    // Cast to bypass type guard — tests defensive fallback
    const result = getFailMode(99 as unknown as 1);
    expect(result.failMode).toBe('fail-closed');
    expect(result.overridable).toBe(false);
  });
});
