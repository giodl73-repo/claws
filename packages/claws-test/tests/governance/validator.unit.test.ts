/**
 * L0: GovernanceValidator — all 13 checks individually + validateSubset.
 */

import { describe, it, expect } from 'vitest';
import { checkRiskLevel } from '../../src/governance/checks/risk-level.js';
import { checkOboBoundary } from '../../src/governance/checks/obo-boundary.js';
import { checkDataLabels } from '../../src/governance/checks/data-labels.js';
import { checkFailMode } from '../../src/governance/checks/fail-mode.js';
import { checkCapabilities } from '../../src/governance/checks/capabilities.js';
import { checkElicitation } from '../../src/governance/checks/elicitation.js';
import { checkA2ATrust } from '../../src/governance/checks/a2a-trust.js';
import { checkInputValidation } from '../../src/governance/checks/input-validation.js';
import { checkOutputGuards } from '../../src/governance/checks/output-guards.js';
import { checkBoundedReasoning } from '../../src/governance/checks/bounded-reasoning.js';
import { checkAuditCompleteness } from '../../src/governance/checks/audit-completeness.js';
import { checkSupplyChain } from '../../src/governance/checks/supply-chain.js';
import { validateSubset } from '../../src/governance/validator.js';
import type { GovernanceCheckInput } from '../../src/types.js';

function makeCleanInput(overrides: Partial<GovernanceCheckInput> = {}): GovernanceCheckInput {
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
  it('passes when tool risk <= declared risk', () => {
    const result = checkRiskLevel(makeCleanInput());
    expect(result.pass).toBe(true);
    expect(result.name).toBe('risk-level');
  });

  it('fails when tool risk (R5) > declared risk (R3)', () => {
    const input = makeCleanInput({
      declaredRiskLevel: 'R3',
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
    });
    const result = checkRiskLevel(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.target).toBe('shell-exec');
  });
});

describe('Check 2: obo-boundary', () => {
  it('passes when OBO tool matches declared boundary', () => {
    const input = makeCleanInput({
      declaredOboBoundaries: ['communication'],
      tools: [{ name: 'send-email', riskLevel: 'R4', oboFlag: true, classification: 'communication' }],
    });
    const result = checkOboBoundary(input);
    expect(result.pass).toBe(true);
  });

  it('fails when OBO tool classification not in declared boundaries', () => {
    const input = makeCleanInput({
      declaredOboBoundaries: ['email'],
      tools: [{ name: 'calendar-write', riskLevel: 'R4', oboFlag: true, classification: 'calendar' }],
    });
    const result = checkOboBoundary(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('calendar');
  });

  it('fails when OBO tool has custom classification not in declared boundaries', () => {
    const input = makeCleanInput({
      declaredOboBoundaries: ['email'],
      tools: [{ name: 'custom-tool', riskLevel: 'R4', oboFlag: true, classification: 'custom' }],
    });
    const result = checkOboBoundary(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('custom');
  });
});

describe('Check 3: data-labels', () => {
  it('passes when all data labels are declared', () => {
    const input = makeCleanInput({
      declaredDataLabels: ['PII'],
      tools: [{ name: 'user-fetch', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII'] }],
    });
    const result = checkDataLabels(input);
    expect(result.pass).toBe(true);
  });

  it('fails when tool processes PII without declaration', () => {
    const input = makeCleanInput({
      declaredDataLabels: [],
      tools: [{ name: 'user-fetch', riskLevel: 'R3', oboFlag: false, classification: 'data', dataLabels: ['PII'] }],
    });
    const result = checkDataLabels(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('PII');
  });
});

describe('Check 4: fail-mode', () => {
  it('passes when R5 tool has fail-mode closed', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: 'closed',
    });
    const result = checkFailMode(input);
    expect(result.pass).toBe(true);
  });

  it('fails when R5 risk with fail-mode open', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: 'open',
    });
    const result = checkFailMode(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.message).toContain('R5');
  });

  it('fails when R5 risk with undefined fail-mode (defaults to fail-open)', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: undefined,
    });
    const result = checkFailMode(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.message).toContain('undefined fail-mode');
  });
});

describe('Check 5: capabilities', () => {
  it('passes when all delegation targets exist', () => {
    const input = makeCleanInput({
      agents: [
        { name: 'leader', delegatesTo: ['worker'], hasTrustBoundary: true },
        { name: 'worker', delegatesTo: [], hasTrustBoundary: true },
      ],
    });
    const result = checkCapabilities(input);
    expect(result.pass).toBe(true);
  });

  it('fails when handler delegates to undeclared agent', () => {
    const input = makeCleanInput({
      agents: [{ name: 'leader', delegatesTo: ['unknown-agent'], hasTrustBoundary: true }],
    });
    const result = checkCapabilities(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('unknown-agent');
  });
});

describe('Check 6: elicitation', () => {
  it('passes when R5 tool has elicitation gate', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
    });
    const result = checkElicitation(input);
    expect(result.pass).toBe(true);
  });

  it('fails when R5 tool lacks elicitation gate', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
    });
    const result = checkElicitation(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('critical');
  });
});

