/**
 * SOC2 Type II evidence builder.
 *
 * Maps 9 Trust Services Criteria controls (CC6.1–CC8.1) against
 * governance rule results from GovAnalysis. Produces SOC2Evidence
 * with per-control status, evidence counts, and remediation findings.
 *
 * Observation period validation: minimum 6 months for Type II compliance.
 * A short observation period produces a warning finding, not a hard failure.
 *
 * Broken audit chain is elevated to a critical finding across all controls.
 *
 * @module claws-sdk/compliance/soc2
 */

import type { ChainEntry, ChainVerifyResult } from '../audit/types.js';
import type { GovAnalysis, GovViolation, GovWarning } from '../ir/gov-analysis.js';
import type {
  ComplianceFinding,
  ComplianceSeverity,
  ControlStatus,
  SOC2ControlEvidence,
  SOC2Evidence,
} from './types.js';

/**
 * SOC2 control definition — maps a control ID to its name and
 * the governance rule category prefixes that serve as evidence.
 */
interface SOC2ControlDef {
  readonly id: string;
  readonly name: string;
  /** Governance rule category prefixes that map to this control. */
  readonly ruleCategories: readonly string[];
  /** Audit event types that serve as evidence for this control. */
  readonly eventTypes: readonly string[];
}

/**
 * The 9 SOC2 Trust Services Criteria controls.
 *
 * Each maps to governance rule categories (G-PERM, G-CLASS, etc.)
 * and audit event types that serve as evidence.
 */
const SOC2_CONTROLS: readonly SOC2ControlDef[] = [
  {
    id: 'CC6.1',
    name: 'Logical Access Security',
    ruleCategories: ['G-PERM'],
    eventTypes: ['TOOL_CALL', 'PERMISSION_CHECK', 'ACCESS_DENIED'],
  },
  {
    id: 'CC6.2',
    name: 'System Credentials Management',
    ruleCategories: ['G-ELICIT'],
    eventTypes: ['CREDENTIAL_CHECK', 'KEY_ROTATION', 'ELICIT_REQUEST'],
  },
  {
    id: 'CC6.3',
    name: 'Role-Based Access Control',
    ruleCategories: ['G-CLASS'],
    eventTypes: ['CLASSIFICATION', 'RISK_ASSESSMENT', 'TOOL_CLASSIFY'],
  },
  {
    id: 'CC6.6',
    name: 'External Threat Protection',
    ruleCategories: ['G-SUPPLY'],
    eventTypes: ['SUPPLY_CHAIN_CHECK', 'DEPENDENCY_SCAN', 'THREAT_DETECT'],
  },
  {
    id: 'CC6.7',
    name: 'Data Transmission Security',
    ruleCategories: ['G-DATA'],
    eventTypes: ['DATA_FLOW', 'DATA_LABEL', 'SENSITIVITY_CHECK'],
  },
  {
    id: 'CC6.8',
    name: 'Software Change Management',
    ruleCategories: ['G-INPUT'],
    eventTypes: ['INPUT_VALIDATION', 'SCHEMA_CHECK', 'CONFIG_CHANGE'],
  },
  {
    id: 'CC7.1',
    name: 'System Monitoring',
    ruleCategories: ['G-CONTEXT', 'G-OUTPUT'],
    eventTypes: ['CONTEXT_CHECK', 'OUTPUT_VALIDATION', 'MONITORING_EVENT'],
  },
  {
    id: 'CC7.2',
    name: 'Anomaly Detection',
    ruleCategories: ['G-BOUND'],
    eventTypes: ['BOUND_CHECK', 'ANOMALY_DETECT', 'THRESHOLD_BREACH'],
  },
  {
    id: 'CC8.1',
    name: 'Change Management',
    ruleCategories: ['G-A2A'],
    eventTypes: ['A2A_DELEGATION', 'AGENT_SPAWN', 'WORKFLOW_CHANGE'],
  },
];

/**
 * Minimum observation period for SOC2 Type II (in milliseconds).
 * 6 months ≈ 180 days.
 */
const MIN_OBSERVATION_PERIOD_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Options for building SOC2 evidence.
 */
export interface SOC2BuilderOptions {
  /** Workspace path (used as scope). */
  readonly scope: string;
  /** GovAnalysis results from compilation. */
  readonly analysis: GovAnalysis;
  /** Audit chain entries for evidence counting. */
  readonly chainEntries: readonly ChainEntry[];
  /** Chain verification result for broken chain detection. */
  readonly chainVerifyResult: ChainVerifyResult;
  /** Observation period start (ISO 8601). */
  readonly observationStart: string;
  /** Observation period end (ISO 8601). */
  readonly observationEnd: string;
  /** Key fingerprint for evidence attribution (optional). */
  readonly keyFingerprint?: string;
}

/**
 * Determine if a governance violation maps to a given control.
 */
function violationMatchesControl(
  violation: GovViolation,
  control: SOC2ControlDef,
): boolean {
  return control.ruleCategories.some((prefix) =>
    violation.ruleId.startsWith(prefix),
  );
}

/**
 * Determine if a governance warning maps to a given control.
 */
function warningMatchesControl(
  warning: GovWarning,
  control: SOC2ControlDef,
): boolean {
  return control.ruleCategories.some((prefix) =>
    warning.category.startsWith(prefix),
  );
}

/**
 * Count audit events that serve as evidence for a control.
 */
function countControlEvidence(
  entries: readonly ChainEntry[],
  control: SOC2ControlDef,
): number {
  return entries.filter((entry) =>
    control.eventTypes.some((type) => entry.eventType === type),
  ).length;
}

/**
 * Map GovViolation severity to ComplianceSeverity.
 */
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

