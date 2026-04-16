/**
 * HIPAA Security Rule evidence builder.
 *
 * Maps 5 technical safeguards from 164.312 to governance analysis:
 * - 164.312(a)(1) Access Control
 * - 164.312(b)    Audit Controls
 * - 164.312(c)(1) Integrity
 * - 164.312(d)    Person or Entity Authentication
 * - 164.312(e)(1) Transmission Security
 *
 * PHI detection cross-references declared pii_types against the HIPAA
 * 18-identifier list. Per-pii-type label coverage checks ensure every
 * declared PHI type has corresponding governance labels. Transmission
 * gap detection identifies tools sending data externally without
 * 164.312(e)(1) encryption/integrity safeguards.
 *
 * @module claws-sdk/compliance/hipaa
 */

import type { ChainEntry, ChainVerifyResult } from '../audit/types.js';
import type { GovAnalysis, GovViolation, GovWarning } from '../ir/gov-analysis.js';
import type {
  ComplianceFinding,
  ComplianceSeverity,
  ControlStatus,
  HIPAAEvidence,
  HIPAASafeguardEvidence,
  PHICoverageEntry,
  TransmissionGap,
} from './types.js';

// ── Safeguard Definitions ──────────────────────────────────────────────

/**
 * HIPAA safeguard definition — maps a 164.312 subsection to its name
 * and the governance rule category prefixes that serve as evidence.
 */
interface HIPAASafeguardDef {
  readonly id: string;
  readonly name: string;
  /** Governance rule category prefixes that map to this safeguard. */
  readonly ruleCategories: readonly string[];
  /** Audit event types that serve as evidence for this safeguard. */
  readonly eventTypes: readonly string[];
}

/**
 * The 5 HIPAA Security Rule technical safeguards from 164.312.
 */
const HIPAA_SAFEGUARDS: readonly HIPAASafeguardDef[] = [
  {
    id: '164.312(a)(1)',
    name: 'Access Control',
    ruleCategories: ['G-PERM', 'G-CLASS'],
    eventTypes: ['TOOL_CALL', 'PERMISSION_CHECK', 'ACCESS_DENIED', 'CLASSIFICATION'],
  },
  {
    id: '164.312(b)',
    name: 'Audit Controls',
    ruleCategories: ['G-CONTEXT', 'G-OUTPUT'],
    eventTypes: ['CONTEXT_CHECK', 'OUTPUT_VALIDATION', 'MONITORING_EVENT'],
  },
  {
    id: '164.312(c)(1)',
    name: 'Integrity',
    ruleCategories: ['G-INPUT', 'G-SUPPLY'],
    eventTypes: ['INPUT_VALIDATION', 'SCHEMA_CHECK', 'SUPPLY_CHAIN_CHECK', 'DEPENDENCY_SCAN'],
  },
  {
    id: '164.312(d)',
    name: 'Person or Entity Authentication',
    ruleCategories: ['G-ELICIT', 'G-A2A'],
    eventTypes: ['CREDENTIAL_CHECK', 'ELICIT_REQUEST', 'A2A_DELEGATION', 'AGENT_SPAWN'],
  },
  {
    id: '164.312(e)(1)',
    name: 'Transmission Security',
    ruleCategories: ['G-DATA'],
    eventTypes: ['DATA_FLOW', 'DATA_LABEL', 'SENSITIVITY_CHECK'],
  },
];

// ── HIPAA 18-Identifier List ───────────────────────────────────────────

/**
 * The 18 HIPAA identifiers that constitute PHI.
 *
 * Per 45 CFR 164.514(b)(2), these are the 18 types of information
 * that must be removed for de-identification under Safe Harbor.
 */
export const HIPAA_18_IDENTIFIERS: readonly string[] = [
  'name',
  'geographic_data',
  'dates',
  'phone_number',
  'fax_number',
  'email_address',
  'ssn',
  'medical_record_number',
  'health_plan_beneficiary_number',
  'account_number',
  'certificate_license_number',
  'vehicle_identifier',
  'device_identifier',
  'web_url',
  'ip_address',
  'biometric_identifier',
  'photo',
  'other_unique_identifier',
];

// ── PHI Configuration ──────────────────────────────────────────────────

/**
 * A declared PII/PHI type from governance rules.
 */
export interface DeclaredPHIType {
  /** PHI type name (should map to one of the 18 identifiers). */
  readonly type: string;
  /** Governance labels covering this PHI type. */
  readonly labels: readonly string[];
}

/**
 * A tool that transmits data externally.
 */
