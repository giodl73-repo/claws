/**
 * EU AI Act assessment engine.
 *
 * Article 6 / Annex III risk classification (minimal/limited/high/unacceptable).
 * Article 13 transparency evaluation (documentation, explainability, user notification).
 * Article 14 human oversight evaluation (HITL controls appropriate for risk tier).
 * Fundamental rights impact assessment for high-risk systems.
 *
 * Classification is sourced from explicit claws.json config — the deployer
 * declares their system's domain and use case, the assessor validates
 * completeness against Annex III categories.
 *
 * @module claws-sdk/compliance/eu-ai-act
 */

import type { GovAnalysis } from '../ir/gov-analysis.js';
import type {
  AnnexIIICategory,
  Article13Evaluation,
  Article14Evaluation,
  ComplianceFinding,
  ControlStatus,
  DomainMarker,
  EUAIActAssessment,
  EURiskTier,
  FundamentalRightsImpact,
  ObligationChecklistEntry,
} from './types.js';

/**
 * Map domain markers to Annex III categories.
 */
const DOMAIN_TO_ANNEX_III: ReadonlyMap<DomainMarker, AnnexIIICategory> = new Map([
  ['healthcare', 'essential-services'],
  ['law-enforcement', 'law-enforcement'],
  ['critical-infrastructure', 'critical-infrastructure'],
  ['education', 'education-vocational'],
  ['employment', 'employment-workers'],
  ['financial-services', 'essential-services'],
  ['migration', 'migration-asylum'],
  ['judiciary', 'justice-democratic'],
]);

/**
 * All valid domain markers.
 */
const VALID_DOMAIN_MARKERS: readonly DomainMarker[] = [
  'healthcare',
  'law-enforcement',
  'critical-infrastructure',
  'education',
  'employment',
  'financial-services',
  'migration',
  'judiciary',
];

/**
 * High-risk obligation checklist entries.
 */
const HIGH_RISK_OBLIGATIONS: ReadonlyArray<{
  id: string;
  description: string;
  check: (config: EUAIActConfig) => boolean;
}> = [
  {
    id: 'EU-OBL-01',
    description: 'Risk management system established (Art. 9)',
    check: (c) => c.analysis.violations.length === 0 || c.riskManagementDeclared,
  },
  {
    id: 'EU-OBL-02',
    description: 'Data governance measures in place (Art. 10)',
    check: (c) => c.dataGovernanceDeclared,
  },
  {
    id: 'EU-OBL-03',
    description: 'Technical documentation maintained (Art. 11)',
    check: (c) => c.documentationDeclared,
  },
  {
    id: 'EU-OBL-04',
    description: 'Record-keeping / logging enabled (Art. 12)',
    check: (c) => c.loggingEnabled,
  },
  {
    id: 'EU-OBL-05',
    description: 'Transparency provisions met (Art. 13)',
    check: (c) => c.transparencyDeclared,
  },
  {
    id: 'EU-OBL-06',
    description: 'Human oversight mechanisms present (Art. 14)',
    check: (c) => c.humanOversightDeclared,
  },
  {
    id: 'EU-OBL-07',
    description: 'Accuracy, robustness, cybersecurity (Art. 15)',
    check: (c) => c.accuracyRobustnessDeclared,
  },
];

/**
 * EU AI Act assessment configuration — sourced from claws.json.
 */
