/**
 * Loss matrix computation — per-platform enforcement capability scoring.
 *
 * Given a PlatformTarget, computes which governance capabilities are
 * retained or lost on each platform. Advisory platforms cannot deny
 * or enforce trust tiers; full platforms retain all capabilities.
 *
 * Read-only output — downstream phases consume for reporting, never modify.
 *
 * @module claws-sdk/detect/loss-matrix
 */

import type { EnforcementModel } from '../types/platform.js';
import type { EnforcementCapabilityVector, LossMatrixEntry } from '../types/loss-matrix.js';
import type { PlatformTarget, PlatformInfo } from './types.js';

/**
 * Capability vectors by enforcement model.
 *
 * - full: all capabilities available
 * - advisory: can audit and emit, but cannot deny or enforce trust tiers
 * - explicit-only: can emit, audit requires opt-in, no deny or trust tiers
 */
const CAPABILITY_BY_ENFORCEMENT: Record<EnforcementModel, EnforcementCapabilityVector> = {
  full: { deny: true, trustTier: true, audit: true, emit: true },
  advisory: { deny: false, trustTier: false, audit: true, emit: true },
  'explicit-only': { deny: false, trustTier: false, audit: false, emit: true },
};

function buildEntry(info: PlatformInfo): LossMatrixEntry {
  const capabilities = CAPABILITY_BY_ENFORCEMENT[info.marker.enforcement];
  const values = Object.values(capabilities);
  const retainedCount = values.filter(Boolean).length;
  const lostCount = values.length - retainedCount;

  return {
    platform: info.marker.platform,
    capabilities,
    lostCount,
    retainedCount,
  };
}

/**
 * Compute the loss matrix for a resolved platform target.
 *
 * Returns one LossMatrixEntry per platform (primary + secondaries).
 * Each entry records which enforcement capabilities are available
 * on that platform and how many are lost.
 */
export function computeLossMatrix(target: PlatformTarget): LossMatrixEntry[] {
  const entries: LossMatrixEntry[] = [buildEntry(target.primary)];

  for (const secondary of target.secondaries) {
    entries.push(buildEntry(secondary));
  }

  return entries;
}
