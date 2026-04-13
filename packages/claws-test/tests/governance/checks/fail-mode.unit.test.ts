/**
 * L0: fail-mode check — exercises all branches including R4 warn path.
 */

import { describe, it, expect } from 'vitest';
import { checkFailMode } from '../../../src/governance/checks/fail-mode.js';
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

describe('Check 4: fail-mode (branch coverage)', () => {
  it('passes when R5 tool has fail-mode closed', () => {
    const result = checkFailMode(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: 'closed',
    }));
    expect(result.pass).toBe(true);
    expect(result.name).toBe('fail-mode');
  });

  it('fails critical when R5 tool has fail-mode open', () => {
    const result = checkFailMode(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: 'open',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.message).toContain('fail-open is forbidden');
  });

  it('fails critical when R5 tool has undefined fail-mode', () => {
    const result = checkFailMode(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: undefined,
    }));
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.message).toContain('undefined fail-mode');
  });

  it('fails critical when declaredRiskLevel is R5 (no R5 tool) with open fail-mode', () => {
    const result = checkFailMode(makeInput({
      declaredRiskLevel: 'R5',
      tools: [{ name: 'low-risk', riskLevel: 'R2', oboFlag: false, classification: 'data' }],
      failMode: 'open',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
  });

  it('warns high when R4 tool has fail-mode open', () => {
    const result = checkFailMode(makeInput({
      tools: [{ name: 'admin-tool', riskLevel: 'R4', oboFlag: false, classification: 'execution' }],
      failMode: 'open',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('high');
    expect(result.findings[0]!.message).toContain('R4');
  });

  it('passes when R4 tool has fail-mode closed', () => {
    const result = checkFailMode(makeInput({
      tools: [{ name: 'admin-tool', riskLevel: 'R4', oboFlag: false, classification: 'execution' }],
      failMode: 'closed',
    }));
    expect(result.pass).toBe(true);
  });

  it('passes when low-risk tools with any fail-mode', () => {
    const result = checkFailMode(makeInput({
      tools: [{ name: 'log-reader', riskLevel: 'R1', oboFlag: false, classification: 'logging' }],
      failMode: 'open',
    }));
    expect(result.pass).toBe(true);
  });

  it('reports both R5 critical and R4 high when mixed', () => {
    const result = checkFailMode(makeInput({
      tools: [
        { name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' },
        { name: 'admin-tool', riskLevel: 'R4', oboFlag: false, classification: 'admin' },
      ],
      failMode: 'open',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(2);
    const severities = result.findings.map(f => f.severity);
    expect(severities).toContain('critical');
    expect(severities).toContain('high');
  });
});
