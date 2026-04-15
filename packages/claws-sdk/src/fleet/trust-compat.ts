/**
 * Monotonic trust tightening enforcement for fleet broadcast.
 *
 * Verifies that a broadcast policy does not lower the trust floor of any
 * target workspace. Trust floor only rises (T1→T2 allowed, T3→T2 blocked).
 *
 * The trust tier is read from each workspace's claws.json and compared
 * against the policy's declared trust tier (if present).
 *
 * @module claws-sdk/fleet/trust-compat
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ClawsConfigSchema } from '../config/types.js';
import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';

/**
 * Result of a trust compatibility check for a single workspace.
 */
export interface TrustCompatResult {
  /** Whether the broadcast is compatible (trust floor not lowered). */
  readonly compatible: boolean;
  /** Current trust tier of the workspace. */
  readonly currentTier: number;
  /** Trust tier declared by the incoming policy (0 if not declared). */
  readonly policyTier: number;
  /** Human-readable reason for the result. */
  readonly reason: string;
}

/**
 * Result of checking trust compatibility across multiple workspaces.
 */
export interface FleetTrustCompatResult {
  /** Overall pass/fail — true only if all workspaces are compatible. */
  readonly allCompatible: boolean;
  /** Per-workspace results. */
  readonly results: readonly TrustCompatResult[];
}

/**
 * Read the trust tier from a workspace's claws.json.
 * Returns the tier (1-5) or 0 if unreadable.
 */
async function readWorkspaceTrustTier(workspacePath: string): Promise<number> {
  try {
    const raw = await readFile(join(workspacePath, CLAWS_CONFIG_FILE), 'utf-8');
    const parsed = JSON.parse(raw);
    const config = ClawsConfigSchema.safeParse(parsed);
    if (config.success) {
      return config.data.trustTier;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Read the trust tier from a policy YAML file.
 *
 * Looks for a `trustTier` or `trust_tier` field in the YAML.
 * Returns 0 if the policy doesn't declare a trust tier.
 */
async function readPolicyTrustTier(policyPath: string): Promise<number> {
  try {
    const raw = await readFile(policyPath, 'utf-8');
    const yaml = await import('yaml');
    const parsed = yaml.parse(raw) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object') {
      const tier = parsed['trustTier'] ?? parsed['trust_tier'];
      if (typeof tier === 'number' && tier >= 1 && tier <= 5) {
        return tier;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Check trust compatibility for a single workspace against a policy file.
 *
 * Monotonic tightening rule: a broadcast can raise or maintain the trust
 * floor but never lower it. T1→T2 is allowed (tightening), T3→T2 is
 * blocked (loosening).
 *
 * If the policy doesn't declare a trust tier, it's always compatible
 * (no floor change).
 *
 * @param workspacePath - Absolute path to the workspace
 * @param policyPath - Absolute path to the policy YAML file
 */
export async function checkTrustCompat(
  workspacePath: string,
  policyPath: string,
): Promise<TrustCompatResult> {
  const currentTier = await readWorkspaceTrustTier(workspacePath);
  const policyTier = await readPolicyTrustTier(policyPath);

  // If policy doesn't declare a trust tier, always compatible
  if (policyTier === 0) {
    return {
      compatible: true,
      currentTier,
      policyTier: 0,
      reason: 'Policy does not declare a trust tier — no floor change',
    };
  }

  // If workspace has no readable trust tier, allow broadcast
  if (currentTier === 0) {
    return {
      compatible: true,
      currentTier: 0,
      policyTier,
      reason: 'Workspace has no readable trust tier — broadcast allowed',
    };
  }

  // Monotonic tightening: policy tier must be >= current tier
  if (policyTier >= currentTier) {
    return {
      compatible: true,
      currentTier,
      policyTier,
      reason: `Trust floor maintained or raised: T${currentTier} → T${policyTier}`,
    };
  }

  // Trust floor would be lowered — blocked
  return {
    compatible: false,
    currentTier,
    policyTier,
    reason: `Trust floor would be lowered: T${currentTier} → T${policyTier} — monotonic tightening violated`,
  };
}

/**
 * Check trust compatibility across an entire fleet.
 *
 * @param workspacePaths - Array of absolute workspace paths
 * @param policyPath - Absolute path to the policy YAML file
 */
export async function checkFleetTrustCompat(
  workspacePaths: readonly string[],
  policyPath: string,
): Promise<FleetTrustCompatResult> {
  const results: TrustCompatResult[] = [];

  for (const wsPath of workspacePaths) {
    const result = await checkTrustCompat(wsPath, policyPath);
    results.push(result);
  }

  return {
    allCompatible: results.every((r) => r.compatible),
    results,
  };
}
