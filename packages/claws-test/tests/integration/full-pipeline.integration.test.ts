/**
 * L1: Full pipeline integration — governance + security validation via matchers.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registerMatchers } from '../../src/matchers/index.js';
import type { GovernanceCheckInput } from '../../src/types.js';
import type { ScanInput } from '../../src/matchers/governance.js';

beforeAll(() => {
  registerMatchers();
});

/**
 * Tier 2 skill fixture — clean governance posture, clean handler code.
 */
const tier2Input: GovernanceCheckInput = {
  tools: [
    { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
  ],
  agents: [
    { name: 'assistant', delegatesTo: [], hasTrustBoundary: true },
  ],
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

describe('full governance + security pipeline via matchers', () => {
  it('Tier 2 fixture passes governance + security scan via matchers', () => {
    // Governance validation
    expect(tier2Input).toPassGovernance();
    expect(tier2Input).toHaveRiskLevel('R3');

    // Security scan on clean handler
    const handlerContent = readFileSync(
      join(__dirname, '..', 'fixtures', 'clean-skill', 'handler.ts'),
      'utf-8',
    );
    const scanInput: ScanInput = {
      sources: [{ filePath: 'handler.ts', content: handlerContent }],
    };
    expect(scanInput).toPassSecurityScan();
  });

  it('Tier 3 fixture passes both governance and security validation', () => {
    const tier3Input: GovernanceCheckInput = {
      tools: [
        { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
        { name: 'file-write', riskLevel: 'R3', oboFlag: false, classification: 'filesystem' },
      ],
      agents: [
        { name: 'assistant', delegatesTo: [], hasTrustBoundary: true },
      ],
      declaredRiskLevel: 'R3',
      declaredOboBoundaries: [],
      declaredDataLabels: [],
      failMode: 'closed',
      hasInputValidation: true,
      hasOutputGuards: true,
      hasElicitationGate: false,
      hasAuditTrail: true,
      hasSupplyChainSignature: true,
      reasoningLimits: { tokenBudget: 50000, maxRecursionDepth: 5, maxSteps: 10 },
    };

    expect(tier3Input).toPassGovernance();

    const handlerContent = readFileSync(
      join(__dirname, '..', 'fixtures', 'tier3-skill', 'handler.ts'),
      'utf-8',
    );
    const scanInput: ScanInput = {
      sources: [{ filePath: 'handler.ts', content: handlerContent }],
    };
    expect(scanInput).toPassSecurityScan();
  });
});
