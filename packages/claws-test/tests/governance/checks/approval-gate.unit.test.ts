/**
 * L0: approval-gate check — R5 elicitation/audit composition model.
 */

import { describe, it, expect } from 'vitest';
import { checkApprovalGate } from '../../../src/governance/checks/approval-gate.js';
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

// ── Non-R5 tools ─────────────────────────────────────────────────────────

describe('Check 13: approval-gate (non-R5)', () => {
  it('passes when no R5 tools are present', () => {
    const result = checkApprovalGate(makeInput({
      tools: [
        { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
        { name: 'web-fetch', riskLevel: 'R3', oboFlag: false, classification: 'network' },
      ],
    }));
    expect(result.pass).toBe(true);
    expect(result.name).toBe('approval-gate');
    expect(result.findings).toHaveLength(0);
  });

  it('passes regardless of elicitation/audit when no R5 tools', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'code-exec', riskLevel: 'R4', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
      hasAuditTrail: false,
      failMode: 'open',
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('passes with unknown risk level (not R5)', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'custom', riskLevel: 'CUSTOM', oboFlag: false, classification: 'other' }],
      hasElicitationGate: false,
      hasAuditTrail: false,
    }));
    expect(result.pass).toBe(true);
  });
});

// ── R5 tools with both gates ─────────────────────────────────────────────

describe('Check 13: approval-gate (R5 with gates)', () => {
  it('passes when R5 tool has both elicitation gate AND audit trail', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
      hasAuditTrail: true,
      failMode: 'closed',
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('passes when R5 tool has only elicitation gate', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
      hasAuditTrail: false,
      failMode: 'closed',
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('passes when R5 tool has only audit trail', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
      hasAuditTrail: true,
      failMode: 'closed',
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });
});

// ── R5 tools missing gates ───────────────────────────────────────────────

describe('Check 13: approval-gate (R5 missing gates)', () => {
  it('fails when R5 tool has neither elicitation gate nor audit trail', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
      hasAuditTrail: false,
      failMode: 'closed',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.checkName).toBe('approval-gate');
    expect(result.findings[0]!.message).toContain('shell-exec');
    expect(result.findings[0]!.message).toContain('neither elicitation gate nor audit trail');
    expect(result.findings[0]!.target).toBe('shell-exec');
  });

  it('lists all R5 tools in the finding message', () => {
    const result = checkApprovalGate(makeInput({
      tools: [
        { name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' },
        { name: 'admin-api', riskLevel: 'R5', oboFlag: false, classification: 'admin' },
        { name: 'safe-tool', riskLevel: 'R2', oboFlag: false, classification: 'read' },
      ],
      hasElicitationGate: false,
      hasAuditTrail: false,
      failMode: 'closed',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings[0]!.message).toContain('shell-exec');
    expect(result.findings[0]!.message).toContain('admin-api');
    expect(result.findings[0]!.target).toContain('shell-exec');
    expect(result.findings[0]!.target).toContain('admin-api');
  });
});

// ── R5 fail-open ─────────────────────────────────────────────────────────

describe('Check 13: approval-gate (R5 fail-open)', () => {
  it('produces critical finding for R5 with fail-mode open', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
      hasAuditTrail: true,
      failMode: 'open',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.message).toContain('fail-mode open');
    expect(result.findings[0]!.target).toBe('fail-mode');
  });

  it('produces two findings when R5 has neither gate AND fail-mode open', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
      hasAuditTrail: false,
      failMode: 'open',
    }));
    expect(result.pass).toBe(false);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]!.message).toContain('neither elicitation gate nor audit trail');
    expect(result.findings[1]!.message).toContain('fail-mode open');
  });

  it('does not flag fail-open when no R5 tools', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'read-only', riskLevel: 'R1', oboFlag: false, classification: 'read' }],
      failMode: 'open',
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────

describe('Check 13: approval-gate (edge cases)', () => {
  it('handles empty tools array', () => {
    const result = checkApprovalGate(makeInput({ tools: [] }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('R5 with fail-mode closed and both gates passes cleanly', () => {
    const result = checkApprovalGate(makeInput({
      tools: [
        { name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' },
        { name: 'file-read', riskLevel: 'R1', oboFlag: false, classification: 'filesystem' },
      ],
      hasElicitationGate: true,
      hasAuditTrail: true,
      failMode: 'closed',
    }));
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('remediation text is present on gate-missing finding', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
      hasAuditTrail: false,
    }));
    expect(result.findings[0]!.remediation).toContain('hasElicitationGate');
  });

  it('remediation text is present on fail-open finding', () => {
    const result = checkApprovalGate(makeInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
      hasAuditTrail: true,
      failMode: 'open',
    }));
    expect(result.findings[0]!.remediation).toContain('closed');
  });
});
