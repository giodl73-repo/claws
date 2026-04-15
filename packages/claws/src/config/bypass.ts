/**
 * CLI bypass wrapper — thin adapter around SDK bypass evaluation.
 *
 * Reads CLAWS_BYPASS from the environment, passes to the SDK
 * evaluator, and renders audit events to the terminal.
 *
 * @module claws-cli/config/bypass
 */

import { evaluateBypass, type FleetPolicy, type BypassState, type BypassAuditEvent } from '@bic/claws-sdk/config';

/**
 * Result of CLI bypass evaluation, including terminal-ready message.
 */
export interface CliBypassResult {
  readonly state: BypassState;
  readonly auditEvent: BypassAuditEvent | null;
  /** Human-readable message for terminal output. Null when bypass is inactive. */
  readonly message: string | null;
}

/**
 * Evaluate bypass state and produce terminal-ready output.
 *
 * @param fleetPolicy - Fleet policy from loaded config
 * @returns CliBypassResult with state, audit event, and formatted message
 */
export function evaluateCliBypass(fleetPolicy: FleetPolicy): CliBypassResult {
  const { state, auditEvent } = evaluateBypass(process.env, fleetPolicy);

  if (state.outcome === 'inactive') {
    return { state, auditEvent, message: null };
  }

  const message = state.outcome === 'activated'
    ? 'BYPASS MODE ACTIVE: governance enforcement disabled (CLAWS_BYPASS=1)'
    : 'BYPASS DENIED: fleet policy does not permit bypass (fleet.allowBypass=false)';

  return { state, auditEvent, message };
}
