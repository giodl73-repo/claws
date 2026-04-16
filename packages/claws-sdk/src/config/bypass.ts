/**
 * Bypass management — CLAWS_BYPASS=1 detection, fleet policy check,
 * and audit event recording.
 *
 * Bypass mode disables governance enforcement for debugging. Fleet
 * policy controls whether bypass is permitted (deny by default).
 *
 * This is the single consolidated bypass evaluation module. Both config-path
 * and init-path bypass decisions route through here to prevent divergence.
 *
 * @module claws-sdk/config/bypass
 */

import type { FleetPolicy, BypassState, BypassAuditEvent, BypassOutcome } from './types.js';
import { appendAuditEvent, readPolicyVersion, resolveActor } from '../compliance/audit-chain.js';

/**
 * Environment variable that activates bypass mode.
 */
export const CLAWS_BYPASS_ENV = 'CLAWS_BYPASS';

/**
 * Result of a bypass check (init-path compatible shape).
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
 * Fleet policy relevant to bypass decisions (init-path compatible shape).
 */
export interface FleetBypassPolicy {
  /** Whether bypass is allowed. When false, CLAWS_BYPASS=1 is ignored. */
  readonly allowBypass: boolean;
}

/**
 * Evaluate bypass state from environment and fleet policy.
 *
 * Logic:
 * 1. If CLAWS_BYPASS is not "1", bypass is inactive — no audit event.
 * 2. If CLAWS_BYPASS=1 and fleet policy allows bypass, activate and audit.
 * 3. If CLAWS_BYPASS=1 and fleet policy denies bypass, deny and audit.
 *
 * @param env - Environment variables (typically process.env)
 * @param fleetPolicy - Fleet policy configuration
 * @returns BypassState and optional audit event
 */
export function evaluateBypass(
  env: Record<string, string | undefined>,
  fleetPolicy: FleetPolicy,
): { state: BypassState; auditEvent: BypassAuditEvent | null } {
  const envDetected = env[CLAWS_BYPASS_ENV] === '1';

  if (!envDetected) {
    return {
      state: {
        envDetected: false,
        policyAllows: fleetPolicy.allowBypass,
        outcome: 'inactive',
      },
      auditEvent: null,
    };
  }

  const outcome: BypassOutcome = fleetPolicy.allowBypass ? 'activated' : 'denied';

  const auditEvent: BypassAuditEvent = {
    timestamp: new Date().toISOString(),
    eventType: 'bypass',
    outcome,
    actor: env['USER'] ?? env['USERNAME'] ?? 'unknown',
    reason: fleetPolicy.allowBypass
      ? 'CLAWS_BYPASS=1 detected; fleet policy permits bypass'
      : 'CLAWS_BYPASS=1 detected; fleet policy denies bypass (allowBypass=false)',
  };

  return {
    state: {
      envDetected: true,
      policyAllows: fleetPolicy.allowBypass,
      outcome,
    },
    auditEvent,
  };
}

/**
 * Check whether bypass mode is active, respecting fleet policy.
 *
 * This is the init-path compatible entry point that records signed events
 * to the audit chain. It delegates to evaluateBypass for the decision
 * and adds audit chain integration.
 *
 * Logic:
 * 1. If CLAWS_BYPASS != '1', bypass is not requested -> not-requested
 * 2. If fleet.allowBypass === false, bypass is prohibited -> fleet-prohibited
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
