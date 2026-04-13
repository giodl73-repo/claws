/**
 * L0: Governance matchers — pass/fail with clear assertion messages.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { registerMatchers } from '../../src/matchers/index.js';
import type { GovernanceCheckInput } from '../../src/types.js';
import type { ScanInput } from '../../src/matchers/governance.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

beforeAll(() => {
  registerMatchers();
});

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

describe('toPassGovernance()', () => {
  it('passes on clean skill with all 12 checks passing', () => {
    const input = makeCleanInput();
    expect(input).toPassGovernance();
  });

  it('fails on vulnerable skill with clear message listing failures', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      failMode: 'open',
      hasElicitationGate: false,
    });

    expect(() => {
      expect(input).toPassGovernance();
    }).toThrow(/governance checks to pass/i);
  });

  it('negated: fails on clean skill with descriptive message', () => {
    const input = makeCleanInput();

    expect(() => {
      expect(input).not.toPassGovernance();
    }).toThrow(/all.*checks passed/i);
  });
});

describe('toHaveRiskLevel()', () => {
  it('passes when declared risk matches expected', () => {
    const input = makeCleanInput({ declaredRiskLevel: 'R3' });
    expect(input).toHaveRiskLevel('R3');
  });

  it('fails when risk level does not match with clear expected/actual', () => {
    const input = makeCleanInput({ declaredRiskLevel: 'R5' });

    expect(() => {
      expect(input).toHaveRiskLevel('R3');
    }).toThrow(/Expected risk level R3, but got R5/);
  });

  it('negated: fails when risk level matches with descriptive message', () => {
    const input = makeCleanInput({ declaredRiskLevel: 'R3' });

    expect(() => {
      expect(input).not.toHaveRiskLevel('R3');
    }).toThrow(/NOT to be R3/);
  });

  it('reports "undefined" when declaredRiskLevel is not set', () => {
    const input = makeCleanInput({ declaredRiskLevel: undefined });

    expect(() => {
      expect(input).toHaveRiskLevel('R3');
    }).toThrow(/Expected risk level R3, but got undefined/);
  });
});

describe('toRequireElicitation()', () => {
  it('passes when R5 tools have elicitation gate', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
    });
    expect(input).toRequireElicitation();
  });

  it('fails on skill with R5 tool missing elicitation gate with tool name in message', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: false,
    });

    expect(() => {
      expect(input).toRequireElicitation();
    }).toThrow(/shell-exec/);
  });

  it('passes vacuously when no R5 tools exist', () => {
    const input = makeCleanInput({
      tools: [{ name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' }],
      hasElicitationGate: false,
    });
    expect(input).toRequireElicitation();
  });

  it('negated: fails when R5 tools have elicitation gate with descriptive message', () => {
    const input = makeCleanInput({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
      hasElicitationGate: true,
    });

    expect(() => {
      expect(input).not.toRequireElicitation();
    }).toThrow(/NOT to be configured/);
  });

  it('negated: fails when no R5 tools found with descriptive message', () => {
    const input = makeCleanInput({
      tools: [{ name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' }],
      hasElicitationGate: false,
    });

    expect(() => {
      expect(input).not.toRequireElicitation();
    }).toThrow(/no R5 tools were found/);
  });
});

describe('toPassSecurityScan()', () => {
  it('passes on clean skill handler', () => {
    const content = readFileSync(
      join(__dirname, '..', 'fixtures', 'clean-skill', 'handler.ts'),
      'utf-8',
    );
    const scanInput: ScanInput = {
      sources: [{ filePath: 'handler.ts', content }],
    };
    expect(scanInput).toPassSecurityScan();
  });

  it('fails on skill with eval() listing scanner findings', () => {
    const scanInput: ScanInput = {
      sources: [{
        filePath: 'handler.ts',
        content: 'const x = eval(userInput);\nconst key = "sk-proj-abc123def456ghi789jkl0";',
      }],
    };

    expect(() => {
      expect(scanInput).toPassSecurityScan();
    }).toThrow(/security findings/i);
  });

  it('negated: fails on clean skill with descriptive message', () => {
    const content = readFileSync(
      join(__dirname, '..', 'fixtures', 'clean-skill', 'handler.ts'),
      'utf-8',
    );
    const scanInput: ScanInput = {
      sources: [{ filePath: 'handler.ts', content }],
    };

    expect(() => {
      expect(scanInput).not.toPassSecurityScan();
    }).toThrow(/rules passed/i);
  });
});

describe('Dragon: malicious skill detection', () => {
  it('detects skill declaring R1 but containing R5 tool → governance mismatch', () => {
    const input = makeCleanInput({
      declaredRiskLevel: 'R1',
      tools: [{ name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' }],
    });

    // Governance validator catches risk level mismatch
    expect(() => {
      expect(input).toPassGovernance();
    }).toThrow(/governance checks to pass/i);

    // Also verify via toHaveRiskLevel that declared != actual
    expect(input).toHaveRiskLevel('R1'); // Declared is R1
    // But governance fails because tool is R5
    expect(() => {
      expect(input).toPassGovernance();
    }).toThrow();
  });
});