export interface ExternalTransmission {
  /** Tool name. */
  readonly toolName: string;
  /** External destination. */
  readonly destination: string;
  /** Whether encryption is declared for this transmission. */
  readonly encrypted: boolean;
  /** Whether integrity controls are declared for this transmission. */
  readonly integrityProtected: boolean;
}

/**
 * Breach notification configuration for 164.408 compliance.
 */
export interface BreachNotificationConfig {
  /** Whether breach notification procedures are in place. */
  readonly proceduresDocumented: boolean;
  /** Maximum notification window in hours (HIPAA requires 60 days = 1440 hours). */
  readonly notificationWindowHours: number;
  /** Whether an incident response contact is designated. */
  readonly incidentContactDesignated: boolean;
}

/**
 * Options for building HIPAA evidence.
 */
export interface HIPAABuilderOptions {
  /** Workspace path (used as scope). */
  readonly scope: string;
  /** GovAnalysis results from compilation. */
  readonly analysis: GovAnalysis;
  /** Audit chain entries for evidence counting. */
  readonly chainEntries: readonly ChainEntry[];
  /** Chain verification result for broken chain detection. */
  readonly chainVerifyResult: ChainVerifyResult;
  /** Declared PHI types from governance configuration. */
  readonly declaredPHITypes: readonly DeclaredPHIType[];
  /** Tools that transmit data externally. */
  readonly externalTransmissions: readonly ExternalTransmission[];
  /** Breach notification configuration (optional). */
  readonly breachNotification?: BreachNotificationConfig;
  /** Governance enforcement uptime percentage (0-100). */
  readonly governanceUptimePercent?: number;
}

// ── Internal Helpers ───────────────────────────────────────────────────

function violationMatchesSafeguard(
  violation: GovViolation,
  safeguard: HIPAASafeguardDef,
): boolean {
  return safeguard.ruleCategories.some((prefix) =>
    violation.ruleId.startsWith(prefix),
  );
}

function warningMatchesSafeguard(
  warning: GovWarning,
  safeguard: HIPAASafeguardDef,
): boolean {
  return safeguard.ruleCategories.some((prefix) =>
    warning.category.startsWith(prefix),
  );
}

function countSafeguardEvidence(
  entries: readonly ChainEntry[],
  safeguard: HIPAASafeguardDef,
): number {
  return entries.filter((entry) =>
    safeguard.eventTypes.some((type) => entry.eventType === type),
  ).length;
}

function mapViolationSeverity(level: number | string): ComplianceSeverity {
  if (typeof level === 'number') {
    if (level >= 5) return 'critical';
    if (level >= 4) return 'high';
    if (level >= 3) return 'medium';
    return 'low';
  }
  if (level === 'error') return 'high';
  if (level === 'warn') return 'medium';
  return 'low';
}

function deriveSafeguardStatus(
  violations: readonly GovViolation[],
  warnings: readonly GovWarning[],
  evidenceCount: number,
): ControlStatus {
  if (violations.length > 0) return 'fail';
  if (warnings.length > 0) return 'partial';
  if (evidenceCount === 0) return 'partial';
  return 'pass';
}

function buildSafeguardFindings(
  safeguardId: string,
  violations: readonly GovViolation[],
  warnings: readonly GovWarning[],
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  let idx = 1;

  for (const v of violations) {
    findings.push({
      id: `HIPAA-${safeguardId}-${String(idx).padStart(3, '0')}`,
      controlId: safeguardId,
      severity: mapViolationSeverity(v.level),
      title: `Governance violation: ${v.ruleId}`,
      description: v.message,
      remediation: v.fixSuggestions.length > 0
        ? v.fixSuggestions.map((s) => `[${s.direction}] ${s.description}`).join('; ')
        : `Review and remediate governance rule ${v.ruleId}`,
    });
    idx++;
  }

  for (const w of warnings) {
    findings.push({
      id: `HIPAA-${safeguardId}-${String(idx).padStart(3, '0')}`,
      controlId: safeguardId,
      severity: 'medium',
      title: `Governance warning: ${w.ruleId}`,
      description: w.message,
      remediation: `Review governance warning ${w.ruleId} (${w.category})`,
    });
    idx++;
  }

  return findings;
}

// ── PHI Detection ──────────────────────────────────────────────────────

/**
 * Cross-reference declared PHI types against the HIPAA 18-identifier list.
 *
 * For each of the 18 identifiers, checks:
 * 1. Whether it is declared in the governance configuration
 * 2. Whether declared types have corresponding governance labels
 */