export interface EUAIActConfig {
  /** Workspace path (used as scope). */
  readonly scope: string;
  /** Explicitly declared risk tier from config (if any). */
  readonly declaredRiskTier?: EURiskTier;
  /** Domain markers declared in governance config. */
  readonly domainMarkers: readonly DomainMarker[];
  /** GovAnalysis results from compilation. */
  readonly analysis: GovAnalysis;
  /** Whether transparency provisions are declared. */
  readonly transparencyDeclared: boolean;
  /** Whether documentation is declared adequate. */
  readonly documentationDeclared: boolean;
  /** Whether explainability measures exist. */
  readonly explainabilityDeclared: boolean;
  /** Whether user notification of AI interaction exists. */
  readonly userNotificationDeclared: boolean;
  /** Whether human oversight controls are declared. */
  readonly humanOversightDeclared: boolean;
  /** Whether override/stop mechanisms exist. */
  readonly overrideMechanismDeclared: boolean;
  /** Whether fundamental rights impact has been assessed. */
  readonly fundamentalRightsAssessed: boolean;
  /** Declared impacted rights (if assessed). */
  readonly impactedRights: readonly string[];
  /** Declared mitigations for fundamental rights impact. */
  readonly mitigations: readonly string[];
  /** Whether risk management system is declared. */
  readonly riskManagementDeclared: boolean;
  /** Whether data governance is declared. */
  readonly dataGovernanceDeclared: boolean;
  /** Whether logging/record-keeping is enabled. */
  readonly loggingEnabled: boolean;
  /** Whether accuracy/robustness/cybersecurity is declared. */
  readonly accuracyRobustnessDeclared: boolean;
}

/**
 * Classify Article 6 / Annex III risk tier.
 *
 * Priority: unacceptable > explicit declaration > domain marker elevation > minimal.
 * Domain markers in governance rules (healthcare, law enforcement, etc.)
 * trigger automatic high-risk classification.
 */
export function classifyRiskTier(
  config: EUAIActConfig,
): { tier: EURiskTier; annexIIICategory: AnnexIIICategory | null } {
  // Explicit unacceptable declaration takes priority
  if (config.declaredRiskTier === 'unacceptable') {
    return { tier: 'unacceptable', annexIIICategory: null };
  }

  // Domain markers trigger high-risk classification
  for (const marker of config.domainMarkers) {
    const category = DOMAIN_TO_ANNEX_III.get(marker);
    if (category) {
      return { tier: 'high', annexIIICategory: category };
    }
  }

  // Explicit high declaration
  if (config.declaredRiskTier === 'high') {
    return { tier: 'high', annexIIICategory: null };
  }

  // Explicit limited or minimal
  if (config.declaredRiskTier === 'limited') {
    return { tier: 'limited', annexIIICategory: null };
  }

  return { tier: 'minimal', annexIIICategory: null };
}

/**
 * Evaluate Article 13 transparency requirements.
 */
export function evaluateArticle13(config: EUAIActConfig, riskTier: EURiskTier): Article13Evaluation {
  const findings: ComplianceFinding[] = [];
  let idx = 1;

  const documentationAdequate = config.documentationDeclared;
  const explainabilityProvided = config.explainabilityDeclared;
  const userNotificationPresent = config.userNotificationDeclared;

  if (!documentationAdequate) {
    findings.push({
      id: `EU-ART13-${String(idx).padStart(3, '0')}`,
      controlId: 'ART-13',
      severity: riskTier === 'high' ? 'high' : 'medium',
      title: 'Inadequate system documentation',
      description: 'Article 13 requires transparent documentation of AI system capabilities and limitations.',
      remediation: 'Provide comprehensive system documentation covering intended purpose, capabilities, known limitations, and training data characteristics.',
    });
    idx++;
  }

  if (!explainabilityProvided) {
    findings.push({
      id: `EU-ART13-${String(idx).padStart(3, '0')}`,
      controlId: 'ART-13',
      severity: riskTier === 'high' ? 'high' : 'medium',
      title: 'Missing explainability provisions',
      description: 'Article 13 requires AI systems to be designed for sufficient explainability.',
      remediation: 'Implement explainability measures appropriate for the system risk tier.',
    });
    idx++;
  }

  if (!userNotificationPresent) {
    findings.push({
      id: `EU-ART13-${String(idx).padStart(3, '0')}`,
      controlId: 'ART-13',
      severity: riskTier === 'high' ? 'high' : 'medium',
      title: 'Missing user notification of AI interaction',
      description: 'Users must be notified when interacting with an AI system (Article 13 transparency).',
      remediation: 'Implement clear user notification mechanisms informing users of AI system interaction.',
    });
    idx++;
  }

  const allPresent = documentationAdequate && explainabilityProvided && userNotificationPresent;
  const nonePresent = !documentationAdequate && !explainabilityProvided && !userNotificationPresent;
  const status: ControlStatus = allPresent ? 'pass' : nonePresent ? 'fail' : 'partial';

  return {
    documentationAdequate,
    explainabilityProvided,
    userNotificationPresent,
    status,
    findings,
  };
}

