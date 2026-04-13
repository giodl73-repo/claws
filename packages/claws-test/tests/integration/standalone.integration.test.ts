/**
 * L1: Standalone integration — all @bic/claws-test features work without claws CLI.
 *
 * Validates that the test framework is self-contained and does not
 * require claws-cli to be installed or importable.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { validate } from '../../src/governance/validator.js';
import { parseScenarios } from '../../src/scenario/parser.js';
import { scan, getAllRules } from '../../src/security/scanner.js';
import { registerMatchers } from '../../src/matchers/index.js';
import type { GovernanceCheckInput } from '../../src/types.js';

beforeAll(() => {
  registerMatchers();
});

describe('standalone integration', () => {
  it('GovernanceValidator works without claws CLI', () => {
    const input: GovernanceCheckInput = {
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
    };

    const result = validate(input);
    expect(result.totalChecks).toBe(12);
    expect(result.pass).toBe(true);
  });

  it('ScenarioParser works without claws CLI', () => {
    const skillMd = `# Skill
## Scenarios
### Test scenario
- Given: initial state
- When: user acts
- Then: result observed
`;
    const scenarios = parseScenarios(skillMd);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]!.name).toBe('Test scenario');
  });

  it('SecurityScanner works without claws CLI', () => {
    const rules = getAllRules();
    expect(rules.length).toBe(16);

    const result = scan(
      [{ filePath: 'test.ts', content: 'const x = 1;' }],
      rules,
    );
    expect(result.filesScanned).toBe(1);
    expect(result.findings).toHaveLength(0);
  });

  it('custom matchers work without claws CLI', () => {
    const input: GovernanceCheckInput = {
      tools: [{ name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' }],
      agents: [{ name: 'assistant', delegatesTo: [], hasTrustBoundary: true }],
      declaredRiskLevel: 'R3',
      failMode: 'closed',
      hasInputValidation: true,
      hasOutputGuards: true,
      hasAuditTrail: true,
      hasSupplyChainSignature: true,
      reasoningLimits: { tokenBudget: 10000, maxRecursionDepth: 3 },
    };

    expect(input).toPassGovernance();
    expect(input).toHaveRiskLevel('R3');
  });
});