export function buildPHICoverage(
  declaredTypes: readonly DeclaredPHIType[],
): PHICoverageEntry[] {
  const declaredMap = new Map<string, DeclaredPHIType>();
  for (const dt of declaredTypes) {
    declaredMap.set(dt.type, dt);
  }

  return HIPAA_18_IDENTIFIERS.map((phiType) => {
    const declared = declaredMap.get(phiType);
    return {
      phiType,
      declared: declared !== undefined,
      labelCovered: declared !== undefined && declared.labels.length > 0,
      coveringLabels: declared?.labels ?? [],
    };
  });
}

/**
 * Build findings for PHI coverage gaps.
 */
function buildPHICoverageFindings(
  coverage: readonly PHICoverageEntry[],
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  let idx = 1;

  for (const entry of coverage) {
    if (entry.declared && !entry.labelCovered) {
      findings.push({
        id: `HIPAA-PHI-LABEL-${String(idx).padStart(3, '0')}`,
        controlId: '164.312(e)(1)',
        severity: 'high',
        title: `Missing label coverage for PHI type: ${entry.phiType}`,
        description: `PHI type "${entry.phiType}" is declared in governance pii_types but has no corresponding governance labels. Per HIPAA, every declared PHI type must have data classification labels to ensure proper handling.`,
        remediation: `Add governance labels for PHI type "${entry.phiType}" in your data labeling policy (e.g. phi, confidential, restricted).`,
      });
      idx++;
    }
  }

  return findings;
}

// ── Transmission Gap Detection ─────────────────────────────────────────

/**
 * Detect transmission security gaps — tools sending data externally
 * without 164.312(e)(1) encryption/integrity safeguards.
 */
export function detectTransmissionGaps(
  transmissions: readonly ExternalTransmission[],
): TransmissionGap[] {
  return transmissions
    .filter((t) => !t.encrypted || !t.integrityProtected)
    .map((t) => ({
      toolName: t.toolName,
      destination: t.destination,
      hasEncryption: t.encrypted,
      hasIntegrity: t.integrityProtected,
    }));
}

/**
 * Build findings for transmission gaps.
 */
function buildTransmissionGapFindings(
  gaps: readonly TransmissionGap[],
): ComplianceFinding[] {
  return gaps.map((gap, i) => ({
    id: `HIPAA-XMIT-GAP-${String(i + 1).padStart(3, '0')}`,
    controlId: '164.312(e)(1)',
    severity: 'high' as ComplianceSeverity,
    title: `Transmission security gap: ${gap.toolName} → ${gap.destination}`,
    description: `Tool "${gap.toolName}" sends data to external destination "${gap.destination}" without ${!gap.hasEncryption ? 'encryption' : ''}${!gap.hasEncryption && !gap.hasIntegrity ? ' or ' : ''}${!gap.hasIntegrity ? 'integrity' : ''} safeguards, violating 164.312(e)(1).`,
    remediation: `Add encryption and integrity controls for tool "${gap.toolName}" transmissions to "${gap.destination}". Configure TLS/encryption and HMAC/signing for external data flows.`,
  }));
}

// ── Builder ────────────────────────────────────────────────────────────

/**
 * Build HIPAA Security Rule evidence from governance analysis and audit chain.
 *
 * Maps 5 technical safeguards from 164.312 to governance rule results.
 * Cross-references PHI types against the 18-identifier list. Detects
 * transmission security gaps per 164.312(e)(1).
 */
