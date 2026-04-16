/**
 * L2: End-to-end — import @bic/claws-test, register matchers, run full
 * governance + security validation on Tier 2 skill, produce structured results.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Import everything from the barrel — this is how consumers would use it
import {
  registerMatchers,
  validate,
  scan,
  getAllRules,
} from '../../src/index.js';
import type {
  GovernanceCheckInput,
  ValidationResult,
  ScanInput,
} from '../../src/index.js';

beforeAll(() => {
  registerMatchers();
});

describe('e2e: full governance + security validation', () => {
  it('complete pipeline: import, register matchers, validate, scan, structured results', () => {
    // 1. Define skill governance posture (Tier 2 skill)
    const skillInput: GovernanceCheckInput = {
      tools: [
        { name: 'file-read', riskLevel: 'R2', oboFlag: false, classification: 'filesystem' },
        { name: 'file-write', riskLevel: 'R3', oboFlag: false, classification: 'filesystem' },
      ],
      agents: [
        { name: 'code-assistant', delegatesTo: [], hasTrustBoundary: true },
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

    // 2. Run governance validation via programmatic API
    const govResult: ValidationResult = validate(skillInput);
    expect(govResult.totalChecks).toBe(13);
    expect(govResult.pass).toBe(true);
    expect(govResult.findings).toHaveLength(0);

    // 3. Run governance validation via matcher API
    expect(skillInput).toPassGovernance();
    expect(skillInput).toHaveRiskLevel('R3');

    // 4. Run security scan via programmatic API
    const handlerContent = readFileSync(
      join(__dirname, '..', 'fixtures', 'clean-skill', 'handler.ts'),
      'utf-8',
    );
    const rules = getAllRules();
    expect(rules.length).toBe(16);

    const scanResult = scan(
      [{ filePath: 'handler.ts', content: handlerContent }],
      rules,
    );
    expect(scanResult.filesScanned).toBe(1);
    expect(scanResult.rulesApplied).toBe(16);
    expect(scanResult.findings).toHaveLength(0);

    // 5. Run security scan via matcher API
    const scanInput: ScanInput = {
      sources: [{ filePath: 'handler.ts', content: handlerContent }],
    };
    expect(scanInput).toPassSecurityScan();

    // 6. Verify structured results have complete metadata
    expect(govResult).toHaveProperty('totalChecks');
    expect(govResult).toHaveProperty('passedChecks');
    expect(govResult).toHaveProperty('failedChecks');
    expect(govResult).toHaveProperty('checks');
    expect(govResult).toHaveProperty('findings');
    expect(scanResult).toHaveProperty('findings');
    expect(scanResult).toHaveProperty('filesScanned');
    expect(scanResult).toHaveProperty('rulesApplied');
  });
});