/**
 * Evaluate Article 14 human oversight requirements.
 */
export function evaluateArticle14(config: EUAIActConfig, riskTier: EURiskTier): Article14Evaluation {
  const findings: ComplianceFinding[] = [];
  let idx = 1;

  const hitlControlsPresent = config.humanOversightDeclared;
  const overrideMechanismPresent = config.overrideMechanismDeclared;

  // HITL adequacy depends on risk tier
  const hitlAdequateForTier = riskTier === 'minimal'
    ? true // minimal risk has no HITL requirement
    : riskTier === 'limited'
      ? hitlControlsPresent // limited needs basic HITL
      : hitlControlsPresent && overrideMechanismPresent; // high needs both

  if (!hitlControlsPresent && (riskTier === 'high' || riskTier === 'limited')) {
    findings.push({
      id: `EU-ART14-${String(idx).padStart(3, '0')}`,
      controlId: 'ART-14',
      severity: riskTier === 'high' ? 'critical' : 'high',
      title: 'Missing human-in-the-loop controls',
      description: `Article 14 requires human oversight measures for ${riskTier}-risk AI systems.`,
      remediation: 'Implement human-in-the-loop controls allowing human review and intervention in AI decisions.',
    });
    idx++;
  }

  if (!overrideMechanismPresent && riskTier === 'high') {
    findings.push({
      id: `EU-ART14-${String(idx).padStart(3, '0')}`,
      controlId: 'ART-14',
      severity: 'critical',
      title: 'Missing override/stop mechanism for high-risk system',
      description: 'High-risk AI systems must provide mechanisms for humans to override or stop the system.',
      remediation: 'Implement override and emergency stop mechanisms accessible to authorized human operators.',
    });
    idx++;
  }

  const status: ControlStatus = hitlAdequateForTier
    ? 'pass'
    : hitlControlsPresent || overrideMechanismPresent
      ? 'partial'
      : 'fail';

  return {
    hitlControlsPresent,
    hitlAdequateForTier,
    overrideMechanismPresent,
    status,
    findings,
  };
}

/**
 * Assess fundamental rights impact (required for high-risk systems).
 */
function assessFundamentalRights(config: EUAIActConfig, riskTier: EURiskTier): FundamentalRightsImpact {
  const findings: ComplianceFinding[] = [];

  if (riskTier !== 'high') {
    return {
      assessed: false,
      impactedRights: [],
      mitigations: [],
      findings: [],
    };
  }

  if (!config.fundamentalRightsAssessed) {
    findings.push({
      id: 'EU-FRIA-001',
      controlId: 'FRIA',
      severity: 'high',
      title: 'Fundamental rights impact assessment not performed',
      description: 'High-risk AI systems require a fundamental rights impact assessment per EU AI Act.',
      remediation: 'Conduct a fundamental rights impact assessment covering EU Charter rights that may be affected.',
    });
  }

  if (config.fundamentalRightsAssessed && config.impactedRights.length > 0 && config.mitigations.length === 0) {
    findings.push({
      id: 'EU-FRIA-002',
      controlId: 'FRIA',
      severity: 'high',
      title: 'Impacted rights identified but no mitigations declared',
      description: `${config.impactedRights.length} fundamental rights identified as impacted but no mitigation measures are declared.`,
      remediation: 'Declare mitigation measures for each identified impacted right.',
    });
  }

  return {
    assessed: config.fundamentalRightsAssessed,
    impactedRights: config.impactedRights,
    mitigations: config.mitigations,
    findings,
  };
}

/**
 * Build obligation checklist for high-risk systems.
 */
