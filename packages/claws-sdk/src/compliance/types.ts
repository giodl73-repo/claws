/**
 * Compliance framework types — SOC2, HIPAA, EU AI Act.
 *
 * Shared types for all compliance evidence builders. Each framework
 * produces a typed evidence artifact with per-control status, evidence
 * counts, and remediation findings.
 *
 * @module claws-sdk/compliance/types
 */

/**
 * Severity of a compliance finding.
 */
export type ComplianceSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * A single compliance finding — an observation about a control's status.
 */
export interface ComplianceFinding {
  /** Finding identifier (e.g. "SOC2-CC6.1-001"). */
  readonly id: string;
  /** The control this finding applies to. */
  readonly controlId: string;
  /** Severity of the finding. */
  readonly severity: ComplianceSeverity;
  /** Human-readable title. */
  readonly title: string;
  /** Detailed description of the finding. */
  readonly description: string;
  /** Remediation guidance. */
  readonly remediation: string;
}

/**
 * Status of a single control evaluation.
 */
export type ControlStatus = 'pass' | 'fail' | 'partial';

/**
 * Evidence for a single SOC2 Trust Services Criteria control.
 */
export interface SOC2ControlEvidence {
  /** Control identifier (e.g. "CC6.1"). */
  readonly controlId: string;
  /** Human-readable control name. */
  readonly controlName: string;
  /** Evaluation status. */
  readonly status: ControlStatus;
  /** Number of audit events that serve as evidence for this control. */
  readonly evidenceCount: number;
  /** Findings for this control. */
  readonly findings: readonly ComplianceFinding[];
}

/**
 * SOC2 Type II evidence artifact.
 */
export interface SOC2Evidence {
  /** Evidence format version. */
  readonly version: string;
  /** ISO 8601 timestamp when evidence was generated. */
  readonly generatedAt: string;
  /** Scope description (e.g. workspace path). */
  readonly scope: string;
  /** Observation period start (ISO 8601). */
  readonly observationPeriodStart: string;
  /** Observation period end (ISO 8601). */
  readonly observationPeriodEnd: string;
  /** Whether the observation period meets Type II minimum (6 months). */
  readonly observationPeriodValid: boolean;
  /** Per-control evidence. */
  readonly controls: readonly SOC2ControlEvidence[];
  /** Top-level findings that span multiple controls. */
  readonly findings: readonly ComplianceFinding[];
  /** Overall pass/fail/partial. */
  readonly overallStatus: ControlStatus;
  /** Total evidence count across all controls. */
  readonly totalEvidenceCount: number;
  /** Key fingerprint used for evidence attribution (if provided). */
  readonly keyFingerprint?: string;
}

/**
 * Status of a single HIPAA safeguard evaluation.
 */
export interface HIPAASafeguardEvidence {
  /** Safeguard identifier (e.g. "164.312(a)(1)"). */
  readonly safeguardId: string;
  /** Human-readable safeguard name. */
  readonly safeguardName: string;
  /** Evaluation status. */
  readonly status: ControlStatus;
  /** Number of audit events that serve as evidence for this safeguard. */
  readonly evidenceCount: number;
  /** Findings for this safeguard. */
  readonly findings: readonly ComplianceFinding[];
}

/**
 * PHI type coverage entry — tracks whether a declared PHI type
 * has corresponding governance labels.
 */
export interface PHICoverageEntry {
  /** PHI type from the HIPAA 18-identifier list. */
  readonly phiType: string;
  /** Whether this PHI type is declared in governance pii_types. */
  readonly declared: boolean;
  /** Whether corresponding governance labels cover this PHI type. */
  readonly labelCovered: boolean;
  /** The governance labels that cover this PHI type (if any). */
  readonly coveringLabels: readonly string[];
}

/**
 * A transmission gap — a tool that sends data externally without
 * 164.312(e)(1) encryption/integrity safeguards.
 */
export interface TransmissionGap {
  /** Tool name that sends data externally. */
  readonly toolName: string;
  /** External destination (if known). */
  readonly destination: string;
  /** Whether encryption safeguards are present. */
  readonly hasEncryption: boolean;
  /** Whether integrity safeguards are present. */
  readonly hasIntegrity: boolean;
}

/**
 * HIPAA Security Rule evidence artifact.
 */
export interface HIPAAEvidence {
  /** Evidence format version. */
  readonly version: string;
  /** ISO 8601 timestamp when evidence was generated. */
  readonly generatedAt: string;
  /** Scope description (e.g. workspace path). */
  readonly scope: string;
  /** Per-safeguard evidence (5 safeguards from 164.312). */
  readonly safeguards: readonly HIPAASafeguardEvidence[];
  /** PHI type coverage matrix. */
  readonly phiCoverage: readonly PHICoverageEntry[];
  /** Transmission security gaps. */
  readonly transmissionGaps: readonly TransmissionGap[];
  /** Top-level findings that span multiple safeguards. */
  readonly findings: readonly ComplianceFinding[];
  /** Overall pass/fail/partial. */
  readonly overallStatus: ControlStatus;
  /** Total evidence count across all safeguards. */
  readonly totalEvidenceCount: number;
}

