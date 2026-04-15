/**
 * Bypass mode — temporarily disable enforcement without removing claws.
 *
 * When CLAWS_BYPASS=1 is set, all enforcement returns "allowed" but every
 * call is recorded in the audit chain. Fleet policy can prohibit bypass
 * entirely via fleet.allowBypass.
 *
 * @module claws-sdk/init/bypass
 */

import { appendAuditEvent, readPolicyVersion, resolveActor } from '../compliance/audit-chain.js';

/**
 * Environment variable that activates bypass mode.
 */
export const CLAWS_BYPASS_ENV = 'CLAWS_BYPASS';

/**
 * Result of a bypass check.
 */
export interface BypassCheckResult {
  /** Whether bypass mode is active. */
  readonly bypassed: boolean;
  /** Reason for the decision. */
  readonly reason: 'env-bypass' | 'fleet-prohibited' | 'not-requested';
  /** Whether a BYPASS_ACTIVATED event was recorded. */
  readonly auditRecorded: boolean;
}

/**
 * Fleet policy relevant to bypass decisions.
 */
export interface FleetBypassPolicy {
  /** Whether bypass is allowed. When false, CLAWS_BYPASS=1 is ignored. */
  readonly allowBypass: boolean;
}

/**
 * Check whether bypass mode is active, respecting fleet policy.
 *
 * Logic:
 * 1. If CLAWS_BYPASS != '1', bypass is not requested → not-requested
 * 2. If fleet.allowBypass === false, bypass is prohibited → fleet-prohibited
 * 3. Otherwise, bypass is active: record BYPASS_ACTIVATED to audit chain
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param fleetPolicy - Fleet policy (if available)
 * @param env - Environment variables (default: process.env)
 * @returns BypassCheckResult
 */
export async function checkBypass(
  workspaceRoot: string,
  fleetPolicy?: FleetBypassPolicy,
  env: Record<string, string | undefined> = process.env,
): Promise<BypassCheckResult> {
  // Step 1: Is bypass requested?
  if (env[CLAWS_BYPASS_ENV] !== '1') {
    return {
      bypassed: false,
      reason: 'not-requested',
      auditRecorded: false,
    };
  }

  // Step 2: Is bypass prohibited by fleet policy?
  if (fleetPolicy && fleetPolicy.allowBypass === false) {
    return {
      bypassed: false,
      reason: 'fleet-prohibited',
      auditRecorded: false,
    };
  }

  // Step 3: Bypass is active — record signed event to audit chain
  const policyVersion = await readPolicyVersion(workspaceRoot);

  await appendAuditEvent(workspaceRoot, {
    eventType: 'BYPASS_ACTIVATED',
    actor: resolveActor(),
    target: workspaceRoot,
    action: 'bypass-enable',
    outcome: 'allow',
    ruleId: 'BYPASS-001',
    severity: 5,
    policyVersion,
  });

  return {
    bypassed: true,
    reason: 'env-bypass',
    auditRecorded: true,
  };
}
