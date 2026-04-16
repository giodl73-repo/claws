/**
 * L0: comply-eu-ai-act command — EU AI Act assessment wiring, JSON/text output, risk tiers, blocked paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockBuildEUAIActAssessment = vi.fn();

vi.mock('@bic/claws-sdk/compliance', () => ({
  buildEUAIActAssessment: (...args: unknown[]) => mockBuildEUAIActAssessment(...args),
}));

// ── FS mocks ────────────────────────────────────────────────────────────────

const mockReadFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { runComplyEUAIAct } from '../../src/commands/comply-eu-ai-act.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockBuildEUAIActAssessment.mockReset();
  mockReadFile.mockReset();
}

/** Minimal EU AI Act assessment (minimal risk, not blocked). */
function makeAssessment(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    scope: '/ws',
    riskTier: 'minimal',
    annexIIICategory: null,
    domainMarkers: [],
    article13: {
      documentationAdequate: true,
      explainabilityProvided: true,
      userNotificationPresent: true,
      status: 'pass',
      findings: [],
    },
    article14: {
      hitlControlsPresent: true,
      hitlAdequateForTier: true,
      overrideMechanismPresent: true,
      status: 'pass',
      findings: [],
    },
    fundamentalRightsImpact: {
      assessed: false,
      impactedRights: [],
      mitigations: [],
      findings: [],
    },
    obligationChecklist: [],
    findings: [],
    blocked: false,
    blockReason: '',
    ...overrides,
  };
}

/** claws.json config with EU AI Act fields. */
function makeConfig(euConfig: Record<string, unknown> = {}) {
  return JSON.stringify({ euAiAct: euConfig });
}

