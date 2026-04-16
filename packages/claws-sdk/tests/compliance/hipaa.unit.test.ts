/**
 * L0: HIPAA evidence builder — safeguard mapping, PHI detection,
 * and transmission gap tests.
 *
 * 5 tests:
 * - 164.312(a)(1) Access Control mapping
 * - 164.312(b) Audit Controls mapping
 * - 164.312(c)(1) Integrity mapping
 * - PHI detection cross-references 18-identifier list
 * - Transmission gap detection for unencrypted external tools
 */

import { describe, it, expect } from 'vitest';
import {
  buildHIPAAEvidence,
  buildPHICoverage,
  detectTransmissionGaps,
  getHIPAASafeguardIds,
  getHIPAASafeguardDef,
  HIPAA_18_IDENTIFIERS,
} from '../../src/compliance/hipaa.js';
import type { HIPAABuilderOptions, DeclaredPHIType, ExternalTransmission, BreachNotificationConfig } from '../../src/compliance/hipaa.js';
import type { GovAnalysis, GovViolation, GovWarning } from '../../src/ir/gov-analysis.js';
import type { ChainEntry, ChainVerifyResult } from '../../src/audit/types.js';

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

function makeChainEntry(seq: number, eventType: string): ChainEntry {
  return {
    seq,
    timestamp: '2025-10-01T10:00:00Z',
    eventType,
    actor: 'agent-1',
    target: 'test-target',
    action: 'test',
    outcome: 'allow',
    ruleId: 'TEST-001',
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

function buildOptions(
  overrides: Partial<HIPAABuilderOptions> = {},
): HIPAABuilderOptions {
  return {
    scope: '/test/workspace',
    analysis: makeAnalysis(),
    chainEntries: [],
    chainVerifyResult: VALID_CHAIN_RESULT,
    declaredPHITypes: [],
    externalTransmissions: [],
    ...overrides,
  };
}

describe('HIPAA safeguard mapping: 164.312(a)(1) — Access Control', () => {
  it('maps G-PERM/G-CLASS violations and access events to 164.312(a)(1)', () => {
    const analysis = makeAnalysis([
      makeViolation('G-PERM-01'),
      makeViolation('G-CLASS-01'),
    ]);
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'PERMISSION_CHECK'),
      makeChainEntry(2, 'ACCESS_DENIED'),
      makeChainEntry(3, 'CLASSIFICATION'),
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.status).toBe('fail');
    expect(sg.evidenceCount).toBe(4);
    expect(sg.findings.length).toBeGreaterThanOrEqual(2);
    expect(sg.findings.some((f) => f.title.includes('G-PERM-01'))).toBe(true);
    expect(sg.findings.some((f) => f.title.includes('G-CLASS-01'))).toBe(true);
  });
});

