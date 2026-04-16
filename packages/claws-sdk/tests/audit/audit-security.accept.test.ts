/**
 * L3: SDK acceptance — full audit chain + compliance pipeline API from
 * consumer perspective with tamper detection regression.
 *
 * Tests the complete public API surface through barrel imports:
 * - Audit chain append, read, verify
 * - Tamper detection (D-02, T-02 regression)
 * - PBKDF2 configurable iterations (C-02 regression)
 * - Compliance evidence builders (SOC2, HIPAA, EU AI Act)
 * - Evidence signing (Ed25519, HMAC-SHA256)
 * - Witness receipts
 * - Multi-format export
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';

// All imports via barrel — consumer perspective
import {
  AuditChain,
  verifyChainIntegrity,
  analyzePostBreak,
  issueReceipt,
  validateReceipt,
  exportChain,
  exportCanonicalJson,
  normalizeLineEndings,
} from '../../src/audit/index.js';
import type {
  AuditEntry,
  ChainEntry,
  ChainVerifyResult,
  TamperType,
} from '../../src/audit/index.js';
import {
  buildSOC2Evidence,
  getSOC2ControlIds,
  buildHIPAAEvidence,
  getHIPAASafeguardIds,
  HIPAA_18_IDENTIFIERS,
  buildEUAIActAssessment,
  generateSigningKeyPair,
  signEd25519,
  verifyEd25519,
  signHmac256,
  verifyHmac256,
  verifyEvidence,
} from '../../src/compliance/index.js';
import type {
  SOC2Evidence,
  HIPAAEvidence,
  EUAIActAssessment,
  SignedEvidence,
} from '../../src/compliance/index.js';
import {
  deriveSingleDevKey,
  validatePbkdf2Iterations,
  PBKDF2_DEFAULT_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  PBKDF2_MAX_ITERATIONS,
} from '../../src/keys/ceremony.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

/**
 * Events covering all 9 SOC2 controls and all 5 HIPAA safeguards.
 */
