/**
 * L0: SOC2 evidence builder — per-control mapping tests.
 *
 * 9 tests, one per CC6.1–CC8.1 control. Each verifies that
 * governance violations and audit events are correctly routed
 * to the mapped control.
 */

import { describe, it, expect } from 'vitest';
import { buildSOC2Evidence, validateObservationPeriod, getSOC2ControlIds, getSOC2ControlDef } from '../../src/compliance/soc2.js';
import type { SOC2BuilderOptions } from '../../src/compliance/soc2.js';
import type { GovAnalysis, GovViolation, GovWarning } from '../../src/ir/gov-analysis.js';
import type { ChainEntry, ChainVerifyResult } from '../../src/audit/types.js';

/**
 * Build a minimal GovAnalysis with given violations and warnings.
 */
function makeAnalysis(
  violations: readonly GovViolation[] = [],
  warnings: readonly GovWarning[] = [],
): GovAnalysis {
  return {
    violations,
    warnings,
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
 * Build a single GovViolation with the given rule ID.
 */
function makeViolation(ruleId: string, level: number = 3): GovViolation {
  return {
    ruleId,
    level: level as 1 | 2 | 3 | 4 | 5,
    message: `Violation from ${ruleId}`,
    target: 'test-target',
    diagnosticCode: ruleId,
    fixSuggestions: [],
    toolFuzzyMatches: [],
  };
}

/**
 * Build a single GovWarning with the given category.
 */
function makeWarning(ruleId: string, category: string): GovWarning {
  return {
    ruleId,
    level: 2 as 1 | 2 | 3 | 4 | 5,
    message: `Warning from ${ruleId}`,
    subRuleDiagnosticCode: ruleId,
    category,
    subRuleIndex: 1,
  };
}

/**
 * Build a ChainEntry with the given event type.
 */
function makeChainEntry(
  seq: number,
  eventType: string,
  ruleId: string = 'TEST-001',
): ChainEntry {
  return {
    seq,
    timestamp: '2025-10-01T10:00:00Z',
    eventType,
    actor: 'agent-1',
    target: 'test-target',
    action: 'test',
    outcome: 'allow',
    ruleId,
    severity: 3,
    policyVersion: '1.0.0',
    hash: `hash-${seq}`,
    previousHash: seq === 0 ? null : `hash-${seq - 1}`,
  };
}

const VALID_CHAIN_RESULT: ChainVerifyResult = {
  valid: true,
  length: 5,
  genesisHash: 'hash-0',
  latestHash: 'hash-4',
};

/** 7-month observation period. */
const OBS_START = '2025-04-01T00:00:00Z';
const OBS_END = '2025-11-01T00:00:00Z';

function buildOptions(
  overrides: Partial<SOC2BuilderOptions> = {},
): SOC2BuilderOptions {
  return {
    scope: '/test/workspace',
    analysis: makeAnalysis(),
    chainEntries: [],
    chainVerifyResult: VALID_CHAIN_RESULT,
    observationStart: OBS_START,
    observationEnd: OBS_END,
    ...overrides,
  };
}

describe('SOC2 control mapping: CC6.1 — Logical Access Security', () => {
  it('maps G-PERM violations and TOOL_CALL events to CC6.1', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01')]);
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'PERMISSION_CHECK'),
      makeChainEntry(2, 'ACCESS_DENIED'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.status).toBe('fail');
    expect(cc61.evidenceCount).toBe(3);
    expect(cc61.findings.length).toBeGreaterThanOrEqual(1);
    expect(cc61.findings.some((f) => f.title.includes('G-PERM-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC6.2 — System Credentials Management', () => {
  it('maps G-ELICIT violations and CREDENTIAL_CHECK events to CC6.2', () => {
    const analysis = makeAnalysis([makeViolation('G-ELICIT-01')]);
    const entries = [
      makeChainEntry(0, 'CREDENTIAL_CHECK'),
      makeChainEntry(1, 'ELICIT_REQUEST'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc62 = evidence.controls.find((c) => c.controlId === 'CC6.2')!;
    expect(cc62.status).toBe('fail');
    expect(cc62.evidenceCount).toBe(2);
    expect(cc62.findings.some((f) => f.title.includes('G-ELICIT-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC6.3 — Role-Based Access Control', () => {
  it('maps G-CLASS violations and CLASSIFICATION events to CC6.3', () => {
    const analysis = makeAnalysis([makeViolation('G-CLASS-01')]);
    const entries = [
      makeChainEntry(0, 'CLASSIFICATION'),
      makeChainEntry(1, 'RISK_ASSESSMENT'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc63 = evidence.controls.find((c) => c.controlId === 'CC6.3')!;
    expect(cc63.status).toBe('fail');
    expect(cc63.evidenceCount).toBe(2);
    expect(cc63.findings.some((f) => f.title.includes('G-CLASS-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC6.6 — External Threat Protection', () => {
  it('maps G-SUPPLY violations and SUPPLY_CHAIN_CHECK events to CC6.6', () => {
    const analysis = makeAnalysis([makeViolation('G-SUPPLY-01')]);
    const entries = [
      makeChainEntry(0, 'SUPPLY_CHAIN_CHECK'),
      makeChainEntry(1, 'DEPENDENCY_SCAN'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc66 = evidence.controls.find((c) => c.controlId === 'CC6.6')!;
    expect(cc66.status).toBe('fail');
    expect(cc66.evidenceCount).toBe(2);
    expect(cc66.findings.some((f) => f.title.includes('G-SUPPLY-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC6.7 — Data Transmission Security', () => {
  it('maps G-DATA violations and DATA_FLOW events to CC6.7', () => {
    const analysis = makeAnalysis([makeViolation('G-DATA-01')]);
    const entries = [
      makeChainEntry(0, 'DATA_FLOW'),
      makeChainEntry(1, 'DATA_LABEL'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc67 = evidence.controls.find((c) => c.controlId === 'CC6.7')!;
    expect(cc67.status).toBe('fail');
    expect(cc67.evidenceCount).toBe(2);
    expect(cc67.findings.some((f) => f.title.includes('G-DATA-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC6.8 — Software Change Management', () => {
  it('maps G-INPUT violations and INPUT_VALIDATION events to CC6.8', () => {
    const analysis = makeAnalysis([makeViolation('G-INPUT-01')]);
    const entries = [
      makeChainEntry(0, 'INPUT_VALIDATION'),
      makeChainEntry(1, 'SCHEMA_CHECK'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc68 = evidence.controls.find((c) => c.controlId === 'CC6.8')!;
    expect(cc68.status).toBe('fail');
    expect(cc68.evidenceCount).toBe(2);
    expect(cc68.findings.some((f) => f.title.includes('G-INPUT-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC7.1 — System Monitoring', () => {
  it('maps G-CONTEXT/G-OUTPUT violations and CONTEXT_CHECK events to CC7.1', () => {
    const analysis = makeAnalysis([
      makeViolation('G-CONTEXT-01'),
      makeViolation('G-OUTPUT-01'),
    ]);
    const entries = [
      makeChainEntry(0, 'CONTEXT_CHECK'),
      makeChainEntry(1, 'OUTPUT_VALIDATION'),
      makeChainEntry(2, 'MONITORING_EVENT'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc71 = evidence.controls.find((c) => c.controlId === 'CC7.1')!;
    expect(cc71.status).toBe('fail');
    expect(cc71.evidenceCount).toBe(3);
    expect(cc71.findings.some((f) => f.title.includes('G-CONTEXT-01'))).toBe(true);
    expect(cc71.findings.some((f) => f.title.includes('G-OUTPUT-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC7.2 — Anomaly Detection', () => {
  it('maps G-BOUND violations and BOUND_CHECK events to CC7.2', () => {
    const analysis = makeAnalysis([makeViolation('G-BOUND-01')]);
    const entries = [
      makeChainEntry(0, 'BOUND_CHECK'),
      makeChainEntry(1, 'ANOMALY_DETECT'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc72 = evidence.controls.find((c) => c.controlId === 'CC7.2')!;
    expect(cc72.status).toBe('fail');
    expect(cc72.evidenceCount).toBe(2);
    expect(cc72.findings.some((f) => f.title.includes('G-BOUND-01'))).toBe(true);
  });
});

describe('SOC2 control mapping: CC8.1 — Change Management', () => {
  it('maps G-A2A violations and A2A_DELEGATION events to CC8.1', () => {
    const analysis = makeAnalysis([makeViolation('G-A2A-01')]);
    const entries = [
      makeChainEntry(0, 'A2A_DELEGATION'),
      makeChainEntry(1, 'AGENT_SPAWN'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const cc81 = evidence.controls.find((c) => c.controlId === 'CC8.1')!;
    expect(cc81.status).toBe('fail');
    expect(cc81.evidenceCount).toBe(2);
    expect(cc81.findings.some((f) => f.title.includes('G-A2A-01'))).toBe(true);
  });
});

describe('SOC2 observation period validation', () => {
  it('returns true for 7-month period', () => {
    expect(validateObservationPeriod('2025-01-01T00:00:00Z', '2025-08-01T00:00:00Z')).toBe(true);
  });

  it('returns false for 3-month period', () => {
    expect(validateObservationPeriod('2025-01-01T00:00:00Z', '2025-04-01T00:00:00Z')).toBe(false);
  });

  it('produces warning finding for short observation period', () => {
    const evidence = buildSOC2Evidence(
      buildOptions({
        observationStart: '2025-01-01T00:00:00Z',
        observationEnd: '2025-03-01T00:00:00Z',
      }),
    );

    expect(evidence.observationPeriodValid).toBe(false);
    expect(evidence.findings.some((f) => f.id === 'SOC2-OBS-PERIOD-001')).toBe(true);
    expect(evidence.findings.find((f) => f.id === 'SOC2-OBS-PERIOD-001')!.severity).toBe('medium');
  });
});

describe('SOC2 broken audit chain', () => {
  it('elevates broken chain to critical finding across all controls', () => {
    const brokenResult: ChainVerifyResult = {
      valid: false,
      length: 5,
      genesisHash: 'hash-0',
      latestHash: 'hash-4',
      brokenAtSeq: 2,
      error: 'Entry at index 2 hash does not match recomputed HMAC-SHA256',
    };

    const evidence = buildSOC2Evidence(
      buildOptions({ chainVerifyResult: brokenResult }),
    );

    // Top-level critical finding
    expect(evidence.findings.some((f) => f.id === 'SOC2-CHAIN-BROKEN-001')).toBe(true);
    expect(evidence.findings.find((f) => f.id === 'SOC2-CHAIN-BROKEN-001')!.severity).toBe('critical');

    // All 9 controls should be 'fail'
    expect(evidence.controls.length).toBe(9);
    for (const control of evidence.controls) {
      expect(control.status).toBe('fail');
      expect(control.findings.some((f) => f.severity === 'critical')).toBe(true);
    }

    expect(evidence.overallStatus).toBe('fail');
  });
});

describe('SOC2 evidence structure', () => {
  it('produces well-formed SOC2Evidence with all 9 controls', () => {
    const evidence = buildSOC2Evidence(buildOptions());

    expect(evidence.version).toBe('1.0.0');
    expect(evidence.scope).toBe('/test/workspace');
    expect(evidence.controls.length).toBe(9);
    expect(evidence.observationPeriodStart).toBe(OBS_START);
    expect(evidence.observationPeriodEnd).toBe(OBS_END);
    expect(evidence.observationPeriodValid).toBe(true);

    const controlIds = evidence.controls.map((c) => c.controlId);
    expect(controlIds).toEqual([
      'CC6.1', 'CC6.2', 'CC6.3', 'CC6.6', 'CC6.7',
      'CC6.8', 'CC7.1', 'CC7.2', 'CC8.1',
    ]);
  });

  it('controls with no violations and evidence pass', () => {
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'PERMISSION_CHECK'),
    ];
    const evidence = buildSOC2Evidence(
      buildOptions({ chainEntries: entries }),
    );

    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.status).toBe('pass');
    expect(cc61.evidenceCount).toBe(2);
  });

  it('controls with no violations and no evidence are partial', () => {
    const evidence = buildSOC2Evidence(buildOptions());

    // CC6.1 has no events → partial (no evidence to confirm)
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.status).toBe('partial');
    expect(cc61.evidenceCount).toBe(0);
  });

  it('controls with only warnings are partial', () => {
    const analysis = makeAnalysis([], [makeWarning('G-PERM-W01', 'G-PERM')]);
    const evidence = buildSOC2Evidence(
      buildOptions({ analysis }),
    );

    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.status).toBe('partial');
  });
});

describe('SOC2 violation severity mapping', () => {
  it('maps numeric level 5 to critical', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 5)]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('maps numeric level 4 to high', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 4)]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'high')).toBe(true);
  });

  it('maps numeric level 3 to medium', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 3)]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'medium')).toBe(true);
  });

  it('maps numeric level 1 to low', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 1)]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'low')).toBe(true);
  });

  it('maps string level "error" to high', () => {
    const v: GovViolation = {
      ruleId: 'G-PERM-01',
      level: 'error' as unknown as 1 | 2 | 3 | 4 | 5,
      message: 'Error violation',
      target: 'test-target',
      diagnosticCode: 'G-PERM-01',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };
    const analysis = makeAnalysis([v]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'high')).toBe(true);
  });

  it('maps string level "warn" to medium', () => {
    const v: GovViolation = {
      ruleId: 'G-PERM-01',
      level: 'warn' as unknown as 1 | 2 | 3 | 4 | 5,
      message: 'Warn violation',
      target: 'test-target',
      diagnosticCode: 'G-PERM-01',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };
    const analysis = makeAnalysis([v]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'medium')).toBe(true);
  });

  it('maps unknown string level to low', () => {
    const v: GovViolation = {
      ruleId: 'G-PERM-01',
      level: 'info' as unknown as 1 | 2 | 3 | 4 | 5,
      message: 'Info violation',
      target: 'test-target',
      diagnosticCode: 'G-PERM-01',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };
    const analysis = makeAnalysis([v]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    expect(cc61.findings.some((f) => f.severity === 'low')).toBe(true);
  });
});

describe('SOC2 fixSuggestions in findings', () => {
  it('includes fixSuggestions in remediation when present', () => {
    const v: GovViolation = {
      ruleId: 'G-PERM-01',
      level: 3 as 1 | 2 | 3 | 4 | 5,
      message: 'Violation with fix suggestions',
      target: 'test-target',
      diagnosticCode: 'G-PERM-01',
      fixSuggestions: [
        { direction: 'add', description: 'Add access policy' },
        { direction: 'modify', description: 'Update permissions' },
      ],
      toolFuzzyMatches: [],
    };
    const analysis = makeAnalysis([v]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    const finding = cc61.findings.find((f) => f.title.includes('G-PERM-01'))!;
    expect(finding.remediation).toBe('[add] Add access policy; [modify] Update permissions');
  });

  it('uses default remediation when fixSuggestions is empty', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01')]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;
    const finding = cc61.findings.find((f) => f.title.includes('G-PERM-01'))!;
    expect(finding.remediation).toBe('Review and remediate governance rule G-PERM-01');
  });
});

describe('SOC2 broken chain edge cases', () => {
  it('uses details field when error is absent', () => {
    const brokenResult: ChainVerifyResult = {
      valid: false,
      length: 3,
      genesisHash: 'hash-0',
      latestHash: 'hash-2',
      details: 'Chain integrity compromised at entry 1',
    };

    const evidence = buildSOC2Evidence(
      buildOptions({ chainVerifyResult: brokenResult }),
    );

    const chainFinding = evidence.findings.find((f) => f.id === 'SOC2-CHAIN-BROKEN-001')!;
    expect(chainFinding.description).toBe('Chain integrity compromised at entry 1');
  });

  it('uses fallback message when both error and details are absent', () => {
    const brokenResult: ChainVerifyResult = {
      valid: false,
      length: 1,
      genesisHash: 'hash-0',
      latestHash: 'hash-0',
    };

    const evidence = buildSOC2Evidence(
      buildOptions({ chainVerifyResult: brokenResult }),
    );

    const chainFinding = evidence.findings.find((f) => f.id === 'SOC2-CHAIN-BROKEN-001')!;
    expect(chainFinding.description).toBe('Audit chain verification failed');
  });
});

describe('SOC2 warning findings generation', () => {
  it('produces medium-severity findings from warnings', () => {
    const analysis = makeAnalysis([], [
      makeWarning('G-PERM-W01', 'G-PERM'),
      makeWarning('G-PERM-W02', 'G-PERM'),
    ]);
    const evidence = buildSOC2Evidence(buildOptions({ analysis }));
    const cc61 = evidence.controls.find((c) => c.controlId === 'CC6.1')!;

    expect(cc61.findings.length).toBe(2);
    for (const f of cc61.findings) {
      expect(f.severity).toBe('medium');
      expect(f.remediation).toContain('G-PERM');
    }
  });
});

describe('SOC2 overall pass status', () => {
  it('overall status is pass when all controls pass', () => {
    // Provide at least one event for every control's event types
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),           // CC6.1
      makeChainEntry(1, 'CREDENTIAL_CHECK'),     // CC6.2
      makeChainEntry(2, 'CLASSIFICATION'),       // CC6.3
      makeChainEntry(3, 'SUPPLY_CHAIN_CHECK'),   // CC6.6
      makeChainEntry(4, 'DATA_FLOW'),            // CC6.7
      makeChainEntry(5, 'INPUT_VALIDATION'),     // CC6.8
      makeChainEntry(6, 'CONTEXT_CHECK'),        // CC7.1
      makeChainEntry(7, 'BOUND_CHECK'),          // CC7.2
      makeChainEntry(8, 'A2A_DELEGATION'),       // CC8.1
    ];
    const evidence = buildSOC2Evidence(buildOptions({ chainEntries: entries }));

    expect(evidence.overallStatus).toBe('pass');
    for (const c of evidence.controls) {
      expect(c.status).toBe('pass');
    }
    expect(evidence.totalEvidenceCount).toBe(9);
  });
});

describe('SOC2 keyFingerprint option', () => {
  it('includes keyFingerprint when provided', () => {
    const evidence = buildSOC2Evidence(
      buildOptions({ keyFingerprint: 'SHA256:abc123def456' }),
    );
    expect(evidence.keyFingerprint).toBe('SHA256:abc123def456');
  });

  it('omits keyFingerprint when not provided', () => {
    const evidence = buildSOC2Evidence(buildOptions());
    expect(evidence.keyFingerprint).toBeUndefined();
  });
});

describe('SOC2 utility functions', () => {
  it('getSOC2ControlIds returns all 9 control IDs', () => {
    const ids = getSOC2ControlIds();
    expect(ids).toEqual([
      'CC6.1', 'CC6.2', 'CC6.3', 'CC6.6', 'CC6.7',
      'CC6.8', 'CC7.1', 'CC7.2', 'CC8.1',
    ]);
  });

  it('getSOC2ControlDef returns definition for valid ID', () => {
    const def = getSOC2ControlDef('CC7.2');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Anomaly Detection');
    expect(def!.ruleCategories).toContain('G-BOUND');
  });

  it('getSOC2ControlDef returns undefined for invalid ID', () => {
    const def = getSOC2ControlDef('INVALID-ID');
    expect(def).toBeUndefined();
  });
});

describe('SOC2 observation period edge cases', () => {
  it('returns true for exactly 180-day period', () => {
    // 180 days from 2025-01-01
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-07-01T00:00:00Z'; // ~181 days
    expect(validateObservationPeriod(start, end)).toBe(true);
  });

  it('returns false for 179-day period', () => {
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-06-29T00:00:00Z'; // ~179 days
    expect(validateObservationPeriod(start, end)).toBe(false);
  });
});
