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
 * Publish restriction from a fleet policy.
 *
 * Controls which risk-tier tools can be broadcast to which trust-tier workspaces.
 * E.g., "do not broadcast R5 tools to T2 workspaces."
 */
export interface PublishRestriction {
  /** Maximum risk tier allowed for broadcast to workspaces at or below the given trust tier. */
  readonly maxRiskTier: number;
  /** Trust tier ceiling — workspaces at or below this tier are restricted. */
  readonly maxTrustTier: number;
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
 * Parsed policy fields relevant to trust compatibility.
 */
interface ParsedPolicy {
  /** Trust tier declared by the policy (0 if not declared). */
  readonly trustTier: number;
  /** Publish restrictions from the policy (empty if none). */
  readonly publishRestrictions: readonly PublishRestriction[];
  /** Tool risk tiers declared by the policy (empty if none). */
  readonly toolRiskTiers: readonly number[];
}

/**
 * Read trust tier and publish restrictions from a policy YAML file.
 *
 * Looks for `trustTier` / `trust_tier` and `publishRestrictions` / `publish_restrictions`.
 */
async function readPolicyFields(policyPath: string): Promise<ParsedPolicy> {
  try {
    const raw = await readFile(policyPath, 'utf-8');
    const yaml = await import('yaml');
    const parsed = yaml.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { trustTier: 0, publishRestrictions: [], toolRiskTiers: [] };
    }

    // Trust tier
    let trustTier = 0;
    const tier = parsed['trustTier'] ?? parsed['trust_tier'];
    if (typeof tier === 'number' && tier >= 1 && tier <= 5) {
      trustTier = tier;
    }

    // Publish restrictions
    const restrictions: PublishRestriction[] = [];
    const rawRestrictions = parsed['publishRestrictions'] ?? parsed['publish_restrictions'];
    if (Array.isArray(rawRestrictions)) {
      for (const entry of rawRestrictions) {
        if (
          entry &&
          typeof entry === 'object' &&
          typeof (entry as Record<string, unknown>)['maxRiskTier'] === 'number' &&
          typeof (entry as Record<string, unknown>)['maxTrustTier'] === 'number'
        ) {
          restrictions.push({
            maxRiskTier: (entry as Record<string, unknown>)['maxRiskTier'] as number,
            maxTrustTier: (entry as Record<string, unknown>)['maxTrustTier'] as number,
          });
        }
      }
    }

    // Tool risk tiers — the actual risk tiers of tools carried in this policy
    const toolRiskTiers: number[] = [];
    const rawToolRiskTiers = parsed['toolRiskTiers'] ?? parsed['tool_risk_tiers'];
    if (Array.isArray(rawToolRiskTiers)) {
      for (const tier of rawToolRiskTiers) {
        if (typeof tier === 'number' && tier >= 1 && tier <= 5) {
          toolRiskTiers.push(tier);
        }
      }
    }

    return { trustTier, publishRestrictions: restrictions, toolRiskTiers };
  } catch {
    return { trustTier: 0, publishRestrictions: [], toolRiskTiers: [] };
  }
}

/**
 * Check trust compatibility for a single workspace against a policy file.
 *
 * Monotonic tightening rule: a broadcast can raise or maintain the trust
 * floor but never lower it. T1→T2 is allowed (tightening), T3→T2 is
 * blocked (loosening).
 *
 * C-03: Also checks publish restrictions — if the policy declares
 * restrictions like "R5 tools may not be broadcast to T2 workspaces",
 * the broadcast is blocked when the workspace trust tier falls within
 * the restriction's ceiling.
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
  const policy = await readPolicyFields(policyPath);
  const policyTier = policy.trustTier;

  // If policy doesn't declare a trust tier, always compatible (no floor change)
  if (policyTier === 0) {
    // Still check publish restrictions even without a trust tier declaration
    const restrictionBlock = checkPublishRestrictions(currentTier, policy.publishRestrictions, policy.toolRiskTiers);
    if (restrictionBlock) {
      return {
        compatible: false,
        currentTier,
        policyTier: 0,
        reason: restrictionBlock,
      };
    }
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
  if (policyTier < currentTier) {
    return {
      compatible: false,
      currentTier,
      policyTier,
      reason: `Trust floor would be lowered: T${currentTier} → T${policyTier} — monotonic tightening violated`,
    };
  }

  // C-03: Check publish restrictions from the policy
  const restrictionBlock = checkPublishRestrictions(currentTier, policy.publishRestrictions, policy.toolRiskTiers);
  if (restrictionBlock) {
    return {
      compatible: false,
      currentTier,
      policyTier,
      reason: restrictionBlock,
    };
  }

  return {
    compatible: true,
    currentTier,
    policyTier,
    reason: `Trust floor maintained or raised: T${currentTier} → T${policyTier}`,
  };
}

/**
 * Check publish restrictions against a workspace's trust tier and the
 * actual tool risk tiers being broadcast.
 *
 * Only blocks when the workspace falls within the restriction ceiling AND
 * the policy contains at least one tool whose risk tier exceeds the
 * restriction's maxRiskTier. When no tool risk tiers are declared in the
 * policy, falls back to blocking (conservative: unknown tools treated as
 * potentially exceeding any limit).
 *
 * Returns a human-readable block reason if any restriction is violated,
 * or null if all restrictions pass.
 */
function checkPublishRestrictions(
  workspaceTier: number,
  restrictions: readonly PublishRestriction[],
  toolRiskTiers: readonly number[] = [],
): string | null {
  if (workspaceTier === 0 || restrictions.length === 0) return null;

  for (const r of restrictions) {
    if (workspaceTier <= r.maxTrustTier) {
      // If tool risk tiers are declared, only block when at least one exceeds the cap
      if (toolRiskTiers.length > 0) {
        const maxTool = Math.max(...toolRiskTiers);
        if (maxTool > r.maxRiskTier) {
          return `Publish restriction violated: workspace T${workspaceTier} is at or below T${r.maxTrustTier} ceiling — tool R${maxTool} exceeds R${r.maxRiskTier} cap for these workspaces`;
        }
        // All tools within the cap — restriction does not apply
        continue;
      }
      // No tool risk tiers declared — conservative block (unknown risk)
      return `Publish restriction violated: workspace T${workspaceTier} is at or below T${r.maxTrustTier} ceiling — policy restricts tools above R${r.maxRiskTier} for these workspaces (no tool risk tiers declared)`;
    }
  }
  return null;
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
