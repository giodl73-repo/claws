/**
 * L0: bounded-reasoning check — exercises all branches.
 */

import { describe, it, expect } from 'vitest';
import { checkBoundedReasoning } from '../../../src/governance/checks/bounded-reasoning.js';
import type { GovernanceCheckInput } from '../../../src/types.js';

function makeInput(overrides: Partial<GovernanceCheckInput> = {}): GovernanceCheckInput {
  return {
    tools: [{ name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' }],
    agents: [{ name: 'assistant', delegatesTo: [], hasTrustBoundary: true }],
    declaredRiskLevel: 'R3',
    declaredOboBoundaries: [],
    declaredDataLabels: [],
    failMode: 'closed',
    hasInputValidation: true,
    hasOutputGuards: true,
    hasElicitationGate: false,
    hasAuditTrail: true,
    hasSupplyChainSignature: true,
    reasoningLimits: { tokenBudget: 10000, maxRecursionDepth: 3 },
    ...overrides,
  };
}

describe('Check 10: bounded-reasoning', () => {
  it('passes when both tokenBudget and maxRecursionDepth are set', () => {
    const result = checkBoundedReasoning(
      makeInput({ reasoningLimits: { tokenBudget: 5000, maxRecursionDepth: 5 } }),
    );
    expect(result.pass).toBe(true);
    expect(result.name).toBe('bounded-reasoning');
    expect(result.findings).toHaveLength(0);
  });

  it('fails with DoS finding when reasoningLimits is undefined', () => {
    const result = checkBoundedReasoning(makeInput({ reasoningLimits: undefined }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('medium');
    expect(result.findings[0]!.message).toContain('DoS');
    expect(result.findings[0]!.target).toBe('reasoning-limits');
  });

  it('fails when tokenBudget is missing but maxRecursionDepth is set', () => {
    const result = checkBoundedReasoning(
      makeInput({ reasoningLimits: { maxRecursionDepth: 3 } }),
    );
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.target).toBe('token-budget');
    expect(result.findings[0]!.message).toContain('token budget');
  });

  it('fails when maxRecursionDepth is missing but tokenBudget is set', () => {
    const result = checkBoundedReasoning(
      makeInput({ reasoningLimits: { tokenBudget: 10000 } }),
    );
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.target).toBe('recursion-depth');
    expect(result.findings[0]!.message).toContain('recursion');
  });

  it('reports two findings when both tokenBudget and maxRecursionDepth are missing', () => {
    const result = checkBoundedReasoning(makeInput({ reasoningLimits: {} }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(2);
    const targets = result.findings.map(f => f.target);
    expect(targets).toContain('token-budget');
    expect(targets).toContain('recursion-depth');
  });
});
