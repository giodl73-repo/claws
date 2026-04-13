/**
 * Loss matrix types — per-platform enforcement capability vectors
 * and governance gap entries.
 *
 * Single source of truth for loss-matrix data (R1 amendment C03).
 * Imported by detect/capability-scores.ts and emit/route-selector.ts.
 *
 * @module claws-sdk/types/loss-matrix
 */

import type { Platform } from './platform.js';

/**
 * Enforcement capability vector — what governance actions a platform supports.
 *
 * - `deny`: Can the platform block/deny tool invocations?
 * - `trustTier`: Can the platform enforce trust-tier restrictions?
 * - `audit`: Can the platform emit audit logs for governance decisions?
 * - `emit`: Can the platform receive compiled governance output?
 */
export interface EnforcementCapabilityVector {
  readonly deny: boolean;
  readonly trustTier: boolean;
  readonly audit: boolean;
  readonly emit: boolean;
}

/**
 * A single entry in the loss matrix — records which governance capabilities
 * are lost (or retained) on a specific platform.
 */
export interface LossMatrixEntry {
  /** Which platform this entry describes. */
  readonly platform: Platform;

  /** The platform's enforcement capability vector. */
  readonly capabilities: EnforcementCapabilityVector;

  /** Number of capabilities that are false (lost). */
  readonly lostCount: number;

  /** Number of capabilities that are true (retained). */
  readonly retainedCount: number;
}
