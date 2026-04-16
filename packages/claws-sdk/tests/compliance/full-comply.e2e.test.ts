/**
 * L2: Full compliance e2e — complete comply soc2 + hipaa + assess on fixture
 * workspace, plus audit verify + export pipeline end-to-end.
 *
 * Tests: complete comply soc2 + hipaa + assess on fixture workspace (1),
 *        audit verify + export pipeline end-to-end (1).
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { verifyChainIntegrity, analyzePostBreak } from '../../src/audit/verify.js';
import { exportChain, exportCanonicalJson, normalizeLineEndings } from '../../src/audit/export.js';
import { issueReceipt, validateReceipt } from '../../src/audit/witness.js';
import { buildSOC2Evidence, getSOC2ControlIds } from '../../src/compliance/soc2.js';
import {
  buildHIPAAEvidence,
  getHIPAASafeguardIds,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/hipaa.js';
import type { DeclaredPHIType } from '../../src/compliance/hipaa.js';
import { buildEUAIActAssessment, type EUAIActConfig } from '../../src/compliance/eu-ai-act.js';
import {
  generateSigningKeyPair,
  signEd25519,
  verifyEd25519,
} from '../../src/compliance/artifact-signer.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry, ChainEntry } from '../../src/audit/types.js';

/**
 * Build a comprehensive 40-event audit chain with events spanning all categories.
 */
