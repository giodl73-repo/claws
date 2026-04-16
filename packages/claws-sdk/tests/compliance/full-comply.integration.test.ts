/**
 * L1: Full compliance pipeline — all 3 frameworks on reference workspace
 * with evidence signing verification.
 *
 * Tests: all 3 frameworks on reference workspace (1),
 *        evidence signing verification (1).
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { buildSOC2Evidence, getSOC2ControlIds } from '../../src/compliance/soc2.js';
import {
  buildHIPAAEvidence,
  getHIPAASafeguardIds,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/hipaa.js';
import type { DeclaredPHIType, ExternalTransmission } from '../../src/compliance/hipaa.js';
import { buildEUAIActAssessment, type EUAIActConfig } from '../../src/compliance/eu-ai-act.js';
import {
  generateSigningKeyPair,
  signEd25519,
  verifyEd25519,
  signHmac256,
  verifyHmac256,
} from '../../src/compliance/artifact-signer.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';

/**
 * Build a comprehensive audit chain covering all control and safeguard categories.
 */
function buildReferenceChain(): { chain: AuditChain; key: Buffer } {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  const events: Array<{ eventType: string; ruleId: string }> = [
    // G-PERM (SOC2 CC6.1, HIPAA 164.312(a)(1))
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01' },
    { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02' },
    { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03' },
    // G-ELICIT (SOC2 CC6.2, HIPAA 164.312(d))
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01' },
    { eventType: 'KEY_ROTATION', ruleId: 'G-ELICIT-02' },
    { eventType: 'ELICIT_REQUEST', ruleId: 'G-ELICIT-03' },
    // G-CLASS (SOC2 CC6.3, HIPAA 164.312(a)(1))
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01' },
    { eventType: 'RISK_ASSESSMENT', ruleId: 'G-CLASS-02' },
    { eventType: 'TOOL_CLASSIFY', ruleId: 'G-CLASS-03' },
    // G-SUPPLY (SOC2 CC6.6, HIPAA 164.312(c)(1))
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01' },
    { eventType: 'DEPENDENCY_SCAN', ruleId: 'G-SUPPLY-02' },
    { eventType: 'THREAT_DETECT', ruleId: 'G-SUPPLY-03' },
    // G-DATA (SOC2 CC6.7, HIPAA 164.312(e)(1))
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01' },
    { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02' },
    { eventType: 'SENSITIVITY_CHECK', ruleId: 'G-DATA-03' },
    // G-INPUT (SOC2 CC6.8, HIPAA 164.312(c)(1))
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01' },
    { eventType: 'SCHEMA_CHECK', ruleId: 'G-INPUT-02' },
    { eventType: 'CONFIG_CHANGE', ruleId: 'G-INPUT-03' },
    // G-CONTEXT (SOC2 CC7.1, HIPAA 164.312(b))
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01' },
    { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01' },
    { eventType: 'MONITORING_EVENT', ruleId: 'G-CONTEXT-02' },
    // G-BOUND (SOC2 CC7.2)
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-01' },
    { eventType: 'ANOMALY_DETECT', ruleId: 'G-BOUND-02' },
    { eventType: 'THRESHOLD_BREACH', ruleId: 'G-BOUND-03' },
    // G-A2A (SOC2 CC8.1, HIPAA 164.312(d))
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01' },
    { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02' },
    { eventType: 'WORKFLOW_CHANGE', ruleId: 'G-A2A-03' },
  ];

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    const entry: AuditEntry = {
      timestamp: `2025-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      eventType: evt.eventType,
      actor: `agent-${(i % 3) + 1}`,
      target: `target-${i}`,
      action: 'invoke',
      outcome: i % 7 === 0 ? 'deny' : 'allow',
      ruleId: evt.ruleId,
      severity: (i % 5) + 1,
      policyVersion: '1.0.0',
    };
    chain.append(entry);
  }

  return { chain, key };
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

function makeFullPHITypes(): DeclaredPHIType[] {
  return HIPAA_18_IDENTIFIERS.map((id) => ({
    type: id,
    labels: ['phi', 'restricted'],
  }));
}

describe('Full compliance pipeline: all 3 frameworks on reference workspace', () => {
  it('SOC2 + HIPAA + EU AI Act all produce valid evidence on the same audit chain', () => {
    const { chain } = buildReferenceChain();
    const entries = chain.read();
    const verifyResult = chain.verify();
    expect(verifyResult.valid).toBe(true);

    // ── SOC2 ──────────────────────────────────────────────────────────
    const soc2 = buildSOC2Evidence({
      scope: '/reference/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-03-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    expect(soc2.version).toBe('1.0.0');
    expect(soc2.controls.length).toBe(9);
    expect(soc2.overallStatus).toBe('pass');
    const controlIds = getSOC2ControlIds();
    for (const id of controlIds) {
      const ctrl = soc2.controls.find((c) => c.controlId === id);
      expect(ctrl, `SOC2 control ${id} missing`).toBeDefined();
      expect(ctrl!.evidenceCount).toBeGreaterThan(0);
    }

    // ── HIPAA ─────────────────────────────────────────────────────────
    const hipaa = buildHIPAAEvidence({
      scope: '/reference/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: makeFullPHITypes(),
      externalTransmissions: [],
    });

    expect(hipaa.version).toBe('1.0.0');
    expect(hipaa.safeguards.length).toBe(5);
    expect(hipaa.overallStatus).toBe('pass');
    const safeguardIds = getHIPAASafeguardIds();
    for (const id of safeguardIds) {
      const sg = hipaa.safeguards.find((s) => s.safeguardId === id);
      expect(sg, `HIPAA safeguard ${id} missing`).toBeDefined();
      expect(sg!.evidenceCount).toBeGreaterThan(0);
    }
    expect(hipaa.phiCoverage.length).toBe(18);

    // ── EU AI Act ─────────────────────────────────────────────────────
    const euConfig: EUAIActConfig = {
      scope: '/reference/workspace',
      domainMarkers: ['healthcare'],
      analysis: makeCleanAnalysis(),
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['right-to-health', 'data-protection'],
      mitigations: ['access-control', 'bias-testing'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    };

    const euAssessment = buildEUAIActAssessment(euConfig);

    expect(euAssessment.version).toBe('1.0.0');
    expect(euAssessment.riskTier).toBe('high');
    expect(euAssessment.annexIIICategory).toBe('essential-services');
    expect(euAssessment.article13.status).toBe('pass');
    expect(euAssessment.article14.status).toBe('pass');
    expect(euAssessment.blocked).toBe(false);
    expect(euAssessment.obligationChecklist.length).toBe(7);
  });

  it('evidence signing verification — Ed25519 and HMAC-SHA256 round-trip on compliance artifacts', () => {
    const { chain } = buildReferenceChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    // Build SOC2 evidence as the signing target
    const soc2 = buildSOC2Evidence({
      scope: '/reference/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-03-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // ── Ed25519 signing ───────────────────────────────────────────────
    const keyPair = generateSigningKeyPair();
    const ed25519Envelope = signEd25519(soc2, keyPair.privateKey, keyPair.keyId);

    expect(ed25519Envelope.algorithm).toBe('ed25519');
    expect(ed25519Envelope.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyEd25519(ed25519Envelope, soc2, keyPair.publicKey)).toBe(true);

    // Tampered evidence fails verification
    const tampered = { ...soc2, overallStatus: 'fail' as const };
    expect(verifyEd25519(ed25519Envelope, tampered, keyPair.publicKey)).toBe(false);

    // ── HMAC-SHA256 signing ───────────────────────────────────────────
    const secret = randomBytes(32);
    const hmacEnvelope = signHmac256(soc2, secret, 'hmac-key-1');

    expect(hmacEnvelope.algorithm).toBe('hmac-sha256');
    expect(hmacEnvelope.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyHmac256(hmacEnvelope, soc2, secret)).toBe(true);

    // Tampered evidence fails verification
    expect(verifyHmac256(hmacEnvelope, tampered, secret)).toBe(false);

    // Wrong key fails verification
    const wrongSecret = randomBytes(32);
    expect(verifyHmac256(hmacEnvelope, soc2, wrongSecret)).toBe(false);
  });
});
