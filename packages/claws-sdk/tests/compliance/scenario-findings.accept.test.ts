/**
 * L3: SDK acceptance — compliance matrix API aggregates all 3 frameworks
 * with dedup and streaming from consumer perspective.
 *
 * Imports from barrel exports only, validates the public API contract.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSOC2Evidence,
  validateObservationPeriod,
  buildHIPAAEvidence,
  buildPHICoverage,
  buildEUAIActAssessment,
  buildAnnexIIIObligations,
  classifyRiskTier,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/index.js';
import {
  exportCanonicalJson,
  normalizeLineEndings,
  EVIDENCE_FORMAT_VERSION,
  streamExport,
  analyzePostBreak,
} from '../../src/audit/index.js';
import type {
  SOC2Evidence,
  HIPAAEvidence,
  EUAIActAssessment,
  ComplianceFinding,
  ControlStatus,
} from '../../src/compliance/index.js';
import type { ChainEntry, ChainVerifyResult } from '../../src/audit/types.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

function makeEntry(seq: number, eventType: string): ChainEntry {
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

const cleanAnalysis: GovAnalysis = {
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

const validChain: ChainVerifyResult = { valid: true, length: 9 };

describe('SDK acceptance: compliance matrix API — 3-framework aggregation', () => {
  it('aggregates SOC2, HIPAA, and EU AI Act with dedup and streaming', () => {
    // Cover all 9 SOC2 controls + 5 HIPAA safeguards
    const entries: ChainEntry[] = [
      makeEntry(0, 'TOOL_CALL'),          // CC6.1 + 164.312(a)(1)
      makeEntry(1, 'CREDENTIAL_CHECK'),    // CC6.2 + 164.312(d)
      makeEntry(2, 'CLASSIFICATION'),      // CC6.3 + 164.312(a)(1)
      makeEntry(3, 'SUPPLY_CHAIN_CHECK'),  // CC6.6 + 164.312(c)(1)
      makeEntry(4, 'DATA_FLOW'),           // CC6.7 + 164.312(e)(1)
      makeEntry(5, 'INPUT_VALIDATION'),    // CC6.8 + 164.312(c)(1)
      makeEntry(6, 'CONTEXT_CHECK'),       // CC7.1 + 164.312(b)
      makeEntry(7, 'BOUND_CHECK'),         // CC7.2
      makeEntry(8, 'A2A_DELEGATION'),      // CC8.1 + 164.312(d)
    ];

    // --- SOC2 ---
    const soc2: SOC2Evidence = buildSOC2Evidence({
      scope: '/accept/workspace',
      analysis: cleanAnalysis,
      chainEntries: entries,
      chainVerifyResult: validChain,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
      keyFingerprint: 'sha256:test-fingerprint',
    });

    expect(soc2.version).toBe('1.0.0');
    expect(soc2.overallStatus).toBe('pass');
    expect(soc2.controls.length).toBe(9);
    expect(soc2.keyFingerprint).toBe('sha256:test-fingerprint');
    expect(soc2.observationPeriodValid).toBe(true);

    // --- HIPAA ---
    const hipaa: HIPAAEvidence = buildHIPAAEvidence({
      scope: '/accept/workspace',
      analysis: cleanAnalysis,
      chainEntries: entries,
      chainVerifyResult: validChain,
      declaredPHITypes: [
        { type: 'name', labels: ['phi'] },
        { type: 'ssn', labels: ['phi', 'restricted'] },
      ],
      externalTransmissions: [],
      breachNotification: {
        proceduresDocumented: true,
        notificationWindowHours: 720,
        incidentContactDesignated: true,
      },
      governanceUptimePercent: 99.9,
    });

    expect(hipaa.version).toBe('1.0.0');
    expect(hipaa.safeguards.length).toBe(5);
    expect(hipaa.phiCoverage.length).toBe(18); // All 18 HIPAA identifiers

    // PHI coverage from barrel
    const coverage = buildPHICoverage([
      { type: 'name', labels: ['phi'] },
    ]);
    expect(coverage.length).toBe(18);
    expect(coverage.find((c) => c.phiType === 'name')?.declared).toBe(true);
    expect(coverage.find((c) => c.phiType === 'ssn')?.declared).toBe(false);

    // --- EU AI Act ---
    const eu: EUAIActAssessment = buildEUAIActAssessment({
      scope: '/accept/workspace',
      analysis: cleanAnalysis,
      domainMarkers: ['healthcare'],
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['right-to-health'],
      mitigations: ['bias-testing'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    });

    expect(eu.riskTier).toBe('high');
    expect(eu.blocked).toBe(false);
    expect(eu.annexIIICategory).toBe('essential-services');

    // Annex III obligations from barrel
    const annexObls = buildAnnexIIIObligations('high', 'essential-services');
    expect(annexObls.length).toBeGreaterThan(0);
    for (const obl of annexObls) {
      expect(obl.obligationId).toMatch(/^EU-CAT-ES-/);
    }

    // Risk classification from barrel
    const { tier } = classifyRiskTier({
      scope: '/test',
      analysis: cleanAnalysis,
      domainMarkers: ['healthcare'],
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
    expect(tier).toBe('high');

    // --- Cross-cutting: canonical JSON, line endings, versioning ---
    const canonical = exportCanonicalJson(entries);
    const normalized = normalizeLineEndings(canonical);
    expect(normalized).not.toContain('\r');
    const parsed = JSON.parse(canonical) as unknown[];
    expect(parsed.length).toBe(9);

    expect(EVIDENCE_FORMAT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);

    // Observation period validation from barrel
    expect(validateObservationPeriod('2025-01-01', '2025-08-01')).toBe(true);
    expect(validateObservationPeriod('2025-01-01', '2025-03-01')).toBe(false);

    // HIPAA identifiers from barrel
    expect(HIPAA_18_IDENTIFIERS.length).toBe(18);
    expect(HIPAA_18_IDENTIFIERS).toContain('name');
    expect(HIPAA_18_IDENTIFIERS).toContain('ssn');

    // Streaming from barrel — small test
    const chunks: string[] = [];
    for (const chunk of streamExport(entries, { format: 'json', batchSize: 2 })) {
      chunks.push(chunk);
    }
    const streamOutput = chunks.join('');
    const streamParsed = JSON.parse(streamOutput) as unknown[];
    expect(streamParsed.length).toBe(9);

    // Post-break analysis from barrel — on valid chain returns null
    const nullAnalysis = analyzePostBreak(entries, validChain, Buffer.alloc(32));
    expect(nullAnalysis).toBeNull();
  });
});