function buildFixtureChain(): { chain: AuditChain; key: Buffer } {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  const events: Array<{ eventType: string; ruleId: string }> = [
    // G-PERM
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01' },
    { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02' },
    { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03' },
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-04' },
    // G-ELICIT
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01' },
    { eventType: 'KEY_ROTATION', ruleId: 'G-ELICIT-02' },
    { eventType: 'ELICIT_REQUEST', ruleId: 'G-ELICIT-03' },
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-04' },
    // G-CLASS
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01' },
    { eventType: 'RISK_ASSESSMENT', ruleId: 'G-CLASS-02' },
    { eventType: 'TOOL_CLASSIFY', ruleId: 'G-CLASS-03' },
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-04' },
    // G-SUPPLY
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01' },
    { eventType: 'DEPENDENCY_SCAN', ruleId: 'G-SUPPLY-02' },
    { eventType: 'THREAT_DETECT', ruleId: 'G-SUPPLY-03' },
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-04' },
    // G-DATA
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01' },
    { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02' },
    { eventType: 'SENSITIVITY_CHECK', ruleId: 'G-DATA-03' },
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-04' },
    // G-INPUT
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01' },
    { eventType: 'SCHEMA_CHECK', ruleId: 'G-INPUT-02' },
    { eventType: 'CONFIG_CHANGE', ruleId: 'G-INPUT-03' },
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-04' },
    // G-CONTEXT
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01' },
    { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01' },
    { eventType: 'MONITORING_EVENT', ruleId: 'G-CONTEXT-02' },
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-03' },
    // G-BOUND
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-01' },
    { eventType: 'ANOMALY_DETECT', ruleId: 'G-BOUND-02' },
    { eventType: 'THRESHOLD_BREACH', ruleId: 'G-BOUND-03' },
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-04' },
    // G-A2A
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01' },
    { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02' },
    { eventType: 'WORKFLOW_CHANGE', ruleId: 'G-A2A-03' },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-04' },
    // Extra events for richer chain
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-05' },
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-05' },
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-05' },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-05' },
  ];

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    const entry: AuditEntry = {
      timestamp: `2025-10-${String((i % 28) + 1).padStart(2, '0')}T${String(10 + (i % 8)).padStart(2, '0')}:00:00Z`,
      eventType: evt.eventType,
      actor: `agent-${(i % 4) + 1}`,
      target: `target-${i}`,
      action: 'invoke',
      outcome: i % 5 === 0 ? 'deny' : 'allow',
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

describe('Full comply e2e: complete soc2 + hipaa + assess on fixture workspace', () => {
  it('all 3 frameworks pass on fixture workspace with signed evidence', () => {
    const { chain } = buildFixtureChain();
    const entries = chain.read();
    const verifyResult = chain.verify();
    expect(verifyResult.valid).toBe(true);

    // ── SOC2 ──────────────────────────────────────────────────────────
    const soc2 = buildSOC2Evidence({
      scope: '/fixture/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-03-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    expect(soc2.overallStatus).toBe('pass');
    expect(soc2.controls.length).toBe(9);
    for (const ctrl of soc2.controls) {
      expect(ctrl.status).toBe('pass');
      expect(ctrl.evidenceCount).toBeGreaterThan(0);
    }
    expect(soc2.totalEvidenceCount).toBe(entries.length);

    // ── HIPAA ─────────────────────────────────────────────────────────
    const hipaa = buildHIPAAEvidence({
      scope: '/fixture/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: makeFullPHITypes(),
      externalTransmissions: [],
    });

    expect(hipaa.overallStatus).toBe('pass');
    expect(hipaa.safeguards.length).toBe(5);
    for (const sg of hipaa.safeguards) {
      expect(sg.status).toBe('pass');
      expect(sg.evidenceCount).toBeGreaterThan(0);
    }
    expect(hipaa.phiCoverage.length).toBe(18);

    // ── EU AI Act ─────────────────────────────────────────────────────
    const euConfig: EUAIActConfig = {
      scope: '/fixture/workspace',
      domainMarkers: ['healthcare'],
      analysis: makeCleanAnalysis(),
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['right-to-health'],
      mitigations: ['access-control'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    };

    const euAssessment = buildEUAIActAssessment(euConfig);
    expect(euAssessment.riskTier).toBe('high');
    expect(euAssessment.article13.status).toBe('pass');
    expect(euAssessment.article14.status).toBe('pass');
    expect(euAssessment.blocked).toBe(false);

    // ── Sign SOC2 evidence ────────────────────────────────────────────
    const keyPair = generateSigningKeyPair();
    const envelope = signEd25519(soc2, keyPair.privateKey, keyPair.keyId);
    expect(verifyEd25519(envelope, soc2, keyPair.publicKey)).toBe(true);
  });
});

describe('Audit verify + export pipeline end-to-end', () => {
  it('append -> verify -> witness -> export pipeline produces valid output', () => {
    const { chain, key } = buildFixtureChain();
    const entries = [...chain.read()] as ChainEntry[];

    // ── 1. Verify chain integrity ─────────────────────────────────────
    const verifyResult = verifyChainIntegrity(entries, key);
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.length).toBe(entries.length);
    expect(verifyResult.genesisHash).toBe(entries[0]!.hash);
    expect(verifyResult.latestHash).toBe(entries[entries.length - 1]!.hash);

    // ── 2. Issue witness receipts for boundary entries ─────────────────
    const genesisReceipt = issueReceipt(entries, 0);
    expect(validateReceipt(genesisReceipt)).toBe(true);
    expect(genesisReceipt.entryHash).toBe(entries[0]!.hash);

    const latestReceipt = issueReceipt(entries, entries.length - 1);
    expect(validateReceipt(latestReceipt)).toBe(true);
    expect(latestReceipt.entryHash).toBe(entries[entries.length - 1]!.hash);

    // ── 3. Export in all formats ──────────────────────────────────────
    const jsonExport = exportChain(entries, 'json');
    const parsed = JSON.parse(jsonExport) as ChainEntry[];
    expect(parsed.length).toBe(entries.length);
    expect(parsed[0]!.hash).toBe(entries[0]!.hash);

    const cefExport = exportChain(entries, 'cef');
    const cefLines = cefExport.trim().split('\n');
    expect(cefLines.length).toBe(entries.length);
    expect(cefLines[0]).toContain('CEF:0');

    const syslogExport = exportChain(entries, 'syslog');
    const syslogLines = syslogExport.trim().split('\n');
    expect(syslogLines.length).toBe(entries.length);
    expect(syslogLines[0]).toContain('claws');

    // ── 4. Canonical JSON export ──────────────────────────────────────
    const canonical = exportCanonicalJson(entries);
    const normalized = normalizeLineEndings(canonical);
    expect(normalized).not.toContain('\r');
    expect(normalized).toMatch(/^\[/);
    expect(normalized).toMatch(/\]$/);

    // ── 5. Export with redaction ──────────────────────────────────────
    const redactedJson = exportChain(entries, 'json', {
      redactFields: ['actor', 'target'],
    });
    const redactedParsed = JSON.parse(redactedJson) as ChainEntry[];
    expect(redactedParsed[0]!.actor).toBe('[REDACTED]');
    expect(redactedParsed[0]!.target).toBe('[REDACTED]');
    // Non-redacted fields preserved
    expect(redactedParsed[0]!.hash).toBe(entries[0]!.hash);

    // ── 6. Tamper detection with post-break analysis ──────────────────
    const tampered = [...entries.slice(0, 10), ...entries.slice(11)];
    const brokenResult = verifyChainIntegrity(tampered, key);
    expect(brokenResult.valid).toBe(false);
    expect(brokenResult.tamperType).toBe('deletion');

    const analysis = analyzePostBreak(tampered, brokenResult, key);
    expect(analysis).not.toBeNull();
    expect(analysis!.primaryTamperType).toBe('deletion');
    expect(analysis!.scope).toBeDefined();
  });
});
