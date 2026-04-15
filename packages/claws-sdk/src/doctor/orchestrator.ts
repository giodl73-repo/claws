/**
 * Doctor orchestrator — run all registered checks, aggregate diagnostics
 * into a unified report with severity levels.
 *
 * Each check is a self-contained module returning diagnostics. The
 * orchestrator collects them, sorts by severity, and returns a report.
 *
 * @module claws-sdk/doctor/orchestrator
 */

/**
 * Severity levels for doctor diagnostics.
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A single diagnostic produced by a doctor check.
 */
export interface Diagnostic {
  /** Check that produced this diagnostic. */
  readonly checkId: string;
  /** Severity of the diagnostic. */
  readonly severity: DiagnosticSeverity;
  /** Human-readable message. */
  readonly message: string;
  /** Optional file path related to this diagnostic. */
  readonly file?: string;
  /** Whether this diagnostic is fixable by --fix. */
  readonly fixable: boolean;
}

/**
 * Result of a single doctor check.
 */
export interface CheckResult {
  /** Unique check identifier. */
  readonly checkId: string;
  /** Human-readable check name. */
  readonly name: string;
  /** Whether the check passed (no errors). */
  readonly passed: boolean;
  /** Diagnostics produced by the check. */
  readonly diagnostics: readonly Diagnostic[];
  /** Duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Aggregated doctor report across all checks.
 */
export interface DoctorReport {
  /** Individual check results. */
  readonly checks: readonly CheckResult[];
  /** All diagnostics across all checks. */
  readonly diagnostics: readonly Diagnostic[];
  /** Total duration in milliseconds. */
  readonly durationMs: number;
  /** Whether all checks passed. */
  readonly healthy: boolean;
  /** Summary counts by severity. */
  readonly summary: {
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
  };
}

/**
 * A doctor check function — takes workspace root and returns a check result.
 */
export type DoctorCheck = (workspaceRoot: string) => Promise<CheckResult>;

/**
 * Options for the doctor orchestrator.
 */
export interface DoctorOptions {
  /** Run only checks relevant to post-upgrade validation. */
  readonly postUpgrade?: boolean;
}

/**
 * Severity sort order (errors first, then warnings, then info).
 */
const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/**
 * Run all registered doctor checks and aggregate results.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param checks - Array of check functions to run
 * @param options - Doctor options (e.g. post-upgrade mode)
 * @returns Aggregated doctor report
 */
export async function runDoctor(
  workspaceRoot: string,
  checks: readonly DoctorCheck[],
  options: DoctorOptions = {},
): Promise<DoctorReport> {
  const start = Date.now();
  const results: CheckResult[] = [];

  for (const check of checks) {
    const result = await check(workspaceRoot);
    results.push(result);
  }

  const allDiagnostics = results
    .flatMap((r) => r.diagnostics)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const errors = allDiagnostics.filter((d) => d.severity === 'error').length;
  const warnings = allDiagnostics.filter((d) => d.severity === 'warning').length;
  const infos = allDiagnostics.filter((d) => d.severity === 'info').length;

  return {
    checks: results,
    diagnostics: allDiagnostics,
    durationMs: Date.now() - start,
    healthy: errors === 0,
    summary: { errors, warnings, infos },
  };
}

/**
 * Create the default set of doctor checks.
 *
 * @param options - Doctor options to filter checks
 * @returns Array of check functions
 */
export { createDefaultChecks } from './checks/index.js';
