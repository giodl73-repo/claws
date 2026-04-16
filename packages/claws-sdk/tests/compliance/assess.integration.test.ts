/**
 * L1: EU AI Act assessment on healthcare fixture workspace.
 *
 * Integration test: exercises the full assessment pipeline with
 * a realistic healthcare domain configuration and governance analysis.
 */

import { describe, it, expect } from 'vitest';
import { buildEUAIActAssessment, type EUAIActConfig } from '../../src/compliance/eu-ai-act.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

/**
 * Build a healthcare workspace configuration with governance analysis.
 */
function makeHealthcareConfig(
  analysisOverrides: Partial<GovAnalysis> = {},
  configOverrides: Partial<EUAIActConfig> = {},
): EUAIActConfig {
  const analysis: GovAnalysis = {
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
    ...analysisOverrides,
  };

  return {
    scope: '/healthcare/clinic-agent',
    domainMarkers: ['healthcare'],
    analysis,
    transparencyDeclared: true,
    documentationDeclared: true,
    explainabilityDeclared: true,
    userNotificationDeclared: true,
    humanOversightDeclared: true,
    overrideMechanismDeclared: true,
    fundamentalRightsAssessed: true,
    impactedRights: ['right-to-health', 'data-protection', 'non-discrimination'],
    mitigations: ['data-minimization', 'bias-testing', 'access-control'],
    riskManagementDeclared: true,
    dataGovernanceDeclared: true,
    loggingEnabled: true,
    accuracyRobustnessDeclared: true,
    ...configOverrides,
  };
}

describe('EU AI Act assessment: healthcare fixture workspace', () => {
  it('healthcare domain triggers high-risk with essential-services category', () => {
    const config = makeHealthcareConfig();
    const assessment = buildEUAIActAssessment(config);

    expect(assessment.riskTier).toBe('high');
    expect(assessment.annexIIICategory).toBe('essential-services');
    expect(assessment.domainMarkers).toContain('healthcare');
    expect(assessment.blocked).toBe(false);
  });

  it('fully compliant healthcare workspace passes all evaluations', () => {
    const config = makeHealthcareConfig();
    const assessment = buildEUAIActAssessment(config);

    // Article 13 — all transparency checks present
    expect(assessment.article13.status).toBe('pass');
    expect(assessment.article13.documentationAdequate).toBe(true);
    expect(assessment.article13.explainabilityProvided).toBe(true);
    expect(assessment.article13.userNotificationPresent).toBe(true);
    expect(assessment.article13.findings.length).toBe(0);

    // Article 14 — HITL + override
    expect(assessment.article14.status).toBe('pass');
    expect(assessment.article14.hitlControlsPresent).toBe(true);
    expect(assessment.article14.hitlAdequateForTier).toBe(true);
    expect(assessment.article14.overrideMechanismPresent).toBe(true);
    expect(assessment.article14.findings.length).toBe(0);

    // Fundamental rights
    expect(assessment.fundamentalRightsImpact.assessed).toBe(true);
    expect(assessment.fundamentalRightsImpact.impactedRights.length).toBe(3);
    expect(assessment.fundamentalRightsImpact.mitigations.length).toBe(3);
    expect(assessment.fundamentalRightsImpact.findings.length).toBe(0);

    // Obligation checklist — all met
    expect(assessment.obligationChecklist.length).toBe(7);
    for (const obl of assessment.obligationChecklist) {
      expect(obl.met, `Obligation ${obl.obligationId} should be met`).toBe(true);
    }
  });

  it('healthcare workspace with governance violations produces findings', () => {
    const config = makeHealthcareConfig({
      violations: [
        {
          ruleId: 'G-PERM-01',
          level: 4,
          message: 'Unauthorized tool access',
          target: 'Bash',
          diagnosticCode: 'G-PERM-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
    });
    const assessment = buildEUAIActAssessment(config);

    expect(assessment.riskTier).toBe('high');
    expect(assessment.findings.some((f) => f.id === 'EU-GOV-001')).toBe(true);
    expect(assessment.findings.find((f) => f.id === 'EU-GOV-001')!.severity).toBe('high');
  });

  it('healthcare workspace without fundamental rights assessment produces finding', () => {
    const config = makeHealthcareConfig({}, {
      fundamentalRightsAssessed: false,
      impactedRights: [],
      mitigations: [],
    });
    const assessment = buildEUAIActAssessment(config);

    expect(assessment.fundamentalRightsImpact.assessed).toBe(false);
    expect(assessment.fundamentalRightsImpact.findings.some((f) => f.id === 'EU-FRIA-001')).toBe(true);
  });

  it('healthcare workspace without HITL produces critical Article 14 findings', () => {
    const config = makeHealthcareConfig({}, {
      humanOversightDeclared: false,
      overrideMechanismDeclared: false,
    });
    const assessment = buildEUAIActAssessment(config);

    expect(assessment.article14.status).toBe('fail');
    expect(assessment.article14.hitlAdequateForTier).toBe(false);
    expect(assessment.article14.findings.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('assessment output is JSON-serializable and round-trips', () => {
    const config = makeHealthcareConfig();
    const assessment = buildEUAIActAssessment(config);

    const json = JSON.stringify(assessment);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.riskTier).toBe('high');
    expect(parsed.article13.status).toBe('pass');
    expect(parsed.article14.status).toBe('pass');
    expect(parsed.obligationChecklist.length).toBe(7);
  });
});