describe('Check 7: a2a-trust', () => {
  it('passes when delegating agents have trust boundaries', () => {
    const input = makeCleanInput({
      agents: [{ name: 'leader', delegatesTo: ['worker'], hasTrustBoundary: true }],
    });
    const result = checkA2ATrust(input);
    expect(result.pass).toBe(true);
  });

  it('fails when agent delegates without trust boundary', () => {
    const input = makeCleanInput({
      agents: [{ name: 'leader', delegatesTo: ['worker'], hasTrustBoundary: false }],
    });
    const result = checkA2ATrust(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.target).toBe('leader');
  });
});

describe('Check 8: input-validation', () => {
  it('passes when input validation is present', () => {
    const result = checkInputValidation(makeCleanInput({ hasInputValidation: true }));
    expect(result.pass).toBe(true);
  });

  it('fails when input validation is absent', () => {
    const result = checkInputValidation(makeCleanInput({ hasInputValidation: false }));
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('injection');
  });
});

describe('Check 9: output-guards', () => {
  it('passes when output guards are present for R4+ tools', () => {
    const input = makeCleanInput({
      tools: [{ name: 'admin-tool', riskLevel: 'R4', oboFlag: false, classification: 'execution' }],
      hasOutputGuards: true,
    });
    const result = checkOutputGuards(input);
    expect(result.pass).toBe(true);
  });

  it('fails when R4+ tools lack output guards', () => {
    const input = makeCleanInput({
      tools: [{ name: 'admin-tool', riskLevel: 'R4', oboFlag: false, classification: 'execution' }],
      hasOutputGuards: false,
    });
    const result = checkOutputGuards(input);
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.severity).toBe('high');
  });
});

describe('Checks 10-12: bounded-reasoning, audit, supply-chain', () => {
  it('bounded-reasoning passes with complete limits', () => {
    const result = checkBoundedReasoning(
      makeCleanInput({ reasoningLimits: { tokenBudget: 10000, maxRecursionDepth: 3 } }),
    );
    expect(result.pass).toBe(true);
  });

  it('bounded-reasoning fails without any limits', () => {
    const result = checkBoundedReasoning(makeCleanInput({ reasoningLimits: undefined }));
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('DoS');
  });

  it('audit-completeness passes when audit trail is configured', () => {
    const result = checkAuditCompleteness(makeCleanInput({ hasAuditTrail: true }));
    expect(result.pass).toBe(true);
  });

  it('audit-completeness fails without audit trail', () => {
    const result = checkAuditCompleteness(makeCleanInput({ hasAuditTrail: false }));
    expect(result.pass).toBe(false);
  });

  it('supply-chain passes with signature', () => {
    const result = checkSupplyChain(makeCleanInput({ hasSupplyChainSignature: true }));
    expect(result.pass).toBe(true);
  });

  it('supply-chain fails without signature', () => {
    const result = checkSupplyChain(makeCleanInput({ hasSupplyChainSignature: false }));
    expect(result.pass).toBe(false);
  });
});

describe('validateSubset', () => {
  it('runs only the requested checks by name', () => {
    const result = validateSubset(makeCleanInput(), ['risk-level', 'fail-mode']);
    expect(result.totalChecks).toBe(2);
    expect(result.checks.map(c => c.name).sort()).toEqual(['fail-mode', 'risk-level']);
  });

  it('skips unknown check names without error', () => {
    const result = validateSubset(makeCleanInput(), ['risk-level', 'nonexistent-check']);
    expect(result.totalChecks).toBe(1);
    expect(result.checks[0]!.name).toBe('risk-level');
  });

  it('returns empty result for empty check names', () => {
    const result = validateSubset(makeCleanInput(), []);
    expect(result.totalChecks).toBe(0);
    expect(result.pass).toBe(true);
  });

  it('correctly reports failures in subset', () => {
    const input = makeCleanInput({
      declaredRiskLevel: 'R3',
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
    });
    const result = validateSubset(input, ['risk-level']);
    expect(result.pass).toBe(false);
    expect(result.failedChecks).toBe(1);
    expect(result.findings[0]!.target).toBe('shell-exec');
  });
});