/**
 * EU AI Act risk classification per Article 6 / Annex III.
 */
export type EURiskTier = 'minimal' | 'limited' | 'high' | 'unacceptable';

/**
 * Annex III high-risk categories.
 *
 * When the system's declared domain falls into one of these categories
 * the risk tier is automatically elevated to 'high'.
 */
export type AnnexIIICategory =
  | 'biometric-identification'
  | 'critical-infrastructure'
  | 'education-vocational'
  | 'employment-workers'
  | 'essential-services'
  | 'law-enforcement'
  | 'migration-asylum'
  | 'justice-democratic';

/**
 * Domain markers that map to Annex III categories for
 * automatic high-risk classification.
 */
export type DomainMarker =
  | 'healthcare'
  | 'law-enforcement'
  | 'critical-infrastructure'
  | 'education'
  | 'employment'
  | 'financial-services'
  | 'migration'
  | 'judiciary';

/**
 * Article 13 transparency evaluation status.
 */
export interface Article13Evaluation {
  /** Whether system documentation is adequate. */
  readonly documentationAdequate: boolean;
  /** Whether explainability provisions are in place. */
  readonly explainabilityProvided: boolean;
  /** Whether users are notified they are interacting with AI. */
  readonly userNotificationPresent: boolean;
  /** Overall Article 13 status. */
  readonly status: ControlStatus;
  /** Findings for this evaluation. */
  readonly findings: readonly ComplianceFinding[];
}

/**
 * Article 14 human oversight evaluation status.
 */
export interface Article14Evaluation {
  /** Whether human-in-the-loop controls exist. */
  readonly hitlControlsPresent: boolean;
  /** Whether HITL controls are appropriate for the declared risk tier. */
  readonly hitlAdequateForTier: boolean;
  /** Whether override/stop mechanisms exist. */
  readonly overrideMechanismPresent: boolean;
  /** Overall Article 14 status. */
  readonly status: ControlStatus;
  /** Findings for this evaluation. */
  readonly findings: readonly ComplianceFinding[];
}

/**
 * Fundamental rights impact assessment (required for high-risk systems).
 */
export interface FundamentalRightsImpact {
  /** Whether the assessment has been performed. */
  readonly assessed: boolean;
  /** Identified rights that may be impacted. */
  readonly impactedRights: readonly string[];
  /** Mitigation measures declared. */
  readonly mitigations: readonly string[];
  /** Findings for this assessment. */
  readonly findings: readonly ComplianceFinding[];
}

/**
 * Obligation checklist entry for high-risk systems.
 */
export interface ObligationChecklistEntry {
  /** Obligation identifier. */
  readonly obligationId: string;
  /** Human-readable description. */
  readonly description: string;
  /** Whether the obligation is met. */
  readonly met: boolean;
  /** Evidence or reason. */
  readonly evidence: string;
}

/**
 * EU AI Act assessment artifact.
 */
export interface EUAIActAssessment {
  /** Evidence format version. */
  readonly version: string;
  /** ISO 8601 timestamp when assessment was generated. */
  readonly generatedAt: string;
  /** Scope description (e.g. workspace path). */
  readonly scope: string;
  /** Article 6 / Annex III risk classification. */
  readonly riskTier: EURiskTier;
  /** Annex III category if classified as high-risk. */
  readonly annexIIICategory: AnnexIIICategory | null;
  /** Domain markers detected from governance config. */
  readonly domainMarkers: readonly DomainMarker[];
  /** Article 13 transparency evaluation. */
  readonly article13: Article13Evaluation;
  /** Article 14 human oversight evaluation. */
  readonly article14: Article14Evaluation;
  /** Fundamental rights impact assessment (populated for high-risk only). */
  readonly fundamentalRightsImpact: FundamentalRightsImpact;
  /** Obligation checklist for high-risk systems (empty for lower tiers). */
  readonly obligationChecklist: readonly ObligationChecklistEntry[];
  /** Top-level findings spanning multiple evaluations. */
  readonly findings: readonly ComplianceFinding[];
  /** Whether evidence generation is blocked (unacceptable risk). */
  readonly blocked: boolean;
  /** Block reason if applicable. */
  readonly blockReason: string;
}

/**
 * Asymmetric signature for signing compliance artifacts.
 */
export interface AsymmetricSignature {
  /** The signing algorithm (e.g. "RSASSA-PKCS1-v1_5-SHA256"). */
  readonly algorithm: string;
  /** The signature value (base64-encoded). */
  readonly signature: string;
  /** Key ID used for signing. */
  readonly keyId: string;
  /** ISO 8601 timestamp of signing. */
  readonly signedAt: string;
}
