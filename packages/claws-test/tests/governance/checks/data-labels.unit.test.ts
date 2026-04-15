/**
 * L0: data-labels check — exercises all branches.
 */

import { describe, it, expect } from 'vitest';
import { checkDataLabels } from '../../../src/governance/checks/data-labels.js';
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

describe('Check 3: data-labels', () => {
  it('passes when tools have no data labels', () => {
    const result = checkDataLabels(makeInput());
    expect(result.pass).toBe(true);
    expect(result.name).toBe('data-labels');
    expect(result.findings).toHaveLength(0);
  });

  it('passes when tool labels are all declared', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'pii-reader', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII'] }],
      declaredDataLabels: ['PII'],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('fails when tool uses undeclared data label', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'pii-reader', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII'] }],
      declaredDataLabels: [],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('high');
    expect(result.findings[0]!.message).toContain('PII');
    expect(result.findings[0]!.target).toBe('pii-reader');
    expect(result.findings[0]!.remediation).toContain('PII');
  });

  it('reports multiple findings for multiple undeclared labels', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'multi-data', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII', 'PHI'] }],
      declaredDataLabels: [],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]!.message).toContain('PII');
    expect(result.findings[1]!.message).toContain('PHI');
  });

  it('handles tool with empty dataLabels array (no findings)', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'empty-labels', riskLevel: 'R2', oboFlag: false, classification: 'filesystem', dataLabels: [] }],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('handles tool with undefined dataLabels (no findings)', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'no-labels', riskLevel: 'R2', oboFlag: false, classification: 'filesystem', dataLabels: undefined }],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('uses fallback when declaredDataLabels is undefined', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'pii-reader', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII'] }],
      declaredDataLabels: undefined,
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.message).toContain('PII');
  });

  it('only reports undeclared labels — declared ones are skipped', () => {
    const result = checkDataLabels(makeInput({
      tools: [{ name: 'mixed', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII', 'PHI'] }],
      declaredDataLabels: ['PII'],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.message).toContain('PHI');
  });
});
