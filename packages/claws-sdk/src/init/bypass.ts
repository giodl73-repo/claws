/**
 * Bypass mode — re-exports from config/bypass.ts (consolidated module).
 *
 * All bypass logic now lives in config/bypass.ts. This file exists only
 * to maintain backward compatibility for existing import sites.
 *
 * @module claws-sdk/init/bypass
 * @deprecated Import from '../config/bypass.js' instead.
 */

export {
  checkBypass,
  evaluateBypass,
  CLAWS_BYPASS_ENV,
  type BypassCheckResult,
  type FleetBypassPolicy,
} from '../config/bypass.js';
