/**
 * L2: SOC2 end-to-end — complete comply soc2 pipeline on reference workspace.
 *
 * Exercises the full path: build audit chain, run governance analysis,
 * build SOC2 evidence, validate output structure and semantics.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { verifyChainIntegrity } from '../../src/audit/verify.js';
import {
  buildSOC2Evidence,
  getSOC2ControlIds,
  getSOC2ControlDef,
  validateObservationPeriod,
} from '../../src/compliance/soc2.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';
import type { SOC2Evidence, ComplianceFinding } from '../../src/compliance/types.js';

/**
 * Full event set covering all control categories for e2e.
 */
const E2E_EVENTS: Array<{ eventType: string; ruleId: string }> = [
  // CC6.1 — Logical Access
  { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01' },
  { eventType: 'PERMISSION_CHECK', ruleId: 'G-PERM-02' },
  { eventType: 'ACCESS_DENIED', ruleId: 'G-PERM-03' },
  // CC6.2 — Credentials
  { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01' },
  { eventType: 'KEY_ROTATION', ruleId: 'G-ELICIT-02' },
  { eventType: 'ELICIT_REQUEST', ruleId: 'G-ELICIT-03' },
  // CC6.3 — RBAC
  { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01' },
  { eventType: 'RISK_ASSESSMENT', ruleId: 'G-CLASS-02' },
  { eventType: 'TOOL_CLASSIFY', ruleId: 'G-CLASS-03' },
  // CC6.6 — Threats
  { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01' },
  { eventType: 'DEPENDENCY_SCAN', ruleId: 'G-SUPPLY-02' },
  { eventType: 'THREAT_DETECT', ruleId: 'G-SUPPLY-03' },
  // CC6.7 — Data
  { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01' },
  { eventType: 'DATA_LABEL', ruleId: 'G-DATA-02' },
  { eventType: 'SENSITIVITY_CHECK', ruleId: 'G-DATA-03' },
  // CC6.8 — Software
  { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01' },
  { eventType: 'SCHEMA_CHECK', ruleId: 'G-INPUT-02' },
  { eventType: 'CONFIG_CHANGE', ruleId: 'G-INPUT-03' },
  // CC7.1 — Monitoring
  { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01' },
  { eventType: 'OUTPUT_VALIDATION', ruleId: 'G-OUTPUT-01' },
  { eventType: 'MONITORING_EVENT', ruleId: 'G-CONTEXT-02' },
  // CC7.2 — Anomaly
  { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-01' },
  { eventType: 'ANOMALY_DETECT', ruleId: 'G-BOUND-02' },
  { eventType: 'THRESHOLD_BREACH', ruleId: 'G-BOUND-03' },
  // CC8.1 — Change
  { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01' },
  { eventType: 'AGENT_SPAWN', ruleId: 'G-A2A-02' },
  { eventType: 'WORKFLOW_CHANGE', ruleId: 'G-A2A-03' },
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

describe('SOC2 e2e: complete comply soc2 on reference workspace', () => {
  it('produces complete SOC2 evidence covering all 9 controls with valid chain', () => {
    const chain = buildFullChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    expect(verifyResult.valid).toBe(true);

    const evidence: SOC2Evidence = buildSOC2Evidence({
      scope: '/reference/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-03-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // Structure validation
    expect(evidence.version).toBe('1.0.0');
    expect(evidence.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(evidence.scope).toBe('/reference/workspace');
    expect(evidence.observationPeriodValid).toBe(true);
    expect(evidence.controls.length).toBe(9);

    // All controls should have evidence and pass
    const controlIds = getSOC2ControlIds();
    for (const id of controlIds) {
      const control = evidence.controls.find((c) => c.controlId === id);
      expect(control, `Control ${id} missing`).toBeDefined();
      expect(control!.evidenceCount, `Control ${id} has no evidence`).toBeGreaterThan(0);
      expect(control!.status, `Control ${id} should pass`).toBe('pass');

      // Verify control definition exists
      const def = getSOC2ControlDef(id);
      expect(def, `Control def ${id} missing`).toBeDefined();
      expect(def!.name.length).toBeGreaterThan(0);
    }

    // No top-level findings
    expect(evidence.findings.length).toBe(0);
    expect(evidence.overallStatus).toBe('pass');
    expect(evidence.totalEvidenceCount).toBe(E2E_EVENTS.length);

    // JSON serialization round-trip
    const json = JSON.stringify(evidence);
    const parsed = JSON.parse(json) as SOC2Evidence;
    expect(parsed.controls.length).toBe(9);
    expect(parsed.version).toBe('1.0.0');
  });

  it('end-to-end with mixed violations produces correct per-control status', () => {
    const chain = buildFullChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const mixedAnalysis: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [
        {
          ruleId: 'G-PERM-01',
          level: 4,
          message: 'Unauthorized access to Bash',
          target: 'Bash',
          diagnosticCode: 'G-PERM-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'G-A2A-01',
          level: 5,
          message: 'Unregistered subagent delegation',
          target: 'sub-agent',
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
          message: 'Unlabeled data flow detected',
          subRuleDiagnosticCode: 'G-DATA-W01',
          category: 'G-DATA',
          subRuleIndex: 1,
        },
      ],
    };

    const evidence = buildSOC2Evidence({
      scope: '/reference/workspace',
      analysis: mixedAnalysis,
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-03-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // CC6.1 (G-PERM) → fail
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.status).toBe('fail');

    // CC6.7 (G-DATA) → partial (warning only)
    const cc67 = evidence.controls.find((c) => c.controlId === 'CC6.7')!;
    expect(cc67.status).toBe('partial');

    // CC8.1 (G-A2A) → fail
    const cc81 = evidence.controls.find((c) => c.controlId === 'CC8.1')!;
    expect(cc81.status).toBe('fail');

    // Clean controls pass
    const cc62 = evidence.controls.find((c) => c.controlId === 'CC6.2')!;
    expect(cc62.status).toBe('pass');

    // Overall fail because CC6.1 and CC8.1 failed
    expect(evidence.overallStatus).toBe('fail');

    // Finding IDs are well-formed
    for (const control of evidence.controls) {
      for (const finding of control.findings) {
        expect(finding.id).toMatch(/^SOC2-CC[678]\.\d/);
        expect(finding.controlId).toBe(control.controlId);
      }
    }
  });
});
