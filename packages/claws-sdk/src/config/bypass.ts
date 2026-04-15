/**
 * Bypass management — CLAWS_BYPASS=1 detection, fleet policy check,
 * and audit event recording.
 *
 * Bypass mode disables governance enforcement for debugging. Fleet
 * policy controls whether bypass is permitted (deny by default).
 *
 * @module claws-sdk/config/bypass
 */

import type { FleetPolicy, BypassState, BypassAuditEvent, BypassOutcome } from './types.js';

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
  const envDetected = env['CLAWS_BYPASS'] === '1';

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
