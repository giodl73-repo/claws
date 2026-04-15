/**
 * L0: output-guards check — branch coverage for unrecognized risk levels.
 */

import { describe, it, expect } from 'vitest';
import { checkOutputGuards } from '../../../src/governance/checks/output-guards.js';
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
    hasOutputGuards: false,
    hasElicitationGate: false,
    hasAuditTrail: true,
    hasSupplyChainSignature: true,
    reasoningLimits: { tokenBudget: 10000, maxRecursionDepth: 3 },
    ...overrides,
  };
}

describe('Check 9: output-guards (branch coverage)', () => {
  it('passes when no high-risk tools are present (all below R4)', () => {
    const result = checkOutputGuards(makeInput({
      tools: [
        { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
        { name: 'web-fetch', riskLevel: 'R3', oboFlag: false, classification: 'network' },
      ],
      hasOutputGuards: false,
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('treats unrecognized riskLevel as 0 via ?? fallback (below R4 threshold)', () => {
    // RISK_ORDER['CUSTOM'] is undefined → ?? 0 → 0 < 4 → not high-risk
    const result = checkOutputGuards(makeInput({
      tools: [{ name: 'custom-tool', riskLevel: 'CUSTOM', oboFlag: false, classification: 'other' }],
      hasOutputGuards: false,
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('fails when mix of recognized R4+ and unrecognized risk levels without guards', () => {
    const result = checkOutputGuards(makeInput({
      tools: [
        { name: 'custom-tool', riskLevel: 'UNKNOWN', oboFlag: false, classification: 'other' },
        { name: 'admin-tool', riskLevel: 'R5', oboFlag: false, classification: 'execution' },
      ],
      hasOutputGuards: false,
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.target).toBe('output-guards');
  });
});
