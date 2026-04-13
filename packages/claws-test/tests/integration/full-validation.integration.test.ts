/**
 * L1: Full GovernanceValidator integration — fixture skills, aggregate results.
 */

import { describe, it, expect } from 'vitest';
import { validate } from '../../src/governance/validator.js';
import { parseScenarios } from '../../src/scenario/parser.js';
import { runAllScenarios } from '../../src/scenario/runner.js';
import type { SkillHandlerAdapter, HandlerResult } from '../../src/scenario/runner.js';
import type { GovernanceCheckInput } from '../../src/types.js';

/**
 * Clean skill fixture: Tier 2, well-governed, no violations expected.
 */
const cleanSkillInput: GovernanceCheckInput = {
  tools: [
    { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
  ],
  agents: [
    { name: 'assistant', delegatesTo: [], hasTrustBoundary: true },
  ],
  declaredRiskLevel: 'R3',
  declaredOboBoundaries: [],
  declaredDataLabels: ['internal'],
  failMode: 'closed',
  hasInputValidation: true,
  hasOutputGuards: true,
  hasElicitationGate: false,
  hasAuditTrail: true,
  hasSupplyChainSignature: true,
  reasoningLimits: { tokenBudget: 10000, maxRecursionDepth: 3 },
};

/**
 * Vulnerable skill fixture: multiple governance gaps.
 */
const vulnerableSkillInput: GovernanceCheckInput = {
  tools: [
    { name: 'send-email', riskLevel: 'R5', oboFlag: true, classification: 'communication', dataLabels: ['PII', 'email-content'] },
    { name: 'shell-exec', riskLevel: 'R5', oboFlag: false, classification: 'execution' },
  ],
  agents: [
    { name: 'mailer', delegatesTo: ['helper'], hasTrustBoundary: false },
    { name: 'helper', delegatesTo: [], hasTrustBoundary: true },
  ],
  declaredRiskLevel: 'R3',
  declaredOboBoundaries: ['email'],
  declaredDataLabels: [],
  failMode: 'open',
  hasInputValidation: false,
  hasOutputGuards: false,
  hasElicitationGate: false,
  hasAuditTrail: false,
  hasSupplyChainSignature: false,
  reasoningLimits: undefined,
};

describe('GovernanceValidator integration', () => {
  it('validate() on clean Tier 2 fixture returns 12 passing checks', () => {
    const result = validate(cleanSkillInput);

    expect(result.totalChecks).toBe(12);
    expect(result.passedChecks).toBe(12);
    expect(result.failedChecks).toBe(0);
    expect(result.pass).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('validate() on vulnerable fixture returns specific failing checks with details', () => {
    const result = validate(vulnerableSkillInput);

    expect(result.pass).toBe(false);
    expect(result.failedChecks).toBeGreaterThan(0);
    expect(result.findings.length).toBeGreaterThan(0);

    // Check that specific governance gaps are detected
    const checkNames = result.checks.filter(c => !c.pass).map(c => c.name);

    // R5 tool with R3 declared → risk-level should fail
    expect(checkNames).toContain('risk-level');
    // R5 with fail-open → fail-mode should fail
    expect(checkNames).toContain('fail-mode');
    // R5 without elicitation → elicitation should fail
    expect(checkNames).toContain('elicitation');
    // No input validation
    expect(checkNames).toContain('input-validation');
    // No output guards for R5 tools
    expect(checkNames).toContain('output-guards');
    // No audit trail
    expect(checkNames).toContain('audit-completeness');
    // No supply chain signature
    expect(checkNames).toContain('supply-chain');
    // No reasoning limits
    expect(checkNames).toContain('bounded-reasoning');
    // Delegation without trust boundary
    expect(checkNames).toContain('a2a-trust');
    // PII data label not declared
    expect(checkNames).toContain('data-labels');

    // Verify findings have remediation hints
    for (const finding of result.findings) {
      expect(finding.remediation.length).toBeGreaterThan(0);
      expect(finding.message.length).toBeGreaterThan(0);
    }
  });

  it('ScenarioRunner + GovernanceValidator pipeline: parse, replay, validate, aggregate', async () => {
    const skillMd = `# test-skill

## Scenarios

### Read a file
- Given: workspace with files
- When: user asks to read a file
- Then: uses file-read and returns the content

### Handle missing
- Given: file does not exist
- When: user asks to read nonexistent
- Then: fails with error
`;

    // Parse scenarios
    const scenarios = parseScenarios(skillMd);
    expect(scenarios).toHaveLength(2);

    // Create handler adapter
    const handler: SkillHandlerAdapter = {
      async execute(input: string): Promise<HandlerResult> {
        if (input.includes('nonexistent')) {
          return {
            toolsUsed: [],
            oboAccessed: [],
            hasOutput: false,
            error: 'File not found',
          };
        }
        return {
          toolsUsed: ['file-read'],
          oboAccessed: [],
          hasOutput: true,
        };
      },
    };

    // Replay scenarios
    const scenarioResults = await runAllScenarios(scenarios, handler);
    expect(scenarioResults).toHaveLength(2);
    // First scenario: uses file-read + returns content → should pass
    expect(scenarioResults[0]!.pass).toBe(true);
    // Second scenario: fails with error → should pass (error expected)
    expect(scenarioResults[1]!.pass).toBe(true);

    // Run governance validation
    const validationResult = validate(cleanSkillInput);
    expect(validationResult.totalChecks).toBe(12);

    // Aggregate: both pipelines produce structured results
    expect(scenarioResults.every(r => typeof r.pass === 'boolean')).toBe(true);
    expect(typeof validationResult.pass).toBe('boolean');
  });
});
