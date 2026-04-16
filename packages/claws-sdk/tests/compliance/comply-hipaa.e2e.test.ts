/**
 * L2: HIPAA end-to-end — complete comply hipaa pipeline on PHI workspace fixture.
 *
 * Exercises the full path: build audit chain, run governance analysis,
 * build HIPAA evidence with PHI detection and transmission gap analysis,
 * validate output structure and semantics.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import {
  buildHIPAAEvidence,
  getHIPAASafeguardIds,
  getHIPAASafeguardDef,
  buildPHICoverage,
  detectTransmissionGaps,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/hipaa.js';
import type { DeclaredPHIType, ExternalTransmission } from '../../src/compliance/hipaa.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';
import type { HIPAAEvidence, ComplianceFinding } from '../../src/compliance/types.js';

/**
 * Full event set covering all safeguard categories for e2e.
 */
const E2E_EVENTS: Array<{ eventType: string; ruleId: string }> = [
  // 164.312(a)(1) — Access Control
  { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01' },
  { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02' },
  { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03' },
  { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01' },
  // 164.312(b) — Audit Controls
  { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01' },
  { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01' },
  { eventType: 'MONITORING_EVENT', ruleId: 'G-CONTEXT-02' },
  // 164.312(c)(1) — Integrity
  { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01' },
  { eventType: 'SCHEMA_CHECK', ruleId: 'G-INPUT-02' },
  { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01' },
  { eventType: 'DEPENDENCY_SCAN', ruleId: 'G-SUPPLY-02' },
  // 164.312(d) — Authentication
  { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01' },
  { eventType: 'ELICIT_REQUEST', ruleId: 'G-ELICIT-02' },
  { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01' },
  { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02' },
  // 164.312(e)(1) — Transmission Security
  { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01' },
  { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02' },
  { eventType: 'SENSITIVITY_CHECK', ruleId: 'G-DATA-03' },
];

function buildFullChain(): AuditChain {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  for (let i = 0; i < E2E_EVENTS.length; i++) {
    const evt = E2E_EVENTS[i]!;
    const entry: AuditEntry = {
      timestamp: `2025-10-${String((i % 28) + 1).padStart(2, '0')}T${String(10 + (i % 8)).padStart(2, '0')}:00:00Z`,
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

function makeFullPHITypes(): DeclaredPHIType[] {
  return HIPAA_18_IDENTIFIERS.map((id) => ({
    type: id,
    labels: ['phi', 'restricted'],
  }));
}

describe('HIPAA e2e: complete comply hipaa on PHI workspace', () => {
  it('produces complete HIPAA evidence covering all 5 safeguards with valid chain', () => {
    const chain = buildFullChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    expect(verifyResult.valid).toBe(true);

    const secureTransmissions: ExternalTransmission[] = [
      { toolName: 'SendReferral', destination: 'ehr.example.com', encrypted: true, integrityProtected: true },
    ];

    const evidence: HIPAAEvidence = buildHIPAAEvidence({
      scope: '/reference/hipaa-workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: makeFullPHITypes(),
      externalTransmissions: secureTransmissions,
    });

    // Structure validation
    expect(evidence.version).toBe('1.0.0');
    expect(evidence.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(evidence.scope).toBe('/reference/hipaa-workspace');
    expect(evidence.safeguards.length).toBe(5);

    // All safeguards should have evidence and pass
    const safeguardIds = getHIPAASafeguardIds();
    for (const id of safeguardIds) {
      const sg = evidence.safeguards.find((s) => s.safeguardId === id);
      expect(sg, `Safeguard ${id} missing`).toBeDefined();
      expect(sg!.evidenceCount, `Safeguard ${id} has no evidence`).toBeGreaterThan(0);
      expect(sg!.status, `Safeguard ${id} should pass`).toBe('pass');

      // Verify safeguard definition exists
      const def = getHIPAASafeguardDef(id);
      expect(def, `Safeguard def ${id} missing`).toBeDefined();
      expect(def!.name.length).toBeGreaterThan(0);
    }

    // PHI coverage — all 18 identifiers covered
    expect(evidence.phiCoverage.length).toBe(18);
    for (const entry of evidence.phiCoverage) {
      expect(entry.declared).toBe(true);
      expect(entry.labelCovered).toBe(true);
    }

    // No transmission gaps (all transmissions are secure)
    expect(evidence.transmissionGaps.length).toBe(0);

    // No top-level findings
    expect(evidence.findings.length).toBe(0);
    expect(evidence.overallStatus).toBe('pass');
    expect(evidence.totalEvidenceCount).toBe(E2E_EVENTS.length);

    // JSON serialization round-trip
    const json = JSON.stringify(evidence);
    const parsed = JSON.parse(json) as HIPAAEvidence;
    expect(parsed.safeguards.length).toBe(5);
    expect(parsed.phiCoverage.length).toBe(18);
    expect(parsed.version).toBe('1.0.0');
  });

  it('end-to-end with mixed violations, PHI gaps, and transmission gaps', () => {
    const chain = buildFullChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const mixedAnalysis: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [
        {
          ruleId: 'G-PERM-01',
          level: 4,
          message: 'Unauthorized access to patient record',
          target: 'ReadPatientRecord',
          diagnosticCode: 'G-PERM-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'G-A2A-01',
          level: 5,
          message: 'Unregistered subagent accessing PHI',
          target: 'lab-agent',
          diagnosticCode: 'G-A2A-01',
          fixSuggestions: [
            { direction: 'tighten', description: 'Register subagent', target: 'G-A2A' },
          ],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        {
          ruleId: 'G-DATA-W01',
          level: 2,
          message: 'Unlabeled PHI data flow',
          subRuleDiagnosticCode: 'G-DATA-W01',
          category: 'G-DATA',
          subRuleIndex: 1,
        },
      ],
    };

    // Partial PHI — ssn declared without labels
    const partialPHI: DeclaredPHIType[] = [
      { type: 'name', labels: ['phi'] },
      { type: 'ssn', labels: [] },
    ];

    const transmissions: ExternalTransmission[] = [
      { toolName: 'SendEmail', destination: 'smtp.example.com', encrypted: false, integrityProtected: false },
    ];

    const evidence = buildHIPAAEvidence({
      scope: '/reference/hipaa-workspace',
      analysis: mixedAnalysis,
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      declaredPHITypes: partialPHI,
      externalTransmissions: transmissions,
    });

    // 164.312(a)(1) (G-PERM) -> fail
    const accessControl = evidence.safeguards.find(
      (s) => s.safeguardId === '164.312(a)(1)',
    )!;
    expect(accessControl.status).toBe('fail');

    // 164.312(d) (G-A2A/G-ELICIT) -> fail
    const auth = evidence.safeguards.find(
      (s) => s.safeguardId === '164.312(d)',
    )!;
    expect(auth.status).toBe('fail');

    // 164.312(e)(1) (G-DATA) -> partial (warning only from analysis)
    const transmission = evidence.safeguards.find(
      (s) => s.safeguardId === '164.312(e)(1)',
    )!;
    expect(transmission.status).toBe('partial');

    // Clean safeguards pass
    const auditControls = evidence.safeguards.find(
      (s) => s.safeguardId === '164.312(b)',
    )!;
    expect(auditControls.status).toBe('pass');

    // PHI gap finding for ssn
    const phiFindings = evidence.findings.filter((f) =>
      f.id.startsWith('HIPAA-PHI-LABEL'),
    );
    expect(phiFindings.length).toBe(1);
    expect(phiFindings[0]!.title).toContain('ssn');

    // Transmission gap finding
    expect(evidence.transmissionGaps.length).toBe(1);
    const xmitFindings = evidence.findings.filter((f) =>
      f.id.startsWith('HIPAA-XMIT-GAP'),
    );
    expect(xmitFindings.length).toBe(1);
    expect(xmitFindings[0]!.title).toContain('SendEmail');

    // Overall fail
    expect(evidence.overallStatus).toBe('fail');

    // Finding IDs are well-formed
    for (const sg of evidence.safeguards) {
      for (const finding of sg.findings) {
        expect(finding.id).toMatch(/^HIPAA-164\.312/);
        expect(finding.controlId).toBe(sg.safeguardId);
      }
    }
  });
});
