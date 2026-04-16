/**
 * L1: HIPAA compliance pipeline — full HIPAA evidence build on fixture
 * workspace with audit history and PHI declarations.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import {
  buildHIPAAEvidence,
  getHIPAASafeguardIds,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/hipaa.js';
import type { DeclaredPHIType, ExternalTransmission } from '../../src/compliance/hipaa.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';

/**
 * Build a realistic audit chain with events spanning all 5 HIPAA safeguards.
 */
function buildHIPAAAuditChain(): AuditChain {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  const events: Array<{ eventType: string; ruleId: string; day: number }> = [
    // 164.312(a)(1) — Access Control
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01', day: 1 },
    { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02', day: 2 },
    { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03', day: 3 },
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01', day: 4 },
    // 164.312(b) — Audit Controls
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01', day: 5 },
    { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01', day: 6 },
    { eventType: 'MONITORING_EVENT', ruleId: 'G-CONTEXT-02', day: 7 },
    // 164.312(c)(1) — Integrity
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01', day: 8 },
    { eventType: 'SCHEMA_CHECK', ruleId: 'G-INPUT-02', day: 9 },
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01', day: 10 },
    { eventType: 'DEPENDENCY_SCAN', ruleId: 'G-SUPPLY-02', day: 11 },
    // 164.312(d) — Authentication
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01', day: 12 },
    { eventType: 'ELICIT_REQUEST', ruleId: 'G-ELICIT-02', day: 13 },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01', day: 14 },
    { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02', day: 15 },
    // 164.312(e)(1) — Transmission Security
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01', day: 16 },
    { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02', day: 17 },
    { eventType: 'SENSITIVITY_CHECK', ruleId: 'G-DATA-03', day: 18 },
  ];

  for (const evt of events) {
    const entry: AuditEntry = {
      timestamp: `2025-10-${String(evt.day).padStart(2, '0')}T10:00:00Z`,
      eventType: evt.eventType,
      actor: 'agent-1',
      target: 'test-target',
      action: 'invoke',
      outcome: 'allow',
      ruleId: evt.ruleId,
      severity: 3,
      policyVersion: '1.0.0',
    };
    chain.append(entry);
  }

  return chain;
}

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

/**
 * Full PHI type declarations covering the 18 identifiers.
 */
function makeFullPHITypes(): DeclaredPHIType[] {
  return HIPAA_18_IDENTIFIERS.map((id) => ({
    type: id,
    labels: ['phi', 'restricted'],
  }));
}

describe('HIPAA integration: full pipeline on PHI workspace', () => {
  it('produces valid HIPAA evidence with all 5 safeguards from audit chain', () => {
    const chain = buildHIPAAAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    expect(verifyResult.valid).toBe(true);
    expect(entries.length).toBe(18);

    const evidence = buildHIPAAEvidence({
      scope: '/test/hipaa-workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: makeFullPHITypes(),
      externalTransmissions: [],
    });

    // All 5 safeguards present
    expect(evidence.safeguards.length).toBe(5);
    const safeguardIds = getHIPAASafeguardIds();
    expect(safeguardIds.length).toBe(5);

    // Every safeguard should have evidence and pass
    for (const sg of evidence.safeguards) {
      expect(sg.evidenceCount).toBeGreaterThan(0);
      expect(sg.status).toBe('pass');
      expect(sg.findings.length).toBe(0);
    }

    // PHI coverage — all 18 covered
    expect(evidence.phiCoverage.length).toBe(18);
    for (const entry of evidence.phiCoverage) {
      expect(entry.declared).toBe(true);
      expect(entry.labelCovered).toBe(true);
    }

    // No transmission gaps
    expect(evidence.transmissionGaps.length).toBe(0);

    // Metadata
    expect(evidence.version).toBe('1.0.0');
    expect(evidence.overallStatus).toBe('pass');
    expect(evidence.totalEvidenceCount).toBe(18);
    expect(evidence.findings.length).toBe(0);
  });

  it('produces fail status when governance violations are present', () => {
    const chain = buildHIPAAAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const analysisWithViolations: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [
        {
          ruleId: 'G-PERM-01',
          level: 4,
          message: 'Unauthorized PHI access',
          target: 'ReadPatientRecord',
          diagnosticCode: 'G-PERM-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'G-DATA-01',
          level: 3,
          message: 'Unencrypted PHI transmission',
          target: 'SendReferral',
          diagnosticCode: 'G-DATA-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
    };

    const evidence = buildHIPAAEvidence({
      scope: '/test/hipaa-workspace',
      analysis: analysisWithViolations,
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: makeFullPHITypes(),
      externalTransmissions: [],
    });

    // 164.312(a)(1) (G-PERM) should fail
    const accessControl = evidence.safeguards.find(
      (s) => s.safeguardId === '164.312(a)(1)',
    )!;
    expect(accessControl.status).toBe('fail');

    // 164.312(e)(1) (G-DATA) should fail
    const transmission = evidence.safeguards.find(
      (s) => s.safeguardId === '164.312(e)(1)',
    )!;
    expect(transmission.status).toBe('fail');

    expect(evidence.overallStatus).toBe('fail');
  });

  it('chain integrity failure cascades to all safeguards', () => {
    const chain = buildHIPAAAuditChain();
    const entries = chain.read();

    const brokenResult = {
      valid: false as const,
      length: entries.length,
      genesisHash: entries[0]!.hash,
      latestHash: entries[entries.length - 1]!.hash,
      brokenAtSeq: 5,
      error: 'Entry at index 5 hash modified',
    };

    const evidence = buildHIPAAEvidence({
      scope: '/test/hipaa-workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: brokenResult,
      declaredPHITypes: makeFullPHITypes(),
      externalTransmissions: [],
    });

    // All 5 safeguards fail
    for (const sg of evidence.safeguards) {
      expect(sg.status).toBe('fail');
      expect(sg.findings.some((f) => f.severity === 'critical')).toBe(true);
    }

    expect(evidence.overallStatus).toBe('fail');
    expect(evidence.findings.some((f) => f.id === 'HIPAA-CHAIN-BROKEN-001')).toBe(true);
  });

  it('PHI coverage gaps and transmission gaps produce correct findings', () => {
    const chain = buildHIPAAAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    // Partial PHI coverage — some types missing labels
    const partialPHI: DeclaredPHIType[] = [
      { type: 'name', labels: ['phi'] },
      { type: 'ssn', labels: [] }, // declared but no labels
    ];

    const transmissions: ExternalTransmission[] = [
      { toolName: 'SendEmail', destination: 'smtp.example.com', encrypted: false, integrityProtected: false },
    ];

    const evidence = buildHIPAAEvidence({
      scope: '/test/hipaa-workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: partialPHI,
      externalTransmissions: transmissions,
    });

    // PHI label gap for 'ssn'
    const phiFindings = evidence.findings.filter((f) => f.id.startsWith('HIPAA-PHI-LABEL'));
    expect(phiFindings.length).toBe(1);
    expect(phiFindings[0]!.title).toContain('ssn');

    // Transmission gap for SendEmail
    expect(evidence.transmissionGaps.length).toBe(1);
    expect(evidence.transmissionGaps[0]!.toolName).toBe('SendEmail');

    const xmitFindings = evidence.findings.filter((f) => f.id.startsWith('HIPAA-XMIT-GAP'));
    expect(xmitFindings.length).toBe(1);

    // Overall should be fail due to transmission gap
    expect(evidence.overallStatus).toBe('fail');
  });
});