function buildObligationChecklist(config: EUAIActConfig, riskTier: EURiskTier): ObligationChecklistEntry[] {
  if (riskTier !== 'high') return [];

  return HIGH_RISK_OBLIGATIONS.map((obl) => ({
    obligationId: obl.id,
    description: obl.description,
    met: obl.check(config),
    evidence: obl.check(config) ? 'Declared in configuration' : 'Not declared or not met',
  }));
}

/**
 * Build EU AI Act assessment from configuration.
 *
 * Classification from explicit config, not automated inference.
 * Domain markers trigger automatic high-risk elevation.
 * Unacceptable risk blocks evidence generation.
 */
export function buildEUAIActAssessment(config: EUAIActConfig): EUAIActAssessment {
  const { tier: riskTier, annexIIICategory } = classifyRiskTier(config);
  const topLevelFindings: ComplianceFinding[] = [];

  // Unacceptable risk blocks everything
  if (riskTier === 'unacceptable') {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      scope: config.scope,
      riskTier: 'unacceptable',
      annexIIICategory: null,
      domainMarkers: config.domainMarkers,
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
      fundamentalRightsImpact: {
        assessed: false,
        impactedRights: [],
        mitigations: [],
        findings: [],
      },
      obligationChecklist: [],
      findings: [{
        id: 'EU-UNACCEPTABLE-001',
        controlId: '*',
        severity: 'critical',
        title: 'System classified as unacceptable risk — deployment prohibited',
        description: 'This AI system is classified as unacceptable risk under Article 5 of the EU AI Act. Deployment is prohibited. Evidence generation is blocked.',
        remediation: 'Review the system classification. If the classification is incorrect, update the declared risk tier and domain markers in claws.json.',
      }],
      blocked: true,
      blockReason: 'System classified as unacceptable risk under Article 5 — deployment prohibited.',
    };
  }

  // Evaluate articles
  const article13 = evaluateArticle13(config, riskTier);
  const article14 = evaluateArticle14(config, riskTier);
  const fundamentalRightsImpact = assessFundamentalRights(config, riskTier);
  const obligationChecklist = buildObligationChecklist(config, riskTier);

  // Domain marker findings
  if (config.domainMarkers.length > 0 && riskTier === 'high') {
    topLevelFindings.push({
      id: 'EU-DOMAIN-001',
      controlId: '*',
      severity: 'info',
      title: `High-risk classification triggered by domain marker(s): ${config.domainMarkers.join(', ')}`,
      description: `Domain markers ${config.domainMarkers.join(', ')} map to Annex III category "${annexIIICategory ?? 'unknown'}". Full conformity assessment obligations apply.`,
      remediation: 'Ensure all Annex III obligations are met for the identified category.',
    });
  }

  // Governance violation findings
  if (config.analysis.violations.length > 0 && riskTier === 'high') {
    topLevelFindings.push({
      id: 'EU-GOV-001',
      controlId: '*',
      severity: 'high',
      title: `${config.analysis.violations.length} governance violation(s) in high-risk system`,
      description: 'Governance violations in a high-risk AI system may indicate non-compliance with EU AI Act obligations.',
      remediation: 'Resolve all governance violations before compliance certification.',
    });
  }

  // Unmet obligations finding
  const unmetObligations = obligationChecklist.filter((o) => !o.met);
  if (unmetObligations.length > 0) {
    topLevelFindings.push({
      id: 'EU-OBL-UNMET-001',
      controlId: '*',
      severity: 'high',
      title: `${unmetObligations.length} high-risk obligation(s) not met`,
      description: `The following obligations are not met: ${unmetObligations.map((o) => o.obligationId).join(', ')}.`,
      remediation: 'Address each unmet obligation to achieve EU AI Act conformity.',
    });
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    scope: config.scope,
    riskTier,
    annexIIICategory,
    domainMarkers: config.domainMarkers,
    article13,
    article14,
    fundamentalRightsImpact,
    obligationChecklist,
    findings: topLevelFindings,
    blocked: false,
    blockReason: '',
  };
}

/**
 * Annex III category-specific obligation entries.
 *
 * Each Annex III category has additional obligations beyond the base
 * high-risk set. These are checked when the system falls into a
 * specific category (e.g., healthcare has medical device obligations).
 */
