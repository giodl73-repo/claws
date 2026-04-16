/**
 * L2: Compliance scenario findings — end-to-end tests.
 *
 * 2 tests:
 * 1. Full comply pipeline with all scenario additions on fixture workspace
 * 2. Fleet compliance report across multiple workspaces
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { verifyChainIntegrity, analyzePostBreak } from '../../src/audit/verify.js';
import {
  exportCanonicalJson,
  normalizeLineEndings,
  EVIDENCE_FORMAT_VERSION,
} from '../../src/audit/export.js';
import { buildSOC2Evidence, validateObservationPeriod } from '../../src/compliance/soc2.js';
import { buildHIPAAEvidence, buildPHICoverage } from '../../src/compliance/hipaa.js';
import {
  buildEUAIActAssessment,
  buildAnnexIIIObligations,
  classifyRiskTier,
} from '../../src/compliance/eu-ai-act.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';

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
 * Build a full audit chain with events spanning all categories.
 */
function buildFullChain(): { chain: AuditChain; key: Buffer } {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  const events: Array<{ eventType: string; ruleId: string }> = [
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01' },
    { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02' },
    { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03' },
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01' },
    { eventType: 'KEY_ROTATION', ruleId: 'G-ELICIT-02' },
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01' },
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01' },
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01' },
    { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02' },
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01' },
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01' },
    { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01' },
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-01' },
    { eventType: 'ANOMALY_DETECT', ruleId: 'G-BOUND-02' },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01' },
    { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02' },
  ];

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    const entry: AuditEntry = {
      timestamp: `2025-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      eventType: evt.eventType,
      actor: 'agent-1',
      target: 'workspace-target',
      action: 'invoke',
      outcome: 'allow',
      ruleId: evt.ruleId,
      severity: 3,
      policyVersion: '1.0.0',
    };
    chain.append(entry);
  }

  return { chain, key };
}

describe('e2e: full comply pipeline with all scenario additions', () => {
  it('exercises full compliance pipeline on fixture workspace', () => {
    const { chain, key } = buildFullChain();
    const entries = chain.read();
    const verifyResult = verifyChainIntegrity(entries, key);

    // Chain integrity
    expect(verifyResult.valid).toBe(true);

    // SOC2 evidence with key fingerprint
    const soc2 = buildSOC2Evidence({
      scope: '/e2e/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-10-20T00:00:00Z',
      keyFingerprint: 'sha256:abcdef1234567890',
    });

    expect(soc2.overallStatus).toBe('pass');
    expect(soc2.observationPeriodValid).toBe(true);
    expect(soc2.keyFingerprint).toBe('sha256:abcdef1234567890');
    expect(soc2.controls.length).toBe(9);
    for (const control of soc2.controls) {
      expect(control.evidenceCount).toBeGreaterThan(0);
    }

    // HIPAA evidence with breach notification and uptime
    const hipaa = buildHIPAAEvidence({
      scope: '/e2e/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: [
        { type: 'name', labels: ['phi', 'pii'] },
        { type: 'ssn', labels: ['phi', 'restricted'] },
        { type: 'email_address', labels: [] }, // Missing label coverage
      ],
      externalTransmissions: [],
      breachNotification: {
        proceduresDocumented: true,
        notificationWindowHours: 720,
        incidentContactDesignated: true,
      },
      governanceUptimePercent: 99.5,
    });

    expect(hipaa.overallStatus).not.toBe('pass'); // PHI gap causes partial/fail
    // Should have finding for missing label on email_address
    const phiLabelFindings = hipaa.findings.filter((f) => f.id.startsWith('HIPAA-PHI-LABEL'));
    expect(phiLabelFindings.length).toBe(1);
    expect(phiLabelFindings[0]!.title).toContain('email_address');

    // EU AI Act with healthcare domain → high risk
    const euConfig = {
      scope: '/e2e/workspace',
      analysis: makeCleanAnalysis(),
      domainMarkers: ['healthcare' as const],
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['right to health'],
      mitigations: ['bias testing', 'human review'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    };

    const euAssessment = buildEUAIActAssessment(euConfig);
    expect(euAssessment.riskTier).toBe('high');
    expect(euAssessment.annexIIICategory).toBe('essential-services');
    expect(euAssessment.blocked).toBe(false);

    // Annex III category obligations
    const annexObls = buildAnnexIIIObligations('high', 'essential-services');
    expect(annexObls.length).toBeGreaterThan(0);
    expect(annexObls.every((o) => o.obligationId.startsWith('EU-CAT-ES'))).toBe(true);

    // RFC 8785 canonical JSON export
    const canonical = exportCanonicalJson(entries);
    const normalized = normalizeLineEndings(canonical);
    expect(normalized).not.toContain('\r');
    expect(normalized).toBe(canonical); // Should already be clean

    // Evidence format version
    expect(EVIDENCE_FORMAT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);

    // Verify the canonical JSON is parseable
    const parsed = JSON.parse(canonical) as unknown[];
    expect(parsed.length).toBe(entries.length);
  });
});

describe('e2e: fleet compliance report across workspaces', () => {
  it('produces fleet-level aggregation with mixed workspace statuses', () => {
    const { chain: chain1, key: key1 } = buildFullChain();
    const entries1 = chain1.read();
    const verify1 = verifyChainIntegrity(entries1, key1);

    // Workspace 1: clean (all frameworks pass)
    const soc2Pass = buildSOC2Evidence({
      scope: '/fleet/ws-alpha',
      analysis: makeCleanAnalysis(),
      chainEntries: entries1,
      chainVerifyResult: verify1,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-10-20T00:00:00Z',
    });
    expect(soc2Pass.overallStatus).toBe('pass');

    // Workspace 2: violations (fails SOC2)
    const analysisWithViolation: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [{
        ruleId: 'G-PERM-01',
        level: 5,
        message: 'Critical unauthorized access',
        target: 'Bash',
        diagnosticCode: 'G-PERM-01',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
    };

    const soc2Fail = buildSOC2Evidence({
      scope: '/fleet/ws-beta',
      analysis: analysisWithViolation,
      chainEntries: entries1,
      chainVerifyResult: verify1,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-10-20T00:00:00Z',
    });
    expect(soc2Fail.overallStatus).toBe('fail');

    // Workspace 3: ungoverned (no chain, no analysis)
    const soc2Empty = buildSOC2Evidence({
      scope: '/fleet/ws-gamma',
      analysis: makeCleanAnalysis(),
      chainEntries: [],
      chainVerifyResult: { valid: true, length: 0 },
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
    });
    expect(soc2Empty.overallStatus).toBe('partial');

    // Fleet rollup: 1 pass, 1 fail, 1 partial
    const statuses = [soc2Pass.overallStatus, soc2Fail.overallStatus, soc2Empty.overallStatus];
    expect(statuses.filter((s) => s === 'pass').length).toBe(1);
    expect(statuses.filter((s) => s === 'fail').length).toBe(1);
    expect(statuses.filter((s) => s === 'partial').length).toBe(1);

    // Post-break analysis for a broken chain
    const { chain: brokenChain, key: brokenKey } = buildFullChain();
    const brokenEntries = [...brokenChain.read()];
    // Tamper with entry at index 5
    const tampered = { ...brokenEntries[5]!, hash: 'deadbeef'.repeat(8) };
    brokenEntries[5] = tampered;

    const brokenVerify = verifyChainIntegrity(brokenEntries, brokenKey);
    expect(brokenVerify.valid).toBe(false);

    const postBreak = analyzePostBreak(brokenEntries, brokenVerify, brokenKey);
    expect(postBreak).not.toBeNull();
    expect(postBreak!.affectedEntries).toBeGreaterThan(0);
    expect(postBreak!.totalEntries).toBe(brokenEntries.length);
    expect(['localized', 'sectional', 'catastrophic']).toContain(postBreak!.scope);
  });
});