describe('HIPAA safeguard mapping: 164.312(b) — Audit Controls', () => {
  it('maps G-CONTEXT/G-OUTPUT violations and monitoring events to 164.312(b)', () => {
    const analysis = makeAnalysis([makeViolation('G-CONTEXT-01')]);
    const entries = [
      makeChainEntry(0, 'CONTEXT_CHECK'),
      makeChainEntry(1, 'OUTPUT_VALIDATION'),
      makeChainEntry(2, 'MONITORING_EVENT'),
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(b)')!;
    expect(sg.status).toBe('fail');
    expect(sg.evidenceCount).toBe(3);
    expect(sg.findings.some((f) => f.title.includes('G-CONTEXT-01'))).toBe(true);
  });
});

describe('HIPAA safeguard mapping: 164.312(c)(1) — Integrity', () => {
  it('maps G-INPUT/G-SUPPLY violations and validation events to 164.312(c)(1)', () => {
    const analysis = makeAnalysis([makeViolation('G-INPUT-01')]);
    const entries = [
      makeChainEntry(0, 'INPUT_VALIDATION'),
      makeChainEntry(1, 'SCHEMA_CHECK'),
      makeChainEntry(2, 'SUPPLY_CHAIN_CHECK'),
      makeChainEntry(3, 'DEPENDENCY_SCAN'),
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(c)(1)')!;
    expect(sg.status).toBe('fail');
    expect(sg.evidenceCount).toBe(4);
    expect(sg.findings.some((f) => f.title.includes('G-INPUT-01'))).toBe(true);
  });
});

describe('HIPAA PHI detection: 18-identifier cross-reference', () => {
  it('cross-references declared pii_types against HIPAA 18-identifier list', () => {
    const declaredTypes: DeclaredPHIType[] = [
      { type: 'name', labels: ['phi', 'restricted'] },
      { type: 'ssn', labels: ['phi', 'restricted'] },
      { type: 'email_address', labels: [] }, // declared but no labels
      // 'phone_number' not declared
    ];

    const coverage = buildPHICoverage(declaredTypes);

    // All 18 identifiers should be in the coverage
    expect(coverage.length).toBe(18);

    // 'name' — declared and covered
    const nameCov = coverage.find((c) => c.phiType === 'name')!;
    expect(nameCov.declared).toBe(true);
    expect(nameCov.labelCovered).toBe(true);
    expect(nameCov.coveringLabels).toEqual(['phi', 'restricted']);

    // 'ssn' — declared and covered
    const ssnCov = coverage.find((c) => c.phiType === 'ssn')!;
    expect(ssnCov.declared).toBe(true);
    expect(ssnCov.labelCovered).toBe(true);

    // 'email_address' — declared but NOT label-covered
    const emailCov = coverage.find((c) => c.phiType === 'email_address')!;
    expect(emailCov.declared).toBe(true);
    expect(emailCov.labelCovered).toBe(false);
    expect(emailCov.coveringLabels).toEqual([]);

    // 'phone_number' — not declared
    const phoneCov = coverage.find((c) => c.phiType === 'phone_number')!;
    expect(phoneCov.declared).toBe(false);
    expect(phoneCov.labelCovered).toBe(false);

    // Building full evidence should produce a finding for 'email_address'
    const evidence = buildHIPAAEvidence(
      buildOptions({ declaredPHITypes: declaredTypes }),
    );
    const phiFindings = evidence.findings.filter((f) => f.id.startsWith('HIPAA-PHI-LABEL'));
    expect(phiFindings.length).toBe(1);
    expect(phiFindings[0]!.title).toContain('email_address');
    expect(phiFindings[0]!.severity).toBe('high');
  });
});

describe('HIPAA transmission gap detection: 164.312(e)(1)', () => {
  it('identifies tools sending data externally without encryption safeguards', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'SendReferral', destination: 'external-ehr.example.com', encrypted: true, integrityProtected: true },
      { toolName: 'SendEmail', destination: 'smtp.example.com', encrypted: false, integrityProtected: false },
      { toolName: 'UploadLab', destination: 'lab-partner.example.com', encrypted: true, integrityProtected: false },
    ];

    const gaps = detectTransmissionGaps(transmissions);

    // SendReferral is fine (both encrypted + integrity)
    // SendEmail has no encryption or integrity
    // UploadLab has encryption but no integrity
    expect(gaps.length).toBe(2);
    expect(gaps.some((g) => g.toolName === 'SendEmail')).toBe(true);
    expect(gaps.some((g) => g.toolName === 'UploadLab')).toBe(true);
    expect(gaps.some((g) => g.toolName === 'SendReferral')).toBe(false);

    const emailGap = gaps.find((g) => g.toolName === 'SendEmail')!;
    expect(emailGap.hasEncryption).toBe(false);
    expect(emailGap.hasIntegrity).toBe(false);
    expect(emailGap.destination).toBe('smtp.example.com');

    // Build full evidence — should produce high-severity findings
    const evidence = buildHIPAAEvidence(
      buildOptions({ externalTransmissions: transmissions }),
    );
    const xmitFindings = evidence.findings.filter((f) => f.id.startsWith('HIPAA-XMIT-GAP'));
    expect(xmitFindings.length).toBe(2);
    for (const f of xmitFindings) {
      expect(f.severity).toBe('high');
      expect(f.controlId).toBe('164.312(e)(1)');
    }
    expect(evidence.transmissionGaps.length).toBe(2);
    expect(evidence.overallStatus).toBe('fail');
  });
});