const DIVERSE_EVENTS: Array<{ eventType: string; ruleId: string }> = [
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
  // Extra events for a 30-entry chain
  { eventType: 'TOOL_CALL', ruleId: 'G-PERM-04' },
  { eventType: 'DATA_FLOW', ruleId: 'G-DATA-04' },
  { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-04' },
];

function buildChain(count: number): { entries: ChainEntry[]; key: Buffer; chain: AuditChain } {
  const key = randomBytes(32);
  const chain = new AuditChain(key);
  for (let i = 0; i < count; i++) {
    const evt = DIVERSE_EVENTS[i % DIVERSE_EVENTS.length]!;
    const entry: AuditEntry = {
      timestamp: `2025-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      eventType: evt.eventType,
      actor: `agent-${(i % 3) + 1}`,
      target: `target-${i}`,
      action: 'invoke',
      outcome: i % 5 === 0 ? 'deny' : 'allow',
      ruleId: evt.ruleId,
      severity: (i % 5) + 1,
      policyVersion: '1.0.0',
    };
    chain.append(entry);
  }
  return { entries: [...chain.read()] as ChainEntry[], key, chain };
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

describe('SDK acceptance: full audit chain + compliance pipeline API', () => {
  it('audit chain + verify + tamper detection + compliance + signing end-to-end', () => {
    const { entries, key, chain } = buildChain(30);

    // ── D-02 regression: chain integrity verified ─────────────────────
    const verifyResult: ChainVerifyResult = verifyChainIntegrity(entries, key);
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.length).toBe(30);
    expect(verifyResult.genesisHash).toBe(entries[0]!.hash);
    expect(verifyResult.latestHash).toBe(entries[29]!.hash);

    // Also verify via chain instance method
    const instanceVerify = chain.verify();
    expect(instanceVerify.valid).toBe(true);

    // ── T-02 regression: all three tamper modes ───────────────────────
    // Deletion
    const deleted = [...entries.slice(0, 15), ...entries.slice(16)];
    const deleteResult = verifyChainIntegrity(deleted, key);
    expect(deleteResult.valid).toBe(false);
    const deleteTamper: TamperType | undefined = deleteResult.tamperType;
    expect(deleteTamper).toBe('deletion');
    expect(deleteResult.breakPoint).toBe(15);

    // Reorder
    const reordered = [...entries];
    const tmp = reordered[5]!;
    reordered[5] = reordered[20]!;
    reordered[20] = tmp;
    const reorderResult = verifyChainIntegrity(reordered, key);
    expect(reorderResult.valid).toBe(false);
    expect(reorderResult.tamperType).toBe('reorder');

    // Modification
    const modified = [...entries];
    modified[10] = { ...modified[10]!, action: 'TAMPERED' };
    const modResult = verifyChainIntegrity(modified, key);
    expect(modResult.valid).toBe(false);
    expect(modResult.tamperType).toBe('modification');
    expect(modResult.breakPoint).toBe(10);

    // Post-break analysis
    const breakAnalysis = analyzePostBreak(deleted, deleteResult, key);
    expect(breakAnalysis).not.toBeNull();
    expect(breakAnalysis!.primaryTamperType).toBe('deletion');

    // ── C-02 regression: PBKDF2 configurable iterations ───────────────
    expect(PBKDF2_DEFAULT_ITERATIONS).toBe(600_000);
    expect(PBKDF2_MIN_ITERATIONS).toBe(100_000);
    expect(PBKDF2_MAX_ITERATIONS).toBe(10_000_000);

    const defaultKey = deriveSingleDevKey('test-pass', 'test-salt');
    expect(defaultKey.algorithm).toBe('pbkdf2-sha256');
    expect(defaultKey.key).toMatch(/^[0-9a-f]{64}$/);

    const customKey = deriveSingleDevKey('test-pass', 'test-salt', 200_000);
    expect(customKey.key).not.toBe(defaultKey.key);

    expect(() => validatePbkdf2Iterations(50_000)).toThrow();
    expect(() => validatePbkdf2Iterations(20_000_000)).toThrow();
    expect(() => validatePbkdf2Iterations(600_000)).not.toThrow();

    // ── Witness receipts ──────────────────────────────────────────────
    const receipt = issueReceipt(entries, 0);
    expect(validateReceipt(receipt)).toBe(true);
    expect(receipt.entryHash).toBe(entries[0]!.hash);

    // ── Multi-format export ───────────────────────────────────────────
    const jsonOut = exportChain(entries, 'json');
    expect(JSON.parse(jsonOut)).toHaveLength(30);

    const cefOut = exportChain(entries, 'cef');
    expect(cefOut.split('\n')).toHaveLength(30);

    const syslogOut = exportChain(entries, 'syslog');
    expect(syslogOut.split('\n')).toHaveLength(30);

    const canonicalOut = exportCanonicalJson(entries);
    const normalized = normalizeLineEndings(canonicalOut);
    expect(normalized).not.toContain('\r');

    // ── SOC2 evidence ─────────────────────────────────────────────────
    const soc2: SOC2Evidence = buildSOC2Evidence({
      scope: '/consumer/ws',
      analysis: cleanAnalysis,
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
    });
    expect(soc2.controls.length).toBe(9);
    expect(soc2.overallStatus).toBe('pass');

    // ── HIPAA evidence ────────────────────────────────────────────────
    const hipaa: HIPAAEvidence = buildHIPAAEvidence({
      scope: '/consumer/ws',
      analysis: cleanAnalysis,
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: HIPAA_18_IDENTIFIERS.map((t) => ({ type: t, labels: ['phi'] })),
      externalTransmissions: [],
    });
    expect(hipaa.safeguards.length).toBe(5);
    expect(hipaa.overallStatus).toBe('pass');

    // ── EU AI Act assessment ──────────────────────────────────────────
    const euAssessment: EUAIActAssessment = buildEUAIActAssessment({
      scope: '/consumer/ws',
      domainMarkers: ['healthcare'],
      analysis: cleanAnalysis,
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['privacy'],
      mitigations: ['encryption'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    });
    expect(euAssessment.riskTier).toBe('high');
    expect(euAssessment.blocked).toBe(false);

    // ── Evidence signing ──────────────────────────────────────────────
    const keyPair = generateSigningKeyPair();
    const ed25519Env: SignedEvidence = signEd25519(soc2, keyPair.privateKey, keyPair.keyId);
    expect(verifyEd25519(ed25519Env, soc2, keyPair.publicKey)).toBe(true);
    expect(verifyEvidence(ed25519Env, soc2, keyPair.publicKey)).toBe(true);

    const secret = randomBytes(32);
    const hmacEnv: SignedEvidence = signHmac256(soc2, secret, 'hmac-key');
    expect(verifyHmac256(hmacEnv, soc2, secret)).toBe(true);
    expect(verifyEvidence(hmacEnv, soc2, secret)).toBe(true);
  });
});