export function buildHIPAAEvidence(options: HIPAABuilderOptions): HIPAAEvidence {
  const {
    scope,
    analysis,
    chainEntries,
    chainVerifyResult,
    declaredPHITypes,
    externalTransmissions,
  } = options;

  const topLevelFindings: ComplianceFinding[] = [];

  // Broken audit chain → critical finding
  const chainBroken = !chainVerifyResult.valid;

  if (chainBroken) {
    topLevelFindings.push({
      id: 'HIPAA-CHAIN-BROKEN-001',
      controlId: '*',
      severity: 'critical',
      title: 'Audit chain integrity broken',
      description: chainVerifyResult.error ?? chainVerifyResult.details ?? 'Audit chain verification failed',
      remediation: 'Investigate and restore audit chain integrity. All safeguards are affected.',
    });
  }

  // Build per-safeguard evidence
  const safeguards: HIPAASafeguardEvidence[] = HIPAA_SAFEGUARDS.map((safeguardDef) => {
    const safeguardViolations = analysis.violations.filter((v) =>
      violationMatchesSafeguard(v, safeguardDef),
    );
    const safeguardWarnings = analysis.warnings.filter((w) =>
      warningMatchesSafeguard(w, safeguardDef),
    );
    const evidenceCount = countSafeguardEvidence(chainEntries, safeguardDef);

    const findings = buildSafeguardFindings(
      safeguardDef.id,
      safeguardViolations,
      safeguardWarnings,
    );

    // Broken chain elevates to critical finding per safeguard
    if (chainBroken) {
      findings.push({
        id: `HIPAA-${safeguardDef.id}-CHAIN-001`,
        controlId: safeguardDef.id,
        severity: 'critical',
        title: 'Audit chain integrity broken — evidence unreliable',
        description: 'The audit chain has been tampered with. Evidence for this safeguard cannot be trusted.',
        remediation: 'Restore audit chain integrity before compliance assessment.',
      });
    }

    // Determine status: broken chain forces fail
    const status: ControlStatus = chainBroken
      ? 'fail'
      : deriveSafeguardStatus(safeguardViolations, safeguardWarnings, evidenceCount);

    return {
      safeguardId: safeguardDef.id,
      safeguardName: safeguardDef.name,
      status,
      evidenceCount,
      findings,
    };
  });

  // PHI coverage
  const phiCoverage = buildPHICoverage(declaredPHITypes);
  const phiCoverageFindings = buildPHICoverageFindings(phiCoverage);
  topLevelFindings.push(...phiCoverageFindings);

  // Transmission gap detection
  const transmissionGaps = detectTransmissionGaps(externalTransmissions);
  const transmissionFindings = buildTransmissionGapFindings(transmissionGaps);
  topLevelFindings.push(...transmissionFindings);

  // Breach notification assessment (164.408)
  if (options.breachNotification) {
    const bn = options.breachNotification;
    if (!bn.proceduresDocumented) {
      topLevelFindings.push({
        id: 'HIPAA-BREACH-001',
        controlId: '164.408',
        severity: 'high',
        title: 'Breach notification procedures not documented',
        description: 'HIPAA 164.408 requires documented breach notification procedures.',
        remediation: 'Document breach notification procedures including individual and HHS notification workflows.',
      });
    }
    if (bn.notificationWindowHours > 1440) {
      topLevelFindings.push({
        id: 'HIPAA-BREACH-002',
        controlId: '164.408',
        severity: 'high',
        title: 'Breach notification window exceeds 60-day maximum',
        description: `Configured notification window is ${bn.notificationWindowHours} hours, exceeding the HIPAA maximum of 1440 hours (60 days).`,
        remediation: 'Reduce breach notification window to 60 days or less.',
      });
    }
    if (!bn.incidentContactDesignated) {
      topLevelFindings.push({
        id: 'HIPAA-BREACH-003',
        controlId: '164.408',
        severity: 'medium',
        title: 'No designated incident response contact',
        description: 'A designated incident response contact is recommended for effective breach notification.',
        remediation: 'Designate an incident response contact responsible for breach notification coordination.',
      });
    }
  }

  // Governance enforcement uptime check
  if (options.governanceUptimePercent !== undefined && options.governanceUptimePercent < 99.0) {
    topLevelFindings.push({
      id: 'HIPAA-UPTIME-001',
      controlId: '164.312(b)',
      severity: options.governanceUptimePercent < 95.0 ? 'high' : 'medium',
      title: `Governance enforcement uptime below threshold: ${options.governanceUptimePercent.toFixed(1)}%`,
      description: `Governance enforcement uptime is ${options.governanceUptimePercent.toFixed(1)}%, below the recommended 99% threshold. Gaps in governance enforcement create periods where PHI access may be unaudited.`,
      remediation: 'Investigate and resolve governance enforcement availability issues to achieve 99%+ uptime.',
    });
  }

  // Overall status
  const hasFailure = safeguards.some((s) => s.status === 'fail');
  const hasPartial = safeguards.some((s) => s.status === 'partial');
  const hasTransmissionGaps = transmissionGaps.length > 0;
  const hasPhiGaps = phiCoverageFindings.length > 0;

  const overallStatus: ControlStatus =
    hasFailure || hasTransmissionGaps
      ? 'fail'
      : hasPartial || hasPhiGaps
        ? 'partial'
        : 'pass';

  const totalEvidenceCount = safeguards.reduce(
    (sum, s) => sum + s.evidenceCount,
    0,
  );

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    scope,
    safeguards,
    phiCoverage,
    transmissionGaps,
    findings: topLevelFindings,
    overallStatus,
    totalEvidenceCount,
  };
}

/**
 * Get the list of HIPAA safeguard IDs.
 */
export function getHIPAASafeguardIds(): readonly string[] {
  return HIPAA_SAFEGUARDS.map((s) => s.id);
}

/**
 * Get the safeguard definition for a given safeguard ID.
 */
export function getHIPAASafeguardDef(
  safeguardId: string,
): HIPAASafeguardDef | undefined {
  return HIPAA_SAFEGUARDS.find((s) => s.id === safeguardId);
}