describe('HIPAA safeguard mapping: 164.312(d) — Person or Entity Authentication', () => {
  it('maps G-ELICIT/G-A2A violations and credential events to 164.312(d)', () => {
    const analysis = makeAnalysis([
      makeViolation('G-ELICIT-01'),
      makeViolation('G-A2A-01'),
    ]);
    const entries = [
      makeChainEntry(0, 'CREDENTIAL_CHECK'),
      makeChainEntry(1, 'ELICIT_REQUEST'),
      makeChainEntry(2, 'A2A_DELEGATION'),
      makeChainEntry(3, 'AGENT_SPAWN'),
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(d)')!;
    expect(sg.status).toBe('fail');
    expect(sg.evidenceCount).toBe(4);
    expect(sg.findings.some((f) => f.title.includes('G-ELICIT-01'))).toBe(true);
    expect(sg.findings.some((f) => f.title.includes('G-A2A-01'))).toBe(true);
  });
});

describe('HIPAA safeguard mapping: 164.312(e)(1) — Transmission Security', () => {
  it('maps G-DATA violations and DATA_FLOW events to 164.312(e)(1)', () => {
    const analysis = makeAnalysis([makeViolation('G-DATA-01')]);
    const entries = [
      makeChainEntry(0, 'DATA_FLOW'),
      makeChainEntry(1, 'DATA_LABEL'),
      makeChainEntry(2, 'SENSITIVITY_CHECK'),
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ analysis, chainEntries: entries }),
    );

    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(e)(1)')!;
    expect(sg.status).toBe('fail');
    expect(sg.evidenceCount).toBe(3);
    expect(sg.findings.some((f) => f.title.includes('G-DATA-01'))).toBe(true);
  });
});

describe('HIPAA broken audit chain', () => {
  it('elevates broken chain to critical finding across all safeguards', () => {
    const brokenResult: ChainVerifyResult = {
      valid: false,
      length: 5,
      genesisHash: 'hash-0',
      latestHash: 'hash-4',
      brokenAtSeq: 2,
      error: 'Entry at index 2 hash does not match recomputed HMAC-SHA256',
    };

    const evidence = buildHIPAAEvidence(
      buildOptions({ chainVerifyResult: brokenResult }),
    );

    // Top-level critical finding
    expect(evidence.findings.some((f) => f.id === 'HIPAA-CHAIN-BROKEN-001')).toBe(true);
    expect(evidence.findings.find((f) => f.id === 'HIPAA-CHAIN-BROKEN-001')!.severity).toBe('critical');

    // All 5 safeguards should be 'fail'
    expect(evidence.safeguards.length).toBe(5);
    for (const sg of evidence.safeguards) {
      expect(sg.status).toBe('fail');
      expect(sg.findings.some((f) => f.severity === 'critical')).toBe(true);
    }

    expect(evidence.overallStatus).toBe('fail');
  });

  it('uses details field when error is absent', () => {
    const brokenResult: ChainVerifyResult = {
      valid: false,
      length: 3,
      genesisHash: 'hash-0',
      latestHash: 'hash-2',
      details: 'Chain integrity compromised at entry 1',
    };

    const evidence = buildHIPAAEvidence(
      buildOptions({ chainVerifyResult: brokenResult }),
    );

    const chainFinding = evidence.findings.find((f) => f.id === 'HIPAA-CHAIN-BROKEN-001')!;
    expect(chainFinding.description).toBe('Chain integrity compromised at entry 1');
  });

  it('uses fallback message when both error and details are absent', () => {
    const brokenResult: ChainVerifyResult = {
      valid: false,
      length: 1,
      genesisHash: 'hash-0',
      latestHash: 'hash-0',
    };

    const evidence = buildHIPAAEvidence(
      buildOptions({ chainVerifyResult: brokenResult }),
    );

    const chainFinding = evidence.findings.find((f) => f.id === 'HIPAA-CHAIN-BROKEN-001')!;
    expect(chainFinding.description).toBe('Audit chain verification failed');
  });
});