/**
 * Derive control status from violations, warnings, and evidence count.
 *
 * - No violations and evidence > 0 → pass
 * - No violations and no evidence → partial (no evidence to confirm)
 * - Warnings only → partial
 * - Any violation → fail
 */
function deriveControlStatus(
  violations: readonly GovViolation[],
  warnings: readonly GovWarning[],
  evidenceCount: number,
): ControlStatus {
  if (violations.length > 0) return 'fail';
  if (warnings.length > 0) return 'partial';
  if (evidenceCount === 0) return 'partial';
  return 'pass';
}

/**
 * Build findings from violations for a specific control.
 */
function buildControlFindings(
  controlId: string,
  violations: readonly GovViolation[],
  warnings: readonly GovWarning[],
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  let idx = 1;

  for (const v of violations) {
    findings.push({
      id: `SOC2-${controlId}-${String(idx).padStart(3, '0')}`,
      controlId,
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
      id: `SOC2-${controlId}-${String(idx).padStart(3, '0')}`,
      controlId,
      severity: 'medium',
      title: `Governance warning: ${w.ruleId}`,
      description: w.message,
      remediation: `Review governance warning ${w.ruleId} (${w.category})`,
    });
    idx++;
  }

  return findings;
}

/**
 * Validate observation period.
 *
 * Returns true if the period spans at least 6 months (180 days).
 */
export function validateObservationPeriod(
  start: string,
  end: string,
): boolean {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return (endMs - startMs) >= MIN_OBSERVATION_PERIOD_MS;
}

/**
 * Build SOC2 Type II evidence from governance analysis and audit chain.
 *
 * Maps 9 controls (CC6.1–CC8.1) to governance rule results. Validates
 * observation period, filters events to controls, and elevates broken
 * chain to critical finding across all controls.
 */
export function buildSOC2Evidence(options: SOC2BuilderOptions): SOC2Evidence {
  const {
    scope,
    analysis,
    chainEntries,
    chainVerifyResult,
    observationStart,
    observationEnd,
  } = options;

  const observationPeriodValid = validateObservationPeriod(
    observationStart,
    observationEnd,
  );

  const topLevelFindings: ComplianceFinding[] = [];

  // Broken audit chain → critical finding across all controls
  const chainBroken = !chainVerifyResult.valid;

  if (chainBroken) {
    topLevelFindings.push({
      id: 'SOC2-CHAIN-BROKEN-001',
      controlId: '*',
      severity: 'critical',
      title: 'Audit chain integrity broken',
      description: chainVerifyResult.error ?? chainVerifyResult.details ?? 'Audit chain verification failed',
      remediation: 'Investigate and restore audit chain integrity. All controls are affected.',
    });
  }

  // Short observation period → warning finding
  if (!observationPeriodValid) {
    topLevelFindings.push({
      id: 'SOC2-OBS-PERIOD-001',
      controlId: '*',
      severity: 'medium',
      title: 'Observation period below Type II minimum',
      description: `Observation period from ${observationStart} to ${observationEnd} is less than the required 6 months for SOC2 Type II compliance.`,
      remediation: 'Extend the observation period to at least 6 months before submitting for Type II audit.',
    });
  }

  // Build per-control evidence
  const controls: SOC2ControlEvidence[] = SOC2_CONTROLS.map((controlDef) => {
    const controlViolations = analysis.violations.filter((v) =>
      violationMatchesControl(v, controlDef),
    );
    const controlWarnings = analysis.warnings.filter((w) =>
      warningMatchesControl(w, controlDef),
    );
    const evidenceCount = countControlEvidence(chainEntries, controlDef);

    const findings = buildControlFindings(
      controlDef.id,
      controlViolations,
      controlWarnings,
    );

    // Broken chain elevates to critical finding per control
    if (chainBroken) {
      findings.push({
        id: `SOC2-${controlDef.id}-CHAIN-001`,
        controlId: controlDef.id,
        severity: 'critical',
        title: 'Audit chain integrity broken — evidence unreliable',
        description: 'The audit chain has been tampered with. Evidence for this control cannot be trusted.',
        remediation: 'Restore audit chain integrity before compliance assessment.',
      });
    }

    // Determine status: broken chain forces fail
    const status: ControlStatus = chainBroken
      ? 'fail'
      : deriveControlStatus(controlViolations, controlWarnings, evidenceCount);

    return {
      controlId: controlDef.id,
      controlName: controlDef.name,
      status,
      evidenceCount,
      findings,
    };
  });

  // Overall status
  const hasFailure = controls.some((c) => c.status === 'fail');
  const hasPartial = controls.some((c) => c.status === 'partial');
  const overallStatus: ControlStatus = hasFailure
    ? 'fail'
    : hasPartial
      ? 'partial'
      : 'pass';

  const totalEvidenceCount = controls.reduce(
    (sum, c) => sum + c.evidenceCount,
    0,
  );

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    scope,
    observationPeriodStart: observationStart,
    observationPeriodEnd: observationEnd,
    observationPeriodValid,
    controls,
    findings: topLevelFindings,
    overallStatus,
    totalEvidenceCount,
    ...(options.keyFingerprint ? { keyFingerprint: options.keyFingerprint } : {}),
  };
}

/**
 * Get the list of SOC2 control IDs.
 */
export function getSOC2ControlIds(): readonly string[] {
  return SOC2_CONTROLS.map((c) => c.id);
}

/**
 * Get the control definition for a given control ID.
 */
export function getSOC2ControlDef(
  controlId: string,
): SOC2ControlDef | undefined {
  return SOC2_CONTROLS.find((c) => c.id === controlId);
}
