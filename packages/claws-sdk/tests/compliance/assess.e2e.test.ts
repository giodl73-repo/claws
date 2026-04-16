/**
 * L2: EU AI Act end-to-end — full assessment on fixture workspace
 * with domain markers, governance analysis, and complete evaluation.
 *
 * Exercises the full path: classify risk tier, evaluate articles 13/14,
 * assess fundamental rights, build obligation checklist, validate output.
 */

import { describe, it, expect } from 'vitest';
import {
  buildEUAIActAssessment,
  classifyRiskTier,
  evaluateArticle13,
  evaluateArticle14,
  getValidDomainMarkers,
  getAnnexIIICategory,
  type EUAIActConfig,
} from '../../src/compliance/eu-ai-act.js';
import type { EUAIActAssessment, EURiskTier, DomainMarker } from '../../src/compliance/types.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

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

function makeConfig(overrides: Partial<EUAIActConfig> = {}): EUAIActConfig {
  return {
    scope: '/e2e/workspace',
    domainMarkers: [],
    analysis: makeCleanAnalysis(),
    transparencyDeclared: false,
    documentationDeclared: false,
    explainabilityDeclared: false,
    userNotificationDeclared: false,
    humanOversightDeclared: false,
    overrideMechanismDeclared: false,
    fundamentalRightsAssessed: false,
    impactedRights: [],
    mitigations: [],
    riskManagementDeclared: false,
    dataGovernanceDeclared: false,
    loggingEnabled: false,
    accuracyRobustnessDeclared: false,
    ...overrides,
  };
}

describe('EU AI Act e2e: full assessment on workspace with domain markers', () => {
  it('complete assessment across all risk tiers', () => {
    const tiers: EURiskTier[] = ['minimal', 'limited', 'high', 'unacceptable'];
    for (const tier of tiers) {
      const config = makeConfig({ declaredRiskTier: tier });
      const assessment = buildEUAIActAssessment(config);

      expect(assessment.version).toBe('1.0.0');
      expect(assessment.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(assessment.scope).toBe('/e2e/workspace');
      expect(assessment.riskTier).toBe(tier);

      if (tier === 'unacceptable') {
        expect(assessment.blocked).toBe(true);
        expect(assessment.blockReason).toContain('unacceptable');
      } else {
        expect(assessment.blocked).toBe(false);
      }
    }
  });

  it('all domain markers produce valid classifications', () => {
    const markers = getValidDomainMarkers();
    expect(markers.length).toBe(8);

    for (const marker of markers) {
      const config = makeConfig({ domainMarkers: [marker] });
      const { tier, annexIIICategory } = classifyRiskTier(config);
      expect(tier).toBe('high');
      expect(annexIIICategory).toBeTruthy();

      // Also verify getAnnexIIICategory helper
      const category = getAnnexIIICategory(marker);
      expect(category).toBe(annexIIICategory);
    }
  });

  it('multi-domain marker workspace with mixed compliance', () => {
    const config = makeConfig({
      domainMarkers: ['healthcare', 'law-enforcement'],
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: false, // missing override
      fundamentalRightsAssessed: true,
      impactedRights: ['privacy', 'non-discrimination'],
      mitigations: ['data-minimization'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: false, // missing
    });

    const assessment = buildEUAIActAssessment(config);

    // High-risk from domain markers
    expect(assessment.riskTier).toBe('high');
    expect(assessment.domainMarkers).toEqual(['healthcare', 'law-enforcement']);

    // Article 13 should pass (all transparency declared)
    expect(assessment.article13.status).toBe('pass');

    // Article 14 partial (HITL present, override missing)
    expect(assessment.article14.status).toBe('partial');
    expect(assessment.article14.hitlControlsPresent).toBe(true);
    expect(assessment.article14.overrideMechanismPresent).toBe(false);

    // Some obligations unmet
    const unmet = assessment.obligationChecklist.filter((o) => !o.met);
    expect(unmet.length).toBeGreaterThan(0);

    // Unmet obligations finding present
    expect(assessment.findings.some((f) => f.id === 'EU-OBL-UNMET-001')).toBe(true);
  });

  it('law-enforcement high-risk with full governance violations', () => {
    const analysisWithViolations: GovAnalysis = {
      ...makeCleanAnalysis(),
      violations: [
        {
          ruleId: 'G-PERM-01',
          level: 5,
          message: 'Unauthorized access to facial recognition tool',
          target: 'FacialRecognition',
          diagnosticCode: 'G-PERM-01',
          fixSuggestions: [
            { direction: 'tighten', description: 'Deny FacialRecognition', target: 'G-PERM' },
          ],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'G-DATA-01',
          level: 4,
          message: 'Biometric data flow without label',
          target: 'biometric-pipeline',
          diagnosticCode: 'G-DATA-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        {
          ruleId: 'G-CONTEXT-W01',
          level: 2,
          message: 'Context window not bounded',
          subRuleDiagnosticCode: 'G-CONTEXT-W01',
          category: 'G-CONTEXT',
          subRuleIndex: 1,
        },
      ],
    };

    const config = makeConfig({
      domainMarkers: ['law-enforcement'],
      analysis: analysisWithViolations,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
    });

    const assessment = buildEUAIActAssessment(config);

    expect(assessment.riskTier).toBe('high');
    expect(assessment.annexIIICategory).toBe('law-enforcement');
    expect(assessment.blocked).toBe(false);

    // Governance violation finding
    expect(assessment.findings.some((f) => f.id === 'EU-GOV-001')).toBe(true);
    const govFinding = assessment.findings.find((f) => f.id === 'EU-GOV-001')!;
    expect(govFinding.severity).toBe('high');
    expect(govFinding.description).toContain('Governance violation');

    // Articles still evaluated
    expect(assessment.article13.status).toBe('pass');
    expect(assessment.article14.status).toBe('pass');

    // Fundamental rights not assessed → finding
    expect(assessment.fundamentalRightsImpact.assessed).toBe(false);
    expect(assessment.fundamentalRightsImpact.findings.some((f) => f.id === 'EU-FRIA-001')).toBe(true);
  });

  it('JSON round-trip preserves all assessment structure', () => {
    const config = makeConfig({
      domainMarkers: ['healthcare'],
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
    const assessment: EUAIActAssessment = buildEUAIActAssessment(config);

    const json = JSON.stringify(assessment);
    const parsed = JSON.parse(json) as EUAIActAssessment;

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.riskTier).toBe('high');
    expect(parsed.annexIIICategory).toBe('essential-services');
    expect(parsed.article13.status).toBe('pass');
    expect(parsed.article14.status).toBe('pass');
    expect(parsed.fundamentalRightsImpact.assessed).toBe(true);
    expect(parsed.obligationChecklist.length).toBe(7);
    expect(parsed.blocked).toBe(false);
  });
});