describe('HIPAA breach notification assessment', () => {
  it('produces finding when procedures are not documented', () => {
    const bn: BreachNotificationConfig = {
      proceduresDocumented: false,
      notificationWindowHours: 1440,
      incidentContactDesignated: true,
    };
    const evidence = buildHIPAAEvidence(
      buildOptions({ breachNotification: bn }),
    );

    const f = evidence.findings.find((f) => f.id === 'HIPAA-BREACH-001');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('high');
    expect(f!.controlId).toBe('164.408');
  });

  it('produces finding when notification window exceeds 60 days', () => {
    const bn: BreachNotificationConfig = {
      proceduresDocumented: true,
      notificationWindowHours: 2000,
      incidentContactDesignated: true,
    };
    const evidence = buildHIPAAEvidence(
      buildOptions({ breachNotification: bn }),
    );

    const f = evidence.findings.find((f) => f.id === 'HIPAA-BREACH-002');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('high');
    expect(f!.description).toContain('2000');
  });

  it('produces finding when no incident contact is designated', () => {
    const bn: BreachNotificationConfig = {
      proceduresDocumented: true,
      notificationWindowHours: 720,
      incidentContactDesignated: false,
    };
    const evidence = buildHIPAAEvidence(
      buildOptions({ breachNotification: bn }),
    );

    const f = evidence.findings.find((f) => f.id === 'HIPAA-BREACH-003');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('medium');
  });

  it('produces no breach findings when all requirements are met', () => {
    const bn: BreachNotificationConfig = {
      proceduresDocumented: true,
      notificationWindowHours: 1440,
      incidentContactDesignated: true,
    };
    const evidence = buildHIPAAEvidence(
      buildOptions({ breachNotification: bn }),
    );

    expect(evidence.findings.filter((f) => f.id.startsWith('HIPAA-BREACH')).length).toBe(0);
  });

  it('produces all 3 breach findings when all requirements fail', () => {
    const bn: BreachNotificationConfig = {
      proceduresDocumented: false,
      notificationWindowHours: 2000,
      incidentContactDesignated: false,
    };
    const evidence = buildHIPAAEvidence(
      buildOptions({ breachNotification: bn }),
    );

    expect(evidence.findings.filter((f) => f.id.startsWith('HIPAA-BREACH')).length).toBe(3);
  });
});

describe('HIPAA governance uptime check', () => {
  it('produces high-severity finding when uptime < 95%', () => {
    const evidence = buildHIPAAEvidence(
      buildOptions({ governanceUptimePercent: 90.5 }),
    );

    const f = evidence.findings.find((f) => f.id === 'HIPAA-UPTIME-001');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('high');
    expect(f!.controlId).toBe('164.312(b)');
    expect(f!.title).toContain('90.5%');
  });

  it('produces medium-severity finding when uptime is 95-99%', () => {
    const evidence = buildHIPAAEvidence(
      buildOptions({ governanceUptimePercent: 97.0 }),
    );

    const f = evidence.findings.find((f) => f.id === 'HIPAA-UPTIME-001');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('medium');
    expect(f!.title).toContain('97.0%');
  });

  it('produces no uptime finding when uptime >= 99%', () => {
    const evidence = buildHIPAAEvidence(
      buildOptions({ governanceUptimePercent: 99.5 }),
    );

    expect(evidence.findings.find((f) => f.id === 'HIPAA-UPTIME-001')).toBeUndefined();
  });

  it('produces no uptime finding when uptime is not provided', () => {
    const evidence = buildHIPAAEvidence(buildOptions());

    expect(evidence.findings.find((f) => f.id === 'HIPAA-UPTIME-001')).toBeUndefined();
  });
});

describe('HIPAA violation severity mapping', () => {
  it('maps numeric level 5 to critical', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 5)]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('maps numeric level 4 to high', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 4)]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'high')).toBe(true);
  });

  it('maps numeric level 3 to medium', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 3)]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'medium')).toBe(true);
  });

  it('maps numeric level 1 to low', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01', 1)]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'low')).toBe(true);
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
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'high')).toBe(true);
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
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'medium')).toBe(true);
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
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.findings.some((f) => f.severity === 'low')).toBe(true);
  });
});

