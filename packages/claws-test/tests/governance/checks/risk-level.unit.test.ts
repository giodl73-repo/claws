/**
 * L0: risk-level check — exercises all branches.
 */

import { describe, it, expect } from 'vitest';
import { checkRiskLevel } from '../../../src/governance/checks/risk-level.js';
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

describe('Check 1: risk-level', () => {
  it('passes when all tools are at or below declared risk level', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: 'R3',
      tools: [
        { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
        { name: 'web-fetch', riskLevel: 'R3', oboFlag: false, classification: 'network' },
      ],
    }));
    expect(result.pass).toBe(true);
    expect(result.name).toBe('risk-level');
    expect(result.findings).toHaveLength(0);
  });

  it('produces high severity finding when tool exceeds declared level (R4 > R3)', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: 'R3',
      tools: [{ name: 'code-exec', riskLevel: 'R4', oboFlag: false, classification: 'execution' }],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('high');
    expect(result.findings[0]!.target).toBe('code-exec');
    expect(result.findings[0]!.message).toContain('R4');
    expect(result.findings[0]!.message).toContain('R3');
  });

  it('produces critical severity finding when tool is R5', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: 'R3',
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.target).toBe('shell-exec');
  });

  it('skips comparison when declaredRiskLevel is undefined (declaredLevel = 0)', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: undefined,
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('skips comparison when declaredRiskLevel is unrecognized string', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: 'UNKNOWN',
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('handles tool with unrecognized riskLevel gracefully (toolLevel = 0)', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: 'R3',
      tools: [{ name: 'custom-tool', riskLevel: 'CUSTOM', oboFlag: false, classification: 'other' }],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('reports multiple findings for multiple exceeding tools', () => {
    const result = checkRiskLevel(makeInput({
      declaredRiskLevel: 'R2',
      tools: [
        { name: 'tool-a', riskLevel: 'R4', oboFlag: false, classification: 'execution' },
        { name: 'tool-b', riskLevel: 'R5', oboFlag: false, classification: 'execution' },
      ],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]!.severity).toBe('high');
    expect(result.findings[1]!.severity).toBe('critical');
  });
});
