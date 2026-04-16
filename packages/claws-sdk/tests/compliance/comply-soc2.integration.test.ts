/**
 * L1: SOC2 compliance pipeline — full SOC2 evidence build on fixture
 * workspace with 30-day audit history.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { verifyChainIntegrity } from '../../src/audit/verify.js';
import { buildSOC2Evidence, getSOC2ControlIds } from '../../src/compliance/soc2.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';

/**
 * Build a realistic 30-day audit chain with events spanning all 9 controls.
 */
function build30DayAuditChain(): AuditChain {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  const events: Array<{ eventType: string; ruleId: string; day: number }> = [
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01', day: 1 },
    { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02', day: 2 },
    { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03', day: 3 },
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01', day: 4 },
    { eventType: 'KEY_ROTATION', ruleId: 'G-ELICIT-02', day: 5 },
    { eventType: 'ELICIT_REQUEST', ruleId: 'G-ELICIT-03', day: 6 },
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01', day: 7 },
    { eventType: 'RISK_ASSESSMENT', ruleId: 'G-CLASS-02', day: 8 },
    { eventType: 'TOOL_CLASSIFY', ruleId: 'G-CLASS-03', day: 9 },
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01', day: 10 },
    { eventType: 'DEPENDENCY_SCAN', ruleId: 'G-SUPPLY-02', day: 11 },
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01', day: 12 },
    { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02', day: 13 },
    { eventType: 'SENSITIVITY_CHECK', ruleId: 'G-DATA-03', day: 14 },
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01', day: 15 },
    { eventType: 'SCHEMA_CHECK', ruleId: 'G-INPUT-02', day: 16 },
    { eventType: 'CONFIG_CHANGE', ruleId: 'G-INPUT-03', day: 17 },
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01', day: 18 },
    { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01', day: 19 },
    { eventType: 'MONITORING_EVENT', ruleId: 'G-CONTEXT-02', day: 20 },
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-01', day: 21 },
    { eventType: 'ANOMALY_DETECT', ruleId: 'G-BOUND-02', day: 22 },
    { eventType: 'THRESHOLD_BREACH', ruleId: 'G-BOUND-03', day: 23 },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01', day: 24 },
    { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02', day: 25 },
    { eventType: 'WORKFLOW_CHANGE', ruleId: 'G-A2A-03', day: 26 },
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-04', day: 27 },
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-04', day: 28 },
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-04', day: 29 },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-04', day: 30 },
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

/**
 * Build a clean GovAnalysis (no violations, no warnings).
 */
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

describe('SOC2 integration: full pipeline on 30-day audit history', () => {
  it('produces valid SOC2 evidence with all 9 controls from 30-day chain', () => {
    const chain = build30DayAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    expect(verifyResult.valid).toBe(true);
    expect(entries.length).toBe(30);

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-04-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // All 9 controls present
    expect(evidence.controls.length).toBe(9);
    const controlIds = getSOC2ControlIds();
    expect(controlIds.length).toBe(9);

    // Every control should have evidence (at least 1 matching event)
    for (const control of evidence.controls) {
      expect(control.evidenceCount).toBeGreaterThan(0);
      expect(control.status).toBe('pass');
      expect(control.findings.length).toBe(0);
    }

    // Metadata
    expect(evidence.version).toBe('1.0.0');
    expect(evidence.observationPeriodValid).toBe(true);
    expect(evidence.overallStatus).toBe('pass');
    expect(evidence.totalEvidenceCount).toBe(30);
    expect(evidence.findings.length).toBe(0);
  });

  it('produces fail status when governance violations are present', () => {
    const chain = build30DayAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const analysisWithViolations: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [
        {
          ruleId: 'G-PERM-01',
          level: 4,
          message: 'Unauthorized tool access',
          target: 'Bash',
          diagnosticCode: 'G-PERM-01',
          fixSuggestions: [
            { direction: 'tighten', description: 'Deny Bash', target: 'G-PERM' },
          ],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'G-DATA-01',
          level: 3,
          message: 'Data flow without label',
          target: 'user-data',
          diagnosticCode: 'G-DATA-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
    };

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: analysisWithViolations,
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-04-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // CC6.1 (G-PERM) should fail
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.status).toBe('fail');
    expect(cc61.findings.length).toBeGreaterThan(0);

    // CC6.7 (G-DATA) should fail
    const cc67 = evidence.controls.find((c) => c.controlId === 'CC6.7')!;
    expect(cc67.status).toBe('fail');

    // Overall should be fail
    expect(evidence.overallStatus).toBe('fail');
  });

  it('chain integrity failure cascades to all controls', () => {
    const chain = build30DayAuditChain();
    const entries = chain.read();

    // Simulate broken chain
    const brokenResult = {
      valid: false as const,
      length: entries.length,
      genesisHash: entries[0]!.hash,
      latestHash: entries[entries.length - 1]!.hash,
      brokenAtSeq: 5,
      error: 'Entry at index 5 hash modified',
    };

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: brokenResult,
      observationStart: '2025-04-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // All 9 controls fail
    for (const control of evidence.controls) {
      expect(control.status).toBe('fail');
      expect(control.findings.some((f) => f.severity === 'critical')).toBe(true);
    }

    expect(evidence.overallStatus).toBe('fail');
    expect(evidence.findings.some((f) => f.id === 'SOC2-CHAIN-BROKEN-001')).toBe(true);
  });

  it('short observation period produces warning, not hard failure', () => {
    const chain = build30DayAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-10-01T00:00:00Z',
      observationEnd: '2025-10-31T00:00:00Z',
    });

    expect(evidence.observationPeriodValid).toBe(false);
    // Warning, not failure
    const obsFinding = evidence.findings.find((f) => f.id === 'SOC2-OBS-PERIOD-001');
    expect(obsFinding).toBeDefined();
    expect(obsFinding!.severity).toBe('medium');

    // Controls still pass if chain is valid and no violations
    // (short period is a warning only)
    for (const control of evidence.controls) {
      expect(control.status).not.toBe('fail');
    }
  });
});
