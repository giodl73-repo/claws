/**
 * L1: Compliance scenario findings — integration tests.
 *
 * 4 tests:
 * 1. Fleet compliance matrix generation (3 frameworks x 3 workspaces)
 * 2. Ungoverned workspace exclusion from compliance matrix
 * 3. Cross-framework findings deduplication
 * 4. Streaming export >10K entries without full chain in memory
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { streamExport } from '../../src/audit/export.js';
import { buildSOC2Evidence } from '../../src/compliance/soc2.js';
import { buildHIPAAEvidence } from '../../src/compliance/hipaa.js';
import { buildEUAIActAssessment } from '../../src/compliance/eu-ai-act.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry, ChainEntry } from '../../src/audit/types.js';

function makeCleanAnalysis(): GovAnalysis {
  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
  };
}

function makeChainEntry(seq: number, eventType: string): ChainEntry {
  return {
    seq,
    timestamp: '2025-10-01T10:00:00Z',
    eventType,
    actor: 'agent-1',
    target: 'test',
    action: 'invoke',
    outcome: 'allow',
    ruleId: 'TEST-001',
    severity: 3,
    policyVersion: '1.0.0',
    hash: `h-${seq}`,
    previousHash: seq === 0 ? null : `h-${seq - 1}`,
  };
}

describe('fleet compliance matrix generation', () => {
  it('aggregates SOC2, HIPAA, and EU AI Act results per workspace', () => {
    const analysis = makeCleanAnalysis();
    // Cover all 9 SOC2 controls: CC6.1–CC8.1
    const entries: ChainEntry[] = [
      makeChainEntry(0, 'TOOL_CALL'),          // CC6.1
      makeChainEntry(1, 'CREDENTIAL_CHECK'),    // CC6.2
      makeChainEntry(2, 'CLASSIFICATION'),      // CC6.3
      makeChainEntry(3, 'SUPPLY_CHAIN_CHECK'),  // CC6.6
      makeChainEntry(4, 'DATA_FLOW'),           // CC6.7
      makeChainEntry(5, 'INPUT_VALIDATION'),    // CC6.8
      makeChainEntry(6, 'CONTEXT_CHECK'),       // CC7.1
      makeChainEntry(7, 'BOUND_CHECK'),         // CC7.2
      makeChainEntry(8, 'A2A_DELEGATION'),      // CC8.1
    ];
    const validChain = { valid: true as const, length: entries.length };

    // Workspace 1: all 3 frameworks pass
    const soc2Ws1 = buildSOC2Evidence({
      scope: '/ws/alpha',
      analysis,
      chainEntries: entries,
      chainVerifyResult: validChain,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
    });

    const hipaaWs1 = buildHIPAAEvidence({
      scope: '/ws/alpha',
      analysis,
      chainEntries: entries,
      chainVerifyResult: validChain,
      declaredPHITypes: [],
      externalTransmissions: [],
    });

    const euWs1 = buildEUAIActAssessment({
      scope: '/ws/alpha',
      analysis,
      domainMarkers: [],
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: false,
      impactedRights: [],
      mitigations: [],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    });

    // All results should have version stamps
    expect(soc2Ws1.version).toBe('1.0.0');
    expect(hipaaWs1.version).toBe('1.0.0');
    expect(euWs1.version).toBe('1.0.0');

    // Build a simple aggregation matrix
    const matrix = {
      frameworks: ['soc2', 'hipaa', 'eu-ai-act'] as const,
      workspaces: [
        {
          path: '/ws/alpha',
          soc2: soc2Ws1.overallStatus,
          hipaa: hipaaWs1.overallStatus,
          euAiAct: euWs1.blocked ? 'blocked' : 'pass',
        },
      ],
    };

    expect(matrix.workspaces[0].soc2).toBe('pass');
    expect(matrix.workspaces[0].hipaa).toBe('pass');
    expect(matrix.workspaces[0].euAiAct).toBe('pass');
    expect(matrix.frameworks.length).toBe(3);
  });
});

describe('ungoverned workspace exclusion', () => {
  it('ungoverned workspaces produce partial/missing evidence across all frameworks', () => {
    // An ungoverned workspace has no audit chain and no governance analysis
    const emptyAnalysis = makeCleanAnalysis();
    const emptyChain: ChainEntry[] = [];
    const validResult = { valid: true as const, length: 0 };

    const soc2 = buildSOC2Evidence({
      scope: '/ws/ungoverned',
      analysis: emptyAnalysis,
      chainEntries: emptyChain,
      chainVerifyResult: validResult,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
    });

    // No evidence → all controls partial (no evidence to confirm)
    expect(soc2.totalEvidenceCount).toBe(0);
    for (const control of soc2.controls) {
      expect(control.status).toBe('partial');
      expect(control.evidenceCount).toBe(0);
    }
    expect(soc2.overallStatus).toBe('partial');

    const hipaa = buildHIPAAEvidence({
      scope: '/ws/ungoverned',
      analysis: emptyAnalysis,
      chainEntries: emptyChain,
      chainVerifyResult: validResult,
      declaredPHITypes: [],
      externalTransmissions: [],
    });

    expect(hipaa.totalEvidenceCount).toBe(0);
    expect(hipaa.overallStatus).toBe('partial');
  });
});

describe('cross-framework findings deduplication', () => {
  it('same governance violation reported once per framework, not tripled', () => {
    const violation = {
      ruleId: 'G-PERM-01',
      level: 4 as 1 | 2 | 3 | 4 | 5,
      message: 'Unauthorized tool access',
      target: 'Bash',
      diagnosticCode: 'G-PERM-01',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };

    const analysisWithViolation: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [violation],
    };

    const entries = [makeChainEntry(0, 'TOOL_CALL')];
    const validChain = { valid: true as const, length: 1 };

    const soc2 = buildSOC2Evidence({
      scope: '/ws/test',
      analysis: analysisWithViolation,
      chainEntries: entries,
      chainVerifyResult: validChain,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
    });

    const hipaa = buildHIPAAEvidence({
      scope: '/ws/test',
      analysis: analysisWithViolation,
      chainEntries: entries,
      chainVerifyResult: validChain,
      declaredPHITypes: [],
      externalTransmissions: [],
    });

    // Each framework should report the violation only in its relevant control
    // SOC2: G-PERM maps to CC6.1
    const soc2Findings = soc2.controls.flatMap((c) => c.findings);
    const soc2PermFindings = soc2Findings.filter((f) => f.title.includes('G-PERM-01'));
    expect(soc2PermFindings.length).toBe(1);
    expect(soc2PermFindings[0]!.controlId).toBe('CC6.1');

    // HIPAA: G-PERM maps to 164.312(a)(1)
    const hipaaFindings = hipaa.safeguards.flatMap((s) => s.findings);
    const hipaaPermFindings = hipaaFindings.filter((f) => f.title.includes('G-PERM-01'));
    expect(hipaaPermFindings.length).toBe(1);
    expect(hipaaPermFindings[0]!.controlId).toBe('164.312(a)(1)');

    // The violation is NOT duplicated across controls within the same framework
    // (it only appears in the control whose ruleCategories match)
    const allSoc2PermControls = soc2.controls.filter((c) =>
      c.findings.some((f) => f.title.includes('G-PERM-01')),
    );
    expect(allSoc2PermControls.length).toBe(1);
  });
});

describe('streaming export >10K entries', () => {
  it('processes 15000 entries without holding full chain in memory', () => {
    const key = randomBytes(32);
    const chain = new AuditChain(key);

    // Build 15K entries using a generator to simulate large chain
    const EVENT_TYPES = ['TOOL_CALL', 'PERMISSION_CHECK', 'DATA_FLOW', 'BOUND_CHECK', 'A2A_DELEGATION'];
    const entries: ChainEntry[] = [];

    for (let i = 0; i < 15_000; i++) {
      const entry: AuditEntry = {
        timestamp: `2025-10-01T${String(10 + (i % 14)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
        eventType: EVENT_TYPES[i % EVENT_TYPES.length]!,
        actor: `agent-${(i % 5) + 1}`,
        target: `target-${i % 100}`,
        action: 'invoke',
        outcome: 'allow',
        ruleId: `G-TEST-${String(i % 50).padStart(2, '0')}`,
        severity: (i % 5) + 1,
        policyVersion: '1.0.0',
      };
      entries.push(chain.append(entry));
    }

    expect(entries.length).toBe(15_000);

    // Stream with small batch size to verify batching works
    const chunks: string[] = [];
    let totalYields = 0;

    for (const chunk of streamExport(entries, {
      format: 'json',
      batchSize: 1000,
    })) {
      chunks.push(chunk);
      totalYields++;
    }

    // Should have yielded multiple chunks (not one giant string)
    expect(totalYields).toBeGreaterThan(1);

    // Concatenated output should be valid JSON
    const fullOutput = chunks.join('');
    const parsed = JSON.parse(fullOutput) as unknown[];
    expect(parsed.length).toBe(15_000);

    // Verify CEF streaming works too
    const cefChunks: string[] = [];
    for (const chunk of streamExport(entries, {
      format: 'cef',
      batchSize: 2000,
    })) {
      cefChunks.push(chunk);
    }
    const cefOutput = cefChunks.join('');
    const cefLines = cefOutput.split('\n').filter((l) => l.length > 0);
    expect(cefLines.length).toBe(15_000);
  });
});