describe('HIPAA fixSuggestions in findings', () => {
  it('includes fixSuggestions in remediation when present', () => {
    const v: GovViolation = {
      ruleId: 'G-PERM-01',
      level: 3 as 1 | 2 | 3 | 4 | 5,
      message: 'Violation with fix',
      target: 'test-target',
      diagnosticCode: 'G-PERM-01',
      fixSuggestions: [
        { direction: 'add', description: 'Add RBAC policy' },
        { direction: 'modify', description: 'Update access list' },
      ],
      toolFuzzyMatches: [],
    };
    const analysis = makeAnalysis([v]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    const finding = sg.findings.find((f) => f.title.includes('G-PERM-01'))!;
    expect(finding.remediation).toBe('[add] Add RBAC policy; [modify] Update access list');
  });

  it('uses default remediation when fixSuggestions is empty', () => {
    const analysis = makeAnalysis([makeViolation('G-PERM-01')]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));
    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    const finding = sg.findings.find((f) => f.title.includes('G-PERM-01'))!;
    expect(finding.remediation).toBe('Review and remediate governance rule G-PERM-01');
  });
});

describe('HIPAA warnings-only safeguard status', () => {
  it('sets safeguard status to partial when only warnings are present', () => {
    const analysis = makeAnalysis([], [makeWarning('G-PERM-W01', 'G-PERM')]);
    const evidence = buildHIPAAEvidence(buildOptions({ analysis }));

    const sg = evidence.safeguards.find((s) => s.safeguardId === '164.312(a)(1)')!;
    expect(sg.status).toBe('partial');
    expect(sg.findings.length).toBe(1);
    expect(sg.findings[0]!.severity).toBe('medium');
    expect(sg.findings[0]!.remediation).toContain('G-PERM-W01');
  });
});

describe('HIPAA overall status logic', () => {
  it('overall status is pass when all safeguards pass', () => {
    // Provide evidence for every safeguard
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'CONTEXT_CHECK'),
      makeChainEntry(2, 'INPUT_VALIDATION'),
      makeChainEntry(3, 'CREDENTIAL_CHECK'),
      makeChainEntry(4, 'DATA_FLOW'),
    ];
    const evidence = buildHIPAAEvidence(buildOptions({ chainEntries: entries }));

    expect(evidence.overallStatus).toBe('pass');
    for (const sg of evidence.safeguards) {
      expect(sg.status).toBe('pass');
    }
  });

  it('overall status is partial when some safeguards have no evidence', () => {
    // Provide evidence for some but not all safeguards
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),
    ];
    const evidence = buildHIPAAEvidence(buildOptions({ chainEntries: entries }));

    expect(evidence.overallStatus).toBe('partial');
  });

  it('overall status is partial when PHI coverage gaps exist', () => {
    const declaredTypes: DeclaredPHIType[] = [
      { type: 'ssn', labels: [] }, // declared but no labels → gap
    ];
    // Provide evidence for every safeguard to get pass on safeguards
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),
      makeChainEntry(1, 'CONTEXT_CHECK'),
      makeChainEntry(2, 'INPUT_VALIDATION'),
      makeChainEntry(3, 'CREDENTIAL_CHECK'),
      makeChainEntry(4, 'DATA_FLOW'),
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ chainEntries: entries, declaredPHITypes: declaredTypes }),
    );

    expect(evidence.overallStatus).toBe('partial');
  });
});

describe('HIPAA evidence structure', () => {
  it('produces well-formed evidence with all 5 safeguards', () => {
    const evidence = buildHIPAAEvidence(buildOptions());

    expect(evidence.version).toBe('1.0.0');
    expect(evidence.scope).toBe('/test/workspace');
    expect(evidence.safeguards.length).toBe(5);
    expect(evidence.generatedAt).toBeDefined();

    const safeguardIds = evidence.safeguards.map((s) => s.safeguardId);
    expect(safeguardIds).toEqual([
      '164.312(a)(1)',
      '164.312(b)',
      '164.312(c)(1)',
      '164.312(d)',
      '164.312(e)(1)',
    ]);
  });

  it('computes totalEvidenceCount across all safeguards', () => {
    const entries = [
      makeChainEntry(0, 'TOOL_CALL'),          // 164.312(a)(1)
      makeChainEntry(1, 'PERMISSION_CHECK'),    // 164.312(a)(1)
      makeChainEntry(2, 'CONTEXT_CHECK'),       // 164.312(b)
      makeChainEntry(3, 'INPUT_VALIDATION'),    // 164.312(c)(1)
    ];
    const evidence = buildHIPAAEvidence(buildOptions({ chainEntries: entries }));

    expect(evidence.totalEvidenceCount).toBe(4);
  });
});