/** governance-ir.json with analysis block. */
function makeGovIr(analysis: Record<string, unknown> = {}) {
  return JSON.stringify({
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      ...analysis,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws comply eu-ai-act', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON for minimal risk with --json', async () => {
    // Both config reads fail → defaults
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyEUAIAct('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockBuildEUAIActAssessment).toHaveBeenCalledOnce();
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.riskTier).toBe('minimal');
      expect(output.blocked).toBe(false);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs human-readable text for minimal risk', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyEUAIAct('/ws', { json: false });
      expect(code).toBe(0);
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('EU AI Act Assessment Report'))).toBe(true);
      expect(lines.some((l) => l.includes('MINIMAL'))).toBe(true);
      expect(lines.some((l) => l.includes('Article 13'))).toBe(true);
      expect(lines.some((l) => l.includes('Article 14'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when assessment is blocked (unacceptable risk)', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      riskTier: 'unacceptable',
      blocked: true,
      blockReason: 'Social scoring system detected',
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyEUAIAct('/ws', { json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints block reason in text mode for blocked assessments', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      riskTier: 'unacceptable',
      blocked: true,
      blockReason: 'Social scoring system detected',
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('BLOCKED'))).toBe(true);
      expect(lines.some((l) => l.includes('Social scoring system detected'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads EU config from claws.json and passes to builder', async () => {
    const config = makeConfig({
      riskTier: 'high',
      domainMarkers: ['healthcare'],
      transparencyDeclared: true,
      documentationDeclared: true,
    });

    mockReadFile
      .mockResolvedValueOnce(config)                  // claws.json
      .mockRejectedValueOnce(new Error('ENOENT'));    // governance-ir.json

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({ riskTier: 'high' }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      expect(call.declaredRiskTier).toBe('high');
      expect(call.domainMarkers).toEqual(['healthcare']);
      expect(call.transparencyDeclared).toBe(true);
      expect(call.documentationDeclared).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads analysis from governance-ir.json when present', async () => {
    const govIr = makeGovIr({ violations: [{ id: 'V1' }] });

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))    // claws.json
      .mockResolvedValueOnce(govIr);                  // governance-ir.json

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      expect(call.analysis.violations).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('omits declaredRiskTier when not set in config', async () => {
    const config = makeConfig({});

    mockReadFile
      .mockResolvedValueOnce(config)
      .mockRejectedValueOnce(new Error('ENOENT'));

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      expect(call).not.toHaveProperty('declaredRiskTier');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints high-risk details in text mode: fundamental rights and obligations', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      riskTier: 'high',
      fundamentalRightsImpact: {
        assessed: true,
        impactedRights: ['right-to-privacy'],
        mitigations: ['data-minimization'],
        findings: [],
      },
      obligationChecklist: [
        { obligationId: 'OBL-1', description: 'Risk management', met: true, evidence: 'documented' },
        { obligationId: 'OBL-2', description: 'Data governance', met: false, evidence: 'missing' },
      ],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Fundamental Rights Impact: assessed'))).toBe(true);
      expect(lines.some((l) => l.includes('right-to-privacy'))).toBe(true);
      expect(lines.some((l) => l.includes('data-minimization'))).toBe(true);
      expect(lines.some((l) => l.includes('Obligation Checklist:'))).toBe(true);
      expect(lines.some((l) => l.includes('MET'))).toBe(true);
      expect(lines.some((l) => l.includes('NOT MET'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints Annex III category and domain markers in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      riskTier: 'high',
      annexIIICategory: 'critical-infrastructure',
      domainMarkers: ['healthcare', 'critical-infrastructure'],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Annex III category: critical-infrastructure'))).toBe(true);
      expect(lines.some((l) => l.includes('healthcare, critical-infrastructure'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders findings in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      findings: [{ id: 'EU-1', controlId: 'Art13', severity: 'medium', title: 'Docs incomplete', description: '', remediation: '' }],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('[MEDIUM]'))).toBe(true);
      expect(lines.some((l) => l.includes('Docs incomplete'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('accepts eu_ai_act key in config (alternative to euAiAct)', async () => {
    const config = JSON.stringify({
      eu_ai_act: {
        riskTier: 'limited',
        transparencyDeclared: true,
      },
    });

    mockReadFile
      .mockResolvedValueOnce(config)
      .mockRejectedValueOnce(new Error('ENOENT'));

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({ riskTier: 'limited' }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      expect(call.declaredRiskTier).toBe('limited');
      expect(call.transparencyDeclared).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('falls back to empty analysis when governance-ir has no analysis field', async () => {
    const govIr = JSON.stringify({ notAnalysis: true });

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))    // claws.json
      .mockResolvedValueOnce(govIr);                  // governance-ir.json — no analysis key

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      expect(call.analysis.violations).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('defaults config fields when euAiAct has no properties', async () => {
    // Config has neither euAiAct nor eu_ai_act → falls through to empty {}
    const config = JSON.stringify({ someOtherField: true });

    mockReadFile
      .mockResolvedValueOnce(config)
      .mockRejectedValueOnce(new Error('ENOENT'));

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      // No declaredRiskTier when not set
      expect(call).not.toHaveProperty('declaredRiskTier');
      expect(call.domainMarkers).toEqual([]);
      expect(call.transparencyDeclared).toBe(false);
      expect(call.impactedRights).toEqual([]);
      expect(call.mitigations).toEqual([]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes all boolean config fields to builder when set', async () => {
    const config = makeConfig({
      riskTier: 'high',
      domainMarkers: ['healthcare'],
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['right-to-privacy'],
      mitigations: ['data-minimization'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    });

    mockReadFile
      .mockResolvedValueOnce(config)
      .mockRejectedValueOnce(new Error('ENOENT'));

    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({ riskTier: 'high' }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: true });
      const call = mockBuildEUAIActAssessment.mock.calls[0][0];
      expect(call.explainabilityDeclared).toBe(true);
      expect(call.userNotificationDeclared).toBe(true);
      expect(call.humanOversightDeclared).toBe(true);
      expect(call.overrideMechanismDeclared).toBe(true);
      expect(call.fundamentalRightsAssessed).toBe(true);
      expect(call.riskManagementDeclared).toBe(true);
      expect(call.dataGovernanceDeclared).toBe(true);
      expect(call.loggingEnabled).toBe(true);
      expect(call.accuracyRobustnessDeclared).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('does not print annex/domain lines when absent', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      riskTier: 'minimal',
      annexIIICategory: null,
      domainMarkers: [],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.every((l) => !l.includes('Annex III'))).toBe(true);
      expect(lines.every((l) => !l.includes('Domain markers'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints NO for false article evaluation fields in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      article13: {
        documentationAdequate: false,
        explainabilityProvided: false,
        userNotificationPresent: false,
        status: 'fail',
        findings: [],
      },
      article14: {
        hitlControlsPresent: false,
        hitlAdequateForTier: false,
        overrideMechanismPresent: false,
        status: 'fail',
        findings: [],
      },
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Documentation: NO'))).toBe(true);
      expect(lines.some((l) => l.includes('Explainability: NO'))).toBe(true);
      expect(lines.some((l) => l.includes('User notification: NO'))).toBe(true);
      expect(lines.some((l) => l.includes('HITL controls: NO'))).toBe(true);
      expect(lines.some((l) => l.includes('Adequate for tier: NO'))).toBe(true);
      expect(lines.some((l) => l.includes('Override mechanism: NO'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('does not print obligation checklist for non-high-risk tiers', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockBuildEUAIActAssessment.mockReturnValue(makeAssessment({
      riskTier: 'limited',
      obligationChecklist: [
        { obligationId: 'OBL-1', description: 'Risk mgmt', met: true, evidence: 'done' },
      ],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyEUAIAct('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      // Limited risk doesn't trigger the obligation checklist section
      expect(lines.every((l) => !l.includes('Obligation Checklist'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });
});
