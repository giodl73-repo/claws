/**
 * L3: HIPAA evidence builder API — SDK acceptance test.
 *
 * Consumer perspective: imports from barrel, validates the public API
 * contract without knowledge of internals.
 */

import { describe, it, expect } from 'vitest';
import {
  buildHIPAAEvidence,
  buildPHICoverage,
  detectTransmissionGaps,
  getHIPAASafeguardIds,
  getHIPAASafeguardDef,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/index.js';
import type {
  HIPAAEvidence,
  HIPAASafeguardEvidence,
  PHICoverageEntry,
  TransmissionGap,
  ComplianceFinding,
  ControlStatus,
} from '../../src/compliance/index.js';
import type { DeclaredPHIType, ExternalTransmission } from '../../src/compliance/hipaa.js';
import type { ChainVerifyResult, ChainEntry } from '../../src/audit/types.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

function makeChainEntry(seq: number, eventType: string): ChainEntry {
  return {
    seq,
    timestamp: '2025-10-01T10:00:00Z',
    eventType,
    actor: 'agent-1',
    target: 'test',
    action: 'test',
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

const validChain: ChainVerifyResult = { valid: true, length: 1 };

describe('HIPAA SDK acceptance: consumer API surface', () => {
  it('buildHIPAAEvidence produces valid HIPAAEvidence from consumer perspective', () => {
    const entries: ChainEntry[] = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'CLASSIFICATION'),
      makeChainEntry(2, 'CONTEXT_CHECK'),
      makeChainEntry(3, 'OUTPUT_VALIDATION'),
      makeChainEntry(4, 'INPUT_VALIDATION'),
      makeChainEntry(5, 'SUPPLY_CHAIN_CHECK'),
      makeChainEntry(6, 'CREDENTIAL_CHECK'),
      makeChainEntry(7, 'A2A_DELEGATION'),
      makeChainEntry(8, 'DATA_FLOW'),
      makeChainEntry(9, 'DATA_LABEL'),
    ];

    const fullPHI: DeclaredPHIType[] = HIPAA_18_IDENTIFIERS.map((id) => ({
      type: id,
      labels: ['phi'],
    }));

    const evidence: HIPAAEvidence = buildHIPAAEvidence({
      scope: '/consumer/workspace',
      analysis: cleanAnalysis,
      chainEntries: entries,
      chainVerifyResult: validChain,
      declaredPHITypes: fullPHI,
      externalTransmissions: [],
    });

    // Type assertions — compile-time checks that types resolve
    const version: string = evidence.version;
    const generatedAt: string = evidence.generatedAt;
    const scope: string = evidence.scope;
    const safeguards: readonly HIPAASafeguardEvidence[] = evidence.safeguards;
    const phiCoverage: readonly PHICoverageEntry[] = evidence.phiCoverage;
    const transmissionGaps: readonly TransmissionGap[] = evidence.transmissionGaps;
    const findings: readonly ComplianceFinding[] = evidence.findings;
    const overallStatus: ControlStatus = evidence.overallStatus;

    expect(version).toBe('1.0.0');
    expect(generatedAt).toBeTruthy();
    expect(scope).toBe('/consumer/workspace');
    expect(safeguards.length).toBe(5);
    expect(phiCoverage.length).toBe(18);
    expect(transmissionGaps.length).toBe(0);
    expect(findings.length).toBe(0);
    expect(overallStatus).toBe('pass');
    expect(evidence.totalEvidenceCount).toBe(10);

    // Each safeguard has evidence
    for (const sg of safeguards) {
      expect(sg.safeguardId).toMatch(/^164\.312/);
      expect(sg.safeguardName.length).toBeGreaterThan(0);
      expect(typeof sg.evidenceCount).toBe('number');
      expect(sg.evidenceCount).toBeGreaterThanOrEqual(1);
      expect(['pass', 'fail', 'partial']).toContain(sg.status);
    }

    // PHI coverage entries well-formed
    for (const entry of phiCoverage) {
      expect(entry.phiType).toBeTruthy();
      expect(typeof entry.declared).toBe('boolean');
      expect(typeof entry.labelCovered).toBe('boolean');
      expect(Array.isArray(entry.coveringLabels)).toBe(true);
    }
  });

  it('barrel exports resolve: import { HIPAAEvidence, PHICoverageEntry, TransmissionGap }', () => {
    // Compile-time check. If the barrel is broken, the import fails.
    const safeguardIds = getHIPAASafeguardIds();
    expect(safeguardIds.length).toBe(5);
    expect(safeguardIds[0]).toBe('164.312(a)(1)');
    expect(safeguardIds[4]).toBe('164.312(e)(1)');

    const def = getHIPAASafeguardDef('164.312(a)(1)');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Access Control');
  });

  it('HIPAA_18_IDENTIFIERS is accessible from barrel', () => {
    expect(HIPAA_18_IDENTIFIERS.length).toBe(18);
    expect(HIPAA_18_IDENTIFIERS).toContain('name');
    expect(HIPAA_18_IDENTIFIERS).toContain('ssn');
    expect(HIPAA_18_IDENTIFIERS).toContain('email_address');
  });

  it('buildPHICoverage and detectTransmissionGaps accessible from barrel', () => {
    const coverage = buildPHICoverage([{ type: 'name', labels: ['phi'] }]);
    expect(coverage.length).toBe(18);
    expect(coverage.find((c) => c.phiType === 'name')!.declared).toBe(true);

    const gaps = detectTransmissionGaps([
      { toolName: 'SendEmail', destination: 'smtp', encrypted: false, integrityProtected: false },
    ]);
    expect(gaps.length).toBe(1);
    expect(gaps[0]!.toolName).toBe('SendEmail');
  });

  it('all 5 safeguards covered end-to-end from consumer API', () => {
    const safeguardIds = getHIPAASafeguardIds();
    expect(safeguardIds).toEqual([
      '164.312(a)(1)',
      '164.312(b)',
      '164.312(c)(1)',
      '164.312(d)',
      '164.312(e)(1)',
    ]);

    for (const id of safeguardIds) {
      const def = getHIPAASafeguardDef(id);
      expect(def, `Missing safeguard definition for ${id}`).toBeDefined();
      expect(def!.id).toBe(id);
      expect(def!.name.length).toBeGreaterThan(0);
    }
  });
});