describe('HIPAA utility functions', () => {
  it('getHIPAASafeguardIds returns all 5 safeguard IDs', () => {
    const ids = getHIPAASafeguardIds();
    expect(ids).toEqual([
      '164.312(a)(1)',
      '164.312(b)',
      '164.312(c)(1)',
      '164.312(d)',
      '164.312(e)(1)',
    ]);
  });

  it('getHIPAASafeguardDef returns definition for valid ID', () => {
    const def = getHIPAASafeguardDef('164.312(d)');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Person or Entity Authentication');
    expect(def!.ruleCategories).toContain('G-ELICIT');
    expect(def!.ruleCategories).toContain('G-A2A');
  });

  it('getHIPAASafeguardDef returns undefined for invalid ID', () => {
    const def = getHIPAASafeguardDef('INVALID-ID');
    expect(def).toBeUndefined();
  });

  it('HIPAA_18_IDENTIFIERS has exactly 18 entries', () => {
    expect(HIPAA_18_IDENTIFIERS.length).toBe(18);
  });
});

describe('HIPAA transmission gap edge cases', () => {
  it('detectTransmissionGaps returns empty for fully protected transmissions', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'SecureSend', destination: 'partner.example.com', encrypted: true, integrityProtected: true },
    ];
    const gaps = detectTransmissionGaps(transmissions);
    expect(gaps.length).toBe(0);
  });

  it('detectTransmissionGaps returns empty for no transmissions', () => {
    const gaps = detectTransmissionGaps([]);
    expect(gaps.length).toBe(0);
  });

  it('detects gap when only integrity is missing', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'PartialSend', destination: 'api.example.com', encrypted: true, integrityProtected: false },
    ];
    const gaps = detectTransmissionGaps(transmissions);
    expect(gaps.length).toBe(1);
    expect(gaps[0]!.hasEncryption).toBe(true);
    expect(gaps[0]!.hasIntegrity).toBe(false);
  });

  it('detects gap when only encryption is missing', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'IntegritySend', destination: 'api.example.com', encrypted: false, integrityProtected: true },
    ];
    const gaps = detectTransmissionGaps(transmissions);
    expect(gaps.length).toBe(1);
    expect(gaps[0]!.hasEncryption).toBe(false);
    expect(gaps[0]!.hasIntegrity).toBe(true);
  });

  it('builds correct finding description when only encryption is missing', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'IntegritySend', destination: 'api.example.com', encrypted: false, integrityProtected: true },
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ externalTransmissions: transmissions }),
    );
    const f = evidence.findings.find((f) => f.id === 'HIPAA-XMIT-GAP-001')!;
    expect(f.description).toContain('encryption');
    expect(f.description).not.toContain(' or ');
  });

  it('builds correct finding description when only integrity is missing', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'EncryptedSend', destination: 'api.example.com', encrypted: true, integrityProtected: false },
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ externalTransmissions: transmissions }),
    );
    const f = evidence.findings.find((f) => f.id === 'HIPAA-XMIT-GAP-001')!;
    expect(f.description).toContain('integrity');
    expect(f.description).not.toContain(' or ');
  });

  it('builds correct finding description when both encryption and integrity are missing', () => {
    const transmissions: ExternalTransmission[] = [
      { toolName: 'UnsafeSend', destination: 'api.example.com', encrypted: false, integrityProtected: false },
    ];
    const evidence = buildHIPAAEvidence(
      buildOptions({ externalTransmissions: transmissions }),
    );
    const f = evidence.findings.find((f) => f.id === 'HIPAA-XMIT-GAP-001')!;
    expect(f.description).toContain('encryption');
    expect(f.description).toContain(' or ');
    expect(f.description).toContain('integrity');
  });
});
