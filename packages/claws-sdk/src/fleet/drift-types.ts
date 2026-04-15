/**
 * Types for fleet drift detection.
 *
 * @module claws-sdk/fleet/drift-types
 */

/**
 * Drift severity classification.
 *
 * - CRITICAL: trust tier lowered (e.g., T3→T1)
 * - HIGH: policy removed or deny constraint deleted
 * - LOW: minor configuration change like metadata update
 */
export type DriftSeverity = 'CRITICAL' | 'HIGH' | 'LOW';

/**
 * Drift detection status for a workspace.
 */
export type DriftStatus = 'clean' | 'drifted' | 'suppressed' | 'no-baseline';

/**
 * Result of drift detection for a single workspace.
 */
export interface DriftResult {
  /** Absolute path to the workspace. */
  readonly workspacePath: string;

  /** Expected hash from fleet baseline, or null if no baseline. */
  readonly expectedHash: string | null;

  /** Actual computed governance hash. */
  readonly actualHash: string;

  /** Whether the workspace has drifted from baseline. */
  readonly driftDetected: boolean;

  /** Severity classification, null if no drift or no baseline. */
  readonly severity: DriftSeverity | null;

  /** Whether the drift was suppressed by an exception. */
  readonly suppressed: boolean;

  /** Reason from the exception registry, null if not suppressed. */
  readonly suppressionReason: string | null;

  /** Overall status. */
  readonly status: DriftStatus;
}

/**
 * Fleet baseline — reference governance hash for comparison.
 */
export interface FleetBaseline {
  /** Name/label for this baseline. */
  readonly name: string;

  /** SHA-256 governance hash of the reference workspace. */
  readonly hash: string;

  /** Absolute path to the reference workspace used to generate the baseline. */
  readonly referenceWorkspacePath: string;

  /** ISO timestamp of when the baseline was established. */
  readonly createdAt: string;
}

/**
 * Fleet manifest stored at .claws/fleet-manifest.json.
 */
export interface FleetManifest {
  /** Fleet baselines keyed by name. */
  readonly baselines: Record<string, FleetBaseline>;
}

/**
 * An approved deviation exception.
 */
export interface FleetException {
  /** Glob pattern matching workspace paths (e.g., "special-ws"). */
  readonly workspacePattern: string;

  /** Human-readable reason for the exception. */
  readonly reason: string;

  /** Who approved the exception. */
  readonly approver: string;

  /** ISO date when the exception expires (null = never). */
  readonly expiresAt: string | null;
}

/**
 * Exception registry stored at .claws/fleet-exceptions.json.
 */
export interface FleetExceptionRegistry {
  readonly exceptions: readonly FleetException[];
}
