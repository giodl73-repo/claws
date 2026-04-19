/**
 * Validation types for the claws free-tier 12-check validator.
 *
 * The validator is a lightweight alternative to the full evaluation engine
 * imported from agent-sdk. It runs 12 specific checks on a compiled workspace
 * and reports pass/fail per check plus an overall verdict.
 *
 * Mirrored governance/emit result types keep this module dependency-free
 * apart from compiler IR types — the validator does not import the emit
 * module directly, so it can run before an emit step (EmitResult optional).
 *
 * @module claws-sdk/compiler/validate/types
 */

/**
 * Severity for a validation check result.
 *
 * - info:    observational finding; never fails the check.
 * - warning: non-fatal; check may still pass overall.
 * - error:   fatal; check fails.
 */
export type CheckSeverity = 'info' | 'warning' | 'error';

/**
 * Identifier for each of the 12 validation checks.
 *
 * The set is fixed at exactly 12 for the free tier — no more, no less.
 */
export type CheckId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Static metadata for a single validation check.
 */
export interface ValidationCheck {
  /** Stable identifier 1..12. */
  readonly id: CheckId;
  /** Short human-readable name (e.g. "Schema conformance"). */
  readonly name: string;
  /** One-line description of what the check verifies. */
  readonly description: string;
}

/**
 * Result of executing a single validation check.
 */
export interface CheckResult {
  /** Which check this result belongs to. */
  readonly checkId: CheckId;
  /** Whether the check passed. False severity === 'error'. */
  readonly pass: boolean;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Severity classification. */
  readonly severity: CheckSeverity;
}

/**
 * A minimal shape describing the compiled output the validator inspects.
 *
 * This mirrors (but does not import) the emit module's result type so the
 * validate module can be extracted independently. When no emit step has run,
 * callers pass `undefined` and emit-dependent checks degrade to warnings.
 */
export interface EmitResultShape {
  /** Target platform identifier emitted for. */
  readonly platform: string;
  /** Artifact outputs keyed by relative path. */
  readonly outputs: Readonly<Record<string, string>>;
  /** Stable SHA-256 hash of the concatenated outputs, hex-encoded. */
  readonly outputHash?: string;
  /** Semantic version of the sidecar contract used during emit. */
  readonly sidecarVersion?: string;
}

/**
 * Aggregate report for a full 12-check validation pass.
 */
export interface ValidationReport {
  /** All 12 check results in stable id order. */
  readonly checks: readonly CheckResult[];
  /** Number of passing checks (0..12). */
  readonly passCount: number;
  /** Number of failing checks (0..12). */
  readonly failCount: number;
  /** True iff all 12 checks passed. */
  readonly overallPass: boolean;
}
