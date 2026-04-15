/**
 * Config module — config loading, validation, bypass management.
 *
 * @module claws-sdk/config
 */

export { loadConfig } from './loader.js';
export type { ConfigLoadResult, ConfigValidationError } from './loader.js';
export { evaluateBypass } from './bypass.js';
export { ClawsConfigSchema } from './types.js';
export type {
  ClawsConfig,
  FailModeValue,
  FailModeConfig,
  FleetPolicy,
  FleetPublishPolicyConfig,
  BypassState,
  BypassOutcome,
  BypassAuditEvent,
} from './types.js';