const ANNEX_III_CATEGORY_OBLIGATIONS: ReadonlyMap<AnnexIIICategory, ReadonlyArray<{
  id: string;
  description: string;
}>> = new Map([
  ['essential-services', [
    { id: 'EU-CAT-ES-01', description: 'Creditworthiness assessment bias testing (Annex III, 5b)' },
    { id: 'EU-CAT-ES-02', description: 'Emergency services dispatch fairness review (Annex III, 5c)' },
    { id: 'EU-CAT-ES-03', description: 'Insurance pricing algorithmic audit (Annex III, 5a)' },
  ]],
  ['law-enforcement', [
    { id: 'EU-CAT-LE-01', description: 'Individual risk assessment non-discrimination review (Annex III, 6a)' },
    { id: 'EU-CAT-LE-02', description: 'Evidence reliability audit for polygraph/AI detection (Annex III, 6c)' },
    { id: 'EU-CAT-LE-03', description: 'Profiling prohibition compliance check (Annex III, 6e)' },
  ]],
  ['critical-infrastructure', [
    { id: 'EU-CAT-CI-01', description: 'Safety component failure mode analysis (Annex III, 2a)' },
    { id: 'EU-CAT-CI-02', description: 'Infrastructure availability impact assessment (Annex III, 2b)' },
  ]],
  ['education-vocational', [
    { id: 'EU-CAT-ED-01', description: 'Admissions scoring bias testing (Annex III, 3a)' },
    { id: 'EU-CAT-ED-02', description: 'Learning assessment fairness review (Annex III, 3b)' },
    { id: 'EU-CAT-ED-03', description: 'Student monitoring proportionality check (Annex III, 3c)' },
  ]],
  ['employment-workers', [
    { id: 'EU-CAT-EW-01', description: 'Recruitment AI non-discrimination testing (Annex III, 4a)' },
    { id: 'EU-CAT-EW-02', description: 'Promotion/termination decision fairness audit (Annex III, 4b)' },
    { id: 'EU-CAT-EW-03', description: 'Worker monitoring proportionality check (Annex III, 4c)' },
  ]],
  ['migration-asylum', [
    { id: 'EU-CAT-MA-01', description: 'Asylum claim assessment fairness review (Annex III, 7a)' },
    { id: 'EU-CAT-MA-02', description: 'Border control biometric non-discrimination check (Annex III, 7b)' },
    { id: 'EU-CAT-MA-03', description: 'Visa application AI transparency provisions (Annex III, 7c)' },
  ]],
  ['justice-democratic', [
    { id: 'EU-CAT-JD-01', description: 'Judicial decision recommendation transparency (Annex III, 8a)' },
    { id: 'EU-CAT-JD-02', description: 'Election/voting influence detection mechanisms (Annex III, 8b)' },
  ]],
]);

/**
 * Build Annex III category-specific obligation checklist.
 *
 * Returns an empty array for non-high-risk systems or when no
 * Annex III category is applicable.
 */
export function buildAnnexIIIObligations(
  riskTier: EURiskTier,
  annexIIICategory: AnnexIIICategory | null,
): ObligationChecklistEntry[] {
  if (riskTier !== 'high' || annexIIICategory === null) return [];

  const categoryObls = ANNEX_III_CATEGORY_OBLIGATIONS.get(annexIIICategory);
  if (!categoryObls) return [];

  return categoryObls.map((obl) => ({
    obligationId: obl.id,
    description: obl.description,
    met: false, // Category-specific obligations require explicit attestation
    evidence: 'Requires explicit attestation — not auto-checkable from governance analysis',
  }));
}

/**
 * Get the list of valid domain markers.
 */
export function getValidDomainMarkers(): readonly DomainMarker[] {
  return VALID_DOMAIN_MARKERS;
}

/**
 * Get the Annex III category for a domain marker.
 */
export function getAnnexIIICategory(marker: DomainMarker): AnnexIIICategory | undefined {
  return DOMAIN_TO_ANNEX_III.get(marker);
}
