/**
 * L3: EU AI Act assessment API — SDK acceptance test.
 *
 * Consumer perspective: imports from barrel, validates the public API
 * contract without knowledge of internals.
 */

import { describe, it, expect } from 'vitest';
import {
  buildEUAIActAssessment,
  classifyRiskTier,
  evaluateArticle13,
  evaluateArticle14,
  getValidDomainMarkers,
  getAnnexIIICategory,
} from '../../src/compliance/index.js';
import type {
  EUAIActAssessment,
  EURiskTier,
  AnnexIIICategory,
  DomainMarker,
  Article13Evaluation,
  Article14Evaluation,
  FundamentalRightsImpact,
  ObligationChecklistEntry,
  ComplianceFinding,
  ControlStatus,
} from '../../src/compliance/index.js';
import type { EUAIActConfig } from '../../src/compliance/index.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

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

describe('EU AI Act SDK acceptance: consumer API surface', () => {
  it('buildEUAIActAssessment produces valid EUAIActAssessment from consumer perspective', () => {
    const config: EUAIActConfig = {
      scope: '/consumer/workspace',
      domainMarkers: ['healthcare'],
      analysis: cleanAnalysis,
      transparencyDeclared: true,
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
    };

    const assessment: EUAIActAssessment = buildEUAIActAssessment(config);

    // Type assertions — compile-time checks that types resolve
    const version: string = assessment.version;
    const generatedAt: string = assessment.generatedAt;
    const scope: string = assessment.scope;
    const riskTier: EURiskTier = assessment.riskTier;
    const annexIIICategory: AnnexIIICategory | null = assessment.annexIIICategory;
    const domainMarkers: readonly DomainMarker[] = assessment.domainMarkers;
    const article13: Article13Evaluation = assessment.article13;
    const article14: Article14Evaluation = assessment.article14;
    const fundamentalRights: FundamentalRightsImpact = assessment.fundamentalRightsImpact;
    const obligations: readonly ObligationChecklistEntry[] = assessment.obligationChecklist;
    const findings: readonly ComplianceFinding[] = assessment.findings;
    const blocked: boolean = assessment.blocked;

    expect(version).toBe('1.0.0');
    expect(generatedAt).toBeTruthy();
    expect(scope).toBe('/consumer/workspace');
    expect(riskTier).toBe('high');
    expect(annexIIICategory).toBe('essential-services');
    expect(domainMarkers).toContain('healthcare');
    expect(article13.status).toBe('pass');
    expect(article14.status).toBe('pass');
    expect(fundamentalRights.assessed).toBe(true);
    expect(obligations.length).toBe(7);
    expect(blocked).toBe(false);

    // Obligation checklist entries have correct shape
    for (const obl of obligations) {
      expect(obl.obligationId).toMatch(/^EU-OBL-\d{2}$/);
      expect(obl.description.length).toBeGreaterThan(0);
      expect(typeof obl.met).toBe('boolean');
      expect(obl.evidence.length).toBeGreaterThan(0);
    }
  });

  it('barrel exports resolve: all EU AI Act types and functions', () => {
    // These are compile-time checks. If the barrel is broken, vitest won't run.
    const markers = getValidDomainMarkers();
    expect(markers.length).toBe(8);

    const category = getAnnexIIICategory('healthcare');
    expect(category).toBe('essential-services');

    const result = classifyRiskTier({
      scope: '/test',
      domainMarkers: ['law-enforcement'],
      analysis: cleanAnalysis,
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
    });
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('law-enforcement');
  });

  it('evaluateArticle13 and evaluateArticle14 accessible from barrel', () => {
    const config: EUAIActConfig = {
      scope: '/test',
      domainMarkers: [],
      analysis: cleanAnalysis,
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: false,
      impactedRights: [],
      mitigations: [],
      riskManagementDeclared: false,
      dataGovernanceDeclared: false,
      loggingEnabled: false,
      accuracyRobustnessDeclared: false,
    };

    const art13 = evaluateArticle13(config, 'high');
    expect(art13.status).toBe('pass');

    const art14 = evaluateArticle14(config, 'high');
    expect(art14.status).toBe('pass');
  });

  it('risk tier classification produces one of the four valid tiers', () => {
    const validTiers: EURiskTier[] = ['minimal', 'limited', 'high', 'unacceptable'];
    for (const declaredTier of validTiers) {
      const config: EUAIActConfig = {
        scope: '/test',
        declaredRiskTier: declaredTier,
        domainMarkers: [],
        analysis: cleanAnalysis,
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
      };
      const assessment = buildEUAIActAssessment(config);
      expect(validTiers).toContain(assessment.riskTier);
    }
  });
});
