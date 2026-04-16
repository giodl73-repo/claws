/**
 * L0: EU AI Act assessment engine — Article 6 classification, Article 14
 * human oversight, and domain marker elevation tests.
 */

import { describe, it, expect } from 'vitest';
import {
  buildAnnexIIIObligations,
  buildEUAIActAssessment,
  classifyRiskTier,
  evaluateArticle13,
  evaluateArticle14,
  getAnnexIIICategory,
  getValidDomainMarkers,
  type EUAIActConfig,
} from '../../src/compliance/eu-ai-act.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';

/**
 * Build a minimal clean GovAnalysis.
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

/**
 * Build a minimal EUAIActConfig with given overrides.
 */
function makeConfig(overrides: Partial<EUAIActConfig> = {}): EUAIActConfig {
  return {
    scope: '/test/workspace',
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

describe('Article 6 / Annex III classification from explicit config', () => {
  it('classifies as minimal when no risk tier or domain markers declared', () => {
    const config = makeConfig();
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('minimal');
    expect(result.annexIIICategory).toBeNull();
  });

  it('classifies as limited when explicitly declared', () => {
    const config = makeConfig({ declaredRiskTier: 'limited' });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('limited');
    expect(result.annexIIICategory).toBeNull();
  });

  it('classifies as high when explicitly declared', () => {
    const config = makeConfig({ declaredRiskTier: 'high' });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBeNull();
  });

  it('classifies as unacceptable when explicitly declared', () => {
    const config = makeConfig({ declaredRiskTier: 'unacceptable' });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('unacceptable');
    expect(result.annexIIICategory).toBeNull();
  });

  it('unacceptable blocks evidence generation with clear explanation', () => {
    const config = makeConfig({ declaredRiskTier: 'unacceptable' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.blocked).toBe(true);
    expect(assessment.blockReason).toContain('unacceptable');
    expect(assessment.riskTier).toBe('unacceptable');
    expect(assessment.findings.some((f) => f.id === 'EU-UNACCEPTABLE-001')).toBe(true);
    expect(assessment.findings[0]!.severity).toBe('critical');
  });

  it('assessment JSON includes risk tier, article evaluations, and obligation checklist', () => {
    const config = makeConfig({
      declaredRiskTier: 'high',
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['privacy'],
      mitigations: ['data minimization'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    });
    const assessment = buildEUAIActAssessment(config);

    expect(assessment.riskTier).toBe('high');
    expect(assessment.article13).toBeDefined();
    expect(assessment.article14).toBeDefined();
    expect(assessment.obligationChecklist.length).toBeGreaterThan(0);
    expect(assessment.fundamentalRightsImpact.assessed).toBe(true);
    expect(assessment.blocked).toBe(false);
  });
});

describe('Article 14 human oversight assessment', () => {
  it('passes for minimal risk even without HITL controls', () => {
    const config = makeConfig();
    const result = evaluateArticle14(config, 'minimal');
    expect(result.status).toBe('pass');
    expect(result.hitlAdequateForTier).toBe(true);
    expect(result.findings.length).toBe(0);
  });

  it('fails for high-risk without any oversight controls', () => {
    const config = makeConfig();
    const result = evaluateArticle14(config, 'high');
    expect(result.status).toBe('fail');
    expect(result.hitlAdequateForTier).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('partial for high-risk with HITL but no override mechanism', () => {
    const config = makeConfig({ humanOversightDeclared: true });
    const result = evaluateArticle14(config, 'high');
    expect(result.status).toBe('partial');
    expect(result.hitlControlsPresent).toBe(true);
    expect(result.overrideMechanismPresent).toBe(false);
    expect(result.hitlAdequateForTier).toBe(false);
  });

  it('passes for high-risk with both HITL and override mechanism', () => {
    const config = makeConfig({
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
    });
    const result = evaluateArticle14(config, 'high');
    expect(result.status).toBe('pass');
    expect(result.hitlAdequateForTier).toBe(true);
    expect(result.findings.length).toBe(0);
  });

  it('passes for limited risk with HITL controls only', () => {
    const config = makeConfig({ humanOversightDeclared: true });
    const result = evaluateArticle14(config, 'limited');
    expect(result.status).toBe('pass');
    expect(result.hitlAdequateForTier).toBe(true);
  });
});

describe('domain marker triggers high-risk classification', () => {
  it('healthcare marker triggers high-risk with essential-services Annex III', () => {
    const config = makeConfig({ domainMarkers: ['healthcare'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('essential-services');
  });

  it('law-enforcement marker triggers high-risk with law-enforcement Annex III', () => {
    const config = makeConfig({ domainMarkers: ['law-enforcement'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('law-enforcement');
  });

  it('critical-infrastructure marker triggers high-risk', () => {
    const config = makeConfig({ domainMarkers: ['critical-infrastructure'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('critical-infrastructure');
  });

  it('education marker triggers high-risk with education-vocational Annex III', () => {
    const config = makeConfig({ domainMarkers: ['education'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('education-vocational');
  });

  it('judiciary marker triggers high-risk with justice-democratic Annex III', () => {
    const config = makeConfig({ domainMarkers: ['judiciary'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('justice-democratic');
  });

  it('domain markers override explicit minimal/limited to high', () => {
    const config = makeConfig({
      declaredRiskTier: 'minimal',
      domainMarkers: ['healthcare'],
    });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('essential-services');
  });

  it('full assessment with healthcare domain produces domain finding', () => {
    const config = makeConfig({
      domainMarkers: ['healthcare'],
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.riskTier).toBe('high');
    expect(assessment.annexIIICategory).toBe('essential-services');
    expect(assessment.findings.some((f) => f.id === 'EU-DOMAIN-001')).toBe(true);
    expect(assessment.fundamentalRightsImpact.findings.length).toBeGreaterThan(0);
  });

  it('employment marker triggers high-risk with employment-workers Annex III', () => {
    const config = makeConfig({ domainMarkers: ['employment'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('employment-workers');
  });

  it('financial-services marker triggers high-risk with essential-services Annex III', () => {
    const config = makeConfig({ domainMarkers: ['financial-services'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('essential-services');
  });

  it('migration marker triggers high-risk with migration-asylum Annex III', () => {
    const config = makeConfig({ domainMarkers: ['migration'] });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('high');
    expect(result.annexIIICategory).toBe('migration-asylum');
  });

  it('unacceptable risk overrides domain markers', () => {
    const config = makeConfig({
      declaredRiskTier: 'unacceptable',
      domainMarkers: ['healthcare'],
    });
    const result = classifyRiskTier(config);
    expect(result.tier).toBe('unacceptable');
    expect(result.annexIIICategory).toBeNull();
  });
});

describe('Article 13 transparency evaluation', () => {
  it('passes when all transparency provisions are declared', () => {
    const config = makeConfig({
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
    });
    const result = evaluateArticle13(config, 'high');
    expect(result.status).toBe('pass');
    expect(result.documentationAdequate).toBe(true);
    expect(result.explainabilityProvided).toBe(true);
    expect(result.userNotificationPresent).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('fails when no transparency provisions are declared', () => {
    const config = makeConfig();
    const result = evaluateArticle13(config, 'high');
    expect(result.status).toBe('fail');
    expect(result.findings).toHaveLength(3);
    // All findings should be high severity for high-risk
    expect(result.findings.every((f) => f.severity === 'high')).toBe(true);
  });

  it('partial when some provisions are declared', () => {
    const config = makeConfig({ documentationDeclared: true });
    const result = evaluateArticle13(config, 'high');
    expect(result.status).toBe('partial');
    expect(result.documentationAdequate).toBe(true);
    expect(result.explainabilityProvided).toBe(false);
    expect(result.userNotificationPresent).toBe(false);
    expect(result.findings).toHaveLength(2);
  });

  it('uses medium severity for non-high-risk findings', () => {
    const config = makeConfig();
    const result = evaluateArticle13(config, 'minimal');
    expect(result.status).toBe('fail');
    expect(result.findings.every((f) => f.severity === 'medium')).toBe(true);
  });

  it('missing only explainability produces partial with one finding', () => {
    const config = makeConfig({
      documentationDeclared: true,
      userNotificationDeclared: true,
    });
    const result = evaluateArticle13(config, 'limited');
    expect(result.status).toBe('partial');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.title).toContain('explainability');
  });

  it('missing only user notification produces partial with one finding', () => {
    const config = makeConfig({
      documentationDeclared: true,
      explainabilityDeclared: true,
    });
    const result = evaluateArticle13(config, 'limited');
    expect(result.status).toBe('partial');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.title).toContain('user notification');
  });

  it('findings have sequential IDs', () => {
    const config = makeConfig();
    const result = evaluateArticle13(config, 'high');
    expect(result.findings[0]!.id).toBe('EU-ART13-001');
    expect(result.findings[1]!.id).toBe('EU-ART13-002');
    expect(result.findings[2]!.id).toBe('EU-ART13-003');
  });
});

describe('Article 14 additional branches', () => {
  it('fails for limited risk without HITL controls', () => {
    const config = makeConfig();
    const result = evaluateArticle14(config, 'limited');
    expect(result.status).toBe('fail');
    expect(result.hitlAdequateForTier).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('passes for unacceptable risk without HITL (no requirement)', () => {
    // unacceptable tier has no HITL requirement in the code path
    const config = makeConfig();
    const result = evaluateArticle14(config, 'unacceptable');
    // hitlAdequateForTier: not minimal, not limited, not high → false
    expect(result.hitlAdequateForTier).toBe(false);
    // But no findings emitted for unacceptable (neither high nor limited)
    expect(result.findings).toHaveLength(0);
    // status: hitlAdequateForTier is false, no controls present → fail
    expect(result.status).toBe('fail');
  });

  it('high-risk with override only but no HITL is partial', () => {
    const config = makeConfig({ overrideMechanismDeclared: true });
    const result = evaluateArticle14(config, 'high');
    expect(result.status).toBe('partial');
    expect(result.hitlControlsPresent).toBe(false);
    expect(result.overrideMechanismPresent).toBe(true);
    // Two findings: missing HITL + missing override is already covered by override=true
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
  });

  it('high-risk findings have sequential IDs', () => {
    const config = makeConfig();
    const result = evaluateArticle14(config, 'high');
    expect(result.findings[0]!.id).toBe('EU-ART14-001');
    expect(result.findings[1]!.id).toBe('EU-ART14-002');
  });
});

describe('fundamental rights impact assessment (via buildEUAIActAssessment)', () => {
  it('not assessed for non-high-risk', () => {
    const config = makeConfig({ declaredRiskTier: 'minimal' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.fundamentalRightsImpact.assessed).toBe(false);
    expect(assessment.fundamentalRightsImpact.findings).toHaveLength(0);
  });

  it('finding when high-risk and not assessed', () => {
    const config = makeConfig({ declaredRiskTier: 'high' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.fundamentalRightsImpact.findings.some(
      (f) => f.id === 'EU-FRIA-001',
    )).toBe(true);
  });

  it('finding when assessed with impacted rights but no mitigations', () => {
    const config = makeConfig({
      declaredRiskTier: 'high',
      fundamentalRightsAssessed: true,
      impactedRights: ['privacy', 'non-discrimination'],
      mitigations: [],
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.fundamentalRightsImpact.findings.some(
      (f) => f.id === 'EU-FRIA-002',
    )).toBe(true);
    expect(assessment.fundamentalRightsImpact.findings.some(
      (f) => f.description.includes('2 fundamental rights'),
    )).toBe(true);
  });

  it('no finding when assessed with rights and mitigations', () => {
    const config = makeConfig({
      declaredRiskTier: 'high',
      fundamentalRightsAssessed: true,
      impactedRights: ['privacy'],
      mitigations: ['data minimization'],
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.fundamentalRightsImpact.assessed).toBe(true);
    expect(assessment.fundamentalRightsImpact.findings).toHaveLength(0);
  });

  it('no finding when assessed with no impacted rights', () => {
    const config = makeConfig({
      declaredRiskTier: 'high',
      fundamentalRightsAssessed: true,
      impactedRights: [],
      mitigations: [],
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.fundamentalRightsImpact.assessed).toBe(true);
    expect(assessment.fundamentalRightsImpact.findings).toHaveLength(0);
  });
});

describe('obligation checklist (via buildEUAIActAssessment)', () => {
  it('empty for non-high-risk', () => {
    const config = makeConfig({ declaredRiskTier: 'limited' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.obligationChecklist).toHaveLength(0);
  });

  it('returns 7 obligations for high-risk', () => {
    const config = makeConfig({ declaredRiskTier: 'high' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.obligationChecklist).toHaveLength(7);
    expect(assessment.obligationChecklist[0]!.obligationId).toBe('EU-OBL-01');
  });

  it('all obligations met when all flags declared', () => {
    const config = makeConfig({
      declaredRiskTier: 'high',
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      documentationDeclared: true,
      loggingEnabled: true,
      transparencyDeclared: true,
      humanOversightDeclared: true,
      accuracyRobustnessDeclared: true,
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.obligationChecklist.every((o) => o.met)).toBe(true);
  });

  it('EU-OBL-01 met when no violations and risk management not declared', () => {
    // check: violations.length === 0 || riskManagementDeclared
    const config = makeConfig({ declaredRiskTier: 'high' });
    const assessment = buildEUAIActAssessment(config);
    // No violations → OBL-01 is met even without riskManagementDeclared
    const obl01 = assessment.obligationChecklist.find((o) => o.obligationId === 'EU-OBL-01');
    expect(obl01!.met).toBe(true);
  });

  it('EU-OBL-01 not met when violations present and risk management not declared', () => {
    const config = makeConfig({
      declaredRiskTier: 'high',
      analysis: {
        ...makeCleanAnalysis(),
        violations: [{ ruleId: 'R-001', level: 3 as const, message: 'test', target: 't', diagnosticCode: 'D-001', fixSuggestions: [], toolFuzzyMatches: [] }],
      },
    });
    const assessment = buildEUAIActAssessment(config);
    const obl01 = assessment.obligationChecklist.find((o) => o.obligationId === 'EU-OBL-01');
    expect(obl01!.met).toBe(false);
  });

  it('unmet obligations produce top-level finding', () => {
    const config = makeConfig({ declaredRiskTier: 'high' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.findings.some((f) => f.id === 'EU-OBL-UNMET-001')).toBe(true);
  });
});

describe('governance violations in assessment', () => {
  it('produces governance finding for high-risk with violations', () => {
    const config = makeConfig({
      domainMarkers: ['healthcare'],
      analysis: {
        ...makeCleanAnalysis(),
        violations: [{ ruleId: 'R-001', level: 3 as const, message: 'test', target: 't', diagnosticCode: 'D-001', fixSuggestions: [], toolFuzzyMatches: [] }],
      },
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.findings.some((f) => f.id === 'EU-GOV-001')).toBe(true);
  });

  it('no governance finding for minimal risk with violations', () => {
    const config = makeConfig({
      analysis: {
        ...makeCleanAnalysis(),
        violations: [{ ruleId: 'R-001', level: 3 as const, message: 'test', target: 't', diagnosticCode: 'D-001', fixSuggestions: [], toolFuzzyMatches: [] }],
      },
    });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.findings.some((f) => f.id === 'EU-GOV-001')).toBe(false);
  });
});

describe('buildAnnexIIIObligations', () => {
  it('returns empty for non-high-risk', () => {
    expect(buildAnnexIIIObligations('minimal', null)).toHaveLength(0);
    expect(buildAnnexIIIObligations('limited', null)).toHaveLength(0);
  });

  it('returns empty for high-risk with null category', () => {
    expect(buildAnnexIIIObligations('high', null)).toHaveLength(0);
  });

  it('returns essential-services obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'essential-services');
    expect(obls.length).toBe(3);
    expect(obls[0]!.obligationId).toBe('EU-CAT-ES-01');
    expect(obls.every((o) => !o.met)).toBe(true);
  });

  it('returns law-enforcement obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'law-enforcement');
    expect(obls.length).toBe(3);
    expect(obls[0]!.obligationId).toBe('EU-CAT-LE-01');
  });

  it('returns critical-infrastructure obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'critical-infrastructure');
    expect(obls.length).toBe(2);
    expect(obls[0]!.obligationId).toBe('EU-CAT-CI-01');
  });

  it('returns education-vocational obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'education-vocational');
    expect(obls.length).toBe(3);
    expect(obls[0]!.obligationId).toBe('EU-CAT-ED-01');
  });

  it('returns employment-workers obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'employment-workers');
    expect(obls.length).toBe(3);
    expect(obls[0]!.obligationId).toBe('EU-CAT-EW-01');
  });

  it('returns migration-asylum obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'migration-asylum');
    expect(obls.length).toBe(3);
    expect(obls[0]!.obligationId).toBe('EU-CAT-MA-01');
  });

  it('returns justice-democratic obligations', () => {
    const obls = buildAnnexIIIObligations('high', 'justice-democratic');
    expect(obls.length).toBe(2);
    expect(obls[0]!.obligationId).toBe('EU-CAT-JD-01');
  });

  it('returns empty for unknown category', () => {
    // Cast to test defensive path
    const obls = buildAnnexIIIObligations('high', 'nonexistent' as any);
    expect(obls).toHaveLength(0);
  });
});

describe('getValidDomainMarkers', () => {
  it('returns all 8 domain markers', () => {
    const markers = getValidDomainMarkers();
    expect(markers).toHaveLength(8);
    expect(markers).toContain('healthcare');
    expect(markers).toContain('law-enforcement');
    expect(markers).toContain('critical-infrastructure');
    expect(markers).toContain('education');
    expect(markers).toContain('employment');
    expect(markers).toContain('financial-services');
    expect(markers).toContain('migration');
    expect(markers).toContain('judiciary');
  });
});

describe('getAnnexIIICategory', () => {
  it('maps healthcare to essential-services', () => {
    expect(getAnnexIIICategory('healthcare')).toBe('essential-services');
  });

  it('maps law-enforcement to law-enforcement', () => {
    expect(getAnnexIIICategory('law-enforcement')).toBe('law-enforcement');
  });

  it('maps employment to employment-workers', () => {
    expect(getAnnexIIICategory('employment')).toBe('employment-workers');
  });

  it('maps migration to migration-asylum', () => {
    expect(getAnnexIIICategory('migration')).toBe('migration-asylum');
  });

  it('maps judiciary to justice-democratic', () => {
    expect(getAnnexIIICategory('judiciary')).toBe('justice-democratic');
  });

  it('returns undefined for unknown marker', () => {
    expect(getAnnexIIICategory('nonexistent' as any)).toBeUndefined();
  });
});

describe('buildEUAIActAssessment edge cases', () => {
  it('minimal risk produces non-blocked assessment with no obligation checklist', () => {
    const config = makeConfig();
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.riskTier).toBe('minimal');
    expect(assessment.blocked).toBe(false);
    expect(assessment.blockReason).toBe('');
    expect(assessment.obligationChecklist).toHaveLength(0);
    expect(assessment.version).toBe('1.0.0');
    expect(assessment.scope).toBe('/test/workspace');
  });

  it('limited risk assessment evaluates articles but no obligation checklist', () => {
    const config = makeConfig({ declaredRiskTier: 'limited' });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.riskTier).toBe('limited');
    expect(assessment.article13.status).toBe('fail');
    expect(assessment.article14.status).toBe('fail');
    expect(assessment.obligationChecklist).toHaveLength(0);
  });

  it('generatedAt is a valid ISO timestamp', () => {
    const config = makeConfig();
    const assessment = buildEUAIActAssessment(config);
    expect(() => new Date(assessment.generatedAt)).not.toThrow();
    expect(assessment.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('domainMarkers are passed through to assessment', () => {
    const config = makeConfig({ domainMarkers: ['healthcare', 'education'] });
    const assessment = buildEUAIActAssessment(config);
    expect(assessment.domainMarkers).toEqual(['healthcare', 'education']);
  });
});
