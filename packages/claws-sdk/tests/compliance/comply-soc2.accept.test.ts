/**
 * L3: SOC2 evidence builder API — SDK acceptance test.
 *
 * Consumer perspective: imports from barrel, validates the public API
 * contract without knowledge of internals.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSOC2Evidence,
  validateObservationPeriod,
  getSOC2ControlIds,
  getSOC2ControlDef,
} from '../../src/compliance/index.js';
import type {
  SOC2Evidence,
  ComplianceFinding,
  SOC2ControlEvidence,
  ControlStatus,
} from '../../src/compliance/index.js';
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

describe('SOC2 SDK acceptance: consumer API surface', () => {
  it('buildSOC2Evidence produces valid SOC2Evidence from consumer perspective', () => {
    const entries: ChainEntry[] = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'CREDENTIAL_CHECK'),
      makeChainEntry(2, 'CLASSIFICATION'),
      makeChainEntry(3, 'SUPPLY_CHAIN_CHECK'),
      makeChainEntry(4, 'DATA_FLOW'),
      makeChainEntry(5, 'INPUT_VALIDATION'),
      makeChainEntry(6, 'CONTEXT_CHECK'),
      makeChainEntry(7, 'BOUND_CHECK'),
      makeChainEntry(8, 'A2A_DELEGATION'),
    ];

    const evidence: SOC2Evidence = buildSOC2Evidence({
      scope: '/consumer/workspace',
      analysis: cleanAnalysis,
      chainEntries: entries,
      chainVerifyResult: validChain,
      observationStart: '2025-01-01T00:00:00Z',
      observationEnd: '2025-08-01T00:00:00Z',
    });

    // Type assertions — these are compile-time checks that the types resolve
    const version: string = evidence.version;
    const generatedAt: string = evidence.generatedAt;
    const scope: string = evidence.scope;
    const controls: readonly SOC2ControlEvidence[] = evidence.controls;
    const findings: readonly ComplianceFinding[] = evidence.findings;
    const overallStatus: ControlStatus = evidence.overallStatus;

    expect(version).toBe('1.0.0');
    expect(generatedAt).toBeTruthy();
    expect(scope).toBe('/consumer/workspace');
    expect(controls.length).toBe(9);
    expect(findings.length).toBe(0);
    expect(overallStatus).toBe('pass');
    expect(evidence.observationPeriodValid).toBe(true);
    expect(evidence.totalEvidenceCount).toBe(9);

    // Each control has evidence
    for (const ctrl of controls) {
      expect(ctrl.controlId).toMatch(/^CC[678]\.\d$/);
      expect(ctrl.controlName.length).toBeGreaterThan(0);
      expect(typeof ctrl.evidenceCount).toBe('number');
      expect(ctrl.evidenceCount).toBeGreaterThanOrEqual(1);
      expect(['pass', 'fail', 'partial']).toContain(ctrl.status);
    }
  });

  it('barrel exports resolve: import { SOC2Evidence, ComplianceFinding }', () => {
    // This test is a compile-time check. If the barrel is broken, the import
    // at the top of this file will fail and vitest won't even run.
    const controlIds = getSOC2ControlIds();
    expect(controlIds.length).toBe(9);
    expect(controlIds[0]).toBe('CC6.1');

    const def = getSOC2ControlDef('CC6.1');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Logical Access Security');
  });

  it('validateObservationPeriod is accessible from barrel', () => {
    expect(validateObservationPeriod('2025-01-01', '2025-08-01')).toBe(true);
    expect(validateObservationPeriod('2025-01-01', '2025-03-01')).toBe(false);
  });

  it('all 9 controls covered end-to-end from consumer API', () => {
    const controlIds = getSOC2ControlIds();
    expect(controlIds).toEqual([
      'CC6.1', 'CC6.2', 'CC6.3', 'CC6.6', 'CC6.7',
      'CC6.8', 'CC7.1', 'CC7.2', 'CC8.1',
    ]);

    for (const id of controlIds) {
      const def = getSOC2ControlDef(id);
      expect(def, `Missing control definition for ${id}`).toBeDefined();
      expect(def!.id).toBe(id);
      expect(def!.name.length).toBeGreaterThan(0);
    }
  });
});
