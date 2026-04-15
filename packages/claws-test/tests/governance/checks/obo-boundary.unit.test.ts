/**
 * L0: obo-boundary check — exercises all branches.
 */

import { describe, it, expect } from 'vitest';
import { checkOboBoundary } from '../../../src/governance/checks/obo-boundary.js';
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

describe('Check 2: obo-boundary', () => {
  it('passes when no tools are OBO-flagged', () => {
    const result = checkOboBoundary(makeInput());
    expect(result.pass).toBe(true);
    expect(result.name).toBe('obo-boundary');
    expect(result.findings).toHaveLength(0);
  });

  it('passes when OBO-flagged tool classification matches declared boundary', () => {
    const result = checkOboBoundary(makeInput({
      tools: [{ name: 'mail-send', riskLevel: 'R4', oboFlag: true, classification: 'email' }],
      declaredOboBoundaries: ['email'],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('fails when OBO-flagged tool classification is not in declared boundaries', () => {
    const result = checkOboBoundary(makeInput({
      tools: [{ name: 'calendar-edit', riskLevel: 'R4', oboFlag: true, classification: 'calendar' }],
      declaredOboBoundaries: ['email'],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('high');
    expect(result.findings[0]!.message).toContain('calendar');
    expect(result.findings[0]!.message).toContain('email');
    expect(result.findings[0]!.target).toBe('calendar-edit');
    expect(result.findings[0]!.remediation).toContain('calendar');
  });

  it('skips OBO-flagged tool when declaredBoundaries is empty', () => {
    const result = checkOboBoundary(makeInput({
      tools: [{ name: 'mail-send', riskLevel: 'R4', oboFlag: true, classification: 'email' }],
      declaredOboBoundaries: [],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('skips non-OBO tool even when boundaries are declared', () => {
    const result = checkOboBoundary(makeInput({
      tools: [{ name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' }],
      declaredOboBoundaries: ['email'],
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('uses fallback when declaredOboBoundaries is undefined', () => {
    const result = checkOboBoundary(makeInput({
      tools: [{ name: 'mail-send', riskLevel: 'R4', oboFlag: true, classification: 'email' }],
      declaredOboBoundaries: undefined,
    }));
    // declaredBoundaries falls back to [], so size === 0 → skip
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('reports multiple findings for multiple OBO violations', () => {
    const result = checkOboBoundary(makeInput({
      tools: [
        { name: 'calendar-edit', riskLevel: 'R4', oboFlag: true, classification: 'calendar' },
        { name: 'teams-post', riskLevel: 'R4', oboFlag: true, classification: 'teams' },
      ],
      declaredOboBoundaries: ['email'],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(2);
    const targets = result.findings.map(f => f.target);
    expect(targets).toContain('calendar-edit');
    expect(targets).toContain('teams-post');
  });

  it('reports only violating tools — matching ones produce no findings', () => {
    const result = checkOboBoundary(makeInput({
      tools: [
        { name: 'mail-send', riskLevel: 'R4', oboFlag: true, classification: 'email' },
        { name: 'calendar-edit', riskLevel: 'R4', oboFlag: true, classification: 'calendar' },
      ],
      declaredOboBoundaries: ['email'],
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.target).toBe('calendar-edit');
  });
});
